import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  TestTube,
  Settings,
  Database as DatabaseIcon,
  Shield,
  Clock,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { insertConfigConnectionSchema, type ConfigConnection } from "@shared/schema";
import { z } from "zod";

// Database types with their configurations
const DATABASE_TYPES = [
  // Traditional Databases
  { value: 'PostgreSQL', label: 'PostgreSQL', category: 'database', defaultPort: 5432, supportsAuth: ['credentials', 'oauth'] },
  { value: 'MySQL', label: 'MySQL', category: 'database', defaultPort: 3306, supportsAuth: ['credentials'] },
  { value: 'Oracle', label: 'Oracle Database', category: 'database', defaultPort: 1521, supportsAuth: ['credentials'] },
  { value: 'SQL Server', label: 'Microsoft SQL Server', category: 'database', defaultPort: 1433, supportsAuth: ['credentials', 'oauth'] },
  { value: 'MongoDB', label: 'MongoDB', category: 'database', defaultPort: 27017, supportsAuth: ['credentials'] },
  { value: 'Redis', label: 'Redis', category: 'database', defaultPort: 6379, supportsAuth: ['credentials'] },
  { value: 'MariaDB', label: 'MariaDB', category: 'database', defaultPort: 3306, supportsAuth: ['credentials'] },
  
  // Cloud Databases
  { value: 'Snowflake', label: 'Snowflake', category: 'cloud', requiresAccount: true, supportsAuth: ['credentials', 'oauth'] },
  { value: 'BigQuery', label: 'Google BigQuery', category: 'cloud', supportsAuth: ['oauth', 'service_account'] },
  { value: 'Redshift', label: 'Amazon Redshift', category: 'cloud', defaultPort: 5439, supportsAuth: ['credentials', 'oauth'] },
  { value: 'Azure SQL', label: 'Azure SQL Database', category: 'cloud', supportsAuth: ['credentials', 'oauth'] },
  { value: 'Databricks', label: 'Databricks', category: 'cloud', supportsAuth: ['credentials', 'oauth'] },
  { value: 'Synapse', label: 'Azure Synapse', category: 'cloud', supportsAuth: ['credentials', 'oauth'] },
];

type ConnectionFormData = z.infer<typeof insertConfigConnectionSchema>;

export function ConfigSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConfigConnection | null>(null);
  const [deleteConnectionId, setDeleteConnectionId] = useState<number | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [authMethod, setAuthMethod] = useState<'credentials' | 'oauth' | 'service_account'>('credentials');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch config connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      return response.json();
    }
  });

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(insertConfigConnectionSchema),
    defaultValues: {
      connectionName: '',
      databaseType: '',
      host: '',
      port: undefined,
      databaseName: '',
      schemaName: '',
      username: '',
      password: '',
      authMethod: 'credentials',
      serviceAccountJson: '',
      sslMode: 'disabled',
      sslCertificate: '',
      connectionTimeout: 30,
      connectionPoolSize: 10,
      status: 'Active',
    },
  });

  const watchedType = form.watch('databaseType');
  const selectedTypeConfig = DATABASE_TYPES.find(type => type.value === watchedType);

  // Auto-fill port and auth method when database type changes
  useState(() => {
    if (selectedTypeConfig?.defaultPort && !form.getValues('port')) {
      form.setValue('port', selectedTypeConfig.defaultPort);
    }
    if (selectedTypeConfig?.supportsAuth?.includes('oauth')) {
      setAuthMethod('oauth');
    } else {
      setAuthMethod('credentials');
    }
  });

  // Save connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      console.log('Saving connection with data:', data);
      
      // Map the config connection data to source connection format
      const connectionData = {
        connectionName: data.connectionName,
        connectionType: data.databaseType,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        databaseName: data.databaseName,
        status: data.status || 'Pending'
      };
      
      const url = editingConnection ? `/api/connections/${editingConnection.connectionId}` : '/api/connections';
      const method = editingConnection ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to save connection';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Server error response:', errorData);
        } catch (e) {
          console.error('Failed to parse error response');
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Connection saved successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Connection save success:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Success",
        description: `Connection "${data.connectionName}" ${editingConnection ? 'updated' : 'created'} successfully`,
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Connection save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save connection. Please check the console for details.",
        variant: "destructive",
      });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Success",
        description: "Connection deleted successfully",
      });
      setDeleteConnectionId(null);
    },
    onError: (error) => {
      console.error('Delete connection error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete connection",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      console.log('Testing connection with data:', data);
      
      // Map the config connection data to source connection format for testing
      const testData = {
        connectionName: data.connectionName,
        connectionType: data.databaseType,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        databaseName: data.databaseName,
      };
      
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      
      console.log('Test response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Connection test failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Test error response:', errorData);
        } catch (e) {
          console.error('Failed to parse test error response');
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Test result:', result);
      return result;
    },
    onSuccess: (result: any) => {
      console.log('Test connection success:', result);
      setTestResult(result);
      toast({
        title: "Connection Test",
        description: result.success ? result.message || "Connection successful!" : result.message || "Connection failed",
        variant: result.success ? "default" : "destructive",
      });
      setTestingConnectionId(null);
    },
    onError: (error) => {
      console.error('Test connection error:', error);
      setTestResult({ success: false, message: error.message || "Connection test failed" });
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection. Please check your credentials and try again.",
        variant: "destructive",
      });
      setTestingConnectionId(null);
    },
  });

  const handleTestConnection = (connectionId?: number) => {
    if (connectionId) {
      setTestingConnectionId(connectionId);
      // Test existing connection
      testConnectionMutation.mutate(form.getValues());
    } else {
      // Test current form data
      testConnectionMutation.mutate(form.getValues());
    }
  };

  const handleEditConnection = (connection: any) => {
    setEditingConnection(connection);
    form.reset({
      connectionName: connection.connectionName,
      databaseType: connection.connectionType, // Map connectionType to databaseType
      host: connection.host,
      port: connection.port,
      databaseName: connection.databaseName,
      schemaName: '',
      username: connection.username || '',
      password: connection.password || '',
      authMethod: 'credentials',
      serviceAccountJson: '',
      sslMode: 'disabled',
      sslCertificate: '',
      connectionTimeout: 30,
      connectionPoolSize: 10,
      status: connection.status,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConnection(null);
    form.reset();
    setTestResult(null);
    setShowAdvanced(false);
  };

  const onSubmit = (data: ConnectionFormData) => {
    saveConnectionMutation.mutate(data);
  };

  const requiresCredentials = authMethod === 'credentials';
  const requiresOAuth = authMethod === 'oauth';
  const requiresServiceAccount = authMethod === 'service_account';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Config Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your database connections
          </p>
        </div>
      </div>

      {/* Main Connection Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5" />
                Database Connections
              </CardTitle>
              <CardDescription>
                Manage your database connections for data operations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-connection">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConnection ? "Edit Connection" : "Add New Connection"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure your database connection details
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="connectionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Connection Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="My Database Connection" {...field} data-testid="input-connection-name" />
                            </FormControl>
                            <FormDescription>A unique identifier for this connection</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="databaseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Database Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-database-type">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select database type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                <div className="p-2">
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Databases</div>
                                  {DATABASE_TYPES.filter(type => type.category === 'database').map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </div>
                                <div className="p-2 border-t">
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cloud Platforms</div>
                                  {DATABASE_TYPES.filter(type => type.category === 'cloud').map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Authentication Method Selection */}
                    {watchedType && selectedTypeConfig?.supportsAuth && selectedTypeConfig.supportsAuth.length > 1 && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Authentication Method
                        </h3>
                        <div className="flex gap-4">
                          {selectedTypeConfig.supportsAuth.includes('credentials') && (
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="authMethod"
                                value="credentials"
                                checked={authMethod === 'credentials'}
                                onChange={(e) => setAuthMethod(e.target.value as any)}
                              />
                              Username/Password
                            </label>
                          )}
                          {selectedTypeConfig.supportsAuth.includes('oauth') && (
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="authMethod"
                                value="oauth"
                                checked={authMethod === 'oauth'}
                                onChange={(e) => setAuthMethod(e.target.value as any)}
                              />
                              OAuth 2.0
                            </label>
                          )}
                          {selectedTypeConfig.supportsAuth.includes('service_account') && (
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="authMethod"
                                value="service_account"
                                checked={authMethod === 'service_account'}
                                onChange={(e) => setAuthMethod(e.target.value as any)}
                              />
                              Service Account
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Connection Details */}
                    {watchedType && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <DatabaseIcon className="h-4 w-4" />
                          Connection Details
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="host"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {selectedTypeConfig?.requiresAccount ? 'Account Identifier *' : 'Host / IP *'}
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder={selectedTypeConfig?.requiresAccount ? "account.region.snowflakecomputing.com" : "localhost"} 
                                      {...field} 
                                      data-testid="input-host"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {!selectedTypeConfig?.requiresAccount && (
                            <FormField
                              control={form.control}
                              name="port"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Port *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="5432" 
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                      data-testid="input-port"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* Database and Schema */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="databaseName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Database Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="database_name" {...field} data-testid="input-database-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="schemaName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Schema</FormLabel>
                                <FormControl>
                                  <Input placeholder="schema_name" {...field} data-testid="input-schema-name" />
                                </FormControl>
                                <FormDescription>Optional: Database schema name</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Authentication Fields */}
                        {requiresCredentials && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="username" {...field} data-testid="input-username" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password *</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="password" {...field} data-testid="input-password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {requiresServiceAccount && (
                          <FormField
                            control={form.control}
                            name="serviceAccountJson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service Account JSON *</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Paste your service account JSON here..."
                                    className="font-mono text-xs"
                                    rows={4}
                                    {...field} 
                                    data-testid="textarea-service-account"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}

                    {/* Advanced Settings */}
                    {watchedType && (
                      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-between p-4"
                            data-testid="toggle-advanced-settings"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Advanced Settings
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 p-4 border border-t-0 rounded-b-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* SSL Settings */}
                            <FormField
                              control={form.control}
                              name="sslMode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    SSL Connection
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ssl">
                                        <SelectValue placeholder="SSL mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="disabled">Disabled</SelectItem>
                                      <SelectItem value="required">Required</SelectItem>
                                      <SelectItem value="preferred">Preferred</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Connection Timeout */}
                            <FormField
                              control={form.control}
                              name="connectionTimeout"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Timeout (seconds)
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="30" 
                                      min="5"
                                      max="300"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 30)}
                                      data-testid="input-timeout"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Connection Pool Size */}
                            <FormField
                              control={form.control}
                              name="connectionPoolSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pool Size</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="10" 
                                      min="1"
                                      max="100"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 10)}
                                      data-testid="input-pool-size"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* SSL Certificate Upload */}
                          <FormField
                            control={form.control}
                            name="sslCertificate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SSL Certificate (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOu...
-----END CERTIFICATE-----"
                                    className="font-mono text-xs"
                                    rows={4}
                                    {...field}
                                    data-testid="textarea-ssl-cert"
                                  />
                                </FormControl>
                                <FormDescription>Paste your SSL certificate if required</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Test Connection Section */}
                    {watchedType && (
                      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleTestConnection()}
                          disabled={testConnectionMutation.isPending}
                          data-testid="button-test-connection"
                        >
                          {testConnectionMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4 mr-2" />
                          )}
                          Test Connection
                        </Button>

                        {testResult && (
                          <div className={`flex items-center gap-2 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {testResult.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">{testResult.message}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={saveConnectionMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-save"
                      >
                        {saveConnectionMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {editingConnection ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingConnection ? 'Update Connection' : 'Save Connection'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {connectionsLoading ? (
            <div className="text-center py-8">Loading connections...</div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <DatabaseIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No database connections found</p>
              <p className="text-sm text-muted-foreground">
                Create your first connection to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connection Name</TableHead>
                  <TableHead>Database Type</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Database/Schema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection: any) => (
                  <TableRow key={connection.connectionId}>
                    <TableCell className="font-medium">
                      {connection.connectionName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {connection.connectionType}
                      </Badge>
                    </TableCell>
                    <TableCell>{connection.host}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{connection.databaseName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          connection.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {connection.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {connection.createdAt &&
                        formatDistanceToNow(new Date(connection.createdAt), {
                          addSuffix: true,
                        })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditConnection(connection)}
                            data-testid={`edit-connection-${connection.connectionId}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTestConnection(connection.connectionId)}
                            disabled={testingConnectionId === connection.connectionId}
                            data-testid={`test-connection-${connection.connectionId}`}
                          >
                            <TestTube className="h-4 w-4 mr-2" />
                            {testingConnectionId === connection.connectionId
                              ? "Testing..."
                              : "Test Connection"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConnectionId(connection.connectionId)}
                            className="text-red-600"
                            data-testid={`delete-connection-${connection.connectionId}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Connection Dialog */}
      <AlertDialog
        open={deleteConnectionId !== null}
        onOpenChange={() => setDeleteConnectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConnectionId && deleteConnectionMutation.mutate(deleteConnectionId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-connection"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}