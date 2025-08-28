import { Link } from 'wouter';
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/login" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4" data-testid="link-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Help & Support
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Get help with your Redpluto Analytics account and platform features
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Options */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Contact Support
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Email</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">support@redpluto.com</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Phone</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">1-800-REDPLUTO</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Live Chat</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Available 24/7</p>
                </div>
              </div>
            </div>
            <Button className="w-full mt-6" data-testid="button-contact-support">
              Contact Support
            </Button>
          </div>

          {/* FAQs */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  How do I reset my password?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click "Forgot password?" on the login page and follow the instructions.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  How do I connect a new data source?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Navigate to Source Connections and click "Add New Connection".
                </p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Where can I view pipeline logs?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Check the Dashboard for pipeline status and detailed logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}