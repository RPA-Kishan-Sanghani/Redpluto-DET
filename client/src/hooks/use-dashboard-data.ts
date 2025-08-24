import { useQuery } from "@tanstack/react-query";

interface DateRange {
  start: Date;
  end: Date;
}

export function useDashboardMetrics(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['/api/dashboard/metrics', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    enabled: true,
  });
}

export function useDAGSummary(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['/api/dashboard/dag-summary', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
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
      '/api/dashboard/dags',
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
    enabled: true,
  });
}

export function useErrors(dateRange?: DateRange, refreshKey?: number) {
  return useQuery({
    queryKey: ['/api/dashboard/errors', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    enabled: true,
  });
}
