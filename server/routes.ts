import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { insertUserSchema, insertSourceConnectionSchema, updateSourceConnectionSchema, insertConfigSchema, updateConfigSchema, insertDataDictionarySchema, updateDataDictionarySchema, insertReconciliationConfigSchema, updateReconciliationConfigSchema, insertDataQualityConfigSchema, updateDataQualityConfigSchema } from "@shared/schema";
import { sql } from "drizzle-orm";

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

      if (user && user.password === password) {
        // In production, use proper password hashing
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
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

      const metrics = await storage.getDashboardMetrics(dateRange, filters);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Pipeline summary endpoint
  app.get("/api/dashboard/pipeline-summary", async (req, res) => {
    try {
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

      const summary = await storage.getPipelineSummary(dateRange, filters);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching pipeline summary:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline summary' });
    }
  });

  // Pipeline runs endpoint with filtering and pagination
  app.get("/api/dashboard/pipelines", async (req, res) => {
    try {
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

      const result = await storage.getPipelineRuns(options);
      res.json(result);
    } catch (error) {
      console.error('Error fetching pipeline runs:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline runs' });
    }
  });

  // All pipelines endpoint with filtering and pagination
  app.get("/api/dashboard/all-pipelines", async (req, res) => {
    try {
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

      const result = await storage.getAllPipelines(options);
      res.json(result);
    } catch (error) {
      console.error('Error fetching all pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch all pipelines' });
    }
  });

  // Errors endpoint
  app.get("/api/dashboard/errors", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const errors = await storage.getErrors(dateRange);
      res.json(errors);
    } catch (error) {
      console.error('Error fetching errors:', error);
      res.status(500).json({ error: 'Failed to fetch errors' });
    }
  });

  // Source connections endpoints
  // Get all connections with optional filtering
  app.get("/api/connections", async (req, res) => {
    try {
      const { category, search, status } = req.query;

      const filters = {
        category: category as string,
        search: search as string,
        status: status as string,
      };

      const connections = await storage.getConnections(filters);
      res.json(connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  });

  // Get single connection
  app.get("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const connection = await storage.getConnection(id);

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
  app.post("/api/connections", async (req, res) => {
    try {
      const validatedData = insertSourceConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(validatedData);
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
  app.put("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateSourceConnectionSchema.parse(req.body);
      const connection = await storage.updateConnection(id, validatedData);

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
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
  app.delete("/api/connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteConnection(id);

      if (!success) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      res.json({ success: true, message: 'Connection deleted successfully' });
    } catch (error) {
      console.error('Error deleting connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  });

  // Test connection
  app.post("/api/connections/test", async (req, res) => {
    try {
      const result = await storage.testConnection(req.body);

      // If test is successful and connectionId exists, update status to Active
      if (result.success && req.body.connectionId) {
        try {
          await storage.updateConnection(req.body.connectionId, { 
            status: 'Active', 
            lastSync: new Date() 
          });
        } catch (updateError) {
          console.error('Error updating connection status:', updateError);
          // Don't fail the entire request if status update fails
        }
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
  app.get("/api/connections/:id/schemas", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const schemas = await storage.getDatabaseSchemas(connectionId);
      res.json(schemas);
    } catch (error) {
      console.error('Error fetching database schemas:', error);
      res.status(500).json({ error: 'Failed to fetch database schemas' });
    }
  });

  // Get database tables from a connection and schema
  app.get("/api/connections/:id/schemas/:schema/tables", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tables = await storage.getDatabaseTables(connectionId, schemaName);
      res.json(tables);
    } catch (error) {
      console.error('Error fetching database tables:', error);
      res.status(500).json({ error: 'Failed to fetch database tables' });
    }
  });

  // Get database columns from a connection, schema, and table
  app.get("/api/connections/:id/schemas/:schema/tables/:table/columns", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const columns = await storage.getDatabaseColumns(connectionId, schemaName, tableName);
      res.json(columns);
    } catch (error) {
      console.error('Error fetching database columns:', error);
      res.status(500).json({ error: 'Failed to fetch database columns' });
    }
  });

  // Get enhanced database column metadata with data types and constraints
  app.get("/api/connections/:id/schemas/:schema/tables/:table/metadata", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const metadata = await storage.getDatabaseColumnMetadata(connectionId, schemaName, tableName);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching column metadata:', error);
      res.status(500).json({ error: 'Failed to fetch column metadata' });
    }
  });

  // Get database columns with data types for filtering
  app.get("/api/connections/:id/schemas/:schema/tables/:table/columns-with-types", async (req, res) => {
    try {
      const connectionId = parseInt(req.params.id);
      const schemaName = req.params.schema;
      const tableName = req.params.table;
      const { dataTypes } = req.query;
      
      const metadata = await storage.getDatabaseColumnMetadata(connectionId, schemaName, tableName);
      
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
  app.get("/api/pipelines", async (req, res) => {
    try {
      const { search, executionLayer, sourceSystem, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        sourceSystem: sourceSystem as string,
        status: status as string,
      };

      const pipelines = await storage.getPipelines(filters);
      res.json(pipelines);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  });

  // Get single pipeline
  app.get("/api/pipelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pipeline = await storage.getPipeline(id);

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
  app.post("/api/pipelines", async (req, res) => {
    try {
      const validatedData = insertConfigSchema.parse(req.body);
      const pipeline = await storage.createPipeline(validatedData);
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
  app.put("/api/pipelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateConfigSchema.parse(req.body);
      const pipeline = await storage.updatePipeline(id, validatedData);

      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
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
  app.delete("/api/pipelines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePipeline(id);

      if (!success) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      res.json({ success: true, message: 'Pipeline deleted successfully' });
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      res.status(500).json({ error: 'Failed to delete pipeline' });
    }
  });

  // Data Dictionary routes
  app.get("/api/data-dictionary", async (req, res) => {
    try {
      const { search, executionLayer, schemaName, tableName, sourceSystem } = req.query;

      const entries = await storage.getDataDictionaryEntries({
        search: search as string,
        executionLayer: executionLayer as string,
        schemaName: schemaName as string,
        tableName: tableName as string,
        sourceSystem: sourceSystem as string
      });
      res.json(entries);
    } catch (error) {
      console.error('Error fetching data dictionary entries:', error);
      res.status(500).json({ error: 'Failed to fetch data dictionary entries' });
    }
  });

  app.get("/api/data-dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.getDataDictionaryEntry(id);

      if (!entry) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      res.json(entry);
    } catch (error) {
      console.error('Error fetching data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to fetch data dictionary entry' });
    }
  });

  app.post("/api/data-dictionary", async (req, res) => {
    try {
      console.log('Incoming data dictionary request body:', JSON.stringify(req.body, null, 2));
      const validatedData = insertDataDictionarySchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));

      // Use the main database connection that's forced to external PostgreSQL
      const entry = await storage.createDataDictionaryEntry(validatedData);

      console.log('Successfully saved to external database with ID:', entry.dataDictionaryKey);
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

  app.put("/api/data-dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateDataDictionarySchema.parse(req.body);
      const entry = await storage.updateDataDictionaryEntry(id, validatedData);

      if (!entry) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      res.json(entry);
    } catch (error) {
      console.error('Error updating data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to update data dictionary entry' });
    }
  });

  app.delete("/api/data-dictionary/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDataDictionaryEntry(id);

      if (!success) {
        return res.status(404).json({ error: 'Data dictionary entry not found' });
      }

      res.json({ success: true, message: 'Data dictionary entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to delete data dictionary entry' });
    }
  });

  // Reconciliation config routes
  app.get("/api/reconciliation-configs", async (req, res) => {
    try {
      const { search, executionLayer, configKey, reconType, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        configKey: configKey ? parseInt(configKey as string) : undefined,
        reconType: reconType as string,
        status: status as string,
      };

      const configs = await storage.getReconciliationConfigs(filters);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching reconciliation configs:', error);
      res.status(500).json({ error: 'Failed to fetch reconciliation configs' });
    }
  });

  app.get("/api/reconciliation-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getReconciliationConfig(id);

      if (!config) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching reconciliation config:', error);
      res.status(500).json({ error: 'Failed to fetch reconciliation config' });
    }
  });

  app.post("/api/reconciliation-configs", async (req, res) => {
    try {
      const validatedData = insertReconciliationConfigSchema.parse(req.body);
      const config = await storage.createReconciliationConfig(validatedData);
      res.status(201).json(config);
    } catch (error: any) {
      console.error('Error creating reconciliation config:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid reconciliation config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create reconciliation config' });
    }
  });

  app.put("/api/reconciliation-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateReconciliationConfigSchema.parse(req.body);
      const config = await storage.updateReconciliationConfig(id, validatedData);

      if (!config) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
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

  app.delete("/api/reconciliation-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteReconciliationConfig(id);

      if (!success) {
        return res.status(404).json({ error: 'Reconciliation config not found' });
      }

      res.json({ success: true, message: 'Reconciliation config deleted successfully' });
    } catch (error) {
      console.error('Error deleting reconciliation config:', error);
      res.status(500).json({ error: 'Failed to delete reconciliation config' });
    }
  });

  // Data Quality Config routes
  app.get("/api/data-quality-configs", async (req, res) => {
    try {
      const { search, executionLayer, configKey, validationType, status } = req.query;

      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        configKey: configKey ? parseInt(configKey as string) : undefined,
        validationType: validationType as string,
        status: status as string,
      };

      const configs = await storage.getDataQualityConfigs(filters);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching data quality configs:', error);
      res.status(500).json({ error: 'Failed to fetch data quality configs' });
    }
  });

  app.get("/api/data-quality-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getDataQualityConfig(id);

      if (!config) {
        return res.status(404).json({ error: 'Data quality config not found' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching data quality config:', error);
      res.status(500).json({ error: 'Failed to fetch data quality config' });
    }
  });

  app.post("/api/data-quality-configs", async (req, res) => {
    try {
      console.log('Received data quality config data:', JSON.stringify(req.body, null, 2));
      const validatedData = insertDataQualityConfigSchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      const config = await storage.createDataQualityConfig(validatedData);
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

  app.put("/api/data-quality-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateDataQualityConfigSchema.parse(req.body);
      const config = await storage.updateDataQualityConfig(id, validatedData);

      if (!config) {
        return res.status(404).json({ error: 'Data quality config not found' });
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

  app.delete("/api/data-quality-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDataQualityConfig(id);

      if (!success) {
        return res.status(404).json({ error: 'Data quality config not found' });
      }

      res.json({ success: true, message: 'Data quality config deleted successfully' });
    } catch (error) {
      console.error('Error deleting data quality config:', error);
      res.status(500).json({ error: 'Failed to delete data quality config' });
    }
  });

  // Get metadata for dropdowns
  app.get("/api/metadata/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const metadata = await storage.getMetadata(type);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  });

  // Get existing temporary tables
  app.get("/api/temporary-tables", async (req, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}