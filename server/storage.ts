import { users, auditTable, errorTable, sourceConnectionTable, configTable, dataDictionaryTable, reconciliationConfigTable, dataQualityConfigTable, userConfigDbSettings, userActivity, type User, type InsertUser, type AuditRecord, type ErrorRecord, type SourceConnection, type InsertSourceConnection, type UpdateSourceConnection, type ConfigRecord, type InsertConfigRecord, type UpdateConfigRecord, type DataDictionaryRecord, type InsertDataDictionaryRecord, type UpdateDataDictionaryRecord, type ReconciliationConfig, type InsertReconciliationConfig, type UpdateReconciliationConfig, type DataQualityConfig, type UserConfigDbSettings, type InsertUserConfigDbSettings, type UpdateUserConfigDbSettings, type UserActivity, type InsertUserActivity } from "@shared/schema";
import { db, pool, getUserSpecificPool } from "./db";
import { eq, and, gte, lte, count, desc, asc, like, inArray, sql, ilike, or } from "drizzle-orm";
import { Pool } from 'pg';
import mysql from 'mysql2/promise';

// Shared external database connection pool for metadata queries (fallback)
const externalPool = new Pool({
  host: '4.240.90.166',
  port: 5432,
  database: 'config_db',
  user: 'rpdet_az',
  password: 'Rpdet#1234',
  ssl: false,
  connectionTimeoutMillis: 10000,
});

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Dashboard metrics
  getDashboardMetrics(userId: string, dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }): Promise<{
    totalPipelines: number;
    successfulRuns: number;
    failedRuns: number;
    scheduledRuns: number;
    runningRuns: number;
  }>;

  // Pipeline summary by category
  getPipelineSummary(userId: string, dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }): Promise<{
    dataQuality: { total: number; success: number; failed: number };
    reconciliation: { total: number; success: number; failed: number };
    bronze: { total: number; success: number; failed: number };
    silver: { total: number; success: number; failed: number };
    gold: { total: number; success: number; failed: number };
  }>;

  // Pipeline runs with filtering and pagination
  getPipelineRuns(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Array<{
      auditKey: number;
      codeName: string;
      runId: string;
      sourceSystem: string;
      schemaName: string;
      targetTableName: string;
      sourceFileName: string;
      startTime: Date;
      endTime?: Date;
      insertedRowCount: number;
      updatedRowCount: number;
      deletedRowCount: number;
      noChangeRowCount: number;
      status: string;
      errorDetails?: string;
      duration?: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }>;

  // All pipelines with filtering and pagination
  getAllPipelines(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Array<{
      auditKey: number;
      codeName: string;
      runId: string;
      sourceSystem: string;
      schemaName: string;
      targetTableName: string;
      sourceFileName: string;
      startTime: Date;
      endTime?: Date;
      insertedRowCount: number;
      updatedRowCount: number;
      deletedRowCount: number;
      noChangeRowCount: number;
      status: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>;

  // Error logs
  getErrors(userId: string, dateRange?: { start: Date; end: Date }): Promise<ErrorRecord[]>;

  // Source connections
  createConnection(userId: string, connection: InsertSourceConnection): Promise<SourceConnection>;
  getConnections(userId: string, filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<SourceConnection[]>;
  getConnection(userId: string, id: number): Promise<SourceConnection | undefined>;
  updateConnection(userId: string, id: number, updates: UpdateSourceConnection): Promise<SourceConnection | undefined>;
  deleteConnection(userId: string, id: number): Promise<boolean>;
  testConnection(userId: string, connectionData: Partial<SourceConnection>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }>;
  getDatabaseSchemas(userId: string, connectionId: number): Promise<string[]>;
  getDatabaseTables(userId: string, connectionId: number, schemaName: string): Promise<string[]>;
  getDatabaseColumns(userId: string, connectionId: number, schemaName: string, tableName: string): Promise<string[]>;
  getDatabaseColumnMetadata(userId: string, connectionId: number, schemaName: string, tableName: string): Promise<any[]>;

  // Pipeline configuration methods
  getPipelines(userId: string, filters?: { search?: string; executionLayer?: string; sourceSystem?: string; status?: string }): Promise<ConfigRecord[]>;
  getPipeline(userId: string, id: number): Promise<ConfigRecord | undefined>;
  createPipeline(userId: string, pipeline: InsertConfigRecord): Promise<ConfigRecord>;
  updatePipeline(userId: string, id: number, updates: UpdateConfigRecord): Promise<ConfigRecord | undefined>;
  deletePipeline(userId: string, id: number): Promise<boolean>;

  // Metadata methods for dropdowns
  getMetadata(userId: string, type: string): Promise<string[]>;

  // Data dictionary methods
  getDataDictionaryEntries(userId: string, filters?: { search?: string; executionLayer?: string; schemaName?: string; tableName?: string; customField?: string; customValue?: string }): Promise<DataDictionaryRecord[]>;
  getDataDictionaryEntry(userId: string, id: number): Promise<DataDictionaryRecord | undefined>;
  createDataDictionaryEntry(userId: string, entry: InsertDataDictionaryRecord): Promise<DataDictionaryRecord>;
  updateDataDictionaryEntry(userId: string, id: number, updates: UpdateDataDictionaryRecord): Promise<DataDictionaryRecord | undefined>;
  deleteDataDictionaryEntry(userId: string, id: number): Promise<boolean>;

  // Reconciliation config methods
  getReconciliationConfigs(userId: string, filters?: { search?: string; executionLayer?: string; configKey?: number; reconType?: string; status?: string }): Promise<ReconciliationConfig[]>;
  getReconciliationConfig(userId: string, id: number): Promise<ReconciliationConfig | undefined>;
  createReconciliationConfig(userId: string, config: InsertReconciliationConfig): Promise<ReconciliationConfig>;
  updateReconciliationConfig(userId: string, id: number, updates: UpdateReconciliationConfig): Promise<ReconciliationConfig | undefined>;
  deleteReconciliationConfig(userId: string, id: number): Promise<boolean>;

  // Data Quality Config methods
  getDataQualityConfigs(userId: string, filters?: { search?: string; executionLayer?: string; configKey?: number; validationType?: string; status?: string }): Promise<DataQualityConfig[]>;
  getDataQualityConfig(userId: string, id: number): Promise<DataQualityConfig | undefined>;
  createDataQualityConfig(userId: string, config: InsertDataQualityConfig): Promise<DataQualityConfig>;
  updateDataQualityConfig(userId: string, id: number, updates: UpdateDataQualityConfig): Promise<DataQualityConfig | undefined>;
  deleteDataQualityConfig(userId: string, id: number): Promise<boolean>;

  // User Config DB Settings methods
  getUserConfigDbSettings(userId: string): Promise<UserConfigDbSettings | undefined>;
  createUserConfigDbSettings(settings: InsertUserConfigDbSettings): Promise<UserConfigDbSettings>;
  updateUserConfigDbSettings(userId: string, settings: UpdateUserConfigDbSettings): Promise<UserConfigDbSettings | undefined>;
  testUserConfigDbConnection(settings: Partial<UserConfigDbSettings>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }>;

  // User Activity methods
  logUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivity(userId: string, limit?: number): Promise<UserActivity[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          username: insertUser.username,
          email: insertUser.email,
          password: insertUser.password,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName
        });
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user in database');
    }
  }

  async getDashboardMetrics(userId: string, dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }) {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty metrics if no user config
    if (!userPoolResult) {
      return {
        totalPipelines: 0,
        successfulRuns: 0,
        failedRuns: 0,
        scheduledRuns: 0,
        runningRuns: 0,
      };
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (dateRange) {
        whereClauses.push(`start_time >= $${paramIndex} AND start_time <= $${paramIndex + 1}`);
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      if (filters?.search) {
        whereClauses.push(`code_name LIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.system) {
        whereClauses.push(`source_system = $${paramIndex}`);
        params.push(filters.system);
        paramIndex++;
      }

      if (filters?.layer) {
        whereClauses.push(`schema_name ILIKE $${paramIndex}`);
        params.push(`%${filters.layer.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters?.status) {
        const statusValue = filters.status.toLowerCase() === 'failed' ? 'Fail' :
                           filters.status.toLowerCase() === 'success' ? 'Success' :
                           filters.status;
        whereClauses.push(`status = $${paramIndex}`);
        params.push(statusValue);
        paramIndex++;
      }

      if (filters?.targetTable) {
        whereClauses.push(`target_table_name LIKE $${paramIndex}`);
        params.push(`%${filters.targetTable}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT status, COUNT(DISTINCT code_name) as count
        FROM audit_table
        ${whereClause}
        GROUP BY status
      `;

      const result = await client.query(query, params);
      
      const metrics = {
        totalPipelines: 0,
        successfulRuns: 0,
        failedRuns: 0,
        scheduledRuns: 0,
        runningRuns: 0,
      };

      result.rows.forEach(row => {
        const status = row.status?.toLowerCase();
        const count = Number(row.count);

        metrics.totalPipelines += count;

        if (status === 'success') {
          metrics.successfulRuns += count;
        } else if (status === 'failed' || status === 'fail') {
          metrics.failedRuns += count;
        } else if (status === 'scheduled') {
          metrics.scheduledRuns += count;
        } else if (status === 'running') {
          metrics.runningRuns += count;
        }
      });

      return metrics;
    } finally {
      client.release();
    }
  }

  async getPipelineSummary(userId: string, dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }) {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty summary if no user config
    if (!userPoolResult) {
      return {
        dataQuality: { total: 0, success: 0, failed: 0 },
        reconciliation: { total: 0, success: 0, failed: 0 },
        bronze: { total: 0, success: 0, failed: 0 },
        silver: { total: 0, success: 0, failed: 0 },
        gold: { total: 0, success: 0, failed: 0 },
      };
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (dateRange) {
        whereClauses.push(`start_time >= $${paramIndex} AND start_time <= $${paramIndex + 1}`);
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      if (filters?.search) {
        whereClauses.push(`code_name LIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.system) {
        whereClauses.push(`source_system = $${paramIndex}`);
        params.push(filters.system);
        paramIndex++;
      }

      if (filters?.layer) {
        whereClauses.push(`schema_name ILIKE $${paramIndex}`);
        params.push(`%${filters.layer.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters?.status) {
        const statusValue = filters.status.toLowerCase() === 'failed' ? 'Fail' :
                           filters.status.toLowerCase() === 'success' ? 'Success' :
                           filters.status;
        whereClauses.push(`status = $${paramIndex}`);
        params.push(statusValue);
        paramIndex++;
      }

      if (filters?.targetTable) {
        whereClauses.push(`target_table_name LIKE $${paramIndex}`);
        params.push(`%${filters.targetTable}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT schema_name, status, COUNT(DISTINCT code_name) as count
        FROM audit_table
        ${whereClause}
        GROUP BY schema_name, status
      `;

      const result = await client.query(query, params);

      const summary = {
        dataQuality: { total: 0, success: 0, failed: 0 },
        reconciliation: { total: 0, success: 0, failed: 0 },
        bronze: { total: 0, success: 0, failed: 0 },
        silver: { total: 0, success: 0, failed: 0 },
        gold: { total: 0, success: 0, failed: 0 },
      };

      result.rows.forEach(row => {
        const schemaName = row.schema_name?.toLowerCase() || '';
        const status = row.status?.toLowerCase();
        const count = Number(row.count);

        let category: keyof typeof summary;

        // Categorize based on schema name patterns
        if (schemaName.includes('quality')) {
          category = 'dataQuality';
        } else if (schemaName.includes('reconciliation')) {
          category = 'reconciliation';
        } else if (schemaName.includes('bronze')) {
          category = 'bronze';
        } else if (schemaName.includes('silver')) {
          category = 'silver';
        } else if (schemaName.includes('gold')) {
          category = 'gold';
        } else {
          // Default to bronze for schemas that don't match specific patterns
          category = 'bronze';
        }

        summary[category].total += count;

        if (status === 'success') {
          summary[category].success += count;
        } else if (status === 'failed' || status === 'fail') {
          summary[category].failed += count;
        }
      });

      return summary;
    } finally {
      client.release();
    }
  }

  async getPipelineRuns(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty result if no user config
    if (!userPoolResult) {
      return {
        data: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 5,
      };
    }

    const userPool = userPoolResult.pool;
    const {
      page = 1,
      limit = 5,
      search,
      sourceSystem,
      status,
      dateRange,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = options;

    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClauses.push(`code_name LIKE $${paramIndex}`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (sourceSystem && sourceSystem !== 'all') {
        whereClauses.push(`source_system = $${paramIndex}`);
        params.push(sourceSystem);
        paramIndex++;
      }

      if (status && status !== 'all') {
        whereClauses.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (dateRange) {
        whereClauses.push(`start_time >= $${paramIndex} AND start_time <= $${paramIndex + 1}`);
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM audit_table
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.count || '0');

      // Build sort column
      const sortColumnMap: Record<string, string> = {
        'codeName': 'code_name',
        'status': 'status',
        'sourceSystem': 'source_system',
        'startTime': 'start_time'
      };
      const sortColumn = sortColumnMap[sortBy] || 'start_time';
      const sortOrderClause = sortOrder.toUpperCase();

      // Apply pagination
      const offset = (page - 1) * limit;
      
      const dataQuery = `
        SELECT 
          audit_key, code_name, run_id, source_system, schema_name,
          target_table_name, source_file_name, start_time, end_time,
          inserted_row_count, updated_row_count, deleted_row_count,
          no_change_row_count, status
        FROM audit_table
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const dataResult = await client.query(dataQuery, [...params, limit, offset]);

      // Get error details for each audit record
      const auditKeys = dataResult.rows.map(r => r.audit_key);
      let errorDetails: Record<number, string> = {};

      if (auditKeys.length > 0) {
        const errorQuery = `
          SELECT audit_key, error_details
          FROM error_table
          WHERE audit_key = ANY($1)
        `;
        const errorResult = await client.query(errorQuery, [auditKeys]);
        
        errorResult.rows.forEach(error => {
          if (error.audit_key && !errorDetails[error.audit_key]) {
            errorDetails[error.audit_key] = error.error_details || '';
          }
        });
      }

      const data = dataResult.rows.map(row => ({
        auditKey: row.audit_key,
        codeName: row.code_name || 'Unknown Process',
        runId: row.run_id || '',
        sourceSystem: row.source_system || 'Unknown',
        schemaName: row.schema_name || '',
        targetTableName: row.target_table_name || '',
        sourceFileName: row.source_file_name || '',
        startTime: row.start_time || new Date(),
        endTime: row.end_time || undefined,
        insertedRowCount: row.inserted_row_count || 0,
        updatedRowCount: row.updated_row_count || 0,
        deletedRowCount: row.deleted_row_count || 0,
        noChangeRowCount: row.no_change_row_count || 0,
        status: row.status || 'Unknown',
        errorDetails: errorDetails[row.audit_key] || undefined,
        duration: row.end_time && row.start_time ?
          Math.round((new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 1000) : undefined,
      }));

      return {
        data,
        total,
        page,
        limit,
      };
    } finally {
      client.release();
    }
  }

  async getAllPipelines(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty result if no user config
    if (!userPoolResult) {
      return {
        data: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 10,
      };
    }

    const userPool = userPoolResult.pool;
    const {
      page = 1,
      limit = 10,
      search,
      sourceSystem,
      status,
      dateRange,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = options;

    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClauses.push(`(
          code_name ILIKE $${paramIndex} OR
          run_id ILIKE $${paramIndex} OR
          source_system ILIKE $${paramIndex} OR
          target_table_name ILIKE $${paramIndex} OR
          source_file_name ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (sourceSystem && sourceSystem !== 'all') {
        whereClauses.push(`source_system = $${paramIndex}`);
        params.push(sourceSystem);
        paramIndex++;
      }

      if (status && status !== 'all') {
        whereClauses.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (dateRange) {
        whereClauses.push(`start_time >= $${paramIndex} AND start_time <= $${paramIndex + 1}`);
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM audit_table
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0]?.count || '0');

      // Build sort column
      const sortColumnMap: Record<string, string> = {
        'codeName': 'code_name',
        'runId': 'run_id',
        'sourceSystem': 'source_system',
        'status': 'status',
        'startTime': 'start_time'
      };
      const sortColumn = sortColumnMap[sortBy] || 'start_time';
      const sortOrderClause = sortOrder.toUpperCase();

      // Apply pagination
      const offset = (page - 1) * limit;
      
      const dataQuery = `
        SELECT 
          audit_key, code_name, run_id, source_system, schema_name,
          target_table_name, source_file_name, start_time, end_time,
          inserted_row_count, updated_row_count, deleted_row_count,
          no_change_row_count, status
        FROM audit_table
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const dataResult = await client.query(dataQuery, [...params, limit, offset]);

      const data = dataResult.rows.map(row => ({
        auditKey: row.audit_key,
        codeName: row.code_name || 'Unknown Process',
        runId: row.run_id || '',
        sourceSystem: row.source_system || 'Unknown',
        schemaName: row.schema_name || '',
        targetTableName: row.target_table_name || '',
        sourceFileName: row.source_file_name || '',
        startTime: row.start_time || new Date(),
        endTime: row.end_time || undefined,
        insertedRowCount: row.inserted_row_count || 0,
        updatedRowCount: row.updated_row_count || 0,
        deletedRowCount: row.deleted_row_count || 0,
        noChangeRowCount: row.no_change_row_count || 0,
        status: row.status || 'Unknown',
      }));

      return {
        data,
        total,
        page,
        limit,
      };
    } finally {
      client.release();
    }
  }

  async getErrors(userId: string, dateRange?: { start: Date; end: Date }) {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (dateRange) {
        whereClauses.push(`execution_time >= $${paramIndex} AND execution_time <= $${paramIndex + 1}`);
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM error_table
        ${whereClause}
        ORDER BY execution_time DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private getLayerFromCodeName(codeName: string): string {
    const name = codeName.toLowerCase();
    if (name.includes('quality')) return 'Quality';
    if (name.includes('reconciliation')) return 'Reconciliation';
    if (name.includes('bronze')) return 'Bronze';
    if (name.includes('silver')) return 'Silver';
    if (name.includes('gold')) return 'Gold';
    return 'Bronze'; // Default
  }

  private getOwnerFromSystem(sourceSystem: string): string {
    // In a real system, this would map to actual users
    const owners = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Alex Chen', 'Lisa Wang'];
    const hash = sourceSystem.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return owners[Math.abs(hash) % owners.length];
  }

  // Source connection methods
  async createConnection(userId: string, connection: InsertSourceConnection): Promise<SourceConnection> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) throw new Error('User configuration not found');
    const { db: userDb } = userPoolResult;

    try {
      console.log('Creating connection with data:', connection);
      const [created] = await userDb
        .insert(sourceConnectionTable)
        .values({
          connectionName: connection.connectionName,
          connectionType: connection.connectionType,
          host: connection.host || null,
          port: connection.port || null,
          username: connection.username || null,
          password: connection.password || null,
          databaseName: connection.databaseName || null,
          filePath: connection.filePath || null,
          apiKey: connection.apiKey || null,
          cloudProvider: connection.cloudProvider || null,
          status: connection.status || 'Pending',
          lastSync: connection.lastSync || null
        })
        .returning();
      console.log('Connection created successfully:', created);
      return created;
    } catch (error) {
      console.error('Error creating connection in database:', error);
      throw new Error(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConnections(userId: string, filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<SourceConnection[]> {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.category && filters.category !== 'all') {
        const categoryMap: { [key: string]: string[] } = {
          'database': ['Database', 'MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'MongoDB'],
          'file': ['File', 'CSV', 'JSON', 'XML', 'Excel'],
          'cloud': ['Azure', 'AWS', 'GCP', 'Cloud'],
          'api': ['API', 'REST', 'GraphQL', 'HTTP'],
          'other': ['FTP', 'SFTP', 'Salesforce', 'SSH', 'Other']
        };

        if (categoryMap[filters.category]) {
          whereClauses.push(`connection_type = ANY($${paramIndex})`);
          params.push(categoryMap[filters.category]);
          paramIndex++;
        }
      }

      if (filters?.search) {
        whereClauses.push(`connection_name LIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.status && filters.status !== 'all') {
        whereClauses.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM source_connection_table
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw new Error(`Failed to fetch connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getConnection(userId: string, id: number): Promise<SourceConnection | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [connection] = await userDb
      .select()
      .from(sourceConnectionTable)
      .where(eq(sourceConnectionTable.connectionId, id));
    return connection || undefined;
  }

  async updateConnection(userId: string, id: number, updates: UpdateSourceConnection): Promise<SourceConnection | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [updated] = await userDb
      .update(sourceConnectionTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sourceConnectionTable.connectionId, id))
      .returning();
    return updated || undefined;
  }

  async deleteConnection(userId: string, id: number): Promise<boolean> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return false;
    const { db: userDb } = userPoolResult;

    const result = await userDb
      .delete(sourceConnectionTable)
      .where(eq(sourceConnectionTable.connectionId, id));
    return (result.rowCount || 0) > 0;
  }

  async testConnection(userId: string, connectionData: Partial<SourceConnection>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const { connectionType, host, port, username, password, databaseName, apiKey, filePath } = connectionData;

    try {
      switch (connectionType?.toLowerCase()) {
        case 'database':
        case 'mysql':
        case 'postgresql':
        case 'sql server':
          if (!host || !username || !password) {
            return {
              success: false,
              message: 'Missing required database connection parameters'
            };
          }
          // Simulate database connection test
          await this.simulateConnectionDelay();
          return {
            success: true,
            message: 'Database connection successful',
            details: { host, port: port || 5432, database: databaseName }
          };

        case 'api':
        case 'rest':
        case 'http':
          if (!host || !apiKey) {
            return {
              success: false,
              message: 'Missing API endpoint or API key'
            };
          }
          await this.simulateConnectionDelay();
          return {
            success: true,
            message: 'API connection successful',
            details: { endpoint: host }
          };

        case 'file':
        case 'csv':
        case 'json':
          if (!filePath) {
            return {
              success: false,
              message: 'Missing file path'
            };
          }
          await this.simulateConnectionDelay();
          return {
            success: true,
            message: 'File access successful',
            details: { path: filePath }
          };

        case 'cloud':
        case 'azure':
        case 'aws':
        case 'gcp':
          if (!apiKey && !password) {
            return {
              success: false,
              message: 'Missing cloud credentials'
            };
          }
          await this.simulateConnectionDelay();
          return {
            success: true,
            message: 'Cloud connection successful',
            details: { provider: connectionType }
          };

        case 'ftp':
        case 'sftp':
          if (!host || !username || !password) {
            return {
              success: false,
              message: 'Missing FTP/SFTP credentials'
            };
          }
          await this.simulateConnectionDelay();
          return {
            success: true,
            message: 'FTP/SFTP connection successful',
            details: { host, port: port || 21 }
          };

        default:
          return {
            success: false,
            message: 'Unsupported connection type'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        details: error
      };
    }
  }

  private async simulateConnectionDelay(): Promise<void> {
    // Simulate network delay for connection testing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
  }

  // Get database schemas from a connection
  async getDatabaseSchemas(userId: string, connectionId: number): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // For PostgreSQL connections, try to connect to the actual database
    if (connection.connectionType?.toLowerCase() === 'postgresql') {
      try {
        // Create connection to the external PostgreSQL database
        // Check if this is a cloud database that requires SSL
        const requiresSSL = connection.host?.includes('neon.tech') ||
                          connection.host?.includes('aws') ||
                          connection.host?.includes('gcp') ||
                          connection.host?.includes('azure');

        let pool;
        if (requiresSSL) {
          // Use connection string with SSL parameters for cloud databases
          const connectionString = `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port || 5432}/${connection.databaseName}?sslmode=require`;
          pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        } else {
          // Use regular config for local databases
          pool = new Pool({
            host: connection.host || undefined,
            port: connection.port || 5432,
            database: connection.databaseName || undefined,
            user: connection.username || undefined,
            password: connection.password || undefined,
            ssl: false,
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        }

        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name
          `);

          await client.release();
          await pool.end();

          return result.rows.map((row: any) => row.schema_name);
        } catch (queryError) {
          await client.release();
          await pool.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching schemas from external database:', error);
        throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For MySQL connections, connect to the actual MySQL database
    if (connection.connectionType?.toLowerCase() === 'mysql') {
      try {
        const mysqlConnection = await mysql.createConnection({
          host: connection.host || undefined,
          port: connection.port || 3306,
          user: connection.username || undefined,
          password: connection.password || undefined,
          database: connection.databaseName || undefined,
          connectTimeout: 10000, // 10 second timeout
        });

        try {
          const [rows] = await mysqlConnection.query(`
            SELECT SCHEMA_NAME
            FROM information_schema.SCHEMATA
            WHERE SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
            ORDER BY SCHEMA_NAME
          `);

          await mysqlConnection.end();
          
          return (rows as any[]).map((row: any) => row.SCHEMA_NAME);
        } catch (queryError) {
          await mysqlConnection.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching schemas from MySQL database:', error);
        throw new Error(`Failed to connect to MySQL database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Simulate fetching schemas for other connection types
    await this.simulateConnectionDelay();

    switch (connection.connectionType?.toLowerCase()) {
      case 'sql server':
        return ['dbo', 'sys', 'INFORMATION_SCHEMA', 'tempdb', 'model', 'msdb'];
      case 'oracle':
        return ['HR', 'OE', 'PM', 'IX', 'SH', 'BI'];
      default:
        return ['public', 'default'];
    }
  }

  // Get database columns from a connection, schema, and table
  async getDatabaseColumns(userId: string, connectionId: number, schemaName: string, tableName: string): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // For PostgreSQL connections, try to connect to the actual database
    if (connection.connectionType?.toLowerCase() === 'postgresql') {
      try {
        // Create connection to the external PostgreSQL database
        // Check if this is a cloud database that requires SSL
        const requiresSSL = connection.host?.includes('neon.tech') ||
                          connection.host?.includes('aws') ||
                          connection.host?.includes('gcp') ||
                          connection.host?.includes('azure');

        let pool;
        if (requiresSSL) {
          // Use connection string with SSL parameters for cloud databases
          const connectionString = `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port || 5432}/${connection.databaseName}?sslmode=require`;
          pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        } else {
          // Use regular config for local databases
          pool = new Pool({
            host: connection.host || undefined,
            port: connection.port || 5432,
            database: connection.databaseName || undefined,
            user: connection.username || undefined,
            password: connection.password || undefined,
            ssl: false,
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        }

        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
            AND table_name = $2
            ORDER BY ordinal_position
          `, [schemaName, tableName]);

          await client.release();
          await pool.end();

          return result.rows.map((row: any) => row.column_name);
        } catch (queryError) {
          await client.release();
          await pool.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching columns from external database:', error);
        throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For MySQL connections, connect to the actual MySQL database
    if (connection.connectionType?.toLowerCase() === 'mysql') {
      try {
        const mysqlConnection = await mysql.createConnection({
          host: connection.host || undefined,
          port: connection.port || 3306,
          user: connection.username || undefined,
          password: connection.password || undefined,
          database: connection.databaseName || undefined,
          connectTimeout: 10000, // 10 second timeout
        });

        try {
          const [rows] = await mysqlConnection.query(`
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
          `, [schemaName, tableName]);

          await mysqlConnection.end();
          
          return (rows as any[]).map((row: any) => row.COLUMN_NAME);
        } catch (queryError) {
          await mysqlConnection.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching columns from MySQL database:', error);
        throw new Error(`Failed to connect to MySQL database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Return mock columns for other connection types
    await this.simulateConnectionDelay();
    return ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'];
  }

  // Get enhanced database column metadata with data types and constraints
  async getDatabaseColumnMetadata(userId: string, connectionId: number, schemaName: string, tableName: string): Promise<any[]> {
    // Get the connection details first
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // For PostgreSQL connections, try to connect to the actual database
    if (connection.connectionType?.toLowerCase() === 'postgresql') {
      try {
        // Create connection to the external PostgreSQL database
        // Check if this is a cloud database that requires SSL
        const requiresSSL = connection.host?.includes('neon.tech') ||
                          connection.host?.includes('aws') ||
                          connection.host?.includes('gcp') ||
                          connection.host?.includes('azure');

        let pool;
        if (requiresSSL) {
          // Use connection string with SSL parameters for cloud databases
          const connectionString = `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port || 5432}/${connection.databaseName}?sslmode=require`;
          pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        } else {
          // Use regular config for local databases
          pool = new Pool({
            host: connection.host || undefined,
            port: connection.port || 5432,
            database: connection.databaseName || undefined,
            user: connection.username || undefined,
            password: connection.password || undefined,
            ssl: false,
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        }

        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT
              c.column_name,
              c.data_type,
              c.character_maximum_length,
              c.numeric_precision,
              c.numeric_scale,
              c.is_nullable,
              CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
              CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
              fk.foreign_table_name
            FROM information_schema.columns c
            LEFT JOIN (
              SELECT kcu.column_name, kcu.table_schema, kcu.table_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name
                AND c.table_schema = pk.table_schema
                AND c.table_name = pk.table_name
            LEFT JOIN (
              SELECT
                kcu.column_name,
                kcu.table_schema,
                kcu.table_name,
                ccu.table_name as foreign_table_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
              WHERE tc.constraint_type = 'FOREIGN KEY'
            ) fk ON c.column_name = fk.column_name
                AND c.table_schema = fk.table_schema
                AND c.table_name = fk.table_name
            WHERE c.table_schema = $1
            AND c.table_name = $2
            ORDER BY c.ordinal_position
          `, [schemaName, tableName]);

          await client.release();
          await pool.end();

          return result.rows.map((row: any) => ({
            attributeName: row.column_name,
            dataType: row.data_type,
            length: row.character_maximum_length,
            precision: row.numeric_precision,
            scale: row.numeric_scale,
            isPrimaryKey: row.is_primary_key,
            isForeignKey: row.is_foreign_key,
            foreignKeyTable: row.foreign_table_name,
            columnDescription: '',
            isNotNull: row.is_nullable === 'NO'
          }));
        } catch (queryError) {
          await client.release();
          await pool.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching column metadata from external database:', error);
        throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For MySQL connections, connect to the actual MySQL database
    if (connection.connectionType?.toLowerCase() === 'mysql') {
      try {
        const mysqlConnection = await mysql.createConnection({
          host: connection.host || undefined,
          port: connection.port || 3306,
          user: connection.username || undefined,
          password: connection.password || undefined,
          database: connection.databaseName || undefined,
          connectTimeout: 10000, // 10 second timeout
        });

        try {
          const [rows] = await mysqlConnection.query(`
            SELECT
              c.COLUMN_NAME as column_name,
              c.DATA_TYPE as data_type,
              c.CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
              c.NUMERIC_PRECISION as numeric_precision,
              c.NUMERIC_SCALE as numeric_scale,
              c.IS_NULLABLE as is_nullable,
              CASE WHEN k.COLUMN_NAME IS NOT NULL AND k.CONSTRAINT_NAME = 'PRIMARY' THEN true ELSE false END as is_primary_key,
              CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN true ELSE false END as is_foreign_key,
              fk.REFERENCED_TABLE_NAME as foreign_table_name
            FROM information_schema.COLUMNS c
            LEFT JOIN information_schema.KEY_COLUMN_USAGE k
              ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
              AND c.TABLE_NAME = k.TABLE_NAME
              AND c.COLUMN_NAME = k.COLUMN_NAME
              AND k.CONSTRAINT_NAME = 'PRIMARY'
            LEFT JOIN information_schema.KEY_COLUMN_USAGE fk
              ON c.TABLE_SCHEMA = fk.TABLE_SCHEMA
              AND c.TABLE_NAME = fk.TABLE_NAME
              AND c.COLUMN_NAME = fk.COLUMN_NAME
              AND fk.REFERENCED_TABLE_NAME IS NOT NULL
            WHERE c.TABLE_SCHEMA = ?
            AND c.TABLE_NAME = ?
            ORDER BY c.ORDINAL_POSITION
          `, [schemaName, tableName]);

          await mysqlConnection.end();
          
          return (rows as any[]).map((row: any) => ({
            attributeName: row.column_name,
            dataType: row.data_type,
            length: row.character_maximum_length,
            precision: row.numeric_precision,
            scale: row.numeric_scale,
            isPrimaryKey: row.is_primary_key,
            isForeignKey: row.is_foreign_key,
            foreignKeyTable: row.foreign_table_name,
            columnDescription: '',
            isNotNull: row.is_nullable === 'NO'
          }));
        } catch (queryError) {
          await mysqlConnection.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching column metadata from MySQL database:', error);
        throw new Error(`Failed to connect to MySQL database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Return mock metadata for other connection types
    await this.simulateConnectionDelay();
    return [
      { attributeName: 'id', dataType: 'integer', isPrimaryKey: true, isForeignKey: false, columnDescription: '' },
      { attributeName: 'name', dataType: 'varchar', length: 255, isPrimaryKey: false, isForeignKey: false, columnDescription: '' },
      { attributeName: 'email', dataType: 'varchar', length: 255, isPrimaryKey: false, isForeignKey: false, columnDescription: '' },
      { attributeName: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isForeignKey: false, columnDescription: '' }
    ];
  }

  // Get database tables from a connection and schema
  async getDatabaseTables(userId: string, connectionId: number, schemaName: string): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // For PostgreSQL connections, try to connect to the actual database
    if (connection.connectionType?.toLowerCase() === 'postgresql') {
      try {
        // Create connection to the external PostgreSQL database
        // Check if this is a cloud database that requires SSL
        const requiresSSL = connection.host?.includes('neon.tech') ||
                          connection.host?.includes('aws') ||
                          connection.host?.includes('gcp') ||
                          connection.host?.includes('azure');

        let pool;
        if (requiresSSL) {
          // Use connection string with SSL parameters for cloud databases
          const connectionString = `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port || 5432}/${connection.databaseName}?sslmode=require`;
          pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        } else {
          // Use regular config for local databases
          pool = new Pool({
            host: connection.host || undefined,
            port: connection.port || 5432,
            database: connection.databaseName || undefined,
            user: connection.username || undefined,
            password: connection.password || undefined,
            ssl: false,
            connectionTimeoutMillis: 10000, // 10 second timeout
          });
        }

        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `, [schemaName]);

          await client.release();
          await pool.end();

          return result.rows.map((row: any) => row.table_name);
        } catch (queryError) {
          await client.release();
          await pool.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching tables from external database:', error);
        throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For MySQL connections, connect to the actual MySQL database
    if (connection.connectionType?.toLowerCase() === 'mysql') {
      try {
        const mysqlConnection = await mysql.createConnection({
          host: connection.host || undefined,
          port: connection.port || 3306,
          user: connection.username || undefined,
          password: connection.password || undefined,
          database: connection.databaseName || undefined,
          connectTimeout: 10000, // 10 second timeout
        });

        try {
          const [rows] = await mysqlConnection.query(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
          `, [schemaName]);

          await mysqlConnection.end();
          
          return (rows as any[]).map((row: any) => row.TABLE_NAME);
        } catch (queryError) {
          await mysqlConnection.end();
          throw queryError;
        }
      } catch (error) {
        console.error('Error fetching tables from MySQL database:', error);
        throw new Error(`Failed to connect to MySQL database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Simulate fetching tables for other connection types
    await this.simulateConnectionDelay();

    // Return sample tables based on schema name
    const sampleTables: Record<string, string[]> = {
      'public': ['users', 'orders', 'products', 'customers', 'payments'],
      'sales_db': ['sales_transactions', 'sales_reps', 'territories', 'quotas'],
      'inventory_db': ['products', 'warehouses', 'stock_levels', 'suppliers'],
      'analytics': ['user_events', 'page_views', 'conversion_funnel', 'cohort_analysis'],
      'reporting': ['daily_summary', 'monthly_reports', 'kpi_metrics', 'dashboard_data'],
      'dbo': ['Customers', 'Orders', 'Products', 'Employees', 'Categories'],
      'HR': ['EMPLOYEES', 'DEPARTMENTS', 'JOBS', 'JOB_HISTORY', 'LOCATIONS'],
      'default': ['table1', 'table2', 'table3', 'table4', 'table5']
    };

    return sampleTables[schemaName] || sampleTables['default'];
  }

  // Pipeline configuration methods
  async getPipelines(userId: string, filters?: { search?: string; executionLayer?: string; sourceSystem?: string; status?: string }): Promise<ConfigRecord[]> {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.search) {
        whereClauses.push(`source_table_name LIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.executionLayer && filters.executionLayer !== 'all') {
        whereClauses.push(`LOWER(execution_layer) = LOWER($${paramIndex})`);
        params.push(filters.executionLayer);
        paramIndex++;
      }

      if (filters?.sourceSystem && filters.sourceSystem !== 'all') {
        whereClauses.push(`LOWER(source_system) = LOWER($${paramIndex})`);
        params.push(filters.sourceSystem);
        paramIndex++;
      }

      if (filters?.status && filters.status !== 'all') {
        whereClauses.push(`active_flag = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM config_table
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      throw new Error(`Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getPipeline(userId: string, id: number): Promise<ConfigRecord | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [pipeline] = await userDb.select().from(configTable).where(eq(configTable.configKey, id));
    return pipeline || undefined;
  }

  async createPipeline(userId: string, pipeline: InsertConfigRecord): Promise<ConfigRecord> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) throw new Error('User configuration not found');
    const { db: userDb } = userPoolResult;

    try {
      console.log('Creating pipeline with data:', JSON.stringify(pipeline, null, 2));
      const [created] = await userDb.insert(configTable).values(pipeline).returning();
      return created;
    } catch (error) {
      console.error('Error creating pipeline:', error);
      throw new Error(`Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePipeline(userId: string, id: number, updates: UpdateConfigRecord): Promise<ConfigRecord | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [updated] = await userDb
      .update(configTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(configTable.configKey, id))
      .returning();
    return updated || undefined;
  }

  async deletePipeline(userId: string, id: number): Promise<boolean> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return false;
    const { db: userDb } = userPoolResult;

    const result = await userDb.delete(configTable).where(eq(configTable.configKey, id));
    return (result.rowCount || 0) > 0;
  }

  async getMetadata(userId: string, type: string): Promise<string[]> {
    // Static metadata for dropdowns - in production this could come from a metadata table
    const metadataMap: Record<string, string[]> = {
      'execution_layer': ['Bronze', 'Silver', 'Gold'],
      'load_type': ['Truncate', 'Incremental', 'SCD1', 'SCD2'],
      'source_system': ['MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'CSV', 'JSON', 'Parquet', 'Excel', 'API'],
      'connection_types': ['MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'CSV', 'JSON', 'Parquet', 'Excel', 'API'],
      'source_type': ['Table', 'File', 'API'],
      'target_type': ['Table', 'File', 'API'],
      'file_delimiter': [',', ';', '|', '\t', 'NA'],
      'active_flag': ['Y', 'N'],
      'dynamic_schema': ['Y', 'N'],
      'full_refresh_flag': ['Y', 'N'],
      'execution_sequence': ['Pre', 'Post', 'NA'],
      'effective_date': ['created_at', 'updated_at', 'last_modified', 'effective_date'],
      'data_type': ['int', 'bigint', 'varchar', 'text', 'char', 'decimal', 'float', 'double', 'boolean', 'date', 'datetime', 'timestamp', 'json', 'blob'],
      'is_not_null': ['Yes', 'No'],
      'is_primary_key': ['Yes', 'No'],
      'is_foreign_key': ['Yes', 'No'],
      'recon_type': ['Count Check', 'Amount Check', 'Sum Check', 'Data Check', 'Duplicate Check', 'Null Check']
    };

    return metadataMap[type] || [];
  }

  // Data dictionary implementation
  async getDataDictionaryEntries(userId: string, filters?: { search?: string; executionLayer?: string; schemaName?: string; tableName?: string; customField?: string; customValue?: string }): Promise<DataDictionaryRecord[]> {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.search) {
        whereClauses.push(`attribute_name LIKE $${paramIndex}`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.executionLayer && filters.executionLayer !== 'all') {
        whereClauses.push(`execution_layer = $${paramIndex}`);
        params.push(filters.executionLayer);
        paramIndex++;
      }

      if (filters?.schemaName && filters.schemaName !== 'all') {
        whereClauses.push(`schema_name = $${paramIndex}`);
        params.push(filters.schemaName);
        paramIndex++;
      }

      if (filters?.tableName && filters.tableName !== 'all') {
        whereClauses.push(`table_name = $${paramIndex}`);
        params.push(filters.tableName);
        paramIndex++;
      }

      // Handle custom field filtering
      if (filters?.customField && filters?.customValue && filters.customField !== 'all') {
        switch (filters.customField) {
          case 'attributeName':
            whereClauses.push(`attribute_name LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'dataType':
            whereClauses.push(`data_type LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'schemaName':
            whereClauses.push(`schema_name LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'tableName':
            whereClauses.push(`table_name LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'columnDescription':
            whereClauses.push(`column_description LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'createdBy':
            whereClauses.push(`created_by LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'updatedBy':
            whereClauses.push(`updated_by LIKE $${paramIndex}`);
            params.push(`%${filters.customValue}%`);
            paramIndex++;
            break;
          case 'configKey':
            const configKeyValue = parseInt(filters.customValue);
            if (!isNaN(configKeyValue)) {
              whereClauses.push(`config_key = $${paramIndex}`);
              params.push(configKeyValue);
              paramIndex++;
            }
            break;
        }
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM data_dictionary_table
        ${whereClause}
        ORDER BY insert_date DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching data dictionary entries:', error);
      throw new Error(`Failed to fetch data dictionary entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getDataDictionaryEntry(userId: string, id: number): Promise<DataDictionaryRecord | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [entry] = await userDb
      .select()
      .from(dataDictionaryTable)
      .where(eq(dataDictionaryTable.dataDictionaryKey, id));
    return entry || undefined;
  }

  async createDataDictionaryEntry(userId: string, entry: InsertDataDictionaryRecord): Promise<DataDictionaryRecord> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) throw new Error('User configuration not found');
    const { db: userDb } = userPoolResult;

    try {
      const [created] = await userDb
        .insert(dataDictionaryTable)
        .values({
          configKey: entry.configKey,
          executionLayer: entry.executionLayer,
          schemaName: entry.schemaName || null,
          tableName: entry.tableName || null,
          attributeName: entry.attributeName,
          dataType: entry.dataType,
          length: entry.length || null,
          precisionValue: entry.precisionValue || null,
          scale: entry.scale || null,
          columnDescription: entry.columnDescription || null,
          createdBy: entry.createdBy || 'API_USER',
          updatedBy: entry.updatedBy || 'API_USER',
          isNotNull: entry.isNotNull || 'N',
          isPrimaryKey: entry.isPrimaryKey || 'N',
          isForeignKey: entry.isForeignKey || 'N',
          activeFlag: entry.activeFlag || 'Y'
        })
        .returning();
      
      console.log('Successfully inserted data dictionary entry with ID:', created.dataDictionaryKey);
      return created;
    } catch (error) {
      console.error('Error creating data dictionary entry:', error);
      throw error;
    }
  }

  async updateDataDictionaryEntry(userId: string, id: number, updates: UpdateDataDictionaryRecord): Promise<DataDictionaryRecord | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    try {
      const [updated] = await userDb
        .update(dataDictionaryTable)
        .set({
          ...updates,
          updatedBy: updates.updatedBy || 'System'
        })
        .where(eq(dataDictionaryTable.dataDictionaryKey, id))
        .returning();

      console.log('Successfully updated data dictionary entry with ID:', id);
      return updated || undefined;
    } catch (error) {
      console.error('Error updating data dictionary entry:', error);
      throw error;
    }
  }

  async deleteDataDictionaryEntry(userId: string, id: number): Promise<boolean> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return false;
    const { db: userDb } = userPoolResult;

    const result = await userDb
      .delete(dataDictionaryTable)
      .where(eq(dataDictionaryTable.dataDictionaryKey, id));
    return (result.rowCount || 0) > 0;
  }

  // Reconciliation config methods implementation
  async getReconciliationConfigs(userId: string, filters?: { search?: string; executionLayer?: string; configKey?: number; reconType?: string; status?: string }): Promise<ReconciliationConfig[]> {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.search) {
        whereClauses.push(`(LOWER(source_table) LIKE LOWER($${paramIndex}) OR LOWER(target_table) LIKE LOWER($${paramIndex}))`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.executionLayer && filters.executionLayer !== 'all') {
        whereClauses.push(`LOWER(execution_layer) = LOWER($${paramIndex})`);
        params.push(filters.executionLayer);
        paramIndex++;
      }

      if (filters?.configKey) {
        whereClauses.push(`config_key = $${paramIndex}`);
        params.push(filters.configKey);
        paramIndex++;
      }

      if (filters?.reconType && filters.reconType !== 'all') {
        whereClauses.push(`LOWER(recon_type) = LOWER($${paramIndex})`);
        params.push(filters.reconType);
        paramIndex++;
      }

      if (filters?.status && filters.status !== 'all') {
        whereClauses.push(`active_flag = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT *
        FROM reconciliation_config_table
        ${whereClause}
        ORDER BY recon_key DESC
      `;

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching reconciliation configs:', error);
      throw new Error(`Failed to fetch reconciliation configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getReconciliationConfig(userId: string, id: number): Promise<ReconciliationConfig | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [config] = await userDb
      .select()
      .from(reconciliationConfigTable)
      .where(eq(reconciliationConfigTable.reconKey, id));
    return config || undefined;
  }

  async createReconciliationConfig(userId: string, config: InsertReconciliationConfig): Promise<ReconciliationConfig> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) throw new Error('User configuration not found');
    const { db: userDb } = userPoolResult;

    // Get the maximum existing recon_key
    const maxKeyResult = await userDb
      .select({ maxKey: sql`COALESCE(MAX(${reconciliationConfigTable.reconKey}), 0)` })
      .from(reconciliationConfigTable);

    const nextKey = (maxKeyResult[0]?.maxKey || 0) + 1;

    console.log('Creating reconciliation config with next recon_key:', nextKey);
    
    // Use Drizzle ORM insert with explicit recon_key
    const [created] = await userDb
      .insert(reconciliationConfigTable)
      .values({
        reconKey: nextKey,
        configKey: config.configKey,
        executionLayer: config.executionLayer,
        sourceSchema: config.sourceSchema,
        sourceTable: config.sourceTable,
        targetSchema: config.targetSchema,
        targetTable: config.targetTable,
        reconType: config.reconType,
        attribute: config.attribute,
        sourceQuery: config.sourceQuery,
        targetQuery: config.targetQuery,
        thresholdPercentage: config.thresholdPercentage,
        activeFlag: config.activeFlag || 'Y',
      })
      .returning();
      
    console.log('Created reconciliation config with recon_key:', created.reconKey);
    
    return created;
  }

  async updateReconciliationConfig(userId: string, id: number, updates: UpdateReconciliationConfig): Promise<ReconciliationConfig | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [updated] = await userDb
      .update(reconciliationConfigTable)
      .set(updates)
      .where(eq(reconciliationConfigTable.reconKey, id))
      .returning();
    return updated || undefined;
  }

  

  async deleteReconciliationConfig(userId: string, id: number): Promise<boolean> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return false;
    const { db: userDb } = userPoolResult;

    const result = await userDb
      .delete(reconciliationConfigTable)
      .where(eq(reconciliationConfigTable.reconKey, id));
    return (result.rowCount || 0) > 0;
  }

  // Data Quality Config implementations
  async getDataQualityConfigs(userId: string, filters?: { search?: string; executionLayer?: string; configKey?: number; validationType?: string; status?: string }): Promise<DataQualityConfig[]> {
    const userPoolResult = await getUserSpecificPool(userId);
    
    // Return empty array if no user config
    if (!userPoolResult) {
      return [];
    }

    const userPool = userPoolResult.pool;
    const client = await userPool.connect();
    
    try {
      // Build WHERE clause conditions
      const whereClauses = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.search) {
        whereClauses.push(`(LOWER(table_name) LIKE LOWER($${paramIndex}) OR LOWER(attribute_name) LIKE LOWER($${paramIndex}))`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.executionLayer && filters.executionLayer !== 'all') {
        whereClauses.push(`LOWER(execution_layer) = LOWER($${paramIndex})`);
        params.push(filters.executionLayer);
        paramIndex++;
      }

      if (filters?.configKey) {
        whereClauses.push(`config_key = $${paramIndex}`);
        params.push(filters.configKey);
        paramIndex++;
      }

      if (filters?.validationType && filters.validationType !== 'all') {
        whereClauses.push(`LOWER(validation_type) = LOWER($${paramIndex})`);
        params.push(filters.validationType);
        paramIndex++;
      }

      if (filters?.status && filters.status !== 'all') {
        whereClauses.push(`active_flag = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          data_quality_key,
          config_key,
          execution_layer,
          table_name,
          attribute_name,
          validation_type,
          reference_table_name,
          default_value,
          error_table_transfer_flag,
          threshold_percentage,
          active_flag,
          custom_query
        FROM data_quality_config_table
        ${whereClause}
        ORDER BY data_quality_key DESC
      `;

      const result = await client.query(query, params);
      
      // Add null values for the target fields for application compatibility
      return result.rows.map(row => ({
        ...row,
        targetSystem: null,
        targetConnectionId: null,
        targetType: null,
        targetSchema: null,
        targetTableName: null,
      }));
    } catch (error) {
      console.error('Error fetching data quality configs:', error);
      throw new Error(`Failed to fetch data quality configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  async getDataQualityConfig(userId: string, id: number): Promise<DataQualityConfig | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [config] = await userDb
      .select()
      .from(dataQualityConfigTable)
      .where(eq(dataQualityConfigTable.dataQualityKey, id));
    return config || undefined;
  }

  async createDataQualityConfig(userId: string, config: InsertDataQualityConfig): Promise<DataQualityConfig> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) throw new Error('User configuration not found');
    const { db: userDb } = userPoolResult;

    // Get the maximum existing data_quality_key
    const maxKeyResult = await userDb
      .select({ maxKey: sql`COALESCE(MAX(${dataQualityConfigTable.dataQualityKey}), 0)` })
      .from(dataQualityConfigTable);

    const nextKey = (maxKeyResult[0]?.maxKey || 0) + 1;

    // Only insert fields that exist in the external database, with explicit primary key
    const insertData = {
      dataQualityKey: nextKey,
      configKey: config.configKey,
      executionLayer: config.executionLayer,
      tableName: config.tableName,
      attributeName: config.attributeName,
      validationType: config.validationType,
      referenceTableName: config.referenceTableName,
      defaultValue: config.defaultValue,
      errorTableTransferFlag: config.errorTableTransferFlag,
      thresholdPercentage: config.thresholdPercentage,
      activeFlag: config.activeFlag,
      customQuery: config.customQuery,
    };

    const [created] = await userDb
      .insert(dataQualityConfigTable)
      .values(insertData)
      .returning();
    return created;
  }

  async updateDataQualityConfig(userId: string, id: number, updates: UpdateDataQualityConfig): Promise<DataQualityConfig | undefined> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return undefined;
    const { db: userDb } = userPoolResult;

    const [updated] = await userDb
      .update(dataQualityConfigTable)
      .set(updates)
      .where(eq(dataQualityConfigTable.dataQualityKey, id))
      .returning();
    return updated || undefined;
  }

  async deleteDataQualityConfig(userId: string, id: number): Promise<boolean> {
    const userPoolResult = await getUserSpecificPool(userId);
    if (!userPoolResult) return false;
    const { db: userDb } = userPoolResult;

    const result = await userDb
      .delete(dataQualityConfigTable)
      .where(eq(dataQualityConfigTable.dataQualityKey, id));
    return (result.rowCount || 0) > 0;
  }

  // User Config DB Settings methods implementation
  async getUserConfigDbSettings(userId: string): Promise<UserConfigDbSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userConfigDbSettings)
      .where(and(
        eq(userConfigDbSettings.userId, userId),
        eq(userConfigDbSettings.isActive, true)
      ))
      .orderBy(desc(userConfigDbSettings.createdAt))
      .limit(1);
    return settings || undefined;
  }

  async createUserConfigDbSettings(settings: InsertUserConfigDbSettings): Promise<UserConfigDbSettings> {
    const [created] = await db
      .insert(userConfigDbSettings)
      .values(settings)
      .returning();
    return created;
  }

  async updateUserConfigDbSettings(userId: string, updates: UpdateUserConfigDbSettings): Promise<UserConfigDbSettings | undefined> {
    const [updated] = await db
      .update(userConfigDbSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userConfigDbSettings.userId, userId))
      .returning();
    return updated || undefined;
  }

  async testUserConfigDbConnection(settings: Partial<UserConfigDbSettings>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!settings.host || !settings.port || !settings.database || !settings.username || !settings.password) {
      return {
        success: false,
        message: 'Missing required connection parameters',
      };
    }

    let testPool: Pool | null = null;
    
    try {
      testPool = new Pool({
        host: settings.host,
        port: settings.port,
        database: settings.database,
        user: settings.username,
        password: settings.password,
        ssl: settings.sslEnabled || false,
        connectionTimeoutMillis: settings.connectionTimeout || 10000,
      });

      await testPool.query('SELECT 1');
      
      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        details: error.message,
      };
    } finally {
      if (testPool) {
        await testPool.end();
      }
    }
  }

  // User Activity methods implementation
  async logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [logged] = await db
      .insert(userActivity)
      .values(activity)
      .returning();
    return logged;
  }

  async getUserActivity(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();