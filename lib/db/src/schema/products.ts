import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  numeric,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  // Basic info
  name: text("name").notNull(),
  slug: text("slug").unique(),
  category: text("category"),
  brand: text("brand"),
  coverImageUrl: text("cover_image_url"),
  // Pricing
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  pricingOptions: jsonb("pricing_options").$type<Array<{
    duration: string;
    price: number;
    salePrice?: number | null;
    priceUsd?: number | null;
    salePriceUsd?: number | null;
  }>>(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),
  salePriceUsd: numeric("sale_price_usd", { precision: 10, scale: 2 }),
  // Subscription
  duration: text("duration").notNull(),
  deliveryTime: text("delivery_time"),
  activationType: text("activation_type"),
  onCustomerAccount: boolean("on_customer_account").default(false),
  invitationLink: text("invitation_link"),
  licenseKey: text("license_key"),
  sharedAccount: boolean("shared_account").default(false),
  // Description
  description: text("description"),
  features: text("features").array(),
  warrantyDuration: text("warranty_duration"),
  // Customer info
  customerInfoRequired: text("customer_info_required").array(),
  // Post-purchase
  afterPurchaseInstructions: text("after_purchase_instructions"),
  // Sales
  soldCount: integer("sold_count").notNull().default(0),
  // Visibility
  published: boolean("published").notNull().default(true),
  availability: text("availability").notNull().default("in_stock"),
  badges: text("badges").array().notNull().default([]),
  // Meta
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
