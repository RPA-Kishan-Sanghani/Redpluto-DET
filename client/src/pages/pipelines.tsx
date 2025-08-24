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
import { apiRequest } from '@/lib/queryClient';
import type { ConfigRecord, InsertConfigRecord, UpdateConfigRecord } from '@shared/schema';
import { PipelineForm } from '@/components/pipeline-form';

interface PipelineFilters {
  search: string;
  executionLayer: string;
  sourceSystem: string;
  status: string;
}

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
  const { data: pipelines = [], isLoading, error } = useQuery({
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
          <p className="text-red-500">Error loading pipelines. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="heading-pipelines">Pipeline Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your data pipeline configurations</p>
        </div>
        <Button onClick={handleAddNew} data-testid="button-add-pipeline">
          <Plus className="h-4 w-4 mr-2" />
          Add Pipeline
        </Button>
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
                data-testid="input-search-pipelines"
              />
            </div>
            
            <Select value={filters.executionLayer} onValueChange={(value) => setFilters(prev => ({ ...prev, executionLayer: value }))}>
              <SelectTrigger data-testid="select-execution-layer">
                <SelectValue placeholder="Execution Layer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Layers</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sourceSystem} onValueChange={(value) => setFilters(prev => ({ ...prev, sourceSystem: value }))}>
              <SelectTrigger data-testid="select-source-system">
                <SelectValue placeholder="Source System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Systems</SelectItem>
                <SelectItem value="MySQL">MySQL</SelectItem>
                <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                <SelectItem value="SQL Server">SQL Server</SelectItem>
                <SelectItem value="Oracle">Oracle</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="JSON">JSON</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="Y">Active</SelectItem>
                <SelectItem value="N">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading pipelines...</p>
          </div>
        ) : pipelines.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No pipelines found. Create your first pipeline configuration.</p>
            </CardContent>
          </Card>
        ) : (
          pipelines.map((pipeline) => (
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
                            <CardTitle className="text-lg" data-testid={`text-pipeline-name-${pipeline.configKey}`}>
                              {pipeline.sourceTableName || `Pipeline ${pipeline.configKey}`}
                            </CardTitle>
                            {getStatusBadge(pipeline.activeFlag)}
                            {pipeline.executionLayer && (
                              <Badge variant="outline" className="capitalize">
                                {pipeline.executionLayer}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center space-x-4 mt-1">
                            <span className="flex items-center">
                              <Database className="h-3 w-3 mr-1" />
                              {pipeline.sourceSystem || 'Unknown'}
                            </span>
                            <span className="flex items-center">
                              <Settings className="h-3 w-3 mr-1" />
                              {pipeline.loadType || 'N/A'}
                            </span>
                            {pipeline.createdAt && (
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(pipeline.createdAt).toLocaleDateString()}
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
          ))
        )}
      </div>

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
  );
}