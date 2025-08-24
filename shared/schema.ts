import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const auditTable = pgTable("audit_table", {
  auditKey: integer("audit_key").primaryKey().generatedAlwaysAsIdentity(),
  configKey: integer("config_key"),
  codeName: varchar("code_name", { length: 60 }),
  runId: varchar("run_id", { length: 100 }),
  sourceSystem: varchar("source_system", { length: 20 }),
  schemaName: varchar("schema_name", { length: 30 }),
  targetTableName: varchar("target_table_name", { length: 30 }),
  sourceFileName: varchar("source_file_name", { length: 50 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  insertedRowCount: integer("inserted_row_count"),
  updatedRowCount: integer("updated_row_count"),
  deletedRowCount: integer("deleted_row_count"),
  noChangeRowCount: integer("no_change_row_count"),
  status: varchar("status", { length: 10 }),
  lastPulledTime: varchar("last_pulled_time", { length: 40 }),
});

export const errorTable = pgTable("error_table", {
  configKey: integer("config_key"),
  auditKey: integer("audit_key"),
  codeName: varchar("code_name", { length: 60 }),
  runId: varchar("run_id", { length: 100 }),
  sourceSystem: varchar("source_system", { length: 20 }),
  schemaName: varchar("schema_name", { length: 30 }),
  targetTableName: varchar("target_table_name", { length: 30 }),
  sourceFileName: varchar("source_file_name", { length: 50 }),
  executionTime: timestamp("execution_time"),
  errorDetails: text("error_details"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAuditSchema = createInsertSchema(auditTable).omit({
  auditKey: true,
} as const);

export const insertErrorSchema = createInsertSchema(errorTable);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AuditRecord = typeof auditTable.$inferSelect;
export type InsertAuditRecord = z.infer<typeof insertAuditSchema>;
export type ErrorRecord = typeof errorTable.$inferSelect;
export type InsertErrorRecord = z.infer<typeof insertErrorSchema>;
