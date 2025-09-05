import { useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  DataQualityConfig,
  InsertDataQualityConfig,
  UpdateDataQualityConfig
} from "@shared/schema";
import {
  Shield,
  Database,
  Settings,
  Info,
  Loader2,
  Save,
  X,
  HelpCircle,
} from "lucide-react";

// Form validation schema
const dataQualityFormSchema = z.object({
  configKey: z.number().optional(),
  executionLayer: z.string().min(1, "Execution layer is required"),
  tableName: z.string().min(1, "Table name is required"),
  attributeName: z.string().min(1, "Attribute name is required"),
  validationType: z.string().min(1, "Validation type is required"),
  referenceTableName: z.string().optional(),
  defaultValue: z.string().optional(),
  errorTableTransferFlag: z.string().default("N"),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
  customQuery: z.string().optional(),
  // Source fields
  sourceSystem: z.string().optional(),
  sourceConnectionId: z.number().optional(),
  sourceType: z.string().optional(),
  sourceSchema: z.string().optional(),
  sourceTableName: z.string().optional(),
  // Target fields
  targetSystem: z.string().optional(),
  targetConnectionId: z.number().optional(),
  targetType: z.string().optional(),
  targetSchema: z.string().optional(),
  targetTableName: z.string().optional(),
});

type FormData = z.infer<typeof dataQualityFormSchema>;

interface DataQualityFormProps {
  config?: DataQualityConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataQualityForm({
  config,
  onSuccess,
  onCancel,
}: DataQualityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ["/api/metadata/execution_layer"],
    queryFn: () =>
      fetch("/api/metadata/execution_layer").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: activeFlags = [] } = useQuery({
    queryKey: ["/api/metadata/active_flag"],
    queryFn: () =>
      fetch("/api/metadata/active_flag").then((res) => res.json()) as Promise<string[]>,
  });

  // Fetch pipeline configs for the dropdown
  const { data: configs = [] } = useQuery({
    queryKey: ["/api/pipelines"],
    queryFn: () => fetch("/api/pipelines").then((res) => res.json()) as Promise<any[]>,
  });

  // Fetch reference table names
  const { data: referenceTableNames = [] } = useQuery({
    queryKey: ["/api/metadata/reference_tables"],
    queryFn: () =>
      fetch("/api/metadata/reference_tables").then((res) => res.json()) as Promise<string[]>,
  });

  // Fetch all available connections
  const { data: allConnections = [] } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: () => fetch("/api/connections").then((res) => res.json()) as Promise<any[]>,
  });

  // Fetch available system types (e.g., MySQL, PostgreSQL, File, API)
  const { data: sourceSystems = [] } = useQuery({
    queryKey: ["/api/metadata/connection_types"],
    queryFn: () => fetch("/api/metadata/connection_types").then((res) => res.json()) as Promise<string[]>,
  });
  const { data: sourceTypes = [] } = useQuery({
    queryKey: ["/api/metadata/source_type"],
    queryFn: () => fetch("/api/metadata/source_type").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: targetTypes = [] } = useQuery({
    queryKey: ["/api/metadata/target_type"],
    queryFn: () => fetch("/api/metadata/target_type").then((res) => res.json()) as Promise<string[]>,
  });

  // Initialize form with default values or existing config values
  const form = useForm<z.infer<typeof dataQualityFormSchema>>({
    resolver: zodResolver(dataQualityFormSchema),
    defaultValues: {
      configKey: config?.configKey || undefined,
      executionLayer: config?.executionLayer || "",
      tableName: config?.tableName || "",
      attributeName: config?.attributeName || "",
      validationType: config?.validationType || "",
      referenceTableName: config?.referenceTableName || "",
      defaultValue: config?.defaultValue || "",
      errorTableTransferFlag: config?.errorTableTransferFlag || "N",
      thresholdPercentage: config?.thresholdPercentage || undefined,
      activeFlag: config?.activeFlag || "Y",
      customQuery: config?.customQuery || "",
      // Source fields
      sourceSystem: config?.sourceSystem || "",
      sourceConnectionId: config?.sourceConnectionId || undefined,
      sourceType: config?.sourceType || "",
      sourceSchema: config?.sourceSchema || "",
      sourceTableName: config?.sourceTableName || "",
      // Target fields
      targetSystem: config?.targetSystem || "",
      targetConnectionId: config?.targetConnectionId || undefined,
      targetType: config?.targetType || "",
      targetSchema: config?.targetSchema || "",
      targetTableName: config?.targetTableName || "",
    },
  });

  // Watch form values for dynamic dropdowns
  const selectedSourceSystem = form.watch('sourceSystem');
  const selectedSourceConnectionId = form.watch('sourceConnectionId');
  const selectedSourceSchema = form.watch('sourceSchema');
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');
  const selectedTargetSchema = form.watch('targetSchema');

  // Filter connections based on selected system
  const sourceConnections = allConnections.filter(conn => 
    !selectedSourceSystem || 
    conn.connectionType?.toLowerCase() === selectedSourceSystem.toLowerCase() ||
    (selectedSourceSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
    (selectedSourceSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
    (selectedSourceSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
    (selectedSourceSystem === 'Oracle' && conn.connectionType === 'Oracle')
  );

  const targetConnections = allConnections.filter(conn => 
    !selectedTargetSystem || 
    conn.connectionType?.toLowerCase() === selectedTargetSystem.toLowerCase() ||
    (selectedTargetSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
    (selectedTargetSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
    (selectedTargetSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
    (selectedTargetSystem === 'Oracle' && conn.connectionType === 'Oracle')
  );

  // Fetch source schemas for selected source connection
  const { data: sourceSchemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedSourceConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas`);
      return response.json();
    },
    enabled: !!selectedSourceConnectionId
  });

  // Fetch source tables for selected source schema
  const { data: sourceTables = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas', selectedSourceSchema, 'tables'],
    queryFn: async () => {
      if (!selectedSourceConnectionId || !selectedSourceSchema) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas/${selectedSourceSchema}/tables`);
      return response.json();
    },
    enabled: !!selectedSourceConnectionId && !!selectedSourceSchema
  });

  // Fetch target schemas for selected target connection
  const { data: targetSchemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedTargetConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas`);
      return response.json();
    },
    enabled: !!selectedTargetConnectionId
  });

  // Fetch target tables for selected target schema
  const { data: targetTables = [] } = useQuery({
    queryKey: ['/api/connections', selectedTargetConnectionId, 'schemas', selectedTargetSchema, 'tables'],
    queryFn: async () => {
      if (!selectedTargetConnectionId || !selectedTargetSchema) return [];
      const response = await fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables`);
      return response.json();
    },
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertDataQualityConfig) => {
      const response = await apiRequest("POST", "/api/data-quality-configs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality-configs"] });
      toast({
        title: "Success",
        description: "Data quality configuration created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data quality configuration",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PUT", `/api/data-quality-configs/${config?.dataQualityKey}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality-configs"] });
      toast({
        title: "Success",
        description: "Data quality configuration updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update data quality configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (config) {
        await updateMutation.mutateAsync(data);
      } else {
        const createData = {
          configKey: data.configKey || 1, // Provide a default value
          executionLayer: data.executionLayer,
          tableName: data.tableName,
          attributeName: data.attributeName,
          validationType: data.validationType,
          referenceTableName: data.referenceTableName,
          defaultValue: data.defaultValue,
          errorTableTransferFlag: data.errorTableTransferFlag,
          thresholdPercentage: data.thresholdPercentage,
          activeFlag: data.activeFlag,
          customQuery: data.customQuery,
          sourceSystem: data.sourceSystem,
          sourceConnectionId: data.sourceConnectionId,
          sourceType: data.sourceType,
          sourceSchema: data.sourceSchema,
          sourceTableName: data.sourceTableName,
          targetSystem: data.targetSystem,
          targetConnectionId: data.targetConnectionId,
          targetType: data.targetType,
          targetSchema: data.targetSchema,
          targetTableName: data.targetTableName,
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const TooltipField = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        {children}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Basic Config
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="source-target" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source/Target
            </TabsTrigger>
          </TabsList>

          {/* Basic Configuration */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="executionLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Layer *</FormLabel>
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
                    name="tableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter table name"
                            {...field}
                            data-testid="input-table-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attributeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attribute Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter attribute/column name"
                            {...field}
                            data-testid="input-attribute-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="activeFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active Flag</FormLabel>
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

          {/* Validation Configuration */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Validation Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="validationType"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Type of validation rule to apply">
                          <FormLabel>Validation Type *</FormLabel>
                        </TooltipField>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-validation-type">
                              <SelectValue placeholder="Select validation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="List Value Check">List Value Check</SelectItem>
                            <SelectItem value="Duplicate Check">Duplicate Check</SelectItem>
                            <SelectItem value="Custom Query Check">Custom Query Check</SelectItem>
                            <SelectItem value="File Format Check">File Format Check</SelectItem>
                            <SelectItem value="Referential Integrity Check">Referential Integrity Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceTableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Table Name</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-reference-table">
                              <SelectValue placeholder="Select reference table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NA">NA</SelectItem>
                            {referenceTableNames.map((tableName) => (
                              <SelectItem key={tableName} value={tableName}>
                                {tableName}
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
                    name="defaultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Value</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter default value"
                            {...field}
                            data-testid="input-default-value"
                          />
                        </FormControl>
                        <FormDescription>
                          Default value to use when validation fails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="thresholdPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Acceptable percentage of failed validations before triggering alerts (0-100)">
                          <FormLabel>Threshold Percentage</FormLabel>
                        </TooltipField>
                        <FormDescription>
                          Acceptable variance percentage (0-100)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Enter threshold percentage"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              data-testid="input-threshold"
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="errorTableTransferFlag"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Whether to transfer failed records to error table for analysis">
                          <FormLabel>Error Table Transfer</FormLabel>
                        </TooltipField>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "N"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-error-transfer">
                              <SelectValue placeholder="Select error transfer flag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Yes</SelectItem>
                            <SelectItem value="N">No</SelectItem>
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

          {/* Source/Target Configuration */}
          <TabsContent value="source-target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Source and Target Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Section */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold mb-2">Source Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sourceSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source System</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset dependent fields when source system changes
                              form.setValue('sourceConnectionId', undefined);
                              form.setValue('sourceSchema', '');
                              form.setValue('sourceTableName', '');
                            }} 
                            value={field.value || ''}
                          >
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
                              // Reset dependent fields when connection changes
                              form.setValue('sourceSchema', '');
                              form.setValue('sourceTableName', '');
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
                          <Select onValueChange={field.onChange} value={field.value || ''}>
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
                          <FormLabel>Source Schema</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value || '');
                              // Reset table when schema changes
                              form.setValue('sourceTableName', '');
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
                              {sourceSchemas.map((schema: string) => (
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
                          <FormLabel>Source Table Name</FormLabel>
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
                              {sourceTables.map((table: string) => (
                                <SelectItem key={table} value={table}>{table}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Target Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Target Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target System</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset dependent fields when target system changes
                              form.setValue('targetConnectionId', undefined);
                              form.setValue('targetSchema', '');
                              form.setValue('targetTableName', '');
                            }} 
                            value={field.value || ''}
                          >
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
                          <FormLabel>Database Connection</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value ? parseInt(value) : undefined);
                              // Reset dependent fields when connection changes
                              form.setValue('targetSchema', '');
                              form.setValue('targetTableName', '');
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
                          <Select onValueChange={field.onChange} value={field.value || ''}>
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
                      name="targetSchema"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Schema</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value || '');
                              // Reset table when schema changes
                              form.setValue('targetTableName', '');
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
                              {targetSchemas.map((schema: string) => (
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Table Name</FormLabel>
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
                              {targetTables.map((table: string) => (
                                <SelectItem key={table} value={table}>{table}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Configuration */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customQuery"
                  render={({ field }) => (
                    <FormItem>
                      <TooltipField tooltip="Custom SQL query for complex validation logic (max 500 characters)">
                        <FormLabel>Custom Query</FormLabel>
                      </TooltipField>
                      <FormDescription>
                        SQL query for custom validation rules
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM table WHERE condition..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-custom-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            data-testid="button-cancel-quality"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
            data-testid="button-save-quality"
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
  );
}

