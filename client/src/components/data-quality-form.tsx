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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  DataQualityConfig,
  InsertDataQualityConfig,
} from "@shared/schema";
import {
  Shield,
  Settings,
  Loader2,
  Save,
  X,
} from "lucide-react";

// Form validation schema matching the database exactly
const dataQualityFormSchema = z.object({
  configKey: z.number().optional(),
  executionLayer: z.string().min(1, "Execution layer is required"),
  tableName: z.string().min(1, "Table name is required"),
  attributeName: z.string().min(1, "Attribute name is required"),
  validationType: z.string().min(1, "Validation type is required"),
  referenceTableName: z.string().optional(),
  defaultValue: z.string().optional(),
  errorTableTransferFlag: z.string().default("N"),
  thresholdPercentage: z.number().min(0).max(100).optional(),
  activeFlag: z.string().default("Y"),
  customQuery: z.string().optional(),
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

  // Validation types
  const validationTypes = [
    "NOT_NULL",
    "UNIQUE", 
    "DATA_TYPE",
    "RANGE",
    "REGEX",
    "CUSTOM",
    "REFERENCE"
  ];

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

  // Watch form values for dynamic behavior
  const selectedValidationType = form.watch('validationType');
  const showReferenceTable = selectedValidationType === 'REFERENCE';
  const showThresholdPercentage = ['RANGE', 'CUSTOM'].includes(selectedValidationType || '');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertDataQualityConfig) => {
      console.log('Creating data quality config with data:', data);
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
      console.error('Create mutation error:', error);
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
      console.log('Updating data quality config with data:', data);
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
      console.error('Update mutation error:', error);
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
      console.log('Form submitted with data:', data);
      if (config) {
        await updateMutation.mutateAsync(data);
      } else {
        const createData: InsertDataQualityConfig = {
          configKey: data.configKey,
          executionLayer: data.executionLayer,
          tableName: data.tableName,
          attributeName: data.attributeName,
          validationType: data.validationType,
          referenceTableName: data.referenceTableName,
          defaultValue: data.defaultValue,
          errorTableTransferFlag: data.errorTableTransferFlag,
          thresholdPercentage: data.thresholdPercentage,
          activeFlag: data.activeFlag,
          customQuery: data.customQuery,
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Configuration
            </CardTitle>
            <CardDescription>Configure the data quality validation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="executionLayer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Execution Layer <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-execution-layer">
                          <SelectValue placeholder="Select execution layer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {executionLayers.map((layer) => (
                          <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter table name" data-testid="input-table-name" />
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
                    <FormLabel>Attribute Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter attribute name" data-testid="input-attribute-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validation Type <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-validation-type">
                          <SelectValue placeholder="Select validation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {validationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Validation Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Validation Configuration
            </CardTitle>
            <CardDescription>Additional settings for data validation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showReferenceTable && (
                <FormField
                  control={form.control}
                  name="referenceTableName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Table Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter reference table name" data-testid="input-reference-table" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="defaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter default value" data-testid="input-default-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showThresholdPercentage && (
                <FormField
                  control={form.control}
                  name="thresholdPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Threshold Percentage</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Enter threshold percentage"
                          data-testid="input-threshold-percentage"
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="errorTableTransferFlag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer to Error Table</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'N'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-error-transfer">
                          <SelectValue placeholder="Select option" />
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

              <FormField
                control={form.control}
                name="activeFlag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'Y'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-active-flag">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeFlags.map((flag) => (
                          <SelectItem key={flag} value={flag}>
                            {flag === 'Y' ? 'Active' : 'Inactive'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Query</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter custom SQL query for validation"
                      rows={3}
                      data-testid="textarea-custom-query"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-quality"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-quality"
          >
            {isLoading || createMutation.isPending || updateMutation.isPending ? (
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