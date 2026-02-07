"use client";

import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlaidHolding {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  value: number;
  cost_basis: number | null;
  sector: string | null;
}

interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance_current: number | null;
}

type TestState =
  | "idle"
  | "creating_token"
  | "linking"
  | "exchanging"
  | "fetching"
  | "done"
  | "error";

// ─── Component ──────────────────────────────────────────────────────────────

export function PlaidTest() {
  const [state, setState] = useState<TestState>("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [holdings, setHoldings] = useState<PlaidHolding[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Create link token
  const createLinkToken = useCallback(async () => {
    setState("creating_token");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to create link token");
      }

      setLinkToken(json.data.link_token);
      setState("linking");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, []);

  // Step 2: Handle Plaid Link success
  const onSuccess = useCallback(async (publicToken: string) => {
    setState("exchanging");

    try {
      // Exchange public token
      const exchangeRes = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const exchangeJson = await exchangeRes.json();

      if (!exchangeRes.ok) {
        throw new Error(
          exchangeJson.error?.message ?? "Failed to exchange token"
        );
      }

      // Fetch holdings
      setState("fetching");
      const holdingsRes = await fetch("/api/plaid/holdings");
      const holdingsJson = await holdingsRes.json();

      if (!holdingsRes.ok) {
        throw new Error(
          holdingsJson.error?.message ?? "Failed to fetch holdings"
        );
      }

      setAccounts(holdingsJson.data.accounts);
      setHoldings(holdingsJson.data.holdings);
      setState("done");

      // Also log to console for debugging
      console.log("=== Plaid Holdings ===");
      console.log("Accounts:", holdingsJson.data.accounts);
      console.log("Holdings:", holdingsJson.data.holdings);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, []);

  // Plaid Link hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) {
        setErrorMessage(`Plaid Link exited: ${err.error_message}`);
        setState("error");
      } else {
        setState("idle");
      }
    },
  });

  // Open Plaid Link when token is ready
  const handleConnect = useCallback(async () => {
    if (linkToken && ready) {
      open();
    } else {
      await createLinkToken();
    }
  }, [linkToken, ready, open, createLinkToken]);

  // Auto-open when link token becomes available
  if (state === "linking" && linkToken && ready) {
    open();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Plaid Investment Connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your investment account via Plaid to sync positions and
          transactions.
        </p>

        <div className="mt-4">
          {state === "idle" || state === "error" ? (
            <button
              onClick={handleConnect}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect with Plaid
            </button>
          ) : state === "done" ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
              <button
                onClick={() => {
                  setState("idle");
                  setLinkToken(null);
                  setAccounts([]);
                  setHoldings([]);
                }}
                className="ml-4 text-sm text-muted-foreground underline hover:text-foreground"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {state === "creating_token" && "Creating link token..."}
              {state === "linking" && "Opening Plaid Link..."}
              {state === "exchanging" && "Exchanging token..."}
              {state === "fetching" && "Fetching holdings..."}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Accounts */}
      {accounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold">
            Accounts ({accounts.length})
          </h3>
          <div className="mt-3 space-y-2">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.type}
                    {account.subtype ? ` · ${account.subtype}` : ""}
                  </p>
                </div>
                <p className="text-sm font-mono">
                  {account.balance_current != null
                    ? `$${account.balance_current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings */}
      {holdings.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold">
            Holdings ({holdings.length})
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Symbol</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                  <th className="pb-2 pr-4 font-medium text-right">Price</th>
                  <th className="pb-2 pr-4 font-medium text-right">Value</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Cost Basis
                  </th>
                  <th className="pb-2 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, idx) => {
                  const pnl =
                    h.cost_basis != null ? h.value - h.cost_basis : null;
                  const pnlPercent =
                    pnl != null && h.cost_basis
                      ? (pnl / h.cost_basis) * 100
                      : null;

                  return (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono font-medium">
                        {h.symbol}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground max-w-[200px] truncate">
                        {h.name}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {h.quantity.toFixed(h.quantity % 1 === 0 ? 0 : 4)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        ${h.price.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        ${h.value.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {h.cost_basis != null
                          ? `$${h.cost_basis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td
                        className={`py-2 text-right font-mono ${
                          pnl != null
                            ? pnl >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {pnl != null
                          ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent?.toFixed(1)}%)`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 flex gap-6 border-t border-border pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-semibold font-mono">
                $
                {holdings
                  .reduce((sum, h) => sum + h.value, 0)
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost Basis</p>
              <p className="text-lg font-semibold font-mono">
                $
                {holdings
                  .reduce((sum, h) => sum + (h.cost_basis ?? 0), 0)
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
