import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { logger } from "../logger";

const execAsync = promisify(exec);

// ─── Paths ───────────────────────────────────────────────────────────────────

// In development the backend runs on the host; __dirname is
// <project>/backend/src/services so four levels up reaches the project root.
// When running inside a Docker container set BIODIVPIPELINE_DIR explicitly
// (the container also needs the Docker socket and the BiodivPipeline dir
// mounted — see docker-compose.override.yml).
const BIODIV_DIR =
  process.env.BIODIVPIPELINE_DIR ??
  path.resolve(__dirname, "../../../../BiodivPipeline");
const RDF_TRANSFORM_DIR = path.join(
  BIODIV_DIR,
  "modules/local/rdf_transform",
);

const DOCKER_IMAGE = "rdf-transform";
const DOCKER_CONTAINER = "rdf-transform";
const SERVICE_PORT = 8000;
const SERVICE_URL = `http://localhost:${SERVICE_PORT}`;

// ─── Git ─────────────────────────────────────────────────────────────────────

/**
 * Pulls the latest wp8-rdf-transform branch.
 * Returns the new HEAD SHA so the caller can detect whether anything changed.
 */
export async function pullLatest(): Promise<{ changed: boolean; sha: string }> {
  await execAsync(`git config --global --add safe.directory "${BIODIV_DIR}"`);
  const { stdout: before } = await execAsync(`git -C "${BIODIV_DIR}" rev-parse HEAD`);
  const shaBefore = before.trim();

  logger.info("[rdf-transform] git pull origin wp8-rdf-transform");
  try {
    await execAsync(`git -C "${BIODIV_DIR}" pull origin wp8-rdf-transform --ff-only`);
  } catch (err) {
    // Non-fatal: log the warning and continue with whatever is on disk.
    logger.warn("[rdf-transform] git pull failed — using local copy", { err: String(err) });
  }

  const { stdout: after } = await execAsync(`git -C "${BIODIV_DIR}" rev-parse HEAD`);
  const shaAfter = after.trim();

  const changed = shaBefore !== shaAfter;
  if (changed) {
    logger.info(`[rdf-transform] updated ${shaBefore.slice(0, 7)} → ${shaAfter.slice(0, 7)}`);
  } else {
    logger.info("[rdf-transform] already up-to-date");
  }
  return { changed, sha: shaAfter };
}

// ─── Docker ──────────────────────────────────────────────────────────────────

async function isContainerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=^/${DOCKER_CONTAINER}$" --format "{{.Names}}"`,
    );
    return stdout.trim() === DOCKER_CONTAINER;
  } catch {
    return false;
  }
}

async function stopContainer(): Promise<void> {
  try {
    await execAsync(`docker rm -f ${DOCKER_CONTAINER}`);
    logger.info("[rdf-transform] stopped old container");
  } catch {
    // container wasn't running — fine
  }
}

async function buildImage(): Promise<void> {
  logger.info("[rdf-transform] docker build …");
  await execAsync(`docker build -t ${DOCKER_IMAGE} "${RDF_TRANSFORM_DIR}"`);
  logger.info("[rdf-transform] image built");
}

async function startContainer(): Promise<void> {
  logger.info("[rdf-transform] starting container …");
  await execAsync(
    `docker run -d --rm -p ${SERVICE_PORT}:${SERVICE_PORT} --name ${DOCKER_CONTAINER} ${DOCKER_IMAGE}`,
  );
}

/** Polls GET / until the service responds (or timeout). */
async function waitForHealthy(
  timeoutMs = 60_000,
  intervalMs = 1_500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SERVICE_URL}/`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) {
        logger.info("[rdf-transform] service is healthy");
        return;
      }
    } catch {
      // not yet ready
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("rdf-transform service did not become healthy in time");
}

/**
 * Ensures the rdf-transform container is running.
 * If `changed` is true the image is rebuilt from the freshly-pulled sources.
 */
export async function ensureContainerRunning(changed: boolean): Promise<void> {
  const running = await isContainerRunning();

  if (running && !changed) {
    logger.info("[rdf-transform] container already running, reusing");
    return;
  }

  if (running) {
    await stopContainer();
  }

  await buildImage();
  await startContainer();
  await waitForHealthy();
}

// ─── Transform ───────────────────────────────────────────────────────────────

export type OutputFormat = "turtle" | "ntriples" | "jsonld";
export type Delimiter = "COMMA" | "TAB" | "SEMICOLON" | "PIPE";

export interface TransformOptions {
  outputFormat?: OutputFormat;
  delimiter?: Delimiter;
  sourceType?: "CSV" | "TSV" | "JSON";
}

/**
 * Sends the RML mapping + CSV dataset to the rdf-transform service.
 * Returns the raw RDF bytes (ready to stream to the browser).
 */
export async function transform(
  rml: string,
  csv: string,
  opts: TransformOptions = {},
): Promise<{ body: Buffer; contentType: string }> {
  const { outputFormat = "turtle", delimiter = "COMMA", sourceType = "CSV" } = opts;

  const form = new FormData();
  form.append("mapping_schema", new Blob([rml], { type: "text/plain" }), "mapping.rml.ttl");
  form.append("dataset", new Blob([csv], { type: "text/csv" }), "dataset.csv");
  form.append("output_format", outputFormat);
  form.append("delimiter", delimiter);
  form.append("source_type", sourceType);

  const res = await fetch(`${SERVICE_URL}/transform`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`rdf-transform /transform returned ${res.status}: ${text}`);
  }

  const contentType =
    outputFormat === "jsonld"
      ? "application/ld+json"
      : outputFormat === "ntriples"
      ? "application/n-triples"
      : "text/turtle";

  const arrayBuffer = await res.arrayBuffer();
  return { body: Buffer.from(arrayBuffer), contentType };
}
