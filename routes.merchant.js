import express from "express";
import multer from "multer";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const merchantRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

merchantRouter.post("/products", async (req, res) => {
  const { title, description, priceUsdt, isActive } = req.body || {};
  if (!title || priceUsdt == null) return res.status(400).json({ error: "title/priceUsdt required" });

  const p = await prisma.product.create({
    data: {
      merchantId: req.user.id,
      title,
      description: description || null,
      priceUsdt: String(priceUsdt),
      isActive: isActive !== false
    }
  });
  res.json(p);
});

merchantRouter.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  const p0 = await prisma.product.findFirst({ where: { id, merchantId: req.user.id } });
  if (!p0) return res.status(404).json({ error: "not found" });

  const { title, description, priceUsdt, isActive } = req.body || {};
  const p = await prisma.product.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(priceUsdt !== undefined ? { priceUsdt: String(priceUsdt) } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {})
    }
  });
  res.json(p);
});

merchantRouter.get("/products", async (req, res) => {
  const products = await prisma.product.findMany({
    where: { merchantId: req.user.id },
    orderBy: { createdAt: "desc" }
  });

  const ids = products.map(p => p.id);
  const counts = await prisma.code.groupBy({
    by: ["productId", "isUsed"],
    where: { productId: { in: ids } },
    _count: { _all: true }
  });

  const map = {};
  for (const c of counts) {
    map[c.productId] ||= { available: 0, used: 0 };
    if (c.isUsed) map[c.productId].used += c._count._all;
    else map[c.productId].available += c._count._all;
  }

  res.json(products.map(p => ({ ...p, stock: map[p.id] || { available: 0, used: 0 } })));
});

merchantRouter.post("/products/:id/codes/text", async (req, res) => {
  const productId = req.params.id;
  const { codes } = req.body || {};
  if (!codes) return res.status(400).json({ error: "codes required" });

  const product = await prisma.product.findFirst({ where: { id: productId, merchantId: req.user.id } });
  if (!product) return res.status(404).json({ error: "product not found" });

  const lines = String(codes).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) return res.status(400).json({ error: "no codes" });

  const unique = [...new Set(lines)];

  const existing = await prisma.code.findMany({
    where: { productId, value: { in: unique } },
    select: { value: true }
  });
  const existSet = new Set(existing.map(x => x.value));
  const toInsert = unique.filter(v => !existSet.has(v)).map(v => ({ productId, value: v }));

  if (!toInsert.length) return res.json({ inserted: 0 });

  await prisma.code.createMany({ data: toInsert });
  res.json({ inserted: toInsert.length });
});

merchantRouter.post("/products/:id/codes/csv", upload.single("file"), async (req, res) => {
  const productId = req.params.id;
  const product = await prisma.product.findFirst({ where: { id: productId, merchantId: req.user.id } });
  if (!product) return res.status(404).json({ error: "product not found" });

  if (!req.file) return res.status(400).json({ error: "file required" });
  const csvText = req.file.buffer.toString("utf-8");

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) return res.status(400).json({ error: "CSV parse error", detail: parsed.errors[0] });

  const rows = parsed.data || [];
  const raw = rows
    .map(r => (r.code ?? r.Code ?? r.CODE ?? Object.values(r)[0]))
    .map(v => String(v || "").trim())
    .filter(Boolean);

  const unique = [...new Set(raw)];
  const existing = await prisma.code.findMany({ where: { productId, value: { in: unique } }, select: { value: true } });
  const existSet = new Set(existing.map(x => x.value));
  const toInsert = unique.filter(v => !existSet.has(v)).map(v => ({ productId, value: v }));

  if (!toInsert.length) return res.json({ inserted: 0 });
  await prisma.code.createMany({ data: toInsert });
  res.json({ inserted: toInsert.length });
});
