import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percentage: integer("percentage").notNull(),
  applicableProductIds: integer("applicable_product_ids").array(), // null = all products
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
