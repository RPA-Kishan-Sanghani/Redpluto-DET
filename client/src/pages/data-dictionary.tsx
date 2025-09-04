import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Filter, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DataDictionaryRecord } from '@shared/schema';

interface TableGroup {
  tableName: string;
  schemaName: string;
  executionLayer: string;
  entryCount: number;
  entries: DataDictionaryRecord[];
}

interface ExpandedRowState {
  [key: string]: boolean;
}

interface TableMetadata {
  attributeName: string;
  dataType: string;
  precision?: number;
  length?: number;
  scale?: number;
  isPrimaryKey: string;
  isForeignKey: string;
  foreignKeyTable?: string;
  columnDescription: string;
  isNotNull: string;
  dataDictionaryKey: number;
}

export function DataDictionary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [layerFilter, setLayerFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<ExpandedRowState>({});
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all data dictionary entries
  const { data: allEntries = [], isLoading, error } = useQuery({
    queryKey: ['/api/data-dictionary'],
    queryFn: async () => {
      const response = await fetch('/api/data-dictionary');
      if (!response.ok) {
        throw new Error('Failed to fetch data dictionary entries');
      }
      return response.json();
    }
  });

  // Group entries by table name for expandable rows
  const groupedTables: TableGroup[] = allEntries.reduce((acc: TableGroup[], entry: DataDictionaryRecord) => {
    const key = `${entry.schemaName || 'Unknown'}.${entry.tableName || 'Unknown'}`;
    const existingGroup = acc.find(group => 
      group.tableName === entry.tableName && group.schemaName === (entry.schemaName || 'Unknown')
    );
    
    if (existingGroup) {
      existingGroup.entries.push(entry);
      existingGroup.entryCount++;
    } else {
      acc.push({
        tableName: entry.tableName || 'Unknown',
        schemaName: entry.schemaName || 'Unknown',
        executionLayer: entry.executionLayer || 'Unknown',
        entryCount: 1,
        entries: [entry]
      });
    }
    return acc;
  }, []);

  // Filter tables based on search and layer filter
  const filteredTables = groupedTables.filter(table => {
    const matchesSearch = !searchTerm || 
      table.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.schemaName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLayer = layerFilter === 'all' || table.executionLayer === layerFilter;
    return matchesSearch && matchesLayer;
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/data-dictionary/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] });
      toast({
        title: 'Success',
        description: 'Data dictionary entry deleted successfully',
      });
    }
  });

  const handleEdit = (entry: DataDictionaryRecord) => {
    setLocation(`/data-dictionary/form/${entry.dataDictionaryKey}`);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this data dictionary entry?')) {
      await deleteEntryMutation.mutateAsync(id);
    }
  };

  const handleAdd = () => {
    setLocation('/data-dictionary/form');
  };

  const toggleRowExpansion = (tableKey: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [tableKey]: !prev[tableKey]
    }));
  };

  const getTableKey = (table: TableGroup) => `${table.schemaName}.${table.tableName}`;

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading data dictionary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading data dictionary</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Dictionary</h1>
            <p className="text-sm text-gray-600">Manage metadata and schema information for all data objects</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] })}
              data-testid="button-refresh-entries"
              size="sm"
            >
              Refresh
            </Button>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-entry" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tables or schemas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-tables"
            />
          </div>
          
          <Select value={layerFilter} onValueChange={setLayerFilter}>
            <SelectTrigger className="w-48" data-testid="select-layer-filter">
              <SelectValue placeholder="Filter by layer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              <SelectItem value="Bronze">Bronze</SelectItem>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-gray-500">
            {filteredTables.length} table{filteredTables.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="bg-white mx-6 my-4 rounded-lg border border-gray-200 shadow-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Table Name</TableHead>
                  <TableHead>Execution Layer</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.map((table) => {
                  const tableKey = getTableKey(table);
                  const isExpanded = expandedRows[tableKey];
                  
                  return (
                    <>
                      {/* Main Table Row */}
                      <TableRow 
                        key={tableKey}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRowExpansion(tableKey)}
                        data-testid={`row-table-${tableKey}`}
                      >
                        <TableCell>
                          <div className="p-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{table.schemaName}</TableCell>
                        <TableCell className="font-medium">{table.tableName}</TableCell>
                        <TableCell>
                          <Badge variant={
                            table.executionLayer === 'Gold' ? 'default' :
                            table.executionLayer === 'Silver' ? 'secondary' : 'outline'
                          }>
                            {table.executionLayer}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {table.entryCount} column{table.entryCount !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(table.entries[0]);
                              }}
                              data-testid={`button-edit-${tableKey}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row with Column Metadata */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 bg-gray-50">
                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Column Metadata</h4>
                              <div className="bg-white rounded border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-50">
                                      <TableHead>Attribute Name</TableHead>
                                      <TableHead>Data Type</TableHead>
                                      <TableHead>Length</TableHead>
                                      <TableHead>Precision</TableHead>
                                      <TableHead>Scale</TableHead>
                                      <TableHead>Primary Key</TableHead>
                                      <TableHead>Foreign Key</TableHead>
                                      <TableHead>Not Null</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {table.entries.map((entry) => (
                                      <TableRow key={entry.dataDictionaryKey} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{entry.attributeName}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{entry.dataType}</Badge>
                                        </TableCell>
                                        <TableCell>{entry.length || '-'}</TableCell>
                                        <TableCell>{entry.precisionValue || '-'}</TableCell>
                                        <TableCell>{entry.scale || '-'}</TableCell>
                                        <TableCell>
                                          <Badge variant={entry.isPrimaryKey === 'Y' ? 'default' : 'secondary'}>
                                            {entry.isPrimaryKey === 'Y' ? 'Yes' : 'No'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={entry.isForeignKey === 'Y' ? 'default' : 'secondary'}>
                                            {entry.isForeignKey === 'Y' ? 'Yes' : 'No'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={entry.isNotNull === 'Y' ? 'default' : 'secondary'}>
                                            {entry.isNotNull === 'Y' ? 'Yes' : 'No'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-48 truncate" title={entry.columnDescription || ''}>
                                          {entry.columnDescription || '-'}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex space-x-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEdit(entry)}
                                              data-testid={`button-edit-entry-${entry.dataDictionaryKey}`}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDelete(entry.dataDictionaryKey)}
                                              data-testid={`button-delete-entry-${entry.dataDictionaryKey}`}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>

            {filteredTables.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No tables found matching your criteria</p>
                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}