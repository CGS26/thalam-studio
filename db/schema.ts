import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const talas = sqliteTable("talas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bpm: integer("bpm").notNull(),
  beatCount: integer("beat_count").notNull(),
  arrangement: text("arrangement").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
