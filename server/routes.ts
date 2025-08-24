import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  const httpServer = createServer(app);
  return httpServer;
}
