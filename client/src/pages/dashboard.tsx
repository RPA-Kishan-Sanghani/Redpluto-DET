
import Header from "@/components/header";
import MetricsCards from "@/components/metrics-cards";
import DagSummaryCards from "@/components/dag-summary-cards";
import AllPipelinesTable from "@/components/all-pipelines-table";
import DashboardFilterPanel, { DashboardFilters } from "@/components/dashboard-filter-panel";
import { useState } from "react";

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<DashboardFilters>({
    search: '',
    system: '',
    layer: '',
    status: '',
    category: '',
    targetTable: '',
    dateRange: 'Last 24 hours',
    customStartDate: undefined,
    customEndDate: undefined,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    
    if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      return {
        start: filters.customStartDate,
        end: filters.customEndDate,
      };
    }
    
    switch (filters.dateRange) {
      case "Last 24 hours":
        return {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now,
        };
      case "Last 7 days":
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case "Last 30 days":
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
        };
      default:
        return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Filter Panel */}
          <div className="w-80 flex-shrink-0">
            <DashboardFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Pipeline Dashboard</h1>
              <p className="text-gray-600">Monitor and manage your data pipeline operations</p>
            </div>

            <div className="space-y-6">
              <MetricsCards 
                dateRange={getDateRangeFilter()} 
                refreshKey={refreshKey}
                filters={filters}
              />
              
              <DagSummaryCards 
                dateRange={getDateRangeFilter()} 
                refreshKey={refreshKey}
                filters={filters}
              />
              
              <AllPipelinesTable 
                dateRange={getDateRangeFilter()} 
                refreshKey={refreshKey}
                filters={filters}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
