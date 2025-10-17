import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook for local auth state management
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      // Check for stored session
      const storedUser = localStorage.getItem('user');
      const sessionExpiry = localStorage.getItem('sessionExpiry');
      
      if (storedUser && sessionExpiry) {
        const expiryTime = new Date(sessionExpiry);
        const now = new Date();
        
        if (now < expiryTime) {
          setUser(JSON.parse(storedUser));
        } else {
          // Session expired
          localStorage.removeItem('user');
          localStorage.removeItem('sessionExpiry');
          localStorage.removeItem('rememberMe');
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string, rememberMe = false) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const { user } = await response.json();
        setUser(user);
        
        // Store session
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set session expiry (15 hours as specified in requirements)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 15);
        localStorage.setItem('sessionExpiry', expiryTime.toISOString());
        
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Invalid credentials');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const logout = async () => {
    // Log sign out activity
    if (user?.id) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': user.id,
          },
        });
      } catch (error) {
        console.error('Error logging logout activity:', error);
      }
    }

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('rememberMe');
  };

  // Session timeout warning (can be extended)
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = () => {
      const sessionExpiry = localStorage.getItem('sessionExpiry');
      if (sessionExpiry) {
        const expiryTime = new Date(sessionExpiry);
        const now = new Date();
        const timeUntilExpiry = expiryTime.getTime() - now.getTime();
        
        // Warn 5 minutes before expiry
        if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0) {
          // TODO: Show session timeout warning
          console.warn('Session will expire in 5 minutes');
        } else if (timeUntilExpiry <= 0) {
          logout();
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkSession
  };
};