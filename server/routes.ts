import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceConnectionSchema, updateSourceConnectionSchema } from "@shared/schema";

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
    } catch (error) {
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
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
