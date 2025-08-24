import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Database, File, Cloud, Wifi, Settings, TestTube2, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import ConnectionForm from "@/components/connection-form";
import type { SourceConnection } from "@shared/schema";

const CONNECTION_CATEGORIES = [
  { id: 'all', label: 'All Connectors', icon: Settings },
  { id: 'database', label: 'Database Connectors', icon: Database },
  { id: 'file', label: 'File-based Connectors', icon: File },
  { id: 'cloud', label: 'Cloud Platforms', icon: Cloud },
  { id: 'api', label: 'APIs', icon: Wifi },
  { id: 'other', label: 'Other Platforms', icon: Settings },
];

const CONNECTION_TYPES = {
  'Database': { color: 'bg-blue-100 text-blue-800', icon: Database },
  'MySQL': { color: 'bg-blue-100 text-blue-800', icon: Database },
  'PostgreSQL': { color: 'bg-blue-100 text-blue-800', icon: Database },
  'SQL Server': { color: 'bg-blue-100 text-blue-800', icon: Database },
  'File': { color: 'bg-green-100 text-green-800', icon: File },
  'CSV': { color: 'bg-green-100 text-green-800', icon: File },
  'JSON': { color: 'bg-green-100 text-green-800', icon: File },
  'API': { color: 'bg-purple-100 text-purple-800', icon: Wifi },
  'REST': { color: 'bg-purple-100 text-purple-800', icon: Wifi },
  'Azure': { color: 'bg-blue-100 text-blue-800', icon: Cloud },
  'AWS': { color: 'bg-orange-100 text-orange-800', icon: Cloud },
  'GCP': { color: 'bg-red-100 text-red-800', icon: Cloud },
  'FTP': { color: 'bg-gray-100 text-gray-800', icon: Settings },
  'SFTP': { color: 'bg-gray-100 text-gray-800', icon: Settings },
};

const STATUS_COLORS = {
  'Active': 'text-green-600',
  'Failed': 'text-red-600',
  'Pending': 'text-yellow-600',
  'Testing': 'text-blue-600',
};

const STATUS_ICONS = {
  'Active': CheckCircle,
  'Failed': XCircle,
  'Pending': Clock,
  'Testing': TestTube2,
};

export default function SourceConnections() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SourceConnection | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch connections with filters
  const { data: connections = [], isLoading } = useQuery<SourceConnection[]>({
    queryKey: ['/api/connections', selectedCategory, searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/connections?${params}`);
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionData: Partial<SourceConnection>) => {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Connection Test Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      toast({
        title: "Connection Deleted",
        description: "Connection has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete connection.",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = (connection: SourceConnection) => {
    testConnectionMutation.mutate(connection);
  };

  const handleEditConnection = (connection: SourceConnection) => {
    setEditingConnection(connection);
    setIsEditModalOpen(true);
  };

  const handleDeleteConnection = (connection: SourceConnection) => {
    if (confirm(`Are you sure you want to delete "${connection.connectionName}"?`)) {
      deleteConnectionMutation.mutate(connection.connectionId);
    }
  };

  const getConnectionTypeInfo = (type: string) => {
    return CONNECTION_TYPES[type as keyof typeof CONNECTION_TYPES] || 
           { color: 'bg-gray-100 text-gray-800', icon: Settings };
  };

  const getStatusInfo = (status: string) => {
    const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'text-gray-600';
    const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Clock;
    return { color, Icon };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Source Connections</h1>
            <p className="text-gray-600 mt-1">Manage your data source connections</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-connect-data-source">
                <Plus className="w-4 h-4 mr-2" />
                Connect Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Connection</DialogTitle>
              </DialogHeader>
              <ConnectionForm
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
                }}
                onCancel={() => setIsCreateModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Categories */}
          <div className="w-64 space-y-1">
            <h3 className="font-medium text-gray-900 px-3 py-2">Categories</h3>
            {CONNECTION_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  data-testid={`category-${category.id}`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Right Column - Connections */}
          <div className="flex-1">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search connections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-connections"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Connections Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all' || selectedCategory !== 'all'
                    ? 'No connections match your current filters.'
                    : 'Get started by creating your first data source connection.'}
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-first-connection"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Connection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => {
                  const typeInfo = getConnectionTypeInfo(connection.connectionType);
                  const statusInfo = getStatusInfo(connection.status);
                  const TypeIcon = typeInfo.icon;
                  const StatusIcon = statusInfo.Icon;

                  return (
                    <Card key={connection.connectionId} className="hover:shadow-md transition-shadow" data-testid={`connection-card-${connection.connectionId}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <TypeIcon className="w-5 h-5 text-gray-600 mr-2" />
                            <div>
                              <CardTitle className="text-sm font-medium">{connection.connectionName}</CardTitle>
                              <CardDescription className="text-xs">
                                {connection.host && `${connection.host}${connection.port ? `:${connection.port}` : ''}`}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={`text-xs ${typeInfo.color}`}>
                            {connection.connectionType}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center text-sm ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {connection.status}
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestConnection(connection)}
                              disabled={testConnectionMutation.isPending}
                              data-testid={`button-test-${connection.connectionId}`}
                            >
                              <TestTube2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditConnection(connection)}
                              data-testid={`button-edit-${connection.connectionId}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteConnection(connection)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${connection.connectionId}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {connection.lastSync && (
                          <div className="text-xs text-gray-500 mt-2">
                            Last sync: {new Date(connection.lastSync).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Connection Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
          </DialogHeader>
          {editingConnection && (
            <ConnectionForm
              initialData={editingConnection}
              isEditing={true}
              onSuccess={() => {
                setIsEditModalOpen(false);
                setEditingConnection(null);
                queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
              }}
              onCancel={() => {
                setIsEditModalOpen(false);
                setEditingConnection(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}