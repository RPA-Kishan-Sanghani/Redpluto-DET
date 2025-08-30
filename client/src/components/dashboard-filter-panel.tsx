
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, Filter, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DashboardFilters {
  search: string;
  system: string;
  layer: string;
  status: string;
  category: string;
  targetTable: string;
  dateRange: string;
  customStartDate?: Date;
  customEndDate?: Date;
}

interface DashboardFilterPanelProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onRefresh: () => void;
}

export default function DashboardFilterPanel({ 
  filters, 
  onFiltersChange, 
  onRefresh 
}: DashboardFilterPanelProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleReset = () => {
    const resetFilters: DashboardFilters = {
      search: '',
      system: '',
      layer: '',
      status: '',
      category: '',
      targetTable: '',
      dateRange: 'Last 24 hours',
      customStartDate: undefined,
      customEndDate: undefined,
    };
    onFiltersChange(resetFilters);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleDateRangeChange = (value: string) => {
    const updatedFilters = { ...filters, dateRange: value };
    if (value !== 'custom') {
      updatedFilters.customStartDate = undefined;
      updatedFilters.customEndDate = undefined;
      setStartDate(undefined);
      setEndDate(undefined);
    }
    onFiltersChange(updatedFilters);
  };

  const handleCustomDateChange = () => {
    onFiltersChange({
      ...filters,
      customStartDate: startDate,
      customEndDate: endDate,
    });
  };

  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-64"
    )}>
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-xs px-2 py-1 h-7 mr-1"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                ) : (
                  <ChevronUp className="h-3 w-3 rotate-90" />
                )}
              </Button>
              <Filter className="h-4 w-4 mr-1" />
              {!isCollapsed && "Filters"}
            </div>
            <div className="flex items-center space-x-1">
              {!isCollapsed && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs px-2 py-1 h-7"
                    data-testid="button-reset-filters"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onRefresh}
                    className="text-xs px-2 py-1 h-7 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-refresh-dashboard"
                  >
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="space-y-3">
        {/* Search */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Search</label>
          <Input
            placeholder="Search..." 
            className="text-sm"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            data-testid="input-global-search"
          />
        </div>

        {/* System */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Source System</label>
          <Select 
            value={filters.system || "all"} 
            onValueChange={(value) => onFiltersChange({ ...filters, system: value === 'all' ? '' : value })}
          >
            <SelectTrigger data-testid="select-system-filter">
              <SelectValue placeholder="All Systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="oracle">Oracle</SelectItem>
              <SelectItem value="snowflake">Snowflake</SelectItem>
              <SelectItem value="bigquery">BigQuery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Execution Layer */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Layer</label>
          <Select 
            value={filters.layer || "all"} 
            onValueChange={(value) => onFiltersChange({ ...filters, layer: value === 'all' ? '' : value })}
          >
            <SelectTrigger data-testid="select-layer-filter">
              <SelectValue placeholder="All Layers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              <SelectItem value="Bronze">Bronze</SelectItem>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
          <Select 
            value={filters.status || "all"} 
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
          >
            <SelectTrigger data-testid="select-status-filter">
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
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
          <Select 
            value={filters.category || "all"} 
            onValueChange={(value) => onFiltersChange({ ...filters, category: value === 'all' ? '' : value })}
          >
            <SelectTrigger data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="data_quality">Data Quality</SelectItem>
              <SelectItem value="reconciliation">Reconciliation</SelectItem>
              <SelectItem value="etl">ETL Pipeline</SelectItem>
              <SelectItem value="data_ingestion">Data Ingestion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Table */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Target Table</label>
          <Input
            placeholder="Table name..." 
            className="text-sm"
            value={filters.targetTable}
            onChange={(e) => onFiltersChange({ ...filters, targetTable: e.target.value })}
            data-testid="input-target-table-filter"
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
          <Select 
            value={filters.dateRange} 
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger data-testid="select-date-range-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
              <SelectItem value="Last 7 days">Last 7 days</SelectItem>
              <SelectItem value="Last 30 days">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {filters.dateRange === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleCustomDateChange}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-apply-custom-date"
            >
              Apply Date Range
            </Button>
          </div>
        )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
