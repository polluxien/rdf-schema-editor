import { fetchWithErrorHandling } from "./fetchWithErrorHandling";

/**
 * Configuration options for connecting to an external OWL API
 */
export interface OwlApiConfig {
  baseUrl: string;
  apiKey?: string;
  // TODO: Add additional config options as needed (e.g., auth headers, timeout)
}

/**
 * Result of downloading an OWL file
 */
export interface OwlDownloadResult {
  content: string;       // The OWL/RDF content as string
  contentType: string;   // MIME type (e.g., "application/rdf+xml", "text/turtle")
  filename?: string;     // Optional filename from Content-Disposition header
}

/**
 * Fetches a list of available OWL files from an external API.
 * 
 * @param config - API configuration
 * @param signal - Optional AbortSignal for cancellation
 * @returns List of [name, acronym] tuples
 */
export async function listAvailableOwlFiles(
  config: OwlApiConfig,
  signal?: AbortSignal,
): Promise<[string, string][]> {

  let ontologies: [string, string][] = [];
  const url = `${config.baseUrl}/ontologies`;
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    headers: buildHeaders(config),
    signal,
  });
  const content = await response.json();

  for (const ontology of content) {
    ontologies.push([ontology.name, ontology.acronym]);
  }

  return ontologies;
}

/**
 * Downloads an OWL file from an external URL.
 * 
 * @param ontologyAcronym - Acronym of the ontology to download
 * @param config - API configuration (required)
 * @param signal - Optional AbortSignal for cancellation
 * @returns The downloaded OWL content and metadata
 */
export async function downloadOwlFile(
  ontologyAcronym: string,
  config: OwlApiConfig,
  signal?: AbortSignal,
): Promise<OwlDownloadResult> {
  const url = `${config.baseUrl}/ontologies/${ontologyAcronym}/submissions?display=all`;
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    headers: buildHeaders(config),
    signal,
  });

  const submissionData = await response.json();
  let download_url = submissionData[0].dataDump;
  let download_response: Response;

  try {
    download_response = await fetch(download_url, {
      method: "GET",
      headers: buildHeaders(config),
      signal,
    });
  } catch {
    download_response = null as unknown as Response;
  }

  if (!download_response?.ok) {
    // I saw that sometimes 192.168.56.10:8080 doesn't work so replacing it is worht a try.
    download_url = download_url.replace("http://192.168.56.10:8080", config.baseUrl);
    download_response = await fetch(download_url, {
      method: "GET",
      headers: buildHeaders(config),
      signal,
    });
    if (!download_response.ok) {
      throw new Error(`Failed to download ontology: ${ontologyAcronym}`);
    }
  }

  const content = await download_response.text();
  const contentType = download_response.headers.get("Content-Type") ?? "application/rdf+xml";
  const contentDisposition = download_response.headers.get("Content-Disposition");
  const filename = parseFilenameFromHeader(contentDisposition);
  
  return { content, contentType, filename };
}

/**
 * Validates that the downloaded content looks like an OWL/RDF file, based on
 * its declared content type and a few format-specific markers.
 *
 * @param content - The downloaded content string
 * @param contentType - The MIME type of the content
 * @returns true if it looks valid, throws a descriptive error otherwise
 */
export function validateOwlContent(
  content: string,
  contentType: string,
): boolean {
  if (!content.trim()) {
    throw new Error("Downloaded OWL content is empty.");
  }

  const looksLikeRdfXml = /<[^>]*(rdf|owl):/i.test(content);
  const looksLikeTurtle = /@prefix\s+\S+:\s*<[^>]+>\s*\./i.test(content);
  const looksLikeJsonLd = /"@context"\s*:|"@type"\s*:/.test(content);

  if (!looksLikeRdfXml && !looksLikeTurtle && !looksLikeJsonLd) {
    throw new Error(
      `Downloaded content does not look like valid OWL/RDF (content-type: ${contentType}).`,
    );
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds HTTP headers for API requests.
 * 
 * @param config - API configuration
 * @returns Headers object
 */
function buildHeaders(config: OwlApiConfig): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/rdf+xml, text/turtle, application/ld+json, */*",
  };

  if (config.apiKey) {
    headers["Authorization"] = `apikey token=${config.apiKey}`;
  }

  return headers;
}

/**
 * Parses filename from Content-Disposition header.
 * 
 * @param header - Content-Disposition header value
 * @returns Extracted filename or undefined
 */
function parseFilenameFromHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  
  // TODO: Implement proper parsing
  // Example: 'attachment; filename="ontology.owl"'
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1];
}
