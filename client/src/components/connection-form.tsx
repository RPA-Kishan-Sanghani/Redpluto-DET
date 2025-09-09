import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube2, CheckCircle, XCircle, Shield, Database as DatabaseIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertSourceConnectionSchema, type SourceConnection, type InsertSourceConnection } from "@shared/schema";
import { z } from "zod";

const connectionFormSchema = insertSourceConnectionSchema;

type ConnectionFormData = z.infer<typeof connectionFormSchema>;

interface ConnectionFormProps {
  initialData?: SourceConnection;
  isEditing?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const CONNECTION_TYPES = [
  // Traditional Databases
  { value: 'PostgreSQL', label: 'PostgreSQL', category: 'database', defaultPort: 5432 },
  { value: 'MySQL', label: 'MySQL', category: 'database', defaultPort: 3306 },
  { value: 'Oracle', label: 'Oracle Database', category: 'database', defaultPort: 1521 },
  { value: 'SQL Server', label: 'Microsoft SQL Server', category: 'database', defaultPort: 1433 },
  { value: 'MongoDB', label: 'MongoDB', category: 'database', defaultPort: 27017 },
  { value: 'Redis', label: 'Redis', category: 'database', defaultPort: 6379 },
  { value: 'MariaDB', label: 'MariaDB', category: 'database', defaultPort: 3306 },
  
  // Cloud Databases
  { value: 'Snowflake', label: 'Snowflake', category: 'cloud', requiresAccount: true },
  { value: 'BigQuery', label: 'Google BigQuery', category: 'cloud', supportsOAuth: true },
  { value: 'Redshift', label: 'Amazon Redshift', category: 'cloud', defaultPort: 5439 },
  { value: 'Azure SQL', label: 'Azure SQL Database', category: 'cloud', supportsOAuth: true },
  { value: 'Databricks', label: 'Databricks', category: 'cloud', supportsOAuth: true },
  { value: 'Synapse', label: 'Azure Synapse', category: 'cloud', supportsOAuth: true },
  
  // File Systems
  { value: 'File', label: 'File System', category: 'file' },
  { value: 'CSV', label: 'CSV Files', category: 'file' },
  { value: 'JSON', label: 'JSON Files', category: 'file' },
  { value: 'Parquet', label: 'Parquet Files', category: 'file' },
  { value: 'Excel', label: 'Excel Files', category: 'file' },
  
  // Cloud Storage
  { value: 'S3', label: 'Amazon S3', category: 'storage', supportsOAuth: true },
  { value: 'Azure Blob', label: 'Azure Blob Storage', category: 'storage', supportsOAuth: true },
  { value: 'GCS', label: 'Google Cloud Storage', category: 'storage', supportsOAuth: true },
  
  // APIs
  { value: 'REST API', label: 'REST API', category: 'api' },
  { value: 'GraphQL', label: 'GraphQL API', category: 'api' },
  
  // Other Sources
  { value: 'Salesforce', label: 'Salesforce', category: 'other', supportsOAuth: true },
  { value: 'FTP', label: 'FTP', category: 'other', defaultPort: 21 },
  { value: 'SFTP', label: 'SFTP', category: 'other', defaultPort: 22 },
];

export default function ConnectionForm({ initialData, isEditing = false, onSuccess, onCancel }: ConnectionFormProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  
  const [authMethod, setAuthMethod] = useState<'credentials' | 'oauth' | 'service_account'>('credentials');
  const { toast } = useToast();

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      connectionName: initialData?.connectionName || '',
      connectionType: initialData?.connectionType || '',
      host: initialData?.host || '',
      port: initialData?.port || undefined,
      username: initialData?.username || '',
      password: initialData?.password || '',
      databaseName: initialData?.databaseName || '',
      filePath: initialData?.filePath || '',
      apiKey: initialData?.apiKey || '',
      cloudProvider: initialData?.cloudProvider || '',
      status: initialData?.status || 'Pending',
    },
  });

  const watchedType = form.watch('connectionType');

  useEffect(() => {
    setSelectedType(watchedType);
    setTestResult(null);
    
    // Auto-fill port based on database type
    const selectedDbType = CONNECTION_TYPES.find(type => type.value === watchedType);
    if (selectedDbType?.defaultPort && !form.getValues('port')) {
      form.setValue('port', selectedDbType.defaultPort);
    }
    
    // Set default authentication method based on OAuth support
    if (selectedDbType?.supportsOAuth) {
      setAuthMethod('oauth');
    } else {
      setAuthMethod('credentials');
    }
  }, [watchedType, form]);

  // Create/Update connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      console.log('Saving connection with data:', data);
      const url = isEditing ? `/api/connections/${initialData?.connectionId}` : '/api/connections';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
      toast({
        title: isEditing ? "Connection Updated" : "Connection Created",
        description: `Connection "${data.connectionName}" has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Connection save error:', error);
      toast({
        title: isEditing ? "Failed to Update Connection" : "Failed to Create Connection",
        description: error.message || "An unexpected error occurred. Please check the console for details and try again.",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: Partial<ConnectionFormData>) => {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error) => {
      console.error('Connection test error:', error);
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    },
  });

  const handleTestConnection = () => {
    const formData = form.getValues();
    testConnectionMutation.mutate(formData);
  };

  const onSubmit = (data: ConnectionFormData) => {
    saveConnectionMutation.mutate(data);
  };

  const selectedTypeConfig = CONNECTION_TYPES.find(type => type.value === selectedType);
  const requiresDatabase = ['PostgreSQL', 'MySQL', 'Oracle', 'SQL Server', 'MongoDB', 'Redis', 'MariaDB'].includes(selectedType);
  const requiresFile = ['File', 'CSV', 'JSON', 'Parquet', 'Excel'].includes(selectedType);
  const requiresAPI = ['REST API', 'GraphQL'].includes(selectedType);
  const requiresCloud = ['Snowflake', 'BigQuery', 'Redshift', 'Azure SQL', 'Databricks', 'Synapse'].includes(selectedType);
  const requiresStorage = ['S3', 'Azure Blob', 'GCS'].includes(selectedType);
  const requiresFTP = ['FTP', 'SFTP'].includes(selectedType);
  const supportsOAuth = selectedTypeConfig?.supportsOAuth || false;
  const requiresAccount = selectedTypeConfig?.requiresAccount || false;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="connectionName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Database Connection" {...field} data-testid="input-connection-name" />
                </FormControl>
                <FormDescription>A friendly name for this connection</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="connectionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-connection-type">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select connection type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Databases</div>
                      {CONNECTION_TYPES.filter(type => type.category === 'database').map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </div>
                    <div className="p-2 border-t">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cloud Platforms</div>
                      {CONNECTION_TYPES.filter(type => type.category === 'cloud').map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </div>
                    <div className="p-2 border-t">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Storage & Files</div>
                      {CONNECTION_TYPES.filter(type => ['file', 'storage'].includes(type.category)).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </div>
                    <div className="p-2 border-t">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">APIs & Others</div>
                      {CONNECTION_TYPES.filter(type => ['api', 'other'].includes(type.category)).map((type) => (
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
        {selectedType && supportsOAuth && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authentication Method
            </h3>
            <div className="flex gap-4">
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
            </div>
          </div>
        )}

        {/* Connection-specific fields */}
        {selectedType && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4" />
              Connection Details
            </h3>
            
            {(requiresDatabase || requiresAPI || requiresFTP) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {requiresAPI ? 'API Endpoint' : 'Host/Server'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={requiresAPI ? "https://api.example.com" : "localhost"} 
                            {...field} 
                            data-testid="input-host"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {!requiresAPI && (
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={requiresDatabase ? "5432" : "21"} 
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
            )}

            {requiresFile && (
              <FormField
                control={form.control}
                name="filePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/path/to/files" {...field} data-testid="input-file-path" />
                    </FormControl>
                    <FormDescription>Path to the file or directory</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresCloud && (
              <FormField
                control={form.control}
                name="cloudProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cloud Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="Azure, AWS, GCP" {...field} data-testid="input-cloud-provider" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Authentication Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!requiresAPI && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name={requiresAPI ? "apiKey" : "password"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{requiresAPI ? 'API Key' : 'Password'}</FormLabel>
                    <FormControl>
                      <Input 
                        type={requiresAPI ? "text" : "password"} 
                        placeholder={requiresAPI ? "your-api-key" : "password"} 
                        {...field} 
                        data-testid={requiresAPI ? "input-api-key" : "input-password"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(requiresDatabase || requiresCloud) && (
              <FormField
                control={form.control}
                name="databaseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {requiresCloud ? 'Database/Project' : 'Database Name'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={requiresCloud ? "project_id or database" : "database_name"} 
                        {...field} 
                        data-testid="input-database-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresAccount && (
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Identifier</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="account.region.snowflakecomputing.com" 
                        {...field} 
                        data-testid="input-account"
                      />
                    </FormControl>
                    <FormDescription>
                      Your organization account identifier including region
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        

        {/* Test Connection Section */}
        {selectedType && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              data-testid="button-test-connection"
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube2 className="w-4 h-4 mr-2" />
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
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
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
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Connection' : 'Create Connection'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}