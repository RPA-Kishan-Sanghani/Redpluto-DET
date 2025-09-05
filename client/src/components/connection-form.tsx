import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube2, CheckCircle, XCircle } from "lucide-react";
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
  { value: 'Database', label: 'Database', category: 'database' },
  { value: 'MySQL', label: 'MySQL', category: 'database' },
  { value: 'PostgreSQL', label: 'PostgreSQL', category: 'database' },
  { value: 'SQL Server', label: 'SQL Server', category: 'database' },
  { value: 'Oracle', label: 'Oracle', category: 'database' },
  { value: 'MongoDB', label: 'MongoDB', category: 'database' },
  { value: 'File', label: 'File Storage', category: 'file' },
  { value: 'CSV', label: 'CSV Files', category: 'file' },
  { value: 'JSON', label: 'JSON Files', category: 'file' },
  { value: 'XML', label: 'XML Files', category: 'file' },
  { value: 'Excel', label: 'Excel Files', category: 'file' },
  { value: 'API', label: 'REST API', category: 'api' },
  { value: 'REST', label: 'REST API', category: 'api' },
  { value: 'GraphQL', label: 'GraphQL API', category: 'api' },
  { value: 'HTTP', label: 'HTTP Endpoint', category: 'api' },
  { value: 'Azure', label: 'Microsoft Azure', category: 'cloud' },
  { value: 'AWS', label: 'Amazon AWS', category: 'cloud' },
  { value: 'GCP', label: 'Google Cloud', category: 'cloud' },
  { value: 'Cloud', label: 'Generic Cloud', category: 'cloud' },
  { value: 'FTP', label: 'FTP', category: 'other' },
  { value: 'SFTP', label: 'SFTP', category: 'other' },
  { value: 'Salesforce', label: 'Salesforce', category: 'other' },
  { value: 'SSH', label: 'SSH', category: 'other' },
  { value: 'Other', label: 'Other', category: 'other' },
];

export default function ConnectionForm({ initialData, isEditing = false, onSuccess, onCancel }: ConnectionFormProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
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
  }, [watchedType]);

  // Create/Update connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      const url = isEditing ? `/api/connections/${initialData?.connectionId}` : '/api/connections';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save connection');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Connection Updated" : "Connection Created",
        description: `Connection has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      onSuccess();
    },
    onError: (error) => {
      console.error('Connection save error:', error);
      toast({
        title: isEditing ? "Failed to Update Connection" : "Failed to Create Connection",
        description: error.message || "An unexpected error occurred. Please try again.",
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

  const requiresDatabase = ['Database', 'MySQL', 'PostgreSQL', 'SQL Server', 'Oracle'].includes(selectedType);
  const requiresFile = ['File', 'CSV', 'JSON', 'XML', 'Excel'].includes(selectedType);
  const requiresAPI = ['API', 'REST', 'GraphQL', 'HTTP'].includes(selectedType);
  const requiresCloud = ['Azure', 'AWS', 'GCP', 'Cloud'].includes(selectedType);
  const requiresFTP = ['FTP', 'SFTP'].includes(selectedType);

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
                  <SelectContent className="max-h-48">
                    {CONNECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Connection-specific fields */}
        {selectedType && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Connection Details</h3>
            
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

            {requiresDatabase && (
              <FormField
                control={form.control}
                name="databaseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Name</FormLabel>
                    <FormControl>
                      <Input placeholder="database_name" {...field} data-testid="input-database-name" />
                    </FormControl>
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