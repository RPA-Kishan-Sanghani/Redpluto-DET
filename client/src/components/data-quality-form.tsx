import { useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  DataQualityConfig,
  InsertDataQualityConfig,
} from "@shared/schema";
import {
  Shield,
  Database,
  Settings,
  Info,
  Loader2,
  Save,
  X,
  HelpCircle,
} from "lucide-react";

// Form validation schema
const dataQualityFormSchema = z.object({
  configKey: z.number().min(1, "Config key is required"),
  executionLayer: z.string().min(1, "Execution layer is required"),
  tableName: z.string().min(1, "Table name is required"),
  attributeName: z.string().min(1, "Attribute name is required"),
  validationType: z.string().min(1, "Validation type is required"),
  referenceTableName: z.string().optional(),
  defaultValue: z.string().optional(),
  errorTableTransferFlag: z.string().default("N"),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
  customQuery: z.string().max(500, "Custom query must be less than 500 characters").optional(),
});

type FormData = z.infer<typeof dataQualityFormSchema>;

interface DataQualityFormProps {
  config?: DataQualityConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataQualityForm({
  config,
  onSuccess,
  onCancel,
}: DataQualityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ["/api/metadata/execution_layer"],
    queryFn: () =>
      fetch("/api/metadata/execution_layer").then((res) => res.json()) as Promise<string[]>,
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

  // Fetch reference table names
  const { data: referenceTableNames = [] } = useQuery({
    queryKey: ["/api/metadata/reference_tables"],
    queryFn: () =>
      fetch("/api/metadata/reference_tables").then((res) => res.json()) as Promise<string[]>,
  });

  // Initialize form with default values or existing config values
  const form = useForm<FormData>({
    resolver: zodResolver(dataQualityFormSchema),
    defaultValues: {
      configKey: config?.configKey || undefined,
      executionLayer: config?.executionLayer || "",
      tableName: config?.tableName || "",
      attributeName: config?.attributeName || "",
      validationType: config?.validationType || "",
      referenceTableName: config?.referenceTableName || "",
      defaultValue: config?.defaultValue || "",
      errorTableTransferFlag: config?.errorTableTransferFlag || "N",
      thresholdPercentage: config?.thresholdPercentage || undefined,
      activeFlag: config?.activeFlag || "Y",
      customQuery: config?.customQuery || "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertDataQualityConfig) => {
      const response = await apiRequest("POST", "/api/data-quality-configs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality-configs"] });
      toast({
        title: "Success",
        description: "Data quality configuration created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create data quality configuration",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("PUT", `/api/data-quality-configs/${config?.dataQualityKey}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality-configs"] });
      toast({
        title: "Success",
        description: "Data quality configuration updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update data quality configuration",
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

  const TooltipField = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        {children}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Basic Config
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Basic Configuration */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Configuration</CardTitle>
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
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                    name="tableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter table name"
                            {...field}
                            data-testid="input-table-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attributeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attribute Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter attribute/column name"
                            {...field}
                            data-testid="input-attribute-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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

          {/* Validation Configuration */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Validation Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="validationType"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Type of validation rule to apply">
                          <FormLabel>Validation Type *</FormLabel>
                        </TooltipField>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-validation-type">
                              <SelectValue placeholder="Select validation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="List Value Check">List Value Check</SelectItem>
                            <SelectItem value="Duplicate Check">Duplicate Check</SelectItem>
                            <SelectItem value="Custom Query Check">Custom Query Check</SelectItem>
                            <SelectItem value="File Format Check">File Format Check</SelectItem>
                            <SelectItem value="Referential Integrity Check">Referential Integrity Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceTableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Table Name</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-reference-table">
                              <SelectValue placeholder="Select reference table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NA">NA</SelectItem>
                            {referenceTableNames.map((tableName) => (
                              <SelectItem key={tableName} value={tableName}>
                                {tableName}
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
                    name="defaultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Value</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter default value"
                            {...field}
                            data-testid="input-default-value"
                          />
                        </FormControl>
                        <FormDescription>
                          Default value to use when validation fails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="thresholdPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Acceptable percentage of failed validations before triggering alerts (0-100)">
                          <FormLabel>Threshold Percentage</FormLabel>
                        </TooltipField>
                        <FormDescription>
                          Acceptable variance percentage (0-100)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Enter threshold percentage"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              data-testid="input-threshold"
                              className="pr-8"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="errorTableTransferFlag"
                    render={({ field }) => (
                      <FormItem>
                        <TooltipField tooltip="Whether to transfer failed records to error table for analysis">
                          <FormLabel>Error Table Transfer</FormLabel>
                        </TooltipField>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || "N"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-error-transfer">
                              <SelectValue placeholder="Select error transfer flag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Yes</SelectItem>
                            <SelectItem value="N">No</SelectItem>
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

          {/* Advanced Configuration */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customQuery"
                  render={({ field }) => (
                    <FormItem>
                      <TooltipField tooltip="Custom SQL query for complex validation logic (max 500 characters)">
                        <FormLabel>Custom Query</FormLabel>
                      </TooltipField>
                      <FormDescription>
                        SQL query for custom validation rules
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="SELECT COUNT(*) FROM table WHERE condition..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-custom-query"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            data-testid="button-cancel-quality"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
            data-testid="button-save-quality"
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