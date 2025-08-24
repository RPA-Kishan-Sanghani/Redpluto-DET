import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface DagTableProps {
  dateRange?: { start: Date; end: Date };
  refreshKey: number;
}

interface DAGRun {
  auditKey: number;
  dagName: string;
  runId: string;
  layer: string;
  status: string;
  lastRun: Date;
  owner: string;
  duration?: number;
}

interface DAGData {
  data: DAGRun[];
  total: number;
  page: number;
  limit: number;
}

export default function DagTable({ dateRange, refreshKey }: DagTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("lastRun");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: dagData, isLoading } = useQuery<DAGData>({
    queryKey: [
      '/api/dashboard/dags',
      page,
      search,
      layerFilter,
      statusFilter,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
      sortBy,
      sortOrder,
      refreshKey,
    ],
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

  const getLayerBadge = (layer: string) => {
    const layerLower = layer.toLowerCase();
    switch (layerLower) {
      case "bronze":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Bronze</Badge>;
      case "silver":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Silver</Badge>;
      case "gold":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Gold</Badge>;
      case "quality":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quality</Badge>;
      case "reconciliation":
        return <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-100">Reconciliation</Badge>;
      default:
        return <Badge variant="outline">{layer}</Badge>;
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Latest DAG Runs</h3>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search DAGs..."
                className="w-full sm:w-64 pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-dags"
              />
            </div>

            {/* Filters */}
            <Select value={layerFilter} onValueChange={setLayerFilter}>
              <SelectTrigger className="w-32" data-testid="select-layer-filter">
                <SelectValue placeholder="All Layers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="reconciliation">Reconciliation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
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
                onClick={() => handleSort("dagName")}
                data-testid="button-sort-name"
              >
                DAG Name <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("layer")}
                data-testid="button-sort-layer"
              >
                Layer <ArrowUpDown className="inline ml-1 h-3 w-3" />
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
                onClick={() => handleSort("lastRun")}
                data-testid="button-sort-last-run"
              >
                Last Run <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("owner")}
                data-testid="button-sort-owner"
              >
                Owner <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
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
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                </tr>
              ))
            ) : dagData?.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No DAG runs found for the selected criteria.
                </td>
              </tr>
            ) : (
              dagData?.data?.map((dag) => (
                <tr
                  key={dag.auditKey}
                  className="hover:bg-gray-50 cursor-pointer"
                  data-testid={`row-dag-${dag.auditKey}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900" data-testid={`text-dag-name-${dag.auditKey}`}>
                          {dag.dagName}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-run-id-${dag.auditKey}`}>
                          {dag.runId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-layer-${dag.auditKey}`}>
                    {getLayerBadge(dag.layer)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-status-${dag.auditKey}`}>
                    {getStatusBadge(dag.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-last-run-${dag.auditKey}`}>
                    {formatTimeAgo(dag.lastRun)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900" data-testid={`text-owner-${dag.auditKey}`}>
                        {dag.owner}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-900 p-0 mr-3" data-testid={`button-view-${dag.auditKey}`}>
                      View
                    </Button>
                    <Button variant="link" size="sm" className="text-green-600 hover:text-green-900 p-0 mr-3" data-testid={`button-run-${dag.auditKey}`}>
                      Run
                    </Button>
                    <Button variant="link" size="sm" className="text-red-600 hover:text-red-900 p-0" data-testid={`button-stop-${dag.auditKey}`}>
                      Stop
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {dagData && (
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
              disabled={page * dagData.limit >= dagData.total}
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
                  {(page - 1) * dagData.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium" data-testid="text-pagination-end">
                  {Math.min(page * dagData.limit, dagData.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium" data-testid="text-pagination-total">
                  {dagData.total}
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
                  disabled={page * dagData.limit >= dagData.total}
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
