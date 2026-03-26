const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_CORPUS_API_URL || "http://localhost:3001")
  : "http://localhost:3001"

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("corpus_api_key")
}

export function apiHeaders(): Record<string, string> {
  const key = getApiKey()
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (key) h["x-api-key"] = key
  return h
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: apiHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: apiHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}

export { API_BASE }
