import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, X, MoreVertical, Loader2, Edit, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const dataDictionarySchema = z.object({
  executionLayer: z.string().min(1, "Layer is required"),
  sourceSystem: z.string().min(1, "Source system is required"),
  sourceConnectionId: z.number().min(1, "Source connection is required"),
  sourceSchemaName: z.string().min(1, "Source schema is required"),
  sourceTableName: z.string().min(1, "Source object is required"),
  targetSystem: z.string().min(1, "Target system is required"),
  targetConnectionId: z.number().min(1, "Target connection is required"),
  targetLayer: z.string().min(1, "Target layer is required"),
  targetSchemaName: z.string().min(1, "Target schema is required"),
  targetTableName: z.string().min(1, "Target object is required"),
});

interface ColumnMetadata {
  attributeName: string;
  dataType: string;
  precision?: number;
  length?: number;
  scale?: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTable?: string;
  columnDescription: string;
  isNotNull?: boolean; // Added for isNotNull flag
}

interface DataDictionaryFormRedesignedProps {
  entry?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataDictionaryFormRedesigned({ entry, onSuccess, onCancel }: DataDictionaryFormRedesignedProps) {
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [newTargetObject, setNewTargetObject] = useState("");
  const [showAddTargetObject, setShowAddTargetObject] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof dataDictionarySchema>>({
    resolver: zodResolver(dataDictionarySchema),
    defaultValues: {
      executionLayer: entry?.executionLayer || "",
      sourceSystem: "",
      sourceConnectionId: 0,
      sourceSchemaName: entry?.schemaName || "",
      sourceTableName: entry?.tableName || "",
      targetSystem: "",
      targetConnectionId: 0,
      targetLayer: "",
      targetSchemaName: "",
      targetTableName: "",
    },
  });

  // Populate form with existing entry data when editing
  useEffect(() => {
    if (entry) {
      // Find the connection that matches the schema name from available connections
      // This is a temporary solution until we can get the actual connectionId from the entry
      form.reset({
        executionLayer: entry.executionLayer || "",
        sourceSystem: "", // Will be determined by connection
        sourceConnectionId: 0, // Will be set when we find the matching connection
        sourceSchemaName: entry.schemaName || "",
        sourceTableName: entry.tableName || "",
        targetSystem: "",
        targetConnectionId: 0,
        targetLayer: "",
        targetSchemaName: "",
        targetTableName: "",
      });

      // Don't manually set columns here - let the auto-fetch handle it
      // This will be triggered by the useEffect that watches form values
    }
  }, [entry, form]);

  // Watch form values for cascading dropdowns
  const watchedValues = form.watch();

  // Fetch execution layers
  const { data: executionLayers = [] } = useQuery({
    queryKey: ['/api/metadata/execution_layer'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/execution_layer');
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    }
  });

  // Fetch source systems
  const { data: sourceSystems = [] } = useQuery({
    queryKey: ['/api/metadata/source_system'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/source_system');
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    }
  });

  // Fetch connections
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as any[];
    }
  });

  // Fetch source schemas
  const { data: sourceSchemas = [] } = useQuery({
    queryKey: ['/api/connections', watchedValues.sourceConnectionId, 'schemas'],
    queryFn: async () => {
      if (!watchedValues.sourceConnectionId) return [];
      const response = await fetch(`/api/connections/${watchedValues.sourceConnectionId}/schemas`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    },
    enabled: !!watchedValues.sourceConnectionId
  });

  // Fetch source objects (tables)
  const { data: sourceObjects = [] } = useQuery({
    queryKey: ['/api/connections', watchedValues.sourceConnectionId, 'schemas', watchedValues.sourceSchemaName, 'tables'],
    queryFn: async () => {
      if (!watchedValues.sourceConnectionId || !watchedValues.sourceSchemaName) return [];
      const response = await fetch(`/api/connections/${watchedValues.sourceConnectionId}/schemas/${watchedValues.sourceSchemaName}/tables`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    },
    enabled: !!watchedValues.sourceConnectionId && !!watchedValues.sourceSchemaName
  });

  // Fetch target schemas
  const { data: targetSchemas = [] } = useQuery({
    queryKey: ['/api/connections', watchedValues.targetConnectionId, 'schemas'],
    queryFn: async () => {
      if (!watchedValues.targetConnectionId) return [];
      const response = await fetch(`/api/connections/${watchedValues.targetConnectionId}/schemas`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    },
    enabled: !!watchedValues.targetConnectionId
  });

  // Fetch target objects (tables)
  const { data: targetObjects = [] } = useQuery({
    queryKey: ['/api/connections', watchedValues.targetConnectionId, 'schemas', watchedValues.targetSchemaName, 'tables'],
    queryFn: async () => {
      if (!watchedValues.targetConnectionId || !watchedValues.targetSchemaName) return [];
      const response = await fetch(`/api/connections/${watchedValues.targetConnectionId}/schemas/${watchedValues.targetSchemaName}/tables`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json() as string[];
    },
    enabled: !!watchedValues.targetConnectionId && !!watchedValues.targetSchemaName
  });

  // Auto-select connection when editing based on schema name
  useEffect(() => {
    if (entry && connections.length > 0 && !watchedValues.sourceConnectionId) {
      // For now, default to the first connection since we don't have connectionId stored
      // In a real scenario, you'd have a mapping or query to find the right connection
      const defaultConnection = connections[0];
      if (defaultConnection) {
        form.setValue('sourceConnectionId', defaultConnection.config_key);
        // The source system will be set based on the connection
        form.setValue('sourceSystem', defaultConnection.source_system);
      }
    }
  }, [entry, connections, watchedValues.sourceConnectionId, form]);

  // Auto-fetch metadata when source object is selected
  useEffect(() => {
    const fetchColumnMetadata = async () => {
      if (!watchedValues.sourceConnectionId || !watchedValues.sourceSchemaName || !watchedValues.sourceTableName) {
        setColumns([]);
        return;
      }

      setIsLoadingMetadata(true);
      try {
        const response = await fetch(`/api/connections/${watchedValues.sourceConnectionId}/schemas/${watchedValues.sourceSchemaName}/tables/${watchedValues.sourceTableName}/metadata`);
        if (!response.ok) throw new Error('Network response was not ok');
        const metadata = await response.json() as ColumnMetadata[];

        // Use the real metadata from the database
        setColumns(metadata);
      } catch (error) {
        console.error('Error fetching column metadata:', error);
        toast({
          title: "Error",
          description: "Failed to fetch column metadata",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchColumnMetadata();
  }, [watchedValues.sourceConnectionId, watchedValues.sourceSchemaName, watchedValues.sourceTableName, toast]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof dataDictionarySchema>) => {
      if (entry) {
        // EDITING MODE: Update the existing entry
        const entryData = {
          configKey: entry.configKey || 1,
          executionLayer: (data.executionLayer || '').substring(0, 50),
          schemaName: (data.sourceSchemaName || '').substring(0, 100),
          tableName: (data.sourceTableName || '').substring(0, 100),
          attributeName: (columns[0]?.attributeName || entry.attributeName || '').substring(0, 100),
          dataType: (columns[0]?.dataType || entry.dataType || '').substring(0, 50),
          length: columns[0]?.length || entry.length || null,
          precisionValue: columns[0]?.precision || entry.precisionValue || null,
          scale: columns[0]?.scale || entry.scale || null,
          isNotNull: columns[0]?.isNotNull ? 'Y' : 'N',
          isPrimaryKey: columns[0]?.isPrimaryKey ? 'Y' : 'N',
          isForeignKey: columns[0]?.isForeignKey ? 'Y' : 'N',
          columnDescription: (columns[0]?.columnDescription || entry.columnDescription || '').substring(0, 150),
          activeFlag: entry.activeFlag || 'Y',
          createdBy: entry.createdBy || 'User',
          updatedBy: 'User',
        };

        const response = await fetch(`/api/data-dictionary/${entry.dataDictionaryKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update entry');
        }

        return response.json();
      } else {
        // CREATION MODE: Create new entries for each column
        const promises = columns.map(column => {
          const entryData = {
            configKey: 1,
            executionLayer: (data.executionLayer || '').substring(0, 50),
            schemaName: (data.sourceSchemaName || '').substring(0, 100),
            tableName: (data.sourceTableName || '').substring(0, 100),
            attributeName: (column.attributeName || '').substring(0, 100),
            dataType: (column.dataType || '').substring(0, 50),
            length: column.length || null,
            precisionValue: column.precision || null,
            scale: column.scale || null,
            isNotNull: column.isNotNull ? 'Y' : 'N',
            isPrimaryKey: column.isPrimaryKey ? 'Y' : 'N',
            isForeignKey: column.isForeignKey ? 'Y' : 'N',
            columnDescription: (column.columnDescription || '').substring(0, 150),
            activeFlag: 'Y',
            createdBy: 'User',
            updatedBy: 'User',
          };

          return fetch('/api/data-dictionary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
          }).then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to save entry');
            }
            return response.json();
          });
        });

        return Promise.all(promises);
      }
    },
    onSuccess: () => {
      // Invalidate all data dictionary related queries
      queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] });
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: `Data dictionary ${entry ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${entry ? 'update' : 'create'} data dictionary: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateColumn = (index: number, field: keyof ColumnMetadata, value: any) => {
    setColumns(prev => prev.map((col, i) => 
      i === index ? { ...col, [field]: value } : col
    ));
  };

  const onSubmit = (data: z.infer<typeof dataDictionarySchema>) => {
    saveMutation.mutate(data);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Top Section - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
          {/* Left Column - Source */}
          <Card className="shadow-lg w-full max-w-none">
            <CardHeader className="bg-blue-50 dark:bg-blue-950 py-3">
              <CardTitle className="text-blue-700 dark:text-blue-300 text-sm">🔹 Source Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Select Layer */}
              <div className="space-y-2">
                <Label htmlFor="execution-layer" className="flex items-center gap-2">
                  Select Layer
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Processing layer where this table belongs (Bronze, Silver, Gold).</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={watchedValues.executionLayer}
                  onValueChange={(value) => form.setValue('executionLayer', value)}
                >
                  <SelectTrigger data-testid="select-execution-layer">
                    <SelectValue placeholder="Select execution layer" />
                  </SelectTrigger>
                  <SelectContent>
                    {executionLayers.map((layer) => (
                      <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source System */}
              <div className="space-y-2">
                <Label htmlFor="source-system">Source System</Label>
                <Select
                  value={watchedValues.sourceSystem}
                  onValueChange={(value) => form.setValue('sourceSystem', value)}
                >
                  <SelectTrigger data-testid="select-source-system">
                    <SelectValue placeholder="Select source system" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceSystems.map((system) => (
                      <SelectItem key={system} value={system}>{system}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source Connection */}
              <div className="space-y-2">
                <Label htmlFor="source-connection">Source Connection</Label>
                <Select
                  value={watchedValues.sourceConnectionId?.toString() || ""}
                  onValueChange={(value) => form.setValue('sourceConnectionId', parseInt(value))}
                >
                  <SelectTrigger data-testid="select-source-connection">
                    <SelectValue placeholder="Select source connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.connectionId} value={conn.connectionId.toString()}>
                        {conn.connectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source Schema */}
              <div className="space-y-2">
                <Label htmlFor="source-schema" className="flex items-center gap-2">
                  Source Schema
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Name of the database schema.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={watchedValues.sourceSchemaName}
                  onValueChange={(value) => form.setValue('sourceSchemaName', value)}
                >
                  <SelectTrigger data-testid="select-source-schema">
                    <SelectValue placeholder="Select source schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceSchemas.map((schema) => (
                      <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source Object */}
              <div className="space-y-2">
                <Label htmlFor="source-object" className="flex items-center gap-2">
                  Source Object
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Name of the database table.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={watchedValues.sourceTableName}
                  onValueChange={(value) => form.setValue('sourceTableName', value)}
                >
                  <SelectTrigger data-testid="select-source-object">
                    <SelectValue placeholder="Select source object" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceObjects.map((object) => (
                      <SelectItem key={object} value={object}>{object}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>



          {/* Right Column - Target */}
          <Card className="shadow-lg w-full max-w-none">
            <CardHeader className="bg-green-50 dark:bg-green-950 py-3">
              <CardTitle className="text-green-700 dark:text-green-300 text-sm">🔹 Target Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Target System */}
              <div className="space-y-2">
                <Label htmlFor="target-system">Target System</Label>
                <Select
                  value={watchedValues.targetSystem}
                  onValueChange={(value) => form.setValue('targetSystem', value)}
                >
                  <SelectTrigger data-testid="select-target-system">
                    <SelectValue placeholder="Select target system" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceSystems.map((system) => (
                      <SelectItem key={system} value={system}>{system}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Connection */}
              <div className="space-y-2">
                <Label htmlFor="target-connection">Target Connection</Label>
                <Select
                  value={watchedValues.targetConnectionId?.toString() || ""}
                  onValueChange={(value) => form.setValue('targetConnectionId', parseInt(value))}
                >
                  <SelectTrigger data-testid="select-target-connection">
                    <SelectValue placeholder="Select target connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.connectionId} value={conn.connectionId.toString()}>
                        {conn.connectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Layer */}
              <div className="space-y-2">
                <Label htmlFor="target-layer">Target Layer</Label>
                <Select
                  value={watchedValues.targetLayer || ""}
                  onValueChange={(value) => form.setValue('targetLayer', value)}
                >
                  <SelectTrigger data-testid="select-target-layer">
                    <SelectValue placeholder="Select target layer" />
                  </SelectTrigger>
                  <SelectContent>
                    {executionLayers.map((layer) => (
                      <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Schema */}
              <div className="space-y-2">
                <Label htmlFor="target-schema" className="flex items-center gap-2">
                  Target Schema
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Name of the database schema.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={watchedValues.targetSchemaName}
                  onValueChange={(value) => form.setValue('targetSchemaName', value)}
                >
                  <SelectTrigger data-testid="select-target-schema">
                    <SelectValue placeholder="Select target schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetSchemas.map((schema) => (
                      <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Object */}
              <div className="space-y-2">
                <Label htmlFor="target-object" className="flex items-center gap-2">
                  Target Object
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Name of the database table.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                {showAddTargetObject ? (
                  <div className="flex space-x-2">
                    <Input
                      value={newTargetObject}
                      onChange={(e) => setNewTargetObject(e.target.value)}
                      placeholder="Enter new target object name"
                      data-testid="input-new-target-object"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newTargetObject.trim()) {
                          form.setValue('targetTableName', newTargetObject.trim());
                          setShowAddTargetObject(false);
                          setNewTargetObject("");
                        }
                      }}
                      data-testid="button-save-target-object"
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddTargetObject(false);
                        setNewTargetObject("");
                      }}
                      data-testid="button-cancel-target-object"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Select
                      value={watchedValues.targetTableName}
                      onValueChange={(value) => form.setValue('targetTableName', value)}
                    >
                      <SelectTrigger data-testid="select-target-object">
                        <SelectValue placeholder="Select target object" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetObjects.map((object) => (
                          <SelectItem key={object} value={object}>{object}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddTargetObject(true)}
                      data-testid="button-add-target-object"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Metadata Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Column Metadata
              {isLoadingMetadata && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching metadata...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!watchedValues.sourceTableName ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No source object selected</h3>
                <p className="text-gray-500">Select a source object above to view and manage column metadata</p>
              </div>
            ) : columns.length === 0 && !isLoadingMetadata ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No columns found</h3>
                <p className="text-gray-500">The selected object doesn't have any columns or metadata couldn't be fetched</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Attribute Name
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Name of the column/field.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Data Type
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Data type of the column (e.g., VARCHAR, INT, DATE).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Precision
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total number of digits for numeric fields.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Length
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Maximum length allowed for the column (if applicable).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Scale
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Number of digits after the decimal point (for numeric fields).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Primary Key
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marks column as part of the primary key (Y/N).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Foreign Key
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marks column as a foreign key (Y/N).</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>Foreign Key Table</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Column Description
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Business-friendly description of the column.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((column, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {column.attributeName}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={column.dataType}
                            onChange={(e) => updateColumn(index, 'dataType', e.target.value)}
                            className="w-24"
                            data-testid={`input-data-type-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={column.precision || ''}
                            onChange={(e) => updateColumn(index, 'precision', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-20"
                            data-testid={`input-precision-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={column.length || ''}
                            onChange={(e) => updateColumn(index, 'length', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-20"
                            data-testid={`input-length-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={column.scale || ''}
                            onChange={(e) => updateColumn(index, 'scale', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-20"
                            data-testid={`input-scale-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={column.isPrimaryKey}
                            onCheckedChange={(checked) => updateColumn(index, 'isPrimaryKey', checked)}
                            data-testid={`switch-primary-key-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={column.isForeignKey}
                            onCheckedChange={(checked) => updateColumn(index, 'isForeignKey', checked)}
                            data-testid={`switch-foreign-key-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          {column.isForeignKey && (
                            <Select
                              value={column.foreignKeyTable || ""}
                              onValueChange={(value) => updateColumn(index, 'foreignKeyTable', value)}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-foreign-table-${index}`}>
                                <SelectValue placeholder="Select table" />
                              </SelectTrigger>
                              <SelectContent>
                                {sourceObjects.map((table) => (
                                  <SelectItem key={table} value={table}>{table}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={column.columnDescription}
                            onChange={(e) => updateColumn(index, 'columnDescription', e.target.value)}
                            placeholder="Enter column description..."
                            className="min-h-[60px] resize-none"
                            maxLength={1000}
                            data-testid={`textarea-description-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`button-actions-${index}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                // Edit functionality - focus on the data type field for this row with a small delay
                                setTimeout(() => {
                                  const dataTypeInput = document.querySelector(`[data-testid="input-data-type-${index}"]`) as HTMLInputElement;
                                  if (dataTypeInput) {
                                    dataTypeInput.focus();
                                    dataTypeInput.select(); // Select the text for easy editing
                                  }
                                }, 100);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Column
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // Add new column after this one
                                const newColumn: ColumnMetadata = {
                                  attributeName: `new_column_${columns.length + 1}`,
                                  dataType: "varchar",
                                  precision: undefined,
                                  length: undefined,
                                  scale: undefined,
                                  isPrimaryKey: false,
                                  isForeignKey: false,
                                  foreignKeyTable: undefined,
                                  columnDescription: "",
                                  isNotNull: false, // Default value for new column
                                };
                                setColumns(prev => [
                                  ...prev.slice(0, index + 1),
                                  newColumn,
                                  ...prev.slice(index + 1)
                                ]);
                              }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Column After
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this column?')) {
                                    setColumns(prev => prev.filter((_, i) => i !== index));
                                  }
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Column
                              </DropdownMenuItem>
                              <div className="border-t my-1"></div>
                              <DropdownMenuItem onClick={() => {
                                // Clear the description and force re-render
                                updateColumn(index, 'columnDescription', '');
                                // Focus on the description textarea after clearing
                                setTimeout(() => {
                                  const descriptionTextarea = document.querySelector(`[data-testid="textarea-description-${index}"]`) as HTMLTextAreaElement;
                                  if (descriptionTextarea) {
                                    descriptionTextarea.focus();
                                  }
                                }, 100);
                              }}>
                                Clear Description
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateColumn(index, 'isPrimaryKey', false)}>
                                Remove Primary Key
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateColumn(index, 'isForeignKey', false)}>
                                Remove Foreign Key
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateColumn(index, 'isNotNull', false)}>
                                Set Nullable
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-form"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending || columns.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-form"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {entry ? "Update Entry" : "Save Configuration"}
              </>
            )}
          </Button>
        </div>
        </form>
      </div>
    </TooltipProvider>
  );
}