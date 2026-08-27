import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

// GET /categories — public
router.get("/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);
  res.json(cats.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

// POST /admin/categories — admin only
router.post("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const { name } = req.body as { name?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const [cat] = await db
      .insert(categoriesTable)
      .values({ name: name.trim() })
      .returning();
    res.status(201).json({ ...cat, createdAt: cat.createdAt.toISOString() });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(400).json({ error: "A category with this name already exists" });
    } else {
      throw e;
    }
  }
});

// DELETE /admin/categories/:id — admin only
router.delete("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
