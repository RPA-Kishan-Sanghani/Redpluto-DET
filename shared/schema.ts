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

export const sourceConnectionTable = pgTable("source_connection_table", {
  connectionId: integer("connection_id").primaryKey().generatedAlwaysAsIdentity(),
  connectionName: varchar("connection_name", { length: 100 }).notNull(),
  connectionType: varchar("connection_type", { length: 50 }).notNull(),
  host: varchar("host", { length: 100 }),
  port: integer("port"),
  username: varchar("username", { length: 50 }),
  password: varchar("password", { length: 200 }),
  databaseName: varchar("database_name", { length: 50 }),
  filePath: varchar("file_path", { length: 200 }),
  apiKey: varchar("api_key", { length: 200 }),
  cloudProvider: varchar("cloud_provider", { length: 50 }),
  lastSync: timestamp("last_sync"),
  status: varchar("status", { length: 20 }).notNull().default('Pending'),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const configTable = pgTable("config_table", {
  configKey: integer("config_key").primaryKey().generatedAlwaysAsIdentity(),
  executionLayer: varchar("execution_layer", { length: 30 }),
  sourceSystem: varchar("source_system", { length: 30 }),
  sourceType: varchar("source_type", { length: 20 }),
  sourceFilePath: varchar("source_file_path", { length: 100 }),
  sourceFileName: varchar("source_file_name", { length: 50 }),
  sourceFileDelimiter: varchar("source_file_delimiter", { length: 2 }),
  sourceSchemaName: varchar("source_schema_name", { length: 30 }),
  sourceTableName: varchar("source_table_name", { length: 30 }),
  targetType: varchar("target_type", { length: 20 }),
  targetFilePath: varchar("target_file_path", { length: 50 }),
  targetFileDelimiter: varchar("target_file_delimiter", { length: 2 }),
  targetSchemaName: varchar("target_schema_name", { length: 30 }),
  temporaryTargetTable: varchar("temporary_target_table", { length: 30 }),
  targetTableName: varchar("target_table_name", { length: 30 }),
  loadType: varchar("load_type", { length: 20 }),
  primaryKey: varchar("primary_key", { length: 40 }),
  effectiveDateColumn: varchar("effective_date_column", { length: 30 }),
  md5Columns: varchar("md5_columns", { length: 150 }),
  customCode: varchar("custom_code", { length: 150 }),
  executionSequence: varchar("execution_sequence", { length: 5 }),
  enableDynamicSchema: varchar("enable_dynamic_schema", { length: 1 }),
  activeFlag: varchar("active_flag", { length: 1 }),
  fullDataRefreshFlag: varchar("full_data_refresh_flag", { length: 1 }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAuditSchema = createInsertSchema(auditTable).omit({
  auditKey: true,
});

export const insertErrorSchema = createInsertSchema(errorTable);

export const insertSourceConnectionSchema = createInsertSchema(sourceConnectionTable).omit({
  connectionId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSourceConnectionSchema = createInsertSchema(sourceConnectionTable).omit({
  connectionId: true,
  createdAt: true,
}).partial();

export const insertConfigSchema = createInsertSchema(configTable).omit({
  configKey: true,
  createdAt: true,
  updatedAt: true,
});

export const updateConfigSchema = createInsertSchema(configTable).omit({
  configKey: true,
  createdAt: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AuditRecord = typeof auditTable.$inferSelect;
export type InsertAuditRecord = z.infer<typeof insertAuditSchema>;
export type ErrorRecord = typeof errorTable.$inferSelect;
export type InsertErrorRecord = z.infer<typeof insertErrorSchema>;
export type SourceConnection = typeof sourceConnectionTable.$inferSelect;
export type InsertSourceConnection = z.infer<typeof insertSourceConnectionSchema>;
export type UpdateSourceConnection = z.infer<typeof updateSourceConnectionSchema>;
export type ConfigRecord = typeof configTable.$inferSelect;
export type InsertConfigRecord = z.infer<typeof insertConfigSchema>;
export type UpdateConfigRecord = z.infer<typeof updateConfigSchema>;
