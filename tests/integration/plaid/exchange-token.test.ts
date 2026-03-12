/**
 * Integration tests for POST /api/plaid/exchange-token
 * Verifies that access tokens are encrypted before DB storage.
 */

process.env.PLAID_TOKEN_ENCRYPTION_KEY = "b".repeat(64);

import { NextRequest } from "next/server";
import { decryptToken } from "@/lib/plaid/encryption";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockItemPublicTokenExchange = jest.fn();

jest.mock("@/lib/plaid/client", () => ({
  requirePlaidClient: () => ({
    itemPublicTokenExchange: mockItemPublicTokenExchange,
  }),
}));

const mockUserUpdate = jest.fn();
const mockRequireDatabase = jest.fn(() => ({
  user: { update: mockUserUpdate },
}));

jest.mock("@/lib/prisma/client", () => ({
  requireDatabase: mockRequireDatabase,
}));

const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/plaid/exchange-token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/plaid/exchange-token/route");

    const request = new NextRequest(
      "http://localhost/api/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({ public_token: "public-sandbox-abc" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for missing public_token", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const { POST } = await import("@/app/api/plaid/exchange-token/route");

    const request = new NextRequest(
      "http://localhost/api/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("stores an encrypted (not plaintext) access token", async () => {
    const plainAccessToken = "access-sandbox-super-secret-token";

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: plainAccessToken, item_id: "item-abc" },
    });

    mockUserUpdate.mockResolvedValue({});

    const { POST } = await import("@/app/api/plaid/exchange-token/route");

    const request = new NextRequest(
      "http://localhost/api/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({ public_token: "public-sandbox-abc" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify the token stored in DB is NOT the plaintext token
    const updateCall = mockUserUpdate.mock.calls[0]?.[0];
    const storedToken: string = updateCall?.data?.plaid_access_token;

    expect(storedToken).toBeDefined();
    expect(storedToken).not.toBe(plainAccessToken);

    // Verify the stored token decrypts back to the original
    const decrypted = decryptToken(storedToken);
    expect(decrypted).toBe(plainAccessToken);
  });

  it("stores plaid_connected: true on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access-sandbox-abc", item_id: "item-xyz" },
    });

    mockUserUpdate.mockResolvedValue({});

    const { POST } = await import("@/app/api/plaid/exchange-token/route");

    const request = new NextRequest(
      "http://localhost/api/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({ public_token: "public-sandbox-abc" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    await POST(request);

    const updateCall = mockUserUpdate.mock.calls[0]?.[0];
    expect(updateCall?.data?.plaid_connected).toBe(true);
    expect(updateCall?.data?.plaid_item_id).toBe("item-xyz");
  });
});
