
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DataDictionaryRecord, InsertDataDictionaryRecord } from "@shared/schema";

// Form validation schema
const dataDictionaryFormSchema = z.object({
  executionLayer: z.string().min(1, "Execution layer is required"),
  sourceSystem: z.string().min(1, "Source system is required"),
  sourceConnectionId: z.number().min(1, "Source connection is required"),
  sourceObject: z.string().min(1, "Source object is required"),
  targetSystem: z.string().min(1, "Target system is required"),
  targetConnectionId: z.number().min(1, "Target connection is required"),
  targetSchemaName: z.string().min(1, "Target schema is required"),
  targetTableName: z.string().min(1, "Target table name is required"),
  attributeName: z.string().min(1, "Attribute name is required"),
  dataType: z.string().min(1, "Data type is required"),
  length: z.number().optional(),
  precisionValue: z.number().optional(),
  scale: z.number().optional(),
  isNotNull: z.boolean().optional(),
  isPrimaryKey: z.boolean().optional(),
  isForeignKey: z.boolean().optional(),
  activeFlag: z.string().default("Y"),
  columnDescription: z.string().optional(),
});

type FormData = z.infer<typeof dataDictionaryFormSchema>;

interface DataDictionaryFormProps {
  entry?: DataDictionaryRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataDictionaryForm({ entry, onSuccess, onCancel }: DataDictionaryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ['/api/metadata/execution_layer'],
    queryFn: () => fetch('/api/metadata/execution_layer').then(res => res.json()) as Promise<string[]>
  });

  const { data: sourceSystems = [] } = useQuery({
    queryKey: ['/api/metadata/source_system'],
    queryFn: () => fetch('/api/metadata/source_system').then(res => res.json()) as Promise<string[]>
  });

  const { data: allConnections = [] } = useQuery({
    queryKey: ['/api/connections'],
    queryFn: () => fetch('/api/connections').then(res => res.json()) as Promise<any[]>
  });

  const { data: dataTypes = [] } = useQuery({
    queryKey: ['/api/metadata/data_type'],
    queryFn: () => fetch('/api/metadata/data_type').then(res => res.json()) as Promise<string[]>
  });

  const { data: activeFlags = [] } = useQuery({
    queryKey: ['/api/metadata/active_flag'],
    queryFn: () => fetch('/api/metadata/active_flag').then(res => res.json()) as Promise<string[]>
  });

  const form = useForm<FormData>({
    resolver: zodResolver(dataDictionaryFormSchema),
    defaultValues: {
      executionLayer: entry?.executionLayer || '',
      sourceSystem: '',
      sourceConnectionId: 0,
      sourceObject: '',
      targetSystem: '',
      targetConnectionId: 0,
      targetSchemaName: '',
      targetTableName: '',
      attributeName: entry?.attributeName || '',
      dataType: entry?.dataType || '',
      length: entry?.length || undefined,
      precisionValue: entry?.precisionValue || undefined,
      scale: entry?.scale || undefined,
      isNotNull: entry?.isNotNull || false,
      isPrimaryKey: entry?.isPrimaryKey || false,
      isForeignKey: entry?.isForeignKey || false,
      activeFlag: entry?.activeFlag || 'Y',
      columnDescription: entry?.columnDescription || '',
    },
  });

  // Watch form values for dynamic dropdowns
  const selectedSourceSystem = form.watch('sourceSystem');
  const selectedSourceConnectionId = form.watch('sourceConnectionId');
  const selectedTargetSystem = form.watch('targetSystem');
  const selectedTargetConnectionId = form.watch('targetConnectionId');

  // Filter connections based on selected systems
  const sourceConnections = allConnections.filter(conn => 
    !selectedSourceSystem || 
    conn.connectionType?.toLowerCase() === selectedSourceSystem.toLowerCase() ||
    (selectedSourceSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
    (selectedSourceSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
    (selectedSourceSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
    (selectedSourceSystem === 'Oracle' && conn.connectionType === 'Oracle') ||
    (selectedSourceSystem === 'Snowflake' && conn.connectionType === 'Snowflake') ||
    (selectedSourceSystem === 'MongoDB' && conn.connectionType === 'MongoDB') ||
    (selectedSourceSystem === 'BigQuery' && conn.connectionType === 'GCP') ||
    (selectedSourceSystem === 'Salesforce' && conn.connectionType === 'API')
  );

  const targetConnections = allConnections.filter(conn => 
    !selectedTargetSystem || 
    conn.connectionType?.toLowerCase() === selectedTargetSystem.toLowerCase() ||
    (selectedTargetSystem === 'SQL Server' && conn.connectionType === 'SQL Server') ||
    (selectedTargetSystem === 'MySQL' && conn.connectionType === 'MySQL') ||
    (selectedTargetSystem === 'PostgreSQL' && conn.connectionType === 'PostgreSQL') ||
    (selectedTargetSystem === 'Oracle' && conn.connectionType === 'Oracle') ||
    (selectedTargetSystem === 'Snowflake' && conn.connectionType === 'Snowflake') ||
    (selectedTargetSystem === 'MongoDB' && conn.connectionType === 'MongoDB') ||
    (selectedTargetSystem === 'BigQuery' && conn.connectionType === 'GCP') ||
    (selectedTargetSystem === 'Salesforce' && conn.connectionType === 'API')
  );

  // Fetch source schemas for selected source connection
  const { data: sourceSchemas = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas'],
    queryFn: async () => {
      if (!selectedSourceConnectionId) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas`);
      return response.json() as string[];
    },
    enabled: !!selectedSourceConnectionId
  });

  // Watch for source schema selection
  const selectedSourceSchema = form.watch('sourceObject');

  // Fetch source tables/objects for selected source connection and schema
  const { data: sourceObjects = [] } = useQuery({
    queryKey: ['/api/connections', selectedSourceConnectionId, 'schemas', selectedSourceSchema, 'tables'],
    queryFn: async () => {
      if (!selectedSourceConnectionId || !selectedSourceSchema) return [];
      const response = await fetch(`/api/connections/${selectedSourceConnectionId}/schemas/${selectedSourceSchema}/tables`);
      return response.json() as string[];
    },
    enabled: !!selectedSourceConnectionId && !!selectedSourceSchema
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

  // Watch target schema for tables
  const selectedTargetSchema = form.watch('targetSchemaName');

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

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        executionLayer: entry.executionLayer,
        sourceSystem: '',
        sourceConnectionId: 0,
        sourceObject: '',
        targetSystem: '',
        targetConnectionId: 0,
        targetSchemaName: '',
        targetTableName: '',
        attributeName: entry.attributeName,
        dataType: entry.dataType,
        length: entry.length || undefined,
        precisionValue: entry.precisionValue || undefined,
        scale: entry.scale || undefined,
        isNotNull: entry.isNotNull || false,
        isPrimaryKey: entry.isPrimaryKey || false,
        isForeignKey: entry.isForeignKey || false,
        activeFlag: entry.activeFlag || 'Y',
        columnDescription: entry.columnDescription || '',
      });
    } else {
      form.reset({
        executionLayer: '',
        sourceSystem: '',
        sourceConnectionId: 0,
        sourceObject: '',
        targetSystem: '',
        targetConnectionId: 0,
        targetSchemaName: '',
        targetTableName: '',
        attributeName: '',
        dataType: '',
        length: undefined,
        precisionValue: undefined,
        scale: undefined,
        isNotNull: false,
        isPrimaryKey: false,
        isForeignKey: false,
        activeFlag: 'Y',
        columnDescription: '',
      });
    }
  }, [entry, form]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const submitData: Partial<InsertDataDictionaryRecord> = {
        ...data,
        configKey: 1, // Default value since we removed it from form
        createdBy: 'Current User', // In real app, get from auth
        updatedBy: 'Current User',
      };

      if (entry) {
        // Update existing entry
        await fetch(`/api/data-dictionary/${entry.dataDictionaryKey}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        toast({
          title: 'Success',
          description: 'Data dictionary entry updated successfully',
        });
      } else {
        // Create new entry
        await fetch('/api/data-dictionary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        toast({
          title: 'Success',
          description: 'Data dictionary entry created successfully',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving data dictionary entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save data dictionary entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="source" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="source" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target
            </TabsTrigger>
            <TabsTrigger value="attributes" className="flex items-center gap-2">
              Attributes
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
                        <FormLabel>Execution Layer *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormLabel>Source System *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormLabel>Database Connection *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            // Reset dependent fields when connection changes
                            form.setValue('sourceObject', '');
                          }}
                          value={field.value?.toString() || ''}
                          disabled={!selectedSourceSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-connection">
                              <SelectValue placeholder={selectedSourceSystem ? "Select database connection" : "Select source system first"} />
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
                    name="sourceObject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Schema Name *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset table when schema changes
                            form.setValue('targetTableName', '');
                          }}
                          value={field.value || ''}
                          disabled={!selectedSourceConnectionId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-schema">
                              <SelectValue placeholder={selectedSourceConnectionId ? "Select source schema" : "Select connection first"} />
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
                    name="targetTableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Object Name *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                          disabled={!selectedSourceConnectionId || !selectedSourceSchema}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source-object">
                              <SelectValue placeholder={selectedSourceConnectionId && selectedSourceSchema ? "Select source object" : "Select schema first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sourceObjects.map((object) => (
                              <SelectItem key={object} value={object}>{object}</SelectItem>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target System *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormLabel>Target Connection *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ''}
                          disabled={!selectedTargetSystem}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-connection">
                              <SelectValue placeholder={selectedTargetSystem ? "Select target connection" : "Select target system first"} />
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
                    name="targetSchemaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Schema *</FormLabel>
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
                              <SelectValue placeholder={selectedTargetConnectionId ? "Select target schema" : "Select connection first"} />
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
                        <FormLabel>Target Table Name *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                          disabled={!selectedTargetConnectionId || !selectedTargetSchema}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-table">
                              <SelectValue placeholder={selectedTargetConnectionId && selectedTargetSchema ? "Select target table" : "Select schema first"} />
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
          </TabsContent>

          {/* Attributes Configuration */}
          <TabsContent value="attributes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attribute Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="attributeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attribute Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter attribute name"
                            {...field}
                            data-testid="input-attribute-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-data-type">
                              <SelectValue placeholder="Select data type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dataTypes.map((type) => (
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
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter length"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precisionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precision Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter precision"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-precision"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scale</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter scale"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-scale"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isNotNull"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is Not Null</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'true')} 
                          value={field.value ? 'true' : 'false'}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-is-not-null">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPrimaryKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is Primary Key</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'true')} 
                          value={field.value ? 'true' : 'false'}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-is-primary-key">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isForeignKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is Foreign Key</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'true')} 
                          value={field.value ? 'true' : 'false'}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-is-foreign-key">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
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
                        <FormLabel>Active Flag</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-active-flag">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeFlags.map((flag) => (
                              <SelectItem key={flag} value={flag}>{flag}</SelectItem>
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
                  name="columnDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Column Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter column description..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Business description of the field (max 150 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
            data-testid="button-save"
          >
            {isLoading ? 'Saving...' : (entry ? 'Update Entry' : 'Save Entry')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
