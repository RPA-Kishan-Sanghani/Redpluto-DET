import { useLocation } from "wouter";
import { Database, Home, Database as DataIcon, GitBranch, FileText, RefreshCw, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: Home, testId: 'link-dashboard' },
  { path: '/source-connections', label: 'Source Connections', icon: DataIcon, testId: 'link-source-connections' },
  { path: '/pipelines', label: 'Data Pipeline', icon: GitBranch, testId: 'link-pipelines' },
  { path: '/data-dictionary', label: 'Data Dictionary', icon: FileText, testId: 'link-data-dictionary' },
  { path: '/reconciliation', label: 'Data Reconciliation', icon: RefreshCw, testId: 'link-data-reconciliation' },
  { path: '/data-quality', label: 'Data Quality', icon: BarChart3, testId: 'link-data-quality' },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-2">
          <Database className="text-blue-600 h-6 w-6 flex-shrink-0" />
          <span className="font-bold text-gray-900 group-data-[collapsible=icon]:hidden">DataOps</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  onClick={() => setLocation(item.path)}
                  isActive={location === item.path}
                  tooltip={item.label}
                  data-testid={item.testId}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}