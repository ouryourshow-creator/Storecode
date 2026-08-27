import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, promoCodesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
const router: IRouter = Router();

// GET /admin/promo-codes — admin only
router.get("/admin/promo-codes", requireAdmin, async (req, res): Promise<void> => {
  const codes = await db
    .select()
    .from(promoCodesTable)
    .orderBy(promoCodesTable.createdAt);
  res.json(codes.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

// POST /admin/promo-codes — admin only
router.post("/admin/promo-codes", requireAdmin, async (req, res): Promise<void> => {
  const { code, percentage, applicableProductIds } = req.body as {
    code?: unknown; percentage?: unknown; applicableProductIds?: unknown;
  };
  if (typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "code is required" }); return;
  }
  const pct = Number(percentage);
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
    res.status(400).json({ error: "percentage must be 1–100" }); return;
  }
  const productIds = Array.isArray(applicableProductIds)
    ? (applicableProductIds as unknown[]).map(Number).filter(n => Number.isInteger(n) && n > 0)
    : null;
  const d = { code: code.trim(), percentage: pct, applicableProductIds: productIds };
  try {
    const [code] = await db
      .insert(promoCodesTable)
      .values({
        code: d.code.toUpperCase(),
        percentage: d.percentage,
        applicableProductIds: d.applicableProductIds?.length ? d.applicableProductIds : null,
      })
      .returning();
    res.status(201).json({ ...code, createdAt: code.createdAt.toISOString() });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(400).json({ error: "A promo code with this name already exists" });
    } else {
      throw e;
    }
  }
});

// DELETE /admin/promo-codes/:id — admin only
router.delete("/admin/promo-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(promoCodesTable)
    .where(eq(promoCodesTable.id, id))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// POST /promo-codes/validate — public
router.post("/promo-codes/validate", async (req, res): Promise<void> => {
  const { code, productIds } = req.body as { code?: string; productIds?: number[] };
  if (!code || typeof code !== "string") {
    res.json({ valid: false });
    return;
  }
  const [promo] = await db
    .select()
    .from(promoCodesTable)
    .where(eq(promoCodesTable.code, code.toUpperCase()))
    .limit(1);

  if (!promo || !promo.active) {
    res.json({ valid: false });
    return;
  }

  // Check if applicable to at least one product in the cart
  if (promo.applicableProductIds && promo.applicableProductIds.length > 0) {
    const cartIds = Array.isArray(productIds) ? productIds : [];
    const hasMatch = cartIds.some(id => promo.applicableProductIds!.includes(id));
    if (!hasMatch) {
      res.json({ valid: false });
      return;
    }
  }

  res.json({ valid: true, percentage: promo.percentage, code: promo.code });
});

export default router;
