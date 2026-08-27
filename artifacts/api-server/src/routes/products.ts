import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  GetProductParams,
  GetProductBySlugParams,
  DeleteProductParams,
  ListProductsResponse,
  CreateProductResponse,
  GetProductResponse,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function slugifyWithLimit(name: string, wordLimit?: number): string {
  const words = name.trim().split(/\s+/);
  const normalized = (wordLimit ? words.slice(0, wordLimit) : words).join(" ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

function slugify(name: string): string {
  return slugifyWithLimit(name, 2);
}

function publicSlug(name: string, id: number): string {
  return `${slugify(name)}-${id.toString(36)}`;
}

function legacyPublicSlugs(name: string, id: number): string[] {
  const suffix = id.toString(36);
  return [slugifyWithLimit(name, 6), slugifyWithLimit(name), "product"].map((slug) => `${slug}-${suffix}`);
}

async function uniqueSlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name);
  const rows = await db.select({ id: productsTable.id, name: productsTable.name, slug: productsTable.slug }).from(productsTable);
  const used = new Set(rows
    .filter((row) => row.id !== excludeId)
    .map((row) => row.slug ?? publicSlug(row.name, row.id)));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Map a raw DB row to the shape the API returns */
function mapProduct(p: typeof productsTable.$inferSelect, includeSensitiveFields = false) {
  const { licenseKey, invitationLink, ...safeProduct } = p;
  const price = Number(p.price);
  const salePrice = p.salePrice != null ? Number(p.salePrice) : null;
  // Derive pricingOptions from legacy fields if not stored
  const pricingOptions: Array<{ duration: string; price: number; salePrice?: number | null; priceUsd?: number | null; salePriceUsd?: number | null }> =
    p.pricingOptions && p.pricingOptions.length > 0
      ? p.pricingOptions
      : [{ duration: p.duration, price, salePrice, priceUsd: p.priceUsd != null ? Number(p.priceUsd) : null, salePriceUsd: p.salePriceUsd != null ? Number(p.salePriceUsd) : null }];
  return {
    ...safeProduct,
    // Always expose the canonical two-word public slug. Stored historical
    // slugs remain accepted by the lookup route for backwards compatibility.
    slug: publicSlug(p.name, p.id),
    price,
    salePrice,
    priceUsd: p.priceUsd != null ? Number(p.priceUsd) : null,
    salePriceUsd: p.salePriceUsd != null ? Number(p.salePriceUsd) : null,
    pricingOptions,
    availability: p.availability,
    badges: p.badges,
    ...(includeSensitiveFields ? { licenseKey, invitationLink } : {}),
    createdAt: p.createdAt.toISOString(),
  };
}

/** Sync legacy price/duration/salePrice from first pricing option */
function syncLegacyFields(pricingOptions: Array<{ duration: string; price: number; salePrice?: number | null; priceUsd?: number | null; salePriceUsd?: number | null }>) {
  const first = pricingOptions[0];
  return {
    price: String(first.price),
    salePrice: first.salePrice != null ? String(first.salePrice) : null,
    duration: first.duration,
    priceUsd: first.priceUsd != null ? String(first.priceUsd) : null,
    salePriceUsd: first.salePriceUsd != null ? String(first.salePriceUsd) : null,
  };
}

// GET /products — public (only published)
router.get("/products", async (req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.published, true))
    .orderBy(productsTable.createdAt);

  res.json(ListProductsResponse.parse(products.map((product) => mapProduct(product))));
});

// GET /admin/products — admin (all products including unpublished)
router.get("/admin/products", requireAdmin, async (req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(productsTable.createdAt);

  res.json(ListProductsResponse.parse(products.map((product) => mapProduct(product, true))));
});

// POST /products — admin only
router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid product input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const legacy = d.pricingOptions?.length ? syncLegacyFields(d.pricingOptions) : {
    price: String(d.price),
    salePrice: d.salePrice != null ? String(d.salePrice) : null,
    duration: d.duration,
    priceUsd: d.priceUsd != null ? String(d.priceUsd) : null,
    salePriceUsd: d.salePriceUsd != null ? String(d.salePriceUsd) : null,
  };
  const [product] = await db
    .insert(productsTable)
    .values({
      name: d.name,
      slug: await uniqueSlug(d.name),
      category: d.category ?? null,
      brand: d.brand ?? null,
      coverImageUrl: d.coverImageUrl ?? null,
      price: legacy.price,
      salePrice: legacy.salePrice,
      priceUsd: legacy.priceUsd,
      salePriceUsd: legacy.salePriceUsd,
      pricingOptions: d.pricingOptions ?? null,
      duration: legacy.duration,
      deliveryTime: d.deliveryTime ?? null,
      activationType: d.activationType ?? null,
      onCustomerAccount: d.onCustomerAccount ?? false,
      invitationLink: d.invitationLink ?? null,
      licenseKey: d.licenseKey ?? null,
      sharedAccount: d.sharedAccount ?? false,
      description: d.description ?? null,
      features: d.features ?? null,
      warrantyDuration: d.warrantyDuration ?? null,
      customerInfoRequired: d.customerInfoRequired ?? null,
      afterPurchaseInstructions: d.afterPurchaseInstructions ?? null,
      availability: d.availability ?? "in_stock",
      badges: d.badges ?? [],
    })
    .returning();

  res.status(201).json(CreateProductResponse.parse(mapProduct(product, true)));
});

// GET /products/slug/:slug — public readable lookup
router.get("/products/slug/:slug", async (req, res): Promise<void> => {
  const params = GetProductBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [storedProduct] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.slug, params.data.slug), eq(productsTable.published, true)));
  if (storedProduct) {
    res.json(GetProductResponse.parse(mapProduct(storedProduct)));
    return;
  }

  // Existing products predate the slug column. Resolve their deterministic
  // compatibility slug without exposing their numeric ID in the public URL.
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.published, true));
  const product = products.find((candidate) =>
    publicSlug(candidate.name, candidate.id) === params.data.slug || legacyPublicSlugs(candidate.name, candidate.id).includes(params.data.slug),
  );
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(mapProduct(product)));
});

// GET /products/:id — public legacy numeric lookup
router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.published, true)));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(mapProduct(product)));
});

// PUT /products/:id — admin only
router.put("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  const [current] = await db
    .select({ id: productsTable.id, name: productsTable.name, slug: productsTable.slug })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (d.name !== undefined) {
    updateData.name = d.name;
    // Public links stay valid when an admin corrects or renames a product.
    // Legacy rows gain their current compatibility slug before the name changes.
    if (!current.slug) updateData.slug = publicSlug(current.name, current.id);
  }
  if (d.category !== undefined) updateData.category = d.category;
  if (d.brand !== undefined) updateData.brand = d.brand;
  if (d.coverImageUrl !== undefined) updateData.coverImageUrl = d.coverImageUrl;
  if (d.pricingOptions !== undefined && d.pricingOptions.length > 0) {
    const legacy = syncLegacyFields(d.pricingOptions);
    updateData.pricingOptions = d.pricingOptions;
    updateData.price = legacy.price;
    updateData.salePrice = legacy.salePrice;
    updateData.duration = legacy.duration;
    updateData.priceUsd = legacy.priceUsd;
    updateData.salePriceUsd = legacy.salePriceUsd;
  } else {
    if (d.price !== undefined) updateData.price = String(d.price);
    if (d.salePrice !== undefined) updateData.salePrice = d.salePrice != null ? String(d.salePrice) : null;
    if (d.priceUsd !== undefined) updateData.priceUsd = d.priceUsd != null ? String(d.priceUsd) : null;
    if (d.salePriceUsd !== undefined) updateData.salePriceUsd = d.salePriceUsd != null ? String(d.salePriceUsd) : null;
    if (d.duration !== undefined) updateData.duration = d.duration;
  }
  if (d.deliveryTime !== undefined) updateData.deliveryTime = d.deliveryTime;
  if (d.activationType !== undefined) updateData.activationType = d.activationType;
  if (d.onCustomerAccount !== undefined) updateData.onCustomerAccount = d.onCustomerAccount;
  if (d.invitationLink !== undefined) updateData.invitationLink = d.invitationLink;
  if (d.licenseKey !== undefined) updateData.licenseKey = d.licenseKey;
  if (d.sharedAccount !== undefined) updateData.sharedAccount = d.sharedAccount;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.features !== undefined) updateData.features = d.features;
  if (d.warrantyDuration !== undefined) updateData.warrantyDuration = d.warrantyDuration;
  if (d.customerInfoRequired !== undefined) updateData.customerInfoRequired = d.customerInfoRequired;
  if (d.afterPurchaseInstructions !== undefined) updateData.afterPurchaseInstructions = d.afterPurchaseInstructions;
  if (d.availability !== undefined) updateData.availability = d.availability;
  if (d.badges !== undefined) updateData.badges = d.badges;
  if ((d as any).published !== undefined) updateData.published = (d as any).published;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(UpdateProductResponse.parse(mapProduct(product, true)));
});

// POST /products/:id/sold — admin-only legacy adjustment endpoint.
// Customer checkout updates the count exactly once while creating an order.
router.post("/products/:id/sold", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ soldCount: sql`${productsTable.soldCount} + 1` })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(UpdateProductResponse.parse(mapProduct(product)));
});

// PATCH /admin/products/:id/published — admin only
router.patch("/admin/products/:id/published", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const { published } = req.body;
  if (typeof published !== "boolean") {
    res.status(400).json({ error: "published must be a boolean" });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ published })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(UpdateProductResponse.parse(mapProduct(product)));
});

// DELETE /products/:id — admin only
router.delete("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
