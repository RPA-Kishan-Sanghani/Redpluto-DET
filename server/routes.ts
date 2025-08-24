import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceConnectionSchema, updateSourceConnectionSchema, insertConfigSchema, updateConfigSchema, insertDataDictionarySchema, updateDataDictionarySchema, insertReconciliationConfigSchema, updateReconciliationConfigSchema, insertDataQualityConfigSchema, updateDataQualityConfigSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const metrics = await storage.getDashboardMetrics(dateRange);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Pipeline summary endpoint
  app.get("/api/dashboard/pipeline-summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      const summary = await storage.getPipelineSummary(dateRange);
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
      const { search, executionLayer, configKey } = req.query;
      
      const filters = {
        search: search as string,
        executionLayer: executionLayer as string,
        configKey: configKey ? parseInt(configKey as string) : undefined,
      };

      const entries = await storage.getDataDictionaryEntries(filters);
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
      const validatedData = insertDataDictionarySchema.parse(req.body);
      const entry = await storage.createDataDictionaryEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      console.error('Error creating data dictionary entry:', error);
      res.status(500).json({ error: 'Failed to create data dictionary entry' });
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
      const validatedData = insertDataQualityConfigSchema.parse(req.body);
      const config = await storage.createDataQualityConfig(validatedData);
      res.status(201).json(config);
    } catch (error: any) {
      console.error('Error creating data quality config:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data quality config data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create data quality config' });
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

  const httpServer = createServer(app);
  return httpServer;
}
