import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, char, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
});

export const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
  connectionId: serial("connection_id").primaryKey(),
  connectionName: varchar("connection_name", { length: 255 }).notNull(),
  connectionType: varchar("connection_type", { length: 100 }).notNull(),
  host: varchar("host", { length: 255 }),
  port: integer("port"),
  username: varchar("username", { length: 100 }),
  password: varchar("password", { length: 255 }),
  databaseName: varchar("database_name", { length: 100 }),
  filePath: varchar("file_path", { length: 500 }),
  apiKey: varchar("api_key", { length: 255 }),
  cloudProvider: varchar("cloud_provider", { length: 100 }),
  status: varchar("status", { length: 50 }).default("Pending"),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const configTable = pgTable("config_table", {
  configKey: serial("config_key").primaryKey(),
  executionLayer: varchar("execution_layer", { length: 50 }),
  sourceSystem: varchar("source_system", { length: 100 }),
  sourceType: varchar("source_type", { length: 50 }),
  sourceFilePath: varchar("source_file_path", { length: 255 }),
  sourceFileName: varchar("source_file_name", { length: 255 }),
  sourceFileDelimiter: varchar("source_file_delimiter", { length: 10 }),
  sourceSchemaName: varchar("source_schema_name", { length: 100 }),
  sourceTableName: varchar("source_table_name", { length: 100 }),
  targetType: varchar("target_type", { length: 50 }),
  targetFilePath: varchar("target_file_path", { length: 255 }),
  targetFileDelimiter: varchar("target_file_delimiter", { length: 10 }),
  targetSchemaName: varchar("target_schema_name", { length: 100 }),
  temporaryTargetTable: varchar("temporary_target_table", { length: 100 }),
  targetTableName: varchar("target_table_name", { length: 100 }),
  loadType: varchar("load_type", { length: 50 }),
  primaryKey: varchar("primary_key", { length: 255 }),
  effectiveDate: varchar("effective_date_column", { length: 50 }),
  md5Columns: varchar("md5_columns", { length: 255 }),
  customCode: varchar("custom_code", { length: 500 }),
  executionSequence: varchar("execution_sequence", { length: 20 }),
  enableDynamicSchema: varchar("enable_dynamic_schema", { length: 1 }).default("N"),
  activeFlag: varchar("active_flag", { length: 1 }).default("Y"),
  fullRefreshFlag: varchar("full_data_refresh_flag", { length: 1 }).default("N"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  connectionId: integer("source_connection_id"),
  targetLayer: varchar("target_layer", { length: 50 }),
  targetSystem: varchar("target_system", { length: 100 }),
  targetConnectionId: integer("target_connection_id"),
});

// Temporarily use basic schemas to bypass TypeScript issues
export const insertAuditSchema = z.object({
  configKey: z.number().optional(),
  codeName: z.string().max(60).optional(),
  runId: z.string().max(100).optional(),
  sourceSystem: z.string().max(20).optional(),
  schemaName: z.string().max(30).optional(),
  targetTableName: z.string().max(30).optional(),
  sourceFileName: z.string().max(50).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  insertedRowCount: z.number().optional(),
  updatedRowCount: z.number().optional(),
  deletedRowCount: z.number().optional(),
  noChangeRowCount: z.number().optional(),
  status: z.string().max(10).optional(),
  lastPulledTime: z.string().max(40).optional(),
});

export const insertErrorSchema = z.object({
  configKey: z.number().optional(),
  auditKey: z.number().optional(),
  codeName: z.string().max(60).optional(),
  runId: z.string().max(100).optional(),
  sourceSystem: z.string().max(20).optional(),
  schemaName: z.string().max(30).optional(),
  targetTableName: z.string().max(30).optional(),
  sourceFileName: z.string().max(50).optional(),
  executionTime: z.date().optional(),
  errorDetails: z.string().optional(),
});

export const insertSourceConnectionSchema = z.object({
  connectionName: z.string().max(100),
  connectionType: z.string().max(50),
  host: z.string().max(100).optional(),
  port: z.number().optional(),
  username: z.string().max(50).optional(),
  password: z.string().max(200).optional(),
  databaseName: z.string().max(50).optional(),
  filePath: z.string().max(200).optional(),
  apiKey: z.string().max(200).optional(),
  cloudProvider: z.string().max(50).optional(),
  lastSync: z.date().optional(),
  status: z.string().max(20).default('Pending'),
});

export const updateSourceConnectionSchema = insertSourceConnectionSchema.partial();

export const insertConfigSchema = z.object({
  executionLayer: z.string().max(30).optional(),
  sourceSystem: z.string().max(30).optional(),
  connectionId: z.number().optional(),
  sourceType: z.string().max(20).optional(),
  sourceFilePath: z.string().max(100).optional(),
  sourceFileName: z.string().max(50).optional(),
  sourceFileDelimiter: z.string().max(2).optional(),
  sourceSchemaName: z.string().max(30).optional(),
  sourceTableName: z.string().max(30).optional(),
  targetLayer: z.string().max(30).optional(),
  targetSystem: z.string().max(30).optional(),
  targetConnectionId: z.number().optional(),
  targetType: z.string().max(20).optional(),
  targetFilePath: z.string().max(50).optional(),
  targetFileDelimiter: z.string().max(2).optional(),
  targetSchemaName: z.string().max(30).optional(),
  temporaryTargetTable: z.string().max(30).optional(),
  targetTableName: z.string().max(30).optional(),
  loadType: z.string().max(20).optional(),
  primaryKey: z.string().max(40).optional(),
  effectiveDateColumn: z.string().max(30).optional(),
  md5Columns: z.string().max(150).optional(),
  customCode: z.string().max(150).optional(),
  executionSequence: z.string().max(5).optional(),
  enableDynamicSchema: z.string().max(1).optional(),
  activeFlag: z.string().max(1).optional(),
  fullDataRefreshFlag: z.string().max(1).optional(),
});

export const updateConfigSchema = insertConfigSchema.partial();

export type AuditRecord = typeof auditTable.$inferSelect;
export type InsertAuditRecord = z.infer<typeof insertAuditSchema>;
export type ErrorRecord = typeof errorTable.$inferSelect;
export type InsertErrorRecord = z.infer<typeof insertErrorSchema>;
export type SourceConnection = typeof sourceConnectionTable.$inferSelect;
export type InsertSourceConnection = z.infer<typeof insertSourceConnectionSchema>;
export type UpdateSourceConnection = z.infer<typeof updateSourceConnectionSchema>;
export type ConfigRecord = typeof configTable.$inferSelect & { enableDynamicSchema: string | null };
export type InsertConfigRecord = z.infer<typeof insertConfigSchema>;
export type UpdateConfigRecord = z.infer<typeof updateConfigSchema>;

// Data Dictionary Table - Column order matches actual database structure
export const dataDictionaryTable = pgTable("data_dictionary_table", {
  dataDictionaryKey: serial("data_dictionary_key").primaryKey(),
  configKey: integer("config_key").notNull(),
  executionLayer: varchar("execution_layer", { length: 50 }).notNull(),
  schemaName: varchar("schema_name", { length: 50 }),
  tableName: varchar("table_name", { length: 50 }),
  attributeName: varchar("attribute_name", { length: 100 }).notNull(),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  length: integer("length"),
  precisionValue: integer("precision_value"),
  scale: integer("scale"),
  insertDate: timestamp("insert_date").defaultNow(),
  updateDate: timestamp("update_date").defaultNow(),
  columnDescription: varchar("column_description", { length: 150 }),
  createdBy: varchar("created_by", { length: 100 }),
  updatedBy: varchar("updated_by", { length: 100 }),
  isNotNull: char("is_not_null", { length: 1 }),
  isPrimaryKey: char("is_primary_key", { length: 1 }),
  isForeignKey: char("is_foreign_key", { length: 1 }),
  activeFlag: char("active_flag", { length: 1 }),
});

export const insertDataDictionarySchema = createInsertSchema(dataDictionaryTable).omit({
  dataDictionaryKey: true,
  insertDate: true,
  updateDate: true,
});

export const updateDataDictionarySchema = createInsertSchema(dataDictionaryTable).omit({
  dataDictionaryKey: true,
  insertDate: true,
  updateDate: true,
}).partial();

export type DataDictionaryRecord = typeof dataDictionaryTable.$inferSelect;
export type InsertDataDictionaryRecord = z.infer<typeof insertDataDictionarySchema>;
export type UpdateDataDictionaryRecord = z.infer<typeof updateDataDictionarySchema>;

// Reconciliation Config Table
export const reconciliationConfigTable = pgTable("reconciliation_config", {
  reconKey: serial("recon_key").primaryKey(),
  configKey: integer("config_key").notNull(),
  executionLayer: varchar("execution_layer", { length: 20 }).notNull(),
  sourceSchema: varchar("source_schema", { length: 20 }),
  sourceTable: varchar("source_table", { length: 50 }),
  targetSchema: varchar("target_schema", { length: 50 }),
  targetTable: varchar("target_table", { length: 50 }),
  reconType: varchar("recon_type", { length: 50 }).notNull(),
  attribute: varchar("attribute", { length: 20 }),
  sourceQuery: text("source_query"),
  targetQuery: text("target_query"),
  thresholdPercentage: integer("threshold_percentage"),
  activeFlag: varchar("active_flag", { length: 2 }).notNull().default('Y'),
});

export const insertReconciliationConfigSchema = createInsertSchema(reconciliationConfigTable).omit({
  reconKey: true,
}).extend({
  configKey: z.number().optional(),
});

export const updateReconciliationConfigSchema = createInsertSchema(reconciliationConfigTable).omit({
  reconKey: true,
}).partial();

export type ReconciliationConfig = typeof reconciliationConfigTable.$inferSelect;
export type InsertReconciliationConfig = z.infer<typeof insertReconciliationConfigSchema>;
export type UpdateReconciliationConfig = z.infer<typeof updateReconciliationConfigSchema>;

// Data Quality Config Table
export const dataQualityConfigTable = pgTable("data_quality_config_table", {
  dataQualityKey: serial("data_quality_key").primaryKey(),
  configKey: integer("config_key").notNull(),
  executionLayer: varchar("execution_layer", { length: 100 }).notNull(),
  tableName: varchar("table_name", { length: 25 }).notNull(),
  attributeName: varchar("attribute_name", { length: 250 }).notNull(),
  validationType: varchar("validation_type", { length: 50 }).notNull(),
  referenceTableName: varchar("reference_table_name", { length: 25 }),
  defaultValue: varchar("default_value", { length: 25 }),
  errorTableTransferFlag: varchar("error_table_transfer_flag", { length: 5 }),
  thresholdPercentage: integer("threshold_percentage"),
  activeFlag: varchar("active_flag", { length: 5 }).default('Y'),
  customQuery: varchar("custom_query", { length: 500 }),
  // Source fields
  sourceSystem: varchar("source_system", { length: 50 }),
  sourceConnectionId: integer("source_connection_id"),
  sourceType: varchar("source_type", { length: 50 }),
  sourceSchema: varchar("source_schema", { length: 50 }),
  sourceTableName: varchar("source_table_name", { length: 50 }),
  // Target fields
  targetSystem: varchar("target_system", { length: 50 }),
  targetConnectionId: integer("target_connection_id"),
  targetType: varchar("target_type", { length: 50 }),
  targetSchema: varchar("target_schema", { length: 50 }),
  targetTableName: varchar("target_table_name", { length: 50 }),
});

export const insertDataQualityConfigSchema = createInsertSchema(dataQualityConfigTable).omit({
  dataQualityKey: true,
});

export const updateDataQualityConfigSchema = createInsertSchema(dataQualityConfigTable).omit({
  dataQualityKey: true,
}).partial();

export type DataQualityConfig = typeof dataQualityConfigTable.$inferSelect;
export type InsertDataQualityConfig = z.infer<typeof insertDataQualityConfigSchema>;
export type UpdateDataQualityConfig = z.infer<typeof updateDataQualityConfigSchema>;

// Config Settings Connections Table (separate from source connections)
export const configConnectionTable = pgTable("config_connections", {
  connectionId: serial("connection_id").primaryKey(),
  connectionName: varchar("connection_name", { length: 255 }).notNull().unique(),
  databaseType: varchar("database_type", { length: 100 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  databaseName: varchar("database_name", { length: 255 }).notNull(),
  schemaName: varchar("schema_name", { length: 255 }),
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  authMethod: varchar("auth_method", { length: 50 }).notNull().default("credentials"), // credentials, oauth, service_account
  serviceAccountJson: text("service_account_json"),
  sslMode: varchar("ssl_mode", { length: 20 }).default("disabled"), // disabled, required, preferred
  sslCertificate: text("ssl_certificate"),
  connectionTimeout: integer("connection_timeout").default(30),
  connectionPoolSize: integer("connection_pool_size").default(10),
  status: varchar("status", { length: 20 }).notNull().default("Active"), // Active, Inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConfigConnectionSchema = createInsertSchema(configConnectionTable).omit({
  connectionId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateConfigConnectionSchema = createInsertSchema(configConnectionTable).omit({
  connectionId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type ConfigConnection = typeof configConnectionTable.$inferSelect;
export type InsertConfigConnection = z.infer<typeof insertConfigConnectionSchema>;
export type UpdateConfigConnection = z.infer<typeof updateConfigConnectionSchema>;