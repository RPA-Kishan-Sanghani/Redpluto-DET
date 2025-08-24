import { useQuery } from "@tanstack/react-query";

interface DagSummaryCardsProps {
  dateRange?: { start: Date; end: Date };
  refreshKey: number;
}

interface SummaryData {
  dataQuality: { total: number; success: number; failed: number };
  reconciliation: { total: number; success: number; failed: number };
  bronze: { total: number; success: number; failed: number };
  silver: { total: number; success: number; failed: number };
  gold: { total: number; success: number; failed: number };
}

export default function DagSummaryCards({ dateRange, refreshKey }: DagSummaryCardsProps) {
  const { data: summary, isLoading } = useQuery<SummaryData>({
    queryKey: ['/api/dashboard/dag-summary', dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), refreshKey],
    enabled: true,
  });

  const categories = [
    {
      title: "Data Quality DAGs",
      data: summary?.dataQuality || { total: 0, success: 0, failed: 0 },
      testId: "card-data-quality",
    },
    {
      title: "Data Reconciliation",
      data: summary?.reconciliation || { total: 0, success: 0, failed: 0 },
      testId: "card-reconciliation",
    },
    {
      title: "Bronze Layer",
      data: summary?.bronze || { total: 0, success: 0, failed: 0 },
      testId: "card-bronze",
    },
    {
      title: "Silver Layer",
      data: summary?.silver || { total: 0, success: 0, failed: 0 },
      testId: "card-silver",
    },
    {
      title: "Gold Layer",
      data: summary?.gold || { total: 0, success: 0, failed: 0 },
      testId: "card-gold",
    },
  ];

  if (isLoading) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 animate-pulse">
              <div className="text-center">
                <div className="h-5 bg-gray-200 rounded mb-2"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Categories</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <div
            key={category.title}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors"
            data-testid={category.testId}
          >
            <div className="text-center">
              <h4 className="font-medium text-gray-900 mb-2" data-testid={`text-${category.testId}-title`}>
                {category.title}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium" data-testid={`text-${category.testId}-total`}>
                    {category.data.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success:</span>
                  <span className="font-medium text-green-600" data-testid={`text-${category.testId}-success`}>
                    {category.data.success}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600" data-testid={`text-${category.testId}-failed`}>
                    {category.data.failed}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
