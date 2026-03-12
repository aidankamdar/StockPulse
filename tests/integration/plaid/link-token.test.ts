/**
 * Integration tests for POST /api/plaid/link-token
 */

import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLinkTokenCreate = jest.fn();

jest.mock("@/lib/plaid/client", () => ({
  requirePlaidClient: () => ({
    linkTokenCreate: mockLinkTokenCreate,
  }),
}));

const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/plaid/link-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import(
      "@/app/api/plaid/link-token/route"
    );

    const request = new NextRequest("http://localhost/api/plaid/link-token", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns link token when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockLinkTokenCreate.mockResolvedValue({
      data: { link_token: "link-sandbox-abc123", expiration: "2025-01-01" },
    });

    const { POST } = await import(
      "@/app/api/plaid/link-token/route"
    );

    const request = new NextRequest("http://localhost/api/plaid/link-token", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.link_token).toBe("link-sandbox-abc123");
    expect(mockLinkTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { client_user_id: "user-123" },
        client_name: "StockPulse",
        products: expect.arrayContaining(["investments"]),
        country_codes: ["US"],
        language: "en",
      })
    );
  });

  it("returns 500 on Plaid API error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    mockLinkTokenCreate.mockRejectedValue(new Error("Plaid service unavailable"));

    const { POST } = await import(
      "@/app/api/plaid/link-token/route"
    );

    const request = new NextRequest("http://localhost/api/plaid/link-token", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("LINK_TOKEN_FAILED");
  });
});
