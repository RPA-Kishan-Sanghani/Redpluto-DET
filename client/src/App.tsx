import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import SourceConnections from "@/pages/source-connections";
import { Pipelines } from "@/pages/pipelines";
import { DataDictionary } from "@/pages/data-dictionary";
import { Reconciliation } from "@/pages/reconciliation";
import { DataQuality } from "@/pages/data-quality";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/source-connections" component={SourceConnections} />
      <Route path="/pipelines" component={Pipelines} />
      <Route path="/data-dictionary" component={DataDictionary} />
      <Route path="/reconciliation" component={Reconciliation} />
      <Route path="/data-quality" component={DataQuality} />
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
