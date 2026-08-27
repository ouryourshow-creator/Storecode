import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";

export const cashbackTransactionsTable = pgTable("cashback_transactions", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("credit"),
  status: text("status").notNull().default("pending"),
  currency: text("currency").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  source: text("source").notNull().default("purchase"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (table) => ({
  orderTypeCustomerUnique: unique("cashback_transactions_order_type_customer_unique").on(table.orderId, table.type, table.customerId),
}));

export const customerProfilesTable = pgTable("customer_profiles", {
  customerId: text("customer_id").primaryKey(),
  name: text("name"),
  email: text("email"),
  referralCode: text("referral_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CashbackTransaction = typeof cashbackTransactionsTable.$inferSelect;
