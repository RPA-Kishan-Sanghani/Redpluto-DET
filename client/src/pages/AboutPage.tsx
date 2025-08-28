import { Link } from 'wouter';
import { ArrowLeft, Users, Target, Award } from 'lucide-react';

export default function AboutPage() {
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
            About Redpluto Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Empowering data-driven decisions through comprehensive DataOps platform
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Company Overview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Our Mission
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Redpluto Analytics is a comprehensive DataOps platform designed to streamline data pipeline 
            management and connection workflows. We empower organizations to efficiently monitor, manage, 
            and optimize their data infrastructure with real-time visibility and advanced analytics.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Team Collaboration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Built for teams to collaborate effectively on data operations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Precision Monitoring</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Real-time monitoring with detailed pipeline health metrics
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Quality Assurance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Comprehensive data quality checks and validation workflows
              </p>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Platform Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Dashboard & Monitoring
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Real-time pipeline metrics, DAG status tracking, and comprehensive error monitoring
                across Bronze, Silver, and Gold data layers.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Source Connections
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Seamless integration with multiple data sources including databases, APIs, 
                and file systems with automated connection testing.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Pipeline Management
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Configure, schedule, and monitor data pipelines with detailed execution 
                tracking and automated error handling.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Data Quality & Reconciliation
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Advanced data quality checks, validation rules, and reconciliation 
                processes to ensure data integrity.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Get In Touch
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Ready to transform your data operations? Contact our team to learn more about 
            how Redpluto Analytics can help your organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/help" 
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              data-testid="link-contact-sales"
            >
              Contact Sales
            </Link>
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
              data-testid="link-start-trial"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}