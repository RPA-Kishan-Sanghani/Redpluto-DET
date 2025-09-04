import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import type { DataDictionaryRecord } from '@shared/schema';

interface DataDictionaryFilters {
  search: string;
  executionLayer: string;
  schemaName: string;
  tableName: string;
  sourceSystem: string;
}

export function DataDictionary() {
  const [filters, setFilters] = useState<DataDictionaryFilters>({
    search: '',
    executionLayer: 'all',
    schemaName: 'all',
    tableName: 'all',
    sourceSystem: 'all'
  });

  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data dictionary entries
  const { data: allEntries = [], isLoading, error } = useQuery({
    queryKey: ['/api/data-dictionary', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.executionLayer && filters.executionLayer !== 'all') {
        params.append('executionLayer', filters.executionLayer);
      }
      if (filters.schemaName && filters.schemaName !== 'all') {
        params.append('schemaName', filters.schemaName);
      }
      if (filters.tableName && filters.tableName !== 'all') {
        params.append('tableName', filters.tableName);
      }
      if (filters.sourceSystem && filters.sourceSystem !== 'all') {
        params.append('sourceSystem', filters.sourceSystem);
      }

      const response = await fetch(`/api/data-dictionary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data dictionary entries');
      }
      return response.json();
    }
  });

  // Pagination
  const {
    currentData: entries,
    currentPage,
    totalPages,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
  } = usePagination({
    data: allEntries,
    itemsPerPage: 10,
  });

  // Fetch source systems for filter
  const { data: sourceSystems = [] } = useQuery({
    queryKey: ['/api/metadata/source_system'],
    queryFn: async () => {
      const response = await fetch('/api/metadata/source_system');
      if (!response.ok) throw new Error('Failed to fetch source systems');
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
      toast({
        title: 'Success',
        description: 'Data dictionary entry deleted successfully',
      });
    }
  });

  const handleEdit = (entry: DataDictionaryRecord) => {
    // Navigate to edit page with the entry ID
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Dictionary</h1>
            <p className="text-gray-600">Manage metadata and schema information for all data pipelines</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] })}
              data-testid="button-refresh-entries"
            >
              Refresh
            </Button>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-entry">
              <Plus className="h-4 w-4" />Add Dictionary Config
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by attribute name..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                  data-testid="input-search-entries"
                />
              </div>

              <Select value={filters.executionLayer || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, executionLayer: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-execution-layer-filter">
                  <SelectValue placeholder="Execution Layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.schemaName || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, schemaName: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-schema-filter">
                  <SelectValue placeholder="Schema Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schemas</SelectItem>
                  <SelectItem value="bronze">bronze</SelectItem>
                  <SelectItem value="silver">silver</SelectItem>
                  <SelectItem value="gold">gold</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                  <SelectItem value="raw">raw</SelectItem>
                  <SelectItem value="public">public</SelectItem>
                  <SelectItem value="dbo">dbo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.tableName || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, tableName: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-object-filter">
                  <SelectValue placeholder="Object Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Objects</SelectItem>
                  <SelectItem value="customers">customers</SelectItem>
                  <SelectItem value="orders">orders</SelectItem>
                  <SelectItem value="products">products</SelectItem>
                  <SelectItem value="transactions">transactions</SelectItem>
                  <SelectItem value="users">users</SelectItem>
                  <SelectItem value="sales">sales</SelectItem>
                  <SelectItem value="inventory">inventory</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sourceSystem || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, sourceSystem: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-system-filter">
                  <SelectValue placeholder="System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  <SelectItem value="MySQL">MySQL</SelectItem>
                  <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                  <SelectItem value="SQL Server">SQL Server</SelectItem>
                  <SelectItem value="Oracle">Oracle</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="Parquet">Parquet</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardContent className="pt-6 px-0">
            {isLoading ? (
              <div className="text-center py-8 px-6">
                <p className="text-gray-500">Loading data dictionary entries...</p>
              </div>
            ) : allEntries.length === 0 ? (
              <div className="text-center py-8 px-6">
                <Search className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
                <p className="text-gray-500 mb-4">Add your first data dictionary entry to get started.</p>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dictionary Key</TableHead>
                        <TableHead>Attribute Name</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Length</TableHead>
                        <TableHead>Precision</TableHead>
                        <TableHead>Scale</TableHead>
                        <TableHead>Schema</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Execution Layer</TableHead>
                        <TableHead>Primary Key</TableHead>
                        <TableHead>Not Null</TableHead>
                        <TableHead>Foreign Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Updated By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(entries as DataDictionaryRecord[]).map((entry: DataDictionaryRecord) => (
                        <TableRow key={entry.dataDictionaryKey} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {entry.dataDictionaryKey}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-entry-name-${entry.dataDictionaryKey}`}>
                              {entry.attributeName}
                            </span>
                          </TableCell>
                          <TableCell>{entry.dataType}</TableCell>
                          <TableCell>{entry.length || '-'}</TableCell>
                          <TableCell>{entry.precisionValue || '-'}</TableCell>
                          <TableCell>{entry.scale || '-'}</TableCell>
                          <TableCell>{entry.schemaName || '-'}</TableCell>
                          <TableCell>{entry.tableName || '-'}</TableCell>
                          <TableCell>
                            {entry.executionLayer && (
                              <Badge variant="outline" className="capitalize">
                                {entry.executionLayer}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.isPrimaryKey === 'Y' ? 'default' : 'secondary'}>
                              {entry.isPrimaryKey === 'Y' ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.isNotNull === 'Y' ? 'default' : 'secondary'}>
                              {entry.isNotNull === 'Y' ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.isForeignKey === 'Y' ? 'default' : 'secondary'}>
                              {entry.isForeignKey === 'Y' ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.activeFlag === 'Y' ? 'default' : 'secondary'}>
                              {entry.activeFlag === 'Y' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={entry.columnDescription || ''}>
                              {entry.columnDescription || '-'}
                            </div>
                          </TableCell>
                          <TableCell>{entry.createdBy || 'System'}</TableCell>
                          <TableCell>{entry.updatedBy || 'System'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
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
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {allEntries.length > 0 && (
                  <div className="px-6">
                    <DataPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={10}
                      onPageChange={setCurrentPage}
                      canNextPage={canNextPage}
                      canPrevPage={canPrevPage}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </main>
      </div>
    );
  }