import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import ConnectionForm from "@/components/connection-form";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  TestTube,
  Settings,
  Database,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SourceConnection } from "@shared/schema";

export function ConfigSettings() {
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SourceConnection | null>(null);
  const [deleteConnectionId, setDeleteConnectionId] = useState<number | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["/api/connections"],
  });

  

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/connections/${id}`, "DELETE");
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
      toast({
        title: "Error",
        description: "Failed to delete connection",
        variant: "destructive",
      });
    },
  });

  

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/connections/${id}/test`, "POST");
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Test",
        description: data?.success ? "Connection successful!" : "Connection failed",
        variant: data?.success ? "default" : "destructive",
      });
      setTestingConnectionId(null);
    },
    onError: (error) => {
      toast({
        title: "Connection Test",
        description: "Connection test failed",
        variant: "destructive",
      });
      setTestingConnectionId(null);
    },
  });

  const handleConnectionSuccess = () => {
    setIsConnectionDialogOpen(false);
    setEditingConnection(null);
    queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
  };

  const handleTestConnection = (connectionId: number) => {
    setTestingConnectionId(connectionId);
    testConnectionMutation.mutate(connectionId);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Config Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your source connections and saved configurations
          </p>
        </div>
      </div>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Source Connections
          </TabsTrigger>
        </TabsList>

        {/* Source Connections Tab */}
        <TabsContent value="connections" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Source Connections</CardTitle>
                  <CardDescription>
                    Manage your database and data source connections
                  </CardDescription>
                </div>
                <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
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
                        Configure your data source connection details
                      </DialogDescription>
                    </DialogHeader>
                    <ConnectionForm
                      initialData={editingConnection || undefined}
                      isEditing={!!editingConnection}
                      onSuccess={handleConnectionSuccess}
                      onCancel={() => {
                        setIsConnectionDialogOpen(false);
                        setEditingConnection(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="text-center py-8">Loading connections...</div>
              ) : (connections as SourceConnection[]).length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No connections found</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first connection to get started
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connection Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Database/Schema</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(connections as SourceConnection[]).map((connection: SourceConnection) => (
                      <TableRow key={connection.connectionId}>
                        <TableCell className="font-medium">
                          {connection.connectionName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {connection.connectionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{connection.host || "N/A"}</TableCell>
                        <TableCell>
                          {connection.databaseName ? (
                            <div className="text-sm">
                              <div className="font-medium">{connection.databaseName}</div>
                              {connection.cloudProvider && (
                                <div className="text-xs text-muted-foreground">
                                  Schema: {connection.cloudProvider}
                                </div>
                              )}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              connection.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
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
                                onClick={() => {
                                  setEditingConnection(connection);
                                  setIsConnectionDialogOpen(true);
                                }}
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
        </TabsContent>

        
      </Tabs>

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