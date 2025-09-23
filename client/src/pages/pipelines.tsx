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
import { Trash2, Edit, Plus, Search, Filter, ChevronDown, ChevronUp, Calendar, Database, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import { apiRequest } from '@/lib/queryClient';
import type { ConfigRecord, InsertConfigRecord, UpdateConfigRecord } from '@shared/schema';
import { PipelineForm } from '@/components/pipeline-form';
import PipelinesFilterPanel, { PipelineFilters as FilterPanelFilters } from '@/components/pipelines-filter-panel';

type PipelineFilters = FilterPanelFilters;

export function Pipelines() {
  const [filters, setFilters] = useState<PipelineFilters>({
    search: '',
    executionLayer: '',
    sourceSystem: '',
    status: ''
  });
  const [openPipelines, setOpenPipelines] = useState<Set<number>>(new Set());
  const [editingPipeline, setEditingPipeline] = useState<ConfigRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch pipelines
  const { data: allPipelines = [], isLoading, error } = useQuery({
    queryKey: ['/api/pipelines', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.executionLayer) params.append('executionLayer', filters.executionLayer);
      if (filters.sourceSystem) params.append('sourceSystem', filters.sourceSystem);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/pipelines?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pipelines');
      return response.json() as ConfigRecord[];
    }
  });

  // Pagination
  const {
    currentData: pipelines,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
  } = usePagination({
    data: allPipelines,
    itemsPerPage: 10,
  });

  // Delete pipeline mutation
  const deletePipelineMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/pipelines/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete pipeline');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pipelines'] });
      toast({
        title: 'Success',
        description: 'Pipeline deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete pipeline',
        variant: 'destructive'
      });
    }
  });

  const togglePipeline = (configKey: number) => {
    const newOpenPipelines = new Set(openPipelines);
    if (newOpenPipelines.has(configKey)) {
      newOpenPipelines.delete(configKey);
    } else {
      newOpenPipelines.add(configKey);
    }
    setOpenPipelines(newOpenPipelines);
  };

  const handleEdit = (pipeline: ConfigRecord) => {
    setEditingPipeline(pipeline);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deletePipelineMutation.mutateAsync(id);
  };

  const handleAddNew = () => {
    setEditingPipeline(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingPipeline(null);
  };

  const getStatusBadge = (status: string | null) => {
    const activeFlag = status === 'Y' ? 'Active' : status === 'N' ? 'Inactive' : 'Unknown';
    const variant = activeFlag === 'Active' ? 'default' : activeFlag === 'Inactive' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{activeFlag}</Badge>;
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500 font-semibold">Database Connection Error:</p>
          <p className="text-red-600 text-sm mt-2">
            {error instanceof Error ? error.message : 'Error loading pipelines. Please try again.'}
          </p>
          <div className="mt-4">
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/pipelines'] })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/pipelines'] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="heading-pipelines">Pipeline Configuration</h1>
                <p className="text-gray-600">Manage your data pipeline configurations</p>
              </div>
              <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-pipeline">
                <Plus className="h-4 w-4" />Add Pipeline
              </Button>
            </div>

      {/* Pipeline List */}
      <Card>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading pipelines...</p>
            </div>
          ) : allPipelines.length === 0 ? (
            <CardContent className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No pipelines found. Create your first pipeline configuration.</p>
            </CardContent>
          ) : (
            <>
              {pipelines.map((pipeline) => (
            <Card key={pipeline.configKey} className="overflow-hidden">
              <Collapsible
                open={openPipelines.has(pipeline.configKey)}
                onOpenChange={() => togglePipeline(pipeline.configKey)}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-left">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {pipeline.sourceTableName && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Table: {pipeline.sourceTableName}
                              </Badge>
                            )}
                            {pipeline.sourceSchemaName && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Schema: {pipeline.sourceSchemaName}
                              </Badge>
                            )}
                            {pipeline.targetTableName && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Target: {pipeline.targetTableName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(pipeline);
                          }}
                          data-testid={`button-edit-${pipeline.configKey}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-${pipeline.configKey}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this pipeline configuration? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(pipeline.configKey)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {openPipelines.has(pipeline.configKey) ? (
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
                        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Source Configuration</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Type:</span> {pipeline.sourceType || 'N/A'}</div>
                          <div><span className="font-medium">Schema:</span> {pipeline.sourceSchemaName || 'N/A'}</div>
                          <div><span className="font-medium">File Path:</span> {pipeline.sourceFilePath || 'N/A'}</div>
                          <div><span className="font-medium">File Name:</span> {pipeline.sourceFileName || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Target Configuration */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Target Configuration</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Type:</span> {pipeline.targetType || 'N/A'}</div>
                          <div><span className="font-medium">Schema:</span> {pipeline.targetSchemaName || 'N/A'}</div>
                          <div><span className="font-medium">Table:</span> {pipeline.targetTableName || 'N/A'}</div>
                          <div><span className="font-medium">Temp Table:</span> {pipeline.temporaryTargetTable || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Processing Configuration */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Processing</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Load Type:</span> {pipeline.loadType || 'N/A'}</div>
                          <div><span className="font-medium">Primary Key:</span> {pipeline.primaryKey || 'N/A'}</div>
                          <div><span className="font-medium">Execution Sequence:</span> {pipeline.executionSequence || 'N/A'}</div>
                          <div><span className="font-medium">Dynamic Schema:</span> {pipeline.enableDynamicSchema === 'Y' ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
          
          {allPipelines.length > 0 && (
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

      {/* Pipeline Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPipeline ? 'Edit Pipeline Configuration' : 'Create New Pipeline Configuration'}
            </DialogTitle>
          </DialogHeader>
          <PipelineForm
            pipeline={editingPipeline}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
          </div>

          {/* Right Sidebar - Filter Panel */}
          <div className="flex-shrink-0">
            <PipelinesFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}