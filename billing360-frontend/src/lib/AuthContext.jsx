import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType, serverTimestamp } from './firebase';
import axios from 'axios';

const AuthContext = createContext(undefined);

// JWT token decoding helper
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
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

// Global Axios response interceptor for automatic prompt logout on unauthorized/expired calls
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unsecured, unauthorized or expired JWT token detected. Forcing auto-logout.");
      localStorage.removeItem('auth_token');
      localStorage.removeItem('employee_session');
      localStorage.removeItem('auth_session');
      // Redirect to trigger a clean login reload
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionEmployee, setSessionEmployee] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto logout on token expiration check
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.exp) {
          const timeLeft = decoded.exp * 1000 - Date.now();
          if (timeLeft <= 0) {
            console.warn("[SESSION EXPIRED] Automatic logout triggered by expiration checker.");
            logout();
          }
        } else {
          logout();
        }
      }
    };

    // Check immediately and then every 3 seconds to ensure rapid auto-logout
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 3000);
    return () => clearInterval(interval);
  }, []);

  // Restore authenticated session at bootstrap
  useEffect(() => {
    const initializeAuth = () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const sessionStr = localStorage.getItem('auth_session');

        if (token && sessionStr) {
          const decoded = parseJwt(token);
          if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
            const parsedProfile = JSON.parse(sessionStr);
            setUserProfile(parsedProfile);
            setSessionEmployee(parsedProfile);

            if (parsedProfile.role === 'Super Admin') {
              setUser({
                uid: parsedProfile.uid,
                email: parsedProfile.email,
                displayName: parsedProfile.name,
                emailVerified: true,
              });
            }
          } else {
            console.warn("Session token expired or corrupted during initialize. Terminating.");
            logoutCleanup();
          }
        } else {
          logoutCleanup();
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
          branchId: 'main-branch',
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

        if (!db.get('branches/main-branch')) {
          db.set('branches/main-branch', {
            id: 'main-branch',
            name: 'Main Branch',
            address: 'Corporate Office',
            phone: '1234567890',
            createdAt: serverTimestamp(),
          });
        }
      }

      // Contact our secure Express backend to issue standard JWT signature
      const response = await axios.post('/api/auth/login', {
        type: 'admin',
        email,
        password,
        clientProfile: profile,
      });

      if (response.data && response.data.success) {
        const { token, userProfile: finalProfile } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_session', JSON.stringify(finalProfile));
        localStorage.setItem('employee_session', JSON.stringify(finalProfile));

        setUser(u);
        setUserProfile(finalProfile);
        setSessionEmployee(finalProfile);
        auth.signIn(u);
        return finalProfile;
      } else {
        throw new Error(response.data.error || 'Identity verification failed server-side');
      }
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
