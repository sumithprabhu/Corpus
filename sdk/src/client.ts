/**
 * Low-level HTTP client for Corpus API.
 * Uses x-api-key header; supports JSON, multipart upload, and binary responses.
 */

const DEFAULT_BASE_URL = "http://localhost:3001";

export type ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
};

function getBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl;
  // Support Node and bundlers that inject process.env
  const envUrl =
    typeof process !== "undefined" && process.env
      ? process.env.CORPUS_API_URL
      : undefined;
  return typeof envUrl === "string" ? envUrl : DEFAULT_BASE_URL;
}

function buildHeaders(apiKey?: string, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

async function handleResponse<T>(res: Response, parseJson: true): Promise<T>;
async function handleResponse(res: Response, parseJson: false): Promise<ArrayBuffer>;
async function handleResponse<T>(res: Response, parseJson: boolean): Promise<T | ArrayBuffer> {
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const err = JSON.parse(text) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // use raw text
    }
    throw new CorpusApiError(res.status, message);
  }
  if (parseJson) {
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }
  return new TextEncoder().encode(text).buffer as unknown as ArrayBuffer;
}

/** Thrown when the API returns a non-2xx status. */
export class CorpusApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CorpusApiError";
  }
}

export function createClient(options: ClientOptions = {}) {
  const baseUrl = getBaseUrl(options.baseUrl).replace(/\/$/, "");
  const apiKey = options.apiKey?.trim();

  return {
    async get<T>(path: string, options?: { responseType?: "json" }): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: buildHeaders(apiKey),
      });
      return handleResponse<T>(res, true);
    },

    async getBlob(path: string): Promise<ArrayBuffer> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: buildHeaders(apiKey),
      });
      return handleResponse(res, false);
    },

    async post<T>(path: string, body?: unknown): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: buildHeaders(apiKey, "application/json"),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(res, true);
    },

    async put<T>(path: string, body: unknown): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "PUT",
        headers: buildHeaders(apiKey, "application/json"),
        body: JSON.stringify(body),
      });
      return handleResponse<T>(res, true);
    },

    async delete<T>(path: string): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: buildHeaders(apiKey),
      });
      return handleResponse<T>(res, true);
    },

    /**
     * Multipart upload. Pass file and optional form fields (name, encrypt, previousCID, etc.).
     */
    async upload<T>(path: string, file: File | Blob, fields?: Record<string, string>): Promise<T> {
      const form = new FormData();
      const blob = file instanceof File ? file : new File([file], "file");
      form.append("file", blob);
      if (fields) {
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined && v !== "") form.append(k, v);
        }
      }
      const headers: Record<string, string> = {};
      if (apiKey) headers["x-api-key"] = apiKey;
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body: form,
      });
      return handleResponse<T>(res, true);
    },
  };
}
