import { useState } from "react";
import { useLocation } from "wouter";
import { Database, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [username] = useState("John Doe");
  const [errorCount] = useState(3);
  const [location, setLocation] = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Logo and Welcome */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0 flex items-center">
              <Database className="text-blue-600 text-2xl mr-3" />
              <h1 className="text-xl font-bold text-gray-900" data-testid="text-app-name">DataOps</h1>
            </div>
            <div className="hidden md:block">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium text-gray-900" data-testid="text-username">{username}</span>!
              </span>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden lg:flex space-x-8">
            <button
              onClick={() => setLocation('/')}
              className={`px-3 py-2 rounded-md text-sm font-medium border-b-2 ${
                location === '/' 
                  ? 'text-blue-600 hover:text-blue-700 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
              data-testid="link-dashboard"
            >
              Dashboard
            </button>
            <button
              onClick={() => setLocation('/source-connections')}
              className={`px-3 py-2 rounded-md text-sm font-medium border-b-2 ${
                location === '/source-connections' 
                  ? 'text-blue-600 hover:text-blue-700 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
              data-testid="link-source-connections"
            >
              Source Connections
            </button>
            <button
              onClick={() => setLocation('/pipelines')}
              className={`px-3 py-2 rounded-md text-sm font-medium border-b-2 ${
                location === '/pipelines' 
                  ? 'text-blue-600 hover:text-blue-700 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
              data-testid="link-pipelines"
            >
              Pipelines
            </button>
            <button
              onClick={() => setLocation('/data-dictionary')}
              className={`px-3 py-2 rounded-md text-sm font-medium border-b-2 ${
                location === '/data-dictionary' 
                  ? 'text-blue-600 hover:text-blue-700 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
              data-testid="link-data-dictionary"
            >
              Data Dictionary
            </button>
            <button
              onClick={() => setLocation('#')}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-transparent hover:border-gray-300"
              data-testid="link-data-reconciliation"
            >
              Data Reconciliation
            </button>
            <button
              onClick={() => setLocation('#')}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-transparent hover:border-gray-300"
              data-testid="link-data-quality"
            >
              Data Quality
            </button>
          </nav>

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
                <DropdownMenuItem data-testid="button-logout">
                  <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
