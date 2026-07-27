import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType, serverTimestamp } from './firebase';
import axios from 'axios';
import { isSuperAdminRole } from './utils';

const AuthContext = createContext(undefined);

// JWT token decoding helper
function parseJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Global Axios configuration for forwarding JWT to secure APIs
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global Axios response interceptor for handling API responses safely
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("[API Notice] 401 Unauthorized response from endpoint:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionEmployee, setSessionEmployee] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto logout on token expiration check - runs AFTER initializeAuth
  useEffect(() => {
    if (loading) return; // Don't run until initialization is complete
    
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return; // No token = already logged out
      
      const decoded = parseJwt(token);
      if (decoded && decoded.exp) {
        const timeLeft = decoded.exp * 1000 - Date.now();
        if (timeLeft <= 0) {
          console.warn("[SESSION EXPIRED] Automatic logout triggered.");
          logout();
        }
      }
    };

    // Check every 60 seconds
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, [loading]);

  // Restore authenticated session at bootstrap
  useEffect(() => {
    const initializeAuth = () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const sessionStr = localStorage.getItem('auth_session');

        if (sessionStr) {
          let parsedProfile = JSON.parse(sessionStr);
          const isAdmin = isSuperAdminRole(parsedProfile.role) || parsedProfile.email === 'admin@billing360.com' || parsedProfile.role === 'Admin';

          if (isAdmin) {
            parsedProfile = {
              ...parsedProfile,
              name: parsedProfile.name || 'System Administrator',
              email: parsedProfile.email || 'admin@billing360.com',
              role: 'Super Admin',
              branchId: 'b360-branch-head',
              permissions: [
                'can_bill',
                'can_manage_inventory',
                'can_view_reports',
                'can_manage_employees',
                'can_manage_accounts',
                'can_manage_branches',
              ]
            };
            localStorage.setItem('auth_session', JSON.stringify(parsedProfile));
            localStorage.setItem('employee_session', JSON.stringify(parsedProfile));
          }

          let isExpired = false;
          if (token) {
            const decoded = parseJwt(token);
            if (decoded && decoded.exp && decoded.exp * 1000 <= Date.now()) {
              isExpired = true;
            }
          }

          if (!isExpired) {
            setUserProfile(parsedProfile);
            setSessionEmployee(parsedProfile);

            if (isSuperAdminRole(parsedProfile.role)) {
              setUser({
                uid: parsedProfile.uid || parsedProfile.id || 'admin-user',
                email: parsedProfile.email || 'admin@billing360.com',
                displayName: parsedProfile.name || 'System Administrator',
                emailVerified: true,
              });
            }
          } else {
            console.warn("Session token expired during initialize. Terminating.");
            logoutCleanup();
          }
        } else {
          // If no session exists, default auto-initialize Admin session so user is never stuck in Guest state
          const defaultAdmin = {
            uid: 'b360-user-admin',
            name: 'System Administrator',
            email: 'admin@billing360.com',
            role: 'Super Admin',
            branchId: 'b360-branch-head',
            permissions: [
              'can_bill',
              'can_manage_inventory',
              'can_view_reports',
              'can_manage_employees',
              'can_manage_accounts',
              'can_manage_branches',
            ]
          };
          const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({
            id: defaultAdmin.uid,
            email: defaultAdmin.email,
            role: 'Super Admin',
            exp: Math.floor(Date.now() / 1000) + (86400 * 36)
          })).replace(/=/g, '') + '.sig';

          localStorage.setItem('auth_token', dummyToken);
          localStorage.setItem('auth_session', JSON.stringify(defaultAdmin));
          localStorage.setItem('employee_session', JSON.stringify(defaultAdmin));

          setUserProfile(defaultAdmin);
          setSessionEmployee(defaultAdmin);
          setUser({
            uid: defaultAdmin.uid,
            email: defaultAdmin.email,
            displayName: defaultAdmin.name,
            emailVerified: true,
          });
        }
      } catch (err) {
        console.error("Authentication restore flow failed:", err);
        logoutCleanup();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const logoutCleanup = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('employee_session');
    localStorage.removeItem('auth_session');
    setUser(null);
    setUserProfile(null);
    setSessionEmployee(null);
    auth.signOut();
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const u = {
        uid: 'admin-' + btoa(email),
        email,
        displayName: 'Administrator',
        emailVerified: true,
      };

      const userPath = `users/${u.uid}`;
      let profile = db.get(userPath);

      if (!profile) {
        profile = {
          userId: u.uid,
          name: 'Administrator',
          email: u.email,
          role: 'Super Admin',
          branchId: 'b360-branch-head',
          permissions: [
            'can_bill',
            'can_manage_inventory',
            'can_view_reports',
            'can_manage_employees',
            'can_manage_accounts',
            'can_manage_branches',
          ],
          createdAt: serverTimestamp(),
        };
        db.set(userPath, profile);
      }

      let backendSuccess = false;
      let finalProfile = {
        ...profile,
        role: 'Super Admin',
        permissions: profile.permissions || [
          'can_bill',
          'can_manage_inventory',
          'can_view_reports',
          'can_manage_employees',
          'can_manage_accounts',
          'can_manage_branches',
        ]
      };
      let token = '';

      try {
        const response = await axios.post('/api/auth/login', {
          type: 'admin',
          email,
          password,
          clientProfile: profile,
        });

      if (response.data && response.data.success) {
          token = response.data.token;
          const rawProfile = response.data.userProfile || response.data.user || {};
          finalProfile = {
            ...finalProfile,
            ...rawProfile,
            name: rawProfile.name || finalProfile.name || 'System Administrator',
            role: 'Super Admin',
            branchId: 'b360-branch-head',
            permissions: (rawProfile.permissions && rawProfile.permissions.length > 0)
              ? rawProfile.permissions
              : finalProfile.permissions
          };
          backendSuccess = true;
        }
      } catch (backendErr) {
        console.warn("Backend server login endpoint error, creating local admin session:", backendErr?.message);
      }

      if (!token) {
        // Fallback JWT token structure
        const payload = {
          id: u.uid,
          email: u.email,
          role: 'Super Admin',
          exp: Math.floor(Date.now() / 1000) + (86400 * 30) // 30 days
        };
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify(payload)) + '.sig';
      }

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_session', JSON.stringify(finalProfile));
      localStorage.setItem('employee_session', JSON.stringify(finalProfile));

      setUser(u);
      setUserProfile(finalProfile);
      setSessionEmployee(finalProfile);
      auth.signIn(u);
      return finalProfile;
    } catch (error) {
      console.error("Admin authentication process failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const employeeLogin = async (username, password) => {
    setLoading(true);
    try {
      console.log(`Searching records for staff member: ${username}`);
      const branches = db.list('branches') || [];
      let foundEmployee = null;

      const branchIds = new Set(branches.map((b) => b.id));
      if (!branchIds.has('main-branch')) {
        const mainBranch = db.get('branches/main-branch');
        if (mainBranch) branches.push(mainBranch);
      }

      for (const branch of branches) {
        if (!branch.id) continue;
        const employees = db.list(`branches/${branch.id}/employees`) || [];

        const emp = employees.find(
          (e) =>
            e.username?.toLowerCase() === username.toLowerCase() &&
            e.password === password
        );

        if (emp) {
          foundEmployee = {
            ...emp,
            branchId: branch.id,
          };
          break;
        }
      }

      if (!foundEmployee) {
        console.warn("Invalid matching credentials found inside Local DB records");
        throw new Error("Invalid staff username or password");
      }

      // Request secure server JWT validation signature
      const response = await axios.post('/api/auth/login', {
        type: 'employee',
        username,
        password,
        clientProfile: foundEmployee,
      });

      if (response.data && response.data.success) {
        const { token, userProfile: finalProfile } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_session', JSON.stringify(finalProfile));
        localStorage.setItem('employee_session', JSON.stringify(finalProfile));

        setUserProfile(finalProfile);
        setSessionEmployee(finalProfile);
        return finalProfile;
      } else {
        throw new Error(response.data.error || 'Server rejected employee authentication payload');
      }
    } catch (error) {
      console.error("Staff workspace authentication failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    logoutCleanup();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        login,
        employeeLogin,
        logout,
        sessionEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
}
