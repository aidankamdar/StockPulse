/**
 * Plaid API client singleton.
 * Lazy-initialized to avoid issues on Vercel serverless cold starts.
 * Server-side only — never import this in client components.
 */

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

// ─── Configuration Check ────────────────────────────────────────────────────

export function isPlaidConfigured(): boolean {
  return Boolean(
    process.env.PLAID_CLIENT_ID &&
      process.env.PLAID_SECRET &&
      process.env.PLAID_ENV
  );
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const globalForPlaid = globalThis as unknown as {
  _plaidClient: PlaidApi | null | undefined;
};

function getOrCreatePlaidClient(): PlaidApi | null {
  if (globalForPlaid._plaidClient !== undefined) {
    return globalForPlaid._plaidClient;
  }

  if (!isPlaidConfigured()) {
    globalForPlaid._plaidClient = null;
    return null;
  }

  try {
    const plaidEnv = process.env.PLAID_ENV as keyof typeof PlaidEnvironments;
    const basePath =
      PlaidEnvironments[plaidEnv] ?? PlaidEnvironments.sandbox;

    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
          "PLAID-SECRET": process.env.PLAID_SECRET!,
        },
      },
    });

    const client = new PlaidApi(configuration);
    globalForPlaid._plaidClient = client;
    return client;
  } catch (error) {
    console.error("[plaid] Failed to create client:", error);
    globalForPlaid._plaidClient = null;
    return null;
  }
}

/**
 * Returns the Plaid API client or throws if not configured.
 * Use this in API routes that require Plaid.
 */
export function requirePlaidClient(): PlaidApi {
  const client = getOrCreatePlaidClient();
  if (!client) {
    throw new Error(
      "Plaid not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV."
    );
  }
  return client;
}
