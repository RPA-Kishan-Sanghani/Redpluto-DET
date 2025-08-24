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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DataDictionaryRecord, InsertDataDictionaryRecord } from "@shared/schema";

// Form validation schema
const dataDictionaryFormSchema = z.object({
  configKey: z.number().min(1, "Config key is required"),
  executionLayer: z.string().min(1, "Execution layer is required"),
  schemaName: z.string().optional(),
  tableName: z.string().optional(),
  attributeName: z.string().min(1, "Attribute name is required"),
  dataType: z.string().min(1, "Data type is required"),
  length: z.number().optional(),
  precisionValue: z.number().optional(),
  scale: z.number().optional(),
  isNotNull: z.boolean().optional(),
  isPrimaryKey: z.boolean().optional(),
  isForeignKey: z.boolean().optional(),
  activeFlag: z.string().default("Y"),
  columnDescription: z.string().optional(),
});

type FormData = z.infer<typeof dataDictionaryFormSchema>;

interface DataDictionaryFormProps {
  entry?: DataDictionaryRecord | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DataDictionaryForm({ entry, onSuccess, onCancel }: DataDictionaryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metadata for dropdowns
  const { data: executionLayers = [] } = useQuery({
    queryKey: ['/api/metadata/execution_layer'],
    queryFn: () => fetch('/api/metadata/execution_layer').then(res => res.json()) as Promise<string[]>
  });

  const { data: dataTypes = [] } = useQuery({
    queryKey: ['/api/metadata/data_type'],
    queryFn: () => fetch('/api/metadata/data_type').then(res => res.json()) as Promise<string[]>
  });

  const { data: activeFlags = [] } = useQuery({
    queryKey: ['/api/metadata/active_flag'],
    queryFn: () => fetch('/api/metadata/active_flag').then(res => res.json()) as Promise<string[]>
  });

  const { data: isNotNullOptions = [] } = useQuery({
    queryKey: ['/api/metadata/is_not_null'],
    queryFn: () => fetch('/api/metadata/is_not_null').then(res => res.json()) as Promise<string[]>
  });

  const form = useForm<FormData>({
    resolver: zodResolver(dataDictionaryFormSchema),
    defaultValues: {
      configKey: entry?.configKey || 0,
      executionLayer: entry?.executionLayer || '',
      schemaName: entry?.schemaName || '',
      tableName: entry?.tableName || '',
      attributeName: entry?.attributeName || '',
      dataType: entry?.dataType || '',
      length: entry?.length || undefined,
      precisionValue: entry?.precisionValue || undefined,
      scale: entry?.scale || undefined,
      isNotNull: entry?.isNotNull || false,
      isPrimaryKey: entry?.isPrimaryKey || false,
      isForeignKey: entry?.isForeignKey || false,
      activeFlag: entry?.activeFlag || 'Y',
      columnDescription: entry?.columnDescription || '',
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        configKey: entry.configKey,
        executionLayer: entry.executionLayer,
        schemaName: entry.schemaName || '',
        tableName: entry.tableName || '',
        attributeName: entry.attributeName,
        dataType: entry.dataType,
        length: entry.length || undefined,
        precisionValue: entry.precisionValue || undefined,
        scale: entry.scale || undefined,
        isNotNull: entry.isNotNull || false,
        isPrimaryKey: entry.isPrimaryKey || false,
        isForeignKey: entry.isForeignKey || false,
        activeFlag: entry.activeFlag || 'Y',
        columnDescription: entry.columnDescription || '',
      });
    } else {
      form.reset({
        configKey: 0,
        executionLayer: '',
        schemaName: '',
        tableName: '',
        attributeName: '',
        dataType: '',
        length: undefined,
        precisionValue: undefined,
        scale: undefined,
        isNotNull: false,
        isPrimaryKey: false,
        isForeignKey: false,
        activeFlag: 'Y',
        columnDescription: '',
      });
    }
  }, [entry, form]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const submitData: Partial<InsertDataDictionaryRecord> = {
        ...data,
        createdBy: 'Current User', // In real app, get from auth
        updatedBy: 'Current User',
      };

      if (entry) {
        // Update existing entry
        await fetch(`/api/data-dictionary/${entry.dataDictionaryKey}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        toast({
          title: 'Success',
          description: 'Data dictionary entry updated successfully',
        });
      } else {
        // Create new entry
        await fetch('/api/data-dictionary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        toast({
          title: 'Success',
          description: 'Data dictionary entry created successfully',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving data dictionary entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to save data dictionary entry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Left Section */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="executionLayer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Layer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-execution-layer-form">
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
                  name="configKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Config Key *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter config key"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-config-key-form"
                        />
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
                      <FormLabel>Schema Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter schema name"
                          {...field}
                          data-testid="input-schema-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tableName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Name</FormLabel>
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
                          placeholder="Enter attribute name"
                          {...field}
                          data-testid="input-attribute-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-data-type">
                            <SelectValue placeholder="Select data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dataTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter length"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-length"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="precisionValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precision Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter precision"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-precision"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Section */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scale</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter scale"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-scale"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isNotNull"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is Not Null</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'true')} 
                        value={field.value ? 'true' : 'false'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-is-not-null">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrimaryKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is Primary Key</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'true')} 
                        value={field.value ? 'true' : 'false'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-is-primary-key">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isForeignKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is Foreign Key</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'true')} 
                        value={field.value ? 'true' : 'false'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-is-foreign-key">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-active-flag">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeFlags.map((flag) => (
                            <SelectItem key={flag} value={flag}>{flag}</SelectItem>
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
                name="columnDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter column description..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Business description of the field (max 150 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-save"
            >
              {isLoading ? 'Saving...' : (entry ? 'Update Entry' : 'Save Entry')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}