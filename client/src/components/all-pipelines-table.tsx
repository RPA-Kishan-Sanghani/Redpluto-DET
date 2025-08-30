import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Assume DashboardFilters is defined in a separate file like ./dashboard-filter-panel
// For this example, let's define a placeholder interface if it's not provided.
interface DashboardFilters {
  system: string;
  layer: string;
  date: { start: Date | null; end: Date | null };
  status: string;
  category: string;
  targetTableName: string;
  search: string; // Assuming search is also part of global filters
}

interface AllPipelinesTableProps {
  dateRange?: { start: Date; end: Date };
  refreshKey: number;
  filters: DashboardFilters;
}

interface PipelineRecord {
  auditKey: number;
  codeName: string;
  runId: string;
  sourceSystem: string;
  schemaName: string;
  targetTableName: string;
  sourceFileName: string;
  startTime: Date;
  endTime?: Date;
  insertedRowCount: number;
  updatedRowCount: number;
  deletedRowCount: number;
  noChangeRowCount: number;
  status: string;
}

interface AllPipelinesData {
  data: PipelineRecord[];
  total: number;
  page: number;
  limit: number;
}

// Mock usePipelineRuns hook as it's not provided
const usePipelineRuns = ({
  page,
  limit,
  dateRange,
  sortBy,
  sortOrder,
  refreshKey,
  filters,
}: {
  page: number;
  limit: number;
  dateRange?: { start: Date; end: Date };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  refreshKey: number;
  filters: DashboardFilters;
}) => {
  // Dummy data and loading state for demonstration
  const mockData: AllPipelinesData = {
    data: [
      {
        auditKey: 1,
        codeName: 'ETL_Process_A',
        runId: 'run_001',
        sourceSystem: 'Salesforce',
        schemaName: 'Bronze',
        targetTableName: 'stg_salesforce_account',
        sourceFileName: 'account.csv',
        startTime: new Date('2023-10-26T10:00:00Z'),
        endTime: new Date('2023-10-26T10:05:00Z'),
        insertedRowCount: 100,
        updatedRowCount: 5,
        deletedRowCount: 0,
        noChangeRowCount: 95,
        status: 'SUCCESS',
      },
      {
        auditKey: 2,
        codeName: 'Data_Cleanup_B',
        runId: 'run_002',
        sourceSystem: 'MySQL',
        schemaName: 'Silver',
        targetTableName: 'clean_users',
        sourceFileName: 'users.sql',
        startTime: new Date('2023-10-26T11:00:00Z'),
        endTime: new Date('2023-10-26T11:02:30Z'),
        insertedRowCount: 0,
        updatedRowCount: 50,
        deletedRowCount: 2,
        noChangeRowCount: 0,
        status: 'FAILED',
      },
    ],
    total: 2,
    page: 1,
    limit: 10,
  };
  return { data: mockData, isLoading: false };
};


export default function AllPipelinesTable({ dateRange, refreshKey, filters }: AllPipelinesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: pipelinesData, isLoading } = usePipelineRuns({
    page: currentPage,
    limit: 10,
    dateRange,
    sortBy,
    sortOrder,
    refreshKey,
    filters,
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✅ Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">❌ Failed</Badge>;
      case "running":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">🕒 Running</Badge>;
      case "scheduled":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">⏰ Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return "N/A";
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Pipelines</h3>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search pipelines..."
                className="w-full sm:w-64 pl-10"
                value={filters.search}
                // onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))} // Removed
                data-testid="input-search-all-pipelines"
              />
            </div>

            {/* Filters */}
            <Select value={filters.sourceSystem || "all"} onValueChange={(value) => {
              // Assuming filters are managed globally and this component receives them.
              // If direct state update is needed here, it should be done via a callback from parent.
              // For now, we'll simulate passing it up.
              console.log("Source system filter changed to:", value);
            }}>
              <SelectTrigger className="w-40" data-testid="select-all-pipelines-source-filter">
                <SelectValue placeholder="All Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Quality">Quality</SelectItem>
                <SelectItem value="Reconciliation">Reconciliation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status || "all"} onValueChange={(value) => {
              console.log("Status filter changed to:", value);
            }}>
              <SelectTrigger className="w-32" data-testid="select-all-pipelines-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button variant="outline" size="sm" data-testid="button-export-all-pipelines">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("codeName")}
              >
                Process Name <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run ID
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("sourceSystem")}
              >
                Source System <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schema/Table
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source File
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("startTime")}
              >
                Start Time <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("endTime")}
              >
                End Time <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row Counts
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                Status <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => ( // Changed length to 10 to match limit
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : pipelinesData?.data?.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  No pipelines found for the selected criteria.
                </td>
              </tr>
            ) : (
              pipelinesData?.data?.map((pipeline) => (
                <tr
                  key={pipeline.auditKey}
                  className="hover:bg-gray-50 cursor-pointer"
                  data-testid={`row-all-pipeline-${pipeline.auditKey}`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {pipeline.codeName}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pipeline.runId}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant="outline">{pipeline.sourceSystem}</Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div className="font-medium">{pipeline.schemaName}</div>
                      <div className="text-gray-400">{pipeline.targetTableName}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pipeline.sourceFileName || 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(pipeline.startTime)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pipeline.endTime ? formatDateTime(pipeline.endTime) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(pipeline.startTime, pipeline.endTime)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1 text-xs">
                      <div>+{pipeline.insertedRowCount} inserted</div>
                      <div>~{pipeline.updatedRowCount} updated</div>
                      <div>-{pipeline.deletedRowCount} deleted</div>
                      <div>={pipeline.noChangeRowCount} unchanged</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(pipeline.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pipelinesData && (
        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * 10 >= pipelinesData.total}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * 10 + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * 10, pipelinesData.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {pipelinesData.total}
                </span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-l-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 10 >= pipelinesData.total}
                  className="rounded-r-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}