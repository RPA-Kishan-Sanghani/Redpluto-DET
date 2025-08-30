import { useState } from "react";
import { useLocation } from "wouter";
import { Database, Bell, ChevronDown, User, Settings, LogOut, Home, Database as DataIcon, GitBranch, FileText, RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar";

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: Home, testId: 'link-dashboard' },
  { path: '/source-connections', label: 'Source Connections', icon: DataIcon, testId: 'link-source-connections' },
  { path: '/pipelines', label: 'Data Pipeline', icon: GitBranch, testId: 'link-pipelines' },
  { path: '/data-dictionary', label: 'Data Dictionary', icon: FileText, testId: 'link-data-dictionary' },
  { path: '/reconciliation', label: 'Data Reconciliation', icon: RefreshCw, testId: 'link-data-reconciliation' },
  { path: '/data-quality', label: 'Data Quality', icon: BarChart3, testId: 'link-data-quality' },
];

function AppSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-2">
          <Database className="text-blue-600 h-6 w-6" />
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

export default function Header() {
  const { user, logout } = useAuthState();
  const { toast } = useToast();
  const [errorCount] = useState(3);
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    setLocation('/login');
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left side: Sidebar toggle and Welcome */}
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <div className="hidden md:block">
                  <span className="text-xs lg:text-sm text-gray-600 whitespace-nowrap">
                    Welcome back, <span className="font-medium text-gray-900" data-testid="text-username">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.firstName 
                          ? user.firstName 
                          : user?.username || 'User'}
                    </span>!
                  </span>
                </div>
              </div>

              {/* Right side: Notifications and Profile */}
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-1 text-gray-400 hover:text-gray-500"
                    data-testid="button-notifications"
                  >
                    <Bell className="text-lg" />
                    {errorCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" data-testid="text-error-count">
                        {errorCount}
                      </span>
                    )}
                  </Button>
                </div>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center text-sm" data-testid="button-user-menu">
                      <img
                        className="h-8 w-8 rounded-full bg-gray-300"
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt="User avatar"
                        data-testid="img-avatar"
                      />
                      <ChevronDown className="ml-2 text-gray-400 text-xs" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem data-testid="button-profile">
                      <User className="mr-3 h-4 w-4 text-gray-400" />
                      Your Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="button-settings">
                      <Settings className="mr-3 h-4 w-4 text-gray-400" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
      </SidebarInset>
    </SidebarProvider>
  );
}