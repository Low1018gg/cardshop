import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function fulfillOrder(orderId) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true, codes: true }
    });
    if (!order) throw new Error("Order not found");

    if (order.status === OrderStatus.FULFILLED) return { ok: true, already: true };

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLING) {
      throw new Error(`Order status not ready: ${order.status}`);
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.FULFILLING }
    });

    const qty = order.quantity;

    const codes = await tx.$queryRawUnsafe(
      `
      SELECT id, value FROM "Code"
      WHERE "productId" = $1 AND "isUsed" = false
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $2
      `,
      order.productId,
      qty
    );

    if (!codes || codes.length < qty) {
      throw new Error("Not enough stock");
    }

    for (const c of codes) {
      await tx.code.update({
        where: { id: c.id },
        data: { isUsed: true, usedAt: new Date(), orderId }
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.FULFILLED, fulfilledAt: new Date() }
    });

    return { ok: true, codes: codes.map(x => x.value) };
  });
}
