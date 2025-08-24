import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Edit, Plus, Search, Filter, ChevronDown, ChevronUp, Shield, Database, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import type { DataQualityConfig, InsertDataQualityConfig, UpdateDataQualityConfig } from '@shared/schema';
import { DataQualityForm } from '@/components/data-quality-form';
import Header from '@/components/header';

interface DataQualityFilters {
  search: string;
  executionLayer: string;
  validationType: string;
  status: string;
}

export function DataQuality() {
  const [filters, setFilters] = useState<DataQualityFilters>({
    search: '',
    executionLayer: '',
    validationType: '',
    status: ''
  });
  const [openConfigs, setOpenConfigs] = useState<Set<number>>(new Set());
  const [editingConfig, setEditingConfig] = useState<DataQualityConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data quality configurations
  const { data: allConfigurations = [], isLoading, error } = useQuery({
    queryKey: ['/api/data-quality-configs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.executionLayer) params.append('executionLayer', filters.executionLayer);
      if (filters.validationType) params.append('validationType', filters.validationType);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/data-quality-configs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data quality configs');
      return (await response.json()) as DataQualityConfig[];
    }
  });

  // Pagination
  const {
    currentData: configurations,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
  } = usePagination({
    data: allConfigurations,
    itemsPerPage: 10,
  });

  // Delete config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/data-quality-configs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-quality-configs'] });
      toast({
        title: 'Success',
        description: 'Data quality configuration deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete data quality configuration',
        variant: 'destructive'
      });
    }
  });

  const toggleConfig = (dataQualityKey: number) => {
    const newOpenConfigs = new Set(openConfigs);
    if (newOpenConfigs.has(dataQualityKey)) {
      newOpenConfigs.delete(dataQualityKey);
    } else {
      newOpenConfigs.add(dataQualityKey);
    }
    setOpenConfigs(newOpenConfigs);
  };

  const handleEdit = (config: DataQualityConfig) => {
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

  const getValidationTypeBadge = (validationType: string) => {
    const variants: Record<string, any> = {
      'NOT_NULL': 'default',
      'RANGE_CHECK': 'secondary',
      'FORMAT_CHECK': 'outline',
      'CUSTOM': 'destructive'
    };

    return (
      <Badge variant={variants[validationType] || 'outline'}>
        {validationType.replace('_', ' ')}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500">Error loading data quality configurations. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="heading-data-quality">
            Data Quality Configuration
          </h1>
          <p className="text-gray-600">Manage your data quality validation rules and thresholds</p>
        </div>

        <div className="flex justify-end mb-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-quality-configs'] })}
              data-testid="button-refresh-configs"
            >
              Refresh
            </Button>
            <Button onClick={handleAddNew} data-testid="button-add-data-quality">
              <Plus className="h-4 w-4 mr-2" />
              Add Quality Config
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
                  data-testid="input-search-data-quality"
                />
              </div>

              <Select value={filters.executionLayer || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, executionLayer: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-execution-layer">
                  <SelectValue placeholder="Execution Layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.validationType || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, validationType: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-validation-type">
                  <SelectValue placeholder="Validation Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="NOT_NULL">Not Null</SelectItem>
                  <SelectItem value="RANGE_CHECK">Range Check</SelectItem>
                  <SelectItem value="FORMAT_CHECK">Format Check</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
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

        {/* Configurations List */}
        <Card>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading data quality configurations...</p>
              </div>
            ) : allConfigurations.length === 0 ? (
              <CardContent className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No data quality configurations found. Create your first quality rule.</p>
              </CardContent>
            ) : (
              <>
                {configurations.map((config) => (
                  <Card key={config.dataQualityKey} className="overflow-hidden">
                    <Collapsible
                      open={openConfigs.has(config.dataQualityKey)}
                      onOpenChange={() => toggleConfig(config.dataQualityKey)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-left">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <CardTitle className="text-lg" data-testid={`text-config-name-${config.dataQualityKey}`}>
                                    {config.tableName}.{config.attributeName}
                                  </CardTitle>
                                  {getStatusBadge(config.activeFlag)}
                                  {getValidationTypeBadge(config.validationType)}
                                  {config.executionLayer && (
                                    <Badge variant="outline" className="capitalize">
                                      {config.executionLayer}
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="flex items-center space-x-4 mt-1">
                                  <span className="flex items-center">
                                    <Database className="h-3 w-3 mr-1" />
                                    Config: {config.configKey}
                                  </span>
                                  {config.thresholdPercentage && (
                                    <span className="flex items-center">
                                      <BarChart3 className="h-3 w-3 mr-1" />
                                      Threshold: {config.thresholdPercentage}%
                                    </span>
                                  )}
                                  {config.defaultValue && (
                                    <span className="flex items-center">
                                      <Settings className="h-3 w-3 mr-1" />
                                      Default: {config.defaultValue}
                                    </span>
                                  )}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(config);
                                }}
                                data-testid={`button-edit-${config.dataQualityKey}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-delete-${config.dataQualityKey}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Data Quality Configuration</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this data quality configuration? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(config.dataQualityKey)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {openConfigs.has(config.dataQualityKey) ? (
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
                            {/* Basic Information */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <Database className="h-3 w-3 mr-1" />
                                Basic Information
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Table:</span> {config.tableName}</div>
                                <div><span className="font-medium">Attribute:</span> {config.attributeName}</div>
                                <div><span className="font-medium">Validation:</span> {config.validationType}</div>
                                <div><span className="font-medium">Default Value:</span> {config.defaultValue || 'N/A'}</div>
                              </div>
                            </div>

                            {/* Quality Settings */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <Shield className="h-3 w-3 mr-1" />
                                Quality Settings
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Threshold:</span> {config.thresholdPercentage !== null ? `${config.thresholdPercentage}%` : 'N/A'}</div>
                                <div><span className="font-medium">Error Transfer:</span> {config.errorTableTransferFlag === 'Y' ? 'Enabled' : 'Disabled'}</div>
                                <div><span className="font-medium">Status:</span> {config.activeFlag === 'Y' ? 'Active' : 'Inactive'}</div>
                              </div>
                            </div>

                            {/* Custom Query */}
                            {config.customQuery && (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                  <Settings className="h-3 w-3 mr-1" />
                                  Custom Query
                                </h4>
                                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
                                  <pre className="whitespace-pre-wrap">{config.customQuery}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}

                {allConfigurations.length > 0 && (
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

        {/* Data Quality Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit Data Quality Configuration' : 'Create New Data Quality Configuration'}
              </DialogTitle>
            </DialogHeader>
            <DataQualityForm
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