
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataDictionaryFormRedesigned } from "../components/data-dictionary-form-redesigned";
import type { DataDictionaryRecord } from '@shared/schema';

export function DataDictionaryFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingEntry = location.state?.entry as DataDictionaryRecord | null;

  const handleSuccess = () => {
    navigate('/data-dictionary');
  };

  const handleCancel = () => {
    navigate('/data-dictionary');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/data-dictionary')}
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
              entry={editingEntry}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
