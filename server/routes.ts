import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { insertUserSchema, insertSourceConnectionSchema, updateSourceConnectionSchema, insertConfigSchema, updateConfigSchema, insertDataDictionarySchema, updateDataDictionarySchema, insertReconciliationConfigSchema, updateReconciliationConfigSchema, insertDataQualityConfigSchema, updateDataQualityConfigSchema } from "@shared/schema";
import { sql } from "drizzle-orm";
import { generateToken, authMiddleware, type AuthRequest } from "./auth";
import bcrypt from 'bcryptjs';
import { trackActivity, trackFilterActivity, trackResourceActivity, ActivityType, ActivityCategory } from "./activity-tracker";

export async function registerRoutes(app: Express): Promise<Server> {
  // User registration endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json({ message: "User created successfully", userId: user.id });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({ error: 'Failed to create user' });
    }
  });


  // User login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Determine if input is email or username
      const isEmail = username.includes('@');
      let user;

      if (isEmail) {
        user = await storage.getUserByEmail(username);
      } else {
        user = await storage.getUserByUsername(username);
      }

      // Verify password using bcrypt
      if (user && user.password && await bcrypt.compare(password, user.password)) {
        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email || '',
          username: user.username || '',
        });

        // Log user activity
        await storage.logUserActivity({
          userId: user.id,
          activityType: 'sign_in',
          activityCategory: 'auth',
          pagePath: '/login',
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ 
          user: userWithoutPassword,
          token,
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // User logout endpoint
  app.post("/api/auth/logout", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      // Log user activity
      await storage.logUserActivity({
        userId,
        activityType: 'sign_out',
        activityCategory: 'auth',
        pagePath: req.originalUrl,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, search, system, layer, status, category, targetTable } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const filters = {
        search: search as string,
        system: system as string,
        layer: layer as string,
        status: status as string,
        category: category as string,
        targetTable: targetTable as string,
      };

      // Track dashboard view with filters if applied
      const hasFilters = search || system || layer || status || category || targetTable;
      if (hasFilters) {
        await trackFilterActivity(req, filters);
      }
      await trackActivity(req, {
        activityType: ActivityType.DASHBOARD_VIEWED,
        activityCategory: ActivityCategory.NAVIGATION,
        resourceType: 'dashboard',
        resourceId: 'metrics',
      });

      const metrics = await storage.getDashboardMetrics(userId, dateRange, filters);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Pipeline summary endpoint
  app.get("/api/dashboard/pipeline-summary", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, search, system, layer, status, category, targetTable } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const filters = {
        search: search as string,
        system: system as string,
        layer: layer as string,
        status: status as string,
        category: category as string,
        targetTable: targetTable as string,
      };

      // Track dashboard pipeline summary view with filters if applied
      try {
        const hasFilters = search || system || layer || status || category || targetTable;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.DASHBOARD_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'dashboard',
          resourceId: 'pipeline-summary',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      const summary = await storage.getPipelineSummary(userId, dateRange, filters);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching pipeline summary:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline summary' });
    }
  });

  // Pipeline runs endpoint with filtering and pagination
  app.get("/api/dashboard/pipelines", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const {
        page = "1",
        limit = "5",
        search,
        sourceSystem,
        status,
        startDate,
        endDate,
        sortBy = "startTime",
        sortOrder = "desc",
      } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sourceSystem: sourceSystem as string,
        status: status as string,
        dateRange,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await storage.getPipelineRuns(userId, options);
      res.json(result);
    } catch (error) {
      console.error('Error fetching pipeline runs:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline runs' });
    }
  });

  // All pipelines endpoint with filtering and pagination
  app.get("/api/dashboard/all-pipelines", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const {
        page = "1",
        limit = "20",
        search,
        sourceSystem,
        status,
        startDate,
        endDate,
        sortBy = "startTime",
        sortOrder = "desc",
      } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        sourceSystem: sourceSystem as string,
        status: status as string,
        dateRange,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await storage.getAllPipelines(userId, options);
      res.json(result);
    } catch (error) {
      console.error('Error fetching all pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch all pipelines' });
    }
  });

  // Errors endpoint
  app.get("/api/dashboard/errors", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const errors = await storage.getErrors(userId, dateRange);
      res.json(errors);
    } catch (error) {
      console.error('Error fetching errors:', error);
      res.status(500).json({ error: 'Failed to fetch errors' });
    }
  });

  // Source connections endpoints
  // Get all connections with optional filtering
  app.get("/api/connections", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { category, search, status } = req.query;

      const filters = {
        category: category as string,
        search: search as string,
        status: status as string,
      };

      const connections = await storage.getConnections(userId, filters);
      
      // Track view activity with filters if applied
      try {
        const hasFilters = category || search || status;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.CONNECTION_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'connection',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  // Get single connection
  app.get("/api/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const connection = await storage.getConnection(userId, id);

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      res.json(connection);
    } catch (error) {
      console.error('Error fetching connection:', error);
      res.status(500).json({ error: 'Failed to fetch connection' });
    }
  });

  // Create new connection
  app.post("/api/connections", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const validatedData = insertSourceConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(userId, validatedData);
      
      // Track connection creation
      try {
        await trackResourceActivity(req, 'created', 'connection', connection.connectionId?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.status(201).json(connection);
    } catch (error: any) {
      console.error('Error creating connection:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid connection data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create connection' });
    }
  });

  // Update connection
  app.put("/api/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const validatedData = updateSourceConnectionSchema.parse(req.body);
      const connection = await storage.updateConnection(userId, id, validatedData);

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Track connection update
      try {
        await trackResourceActivity(req, 'updated', 'connection', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(connection);
    } catch (error: any) {
      console.error('Error updating connection:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid connection data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update connection' });
    }
  });

  // Delete connection
  app.delete("/api/connections/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const success = await storage.deleteConnection(userId, id);

      if (!success) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Track connection deletion
      try {
        await trackResourceActivity(req, 'deleted', 'connection', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json({ success: true, message: 'Connection deleted successfully' });
    } catch (error) {
      console.error('Error deleting connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  });

  // Test connection
  app.post("/api/connections/test", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const result = await storage.testConnection(userId, req.body);

      // If test is successful and connectionId exists, update status to Active
      if (result.success && req.body.connectionId) {
        try {
          await storage.updateConnection(userId, req.body.connectionId, { 
            status: 'Active', 
            lastSync: new Date() 
          });
        } catch (updateError) {
          console.error('Error updating connection status:', updateError);
          // Don't fail the entire request if status update fails
        }
      }

      // Track connection test
      try {
        await trackResourceActivity(req, 'tested', 'connection', req.body.connectionId?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to test connection',
        details: error 
      });
    }
  });

  // Get database schemas from a connection
  app.get("/api/connections/:id/schemas", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const connectionId = parseInt(req.params.id);
      const schemas = await storage.getDatabaseSchemas(userId, connectionId);
      res.json(schemas);
    } catch (error) {
      console.error('Error fetching database schemas:', error);
      res.status(500).json({ error: 'Failed to fetch database schemas' });
    }
  });

  // Get database tables from a connection and schema
  app.get("/api/connections/:id/schemas/:schema/tables", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tables = await storage.getDatabaseTables(userId, connectionId, schemaName);
      res.json(tables);
    } catch (error) {
      console.error('Error fetching database tables:', error);
      res.status(500).json({ error: 'Failed to fetch database tables' });
    }
  });

  // Get database columns from a connection, schema, and table
  app.get("/api/connections/:id/schemas/:schema/tables/:table/columns", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const columns = await storage.getDatabaseColumns(userId, connectionId, schemaName, tableName);
      res.json(columns);
    } catch (error) {
      console.error('Error fetching database columns:', error);
      res.status(500).json({ error: 'Failed to fetch database columns' });
    }
  });

  // Get enhanced database column metadata with data types and constraints
  app.get("/api/connections/:id/schemas/:schema/tables/:table/metadata", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const metadata = await storage.getDatabaseColumnMetadata(userId, connectionId, schemaName, tableName);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching column metadata:', error);
      res.status(500).json({ error: 'Failed to fetch column metadata' });
    }
  });

  // Get database columns with data types for filtering
  app.get("/api/connections/:id/schemas/:schema/tables/:table/columns-with-types", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const { dataTypes } = req.query;

      const metadata = await storage.getDatabaseColumnMetadata(userId, connectionId, schemaName, tableName);

      // If dataTypes filter is provided, filter columns by data type
      if (dataTypes) {
        const allowedTypes = (dataTypes as string).split(',').map(type => type.toLowerCase());
        const filteredColumns = metadata.filter((col: any) => {
          const colType = col.dataType?.toLowerCase() || '';
          return allowedTypes.some(allowedType => {
            // More comprehensive matching for date/time types
            if (allowedType === 'date') {
              return colType.includes('date') || colType === 'date';
            }
            if (allowedType === 'datetime') {
              return colType.includes('datetime') || colType.includes('timestamp') || 
                     colType === 'datetime' || colType === 'datetime2' || 
                     colType === 'smalldatetime';
            }
            if (allowedType === 'timestamp') {
              return colType.includes('timestamp') || colType.includes('datetime') ||
                     colType === 'timestamp' || colType === 'timestamptz' ||
                     colType.startsWith('timestamp');
            }
            // Fallback to original logic
            return colType.includes(allowedType) || colType.startsWith(allowedType);
          });
        });
        res.json(filteredColumns.map((col: any) => ({ 
          columnName: col.columnName, 
          dataType: col.dataType 
        })));
      } else {
        res.json(metadata.map((col: any) => ({ 
          columnName: col.columnName, 
          dataType: col.dataType 
        })));
      }
    } catch (error) {
      console.error('Error fetching columns with types:', error);
      res.status(500).json({ error: 'Failed to fetch columns with types' });
    }
  });

  // Pipeline configuration endpoints
  // Get all pipelines with optional filtering
  app.get("/api/pipelines", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { search, executionLayer, sourceSystem, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        sourceSystem: sourceSystem as string,
        status: status as string,
      };

      const pipelines = await storage.getPipelines(userId, filters);
      
      // Track pipeline view with filters if applied
      try {
        const hasFilters = search || executionLayer || sourceSystem || status;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.PIPELINE_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'pipeline',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(pipelines);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  });

  // Get single pipeline
  app.get("/api/pipelines/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const pipeline = await storage.getPipeline(userId, id);

      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      res.json(pipeline);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline' });
    }
  });

  // Create new pipeline
  app.post("/api/pipelines", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const validatedData = insertConfigSchema.parse(req.body);
      // Ensure execution layer, source system, target system, source type, and target type are lowercase
      if (validatedData.executionLayer) {
        validatedData.executionLayer = validatedData.executionLayer.toLowerCase();
      }
      if (validatedData.sourceSystem) {
        validatedData.sourceSystem = validatedData.sourceSystem.toLowerCase();
      }
      if (validatedData.targetSystem) {
        validatedData.targetSystem = validatedData.targetSystem.toLowerCase();
      }
      if (validatedData.sourceType) {
        validatedData.sourceType = validatedData.sourceType.toLowerCase();
      }
      if (validatedData.targetType) {
        validatedData.targetType = validatedData.targetType.toLowerCase();
      }
      // Convert load type to _load suffix for truncate and incremental
      if (validatedData.loadType && (validatedData.loadType.toLowerCase() === 'truncate' || validatedData.loadType.toLowerCase() === 'incremental')) {
        validatedData.loadType = `${validatedData.loadType.toLowerCase()}_load`;
      }
      const pipeline = await storage.createPipeline(userId, validatedData);
      
      // Track pipeline creation
      try {
        await trackResourceActivity(req, 'created', 'pipeline', pipeline.configKey?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.status(201).json(pipeline);
    } catch (error: any) {
      console.error('Error creating pipeline:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid pipeline data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  });

  // Update pipeline
  app.put("/api/pipelines/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const validatedData = updateConfigSchema.parse(req.body);
      // Ensure execution layer, source system, target system, source type, and target type are lowercase
      if (validatedData.executionLayer) {
        validatedData.executionLayer = validatedData.executionLayer.toLowerCase();
      }
      if (validatedData.sourceSystem) {
        validatedData.sourceSystem = validatedData.sourceSystem.toLowerCase();
      }
      if (validatedData.targetSystem) {
        validatedData.targetSystem = validatedData.targetSystem.toLowerCase();
      }
      if (validatedData.sourceType) {
        validatedData.sourceType = validatedData.sourceType.toLowerCase();
      }
      if (validatedData.targetType) {
        validatedData.targetType = validatedData.targetType.toLowerCase();
      }
      // Convert load type to _load suffix for truncate and incremental
      if (validatedData.loadType && (validatedData.loadType.toLowerCase() === 'truncate' || validatedData.loadType.toLowerCase() === 'incremental')) {
        validatedData.loadType = `${validatedData.loadType.toLowerCase()}_load`;
      }
      const pipeline = await storage.updatePipeline(userId, id, validatedData);

      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      // Track pipeline update
      try {
        await trackResourceActivity(req, 'updated', 'pipeline', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(pipeline);
    } catch (error: any) {
      console.error('Error updating pipeline:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid pipeline data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update pipeline' });
    }
  });

  // Delete pipeline
  app.delete("/api/pipelines/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const success = await storage.deletePipeline(userId, id);

      if (!success) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      // Track pipeline deletion
      try {
        await trackResourceActivity(req, 'deleted', 'pipeline', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json({ success: true, message: 'Pipeline deleted successfully' });
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      res.status(500).json({ error: 'Failed to delete pipeline' });
    }
  });

  // Data Dictionary routes
  app.get("/api/data-dictionary", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { search, executionLayer, schemaName, tableName, sourceSystem } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        schemaName: schemaName as string,
        tableName: tableName as string,
        sourceSystem: sourceSystem as string
      };

      const entries = await storage.getDataDictionaryEntries(userId, filters);
      
      // Track data dictionary view with filters if applied
      try {
        const hasFilters = search || executionLayer || schemaName || tableName || sourceSystem;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.DATA_DICTIONARY_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'data-dictionary',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(entries);
    } catch (error) {
      console.error('Error fetching data dictionary entries:', error);
      res.status(500).json({ error: 'Failed to fetch data dictionary entries' });
    }
  });

  app.get("/api/data-dictionary/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const entry = await storage.getDataDictionaryEntry(userId, id);

      if (!entry) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      res.json(entry);
    } catch (error) {
      console.error('Error fetching data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to fetch data dictionary entry' });
    }
  });

  app.post("/api/data-dictionary", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      console.log('Incoming data dictionary request body:', JSON.stringify(req.body, null, 2));
      const validatedData = insertDataDictionarySchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));

      // Use the main database connection that's forced to external PostgreSQL
      const entry = await storage.createDataDictionaryEntry(userId, validatedData);

      console.log('Successfully saved to external database with ID:', entry.dataDictionaryKey);
      
      // Track data dictionary creation
      try {
        await trackResourceActivity(req, 'created', 'data-dictionary', entry.dataDictionaryKey?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.status(201).json(entry);
    } catch (error) {
      console.error('Error creating data dictionary entry:', error);

      // Send detailed error message to user interface
      let userErrorMessage = 'Failed to create data dictionary entry';
      if (error instanceof Error) {
        // Extract meaningful error details for the user
        if (error.message.includes('duplicate key')) {
          userErrorMessage = 'This entry already exists. Please check for duplicates.';
        } else if (error.message.includes('not-null constraint')) {
          userErrorMessage = 'Required fields are missing. Please fill in all required information.';
        } else if (error.message.includes('foreign key constraint')) {
          userErrorMessage = 'Invalid reference data. Please check your selections.';
        } else {
          userErrorMessage = `Database error: ${error.message}`;
        }
      }

      res.status(500).json({ 
        error: userErrorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/data-dictionary/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const validatedData = updateDataDictionarySchema.parse(req.body);
      const entry = await storage.updateDataDictionaryEntry(userId, id, validatedData);

      if (!entry) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      // Track data dictionary update
      try {
        await trackResourceActivity(req, 'updated', 'data-dictionary', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(entry);
    } catch (error) {
      console.error('Error updating data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to update data dictionary entry' });
    }
  });

  app.delete("/api/data-dictionary/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const success = await storage.deleteDataDictionaryEntry(userId, id);

      if (!success) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      // Track data dictionary deletion
      try {
        await trackResourceActivity(req, 'deleted', 'data-dictionary', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json({ success: true, message: 'Data dictionary entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to delete data dictionary entry' });
    }
  });

  // Reconciliation config routes
  app.get("/api/reconciliation-configs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { search, executionLayer, configKey, reconType, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        configKey: configKey ? parseInt(configKey as string) : undefined,
        reconType: reconType as string,
        status: status as string,
      };

      const configs = await storage.getReconciliationConfigs(userId, filters);
      
      // Track reconciliation view with filters if applied
      try {
        const hasFilters = search || executionLayer || configKey || reconType || status;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.RECONCILIATION_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'reconciliation',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(configs);
    } catch (error) {
      console.error('Error fetching reconciliation configs:', error);
      res.status(500).json({ error: 'Failed to fetch reconciliation configs' });
    }
  });

  

  app.get("/api/reconciliation-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const config = await storage.getReconciliationConfig(userId, id);

      if (!config) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching reconciliation config:', error);
      res.status(500).json({ error: 'Failed to fetch reconciliation config' });
    }
  });

  // Database fix endpoint - cleans up invalid recon_key = 0 records and resets sequence
  app.post("/api/reconciliation-configs/fix-database", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      console.log('Starting database fix for reconciliation_config table...');
      
      // Step 1: Delete all records with recon_key = 0 (invalid records)
      const deleteResult = await pool.query(
        'DELETE FROM reconciliation_config WHERE recon_key = 0 OR recon_key IS NULL RETURNING *'
      );
      console.log(`Deleted ${deleteResult.rowCount} invalid records with recon_key = 0`);
      
      // Step 2: Get the current max recon_key
      const maxResult = await pool.query(
        'SELECT COALESCE(MAX(recon_key), 0) as max_key FROM reconciliation_config'
      );
      const maxKey = maxResult.rows[0]?.max_key || 0;
      console.log(`Current max recon_key: ${maxKey}`);
      
      // Step 3: Reset the sequence to start from max + 1
      const nextValue = maxKey + 1;
      await pool.query(
        `SELECT setval('reconciliation_config_recon_key_seq', $1, false)`,
        [nextValue]
      );
      console.log(`Reset sequence to start from: ${nextValue}`);
      
      res.json({
        success: true,
        message: 'Database fixed successfully',
        deletedRecords: deleteResult.rowCount,
        currentMaxKey: maxKey,
        nextKey: nextValue
      });
    } catch (error) {
      console.error('Error fixing database:', error);
      res.status(500).json({ error: 'Failed to fix database', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/reconciliation-configs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const validatedData = insertReconciliationConfigSchema.parse(req.body);
      const config = await storage.createReconciliationConfig(userId, validatedData);
      
      // Track reconciliation creation
      try {
        await trackResourceActivity(req, 'created', 'reconciliation', config.reconKey?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.status(201).json(config);
    } catch (error: any) {
      console.error('Error creating reconciliation config:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid reconciliation config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create reconciliation config' });
    }
  });

  app.put("/api/reconciliation-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const validatedData = updateReconciliationConfigSchema.parse(req.body);
      const config = await storage.updateReconciliationConfig(userId, id, validatedData);

      if (!config) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
      }

      // Track reconciliation update
      try {
        await trackResourceActivity(req, 'updated', 'reconciliation', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error updating reconciliation config:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid reconciliation config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update reconciliation config' });
    }
  });

  app.delete("/api/reconciliation-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const success = await storage.deleteReconciliationConfig(userId, id);

      if (!success) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
      }

      // Track reconciliation deletion
      try {
        await trackResourceActivity(req, 'deleted', 'reconciliation', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json({ success: true, message: 'Reconciliation config deleted successfully' });
    } catch (error) {
      console.error('Error deleting reconciliation config:', error);
      res.status(500).json({ error: 'Failed to delete reconciliation config' });
    }
  });

  // Data Quality Config routes
  app.get("/api/data-quality-configs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { search, executionLayer, configKey, validationType, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        configKey: configKey ? parseInt(configKey as string) : undefined,
        validationType: validationType as string,
        status: status as string,
      };

      const configs = await storage.getDataQualityConfigs(userId, filters);
      
      // Track data quality view with filters if applied
      try {
        const hasFilters = search || executionLayer || configKey || validationType || status;
        if (hasFilters) {
          await trackFilterActivity(req, filters);
        }
        await trackActivity(req, {
          activityType: ActivityType.DATA_QUALITY_VIEWED,
          activityCategory: ActivityCategory.NAVIGATION,
          resourceType: 'data-quality',
        });
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(configs);
    } catch (error) {
      console.error('Error fetching data quality configs:', error);
      res.status(500).json({ error: 'Failed to fetch data quality configs' });
    }
  });

  app.get("/api/data-quality-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const config = await storage.getDataQualityConfig(userId, id);

      if (!config) {
        return res.status(404).json({ error: 'Data quality config not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching data quality config:', error);
      res.status(500).json({ error: 'Failed to fetch data quality config' });
    }
  });

  app.post("/api/data-quality-configs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      console.log('Received data quality config data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertDataQualityConfigSchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      const config = await storage.createDataQualityConfig(userId, validatedData);
      
      // Track data quality creation
      try {
        await trackResourceActivity(req, 'created', 'data-quality', config.dataQualityKey?.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.status(201).json(config);
    } catch (error: any) {
      console.error('Error creating data quality config:', error);
      if (error.name === 'ZodError') {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ error: 'Invalid data quality config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create data quality config', details: error.message });
    }
  });

  app.put("/api/data-quality-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const validatedData = updateDataQualityConfigSchema.parse(req.body);
      const config = await storage.updateDataQualityConfig(userId, id, validatedData);

      if (!config) {
        return res.status(404).json({ error: 'Data quality config not found' });
      }

      // Track data quality update
      try {
        await trackResourceActivity(req, 'updated', 'data-quality', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error updating data quality config:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data quality config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update data quality config' });
    }
  });

  app.delete("/api/data-quality-configs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const id = parseInt(req.params.id);
      const success = await storage.deleteDataQualityConfig(userId, id);

      if (!success) {
        return res.status(404).json({ error: 'Data quality config not found' });
      }

      // Track data quality deletion
      try {
        await trackResourceActivity(req, 'deleted', 'data-quality', id.toString());
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json({ success: true, message: 'Data quality config deleted successfully' });
    } catch (error) {
      console.error('Error deleting data quality config:', error);
      res.status(500).json({ error: 'Failed to delete data quality config' });
    }
  });

  // Get metadata for dropdowns
  app.get("/api/metadata/:type", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const { type } = req.params;
      const metadata = await storage.getMetadata(userId, type);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  });

  // Get existing temporary tables
  app.get("/api/temporary-tables", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      // Get distinct temporary target table names from config_table where they are not null/empty
      const tempTables = await db.execute(sql`
        SELECT DISTINCT temporary_target_table 
        FROM config_table 
        WHERE temporary_target_table IS NOT NULL 
        AND temporary_target_table != ''
        ORDER BY temporary_target_table
      `);

      const tableNames = tempTables.rows.map((row: any) => row.temporary_target_table);
      res.json(tableNames);
    } catch (error) {
      console.error('Error fetching temporary tables:', error);
      res.status(500).json({ error: 'Failed to fetch temporary tables' });
    }
  });

  // User Config DB Settings routes
  app.get("/api/user-config-db-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const settings = await storage.getUserConfigDbSettings(userId);
      if (!settings) {
        return res.status(404).json({ error: 'No config database settings found' });
      }

      res.json(settings);
    } catch (error) {
      console.error('Error fetching user config DB settings:', error);
      res.status(500).json({ error: 'Failed to fetch config database settings' });
    }
  });

  app.post("/api/user-config-db-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const settings = await storage.createUserConfigDbSettings({
        ...req.body,
        userId,
      });
      res.status(201).json(settings);
    } catch (error) {
      console.error('Error creating user config DB settings:', error);
      res.status(500).json({ error: 'Failed to create config database settings' });
    }
  });

  app.put("/api/user-config-db-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const updated = await storage.updateUserConfigDbSettings(userId, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Config database settings not found' });
      }

      // Track settings update
      try {
        await trackResourceActivity(req, 'updated', 'settings');
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating user config DB settings:', error);
      res.status(500).json({ error: 'Failed to update config database settings' });
    }
  });

  app.post("/api/user-config-db-settings/test", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const result = await storage.testUserConfigDbConnection(req.body);
      
      // Track settings test
      try {
        await trackResourceActivity(req, 'tested', 'settings');
      } catch (trackError) {
        console.error('Failed to track activity:', trackError);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({ success: false, message: 'Connection test failed', details: error });
    }
  });

  // User Activity routes
  app.post("/api/user-activity", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const activity = await storage.logUserActivity({
        ...req.body,
        userId,
      });
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error logging user activity:', error);
      res.status(500).json({ error: 'Failed to log user activity' });
    }
  });

  app.get("/api/user-activity", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getUserActivity(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}