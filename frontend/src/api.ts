/** The backend seam: the only module that knows the base URL, how bodies are
 * encoded, and how HTTP errors become exceptions. Every request goes through
 * here — no caller touches fetch or VITE_API_URL directly. */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (cause) {
    // fetch only rejects when the request never got an answer: wrong API URL,
    // backend down, CORS. Say which host failed — "Failed to fetch" alone has
    // sent more than one debugging session down the wrong path.
    throw new Error(`no response from ${API_URL} (${path})`, { cause });
  }
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${res.statusText}`);
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  return (await request(path)).json() as Promise<T>;
}

export async function apiPost<T>(path: string): Promise<T> {
  return (await request(path, { method: "POST" })).json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

/** POST a multipart form; resolves to the response body as a Blob. */
export async function apiUpload(path: string, form: FormData): Promise<Blob> {
  return (await request(path, { method: "POST", body: form })).blob();
}
