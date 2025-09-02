import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import type { DataDictionaryRecord } from '@shared/schema';

interface DataDictionaryFilters {
  search: string;
  executionLayer: string;
  sourceSystem: string;
  targetSystem: string;
  customField: string;
  customValue: string;
}

export function DataDictionary() {
  const [filters, setFilters] = useState<DataDictionaryFilters>({
    search: '',
    executionLayer: 'all',
    sourceSystem: 'all',
    targetSystem: 'all',
    customField: 'all',
    customValue: ''
  });
  const [openEntries, setOpenEntries] = useState<Set<number>>(new Set());

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
      if (filters.sourceSystem && filters.sourceSystem !== 'all') {
        params.append('sourceSystem', filters.sourceSystem);
      }
      if (filters.targetSystem && filters.targetSystem !== 'all') {
        params.append('targetSystem', filters.targetSystem);
      }
      if (filters.customField && filters.customField !== 'all' && filters.customValue) {
        params.append('customField', filters.customField);
        params.append('customValue', filters.customValue);
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
    setLocation('/data-dictionary/form');
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this data dictionary entry?')) {
      await deleteEntryMutation.mutateAsync(id);
    }
  };

  const toggleEntry = (id: number) => {
    setOpenEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAdd = () => {
    setLocation('/data-dictionary/form');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

              <Select value={filters.sourceSystem || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, sourceSystem: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-source-system-filter">
                  <SelectValue placeholder="Source System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Source Systems</SelectItem>
                  {sourceSystems.map((system: string) => (
                    <SelectItem key={system} value={system}>{system}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.targetSystem || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, targetSystem: value === 'all' ? '' : value }))}>
                <SelectTrigger data-testid="select-target-system-filter">
                  <SelectValue placeholder="Target System" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Target Systems</SelectItem>
                  {sourceSystems.map((system: string) => (
                    <SelectItem key={system} value={system}>{system}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.customField || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, customField: value === 'all' ? '' : value, customValue: '' }))}>
                <SelectTrigger data-testid="select-custom-field-filter">
                  <SelectValue placeholder="Custom Filter Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Custom Filter</SelectItem>
                  <SelectItem value="attributeName">Attribute Name</SelectItem>
                  <SelectItem value="dataType">Data Type</SelectItem>
                  <SelectItem value="schemaName">Schema Name</SelectItem>
                  <SelectItem value="tableName">Table Name</SelectItem>
                  <SelectItem value="columnDescription">Description</SelectItem>
                  <SelectItem value="createdBy">Created By</SelectItem>
                  <SelectItem value="updatedBy">Updated By</SelectItem>
                  <SelectItem value="configKey">Config Key</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder={`Filter by ${filters.customField !== 'all' && filters.customField ? filters.customField.replace(/([A-Z])/g, ' $1').toLowerCase() : 'selected field'}...`}
                value={filters.customValue}
                onChange={(e) => setFilters(prev => ({ ...prev, customValue: e.target.value }))}
                disabled={!filters.customField || filters.customField === 'all'}
                className={!filters.customField || filters.customField === 'all' ? 'bg-gray-100' : ''}
                data-testid="input-custom-value-filter"
              />
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading data dictionary entries...</p>
                  </div>
                ) : allEntries.length === 0 ? (
                  <CardContent className="text-center py-8">
                    <Search className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
                    <p className="text-gray-500 mb-4">Add your first data dictionary entry to get started.</p>
                    <Button onClick={handleAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </CardContent>
                ) : (
                  <div className="space-y-4">
                    {(entries as DataDictionaryRecord[]).map((entry: DataDictionaryRecord) => (
                      <Card key={entry.dataDictionaryKey} className="overflow-hidden">
                        <Collapsible
                          open={openEntries.has(entry.dataDictionaryKey)}
                          onOpenChange={() => toggleEntry(entry.dataDictionaryKey)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <CardHeader className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-left">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <CardTitle className="text-lg" data-testid={`text-entry-name-${entry.dataDictionaryKey}`}>
                                        {entry.attributeName}
                                      </CardTitle>
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                        Dictionary Key: {entry.dataDictionaryKey}
                                      </Badge>
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        Config Key: {entry.configKey}
                                      </Badge>
                                      <Badge variant={entry.activeFlag === 'Y' ? 'default' : 'secondary'}>
                                        {entry.activeFlag === 'Y' ? 'Active' : 'Inactive'}
                                      </Badge>
                                      {entry.executionLayer && (
                                        <Badge variant="outline" className="capitalize">
                                          {entry.executionLayer}
                                        </Badge>
                                      )}
                                    </div>
                                    <CardDescription className="flex items-center space-x-4 mt-1">
                                      <span className="flex items-center">
                                        Data Type: {entry.dataType}
                                      </span>
                                      {entry.length && (
                                        <span className="flex items-center">
                                          Length: {entry.length}
                                        </span>
                                      )}
                                      {entry.schemaName && (
                                        <span className="flex items-center">
                                          Schema: {entry.schemaName}
                                        </span>
                                      )}
                                      {entry.tableName && (
                                        <span className="flex items-center">
                                          Table: {entry.tableName}
                                        </span>
                                      )}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(entry);
                                    }}
                                    data-testid={`button-edit-${entry.dataDictionaryKey}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(entry.dataDictionaryKey);
                                    }}
                                    data-testid={`button-delete-${entry.dataDictionaryKey}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  {openEntries.has(entry.dataDictionaryKey) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 border-t bg-gray-50 dark:bg-gray-900">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                {/* Basic Information */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Basic Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Schema:</span> {entry.schemaName || 'N/A'}</div>
                                    <div><span className="font-medium">Table:</span> {entry.tableName || 'N/A'}</div>
                                    <div><span className="font-medium">Data Type:</span> {entry.dataType}</div>
                                    <div><span className="font-medium">Length:</span> {entry.length || 'N/A'}</div>
                                  </div>
                                </div>

                                {/* Properties */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Properties</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Precision:</span> {entry.precisionValue || 'N/A'}</div>
                                    <div><span className="font-medium">Scale:</span> {entry.scale || 'N/A'}</div>
                                    <div><span className="font-medium">Primary Key:</span> {entry.isPrimaryKey ? 'Yes' : 'No'}</div>
                                    <div><span className="font-medium">Not Null:</span> {entry.isNotNull ? 'Yes' : 'No'}</div>
                                    <div><span className="font-medium">Foreign Key:</span> {entry.isForeignKey ? 'Yes' : 'No'}</div>
                                  </div>
                                </div>

                                {/* Metadata */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Metadata</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Created By:</span> {entry.createdBy || 'System'}</div>
                                    <div><span className="font-medium">Updated By:</span> {entry.updatedBy || 'System'}</div>
                                    <div><span className="font-medium">Created:</span> {entry.insertDate ? new Date(entry.insertDate).toLocaleDateString() : 'N/A'}</div>
                                    <div><span className="font-medium">Updated:</span> {entry.updateDate ? new Date(entry.updateDate).toLocaleDateString() : 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                              {entry.columnDescription && (
                                <div className="mt-4">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                                  <p className="text-sm text-gray-600">{entry.columnDescription}</p>
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}

                    {allEntries.length > 0 && (
                      <DataPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={10}
                        onPageChange={setCurrentPage}
                        canNextPage={canNextPage}
                        canPrevPage={canPrevPage}
                      />
                    )}
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
        </main>
      </div>
    );
  }