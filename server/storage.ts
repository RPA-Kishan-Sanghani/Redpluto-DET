import { users, auditTable, errorTable, type User, type InsertUser, type AuditRecord, type ErrorRecord } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, like, gte, lte, sql } from "drizzle-orm";

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
  
  // DAG summary by category
  getDAGSummary(dateRange?: { start: Date; end: Date }): Promise<{
    dataQuality: { total: number; success: number; failed: number };
    reconciliation: { total: number; success: number; failed: number };
    bronze: { total: number; success: number; failed: number };
    silver: { total: number; success: number; failed: number };
    gold: { total: number; success: number; failed: number };
  }>;
  
  // DAG runs with filtering and pagination
  getDAGRuns(options: {
    page?: number;
    limit?: number;
    search?: string;
    layer?: string;
    status?: string;
    owner?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Array<{
      auditKey: number;
      dagName: string;
      runId: string;
      layer: string;
      status: string;
      lastRun: Date;
      owner: string;
      duration?: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }>;
  
  // Error logs
  getErrors(dateRange?: { start: Date; end: Date }): Promise<ErrorRecord[]>;
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
    let query = db.select({
      status: auditTable.status,
      count: count()
    }).from(auditTable);

    if (dateRange) {
      query = query.where(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    const results = await query.groupBy(auditTable.status);
    
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

  async getDAGSummary(dateRange?: { start: Date; end: Date }) {
    let query = db.select({
      codeName: auditTable.codeName,
      status: auditTable.status,
      count: count()
    }).from(auditTable);

    if (dateRange) {
      query = query.where(and(
        gte(auditTable.startTime, dateRange.start),
        lte(auditTable.startTime, dateRange.end)
      ));
    }

    const results = await query.groupBy(auditTable.codeName, auditTable.status);
    
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

  async getDAGRuns(options: {
    page?: number;
    limit?: number;
    search?: string;
    layer?: string;
    status?: string;
    owner?: string;
    dateRange?: { start: Date; end: Date };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      page = 1,
      limit = 5,
      search,
      layer,
      status,
      owner,
      dateRange,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = options;
    
    let query = db.select({
      auditKey: auditTable.auditKey,
      dagName: auditTable.codeName,
      runId: auditTable.runId,
      status: auditTable.status,
      startTime: auditTable.startTime,
      endTime: auditTable.endTime,
      sourceSystem: auditTable.sourceSystem,
    }).from(auditTable);

    const conditions = [];

    if (search) {
      conditions.push(like(auditTable.codeName, `%${search}%`));
    }

    if (status && status !== 'all') {
      conditions.push(eq(auditTable.status, status.toUpperCase()));
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
    const sortColumn = sortBy === 'dagName' ? auditTable.codeName :
                      sortBy === 'status' ? auditTable.status :
                      sortBy === 'lastRun' ? auditTable.startTime :
                      auditTable.startTime;

    if (sortOrder === 'desc') {
      query = query.orderBy(desc(sortColumn));
    } else {
      query = query.orderBy(sortColumn);
    }

    // Get total count
    const countQuery = db.select({ count: count() }).from(auditTable);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await query.limit(limit).offset(offset);

    const data = results.map(row => ({
      auditKey: row.auditKey,
      dagName: row.dagName || 'Unknown DAG',
      runId: row.runId || '',
      layer: this.getLayerFromCodeName(row.dagName || ''),
      status: row.status || 'Unknown',
      lastRun: row.startTime || new Date(),
      owner: this.getOwnerFromSystem(row.sourceSystem || ''),
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
}

export const storage = new DatabaseStorage();
