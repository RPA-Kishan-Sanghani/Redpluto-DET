import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, Edit, Plus, Search, Filter, ChevronDown, ChevronUp, Database, Settings, Target, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import type { ReconciliationConfig, InsertReconciliationConfig, UpdateReconciliationConfig } from '@shared/schema';
import { ReconciliationForm } from '@/components/reconciliation-form';

interface ReconciliationFilters {
  search: string;
  executionLayer: string;
  reconType: string;
  status: string;
}

export function Reconciliation() {
  const [filters, setFilters] = useState<ReconciliationFilters>({
    search: '',
    executionLayer: '',
    reconType: '',
    status: ''
  });
  const [openConfigs, setOpenConfigs] = useState<Set<number>>(new Set());
  const [editingConfig, setEditingConfig] = useState<ReconciliationConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch reconciliation configurations
  const { data: allReconciliations = [], isLoading, error } = useQuery({
    queryKey: ['/api/reconciliation-configs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search.toLowerCase());
      if (filters.executionLayer) params.append('executionLayer', filters.executionLayer.toLowerCase());
      if (filters.reconType) params.append('reconType', filters.reconType.toLowerCase());
      if (filters.status) params.append('status', filters.status);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/reconciliation-configs?${params}`, { headers });
      if (!response.ok) {
        // If unauthorized or no config, return empty array instead of error
        if (response.status === 401 || response.status === 404) {
          return [] as ReconciliationConfig[];
        }
        throw new Error('Failed to fetch reconciliation configs');
      }
      return (await response.json()) as ReconciliationConfig[];
    }
  });

  // Pagination
  const {
    currentData: reconciliations,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
  } = usePagination({
    data: allReconciliations,
    itemsPerPage: 10,
  });

  // Delete config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/reconciliation-configs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliation-configs'] });
      toast({
        title: 'Success',
        description: 'Reconciliation configuration deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete reconciliation configuration',
        variant: 'destructive'
      });
    }
  });

  const toggleConfig = (reconKey: number) => {
    const newOpenConfigs = new Set(openConfigs);
    if (newOpenConfigs.has(reconKey)) {
      newOpenConfigs.delete(reconKey);
    } else {
      newOpenConfigs.add(reconKey);
    }
    setOpenConfigs(newOpenConfigs);
  };

  const handleEdit = (config: ReconciliationConfig) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteConfigMutation.mutateAsync(id);
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingConfig(null);
  };

  const getStatusBadge = (status: string | null) => {
    const activeFlag = status === 'Y' ? 'Active' : status === 'N' ? 'Inactive' : 'Unknown';
    const variant = activeFlag === 'Active' ? 'default' : activeFlag === 'Inactive' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{activeFlag}</Badge>;
  };

  const getReconTypeBadge = (reconType: string) => {
    const lowerReconType = reconType.toLowerCase();
    const variants: Record<string, any> = {
      'count_check': 'default',
      'amount_check': 'secondary',
      'sum_check': 'outline',
      'data_check': 'destructive'
    };

    const displayNames: Record<string, string> = {
      'count_check': 'Count Check',
      'amount_check': 'Amount Check',
      'sum_check': 'Sum Check',
      'data_check': 'Data Check'
    };

    return (
      <Badge variant={variants[lowerReconType] || 'outline'}>
        {displayNames[lowerReconType] || reconType}
      </Badge>
    );
  };

  if (error) {
    // Don't show error screen - let it fall through to empty state
    console.error('Error fetching reconciliation configs:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="heading-reconciliation">
              Data Reconciliation Configuration
            </h1>
            <p className="text-gray-600">Manage your data reconciliation pipeline configurations</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/reconciliation-configs'] })}
              data-testid="button-refresh-configs"
            >
              Refresh
            </Button>
            <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-reconciliation">
              <Plus className="h-4 w-4" />Add Reconciliation Config
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by table name..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                  data-testid="input-search-reconciliation"
                />
              </div>

              <Select value={filters.executionLayer || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, executionLayer: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-execution-layer">
                  <SelectValue placeholder="Execution Layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.reconType || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, reconType: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-recon-type">
                  <SelectValue placeholder="Reconciliation Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="count_check">Count Check</SelectItem>
                  <SelectItem value="amount_check">Amount Check</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Y">Active</SelectItem>
                  <SelectItem value="N">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Config List */}
        <Card>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading reconciliation configurations...</p>
              </div>
            ) : allReconciliations.length === 0 ? (
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No reconciliation configurations found. Create your first reconciliation config.</p>
              </CardContent>
            ) : (
              <>
                {reconciliations.map((config) => (
                  <Card key={config.reconKey} className="overflow-hidden">
                    <Collapsible
                      open={openConfigs.has(config.reconKey)}
                      onOpenChange={() => toggleConfig(config.reconKey)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 text-left">
                              <CardTitle className="text-lg mb-2" data-testid={`text-config-name-${config.reconKey}`}>
                                {config.sourceTable && config.targetTable
                                  ? `${config.sourceTable} → ${config.targetTable}`
                                  : `Reconciliation ${config.reconKey}`
                                }
                              </CardTitle>
                              <CardDescription className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <Database className="h-3 w-3 mr-1" />
                                  {config.activeFlag === 'Y' ? 'Active' : 'Inactive'}
                                </span>
                                <span className="flex items-center">
                                  <Settings className="h-3 w-3 mr-1" />
                                  {config.reconType ? config.reconType.replace(/_/g, ' ') : 'N/A'}
                                </span>
                                {config.executionLayer && (
                                  <span className="flex items-center">
                                    <Target className="h-3 w-3 mr-1" />
                                    {config.executionLayer}
                                  </span>
                                )}
                                {config.thresholdPercentage !== null && (
                                  <span className="flex items-center">
                                    <BarChart3 className="h-3 w-3 mr-1" />
                                    Threshold: {config.thresholdPercentage}%
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(config);
                                }}
                                data-testid={`button-edit-${config.reconKey}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-delete-${config.reconKey}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Reconciliation Configuration</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this reconciliation configuration? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(config.reconKey)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {openConfigs.has(config.reconKey) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 border-t bg-gray-50 dark:bg-gray-900">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {/* Source Configuration */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <Database className="h-3 w-3 mr-1" />
                                Source Configuration
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Schema:</span> {config.sourceSchema || 'N/A'}</div>
                                <div><span className="font-medium">Table:</span> {config.sourceTable || 'N/A'}</div>
                                {config.sourceQuery && (
                                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
                                    <span className="font-medium">Query:</span>
                                    <pre className="mt-1 whitespace-pre-wrap">{config.sourceQuery}</pre>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Target Configuration */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <Target className="h-3 w-3 mr-1" />
                                Target Configuration
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Schema:</span> {config.targetSchema || 'N/A'}</div>
                                <div><span className="font-medium">Table:</span> {config.targetTable || 'N/A'}</div>
                                {config.targetQuery && (
                                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
                                    <span className="font-medium">Query:</span>
                                    <pre className="mt-1 whitespace-pre-wrap">{config.targetQuery}</pre>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Parameters */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <Settings className="h-3 w-3 mr-1" />
                                Parameters
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Type:</span> {getReconTypeBadge(config.reconType)}</div>
                                <div><span className="font-medium">Attribute:</span> {config.attribute || 'N/A'}</div>
                                <div><span className="font-medium">Threshold:</span> {config.thresholdPercentage !== null ? `${config.thresholdPercentage}%` : 'N/A'}</div>
                                <div><span className="font-medium">Config Key:</span> {config.configKey}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}

                {allReconciliations.length > 0 && (
                  <DataPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={10}
                    onPageChange={setCurrentPage}
                    canNextPage={canNextPage}
                    canPrevPage={canPrevPage}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        {/* Reconciliation Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit Reconciliation Configuration' : 'Create New Reconciliation Configuration'}
              </DialogTitle>
            </DialogHeader>
            <ReconciliationForm
              config={editingConfig}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}