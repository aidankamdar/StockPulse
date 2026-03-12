/**
 * Component tests for PlaidConnectCard.
 * Tests the UI states: disconnected, connected, loading, error.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUsePlaidStatus = jest.fn();

jest.mock("@/hooks/use-portfolio", () => ({
  usePlaidStatus: () => mockUsePlaidStatus(),
}));

// Mock react-plaid-link to avoid Plaid SDK in tests
jest.mock("react-plaid-link", () => ({
  usePlaidLink: () => ({ open: jest.fn(), ready: false }),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PlaidConnectCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading skeleton while status is loading", async () => {
    mockUsePlaidStatus.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { PlaidConnectCard } = await import("./plaid-connect-card");
    const { container } = renderWithQuery(<PlaidConnectCard />);

    // Should show a pulsing skeleton div, not the real content
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Connect Investment Account")).not.toBeInTheDocument();
  });

  it("shows connect button when not connected", async () => {
    mockUsePlaidStatus.mockReturnValue({
      data: { connected: false, last_synced_at: null },
      isLoading: false,
    });

    const { PlaidConnectCard } = await import("./plaid-connect-card");
    renderWithQuery(<PlaidConnectCard />);

    expect(
      screen.getByRole("button", { name: /connect investment account/i })
    ).toBeInTheDocument();
  });

  it("shows connected status and sync/disconnect buttons when connected", async () => {
    mockUsePlaidStatus.mockReturnValue({
      data: { connected: true, last_synced_at: new Date().toISOString() },
      isLoading: false,
    });

    const { PlaidConnectCard } = await import("./plaid-connect-card");
    renderWithQuery(<PlaidConnectCard />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("shows error message when disconnect fails", async () => {
    mockUsePlaidStatus.mockReturnValue({
      data: { connected: true, last_synced_at: null },
      isLoading: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: "Failed to revoke Plaid item" },
      }),
    });

    const { PlaidConnectCard } = await import("./plaid-connect-card");
    renderWithQuery(<PlaidConnectCard />);

    const disconnectButton = screen.getByRole("button", { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to revoke Plaid item")
      ).toBeInTheDocument();
    });
  });

  it("dismisses error message when dismiss is clicked", async () => {
    mockUsePlaidStatus.mockReturnValue({
      data: { connected: true, last_synced_at: null },
      isLoading: false,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: "Network error" },
      }),
    });

    const { PlaidConnectCard } = await import("./plaid-connect-card");
    renderWithQuery(<PlaidConnectCard />);

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Network error")).not.toBeInTheDocument();
  });
});
