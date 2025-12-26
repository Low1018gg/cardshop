import crypto from "crypto";

export function must(v, name) {
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function timingSafeEqual(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function hmacSHA256Hex(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
