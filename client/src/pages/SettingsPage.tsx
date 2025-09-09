
import { useState } from "react";
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
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
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

        
      </Tabs>
    </div>
  );
}
