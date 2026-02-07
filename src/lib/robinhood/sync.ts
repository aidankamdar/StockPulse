import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { requireDatabase } from "@/lib/prisma/client";
import {
  parseRobinhoodOutput,
  RobinhoodPortfolioSchema,
  RobinhoodOrdersSchema,
} from "./parser";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = path.join(process.cwd(), "scripts", "robinhood");

// ─── Execute Python scripts ─────────────────────────────────────────────────

async function runPythonScript(scriptName: string): Promise<string> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);

  try {
    const { stdout, stderr } = await execFileAsync("python", [scriptPath], {
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
      timeout: 30000,
    });

    if (stderr) {
      console.warn(`[robinhood] stderr from ${scriptName}:`, stderr);
    }

    return stdout;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run ${scriptName}: ${errMsg}`);
  }
}

// ─── Sync positions ─────────────────────────────────────────────────────────

export async function syncPortfolio(userId: string, portfolioId: string) {
  const db = requireDatabase();
  const raw = await runPythonScript("fetch_portfolio.py");
  const result = parseRobinhoodOutput(raw, RobinhoodPortfolioSchema);

  if ("error" in result) {
    throw new Error(result.error);
  }

  const { positions } = result.data;
  const now = new Date();

  // Upsert each position
  for (const pos of positions) {
    await db.position.upsert({
      where: {
        portfolio_id_symbol: {
          portfolio_id: portfolioId,
          symbol: pos.symbol,
        },
      },
      update: {
        quantity: pos.quantity,
        average_cost_basis: pos.average_buy_price,
        total_cost_basis: pos.total_cost,
        current_price: pos.current_price,
        current_value: pos.current_value,
        unrealized_pnl: pos.unrealized_pnl,
        unrealized_pnl_percent: pos.unrealized_pnl_percent,
        last_synced_at: now,
      },
      create: {
        portfolio_id: portfolioId,
        symbol: pos.symbol,
        quantity: pos.quantity,
        average_cost_basis: pos.average_buy_price,
        total_cost_basis: pos.total_cost,
        current_price: pos.current_price,
        current_value: pos.current_value,
        unrealized_pnl: pos.unrealized_pnl,
        unrealized_pnl_percent: pos.unrealized_pnl_percent,
        last_synced_at: now,
      },
    });
  }

  // Remove positions that no longer exist in Robinhood
  const syncedSymbols = positions.map((p) => p.symbol);
  await db.position.deleteMany({
    where: {
      portfolio_id: portfolioId,
      symbol: { notIn: syncedSymbols },
    },
  });

  // Mark portfolio as Robinhood-connected
  await db.portfolio.update({
    where: { id: portfolioId },
    data: { source: "ROBINHOOD" },
  });

  // Mark user as connected
  await db.user.update({
    where: { id: userId },
    data: { robinhood_connected: true },
  });

  return result.data;
}

// ─── Sync orders/transactions ────────────────────────────────────────────────

export async function syncOrders(portfolioId: string) {
  const db = requireDatabase();
  const raw = await runPythonScript("fetch_orders.py");
  const result = parseRobinhoodOutput(raw, RobinhoodOrdersSchema);

  if ("error" in result) {
    throw new Error(result.error);
  }

  const allTransactions = [...result.data.orders, ...result.data.dividends];
  let synced = 0;
  let skipped = 0;

  for (const tx of allTransactions) {
    if (!tx.robinhood_order_id || !tx.executed_at) {
      skipped++;
      continue;
    }

    // Check if already synced (deduplication by robinhood_order_id)
    const existing = await db.transaction.findUnique({
      where: { robinhood_order_id: tx.robinhood_order_id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.transaction.create({
      data: {
        portfolio_id: portfolioId,
        symbol: tx.symbol,
        type: tx.type,
        quantity: tx.quantity,
        price_per_unit: tx.price_per_unit,
        total_amount: tx.total_amount,
        fees: tx.fees,
        executed_at: new Date(tx.executed_at),
        source: "ROBINHOOD_SYNC",
        robinhood_order_id: tx.robinhood_order_id,
      },
    });
    synced++;
  }

  return { synced, skipped, total: allTransactions.length };
}

// ─── Full sync ───────────────────────────────────────────────────────────────

export async function fullSync(userId: string, portfolioId: string) {
  const portfolioData = await syncPortfolio(userId, portfolioId);
  const ordersResult = await syncOrders(portfolioId);

  return {
    account: portfolioData.account,
    positionCount: portfolioData.positions.length,
    orders: ordersResult,
  };
}
