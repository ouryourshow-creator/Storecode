import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, reviewsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function parseReview(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const reviewerName =
    typeof input.reviewerName === "string"
      ? input.reviewerName.trim().replace(/\s+/g, " ")
      : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const reviewDate =
    typeof input.reviewDate === "string" ? input.reviewDate : "";
  if (reviewerName.split(" ").length !== 2 || reviewerName.length > 100)
    return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) ||
    Number.isNaN(Date.parse(`${reviewDate}T00:00:00Z`))
  )
    return null;
  if (!content || content.length > 2_000) return null;
  return { reviewerName, reviewDate, content };
}

router.get("/reviews", async (_req, res): Promise<void> => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .orderBy(desc(reviewsTable.reviewDate), desc(reviewsTable.id));
  res.json(reviews);
});

router.post("/admin/reviews", requireAdmin, async (req, res): Promise<void> => {
  const review = parseReview(req.body);
  if (!review) {
    res
      .status(400)
      .json({
        error:
          "A two-part reviewer name, valid date, and review content are required",
      });
    return;
  }
  const [created] = await db.insert(reviewsTable).values(review).returning();
  res.status(201).json(created);
});

router.delete(
  "/admin/reviews/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(reviewsTable)
      .where(eq(reviewsTable.id, id))
      .returning({ id: reviewsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
