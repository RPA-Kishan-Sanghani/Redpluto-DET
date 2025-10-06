import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertConfigSchema } from '@shared/schema';
import type { ConfigRecord, InsertConfigRecord } from '@shared/schema';
import { z } from 'zod';
import { Database, FileText, Settings, Target, Upload, X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      executionLayer: pipeline?.executionLayer ? 
        pipeline.executionLayer.charAt(0).toUpperCase() + pipeline.executionLayer.slice(1).toLowerCase() : 
        undefined,
      sourceSystem: pipeline?.sourceSystem || undefined,
      connectionId: pipeline?.connectionId || undefined,
      sourceType: pipeline?.sourceType ? 
        pipeline.sourceType.charAt(0).toUpperCase() + pipeline.sourceType.slice(1).toLowerCase() : 
        undefined,
      sourceFilePath: pipeline?.sourceFilePath || undefined,
      sourceFileName: pipeline?.sourceFileName || undefined,
      sourceFileDelimiter: pipeline?.sourceFileDelimiter || undefined,
      sourceSchemaName: pipeline?.sourceSchemaName || undefined,
      sourceTableName: pipeline?.sourceTableName || undefined,
      targetLayer: pipeline?.targetLayer || undefined,
      targetSystem: pipeline?.targetSystem || undefined,
      targetConnectionId: pipeline?.targetConnectionId || undefined,
      targetType: pipeline?.targetType ? 
        pipeline.targetType.charAt(0).toUpperCase() + pipeline.targetType.slice(1).toLowerCase() : 
        undefined,
      targetFilePath: pipeline?.targetFilePath || undefined,
      targetFileDelimiter: pipeline?.targetFileDelimiter || undefined,
      targetSchemaName: pipeline?.targetSchemaName || undefined,
      temporaryTargetTable: pipeline?.temporaryTargetTable || undefined,
      targetTableName: pipeline?.targetTableName || undefined,
      loadType: pipeline?.loadType ? 
        (pipeline.loadType === 'truncate_load' ? 'Truncate' : 
         pipeline.loadType === 'incremental_load' ? 'Incremental' : 
         pipeline.loadType) : 
        undefined,
      primaryKey: pipeline?.primaryKey || undefined,
      effectiveDateColumn: pipeline?.effectiveDateColumn || undefined,
      md5Columns: pipeline?.md5Columns || undefined,
      customCode: pipeline?.customCode || undefined,
      executionSequence: pipeline?.executionSequence || undefined,
      // Advanced settings with default values for new entries
      enableDynamicSchema: pipeline?.enableDynamicSchema || 'N',
      activeFlag: pipeline?.activeFlag || 'Y',
      fullDataRefreshFlag: pipeline?.fullDataRefreshFlag || 'Y',
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

  // Watch form values for dynamic dropdowns
  const selectedSourceSystem = form.watch('sourceSystem');
  const selectedConnectionId = form.watch('connectionId');
  const selectedSchema = form.watch('sourceSchemaName');
  const selectedSourceType = form.watch('sourceType');
  const selectedTargetType = form.watch('targetType');
  const selectedLoadType = form.watch('loadType');
  const selectedExecutionLayer = form.watch('executionLayer');

  // Watch target configuration values for dynamic dropdowns
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');
  const selectedTargetSchema = form.watch('targetSchemaName');

  // Fetch connections filtered by source system
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections', { sourceSystem: selectedSourceSystem }],
    queryFn: async () => {
      if (!selectedSourceSystem) return [];
      const response = await fetch(`/api/connections`);
      const allConnections = await response.json() as Array<{ connectionId: number; connectionName: string; connectionType: string; status: string }>;

      // Filter connections by matching connection type with selected source system
      return allConnections.filter(conn => 
        conn.connectionType.toLowerCase() === selectedSourceSystem.toLowerCase() ||
        (selectedSourceSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
        (selectedSourceSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
        (selectedSourceSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
        (selectedSourceSystem === 'Oracle' && conn.connectionType === 'Oracle') ||
        (selectedSourceSystem === 'Snowflake' && conn.connectionType === 'Snowflake') ||
        (selectedSourceSystem === 'MongoDB' && conn.connectionType === 'MongoDB') ||
        (selectedSourceSystem === 'BigQuery' && conn.connectionType === 'GCP') ||
        (selectedSourceSystem === 'Salesforce' && conn.connectionType === 'API')
      );
    },
    enabled: !!selectedSourceSystem
  });

  // Fetch schemas for selected connection
  const { data: schemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedConnectionId}/schemas`);
      return response.json() as string[];
    },
    enabled: !!selectedConnectionId
  });

  // Fetch tables for selected connection and schema
  const { data: tables = [] } = useQuery({
    queryKey: ['/api/connections', selectedConnectionId, 'schemas', selectedSchema, 'tables'],
    queryFn: async () => {
      if (!selectedConnectionId || !selectedSchema) return [];
      const response = await fetch(`/api/connections/${selectedConnectionId}/schemas/${selectedSchema}/tables`);
      return response.json() as string[];
    },
    enabled: !!selectedConnectionId && !!selectedSchema
  });

  // Target configuration queries
  // Fetch target connections filtered by target system
  const { data: targetConnections = [] } = useQuery({
    queryKey: ['/api/connections', { targetSystem: selectedTargetSystem }],
    queryFn: async () => {
      if (!selectedTargetSystem) return [];
      const response = await fetch(`/api/connections`);
      const allConnections = await response.json() as Array<{ connectionId: number; connectionName: string; connectionType: string; status: string }>;

      // Filter connections by matching connection type with selected target system
      return allConnections.filter(conn => 
        conn.connectionType.toLowerCase() === selectedTargetSystem.toLowerCase() ||
        (selectedTargetSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
        (selectedTargetSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
        (selectedTargetSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
        (selectedTargetSystem === 'Oracle' && conn.connectionType === 'Oracle') ||
        (selectedTargetSystem === 'Snowflake' && conn.connectionType === 'Snowflake') ||
        (selectedTargetSystem === 'MongoDB' && conn.connectionType === 'MongoDB') ||
        (selectedTargetSystem === 'BigQuery' && conn.connectionType === 'GCP') ||
        (selectedTargetSystem === 'Salesforce' && conn.connectionType === 'API')
      );
    },
    enabled: !!selectedTargetSystem
  });

  // Fetch target schemas for selected target connection
  const { data: targetSchemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedTargetConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas`);
      return response.json() as string[];
    },
    enabled: !!selectedTargetConnectionId
  });

  // Fetch target tables for selected target connection and schema
  const { data: targetTables = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas', selectedTargetSchema, 'tables'],
    queryFn: async () => {
      if (!selectedTargetConnectionId || !selectedTargetSchema) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables`);
      return response.json() as string[];
    },
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema
  });

  // Watch target table for columns
  const selectedTargetTable = form.watch('targetTableName');

  // Fetch columns for selected target table
  const { data: targetColumns = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas', selectedTargetSchema, 'tables', selectedTargetTable, 'columns'],
    queryFn: async () => {
      if (!selectedTargetConnectionId || !selectedTargetSchema || !selectedTargetTable) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables/${selectedTargetTable}/columns`);
      return response.json() as string[];
    },
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema && !!selectedTargetTable
  });

  // Fetch date/datetime columns for effective date column dropdown
  const { data: dateTimeColumns = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas', selectedTargetSchema, 'tables', selectedTargetTable, 'datetime-columns'],
    queryFn: async () => {
      if (!selectedTargetConnectionId || !selectedTargetSchema || !selectedTargetTable) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables/${selectedTargetTable}/columns-with-types?dataTypes=date,datetime,timestamp`);
      return response.json() as Array<{ columnName: string; dataType: string }>;
    },
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema && !!selectedTargetTable
  });

  // Filter load types based on execution layer
  const getFilteredLoadTypes = () => {
    if (selectedExecutionLayer === 'Bronze') {
      return loadTypes.filter(type => type === 'Incremental' || type === 'Truncate');
    }
    return loadTypes;
  };

  const filteredLoadTypes = getFilteredLoadTypes();

  // Effect to reset load type when execution layer changes
  useEffect(() => {
    if (selectedExecutionLayer === 'Bronze') {
      const currentLoadType = form.getValues('loadType');
      if (currentLoadType && currentLoadType !== 'Incremental' && currentLoadType !== 'Truncate') {
        form.setValue('loadType', '');
      }
    }
  }, [selectedExecutionLayer, form]);

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
      // Convert execution layer, source type, target type, and load type before saving
      let processedLoadType = data.loadType;
      if (data.loadType && (data.loadType === 'Truncate' || data.loadType === 'Incremental')) {
        processedLoadType = `${data.loadType.toLowerCase()}_load`;
      }

      const processedData = {
        ...data,
        executionLayer: data.executionLayer?.toLowerCase(),
        sourceSystem: data.sourceSystem?.toLowerCase(),
        sourceType: data.sourceType?.toLowerCase(),
        targetSystem: data.targetSystem?.toLowerCase(),
        targetType: data.targetType?.toLowerCase(),
        loadType: processedLoadType
      };
      await savePipelineMutation.mutateAsync(processedData);
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="executionLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Execution Layer
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Processing layer where the pipeline runs (Bronze, Silver, or Gold).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
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
                        <FormLabel className="flex items-center gap-2">
                          Source System
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Type of source system (e.g., MySQL, Parquet, Excel, CSV, JSON).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
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
                    name="connectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Database Connection
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select the database connection for the source system.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value ? parseInt(value) : undefined);
                            // Reset schema and table when connection changes
                            form.setValue('sourceSchemaName', undefined);
                            form.setValue('sourceTableName', undefined);
                          }} 
                          value={field.value?.toString() || ''}
                          disabled={!selectedSourceSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-connection">
                              <SelectValue placeholder={selectedSourceSystem ? "Select connection" : "Select source system first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {connections.map((connection) => (
                              <SelectItem key={connection.connectionId} value={connection.connectionId.toString()}>
                                {connection.connectionName} ({connection.connectionType})
                              </SelectItem>
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
                        <FormLabel className="flex items-center gap-2">
                          Source Type
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Defines whether the source is a database table or a file.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
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

                  {/* Show schema and table fields only when source type is Table */}
                  {selectedSourceType === 'Table' && (
                    <>
                      <FormField
                        control={form.control}
                        name="sourceSchemaName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Source Schema Name
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Schema name of the source database (for RDBMS).</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value || undefined);
                                // Reset table when schema changes
                                form.setValue('sourceTableName', undefined);
                              }} 
                              value={field.value || ''}
                              disabled={!selectedConnectionId}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-source-schema">
                                  <SelectValue placeholder={selectedConnectionId ? "Select schema" : "Select connection first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {schemas.map((schema) => (
                                  <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sourceTableName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Source Table Name
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Table name in the source database.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(value || undefined)} 
                              value={field.value || ''}
                              disabled={!selectedConnectionId || !selectedSchema}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-source-table">
                                  <SelectValue placeholder={selectedConnectionId && selectedSchema ? "Select table" : "Select schema first"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tables.map((table) => (
                                  <SelectItem key={table} value={table}>{table}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Show file fields only when source type is File */}
                  {selectedSourceType === 'File' && (
                    <>
                      <FormField
                        control={form.control}
                        name="sourceFilePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Source File Path
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Path/location of source files (for file-based sources only).</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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
                            <FormLabel className="flex items-center gap-2">
                              Source File Name
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>File name or naming pattern for ingestion.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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
                            <FormLabel className="flex items-center gap-2">
                              Source File Delimiter
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Character used to separate values in files.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Target Configuration */}
          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target System
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Type of target system (e.g., MySQL, Parquet, Excel, CSV, JSON).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-system">
                              <SelectValue placeholder="Select target system" />
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
                    name="targetConnectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target Database Connection
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select the database connection for the target system.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))} 
                          defaultValue={field.value?.toString() || ''}
                          disabled={!selectedTargetSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-connection">
                              <SelectValue placeholder="Select target connection" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetConnections.map((connection) => (
                              <SelectItem key={connection.connectionId} value={connection.connectionId.toString()}>
                                {connection.connectionName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target Type
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Defines whether the target is a database table or a file.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
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

                  {/* Show schema and table fields only when target type is Table */}
                  {selectedTargetType === 'Table' && (
                    <>
                      <FormField
                        control={form.control}
                        name="targetSchemaName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Target Schema
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Schema name of the target database.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value || ''}
                              disabled={!selectedTargetConnectionId}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-target-schema">
                                  <SelectValue placeholder="Select target schema" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {targetSchemas.map((schema) => (
                                  <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetTableName"
                        render={({ field }) => {
                          const [showAddNewTable, setShowAddNewTable] = useState(false);
                          const [newTableName, setNewTableName] = useState("");

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Target Table
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Final target table name after processing.</p>
                                    </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                              {showAddNewTable ? (
                                <div className="flex space-x-2">
                                  <FormControl>
                                    <Input
                                      value={newTableName}
                                      onChange={(e) => setNewTableName(e.target.value)}
                                      placeholder="Enter new table name"
                                      data-testid="input-new-target-table"
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (newTableName.trim()) {
                                        field.onChange(newTableName.trim());
                                        // Clear primary key when target table changes
                                        form.setValue('primaryKey', '');
                                        setShowAddNewTable(false);
                                        setNewTableName("");
                                      }
                                    }}
                                    data-testid="button-save-target-table"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowAddNewTable(false);
                                      setNewTableName("");
                                    }}
                                    data-testid="button-cancel-target-table"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value || '');
                                      // Clear primary key when target table changes
                                      form.setValue('primaryKey', '');
                                    }} 
                                    defaultValue={field.value || ''}
                                    disabled={!selectedTargetConnectionId || !selectedTargetSchema}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-target-table" className="flex-1">
                                        <SelectValue placeholder="Select target table" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {targetTables.map((table) => (
                                        <SelectItem key={table} value={table}>{table}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddNewTable(true)}
                                    disabled={!selectedTargetConnectionId || !selectedTargetSchema}
                                    data-testid="button-add-target-table"
                                  >
                                    Add New
                                  </Button>
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="primaryKey"
                        render={({ field }) => {
                          // Only split if field.value exists and is not empty
                          const selectedColumns = field.value && field.value.trim() ? field.value.split(',').filter(Boolean) : [];

                          const handleColumnToggle = (column: string) => {
                            const currentColumns = field.value && field.value.trim() ? field.value.split(',').filter(Boolean) : [];
                            if (currentColumns.includes(column)) {
                              const newColumns = currentColumns.filter(col => col !== column);
                              field.onChange(newColumns.length > 0 ? newColumns.join(',') : '');
                            } else {
                              const newColumns = [...currentColumns, column];
                              field.onChange(newColumns.join(','));
                            }
                          };

                          const removeColumn = (column: string) => {
                            const currentColumns = field.value && field.value.trim() ? field.value.split(',').filter(Boolean) : [];
                            const newColumns = currentColumns.filter(col => col !== column);
                            field.onChange(newColumns.length > 0 ? newColumns.join(',') : '');
                          };

                          return (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Primary Key
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>One or multiple comma-separated columns used as primary key.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  {/* Selected columns display */}
                                  {selectedColumns.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                                      {selectedColumns.map((column) => (
                                        <div key={column} className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
                                          <span>{column}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-primary-foreground/20"
                                            onClick={() => removeColumn(column)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Column selection dropdown */}
                                  <Select onValueChange={handleColumnToggle} disabled={!selectedTargetTable || targetColumns.length === 0}>
                                    <SelectTrigger data-testid="select-primary-key">
                                      <SelectValue placeholder={
                                        !selectedTargetTable 
                                          ? "Select a target table first" 
                                          : targetColumns.length === 0 
                                            ? "Loading columns..." 
                                            : "Select columns for primary key"
                                      } />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {targetColumns.map((column) => (
                                        <SelectItem key={column} value={column}>
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={selectedColumns.includes(column)}
                                              readOnly
                                            />
                                            <span>{column}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </FormControl>
                              <FormDescription>Select one or more columns that form the primary key</FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </>
                  )}

                  {/* Show file fields only when target type is File */}
                  {selectedTargetType === 'File' && (
                    <>
                      <FormField
                        control={form.control}
                        name="targetFilePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Target File Path
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Path where output files will be stored.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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
                            <FormLabel className="flex items-center gap-2">
                              Target File Delimiter
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Character to separate values in target files.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Configuration */}
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="loadType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Load Type
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Type of load.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear load type if it's not in the filtered list
                            if (selectedExecutionLayer === 'Bronze' && value !== 'Incremental' && value !== 'Truncate') {
                              field.onChange('');
                            }
                          }} 
                          defaultValue={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-load-type">
                              <SelectValue placeholder="Select load type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredLoadTypes.map((type) => (
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
                    name="effectiveDateColumn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Effective Date Column
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Date column used for incremental load tracking.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                          disabled={!selectedTargetTable || dateTimeColumns.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-effective-date-column">
                              <SelectValue placeholder={
                                !selectedTargetTable 
                                  ? "Select a target table first" 
                                  : dateTimeColumns.length === 0 
                                    ? "No date/datetime columns found" 
                                    : "Select effective date column"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dateTimeColumns.map((column) => (
                              <SelectItem key={column.columnName} value={column.columnName}>
                                <div className="flex flex-col">
                                  <span>{column.columnName}</span>
                                  <span className="text-xs text-muted-foreground">{column.dataType}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedLoadType === 'SCD2' && (
                    <FormField
                      control={form.control}
                      name="md5Columns"
                      render={({ field }) => {
                        const currentValue = field.value || '';
                        const selectedColumns = currentValue ? currentValue.split(',').filter(Boolean) : [];
                        const enableDynamicSchema = form.watch('enableDynamicSchema');

                        // Auto-select all columns when target table is selected and no previous selection exists
                        React.useEffect(() => {
                          if (targetColumns.length > 0 && !currentValue) {
                            field.onChange(targetColumns.join(','));
                          }
                        }, [targetColumns, currentValue, field]);

                        // Dynamic schema adjustment: sync MD5 columns with target table columns
                        React.useEffect(() => {
                          if (enableDynamicSchema === 'Y' && targetColumns.length > 0 && selectedColumns.length > 0) {
                            // Get columns that exist in both selected and target columns
                            const validColumns = selectedColumns.filter(col => targetColumns.includes(col));

                            // Get new columns that are in target but not in selected
                            const newColumns = targetColumns.filter(col => !selectedColumns.includes(col));

                            // If there are changes (removed or added columns), update the field
                            if (validColumns.length !== selectedColumns.length || newColumns.length > 0) {
                              const updatedColumns = [...validColumns, ...newColumns];
                              field.onChange(updatedColumns.join(','));

                              // Show toast notification about the automatic adjustment
                              if (validColumns.length !== selectedColumns.length || newColumns.length > 0) {
                                toast({
                                  title: 'MD5 Columns Auto-Adjusted',
                                  description: `Columns automatically synced with target table. ${newColumns.length > 0 ? `Added: ${newColumns.join(', ')}` : ''} ${validColumns.length !== selectedColumns.length ? `Removed invalid columns.` : ''}`,
                                  duration: 5000,
                                });
                              }
                            }
                          }
                        }, [targetColumns, selectedColumns, enableDynamicSchema, field, toast]);

                        const handleSelectAll = () => {
                          field.onChange(targetColumns.join(','));
                        };

                        const handleSelectNone = () => {
                          field.onChange('');
                        };

                        const handleColumnToggle = (column: string) => {
                          const currentColumns = selectedColumns;
                          if (currentColumns.includes(column)) {
                            const newColumns = currentColumns.filter(col => col !== column);
                            field.onChange(newColumns.length > 0 ? newColumns.join(',') : '');
                          } else {
                            const newColumns = [...currentColumns, column];
                            field.onChange(newColumns.join(','));
                          }
                        };

                        const allSelected = targetColumns.length > 0 && selectedColumns.length === targetColumns.length;
                        const noneSelected = selectedColumns.length === 0;

                        return (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              MD5 Columns
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Columns included in checksum (MD5) to detect changes.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                {/* Quick selection options */}
                                <div className="flex space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="md5-all"
                                      name="md5-quick-select"
                                      checked={allSelected}
                                      onChange={handleSelectAll}
                                      disabled={!selectedTargetTable || targetColumns.length === 0}
                                      className="h-4 w-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary"
                                    />
                                    <label htmlFor="md5-all" className="text-sm font-medium">
                                      Select All
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="md5-none"
                                      name="md5-quick-select"
                                      checked={noneSelected}
                                      onChange={handleSelectNone}
                                      disabled={!selectedTargetTable || targetColumns.length === 0}
                                      className="h-4 w-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary"
                                    />
                                    <label htmlFor="md5-none" className="text-sm font-medium">
                                      Select None
                                    </label>
                                  </div>
                                </div>

                                {/* Dropdown with individual column checkboxes */}
                                <div className="relative">
                                  <Select disabled={!selectedTargetTable || targetColumns.length === 0}>
                                    <SelectTrigger data-testid="select-md5-columns">
                                      <SelectValue placeholder={
                                        !selectedTargetTable 
                                          ? "Select a target table first" 
                                          : targetColumns.length === 0 
                                            ? "Loading columns..." 
                                            : `${selectedColumns.length} of ${targetColumns.length} columns selected`
                                      } />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {targetColumns.map((column) => (
                                        <div
                                          key={column}
                                          className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent"
                                          onClick={() => handleColumnToggle(column)}
                                        >
                                          <Checkbox
                                            checked={selectedColumns.includes(column)}
                                            readOnly
                                          />
                                          <span className="text-sm">{column}</span>
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Display selected columns */}
                                {selectedColumns.length > 0 && (
                                  <div className="p-3 border rounded-md bg-muted/50">
                                    <div className="text-sm font-medium mb-2">Selected Columns ({selectedColumns.length}):</div>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedColumns.map((column) => (
                                        <div
                                          key={column}
                                          className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-sm"
                                        >
                                          <span>{column}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-primary-foreground/20"
                                            onClick={() => handleColumnToggle(column)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Status message */}
                                <div className="text-sm text-muted-foreground">
                                  {!selectedTargetTable 
                                    ? "Select a target table first" 
                                    : targetColumns.length === 0 
                                      ? "Loading columns..." 
                                      : `${selectedColumns.length} of ${targetColumns.length} columns selected for change detection`
                                  }
                                  {enableDynamicSchema === 'Y' && selectedTargetTable && (
                                    <div className="mt-1 text-blue-600 text-xs font-medium">
                                      🔄 Dynamic Schema Enabled - MD5 columns will auto-adjust when target table structure changes
                                    </div>
                                  )}
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>Select columns to include in MD5 hash for change detection</FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {(selectedLoadType === 'SCD1' || selectedLoadType === 'SCD2') && (
                    <FormField
                      control={form.control}
                      name="executionSequence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Execution Sequence
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>When to run custom code (before or after SCD logic)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
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
                  )}

                  {selectedLoadType === 'SCD2' && (
                    <FormField
                      control={form.control}
                      name="temporaryTargetTable"
                      render={({ field }) => {
                        const [showAddNewTempTable, setShowAddNewTempTable] = useState(false);
                        const [newTempTableName, setNewTempTableName] = useState("");

                        // Fetch existing temporary tables
                        const { data: existingTempTables = [] } = useQuery({
                          queryKey: ['/api/temporary-tables'],
                          queryFn: async () => {
                            const response = await fetch('/api/temporary-tables');
                            return response.json() as string[];
                          }
                        });

                        return (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Temporary Target Table
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Temporary staging table (used in SCD2 processing).</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            {showAddNewTempTable ? (
                              <div className="flex space-x-2">
                                <FormControl>
                                  <Input
                                    value={newTempTableName}
                                    onChange={(e) => setNewTempTableName(e.target.value)}
                                    placeholder="Enter new temporary table name"
                                    data-testid="input-new-temp-table"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (newTempTableName.trim()) {
                                      field.onChange(newTempTableName.trim());
                                      setShowAddNewTempTable(false);
                                      setNewTempTableName("");
                                    }
                                  }}
                                  data-testid="button-save-temp-table"
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddNewTempTable(false);
                                    setNewTempTableName("");
                                  }}
                                  data-testid="button-cancel-temp-table"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value || ''}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-temp-table" className="flex-1">
                                      <SelectValue placeholder="Select existing temporary table" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {existingTempTables.map((table) => (
                                      <SelectItem key={table} value={table}>{table}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAddNewTempTable(true)}
                                  data-testid="button-add-temp-table"
                                >
                                  Add New
                                </Button>
                              </div>
                            )}
                            <FormDescription>
                              Select an existing temporary table or create a new one for SCD2 processing
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {(selectedLoadType === 'SCD1' || selectedLoadType === 'SCD2') && (
                    <FormField
                      control={form.control}
                      name="customCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Custom Code
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>.py file only</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Enter custom processing code" {...field} data-testid="input-custom-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="activeFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Active Status
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Whether this config is active (Y = load, N = skip).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-active-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Y</SelectItem>
                            <SelectItem value="N">N</SelectItem>
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
                        <FormLabel className="flex items-center gap-2">
                          Dynamic Schema
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Flag for schema evolution (Y = allow, N = stop on change).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-dynamic-schema">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Y</SelectItem>
                            <SelectItem value="N">N</SelectItem>
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
                        <FormLabel className="flex items-center gap-2">
                          Full Data Refresh
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>For Silver layer: whether to fully reload target table data.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-full-refresh">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Y</SelectItem>
                            <SelectItem value="N">N</SelectItem>
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
            className="bg-blue-600 hover:bg-blue-700"
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