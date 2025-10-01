import { useState } from "react";
import React from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  DataQualityConfig,
  InsertDataQualityConfig,
} from "@shared/schema";
import {
  Shield,
  Settings,
  Loader2,
  Save,
  X,
  Info,
} from "lucide-react";

// Form validation schema matching the database exactly
const dataQualityFormSchema = z.object({
  configKey: z.number().optional(),
  executionLayer: z.string().min(1, "Execution layer is required"),
  tableName: z.string().optional(), // Optional since derived from targetTableName
  attributeName: z.string().min(1, "Attribute name is required"),
  validationType: z.string().min(1, "Validation type is required"),
  referenceTableName: z.string().optional(),
  defaultValue: z.string().optional(),
  errorTableTransferFlag: z.string().default("N"),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
  customQuery: z.string().optional(),
  // Source configuration fields
  sourceSystem: z.string().optional(),
  sourceConnectionId: z.number().optional(),
  sourceType: z.string().optional(),
  sourceSchema: z.string().optional(),
  sourceTableName: z.string().optional(),
  // Target configuration fields
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

  // Fetch all available connections
  const { data: allConnections = [] } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: () => fetch("/api/connections").then((res) => res.json()) as Promise<any[]>,
  });

  // Fetch available system types
  const { data: sourceSystems = [] } = useQuery({
    queryKey: ["/api/metadata/source_system"],
    queryFn: () => fetch("/api/metadata/source_system").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: sourceTypes = [] } = useQuery({
    queryKey: ["/api/metadata/source_type"],
    queryFn: () => fetch("/api/metadata/source_type").then((res) => res.json()) as Promise<string[]>,
  });

  // Validation types
  const validationTypes = [
    "Null Check",
    "List Value Check", 
    "Duplicate Check",
    "File Format Check",
    "Referential Integrity Check",
    "Custom Query Check"
  ];

  // Helper function to convert snake_case validation type back to display format
  const convertValidationTypeToDisplayFormat = (validationType: string) => {
    const typeMap: Record<string, string> = {
      'null_check': 'Null Check',
      'list_value_check': 'List Value Check',
      'duplicate_check': 'Duplicate Check',
      'file_format_check': 'File Format Check',
      'referential_integrity_check': 'Referential Integrity Check',
      'custom_query_check': 'Custom Query Check'
    };
    return typeMap[validationType.toLowerCase()] || validationType;
  };

  // Initialize form with default values or existing config values
  const form = useForm<FormData>({
    resolver: zodResolver(dataQualityFormSchema),
    defaultValues: {
      configKey: config?.configKey || undefined,
      executionLayer: config?.executionLayer ? config.executionLayer.charAt(0).toUpperCase() + config.executionLayer.slice(1).toLowerCase() : "",
      tableName: config?.tableName || "",
      attributeName: config?.attributeName || "",
      validationType: config?.validationType ? convertValidationTypeToDisplayFormat(config.validationType) : "",
      referenceTableName: config?.referenceTableName || "",
      defaultValue: config?.defaultValue || "",
      errorTableTransferFlag: config?.errorTableTransferFlag || "N",
      thresholdPercentage: config?.thresholdPercentage || undefined,
      activeFlag: config?.activeFlag || "Y",
      customQuery: config?.customQuery || "",
      // Source configuration
      sourceSystem: config?.sourceSystem || "",
      sourceConnectionId: config?.sourceConnectionId || undefined,
      sourceType: config?.sourceType || "",
      sourceSchema: config?.sourceSchema || "",
      sourceTableName: config?.sourceTableName || "",
      // Target configuration
      targetSystem: config?.targetSystem || "",
      targetConnectionId: config?.targetConnectionId || undefined,
      targetType: config?.targetType || "",
      targetSchema: config?.targetSchema || "",
      targetTableName: config?.targetTableName || "",
    },
  });



  // Basic Configuration - Target System, Connection, Schema, Table, Type
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');
  const selectedTargetSchema = form.watch('targetSchema');
  const selectedTargetTableName = form.watch('targetTableName');

  // Filter connections by selected target system
  const targetConnections = allConnections.filter(
    (connection) => 
      !selectedTargetSystem || 
      connection.connectionType.toLowerCase() === selectedTargetSystem.toLowerCase()
  );

  // Fetch schemas for selected target connection
  const { data: targetSchemas = [] } = useQuery({
    queryKey: ["/api/connections", selectedTargetConnectionId, "schemas"],
    queryFn: () =>
      fetch(`/api/connections/${selectedTargetConnectionId}/schemas`).then((res) => res.json()) as Promise<string[]>,
    enabled: !!selectedTargetConnectionId,
  });

  // Fetch tables for selected target connection and schema
  const { data: targetTables = [] } = useQuery({
    queryKey: ["/api/connections", selectedTargetConnectionId, "schemas", selectedTargetSchema, "tables"],
    queryFn: () =>
      fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables`).then((res) => res.json()) as Promise<string[]>,
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema,
  });

  // Fetch columns for selected target table
  const { data: targetColumns = [] } = useQuery({
    queryKey: ["/api/connections", selectedTargetConnectionId, "schemas", selectedTargetSchema, "tables", selectedTargetTableName, "columns"],
    queryFn: () =>
      fetch(`/api/connections/${selectedTargetConnectionId}/schemas/${selectedTargetSchema}/tables/${selectedTargetTableName}/columns`).then((res) => res.json()) as Promise<string[]>,
    enabled: !!selectedTargetConnectionId && !!selectedTargetSchema && !!selectedTargetTableName,
  });


  // Watch the validation type to conditionally show fields
  const selectedValidationType = form.watch('validationType');
  
  const showReferenceTable = selectedValidationType === 'Referential Integrity Check';
  const showThresholdPercentage = ['List Value Check', 'File Format Check'].includes(selectedValidationType || '');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertDataQualityConfig) => {
      console.log('Creating data quality config with data:', data);
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
      console.error('Create mutation error:', error);
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
      console.log('Updating data quality config with data:', data);
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
      console.error('Update mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update data quality configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submitted with data:', data);
      setIsLoading(true);

      // Helper function to convert validation type to snake_case
      const convertValidationTypeToSnakeCase = (validationType: string) => {
        return validationType
          .toLowerCase()
          .replace(/\s+/g, '_');
      };

      // Process the form data for submission
      const processedData = {
        ...data,
        // Convert execution layer to lowercase for database storage
        executionLayer: data.executionLayer?.toLowerCase(),
        // Convert validation type to snake_case for database storage
        validationType: data.validationType ? convertValidationTypeToSnakeCase(data.validationType) : data.validationType,
        // Set tableName to targetTableName if not explicitly set
        tableName: data.tableName || data.targetTableName,
        // Convert empty strings to null for optional fields
        configKey: data.configKey || undefined,
        referenceTableName: data.referenceTableName || null,
        defaultValue: data.defaultValue || null,
        thresholdPercentage: data.thresholdPercentage || null,
        customQuery: data.customQuery || null,
      };

      // Remove the target fields that don't exist in the database schema
      const { targetSystem, targetConnectionId, targetType, targetSchema, targetTableName, ...dbData } = processedData;

      if (config) {
        console.log('Processed update data:', dbData);
        await updateMutation.mutateAsync(dbData);
      } else {
        console.log('Processed create data:', dbData);
        await createMutation.mutateAsync(dbData as InsertDataQualityConfig);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Configuration
            </CardTitle>
            <CardDescription>Configure the data quality validation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="executionLayer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Execution Layer <span className="text-red-500">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Processing layer for validation</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-execution-layer">
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
                name="validationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Validation Type <span className="text-red-500">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Type of validation rule</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-validation-type">
                          <SelectValue placeholder="Select validation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {validationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target System Field */}
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
                            <p>System type for target connection</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset dependent fields when target system changes
                        form.setValue('targetConnectionId', undefined);
                        form.setValue('targetSchema', '');
                        form.setValue('targetTableName', '');
                        form.setValue('attributeName', '');
                      }} 
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-system-basic">
                          <SelectValue placeholder="Select target system" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sourceSystems.map((system) => ( // Using sourceSystems here as they represent available system types
                          <SelectItem key={system} value={system}>{system}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Connection Field */}
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
                            <p>Database connection for target system</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value ? parseInt(value) : undefined);
                        // Reset dependent fields when connection changes
                        form.setValue('targetSchema', '');
                        form.setValue('targetTableName', '');
                        form.setValue('attributeName', '');
                      }} 
                      value={field.value?.toString() || ''}
                      disabled={!selectedTargetSystem}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-connection-basic">
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

              {/* Target Schema Field */}
              <FormField
                control={form.control}
                name="targetSchema"
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
                            <p>Database schema containing the target table</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value || '');
                        // Reset dependent fields when schema changes
                        form.setValue('targetTableName', '');
                        form.setValue('attributeName', '');
                      }} 
                      value={field.value || ''}
                      disabled={!selectedTargetConnectionId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-schema-basic">
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

              {/* Target Table Field */}
              <FormField
                control={form.control}
                name="targetTableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Target Table Name
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Table to validate</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value || '');
                        // Reset attribute name when table changes
                        form.setValue('attributeName', '');
                      }} 
                      value={field.value || ''}
                      disabled={!selectedTargetConnectionId || !selectedTargetSchema}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-table-basic">
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

              {/* Attribute Name Field - Populated from target table columns */}
              <FormField
                control={form.control}
                name="attributeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Attribute Name <span className="text-red-500">*</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Column(s) to validate</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ''}
                      disabled={!selectedTargetTableName}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-attribute-name-basic">
                          <SelectValue placeholder={selectedTargetTableName ? "Select column" : "Select table first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targetColumns.map((column) => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
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

        {/* Validation Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Validation Configuration
            </CardTitle>
            <CardDescription>Additional settings for data validation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showReferenceTable && (
                <FormField
                  control={form.control}
                  name="referenceTableName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Reference Table Name
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reference table for lookups</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter reference table name" data-testid="input-reference-table" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="defaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Default Value
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Default value for replacement</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter default value" data-testid="input-default-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showThresholdPercentage && (
                <FormField
                  control={form.control}
                  name="thresholdPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Threshold Percentage
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Maximum allowed error percentage</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Enter threshold percentage"
                          data-testid="input-threshold-percentage"
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="errorTableTransferFlag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Transfer to Error Table
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Flag to transfer errors to error table</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'N'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-error-transfer">
                          <SelectValue placeholder="Select option" />
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

              <FormField
                control={form.control}
                name="activeFlag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Active Flag
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Active indicator</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'Y'}>
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

            <FormField
              control={form.control}
              name="customQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Custom Query
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Custom validation SQL</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter custom SQL query for validation"
                      rows={3}
                      data-testid="textarea-custom-query"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-quality"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-quality"
          >
            {isLoading || createMutation.isPending || updateMutation.isPending ? (
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