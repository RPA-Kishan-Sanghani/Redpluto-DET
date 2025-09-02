import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import SourceConnections from "@/pages/source-connections";
import { Pipelines } from "@/pages/pipelines";
import { DataDictionary } from "@/pages/data-dictionary";
import { DataDictionaryFormPage } from "./pages/data-dictionary-form-page";
import { Reconciliation } from "@/pages/reconciliation";
import { DataQuality } from "@/pages/data-quality";
import LoginPage from "@/pages/LoginPage";
import HelpPage from "@/pages/HelpPage";
import AboutPage from "@/pages/AboutPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import SignUpPage from "@/pages/SignUpPage";
import NotFound from "@/pages/not-found";
import { useAuthState } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuthState();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/source-connections" component={() => <ProtectedRoute component={SourceConnections} />} />
      <Route path="/pipelines" component={() => <ProtectedRoute component={Pipelines} />} />
      <Route path="/data-dictionary" component={() => <ProtectedRoute component={DataDictionary} />} />
      <Route path="/data-dictionary/form" component={() => <ProtectedRoute component={DataDictionaryFormPage} />} />
      <Route path="/data-quality" component={() => <ProtectedRoute component={DataQuality} />} />
      <Route path="/reconciliation" component={() => <ProtectedRoute component={Reconciliation} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;