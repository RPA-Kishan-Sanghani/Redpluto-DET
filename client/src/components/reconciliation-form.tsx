import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  ReconciliationConfig,
  InsertReconciliationConfig,
} from "@shared/schema";
import {
  Database,
  Target,
  Settings,
  Info,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Form validation schema
const reconciliationFormSchema = z.object({
  configKey: z.number().optional(),
  executionLayer: z.string().min(1, "Execution Layer is required"),
  sourceSystem: z.string().optional(),
  sourceConnectionId: z.number().optional(),
  sourceType: z.string().optional(),
  sourceSchema: z.string().optional(),
  sourceTable: z.string().optional(),
  targetSystem: z.string().optional(),
  targetConnectionId: z.number().optional(),
  targetType: z.string().optional(),
  targetSchema: z.string().optional(),
  targetTable: z.string().optional(),
  reconType: z.string().min(1, "Reconciliation type is required"),
  attribute: z.string().optional(),
  sourceQuery: z.string().min(1, "Source query is required"),
  targetQuery: z.string().min(1, "Target query is required"),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
});

type FormData = z.infer<typeof reconciliationFormSchema>;

interface ReconciliationFormProps {
  config?: ReconciliationConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReconciliationForm({
  config,
  onSuccess,
  onCancel,
}: ReconciliationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ["/api/metadata/execution_layer"],
    queryFn: () =>
      fetch("/api/metadata/execution_layer").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: reconTypes = [] } = useQuery({
    queryKey: ["/api/metadata/recon_type"],
    queryFn: () =>
      fetch("/api/metadata/recon_type").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: activeFlags = [] } = useQuery({
    queryKey: ["/api/metadata/active_flag"],
    queryFn: () =>
      fetch("/api/metadata/active_flag").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: sourceSystems = [] } = useQuery({
    queryKey: ["/api/metadata/source_system"],
    queryFn: () =>
      fetch("/api/metadata/source_system").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: sourceTypes = [] } = useQuery({
    queryKey: ["/api/metadata/source_type"],
    queryFn: () =>
      fetch("/api/metadata/source_type").then((res) => res.json()) as Promise<string[]>,
  });

  // Fetch next auto-increment value for recon_key (for new records)
  const { data: nextReconKey } = useQuery({
    queryKey: ["/api/reconciliation-configs/next-key"],
    queryFn: async () => {
      const response = await fetch("/api/reconciliation-configs/next-key");
      if (!response.ok) throw new Error('Failed to fetch next recon key');
      const data = await response.json();
      return data.nextKey as number;
    },
    enabled: !config, // Only fetch for new records
  });

  // Initialize form with default values or existing config values
  const form = useForm<FormData>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: {
      configKey: config?.configKey || undefined,
      executionLayer: config?.executionLayer ? 
        config.executionLayer.charAt(0).toUpperCase() + config.executionLayer.slice(1).toLowerCase() : 
        "",
      sourceSystem: config?.sourceSystem || "",
      sourceConnectionId: config?.sourceConnectionId || undefined,
      sourceType: config?.sourceType || "",
      sourceSchema: config?.sourceSchema || "",
      sourceTable: config?.sourceTable || "",
      targetSystem: config?.targetSystem || "",
      targetConnectionId: config?.targetConnectionId || undefined,
      targetType: config?.targetType || "",
      targetSchema: config?.targetSchema || "",
      targetTable: config?.targetTable || "",
      reconType: config?.reconType || "",
      attribute: config?.attribute || "",
      sourceQuery: config?.sourceQuery || "",
      targetQuery: config?.targetQuery || "",
      thresholdPercentage: config?.thresholdPercentage || undefined,
      activeFlag: config?.activeFlag || "Y",
    },
  });

  // Fetch pipeline configs for the dropdown
  const { data: configs = [] } = useQuery({
    queryKey: ["/api/pipelines"],
    queryFn: () => fetch("/api/pipelines").then((res) => res.json()) as Promise<any[]>,
  });

  // Watch form values for dynamic dropdowns
  const selectedSourceSystem = form.watch('sourceSystem');
  const selectedSourceConnectionId = form.watch('sourceConnectionId');
  const selectedSourceSchema = form.watch('sourceSchema');
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');
  const selectedTargetSchema = form.watch('targetSchema');
  const selectedTargetTable = form.watch('targetTable');

  // Fetch connections filtered by source system
  const { data: sourceConnections = [] } = useQuery({
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
  const { data: sourceSchemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedSourceConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas`);
      return response.json() as string[];
    },
    enabled: !!selectedSourceConnectionId
  });

  // Fetch tables for selected connection and schema
  const { data: sourceTables = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas', selectedSourceSchema, 'tables'],
    queryFn: async () => {
      if (!selectedSourceConnectionId || !selectedSourceSchema) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas/${selectedSourceSchema}/tables`);
      return response.json() as string[];
    },
    enabled: !!selectedSourceConnectionId && !!selectedSourceSchema
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

  // Fetch target table columns for selected target table
  const { data: targetColumns = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas', selectedTargetSchema, 'tables', selectedTargetTable, 'columns'],
    queryFn: async () => {
      if (!selectedTargetConnectionId || !selectedTargetSchema || !selectedTargetTable) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables/${selectedTargetTable}/columns`);
      return response.json() as string[];
    },
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema && !!selectedTargetTable
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertReconciliationConfig) => {
      const response = await apiRequest("POST", "/api/reconciliation-configs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation-configs"] });
      toast({
        title: "Success",
        description: "Reconciliation configuration created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reconciliation configuration",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PUT", `/api/reconciliation-configs/${config?.reconKey}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation-configs"] });
      toast({
        title: "Success",
        description: "Reconciliation configuration updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reconciliation configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Convert execution layer to lowercase before saving
      const processedData = {
        ...data,
        executionLayer: data.executionLayer ? data.executionLayer.toLowerCase() : ""
      };

      if (config) {
        await updateMutation.mutateAsync(processedData);
      } else {
        await createMutation.mutateAsync(processedData);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="source" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Parameters
            </TabsTrigger>
          </TabsList>

          {/* General Configuration */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>Basic reconciliation settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="executionLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Execution Layer *
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Layer where reconciliation is performed (e.g., Bronze, Silver, Gold).</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-execution-layer-form">
                              <SelectValue placeholder="Select execution layer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executionLayers.map((layer) => (
                              <SelectItem key={layer} value={layer}>
                                {layer}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reconType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Reconciliation Type *
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Type of reconciliation to perform (e.g., count, sum, value check).</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            // Convert display value to database format (lowercase with space)
                            const dbValue = value.toLowerCase();
                            field.onChange(dbValue);
                          }}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-recon-type">
                              <SelectValue placeholder="Select reconciliation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="count check">Count Check</SelectItem>
                            <SelectItem value="amount check">Amount Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activeFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Active Flag
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Indicates if this reconciliation rule is active (Y/N).</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "Y"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-active-flag">
                              <SelectValue placeholder="Select active flag" />
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

          {/* Source Configuration */}
          <TabsContent value="source" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Configuration</CardTitle>
                <CardDescription>Configure the source data for reconciliation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sourceSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source System</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-system">
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
                    name="sourceConnectionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Database Connection</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value ? parseInt(value) : undefined);
                            // Reset schema and table when connection changes
                            form.setValue('sourceSchema', '');
                            form.setValue('sourceTable', '');
                          }} 
                          value={field.value?.toString() || ''}
                          disabled={!selectedSourceSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-connection">
                              <SelectValue placeholder={selectedSourceSystem ? "Select connection" : "Select source system first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceConnections.map((connection) => (
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
                        <FormLabel>Source Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-source-type">
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
                    name="sourceSchema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Source Schema Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Name of the source database schema.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value || '');
                            // Reset table when schema changes
                            form.setValue('sourceTable', '');
                          }} 
                          value={field.value || ''}
                          disabled={!selectedSourceConnectionId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-schema">
                              <SelectValue placeholder={selectedSourceConnectionId ? "Select schema" : "Select connection first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceSchemas.map((schema) => (
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
                    name="sourceTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Source Table Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Name of the source table.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value || '')} 
                          value={field.value || ''}
                          disabled={!selectedSourceConnectionId || !selectedSourceSchema}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-table">
                              <SelectValue placeholder={selectedSourceConnectionId && selectedSourceSchema ? "Select table" : "Select schema first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceTables.map((table) => (
                              <SelectItem key={table} value={table}>{table}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sourceQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Source Query *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Custom SQL query to run on the source system.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormDescription>
                        SQL query to execute against the source data
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM source_table WHERE..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-source-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Target Configuration */}
          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Configuration</CardTitle>
                <CardDescription>Configure the target data for reconciliation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target System</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
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
                        <FormLabel>Target Database Connection</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value ? parseInt(value) : undefined);
                            // Reset schema and table when connection changes
                            form.setValue('targetSchema', '');
                            form.setValue('targetTable', '');
                          }} 
                          value={field.value?.toString() || ''}
                          disabled={!selectedTargetSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-connection">
                              <SelectValue placeholder={selectedTargetSystem ? "Select connection" : "Select target system first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetConnections.map((connection) => (
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
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-target-type">
                              <SelectValue placeholder="Select target type" />
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
                    name="targetSchema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target Schema Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Name of the target database schema.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value || '');
                            // Reset table when schema changes
                            form.setValue('targetTable', '');
                          }} 
                          value={field.value || ''}
                          disabled={!selectedTargetConnectionId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-schema">
                              <SelectValue placeholder={selectedTargetConnectionId ? "Select schema" : "Select connection first"} />
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
                    name="targetTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Target Table Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Name of the target table.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value || '')} 
                          value={field.value || ''}
                          disabled={!selectedTargetConnectionId || !selectedTargetSchema}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-table">
                              <SelectValue placeholder={selectedTargetConnectionId && selectedTargetSchema ? "Select table" : "Select schema first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetTables.map((table) => (
                              <SelectItem key={table} value={table}>{table}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Target Query *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Custom SQL query to run on the target system.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormDescription>
                        SQL query to execute against the target data
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM target_table WHERE..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-target-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliation Parameters */}
          <TabsContent value="parameters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Parameters</CardTitle>
                <CardDescription>Additional reconciliation settings and thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="attribute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Attribute
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Specific column used for value-based reconciliation.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormDescription>
                          Column name for value-based reconciliation
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                          disabled={!selectedTargetTable || targetColumns.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-attribute">
                              <SelectValue placeholder={
                                !selectedTargetTable 
                                  ? "Select a target table first" 
                                  : targetColumns.length === 0 
                                    ? "Loading columns..." 
                                    : "Select column for attribute"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetColumns.map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
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
                    name="thresholdPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Threshold Percentage
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Maximum allowed difference between source and target (in %).</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormDescription>
                          Acceptable variance percentage (0-100)
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Enter threshold percentage"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            data-testid="input-threshold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-reconciliation"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
            data-testid="button-save-reconciliation"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {config ? "Update Configuration" : "Save Configuration"}
          </Button>
        </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}