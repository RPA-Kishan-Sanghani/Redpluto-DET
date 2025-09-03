import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, X, MoreVertical, Loader2, Edit, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const dataDictionarySchema = z.object({
  executionLayer: z.string().min(1, "Layer is required"),
  sourceSystem: z.string().min(1, "Source system is required"),
  sourceConnectionId: z.number().min(1, "Source connection is required"),
  sourceSchemaName: z.string().min(1, "Source schema is required"),
  sourceTableName: z.string().min(1, "Source object is required"),
  targetSystem: z.string().min(1, "Target system is required"),
  targetConnectionId: z.number().min(1, "Target connection is required"),
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
      targetSchemaName: "",
      targetTableName: "",
    },
  });

  // Populate form with existing entry data when editing
  useEffect(() => {
    if (entry) {
      form.reset({
        executionLayer: entry.executionLayer || "",
        sourceSystem: "",
        sourceConnectionId: 0,
        sourceSchemaName: entry.schemaName || "",
        sourceTableName: entry.tableName || "",
        targetSystem: "",
        targetConnectionId: 0,
        targetSchemaName: "",
        targetTableName: "",
      });

      // Populate columns with existing entry data
      const existingColumn: ColumnMetadata = {
        attributeName: entry.attributeName || "",
        dataType: entry.dataType || "",
        length: entry.length || undefined,
        precision: entry.precisionValue || undefined,
        scale: entry.scale || undefined,
        isPrimaryKey: entry.isPrimaryKey || false,
        isForeignKey: entry.isForeignKey || false,
        columnDescription: entry.columnDescription || "",
      };
      setColumns([existingColumn]);
    }
  }, [entry, form]);

  // Watch form values for cascading dropdowns
  const watchedValues = form.watch();

  // Fetch execution layers
  const { data: executionLayers = [] } = useQuery({
    queryKey: ['/api/metadata/execution_layer'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/execution_layer');
      return await response.json() as string[];
    }
  });

  // Fetch source systems
  const { data: sourceSystems = [] } = useQuery({
    queryKey: ['/api/metadata/source_system'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/source_system');
      return await response.json() as string[];
    }
  });

  // Fetch connections
  const { data: connections = [] } = useQuery({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      return await response.json() as any[];
    }
  });

  // Fetch source schemas
  const { data: sourceSchemas = [] } = useQuery({
    queryKey: ['/api/connections', watchedValues.sourceConnectionId, 'schemas'],
    queryFn: async () => {
      if (!watchedValues.sourceConnectionId) return [];
      const response = await fetch(`/api/connections/${watchedValues.sourceConnectionId}/schemas`);
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
      return await response.json() as string[];
    },
    enabled: !!watchedValues.targetConnectionId && !!watchedValues.targetSchemaName
  });

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
      // Save each column as a separate data dictionary entry
      const promises = columns.map(column => {
        const entryData = {
          configKey: 1, // Default config key - you may want to make this dynamic
          executionLayer: data.executionLayer,
          schemaName: data.sourceSchemaName,
          tableName: data.sourceTableName,
          attributeName: column.attributeName,
          dataType: column.dataType,
          length: column.length,
          precisionValue: column.precision,
          scale: column.scale,
          isNotNull: false, // Default value
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: column.isForeignKey,
          columnDescription: column.columnDescription,
          activeFlag: 'Y',
          createdBy: 'User',
          updatedBy: 'User',
        };

        // For editing, update the existing entry; for new entries, create new ones
        if (entry && columns.length === 1) {
          // If editing and only one column, update the existing entry
          const url = `/api/data-dictionary/${entry.dataDictionaryKey}`;
          return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
          });
        } else {
          // For new entries or multiple columns, create new entries
          return fetch('/api/data-dictionary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
          });
        }
      });

      await Promise.all(promises);
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
        description: `Failed to ${entry ? 'update' : 'create'} data dictionary`,
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
                <Label htmlFor="execution-layer">Select Layer</Label>
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
                <Label htmlFor="source-schema">Source Schema</Label>
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
                <Label htmlFor="source-object">Source Object</Label>
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

              {/* Target Schema */}
              <div className="space-y-2">
                <Label htmlFor="target-schema">Target Schema</Label>
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
                <Label htmlFor="target-object">Target Object</Label>
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
                      <TableHead>Attribute Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Precision</TableHead>
                      <TableHead>Length</TableHead>
                      <TableHead>Scale</TableHead>
                      <TableHead>Primary Key</TableHead>
                      <TableHead>Foreign Key</TableHead>
                      <TableHead>Foreign Key Table</TableHead>
                      <TableHead>Column Description</TableHead>
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
                {entry ? 'Update' : 'Save'} Dictionary Config
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}