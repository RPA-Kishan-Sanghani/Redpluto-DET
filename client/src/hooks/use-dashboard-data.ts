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

export function useDAGSummary(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['dag-summary', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      const response = await fetch(`/api/dashboard/dag-summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch DAG summary');
      return response.json();
    },
    enabled: true,
  });
}

export function useDAGRuns(options: {
  page?: number;
  limit?: number;
  search?: string;
  layer?: string;
  status?: string;
  owner?: string;
  dateRange?: DateRange;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  refreshKey?: number;
}) {
  return useQuery({
    queryKey: [
      'dag-runs',
      options.page,
      options.limit,
      options.search,
      options.layer,
      options.status,
      options.owner,
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
      if (options.layer) params.append('layer', options.layer);
      if (options.status) params.append('status', options.status);
      if (options.owner) params.append('owner', options.owner);
      if (options.dateRange) {
        params.append('startDate', options.dateRange.start.toISOString());
        params.append('endDate', options.dateRange.end.toISOString());
      }
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      
      const response = await fetch(`/api/dashboard/dags?${params}`);
      if (!response.ok) throw new Error('Failed to fetch DAG runs');
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
