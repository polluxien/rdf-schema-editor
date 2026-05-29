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
  const url = `${config.baseUrl}/ontologies/${ontologyAcronym}/latest_submission?display=all`;
  const response = await fetchWithErrorHandling(url, {
    method: "GET",
    headers: buildHeaders(config),
    signal,
  });
  const submissionData = await response.json();
  const download_url = submissionData.dataDump;

  if (!download_url) {
    throw new Error(`No dataDump URL found for ontology: ${ontologyAcronym}`);
  }

  const download_response = await fetchWithErrorHandling(download_url, {
    method: "GET",
    headers: buildHeaders(config),
    signal,
  });
  const content = await download_response.text();
  const contentType = download_response.headers.get("Content-Type") ?? "application/rdf+xml";
  const contentDisposition = download_response.headers.get("Content-Disposition");
  const filename = parseFilenameFromHeader(contentDisposition);
  
  return { content, contentType, filename };
}

/**
 * Validates that the downloaded content is a valid OWL/RDF file.
 * 
 * @param content - The downloaded content string
 * @param contentType - The MIME type of the content
 * @returns true if valid, throws an error otherwise
 * 
 * TODO: Implement validation logic (e.g., parse with rdflib, check format)
 */
export function validateOwlContent(
  content: string,
  contentType: string,
): boolean {
  // TODO: Implement validation
  // - Check for valid XML/Turtle/JSON-LD syntax
  // - Verify it contains OWL constructs
  // - Use your existing RDF parsing utilities if available
  
  throw new Error("Not implemented: validateOwlContent");
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
