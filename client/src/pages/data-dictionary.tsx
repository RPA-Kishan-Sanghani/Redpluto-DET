import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataDictionaryForm } from "../components/data-dictionary-form";
import Header from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from '@/hooks/use-pagination';
import { DataPagination } from '@/components/ui/data-pagination';
import type { DataDictionaryRecord } from '@shared/schema';

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
  const [openEntries, setOpenEntries] = useState<Set<number>>(new Set());
  const [editingEntry, setEditingEntry] = useState<DataDictionaryRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      if (filters.configKey) params.append('configKey', filters.configKey);

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
    setEditingEntry(entry);
    setIsFormOpen(true);
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Dictionary</h1>
          <p className="text-gray-600">Manage metadata and schema information for all data pipelines</p>
        </div>

        {/* Add Entry Button */}
        <div className="flex justify-end mb-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-dictionary'] })}
              data-testid="button-refresh-entries"
            >
              Refresh
            </Button>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-entry">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <Input
                placeholder="Config Key..."
                value={filters.configKey}
                onChange={(e) => setFilters(prev => ({ ...prev, configKey: e.target.value }))}
                data-testid="input-config-key-filter"
              />

              <Select value="all" onValueChange={() => {}}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Y">Active</SelectItem>
                  <SelectItem value="N">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        <Card>
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
                  <CardContent>
                    {entries.map((entry: DataDictionaryRecord) => (
                      <Collapsible
                        key={entry.dataDictionaryKey}
                        open={openEntries.has(entry.dataDictionaryKey)}
                        onOpenChange={() => toggleEntry(entry.dataDictionaryKey)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  {openEntries.has(entry.dataDictionaryKey) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <div>
                                    <h3 className="text-lg font-semibold">{entry.attributeName}</h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                      <span>Key: {entry.dataDictionaryKey}</span>
                                      <span>Config: {entry.configKey}</span>
                                      <Badge variant={
                                        entry.executionLayer === 'Bronze' ? 'secondary' :
                                        entry.executionLayer === 'Silver' ? 'default' :
                                        entry.executionLayer === 'Gold' ? 'outline' : 'secondary'
                                      }>
                                        {entry.executionLayer}
                                      </Badge>
                                      <span>{entry.dataType}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={entry.activeFlag === 'Y' ? 'default' : 'secondary'}>
                                    {entry.activeFlag === 'Y' ? 'Active' : 'Inactive'}
                                  </Badge>
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
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Schema:</span> {entry.schemaName || 'N/A'}</div>
                                    <div><span className="text-gray-500">Table:</span> {entry.tableName || 'N/A'}</div>
                                    <div><span className="text-gray-500">Data Type:</span> {entry.dataType}</div>
                                    <div><span className="text-gray-500">Length:</span> {entry.length || 'N/A'}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Precision:</span> {entry.precisionValue || 'N/A'}</div>
                                    <div><span className="text-gray-500">Scale:</span> {entry.scale || 'N/A'}</div>
                                    <div>
                                      <span className="text-gray-500">Primary Key:</span>{' '}
                                      <Badge variant={entry.isPrimaryKey ? 'default' : 'secondary'} className="ml-1">
                                        {entry.isPrimaryKey ? 'Yes' : 'No'}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Not Null:</span>{' '}
                                      <Badge variant={entry.isNotNull ? 'destructive' : 'secondary'} className="ml-1">
                                        {entry.isNotNull ? 'Yes' : 'No'}
                                      </Badge>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Foreign Key:</span>{' '}
                                      <Badge variant={entry.isForeignKey ? 'default' : 'secondary'} className="ml-1">
                                        {entry.isForeignKey ? 'Yes' : 'No'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="text-gray-500">Created By:</span> {entry.createdBy || 'System'}</div>
                                    <div><span className="text-gray-500">Updated By:</span> {entry.updatedBy || 'System'}</div>
                                    <div><span className="text-gray-500">Created:</span> {entry.insertDate ? new Date(entry.insertDate).toLocaleDateString() : 'N/A'}</div>
                                    <div><span className="text-gray-500">Updated:</span> {entry.updateDate ? new Date(entry.updateDate).toLocaleDateString() : 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                              {entry.columnDescription && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                                  <p className="text-sm text-gray-600">{entry.columnDescription}</p>
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
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
                  </CardContent>
                )}
              </div>
            </Card>
        </main>

        {/* Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Data Dictionary Entry' : 'Add New Data Dictionary Entry'}
              </DialogTitle>
            </DialogHeader>
            <DataDictionaryForm
              entry={editingEntry}
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }