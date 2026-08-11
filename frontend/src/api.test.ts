import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost, apiPut, apiUpload } from "./api";

function stubFetch(res: Partial<Response>) {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    ...res,
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("apiGet parses JSON", async () => {
    stubFetch({ json: () => Promise.resolve({ status: "ok" }) });
    expect(await apiGet("/api/health")).toEqual({ status: "ok" });
  });

  it("errors carry status and statusText", async () => {
    stubFetch({ ok: false, status: 422, statusText: "Unprocessable Entity" });
    await expect(apiPost("/api/sync")).rejects.toThrow("422 Unprocessable Entity");
  });

  it("apiPut sends a JSON body", async () => {
    const mock = stubFetch({});
    await apiPut("/api/settings", { max_hr: 185 });
    const [url, init] = mock.mock.calls[0];
    expect(String(url)).toContain("/api/settings");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ max_hr: 185 }));
  });

  it("apiUpload posts the form and resolves to a Blob", async () => {
    const blob = new Blob(["mp4"]);
    const form = new FormData();
    const mock = stubFetch({ blob: () => Promise.resolve(blob) });
    expect(await apiUpload("/api/export/mp4", form)).toBe(blob);
    const [, init] = mock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(form);
  });
});
