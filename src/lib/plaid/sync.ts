/**
 * Plaid Investments sync logic.
 * Mirrors structure of src/lib/robinhood/sync.ts but uses Plaid SDK.
 */

import { requirePlaidClient } from "./client";
import { requireDatabase } from "@/lib/prisma/client";

import type { TransactionType } from "@/generated/prisma/client";

// ─── Sync Holdings (Positions) ──────────────────────────────────────────────

export async function syncHoldings(userId: string, portfolioId: string) {
  const plaid = requirePlaidClient();
  const db = requireDatabase();

  // Get user's Plaid access token
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plaid_access_token: true },
  });

  if (!user.plaid_access_token) {
    throw new Error("No Plaid account connected");
  }

  // Fetch holdings from Plaid
  const response = await plaid.investmentsHoldingsGet({
    access_token: user.plaid_access_token,
  });

  const { holdings, securities } = response.data;

  // Build security lookup map
  const securityMap = new Map(
    securities.map((s) => [s.security_id, s])
  );

  const now = new Date();
  const syncedSymbols: string[] = [];

  for (const holding of holdings) {
    const security = securityMap.get(holding.security_id);
    const symbol = security?.ticker_symbol;

    // Skip holdings without a ticker (e.g., cash positions)
    if (!symbol || security?.type === "cash") {
      continue;
    }

    const quantity = holding.quantity;
    const currentPrice = holding.institution_price;
    const currentValue = holding.institution_value;
    const costBasis = holding.cost_basis ?? 0;
    const averageCostBasis = quantity > 0 ? costBasis / quantity : 0;
    const unrealizedPnl = currentValue - costBasis;
    const unrealizedPnlPercent =
      costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    await db.position.upsert({
      where: {
        portfolio_id_symbol: {
          portfolio_id: portfolioId,
          symbol,
        },
      },
      update: {
        quantity,
        average_cost_basis: averageCostBasis,
        total_cost_basis: costBasis,
        current_price: currentPrice,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_percent: unrealizedPnlPercent,
        sector: security?.sector ?? null,
        last_synced_at: now,
      },
      create: {
        portfolio_id: portfolioId,
        symbol,
        quantity,
        average_cost_basis: averageCostBasis,
        total_cost_basis: costBasis,
        current_price: currentPrice,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_percent: unrealizedPnlPercent,
        sector: security?.sector ?? null,
        last_synced_at: now,
      },
    });

    syncedSymbols.push(symbol);
  }

  // Remove positions that no longer exist in Plaid
  if (syncedSymbols.length > 0) {
    await db.position.deleteMany({
      where: {
        portfolio_id: portfolioId,
        symbol: { notIn: syncedSymbols },
      },
    });
  }

  // Mark portfolio as Plaid-connected
  await db.portfolio.update({
    where: { id: portfolioId },
    data: { source: "PLAID" },
  });

  return { positionCount: syncedSymbols.length };
}

// ─── Sync Transactions ──────────────────────────────────────────────────────

/**
 * Maps Plaid investment transaction types to our TransactionType enum.
 * Plaid types: buy, sell, cancel, cash, fee, transfer
 * Plaid subtypes include: dividend, interest, commission, etc.
 */
function mapPlaidTransactionType(
  type: string,
  subtype: string | null
): TransactionType | null {
  if (subtype === "dividend" || subtype === "interest") {
    return "DIVIDEND";
  }
  if (type === "buy") return "BUY";
  if (type === "sell") return "SELL";
  // Skip cancel, fee, transfer, and other non-trade types
  return null;
}

export async function syncTransactions(userId: string, portfolioId: string) {
  const plaid = requirePlaidClient();
  const db = requireDatabase();

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plaid_access_token: true },
  });

  if (!user.plaid_access_token) {
    throw new Error("No Plaid account connected");
  }

  // Fetch past 24 months of investment transactions
  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);

  const startDate = twoYearsAgo.toISOString().split("T")[0]!;
  const endDate = now.toISOString().split("T")[0]!;

  const response = await plaid.investmentsTransactionsGet({
    access_token: user.plaid_access_token,
    start_date: startDate,
    end_date: endDate,
  });

  const { investment_transactions: transactions, securities } = response.data;

  // Build security lookup
  const securityMap = new Map(
    securities.map((s) => [s.security_id, s])
  );

  let synced = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (!tx.security_id) {
      skipped++;
      continue;
    }
    const security = securityMap.get(tx.security_id);
    const symbol = security?.ticker_symbol;

    if (!symbol) {
      skipped++;
      continue;
    }

    const txType = mapPlaidTransactionType(tx.type, tx.subtype);
    if (!txType) {
      skipped++;
      continue;
    }

    const plaidTxId = tx.investment_transaction_id;

    // Dedup by plaid_transaction_id
    const existing = await db.transaction.findUnique({
      where: { plaid_transaction_id: plaidTxId },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Plaid sign convention: positive = outflow (buy), negative = inflow (sell)
    // Our model: total_amount is always positive
    const amount = Math.abs(tx.amount);
    const quantity = Math.abs(tx.quantity);
    const pricePerUnit = tx.price > 0 ? tx.price : quantity > 0 ? amount / quantity : 0;

    await db.transaction.create({
      data: {
        portfolio_id: portfolioId,
        symbol,
        type: txType,
        quantity,
        price_per_unit: pricePerUnit,
        total_amount: amount,
        fees: tx.fees ?? 0,
        executed_at: new Date(tx.date),
        source: "PLAID_SYNC",
        plaid_transaction_id: plaidTxId,
      },
    });

    synced++;
  }

  return { synced, skipped, total: transactions.length };
}

// ─── Full Sync ──────────────────────────────────────────────────────────────

export async function fullPlaidSync(userId: string, portfolioId: string) {
  const holdingsResult = await syncHoldings(userId, portfolioId);
  const transactionsResult = await syncTransactions(userId, portfolioId);

  return {
    positions: holdingsResult.positionCount,
    orders: transactionsResult,
  };
}
