import express from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { fulfillOrder } from "./fulfill.js";
import { must, hmacSHA256Hex, timingSafeEqual } from "./utils.js";

const prisma = new PrismaClient();
export const webhookRouter = express.Router();

webhookRouter.post("/payment", async (req, res) => {
  try {
    const secret = must(process.env.WEBHOOK_SECRET, "WEBHOOK_SECRET");

    const payloadRaw = req.rawBody; // Buffer
    const sig = String(req.headers["x-webhook-signature"] || "");
    const calc = hmacSHA256Hex(secret, payloadRaw);

    if (!sig || !timingSafeEqual(sig, calc)) {
      return res.status(401).json({ error: "bad signature" });
    }

    const body = req.body || {};
    const orderId = body.orderId;
    const status = body.status;
    const invoiceId = body.invoiceId;
    const txHash = body.txHash;

    if (!orderId || !status) return res.status(400).json({ error: "missing fields" });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "order not found" });

    if (order.status === OrderStatus.FULFILLED) return res.json({ ok: true, already: true });

    if (status === "paid" || status === "success" || status === "confirmed") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          provider: process.env.PAYMENT_PROVIDER || "generic",
          ...(invoiceId ? { invoiceId } : {}),
          ...(txHash ? { txHash } : {})
        }
      });

      const result = await fulfillOrder(orderId);
      return res.json({ ok: true, fulfilled: true, result });
    }

    return res.json({ ok: true, ignored: true, status });
  } catch (e) {
    return res.status(500).json({ error: "webhook error", detail: String(e.message || e) });
  }
});
