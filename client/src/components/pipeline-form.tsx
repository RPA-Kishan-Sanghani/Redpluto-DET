import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertConfigSchema } from '@shared/schema';
import type { ConfigRecord, InsertConfigRecord } from '@shared/schema';
import { z } from 'zod';
import { Database, FileText, Settings, Target, Upload } from 'lucide-react';

type FormData = InsertConfigRecord;

interface PipelineFormProps {
  pipeline?: ConfigRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PipelineForm({ pipeline, onSuccess, onCancel }: PipelineFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(insertConfigSchema),
    defaultValues: {
      executionLayer: pipeline?.executionLayer || null,
      sourceSystem: pipeline?.sourceSystem || null,
      sourceType: pipeline?.sourceType || null,
      sourceFilePath: pipeline?.sourceFilePath || null,
      sourceFileName: pipeline?.sourceFileName || null,
      sourceFileDelimiter: pipeline?.sourceFileDelimiter || null,
      sourceSchemaName: pipeline?.sourceSchemaName || null,
      sourceTableName: pipeline?.sourceTableName || null,
      targetType: pipeline?.targetType || null,
      targetFilePath: pipeline?.targetFilePath || null,
      targetFileDelimiter: pipeline?.targetFileDelimiter || null,
      targetSchemaName: pipeline?.targetSchemaName || null,
      temporaryTargetTable: pipeline?.temporaryTargetTable || null,
      targetTableName: pipeline?.targetTableName || null,
      loadType: pipeline?.loadType || null,
      primaryKey: pipeline?.primaryKey || null,
      effectiveDateColumn: pipeline?.effectiveDateColumn || null,
      md5Columns: pipeline?.md5Columns || null,
      customCode: pipeline?.customCode || null,
      executionSequence: pipeline?.executionSequence || null,
      enableDynamicSchema: pipeline?.enableDynamicSchema || null,
      activeFlag: pipeline?.activeFlag || null,
      fullDataRefreshFlag: pipeline?.fullDataRefreshFlag || null,
    }
  });

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ['/api/metadata/execution_layer'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/execution_layer');
      return response.json() as string[];
    }
  });

  const { data: loadTypes = [] } = useQuery({
    queryKey: ['/api/metadata/load_type'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/load_type');
      return response.json() as string[];
    }
  });

  const { data: sourceSystems = [] } = useQuery({
    queryKey: ['/api/metadata/source_system'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/source_system');
      return response.json() as string[];
    }
  });

  const { data: sourceTypes = [] } = useQuery({
    queryKey: ['/api/metadata/source_type'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/source_type');
      return response.json() as string[];
    }
  });

  const { data: targetTypes = [] } = useQuery({
    queryKey: ['/api/metadata/target_type'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/target_type');
      return response.json() as string[];
    }
  });

  const { data: delimiters = [] } = useQuery({
    queryKey: ['/api/metadata/file_delimiter'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/file_delimiter');
      return response.json() as string[];
    }
  });

  const { data: executionSequences = [] } = useQuery({
    queryKey: ['/api/metadata/execution_sequence'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/execution_sequence');
      return response.json() as string[];
    }
  });

  // Create or update mutation
  const savePipelineMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = pipeline
        ? `/api/pipelines/${pipeline.configKey}`
        : '/api/pipelines';
      const method = pipeline ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save pipeline');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs'] });
      queryClient.invalidateQueries({ queryKey: ['all-pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
      toast({
        title: 'Success',
        description: `Pipeline ${pipeline ? 'updated' : 'created'} successfully`
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to ${pipeline ? 'update' : 'create'} pipeline`,
        variant: 'destructive'
      });
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await savePipelineMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="source" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="source" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Source Configuration */}
          <TabsContent value="source" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Configuration</CardTitle>
                <CardDescription>Configure the data source for this pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="executionLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Layer</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-execution-layer-form">
                              <SelectValue placeholder="Select execution layer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executionLayers.map((layer) => (
                              <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source System</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-system-form">
                              <SelectValue placeholder="Select source system" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceSystems.map((system) => (
                              <SelectItem key={system} value={system}>{system}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-type-form">
                              <SelectValue placeholder="Select source type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceSchemaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Schema Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter source schema name" {...field} data-testid="input-source-schema" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceTableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Table Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter source table name" {...field} data-testid="input-source-table" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceFilePath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source File Path</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter source file path" {...field} data-testid="input-source-path" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceFileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source File Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter source file name" {...field} data-testid="input-source-filename" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceFileDelimiter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source File Delimiter</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-delimiter">
                              <SelectValue placeholder="Select delimiter" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {delimiters.map((delimiter) => (
                              <SelectItem key={delimiter} value={delimiter}>
                                {delimiter === '\t' ? 'Tab' : delimiter === ',' ? 'Comma' : delimiter === ';' ? 'Semicolon' : delimiter === '|' ? 'Pipe' : delimiter}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Target Configuration */}
          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Configuration</CardTitle>
                <CardDescription>Configure the destination for processed data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-type">
                              <SelectValue placeholder="Select target type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetSchemaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Schema Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter target schema name" {...field} data-testid="input-target-schema" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetTableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Table Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter target table name" {...field} data-testid="input-target-table" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temporaryTargetTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporary Target Table</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter temporary table name" {...field} data-testid="input-temp-table" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetFilePath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target File Path</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter target file path" {...field} data-testid="input-target-path" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetFileDelimiter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target File Delimiter</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-delimiter">
                              <SelectValue placeholder="Select delimiter" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {delimiters.map((delimiter) => (
                              <SelectItem key={delimiter} value={delimiter}>
                                {delimiter === '\t' ? 'Tab' : delimiter === ',' ? 'Comma' : delimiter === ';' ? 'Semicolon' : delimiter === '|' ? 'Pipe' : delimiter}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Configuration */}
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Configuration</CardTitle>
                <CardDescription>Configure data processing and loading settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loadType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Load Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-load-type">
                              <SelectValue placeholder="Select load type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter primary key columns" {...field} data-testid="input-primary-key" />
                        </FormControl>
                        <FormDescription>Comma-separated list of primary key columns</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="effectiveDateColumn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Date Column</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter effective date column" {...field} data-testid="input-effective-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="md5Columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MD5 Columns</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter MD5 hash columns" {...field} data-testid="input-md5-columns" />
                        </FormControl>
                        <FormDescription>Columns used for change detection</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="executionSequence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Sequence</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-execution-sequence">
                              <SelectValue placeholder="Select execution sequence" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executionSequences.map((sequence) => (
                              <SelectItem key={sequence} value={sequence}>{sequence}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter custom processing code" {...field} data-testid="input-custom-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Advanced pipeline configuration options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="activeFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-active-flag">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Active</SelectItem>
                            <SelectItem value="N">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableDynamicSchema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dynamic Schema</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-dynamic-schema">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Enabled</SelectItem>
                            <SelectItem value="N">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullDataRefreshFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Data Refresh</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-full-refresh">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Enabled</SelectItem>
                            <SelectItem value="N">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-pipeline">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || savePipelineMutation.isPending}
            data-testid="button-save-pipeline"
          >
            {isLoading || savePipelineMutation.isPending
              ? 'Saving...'
              : pipeline
                ? 'Update Pipeline'
                : 'Create Pipeline'
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}