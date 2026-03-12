import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlaidClient } from "@/lib/plaid/client";
import { requireDatabase } from "@/lib/prisma/client";
import { fullPlaidSync } from "@/lib/plaid/sync";
import { createHash } from "crypto";

// ─── Webhook payload schemas ─────────────────────────────────────────────────

const InvestmentsUpdateSchema = z.object({
  webhook_type: z.literal("INVESTMENTS"),
  webhook_code: z.literal("DEFAULT_UPDATE"),
  item_id: z.string(),
  error: z.unknown().nullable().optional(),
});

const ItemErrorSchema = z.object({
  webhook_type: z.literal("ITEM"),
  webhook_code: z.literal("ERROR"),
  item_id: z.string(),
  error: z.object({
    error_code: z.string(),
    error_type: z.string(),
    error_message: z.string(),
  }),
});

const ItemUpdateConsentSchema = z.object({
  webhook_type: z.literal("ITEM"),
  webhook_code: z.literal("PENDING_EXPIRATION"),
  item_id: z.string(),
  consent_expiration_time: z.string().optional(),
});

const WebhookPayloadSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
});

// ─── Webhook verification ────────────────────────────────────────────────────

/**
 * Verifies the Plaid-Verification JWT header to confirm the request originated
 * from Plaid. Uses Plaid's JWK endpoint + Node's crypto module.
 *
 * Returns true if verified, false if invalid/missing.
 * On signature failures logs a warning but does not throw — allows graceful degradation.
 */
async function verifyPlaidWebhook(request: NextRequest, rawBody: string): Promise<boolean> {
  const verificationToken = request.headers.get("Plaid-Verification");
  if (!verificationToken) {
    console.warn("[plaid/webhook] Missing Plaid-Verification header");
    return false;
  }

  try {
    // Decode JWT header to get key_id (kid claim)
    const [headerB64] = verificationToken.split(".");
    if (!headerB64) return false;

    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf8")
    ) as { kid?: string; alg?: string };

    if (!header.kid) {
      console.warn("[plaid/webhook] No kid in JWT header");
      return false;
    }

    // Fetch the JWK from Plaid
    const plaid = requirePlaidClient();
    const keyResponse = await plaid.webhookVerificationKeyGet({
      key_id: header.kid,
    });
    const jwk = keyResponse.data.key;

    // Import the JWK as a CryptoKey and verify signature
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk as unknown as JsonWebKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    ).catch((err) => {
      console.warn("[plaid/webhook] Failed to import JWK:", err);
      return null;
    });

    if (!cryptoKey) return false;

    const [, payloadB64, signatureB64] = verificationToken.split(".");
    if (!payloadB64 || !signatureB64) return false;

    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      signature,
      Buffer.from(signingInput, "utf8")
    );

    if (!valid) {
      console.warn("[plaid/webhook] JWT signature verification failed");
      return false;
    }

    // Confirm the JWT payload hash matches the raw body
    const jwtPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { request_body_sha256?: string; iat?: number };

    const bodyHash = createHash("sha256").update(rawBody).digest("hex");

    if (jwtPayload.request_body_sha256 !== bodyHash) {
      console.warn("[plaid/webhook] Body hash mismatch");
      return false;
    }

    // Reject stale tokens (older than 5 minutes)
    if (jwtPayload.iat && Date.now() / 1000 - jwtPayload.iat > 300) {
      console.warn("[plaid/webhook] JWT is too old (replay attack prevention)");
      return false;
    }

    return true;
  } catch (err) {
    console.error("[plaid/webhook] Verification error:", err);
    return false;
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify the request came from Plaid
    const isValid = await verifyPlaidWebhook(request, rawBody);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" } },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody) as unknown;

    // Parse base fields
    const baseResult = WebhookPayloadSchema.safeParse(payload);
    if (!baseResult.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid webhook payload" } },
        { status: 400 }
      );
    }

    const { webhook_type, webhook_code, item_id } = baseResult.data;
    const db = requireDatabase();

    // Look up user by plaid_item_id
    const user = await db.user.findFirst({
      where: { plaid_item_id: item_id },
      select: { id: true },
    });

    if (!user) {
      // Item not found — could be from a different app or already disconnected
      console.warn(`[plaid/webhook] No user found for item_id: ${item_id}`);
      return NextResponse.json({ data: { received: true } });
    }

    // ─── Handle INVESTMENTS events ───────────────────────────────────────────

    if (webhook_type === "INVESTMENTS" && webhook_code === "DEFAULT_UPDATE") {
      const result = InvestmentsUpdateSchema.safeParse(payload);
      if (!result.success) {
        console.warn("[plaid/webhook] Invalid INVESTMENTS webhook payload");
        return NextResponse.json({ data: { received: true } });
      }

      // Find the user's Plaid portfolio
      const portfolio = await db.portfolio.findFirst({
        where: { user_id: user.id, source: "PLAID" },
        select: { id: true },
      });

      if (portfolio) {
        // Trigger sync in background — don't await to keep response fast
        fullPlaidSync(user.id, portfolio.id).catch((err: unknown) => {
          console.error("[plaid/webhook] Background sync failed:", err);
        });
      }
    }

    // ─── Handle ITEM ERROR events ─────────────────────────────────────────────

    if (webhook_type === "ITEM" && webhook_code === "ERROR") {
      const result = ItemErrorSchema.safeParse(payload);
      if (result.success) {
        console.error(
          `[plaid/webhook] Item error for user ${user.id}:`,
          result.data.error
        );

        // Mark the connection as broken so the UI prompts re-linking
        await db.user.update({
          where: { id: user.id },
          data: { plaid_connected: false },
        });
      }
    }

    // ─── Handle PENDING_EXPIRATION ────────────────────────────────────────────

    if (webhook_type === "ITEM" && webhook_code === "PENDING_EXPIRATION") {
      const result = ItemUpdateConsentSchema.safeParse(payload);
      if (result.success) {
        console.warn(
          `[plaid/webhook] Item consent expiring for user ${user.id} at`,
          result.data.consent_expiration_time
        );
        // Mark connection as needing re-link (same as error)
        await db.user.update({
          where: { id: user.id },
          data: { plaid_connected: false },
        });
      }
    }

    // Acknowledge all other webhook types without error
    return NextResponse.json({ data: { received: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    console.error("[plaid/webhook]", message);

    // Always return 200 to Plaid — retrying failed webhooks is wasteful
    return NextResponse.json({ data: { received: true, error: message } });
  }
}
