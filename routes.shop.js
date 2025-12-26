import express from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();
export const shopRouter = express.Router();

shopRouter.get("/products", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, title: true, description: true, priceUsdt: true }
  });
  res.json(products);
});

shopRouter.post("/orders", async (req, res) => {
  const { productId, buyerEmail, quantity } = req.body || {};
  if (!productId || !buyerEmail) return res.status(400).json({ error: "productId/buyerEmail required" });

  const q = Math.max(1, Math.min(10, Number(quantity || 1)));
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) return res.status(404).json({ error: "product not found" });

  const available = await prisma.code.count({ where: { productId, isUsed: false } });
  if (available < q) return res.status(409).json({ error: "out of stock" });

  const amountUsdt = (Number(product.priceUsdt) * q).toFixed(8);

  const order = await prisma.order.create({
    data: {
      productId,
      buyerEmail,
      quantity: q,
      amountUsdt: String(amountUsdt),
      status: OrderStatus.PENDING_PAYMENT
    }
  });

  // TODO: replace with real payment gateway create-invoice
  res.json({
    orderId: order.id,
    amountUsdt: order.amountUsdt,
    pay: {
      provider: process.env.PAYMENT_PROVIDER || "generic",
      payUrl: `https://pay.example.com/invoice/${order.id}`,
      note: "Replace with real gateway create-invoice response"
    }
  });
});

shopRouter.get("/orders/:id", async (req, res) => {
  const id = req.params.id;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { product: { select: { title: true } }, codes: { select: { value: true } } }
  });
  if (!order) return res.status(404).json({ error: "not found" });

  const showCodes = order.status === "FULFILLED";
  res.json({
    id: order.id,
    product: order.product,
    quantity: order.quantity,
    amountUsdt: order.amountUsdt,
    status: order.status,
    codes: showCodes ? order.codes.map(c => c.value) : []
  });
});
