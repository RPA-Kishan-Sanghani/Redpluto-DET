import { users, auditTable, errorTable, sourceConnectionTable, configTable, dataDictionaryTable, reconciliationConfigTable, dataQualityConfigTable, type User, type InsertUser, type AuditRecord, type ErrorRecord, type SourceConnection, type InsertSourceConnection, type UpdateSourceConnection, type ConfigRecord, type InsertConfigRecord, type UpdateConfigRecord, type DataDictionaryRecord, type InsertDataDictionaryRecord, type UpdateDataDictionaryRecord, type ReconciliationConfig, type InsertReconciliationConfig, type UpdateReconciliationConfig, type DataQualityConfig, type InsertDataQualityConfig, type UpdateDataQualityConfig } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, gte, lte, count, desc, asc, like, inArray, sql, ilike, or } from "drizzle-orm";
import { Pool } from 'pg';

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Dashboard metrics
  getDashboardMetrics(dateRange?: { start: Date; end: Date }, filters?: {
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
  getPipelineSummary(dateRange?: { start: Date; end: Date }, filters?: {
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
  getDataDictionaryEntries(filters?: { search?: string; executionLayer?: string; schemaName?: string; tableName?: string; customField?: string; customValue?: string }): Promise<DataDictionaryRecord[]>;
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

  async getDashboardMetrics(dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }) {
    const conditions = [];

    if (dateRange) {
      conditions.push(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    // Apply filters
    if (filters?.search) {
      conditions.push(
        like(auditTable.codeName, `%${filters.search}%`)
      );
    }

    if (filters?.system) {
      conditions.push(eq(auditTable.sourceSystem, filters.system));
    }

    if (filters?.layer) {
      conditions.push(like(auditTable.schemaName, `%${filters.layer.toLowerCase()}%`));
    }

    if (filters?.status) {
      const statusValue = filters.status.toLowerCase() === 'failed' ? 'Fail' : 
                         filters.status.toLowerCase() === 'success' ? 'Success' : 
                         filters.status;
      conditions.push(eq(auditTable.status, statusValue));
    }

    if (filters?.targetTable) {
      conditions.push(like(auditTable.targetTableName, `%${filters.targetTable}%`));
    }

    // Get all records first to debug
    const allRecords = await db.select().from(auditTable).limit(5);
    console.log('Sample audit records:', allRecords);

    const results = await db.select({
      status: auditTable.status,
      count: sql`count(distinct ${auditTable.codeName})`
    }).from(auditTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(auditTable.status);

    console.log('Dashboard metrics query results:', results);

    const metrics = {
      totalPipelines: 0,
      successfulRuns: 0,
      failedRuns: 0,
      scheduledRuns: 0,
      runningRuns: 0,
    };

    results.forEach(result => {
      const status = result.status?.toLowerCase();
      const count = Number(result.count);

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

    console.log('Final metrics:', metrics);
    return metrics;
  }

  async getPipelineSummary(dateRange?: { start: Date; end: Date }, filters?: {
    search?: string;
    system?: string;
    layer?: string;
    status?: string;
    category?: string;
    targetTable?: string;
  }) {
    const conditions = [];

    if (dateRange) {
      conditions.push(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    // Apply filters
    if (filters?.search) {
      conditions.push(
        like(auditTable.codeName, `%${filters.search}%`)
      );
    }

    if (filters?.system) {
      conditions.push(eq(auditTable.sourceSystem, filters.system));
    }

    if (filters?.layer) {
      conditions.push(like(auditTable.schemaName, `%${filters.layer.toLowerCase()}%`));
    }

    if (filters?.status) {
      const statusValue = filters.status.toLowerCase() === 'failed' ? 'Fail' : 
                         filters.status.toLowerCase() === 'success' ? 'Success' : 
                         filters.status;
      conditions.push(eq(auditTable.status, statusValue));
    }

    if (filters?.targetTable) {
      conditions.push(like(auditTable.targetTableName, `%${filters.targetTable}%`));
    }

    // For pipeline summary, we want to count distinct pipelines by their schema layer
    // Group by schema and status to get counts per layer
    const results = await db.select({
      schemaName: auditTable.schemaName,
      status: auditTable.status,
      count: sql`count(distinct ${auditTable.codeName})`
    }).from(auditTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(auditTable.schemaName, auditTable.status);

    console.log('Pipeline summary query results:', results);

    const summary = {
      dataQuality: { total: 0, success: 0, failed: 0 },
      reconciliation: { total: 0, success: 0, failed: 0 },
      bronze: { total: 0, success: 0, failed: 0 },
      silver: { total: 0, success: 0, failed: 0 },
      gold: { total: 0, success: 0, failed: 0 },
    };

    results.forEach(result => {
      const schemaName = result.schemaName?.toLowerCase() || '';
      const status = result.status?.toLowerCase();
      const count = Number(result.count);

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

    console.log('Final pipeline summary:', summary);
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

    // Build the sorting column
    const sortColumn = sortBy === 'codeName' ? auditTable.codeName :
                      sortBy === 'status' ? auditTable.status :
                      sortBy === 'sourceSystem' ? auditTable.sourceSystem :
                      sortBy === 'startTime' ? auditTable.startTime :
                      auditTable.startTime;

    const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Get total count for pagination
    const countResults = await db.select({ count: count() }).from(auditTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = countResults[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await queryBuilder
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

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
        if (error.auditKey && !errorDetails[error.auditKey]) {
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

    const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Get total count for pagination
    const countResults = await db.select({ count: count() }).from(auditTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = countResults[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

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
    const conditions = [];

    if (dateRange) {
      conditions.push(and(
        gte(errorTable.executionTime, dateRange.start),
        lte(errorTable.executionTime, dateRange.end)
      ));
    }

    return await db.select().from(errorTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(errorTable.executionTime));
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
    try {
      console.log('Creating connection with data:', connection);
      const [created] = await db
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

  async getConnections(filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<SourceConnection[]> {
    try {
      let query = db.select({
        connectionId: sourceConnectionTable.connectionId,
        connectionName: sourceConnectionTable.connectionName,
        connectionType: sourceConnectionTable.connectionType,
        host: sourceConnectionTable.host,
        port: sourceConnectionTable.port,
        username: sourceConnectionTable.username,
        password: sourceConnectionTable.password,
        databaseName: sourceConnectionTable.databaseName,
        filePath: sourceConnectionTable.filePath,
        apiKey: sourceConnectionTable.apiKey,
        cloudProvider: sourceConnectionTable.cloudProvider,
        status: sourceConnectionTable.status,
        lastSync: sourceConnectionTable.lastSync,
        createdAt: sourceConnectionTable.createdAt,
        updatedAt: sourceConnectionTable.updatedAt,
      }).from(sourceConnectionTable);

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

      return await query
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sourceConnectionTable.createdAt));
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw new Error(`Failed to fetch connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    // Simulate fetching schemas for other connection types
    await this.simulateConnectionDelay();

    switch (connection.connectionType?.toLowerCase()) {
      case 'mysql':
        return ['information_schema', 'performance_schema', 'sys', 'mysql', 'sales_db', 'inventory_db'];
      case 'sql server':
        return ['dbo', 'sys', 'INFORMATION_SCHEMA', 'tempdb', 'model', 'msdb'];
      case 'oracle':
        return ['HR', 'OE', 'PM', 'IX', 'SH', 'BI'];
      default:
        return ['public', 'default'];
    }
  }

  // Get database columns from a connection, schema, and table
  async getDatabaseColumns(connectionId: number, schemaName: string, tableName: string): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(connectionId);
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
    } else {
      // Return mock columns for other connection types
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      return ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'];
    }
  }

  // Get enhanced database column metadata with data types and constraints
  async getDatabaseColumnMetadata(connectionId: number, schemaName: string, tableName: string): Promise<any[]> {
    // Get the connection details first
    const connection = await this.getConnection(connectionId);
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
    } else {
      // Return mock metadata for other connection types
      await this.simulateConnectionDelay();
      return [
        { attributeName: 'id', dataType: 'integer', isPrimaryKey: true, isForeignKey: false, columnDescription: '' },
        { attributeName: 'name', dataType: 'varchar', length: 255, isPrimaryKey: false, isForeignKey: false, columnDescription: '' },
        { attributeName: 'email', dataType: 'varchar', length: 255, isPrimaryKey: false, isForeignKey: false, columnDescription: '' },
        { attributeName: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isForeignKey: false, columnDescription: '' }
      ];
    }
  }

  // Get database tables from a connection and schema
  async getDatabaseTables(connectionId: number, schemaName: string): Promise<string[]> {
    // Get the connection details first
    const connection = await this.getConnection(connectionId);
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
    try {
      let query = db.select({
        configKey: configTable.configKey,
        executionLayer: configTable.executionLayer,
        sourceSystem: configTable.sourceSystem,
        sourceSchemaName: configTable.sourceSchemaName,
        sourceTableName: configTable.sourceTableName,
        sourceType: configTable.sourceType,
        sourceFilePath: configTable.sourceFilePath,
        sourceFileName: configTable.sourceFileName,
        sourceFileDelimiter: configTable.sourceFileDelimiter,
        targetLayer: configTable.targetLayer,
        targetSchemaName: configTable.targetSchemaName,
        targetTableName: configTable.targetTableName,
        targetType: configTable.targetType,
        targetConnectionId: configTable.targetConnectionId,
        targetFilePath: configTable.targetFilePath,
        targetFileDelimiter: configTable.targetFileDelimiter,
        targetSystem: configTable.targetSystem,
        temporaryTargetTable: configTable.temporaryTargetTable,
        loadType: configTable.loadType,
        primaryKey: configTable.primaryKey,
        activeFlag: configTable.activeFlag,
        enableDynamicSchema: configTable.enableDynamicSchema,
        fullDataRefreshFlag: configTable.fullDataRefreshFlag,
        executionSequence: configTable.executionSequence,
        effectiveDate: configTable.effectiveDate,
        md5Columns: configTable.md5Columns,
        customCode: configTable.customCode,
        createdAt: configTable.createdAt,
        updatedAt: configTable.updatedAt,
      }).from(configTable);

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

      return await query
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(configTable.createdAt));
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      throw new Error(`Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPipeline(id: number): Promise<ConfigRecord | undefined> {
    const [pipeline] = await db.select().from(configTable).where(eq(configTable.configKey, id));
    return pipeline || undefined;
  }

  async createPipeline(pipeline: InsertConfigRecord): Promise<ConfigRecord> {
    try {
      console.log('Creating pipeline with data:', JSON.stringify(pipeline, null, 2));
      const [created] = await db.insert(configTable).values(pipeline).returning();
      return created;
    } catch (error) {
      console.error('Error creating pipeline:', error);
      throw new Error(`Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    return (result.rowCount || 0) > 0;
  }

  async getMetadata(type: string): Promise<string[]> {
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
  async getDataDictionaryEntries(filters?: { search?: string; executionLayer?: string; schemaName?: string; tableName?: string; customField?: string; customValue?: string }): Promise<DataDictionaryRecord[]> {
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

    if (filters?.schemaName && filters.schemaName !== 'all') {
      conditions.push(
        eq(dataDictionaryTable.schemaName, filters.schemaName)
      );
    }

    if (filters?.tableName && filters.tableName !== 'all') {
      conditions.push(
        eq(dataDictionaryTable.tableName, filters.tableName)
      );
    }




    // Handle custom field filtering
    if (filters?.customField && filters?.customValue && filters.customField !== 'all') {
      switch (filters.customField) {
        case 'attributeName':
          conditions.push(like(dataDictionaryTable.attributeName, `%${filters.customValue}%`));
          break;
        case 'dataType':
          conditions.push(like(dataDictionaryTable.dataType, `%${filters.customValue}%`));
          break;
        case 'schemaName':
          conditions.push(like(dataDictionaryTable.schemaName, `%${filters.customValue}%`));
          break;
        case 'tableName':
          conditions.push(like(dataDictionaryTable.tableName, `%${filters.customValue}%`));
          break;
        case 'columnDescription':
          conditions.push(like(dataDictionaryTable.columnDescription, `%${filters.customValue}%`));
          break;
        case 'createdBy':
          conditions.push(like(dataDictionaryTable.createdBy, `%${filters.customValue}%`));
          break;
        case 'updatedBy':
          conditions.push(like(dataDictionaryTable.updatedBy, `%${filters.customValue}%`));
          break;
        case 'configKey':
          const configKeyValue = parseInt(filters.customValue);
          if (!isNaN(configKeyValue)) {
            conditions.push(eq(dataDictionaryTable.configKey, configKeyValue));
          }
          break;
      }
    }

    return await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dataDictionaryTable.insertDate));
  }

  async getDataDictionaryEntry(id: number): Promise<DataDictionaryRecord | undefined> {
    // FORCE connection to external PostgreSQL database
    try {
      const externalPool = new Pool({
        host: '4.240.90.166',
        port: 5432,
        database: 'config_db',
        user: 'rpdet_az',
        password: 'Rpdet#1234',
        ssl: false,
        connectionTimeoutMillis: 10000,
      });

      const query = `
        SELECT * FROM data_dictionary_table 
        WHERE data_dictionary_key = $1
      `;

      const result = await externalPool.query(query, [id]);
      await externalPool.end();

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0] as DataDictionaryRecord;
    } catch (error) {
      console.error('External database get entry error:', error);
      throw error;
    }
  }

  async createDataDictionaryEntry(entry: InsertDataDictionaryRecord): Promise<DataDictionaryRecord> {
    // FORCE connection to external PostgreSQL database with proper auto-increment
    try {
      const externalPool = new Pool({
        host: '4.240.90.166',
        port: 5432,
        database: 'config_db',
        user: 'rpdet_az',
        password: 'Rpdet#1234',
        ssl: false,
        connectionTimeoutMillis: 10000,
      });

      const query = `
        INSERT INTO data_dictionary_table (
          config_key, execution_layer, schema_name, table_name, attribute_name,
          data_type, length, precision_value, scale, insert_date, update_date,
          column_description, created_by, updated_by, is_not_null, is_primary_key,
          is_foreign_key, active_flag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;

      const values = [
        entry.configKey,
        entry.executionLayer,
        entry.schemaName || null,
        entry.tableName || null,
        entry.attributeName,
        entry.dataType,
        entry.length || null,
        entry.precisionValue || null,
        entry.scale || null,
        entry.columnDescription || null,
        entry.createdBy || 'API_USER',
        entry.updatedBy || 'API_USER',
        entry.isNotNull || 'N',
        entry.isPrimaryKey || 'N',
        entry.isForeignKey || 'N',
        entry.activeFlag || 'Y'
      ];

      const result = await externalPool.query(query, values);
      await externalPool.end();

      console.log('Successfully inserted into external database with ID:', result.rows[0]?.data_dictionary_key);
      return result.rows[0] as DataDictionaryRecord;
    } catch (error) {
      console.error('External database insert error:', error);
      throw error;
    }
  }

  async updateDataDictionaryEntry(id: number, updates: UpdateDataDictionaryRecord): Promise<DataDictionaryRecord | undefined> {
    // FORCE connection to external PostgreSQL database  
    try {
      const externalPool = new Pool({
        host: '4.240.90.166',
        port: 5432,
        database: 'config_db',
        user: 'rpdet_az',
        password: 'Rpdet#1234',
        ssl: false,
        connectionTimeoutMillis: 10000,
      });

      // Build dynamic update query with only provided fields
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.configKey !== undefined) {
        updateFields.push(`config_key = $${paramCount++}`);
        values.push(updates.configKey);
      }
      if (updates.executionLayer !== undefined) {
        updateFields.push(`execution_layer = $${paramCount++}`);
        values.push(updates.executionLayer);
      }
      if (updates.schemaName !== undefined) {
        updateFields.push(`schema_name = $${paramCount++}`);
        values.push(updates.schemaName);
      }
      if (updates.tableName !== undefined) {
        updateFields.push(`table_name = $${paramCount++}`);
        values.push(updates.tableName);
      }
      if (updates.attributeName !== undefined) {
        updateFields.push(`attribute_name = $${paramCount++}`);
        values.push(updates.attributeName);
      }
      if (updates.dataType !== undefined) {
        updateFields.push(`data_type = $${paramCount++}`);
        values.push(updates.dataType);
      }
      if (updates.length !== undefined) {
        updateFields.push(`length = $${paramCount++}`);
        values.push(updates.length);
      }
      if (updates.precisionValue !== undefined) {
        updateFields.push(`precision_value = $${paramCount++}`);
        values.push(updates.precisionValue);
      }
      if (updates.scale !== undefined) {
        updateFields.push(`scale = $${paramCount++}`);
        values.push(updates.scale);
      }
      if (updates.columnDescription !== undefined) {
        updateFields.push(`column_description = $${paramCount++}`);
        values.push(updates.columnDescription);
      }
      if (updates.isNotNull !== undefined) {
        updateFields.push(`is_not_null = $${paramCount++}`);
        values.push(updates.isNotNull);
      }
      if (updates.isPrimaryKey !== undefined) {
        updateFields.push(`is_primary_key = $${paramCount++}`);
        values.push(updates.isPrimaryKey);
      }
      if (updates.isForeignKey !== undefined) {
        updateFields.push(`is_foreign_key = $${paramCount++}`);
        values.push(updates.isForeignKey);
      }
      if (updates.activeFlag !== undefined) {
        updateFields.push(`active_flag = $${paramCount++}`);
        values.push(updates.activeFlag);
      }

      // Always update the update_date and updated_by
      updateFields.push(`update_date = NOW()`);
      updateFields.push(`updated_by = $${paramCount++}`);
      values.push(updates.updatedBy || 'System');

      // Add the ID for WHERE clause
      values.push(id);

      const query = `
        UPDATE data_dictionary_table 
        SET ${updateFields.join(', ')}
        WHERE data_dictionary_key = $${paramCount}
        RETURNING *;
      `;

      const result = await externalPool.query(query, values);
      await externalPool.end();

      console.log('Successfully updated entry in external database with ID:', id);
      return result.rows[0] as DataDictionaryRecord;
    } catch (error) {
      console.error('External database update entry error:', error);
      throw error;
    }
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
        or(
          ilike(reconciliationConfigTable.sourceTable, `%${filters.search.toLowerCase()}%`),
          ilike(reconciliationConfigTable.targetTable, `%${filters.search.toLowerCase()}%`)
        )
      );
    }

    if (filters?.executionLayer && filters.executionLayer !== 'all') {
      conditions.push(
        ilike(reconciliationConfigTable.executionLayer, filters.executionLayer.toLowerCase())
      );
    }

    if (filters?.configKey) {
      conditions.push(
        eq(reconciliationConfigTable.configKey, filters.configKey)
      );
    }

    if (filters?.reconType && filters.reconType !== 'all') {
      conditions.push(
        ilike(reconciliationConfigTable.reconType, filters.reconType.toLowerCase())
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(
        eq(reconciliationConfigTable.activeFlag, filters.status)
      );
    }

    return await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reconciliationConfigTable.reconKey));
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
    // Select only the core columns that exist in the database
    let query = db.select({
      dataQualityKey: dataQualityConfigTable.dataQualityKey,
      configKey: dataQualityConfigTable.configKey,
      executionLayer: dataQualityConfigTable.executionLayer,
      tableName: dataQualityConfigTable.tableName,
      attributeName: dataQualityConfigTable.attributeName,
      validationType: dataQualityConfigTable.validationType,
      referenceTableName: dataQualityConfigTable.referenceTableName,
      defaultValue: dataQualityConfigTable.defaultValue,
      errorTableTransferFlag: dataQualityConfigTable.errorTableTransferFlag,
      thresholdPercentage: dataQualityConfigTable.thresholdPercentage,
      activeFlag: dataQualityConfigTable.activeFlag,
      customQuery: dataQualityConfigTable.customQuery,
    }).from(dataQualityConfigTable);

    const conditions = [];

    if (filters?.search) {
      conditions.push(
        or(
          ilike(dataQualityConfigTable.tableName, `%${filters.search.toLowerCase()}%`),
          ilike(dataQualityConfigTable.attributeName, `%${filters.search.toLowerCase()}%`)
        )
      );
    }

    if (filters?.executionLayer && filters.executionLayer !== 'all') {
      conditions.push(
        ilike(dataQualityConfigTable.executionLayer, filters.executionLayer.toLowerCase())
      );
    }

    if (filters?.configKey) {
      conditions.push(
        eq(dataQualityConfigTable.configKey, filters.configKey)
      );
    }

    if (filters?.validationType && filters.validationType !== 'all') {
      conditions.push(
        ilike(dataQualityConfigTable.validationType, filters.validationType)
      );
    }

    if (filters?.status && filters.status !== 'all') {
      conditions.push(
        eq(dataQualityConfigTable.activeFlag, filters.status)
      );
    }

    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dataQualityConfigTable.dataQualityKey));

    // Add null values for the source/target fields that don't exist in the database yet
    return results.map(result => ({
      ...result,
      sourceSystem: null,
      sourceConnectionId: null,
      sourceType: null,
      sourceSchema: null,
      sourceTableName: null,
      targetSystem: null,
      targetConnectionId: null,
      targetType: null,
      targetSchema: null,
      targetTableName: null,
    }));
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