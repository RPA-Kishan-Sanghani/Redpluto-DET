import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  ReconciliationConfig,
  InsertReconciliationConfig,
} from "@shared/schema";
import {
  Database,
  Target,
  Settings,
  Info,
  Loader2,
  Save,
  X,
} from "lucide-react";

// Form validation schema
const reconciliationFormSchema = z.object({
  configKey: z.number().min(1, "Config key is required"),
  executionLayer: z.string().min(1, "Execution layer is required"),
  sourceSchema: z.string().optional(),
  sourceTable: z.string().optional(),
  targetSchema: z.string().optional(),
  targetTable: z.string().optional(),
  reconType: z.string().min(1, "Reconciliation type is required"),
  attribute: z.string().optional(),
  sourceQuery: z.string().optional(),
  targetQuery: z.string().optional(),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
});

type FormData = z.infer<typeof reconciliationFormSchema>;

interface ReconciliationFormProps {
  config?: ReconciliationConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReconciliationForm({
  config,
  onSuccess,
  onCancel,
}: ReconciliationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ["/api/metadata/execution_layer"],
    queryFn: () =>
      fetch("/api/metadata/execution_layer").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: reconTypes = [] } = useQuery({
    queryKey: ["/api/metadata/recon_type"],
    queryFn: () =>
      fetch("/api/metadata/recon_type").then((res) => res.json()) as Promise<string[]>,
  });

  const { data: activeFlags = [] } = useQuery({
    queryKey: ["/api/metadata/active_flag"],
    queryFn: () =>
      fetch("/api/metadata/active_flag").then((res) => res.json()) as Promise<string[]>,
  });

  // Fetch pipeline configs for the dropdown
  const { data: configs = [] } = useQuery({
    queryKey: ["/api/pipelines"],
    queryFn: () => fetch("/api/pipelines").then((res) => res.json()) as Promise<any[]>,
  });

  // Initialize form with default values or existing config values
  const form = useForm<FormData>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: {
      configKey: config?.configKey || undefined,
      executionLayer: config?.executionLayer || "",
      sourceSchema: config?.sourceSchema || "",
      sourceTable: config?.sourceTable || "",
      targetSchema: config?.targetSchema || "",
      targetTable: config?.targetTable || "",
      reconType: config?.reconType || "",
      attribute: config?.attribute || "",
      sourceQuery: config?.sourceQuery || "",
      targetQuery: config?.targetQuery || "",
      thresholdPercentage: config?.thresholdPercentage || undefined,
      activeFlag: config?.activeFlag || "Y",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertReconciliationConfig) => {
      const response = await apiRequest("POST", "/api/reconciliation-configs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation-configs"] });
      toast({
        title: "Success",
        description: "Reconciliation configuration created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reconciliation configuration",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PUT", `/api/reconciliation-configs/${config?.reconKey}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation-configs"] });
      toast({
        title: "Success",
        description: "Reconciliation configuration updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reconciliation configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (config) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="source" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Parameters
            </TabsTrigger>
          </TabsList>

          {/* General Configuration */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>Basic reconciliation settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="executionLayer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Layer *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-execution-layer-form">
                              <SelectValue placeholder="Select execution layer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executionLayers.map((layer) => (
                              <SelectItem key={layer} value={layer}>
                                {layer}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="configKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Config Key *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter config key"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            data-testid="input-config-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reconType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reconciliation Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-recon-type">
                              <SelectValue placeholder="Select reconciliation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="count_check">Count Check</SelectItem>
                            <SelectItem value="amount_check">Amount Check</SelectItem>
                            <SelectItem value="sum_check">Sum Check</SelectItem>
                            <SelectItem value="data_check">Data Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activeFlag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active Flag</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "Y"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-active-flag">
                              <SelectValue placeholder="Select active flag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Y</SelectItem>
                            <SelectItem value="N">N</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Source Configuration */}
          <TabsContent value="source" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Configuration</CardTitle>
                <CardDescription>Configure the source data for reconciliation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sourceSchema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Schema Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter source schema name"
                            {...field}
                            data-testid="input-source-schema"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Table Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter source table name"
                            {...field}
                            data-testid="input-source-table"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sourceQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Query</FormLabel>
                      <FormDescription>
                        SQL query to execute against the source data
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM source_table WHERE..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-source-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Target Configuration */}
          <TabsContent value="target" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Configuration</CardTitle>
                <CardDescription>Configure the target data for reconciliation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetSchema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Schema Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter target schema name"
                            {...field}
                            data-testid="input-target-schema"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Table Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter target table name"
                            {...field}
                            data-testid="input-target-table"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Query</FormLabel>
                      <FormDescription>
                        SQL query to execute against the target data
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM target_table WHERE..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-target-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliation Parameters */}
          <TabsContent value="parameters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Parameters</CardTitle>
                <CardDescription>Additional reconciliation settings and thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="attribute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attribute</FormLabel>
                        <FormDescription>
                          Column name for value-based reconciliation
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="Enter attribute/column name"
                            {...field}
                            data-testid="input-attribute"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="thresholdPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold Percentage</FormLabel>
                        <FormDescription>
                          Acceptable variance percentage (0-100)
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Enter threshold percentage"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            data-testid="input-threshold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-reconciliation"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
            data-testid="button-save-reconciliation"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {config ? "Update Configuration" : "Save Configuration"}
          </Button>
        </div>
      </form>
    </Form>
  );
}