import { useQuery } from "@tanstack/react-query";

interface DateRange {
  start: Date;
  end: Date;
}

export function useDashboardMetrics(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['dashboard-metrics', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      const response = await fetch(`/api/dashboard/metrics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: true,
  });
}

export function usePipelineSummary(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['pipeline-summary', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      const response = await fetch(`/api/dashboard/pipeline-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline summary');
      return response.json();
    },
    enabled: true,
  });
}

export function usePipelineRuns(options: {
  page?: number;
  limit?: number;
  search?: string;
  sourceSystem?: string;
  status?: string;
  dateRange?: DateRange;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  refreshKey?: number;
}) {
  return useQuery({
    queryKey: [
      'pipeline-runs',
      options.page,
      options.limit,
      options.search,
      options.sourceSystem,
      options.status,
      options.dateRange?.start?.toISOString(),
      options.dateRange?.end?.toISOString(),
      options.sortBy,
      options.sortOrder,
      options.refreshKey,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.search) params.append('search', options.search);
      if (options.sourceSystem) params.append('sourceSystem', options.sourceSystem);
      if (options.status) params.append('status', options.status);
      if (options.dateRange) {
        params.append('startDate', options.dateRange.start.toISOString());
        params.append('endDate', options.dateRange.end.toISOString());
      }
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      
      const response = await fetch(`/api/dashboard/pipelines?${params}`);
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
      const response = await fetch(`/api/dashboard/errors?${params}`);
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
    enabled: true,
  });
}
