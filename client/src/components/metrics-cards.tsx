import { useQuery } from "@tanstack/react-query";
import { TrendingUp, CheckCircle, XCircle, Clock, Play } from "lucide-react";
import { DashboardFilters } from "./dashboard-filter-panel";

interface DateRange {
  start: Date;
  end: Date;
}

interface MetricsCardsProps {
  dateRange?: DateRange;
  refreshKey: number;
  filters: DashboardFilters;
}

interface MetricsData {
  totalPipelines: number;
  successfulRuns: number;
  failedRuns: number;
  scheduledRuns: number;
  runningRuns: number;
}

import { useDashboardMetrics } from "@/hooks/use-dashboard-data";

export default function MetricsCards({ dateRange, refreshKey, filters }: MetricsCardsProps) {
  const { data: metrics, isLoading } = useDashboardMetrics(dateRange, refreshKey, filters);

  const cards = [
    {
      title: "Total Pipelines",
      value: metrics?.totalPipelines || 0,
      icon: TrendingUp,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-600",
      testId: "card-total-pipelines",
    },
    {
      title: "Successful Runs",
      value: metrics?.successfulRuns || 0,
      icon: CheckCircle,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-600",
      testId: "card-successful-runs",
    },
    {
      title: "Failed Runs",
      value: metrics?.failedRuns || 0,
      icon: XCircle,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-600",
      testId: "card-failed-runs",
    },
    {
      title: "Scheduled Runs",
      value: metrics?.scheduledRuns || 0,
      icon: Clock,
      color: "yellow",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-600",
      testId: "card-scheduled-runs",
    },
    {
      title: "Running Runs",
      value: metrics?.runningRuns || 0,
      icon: Play,
      color: "purple",
      bgColor: "bg-purple-100",
      textColor: "text-purple-600",
      testId: "card-running-runs",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="ml-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer min-w-0"
            data-testid={card.testId}
          >
            <div className="flex items-center min-w-0">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${card.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`${card.textColor}`} size={18} />
                </div>
              </div>
              <div className="ml-4 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-500 break-words" data-testid={`text-${card.testId}-label`}>
                  {card.title}
                </p>
                <p className={`text-xl lg:text-2xl font-semibold ${card.textColor} break-words`} data-testid={`text-${card.testId}-value`}>
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}