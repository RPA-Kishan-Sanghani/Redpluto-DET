import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from '@/hooks/useAuth';
import { Eye, EyeOff, HelpCircle, Info } from 'lucide-react';
import plutoBackground from '@assets/generated_images/Pluto_space_background_34495b16.png';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return null;
  }

  const validateForm = () => {
    const newErrors = {
      username: '',
      password: ''
    };

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(formData.username, formData.password, formData.rememberMe);
      
      toast({
        title: "Login successful",
        description: "Welcome to Redpluto Analytics!",
      });
      
      // Redirect to dashboard
      setLocation('/');
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (typeof value === 'string' && value.trim() && errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden"
      style={{
        backgroundImage: `url(${plutoBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Pluto Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/30"></div>
      
      {/* Floating Animation Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/6 w-1.5 h-1.5 bg-indigo-400/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-blue-300/40 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-10 w-full px-6 py-4 bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <span className="text-white font-bold text-sm">RP</span>
            </div>
            <span className="text-xl font-semibold text-white/90 hover:text-white transition-colors duration-200">
              Redpluto Analytics
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/help" 
              className="flex items-center space-x-1 text-white/70 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
              data-testid="link-help"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help</span>
            </Link>
            <Link 
              href="/about" 
              className="flex items-center space-x-1 text-white/70 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
              data-testid="link-about"
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 hover:rotate-1">
              <span className="text-white font-bold text-2xl">RP</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome Back
            </h1>
            <p className="text-white/80 drop-shadow-sm">
              Sign in to your Redpluto Analytics account
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`group transition-all duration-300 bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm border-slate-300 dark:border-slate-600 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg focus:shadow-xl hover:scale-[1.01] focus:scale-[1.02] ${
                    errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30 animate-shake' : ''
                  }`}
                  data-testid="input-username"
                />
                {errors.username && (
                  <p className="text-sm text-red-600 dark:text-red-400" data-testid="error-username">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pr-12 group transition-all duration-300 bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm border-slate-300 dark:border-slate-600 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-lg focus:shadow-xl hover:scale-[1.01] focus:scale-[1.02] ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30 animate-shake' : ''
                    }`}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-md p-1"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400" data-testid="error-password">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 group">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                    className="transition-all duration-200 hover:scale-110 focus:scale-110"
                    data-testid="checkbox-remember-me"
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer transition-colors duration-200 group-hover:text-slate-800 dark:group-hover:text-slate-100"
                  >
                    Remember me
                  </Label>
                </div>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-200 hover:scale-105 focus:scale-105 hover:underline"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.03] focus:scale-[1.03] hover:shadow-2xl focus:ring-4 focus:ring-blue-500/30 active:scale-[0.98] disabled:scale-100 disabled:shadow-none hover:rotate-1 focus:rotate-1 disabled:rotate-0 group"
                data-testid="button-login"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Log In</span>
                    <span className="opacity-75 group-hover:opacity-100 transition-opacity">✨</span>
                  </span>
                )}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 dark:text-slate-300">
                Don't have an account?{' '}
                <Link 
                  href="/signup" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-all duration-200 hover:scale-105 focus:scale-105 hover:underline"
                  data-testid="link-signup"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-white/60 hover:text-white/80 transition-colors duration-200">
            <p>© 2025 Redpluto Analytics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}