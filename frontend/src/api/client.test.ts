import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    json: async () => body,
  } as unknown as Response;
}

describe("api client CSRF handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("fetches a session token and sends it on unsafe requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrf_token: "token-one" }))
      .mockResolvedValueOnce(jsonResponse({ message: "signed in" }));
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./client");
    await api.post("/auth/login", { email: "riya@example.com", password: "Patient@123" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf");
    const requestInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((requestInit.headers as Record<string, string>)["X-CSRF-Token"]).toBe("token-one");
  });

  it("refreshes the token and retries once when the backend rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ csrf_token: "old-token" }))
      .mockResolvedValueOnce(jsonResponse({ error: "Token expired", code: "csrf_failed" }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrf_token: "new-token" }))
      .mockResolvedValueOnce(jsonResponse({ message: "saved" }));
    vi.stubGlobal("fetch", fetchMock);

    const { api } = await import("./client");
    await api.patch("/patients/me", { phone: "+91 90000 12345" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryInit = fetchMock.mock.calls[3][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>)["X-CSRF-Token"]).toBe("new-token");
  });
});
