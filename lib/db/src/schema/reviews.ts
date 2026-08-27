import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const reviewsTable = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    reviewerName: text("reviewer_name").notNull(),
    reviewDate: date("review_date", { mode: "string" }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    reviewDateIdx: index("reviews_review_date_idx").on(table.reviewDate),
  }),
);
