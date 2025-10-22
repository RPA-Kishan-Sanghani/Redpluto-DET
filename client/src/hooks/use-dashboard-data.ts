import { useQuery } from "@tanstack/react-query";
import { DashboardFilters } from "@/components/dashboard-filter-panel";

interface DateRange {
  start: Date;
  end: Date;
}

export function useDashboardMetrics(dateRange?: DateRange, refreshKey?: number, filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard-metrics', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      if (filters?.search) params.append('search', filters.search);
      if (filters?.system) params.append('system', filters.system);
      if (filters?.layer) params.append('layer', filters.layer);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.targetTable) params.append('targetTable', filters.targetTable);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/dashboard/metrics?${params}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: true,
  });
}

export function usePipelineSummary(dateRange?: DateRange, refreshKey?: number, filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['pipeline-summary', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      if (filters?.search) params.append('search', filters.search);
      if (filters?.system) params.append('system', filters.system);
      if (filters?.layer) params.append('layer', filters.layer);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.targetTable) params.append('targetTable', filters.targetTable);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/dashboard/pipeline-summary?${params}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pipeline summary');
      return response.json();
    },
    enabled: true,
  });
}

export function usePipelineRuns(options: {
  page?: number;
  limit?: number;
  dateRange?: DateRange;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  refreshKey?: number;
  filters?: DashboardFilters;
}) {
  return useQuery({
    queryKey: [
      'pipeline-runs',
      options.page,
      options.limit,
      options.dateRange?.start?.toISOString(),
      options.dateRange?.end?.toISOString(),
      options.sortBy,
      options.sortOrder,
      options.refreshKey,
      options.filters,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.dateRange) {
        params.append('startDate', options.dateRange.start.toISOString());
        params.append('endDate', options.dateRange.end.toISOString());
      }
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      
      // Apply global filters
      if (options.filters?.search) params.append('search', options.filters.search);
      if (options.filters?.system) params.append('sourceSystem', options.filters.system);
      if (options.filters?.layer) params.append('layer', options.filters.layer);
      if (options.filters?.status) params.append('status', options.filters.status);
      if (options.filters?.category) params.append('category', options.filters.category);
      if (options.filters?.targetTable) params.append('targetTable', options.filters.targetTable);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/dashboard/pipelines?${params}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pipeline runs');
      return response.json();
    },
    enabled: true,
  });
}

export function useErrors(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['errors', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/dashboard/errors?${params}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
    enabled: true,
  });
}
