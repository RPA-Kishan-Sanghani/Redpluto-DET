import { users, auditTable, errorTable, sourceConnectionTable, configTable, dataDictionaryTable, reconciliationConfigTable, dataQualityConfigTable, type User, type InsertUser, type AuditRecord, type ErrorRecord, type SourceConnection, type InsertSourceConnection, type UpdateSourceConnection, type ConfigRecord, type InsertConfigRecord, type UpdateConfigRecord, type DataDictionaryRecord, type InsertDataDictionaryRecord, type UpdateDataDictionaryRecord, type ReconciliationConfig, type InsertReconciliationConfig, type UpdateReconciliationConfig, type DataQualityConfig, type InsertDataQualityConfig, type UpdateDataQualityConfig } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, count, desc, asc, like, inArray, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Dashboard metrics
  getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<{
    totalPipelines: number;
    successfulRuns: number;
    failedRuns: number;
    scheduledRuns: number;
    runningRuns: number;
  }>;

  // Pipeline summary by category
  getPipelineSummary(dateRange?: { start: Date; end: Date }): Promise<{
    dataQuality: { total: number; success: number; failed: number };
    reconciliation: { total: number; success: number; failed: number };
    bronze: { total: number; success: number; failed: number };
    silver: { total: number; success: number; failed: number };
    gold: { total: number; success: number; failed: number };
  }>;

  // Pipeline runs with filtering and pagination
  getPipelineRuns(options: {
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
  getAllPipelines(options: {
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
  getErrors(dateRange?: { start: Date; end: Date }): Promise<ErrorRecord[]>;

  // Source connections
  createConnection(connection: InsertSourceConnection): Promise<SourceConnection>;
  getConnections(filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<SourceConnection[]>;
  getConnection(id: number): Promise<SourceConnection | undefined>;
  updateConnection(id: number, updates: UpdateSourceConnection): Promise<SourceConnection | undefined>;
  deleteConnection(id: number): Promise<boolean>;
  testConnection(connectionData: Partial<SourceConnection>): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }>;

  // Pipeline configuration methods
  getPipelines(filters?: { search?: string; executionLayer?: string; sourceSystem?: string; status?: string }): Promise<ConfigRecord[]>;
  getPipeline(id: number): Promise<ConfigRecord | undefined>;
  createPipeline(pipeline: InsertConfigRecord): Promise<ConfigRecord>;
  updatePipeline(id: number, updates: UpdateConfigRecord): Promise<ConfigRecord | undefined>;
  deletePipeline(id: number): Promise<boolean>;

  // Metadata methods for dropdowns
  getMetadata(type: string): Promise<string[]>;

  // Data dictionary methods
  getDataDictionaryEntries(filters?: { search?: string; executionLayer?: string; configKey?: number }): Promise<DataDictionaryRecord[]>;
  getDataDictionaryEntry(id: number): Promise<DataDictionaryRecord | undefined>;
  createDataDictionaryEntry(entry: InsertDataDictionaryRecord): Promise<DataDictionaryRecord>;
  updateDataDictionaryEntry(id: number, updates: UpdateDataDictionaryRecord): Promise<DataDictionaryRecord | undefined>;
  deleteDataDictionaryEntry(id: number): Promise<boolean>;

  // Reconciliation config methods
  getReconciliationConfigs(filters?: { search?: string; executionLayer?: string; configKey?: number; reconType?: string; status?: string }): Promise<ReconciliationConfig[]>;
  getReconciliationConfig(id: number): Promise<ReconciliationConfig | undefined>;
  createReconciliationConfig(config: InsertReconciliationConfig): Promise<ReconciliationConfig>;
  updateReconciliationConfig(id: number, updates: UpdateReconciliationConfig): Promise<ReconciliationConfig | undefined>;
  deleteReconciliationConfig(id: number): Promise<boolean>;

  // Data Quality Config methods
  getDataQualityConfigs(filters?: { search?: string; executionLayer?: string; configKey?: number; validationType?: string; status?: string }): Promise<DataQualityConfig[]>;
  getDataQualityConfig(id: number): Promise<DataQualityConfig | undefined>;
  createDataQualityConfig(config: InsertDataQualityConfig): Promise<DataQualityConfig>;
  updateDataQualityConfig(id: number, updates: UpdateDataQualityConfig): Promise<DataQualityConfig | undefined>;
  deleteDataQualityConfig(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getDashboardMetrics(dateRange?: { start: Date; end: Date }) {
    let queryBuilder = db.select({
      status: auditTable.status,
      count: count()
    }).from(auditTable);

    if (dateRange) {
      queryBuilder = queryBuilder.where(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    const results = await queryBuilder.groupBy(auditTable.status);

    const metrics = {
      totalPipelines: 0,
      successfulRuns: 0,
      failedRuns: 0,
      scheduledRuns: 0,
      runningRuns: 0,
    };

    results.forEach(result => {
      const status = result.status?.toLowerCase();
      const count = result.count;

      metrics.totalPipelines += count;

      if (status === 'success') {
        metrics.successfulRuns += count;
      } else if (status === 'failed') {
        metrics.failedRuns += count;
      } else if (status === 'scheduled') {
        metrics.scheduledRuns += count;
      } else if (status === 'running') {
        metrics.runningRuns += count;
      }
    });

    return metrics;
  }

  async getPipelineSummary(dateRange?: { start: Date; end: Date }) {
    let queryBuilder = db.select({
      codeName: auditTable.codeName,
      status: auditTable.status,
      count: count()
    }).from(auditTable);

    if (dateRange) {
      queryBuilder = queryBuilder.where(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    const results = await queryBuilder.groupBy(auditTable.codeName, auditTable.status);

    const summary = {
      dataQuality: { total: 0, success: 0, failed: 0 },
      reconciliation: { total: 0, success: 0, failed: 0 },
      bronze: { total: 0, success: 0, failed: 0 },
      silver: { total: 0, success: 0, failed: 0 },
      gold: { total: 0, success: 0, failed: 0 },
    };

    results.forEach(result => {
      const codeName = result.codeName?.toLowerCase() || '';
      const status = result.status?.toLowerCase();
      const count = result.count;

      let category: keyof typeof summary;

      if (codeName.includes('quality')) {
        category = 'dataQuality';
      } else if (codeName.includes('reconciliation')) {
        category = 'reconciliation';
      } else if (codeName.includes('bronze')) {
        category = 'bronze';
      } else if (codeName.includes('silver')) {
        category = 'silver';
      } else if (codeName.includes('gold')) {
        category = 'gold';
      } else {
        // Default to bronze for unspecified layers
        category = 'bronze';
      }

      summary[category].total += count;

      if (status === 'success') {
        summary[category].success += count;
      } else if (status === 'failed') {
        summary[category].failed += count;
      }
    });

    return summary;
  }

  async getPipelineRuns(options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
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

    let queryBuilder = db.select({
      auditKey: auditTable.auditKey,
      codeName: auditTable.codeName,
      runId: auditTable.runId,
      sourceSystem: auditTable.sourceSystem,
      schemaName: auditTable.schemaName,
      targetTableName: auditTable.targetTableName,
      sourceFileName: auditTable.sourceFileName,
      startTime: auditTable.startTime,
      endTime: auditTable.endTime,
      insertedRowCount: auditTable.insertedRowCount,
      updatedRowCount: auditTable.updatedRowCount,
      deletedRowCount: auditTable.deletedRowCount,
      noChangeRowCount: auditTable.noChangeRowCount,
      status: auditTable.status,
    }).from(auditTable);

    const conditions = [];

    if (search) {
      conditions.push(like(auditTable.codeName, `%${search}%`));
    }

    if (sourceSystem && sourceSystem !== 'all') {
      conditions.push(eq(auditTable.sourceSystem, sourceSystem));
    }

    if (status && status !== 'all') {
      conditions.push(eq(auditTable.status, status));
    }

    if (dateRange) {
      conditions.push(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Add sorting
    const sortColumn = sortBy === 'codeName' ? auditTable.codeName :
                      sortBy === 'status' ? auditTable.status :
                      sortBy === 'sourceSystem' ? auditTable.sourceSystem :
                      sortBy === 'startTime' ? auditTable.startTime :
                      auditTable.startTime;

    if (sortOrder === 'desc') {
      queryBuilder = queryBuilder.orderBy(desc(sortColumn));
    } else {
      queryBuilder = queryBuilder.orderBy(asc(sortColumn));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: count() }).from(auditTable);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await queryBuilder.limit(limit).offset(offset);

    // Get error details for each audit record
    const auditKeys = results.map(r => r.auditKey);
    let errorDetails: Record<number, string> = {};

    if (auditKeys.length > 0) {
      const errors = await db.select({
        auditKey: errorTable.auditKey,
        errorMessage: errorTable.errorDetails
      }).from(errorTable)
        .where(inArray(errorTable.auditKey, auditKeys));

      errors.forEach(error => {
        if (!errorDetails[error.auditKey]) {
          errorDetails[error.auditKey] = error.errorMessage || '';
        }
      });
    }

    const data = results.map(row => ({
      auditKey: row.auditKey,
      codeName: row.codeName || 'Unknown Process',
      runId: row.runId || '',
      sourceSystem: row.sourceSystem || 'Unknown',
      schemaName: row.schemaName || '',
      targetTableName: row.targetTableName || '',
      sourceFileName: row.sourceFileName || '',
      startTime: row.startTime || new Date(),
      endTime: row.endTime || undefined,
      insertedRowCount: row.insertedRowCount || 0,
      updatedRowCount: row.updatedRowCount || 0,
      deletedRowCount: row.deletedRowCount || 0,
      noChangeRowCount: row.noChangeRowCount || 0,
      status: row.status || 'Unknown',
      errorDetails: errorDetails[row.auditKey] || undefined,
      duration: row.endTime && row.startTime ?
        Math.round((row.endTime.getTime() - row.startTime.getTime()) / 1000) : undefined,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getAllPipelines(options: {
    page?: number;
    limit?: number;
    search?: string;
    sourceSystem?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      page = 1,
      limit = 10, // Default limit for all pipelines
      search,
      sourceSystem,
      status,
      dateRange,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = options;

    let query = db.select({
      auditKey: auditTable.auditKey,
      codeName: auditTable.codeName,
      runId: auditTable.runId,
      sourceSystem: auditTable.sourceSystem,
      schemaName: auditTable.schemaName,
      targetTableName: auditTable.targetTableName,
      sourceFileName: auditTable.sourceFileName,
      startTime: auditTable.startTime,
      endTime: auditTable.endTime,
      insertedRowCount: auditTable.insertedRowCount,
      updatedRowCount: auditTable.updatedRowCount,
      deletedRowCount: auditTable.deletedRowCount,
      noChangeRowCount: auditTable.noChangeRowCount,
      status: auditTable.status,
    }).from(auditTable);

    const conditions = [];

    if (search) {
      // Search across multiple fields for flexibility
      conditions.push(
        sql`(
          ${auditTable.codeName} ILIKE ${`%${search}%`} OR
          ${auditTable.runId} ILIKE ${`%${search}%`} OR
          ${auditTable.sourceSystem} ILIKE ${`%${search}%`} OR
          ${auditTable.targetTableName} ILIKE ${`%${search}%`} OR
          ${auditTable.sourceFileName} ILIKE ${`%${search}%`}
        )`
      );
    }

    if (sourceSystem && sourceSystem !== 'all') {
      conditions.push(eq(auditTable.sourceSystem, sourceSystem));
    }

    if (status && status !== 'all') {
      conditions.push(eq(auditTable.status, status));
    }

    if (dateRange) {
      conditions.push(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Add sorting
    let sortColumn;
    switch (sortBy) {
      case 'codeName':
        sortColumn = auditTable.codeName;
        break;
      case 'runId':
        sortColumn = auditTable.runId;
        break;
      case 'sourceSystem':
        sortColumn = auditTable.sourceSystem;
        break;
      case 'status':
        sortColumn = auditTable.status;
        break;
      case 'startTime':
      default:
        sortColumn = auditTable.startTime;
        break;
    }

    if (sortOrder === 'desc') {
      query = query.orderBy(desc(sortColumn));
    } else {
      query = query.orderBy(asc(sortColumn));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: count() }).from(auditTable);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await query.limit(limit).offset(offset);

    const data = results.map(row => ({
      auditKey: row.auditKey,
      codeName: row.codeName || 'Unknown Process',
      runId: row.runId || '',
      sourceSystem: row.sourceSystem || 'Unknown',
      schemaName: row.schemaName || '',
      targetTableName: row.targetTableName || '',
      sourceFileName: row.sourceFileName || '',
      startTime: row.startTime || new Date(),
      endTime: row.endTime || undefined,
      insertedRowCount: row.insertedRowCount || 0,
      updatedRowCount: row.updatedRowCount || 0,
      deletedRowCount: row.deletedRowCount || 0,
      noChangeRowCount: row.noChangeRowCount || 0,
      status: row.status || 'Unknown',
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getErrors(dateRange?: { start: Date; end: Date }) {
    let query = db.select().from(errorTable);

    if (dateRange) {
      query = query.where(and(
        gte(errorTable.executionTime, dateRange.start),
        lte(errorTable.executionTime, dateRange.end)
      ));
    }

    return await query.orderBy(desc(errorTable.executionTime));
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
  async createConnection(connection: InsertSourceConnection): Promise<SourceConnection> {
    const [created] = await db
      .insert(sourceConnectionTable)
      .values(connection)
      .returning();
    return created;
  }

  async getConnections(filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<SourceConnection[]> {
    let query = db.select().from(sourceConnectionTable);

    const conditions = [];

    if (filters?.category && filters.category !== 'all') {
      const categoryMap: { [key: string]: string[] } = {
        'database': ['Database', 'MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'MongoDB'],
        'file': ['File', 'CSV', 'JSON', 'XML', 'Excel'],
        'cloud': ['Azure', 'AWS', 'GCP', 'Cloud'],
        'api': ['API', 'REST', 'GraphQL', 'HTTP'],
        'other': ['FTP', 'SFTP', 'Salesforce', 'SSH', 'Other']
      };

      if (categoryMap[filters.category]) {
        conditions.push(
          inArray(sourceConnectionTable.connectionType, categoryMap[filters.category])
        );
      }
    }

    if (filters?.search) {
      conditions.push(
        like(sourceConnectionTable.connectionName, `%${filters.search}%`)
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(
        eq(sourceConnectionTable.status, filters.status)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(sourceConnectionTable.createdAt));
  }

  async getConnection(id: number): Promise<SourceConnection | undefined> {
    const [connection] = await db
      .select()
      .from(sourceConnectionTable)
      .where(eq(sourceConnectionTable.connectionId, id));
    return connection || undefined;
  }

  async updateConnection(id: number, updates: UpdateSourceConnection): Promise<SourceConnection | undefined> {
    const [updated] = await db
      .update(sourceConnectionTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sourceConnectionTable.connectionId, id))
      .returning();
    return updated || undefined;
  }

  async deleteConnection(id: number): Promise<boolean> {
    const result = await db
      .delete(sourceConnectionTable)
      .where(eq(sourceConnectionTable.connectionId, id));
    return (result.rowCount || 0) > 0;
  }

  async testConnection(connectionData: Partial<SourceConnection>): Promise<{
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
  async getDatabaseSchemas(connectionId: number): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    console.log('Debug - Connection details:', {
      connectionType: connection.connectionType,
      connectionName: connection.connectionName,
      host: connection.host,
      databaseName: connection.databaseName,
      username: connection.username
    });

    // If this is a PostgreSQL connection to our own database, fetch real schemas
    const isRealDatabase = connection.connectionType?.toLowerCase() === 'postgresql' && 
        (connection.connectionName?.toLowerCase().includes('replit') || 
         connection.host?.includes('neon') ||
         connection.databaseName?.includes('neondb') ||
         connection.username?.includes('neondb_owner'));

    console.log('Debug - Is real database:', isRealDatabase);

    if (isRealDatabase) {
      
      try {
        // Query actual schemas from the database
        const result = await db.execute(sql`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          ORDER BY schema_name
        `);
        
        return result.rows.map((row: any) => row.schema_name);
      } catch (error) {
        console.error('Error fetching real schemas:', error);
        // Fallback to default if query fails
        return ['public'];
      }
    }

    // Simulate fetching schemas for other connection types
    await this.simulateConnectionDelay();
    
    switch (connection.connectionType?.toLowerCase()) {
      case 'mysql':
        return ['information_schema', 'performance_schema', 'sys', 'mysql', 'sales_db', 'inventory_db'];
      case 'postgresql':
        return ['public', 'information_schema', 'pg_catalog', 'analytics', 'reporting'];
      case 'sql server':
        return ['dbo', 'sys', 'INFORMATION_SCHEMA', 'tempdb', 'model', 'msdb'];
      case 'oracle':
        return ['HR', 'OE', 'PM', 'IX', 'SH', 'BI'];
      default:
        return ['public', 'default'];
    }
  }

  // Get database tables from a connection and schema
  async getDatabaseTables(connectionId: number, schemaName: string): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const isRealDatabase = connection.connectionType?.toLowerCase() === 'postgresql' && 
        (connection.connectionName?.toLowerCase().includes('replit') || 
         connection.host?.includes('neon') ||
         connection.databaseName?.includes('neondb') ||
         connection.username?.includes('neondb_owner'));

    console.log('Debug - Table fetch for schema:', schemaName, 'Is real database:', isRealDatabase);

    // If this is a PostgreSQL connection to our own database, fetch real tables
    if (isRealDatabase) {
      
      try {
        // Query actual tables from the database
        const result = await db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = ${schemaName}
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        
        return result.rows.map((row: any) => row.table_name);
      } catch (error) {
        console.error('Error fetching real tables:', error);
        // Fallback to sample data if query fails
        return ['users', 'config_table', 'audit_table', 'error_table'];
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
  async getPipelines(filters?: { search?: string; executionLayer?: string; sourceSystem?: string; status?: string }): Promise<ConfigRecord[]> {
    let query = db.select().from(configTable);

    const conditions = [];

    if (filters?.search) {
      conditions.push(like(configTable.sourceTableName, `%${filters.search}%`));
    }

    if (filters?.executionLayer) {
      conditions.push(eq(configTable.executionLayer, filters.executionLayer));
    }

    if (filters?.sourceSystem) {
      conditions.push(eq(configTable.sourceSystem, filters.sourceSystem));
    }

    if (filters?.status) {
      conditions.push(eq(configTable.activeFlag, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(configTable.createdAt));
  }

  async getPipeline(id: number): Promise<ConfigRecord | undefined> {
    const [pipeline] = await db.select().from(configTable).where(eq(configTable.configKey, id));
    return pipeline || undefined;
  }

  async createPipeline(pipeline: InsertConfigRecord): Promise<ConfigRecord> {
    const [created] = await db.insert(configTable).values(pipeline).returning();
    return created;
  }

  async updatePipeline(id: number, updates: UpdateConfigRecord): Promise<ConfigRecord | undefined> {
    const [updated] = await db
      .update(configTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(configTable.configKey, id))
      .returning();
    return updated || undefined;
  }

  async deletePipeline(id: number): Promise<boolean> {
    const result = await db.delete(configTable).where(eq(configTable.configKey, id));
    return result.rowCount > 0;
  }

  async getMetadata(type: string): Promise<string[]> {
    // Static metadata for dropdowns - in production this could come from a metadata table
    const metadataMap: Record<string, string[]> = {
      'execution_layer': ['Bronze', 'Silver', 'Gold'],
      'load_type': ['Truncate', 'Incremental', 'SCD1', 'SCD2'],
      'source_system': ['MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'CSV', 'JSON', 'Parquet', 'Excel', 'API'],
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
      'is_foreign_key': ['Yes', 'No']
    };

    return metadataMap[type] || [];
  }

  // Data dictionary implementation
  async getDataDictionaryEntries(filters?: { search?: string; executionLayer?: string; configKey?: number }): Promise<DataDictionaryRecord[]> {
    let query = db.select().from(dataDictionaryTable);

    const conditions = [];

    if (filters?.search) {
      conditions.push(
        like(dataDictionaryTable.attributeName, `%${filters.search}%`)
      );
    }

    if (filters?.executionLayer && filters.executionLayer !== 'all') {
      conditions.push(
        eq(dataDictionaryTable.executionLayer, filters.executionLayer)
      );
    }

    if (filters?.configKey) {
      conditions.push(
        eq(dataDictionaryTable.configKey, filters.configKey)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(dataDictionaryTable.insertDate));
  }

  async getDataDictionaryEntry(id: number): Promise<DataDictionaryRecord | undefined> {
    const [entry] = await db
      .select()
      .from(dataDictionaryTable)
      .where(eq(dataDictionaryTable.dataDictionaryKey, id));
    return entry || undefined;
  }

  async createDataDictionaryEntry(entry: InsertDataDictionaryRecord): Promise<DataDictionaryRecord> {
    const [created] = await db
      .insert(dataDictionaryTable)
      .values({
        ...entry,
        createdBy: entry.createdBy || 'System',
        updatedBy: entry.updatedBy || 'System',
        insertDate: new Date(),
        updateDate: new Date(),
      })
      .returning();
    return created;
  }

  async updateDataDictionaryEntry(id: number, updates: UpdateDataDictionaryRecord): Promise<DataDictionaryRecord | undefined> {
    const [updated] = await db
      .update(dataDictionaryTable)
      .set({
        ...updates,
        updatedBy: updates.updatedBy || 'System',
        updateDate: new Date(),
      })
      .where(eq(dataDictionaryTable.dataDictionaryKey, id))
      .returning();
    return updated || undefined;
  }

  async deleteDataDictionaryEntry(id: number): Promise<boolean> {
    const result = await db
      .delete(dataDictionaryTable)
      .where(eq(dataDictionaryTable.dataDictionaryKey, id));
    return (result.rowCount || 0) > 0;
  }

  // Reconciliation config methods implementation
  async getReconciliationConfigs(filters?: { search?: string; executionLayer?: string; configKey?: number; reconType?: string; status?: string }): Promise<ReconciliationConfig[]> {
    let query = db.select().from(reconciliationConfigTable);

    const conditions = [];

    if (filters?.search) {
      conditions.push(
        like(reconciliationConfigTable.sourceTable, `%${filters.search}%`)
      );
    }

    if (filters?.executionLayer && filters.executionLayer !== 'all') {
      conditions.push(
        eq(reconciliationConfigTable.executionLayer, filters.executionLayer)
      );
    }

    if (filters?.configKey) {
      conditions.push(
        eq(reconciliationConfigTable.configKey, filters.configKey)
      );
    }

    if (filters?.reconType && filters.reconType !== 'all') {
      conditions.push(
        eq(reconciliationConfigTable.reconType, filters.reconType)
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(
        eq(reconciliationConfigTable.activeFlag, filters.status)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(reconciliationConfigTable.reconKey));
  }

  async getReconciliationConfig(id: number): Promise<ReconciliationConfig | undefined> {
    const [config] = await db
      .select()
      .from(reconciliationConfigTable)
      .where(eq(reconciliationConfigTable.reconKey, id));
    return config || undefined;
  }

  async createReconciliationConfig(config: InsertReconciliationConfig): Promise<ReconciliationConfig> {
    const [created] = await db
      .insert(reconciliationConfigTable)
      .values(config)
      .returning();
    return created;
  }

  async updateReconciliationConfig(id: number, updates: UpdateReconciliationConfig): Promise<ReconciliationConfig | undefined> {
    const [updated] = await db
      .update(reconciliationConfigTable)
      .set(updates)
      .where(eq(reconciliationConfigTable.reconKey, id))
      .returning();
    return updated || undefined;
  }

  async deleteReconciliationConfig(id: number): Promise<boolean> {
    const result = await db
      .delete(reconciliationConfigTable)
      .where(eq(reconciliationConfigTable.reconKey, id));
    return (result.rowCount || 0) > 0;
  }

  // Data Quality Config implementations
  async getDataQualityConfigs(filters?: { search?: string; executionLayer?: string; configKey?: number; validationType?: string; status?: string }): Promise<DataQualityConfig[]> {
    let query = db.select().from(dataQualityConfigTable);

    const conditions = [];

    if (filters?.search) {
      conditions.push(
        like(dataQualityConfigTable.tableName, `%${filters.search}%`)
      );
    }

    if (filters?.executionLayer && filters.executionLayer !== 'all') {
      conditions.push(
        eq(dataQualityConfigTable.executionLayer, filters.executionLayer)
      );
    }

    if (filters?.configKey) {
      conditions.push(
        eq(dataQualityConfigTable.configKey, filters.configKey)
      );
    }

    if (filters?.validationType && filters.validationType !== 'all') {
      conditions.push(
        eq(dataQualityConfigTable.validationType, filters.validationType)
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(
        eq(dataQualityConfigTable.activeFlag, filters.status)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(dataQualityConfigTable.dataQualityKey));
  }

  async getDataQualityConfig(id: number): Promise<DataQualityConfig | undefined> {
    const [config] = await db
      .select()
      .from(dataQualityConfigTable)
      .where(eq(dataQualityConfigTable.dataQualityKey, id));
    return config || undefined;
  }

  async createDataQualityConfig(config: InsertDataQualityConfig): Promise<DataQualityConfig> {
    const [created] = await db
      .insert(dataQualityConfigTable)
      .values(config)
      .returning();
    return created;
  }

  async updateDataQualityConfig(id: number, updates: UpdateDataQualityConfig): Promise<DataQualityConfig | undefined> {
    const [updated] = await db
      .update(dataQualityConfigTable)
      .set(updates)
      .where(eq(dataQualityConfigTable.dataQualityKey, id))
      .returning();
    return updated || undefined;
  }

  async deleteDataQualityConfig(id: number): Promise<boolean> {
    const result = await db
      .delete(dataQualityConfigTable)
      .where(eq(dataQualityConfigTable.dataQualityKey, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();