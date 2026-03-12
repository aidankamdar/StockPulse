"use client";

import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { usePlaidStatus } from "@/hooks/use-portfolio";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Unlink, Link as LinkIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

type ConnectState = "idle" | "creating_token" | "linking" | "exchanging" | "syncing" | "error";

export function PlaidConnectCard() {
  const queryClient = useQueryClient();
  const { data: plaidStatus, isLoading: statusLoading } = usePlaidStatus();

  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  const isConnected = plaidStatus?.connected === true;

  // ─── Connect flow ──────────────────────────────────────────────────────────

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setConnectState("exchanging");
      try {
        const exchangeRes = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        const exchangeJson = await exchangeRes.json();
        if (!exchangeRes.ok) {
          throw new Error(exchangeJson.error?.message ?? "Token exchange failed");
        }

        // Trigger initial sync
        setConnectState("syncing");
        const syncRes = await fetch("/api/plaid/sync", { method: "POST" });
        const syncJson = await syncRes.json();
        if (!syncRes.ok) {
          console.warn("Initial sync failed:", syncJson.error?.message);
          toast.error("Initial sync failed. Try syncing again from Settings.");
        } else {
          const data = syncJson.data;
          const posCount = data?.positions ?? 0;
          const txCount = data?.transactions_synced ?? 0;
          toast.success(
            `Connected! Synced ${posCount} position${posCount !== 1 ? "s" : ""}, ${txCount} transaction${txCount !== 1 ? "s" : ""}`
          );
          if (posCount === 0) {
            setSyncWarning(
              "Connected but no investment positions found. If your account only has cash, it will appear after the next update."
            );
          }
        }

        // Refresh all queries
        queryClient.invalidateQueries({ queryKey: ["plaid-status"] });
        queryClient.invalidateQueries({ queryKey: ["portfolios"] });
        queryClient.invalidateQueries({ queryKey: ["positions"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });

        setConnectState("idle");
        setLinkToken(null);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Connection failed");
        setConnectState("error");
      }
    },
    [queryClient]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) {
        setErrorMessage(`Plaid Link exited: ${err.error_message}`);
        setConnectState("error");
      } else {
        setConnectState("idle");
      }
    },
  });

  const handleConnect = useCallback(async () => {
    setConnectState("creating_token");
    setErrorMessage(null);
    setSyncWarning(null);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to create link token");
      }
      setLinkToken(json.data.link_token);
      setConnectState("linking");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setConnectState("error");
    }
  }, []);

  // Auto-open Plaid Link when token is ready
  if (connectState === "linking" && linkToken && ready) {
    open();
  }

  // ─── Sync ──────────────────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncWarning(null);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Sync failed");
      }
      const data = json.data;
      const posCount = data?.positions ?? 0;
      const txSynced = data?.transactions_synced ?? 0;
      const txSkipped = data?.transactions_skipped ?? 0;

      toast.success(
        `Synced ${posCount} position${posCount !== 1 ? "s" : ""}, ${txSynced} transaction${txSynced !== 1 ? "s" : ""}${txSkipped > 0 ? ` (${txSkipped} skipped)` : ""}`
      );

      if (posCount === 0) {
        setSyncWarning(
          "No positions found. Your brokerage account may only contain cash, or holdings data is not yet available."
        );
      }

      queryClient.invalidateQueries({ queryKey: ["plaid-status"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setErrorMessage(msg);
      toast.error(`Sync failed: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  // ─── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/plaid/disconnect", { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Disconnect failed");
      }
      queryClient.invalidateQueries({ queryKey: ["plaid-status"] });
      setLinkToken(null);
      setSyncWarning(null);
      toast.success("Investment account disconnected");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setIsDisconnecting(false);
    }
  }, [queryClient]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Investment Account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isConnected
          ? "Your investment account is connected via Plaid."
          : "Connect your brokerage account to automatically sync positions and transactions."}
      </p>

      <div className="mt-4">
        {isConnected ? (
          <div className="space-y-3">
            {/* Connected status */}
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
              {plaidStatus?.last_synced_at && (
                <span className="text-xs text-muted-foreground">
                  · Last synced {formatRelativeTime(plaidStatus.last_synced_at)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="mr-2 h-4 w-4" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {connectState === "idle" || connectState === "error" ? (
              <Button onClick={handleConnect}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect Investment Account
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {connectState === "creating_token" && "Preparing connection..."}
                {connectState === "linking" && "Opening Plaid Link..."}
                {connectState === "exchanging" && "Securing connection..."}
                {connectState === "syncing" && "Importing positions..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync warning (0 positions) */}
      {syncWarning && (
        <div className="mt-3 rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          {syncWarning}
          <button
            onClick={() => setSyncWarning(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
