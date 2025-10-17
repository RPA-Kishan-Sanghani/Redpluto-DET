
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Settings, LogOut, Key, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthState } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";


export function SettingsPage() {
  const { user, logout } = useAuthState();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    setLocation('/login');
  };

  const handleSaveProfile = () => {
    // Here you would typically make an API call to update the profile
    // For now, we'll just show a success message
    setIsEditingProfile(false);
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and application configuration
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Config Database
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                View and update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" alt={user?.username || "User"} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.firstName
                        ? user.firstName
                        : user?.username || 'User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isEditingProfile) {
                        // Reset form data when canceling
                        setProfileData({
                          firstName: user?.firstName || "",
                          lastName: user?.lastName || "",
                        });
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                  >
                    {isEditingProfile ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={isEditingProfile ? profileData.firstName : (user?.firstName || "")}
                    disabled={!isEditingProfile}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={isEditingProfile ? profileData.lastName : (user?.lastName || "")}
                    disabled={!isEditingProfile}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled={true}
                    placeholder="Username cannot be changed"
                    className="bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled={true}
                    placeholder="Email cannot be changed"
                    className="bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {isEditingProfile && (
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setProfileData({
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
                      });
                      setIsEditingProfile(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account and session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-muted-foreground">
                      Update your account password
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Sign Out</p>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your account
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <ConfigDatabaseSettings userId={user?.id} />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}

// Config Database Settings Component
function ConfigDatabaseSettings({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    sslEnabled: false,
    connectionTimeout: 10000,
  });

  // Fetch existing settings on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`/api/user-config-db-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setSettings({
              host: data.host || '',
              port: data.port || 5432,
              database: data.database || '',
              username: data.username || '',
              password: data.password || '',
              sslEnabled: data.sslEnabled || false,
              connectionTimeout: data.connectionTimeout || 10000,
            });
          }
        })
        .catch(err => console.error('Error loading settings:', err));
    }
  }, [userId]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/user-config-db-settings/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message + (result.details ? `: ${result.details}` : ''),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive",
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if settings exist
      const checkResponse = await fetch(`/api/user-config-db-settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const exists = checkResponse.ok;

      const url = exists 
        ? `/api/user-config-db-settings`
        : '/api/user-config-db-settings';
      const method = exists ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your config database settings have been saved successfully.",
        });
        setIsEditing(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Config Database Settings</CardTitle>
        <CardDescription>
          Configure your external database connection for data operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              data-testid="input-host"
              value={settings.host}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="e.g., 4.240.90.166"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              data-testid="input-port"
              type="number"
              value={settings.port}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
              placeholder="5432"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              data-testid="input-database"
              value={settings.database}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('database', e.target.value)}
              placeholder="e.g., config_db"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              data-testid="input-username"
              value={settings.username}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Database username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              data-testid="input-password"
              type="password"
              value={settings.password}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Database password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
            <Input
              id="connectionTimeout"
              data-testid="input-timeout"
              type="number"
              value={settings.connectionTimeout}
              disabled={!isEditing}
              onChange={(e) => handleInputChange('connectionTimeout', parseInt(e.target.value))}
              placeholder="10000"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="sslEnabled"
            data-testid="checkbox-ssl"
            checked={settings.sslEnabled}
            disabled={!isEditing}
            onChange={(e) => handleInputChange('sslEnabled', e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="sslEnabled" className="cursor-pointer">
            Enable SSL
          </Label>
        </div>

        <div className="flex justify-between pt-4">
          <div className="space-x-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} data-testid="button-edit">
                Edit Settings
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  data-testid="button-save"
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </>
            )}
          </div>
          <Button 
            variant="secondary" 
            onClick={handleTestConnection}
            disabled={isTesting || !settings.host || !settings.database}
            data-testid="button-test"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

