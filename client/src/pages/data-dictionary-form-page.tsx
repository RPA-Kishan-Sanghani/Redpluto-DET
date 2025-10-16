
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataDictionaryFormRedesigned } from "../components/data-dictionary-form-redesigned";
import type { DataDictionaryRecord } from '@shared/schema';

export function DataDictionaryFormPage() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/data-dictionary/form/:id");
  const entryId = params?.id;
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  // Fetch the entry data if we have an ID (editing mode)
  const { data: editingEntry, isLoading } = useQuery({
    queryKey: ['/api/data-dictionary', entryId],
    queryFn: async () => {
      if (!entryId) return null;
      const response = await fetch(`/api/data-dictionary/${entryId}`);
      if (!response.ok) throw new Error('Failed to fetch entry');
      return response.json();
    },
    enabled: !!entryId,
  });

  const handleSuccess = () => {
    setLocation('/data-dictionary');
  };

  const handleCancelClick = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    setLocation('/data-dictionary');
  };

  // Show loading state while fetching entry data
  if (entryId && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entry data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleCancelClick}
            className="flex items-center space-x-2"
            data-testid="button-back-to-dictionary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Data Dictionary</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {editingEntry ? 'Edit Data Dictionary Entry' : 'Add New Data Dictionary Entry'}
            </h1>
            <p className="text-gray-600">
              Configure metadata and schema information for data pipelines
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <DataDictionaryFormRedesigned
              entry={editingEntry || null}
              onSuccess={handleSuccess}
              onCancel={handleCancelClick}
            />
          </div>
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Do you really want to close the screen?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved changes will be lost if you close this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dialog-cancel-exit">No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} data-testid="dialog-confirm-exit">Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
