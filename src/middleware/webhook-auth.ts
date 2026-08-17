import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  if (!WEBHOOK_SECRET) {
    res.status(500).json({ message: "Webhook secret not configured" });
    return;
  }

  const signature = req.headers["x-webhook-signature"] as string | undefined;
  const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;

  if (!signature || !timestamp) {
    res.status(401).json({ message: "Missing webhook signature" });
    return;
  }

  const timestampMs = parseInt(timestamp, 10);
  if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 300_000) {
    res.status(401).json({ message: "Webhook timestamp expired" });
    return;
  }

  const rawBody = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    res.status(401).json({ message: "Invalid webhook signature" });
    return;
  }

  next();
}
