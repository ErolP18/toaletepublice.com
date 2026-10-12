import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const toilets = sqliteTable(
  "toilets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    city: text("city").notNull(),
    county: text("county").notNull(),
    address: text("address"),
    hours: text("hours"),
    photo: text("photo"),
    price: text("price"),
    accessible: integer("accessible", { mode: "boolean" }).notNull().default(false),
    free: integer("free", { mode: "boolean" }).notNull().default(true),
    type: text("type").notNull(),
    status: text("status").notNull().default("propunere"),
    notes: text("notes"),
    source: text("source"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("toilets_city_idx").on(table.city),
    index("toilets_status_idx").on(table.status),
  ],
);

export type ToiletRow = typeof toilets.$inferSelect;
export type ToiletInsert = typeof toilets.$inferInsert;
