import express from "express";
import cors from "cors";

import { authRouter } from "./auth.js";
import { authMiddleware } from "./middleware.js";
import { merchantRouter } from "./routes.merchant.js";
import { shopRouter } from "./routes.shop.js";
import { webhookRouter } from "./routes.webhook.js";

const app = express();
app.use(cors());

// Webhook needs raw body for signature validation
app.use("/webhook", express.raw({ type: "*/*" }), (req, res, next) => {
  req.rawBody = req.body; // Buffer
  try {
    req.body = JSON.parse(req.body.toString("utf-8") || "{}");
  } catch {
    req.body = {};
  }
  next();
});

// Regular APIs
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => res.json({ ok: true, name: "cardshop-api" }));

app.use("/auth", authRouter);
app.use("/merchant", authMiddleware, merchantRouter);
app.use("/shop", shopRouter);
app.use("/webhook", webhookRouter);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API running on :${port}`));
