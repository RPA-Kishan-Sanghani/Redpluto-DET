
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PipelineTableProps {
  dateRange?: { start: Date; end: Date };
  refreshKey: number;
}

interface PipelineRun {
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
  errorDetails?: string;
  duration?: number;
}

interface PipelineData {
  data: PipelineRun[];
  total: number;
  page: number;
  limit: number;
}

export default function PipelineTable({ dateRange, refreshKey }: PipelineTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sourceSystemFilter, setSourceSystemFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("startTime");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: pipelineData, isLoading } = useQuery<PipelineData>({
    queryKey: [
      'pipeline-runs',
      page,
      search,
      sourceSystemFilter,
      statusFilter,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
      sortBy,
      sortOrder,
      refreshKey,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '5');
      if (search) params.append('search', search);
      if (sourceSystemFilter && sourceSystemFilter !== 'all') params.append('sourceSystem', sourceSystemFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/dashboard/pipelines?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pipeline runs');
      return response.json();
    },
    enabled: true,
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Less than 1 hour ago";
    } else if (diffInHours === 1) {
      return "1 hour ago";
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return "N/A";
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Latest Pipeline Runs</h3>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search pipelines..."
                className="w-full sm:w-64 pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-pipelines"
              />
            </div>

            {/* Filters */}
            <Select value={sourceSystemFilter} onValueChange={setSourceSystemFilter}>
              <SelectTrigger className="w-40" data-testid="select-source-system-filter">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
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
            <Button variant="outline" size="sm" data-testid="button-export">
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("codeName")}
                data-testid="button-sort-name"
              >
                Process Name <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("sourceSystem")}
                data-testid="button-sort-source-system"
              >
                Source System <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schema/Table
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source File
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
                data-testid="button-sort-status"
              >
                Status <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("startTime")}
                data-testid="button-sort-start-time"
              >
                Started <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Row Counts
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-16 bg-gray-200 rounded w-16"></div>
                  </td>
                </tr>
              ))
            ) : pipelineData?.data?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No pipeline runs found for the selected criteria.
                </td>
              </tr>
            ) : (
              pipelineData?.data?.map((pipeline) => (
                <tr
                  key={pipeline.auditKey}
                  className="hover:bg-gray-50 cursor-pointer"
                  data-testid={`row-pipeline-${pipeline.auditKey}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900" data-testid={`text-code-name-${pipeline.auditKey}`}>
                          {pipeline.codeName}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-run-id-${pipeline.auditKey}`}>
                          Run ID: {pipeline.runId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-source-system-${pipeline.auditKey}`}>
                    <Badge variant="outline">{pipeline.sourceSystem}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-schema-table-${pipeline.auditKey}`}>
                    <div>
                      <div className="font-medium">{pipeline.schemaName}</div>
                      <div className="text-gray-400">{pipeline.targetTableName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-source-file-${pipeline.auditKey}`}>
                    {pipeline.sourceFileName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-status-${pipeline.auditKey}`}>
                    {getStatusBadge(pipeline.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-start-time-${pipeline.auditKey}`}>
                    {formatTimeAgo(pipeline.startTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-duration-${pipeline.auditKey}`}>
                    {formatDuration(pipeline.startTime, pipeline.endTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-row-counts-${pipeline.auditKey}`}>
                    <div className="space-y-1">
                      <div>+{pipeline.insertedRowCount} inserted</div>
                      <div>~{pipeline.updatedRowCount} updated</div>
                      <div>-{pipeline.deletedRowCount} deleted</div>
                      <div>={pipeline.noChangeRowCount} unchanged</div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pipelineData && (
        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              data-testid="button-previous-mobile"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page * pipelineData.limit >= pipelineData.total}
              data-testid="button-next-mobile"
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium" data-testid="text-pagination-start">
                  {(page - 1) * pipelineData.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium" data-testid="text-pagination-end">
                  {Math.min(page * pipelineData.limit, pipelineData.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium" data-testid="text-pagination-total">
                  {pipelineData.total}
                </span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-l-md"
                  data-testid="button-previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * pipelineData.limit >= pipelineData.total}
                  className="rounded-r-md"
                  data-testid="button-next"
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
