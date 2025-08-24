import Header from "@/components/header";
import MetricsCards from "@/components/metrics-cards";
import DagSummaryCards from "@/components/dag-summary-cards";
import DagTable from "@/components/dag-table";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("Last 24 hours");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
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
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Date Range Filter */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">Pipeline Dashboard</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Date Range:</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40" data-testid="select-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
                    <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                    <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                    <SelectItem value="Custom range">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleRefresh}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <MetricsCards dateRange={getDateRangeFilter()} refreshKey={refreshKey} />
        <DagSummaryCards dateRange={getDateRangeFilter()} refreshKey={refreshKey} />
        <DagTable dateRange={getDateRangeFilter()} refreshKey={refreshKey} />
      </main>
    </div>
  );
}
