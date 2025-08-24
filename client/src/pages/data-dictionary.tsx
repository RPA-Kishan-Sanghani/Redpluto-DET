import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DataDictionaryForm } from "@/components/data-dictionary-form";
import Header from "@/components/header";
import type { DataDictionaryRecord } from "@shared/schema";

interface DataDictionaryFilters {
  search: string;
  executionLayer: string;
  configKey: string;
}

export function DataDictionary() {
  const [filters, setFilters] = useState<DataDictionaryFilters>({
    search: '',
    executionLayer: 'all',
    configKey: ''
  });
  const [editingEntry, setEditingEntry] = useState<DataDictionaryRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch data dictionary entries
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['/api/data-dictionary', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.executionLayer && filters.executionLayer !== 'all') {
        params.append('executionLayer', filters.executionLayer);
      }
      if (filters.configKey) params.append('configKey', filters.configKey);
      
      const response = await fetch(`/api/data-dictionary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data dictionary entries');
      }
      return response.json();
    }
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
    }
  });

  const handleEdit = (entry: DataDictionaryRecord) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this data dictionary entry?')) {
      await deleteEntryMutation.mutateAsync(id);
    }
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${isFormOpen ? 'w-1/2' : 'w-full'}`}>
          <main className="h-full overflow-auto">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Dictionary</h1>
                <p className="text-gray-600">Manage metadata and schema information for all data pipelines</p>
              </div>

              {/* Filters and Actions */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Data Dictionary Entries</CardTitle>
                    <Button onClick={handleAdd} data-testid="button-add-entry">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by attribute name..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full"
                        data-testid="input-search-entries"
                      />
                    </div>
                    
                    <Select 
                      value={filters.executionLayer} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, executionLayer: value }))}
                    >
                      <SelectTrigger data-testid="select-execution-layer">
                        <SelectValue placeholder="Execution Layer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Layers</SelectItem>
                        <SelectItem value="Bronze">Bronze</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Config Key"
                      value={filters.configKey}
                      onChange={(e) => setFilters(prev => ({ ...prev, configKey: e.target.value }))}
                      className="w-32"
                      data-testid="input-config-key"
                    />
                  </div>

                  {/* Data Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Config Key</TableHead>
                          <TableHead>Execution Layer</TableHead>
                          <TableHead>Schema</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Attribute</TableHead>
                          <TableHead>Data Type</TableHead>
                          <TableHead>Length</TableHead>
                          <TableHead>Primary Key</TableHead>
                          <TableHead>Not Null</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={12} className="text-center py-8">
                              Loading data dictionary entries...
                            </TableCell>
                          </TableRow>
                        ) : entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={12} className="text-center py-8">
                              <div className="text-gray-500">
                                <Search className="mx-auto h-12 w-12 mb-2 opacity-50" />
                                <p className="text-lg font-medium mb-1">No entries found</p>
                                <p className="text-sm">Add your first data dictionary entry to get started.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          entries.map((entry) => (
                            <TableRow key={entry.dataDictionaryKey} data-testid={`row-entry-${entry.dataDictionaryKey}`}>
                              <TableCell className="font-medium">{entry.dataDictionaryKey}</TableCell>
                              <TableCell>{entry.configKey}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  entry.executionLayer === 'Bronze' ? 'secondary' :
                                  entry.executionLayer === 'Silver' ? 'default' :
                                  entry.executionLayer === 'Gold' ? 'outline' : 'secondary'
                                }>
                                  {entry.executionLayer}
                                </Badge>
                              </TableCell>
                              <TableCell>{entry.schemaName || '-'}</TableCell>
                              <TableCell>{entry.tableName || '-'}</TableCell>
                              <TableCell className="font-medium">{entry.attributeName}</TableCell>
                              <TableCell>{entry.dataType}</TableCell>
                              <TableCell>{entry.length || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={entry.isPrimaryKey ? 'default' : 'secondary'}>
                                  {entry.isPrimaryKey ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={entry.isNotNull ? 'destructive' : 'secondary'}>
                                  {entry.isNotNull ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={entry.activeFlag === 'Y' ? 'default' : 'secondary'}>
                                  {entry.activeFlag}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(entry)}
                                    data-testid={`button-edit-${entry.dataDictionaryKey}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(entry.dataDictionaryKey)}
                                    data-testid={`button-delete-${entry.dataDictionaryKey}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Sidebar Form */}
        {isFormOpen && (
          <div className="w-1/2 border-l border-gray-200 bg-white shadow-lg">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                </h2>
                <Button variant="ghost" size="sm" onClick={handleFormClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                <DataDictionaryForm
                  entry={editingEntry}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormClose}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataDictionary;