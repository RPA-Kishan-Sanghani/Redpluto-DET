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
} from "lucide-react";

// Form validation schema matching the database exactly
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
    "NOT_NULL",
    "UNIQUE", 
    "DATA_TYPE",
    "RANGE",
    "REGEX",
    "CUSTOM",
    "REFERENCE"
  ];

  // Initialize form with default values or existing config values
  const form = useForm<FormData>({
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

  // Watch form values for dynamic behavior
  const selectedValidationType = form.watch('validationType');
  const selectedSourceSystem = form.watch('sourceSystem');
  const selectedSourceConnectionId = form.watch('sourceConnectionId');
  const selectedSourceSchema = form.watch('sourceSchema');
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');
  const selectedTargetSchema = form.watch('targetSchema');
  
  const showReferenceTable = selectedValidationType === 'REFERENCE';
  const showThresholdPercentage = ['RANGE', 'CUSTOM'].includes(selectedValidationType || '');

  // Filter connections based on selected system
  const sourceConnections = allConnections.filter(conn => 
    !selectedSourceSystem || 
    conn.connectionType?.toLowerCase() === selectedSourceSystem.toLowerCase()
  );

  const targetConnections = allConnections.filter(conn => 
    !selectedTargetSystem || 
    conn.connectionType?.toLowerCase() === selectedTargetSystem.toLowerCase()
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
    setIsLoading(true);
    try {
      console.log('Form submitted with data:', data);
      if (config) {
        await updateMutation.mutateAsync(data);
      } else {
        const createData: InsertDataQualityConfig = {
          configKey: data.configKey,
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
          // Source configuration
          sourceSystem: data.sourceSystem,
          sourceConnectionId: data.sourceConnectionId,
          sourceType: data.sourceType,
          sourceSchema: data.sourceSchema,
          sourceTableName: data.sourceTableName,
          // Target configuration
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
                    <FormLabel>Execution Layer <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter table name" data-testid="input-table-name" />
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
                    <FormLabel>Attribute Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter attribute name" data-testid="input-attribute-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validation Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-validation-type">
                          <SelectValue placeholder="Select validation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {validationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
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
                      <FormLabel>Reference Table Name</FormLabel>
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
                    <FormLabel>Default Value</FormLabel>
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
                      <FormLabel>Threshold Percentage</FormLabel>
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
                    <FormLabel>Transfer to Error Table</FormLabel>
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'Y'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-active-flag">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeFlags.map((flag) => (
                          <SelectItem key={flag} value={flag}>
                            {flag === 'Y' ? 'Active' : 'Inactive'}
                          </SelectItem>
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
              name="customQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Query</FormLabel>
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

        {/* Source Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Source Configuration
            </CardTitle>
            <CardDescription>Configure the data source settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        field.onChange(value);
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
                name="sourceTableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Table Name</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ''}
                      disabled={!selectedSourceSchema}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-source-table">
                          <SelectValue placeholder={selectedSourceSchema ? "Select table" : "Select schema first"} />
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
          </CardContent>
        </Card>

        {/* Target Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Target Configuration
            </CardTitle>
            <CardDescription>Configure the data target settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <FormLabel>Target Schema</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Table Name</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ''}
                      disabled={!selectedTargetSchema}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-target-table">
                          <SelectValue placeholder={selectedTargetSchema ? "Select table" : "Select schema first"} />
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