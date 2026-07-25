import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { isSuperAdminRole } from '../../lib/utils';

// Protected Route - Safeguards standard views and redirects unauthenticated users to '/login'
export function ProtectedRoute({ children }) {
  const { userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-blue-600 tracking-widest text-xs uppercase animate-pulse">Initializing Billing360 Session...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    // Keep 'from' location to enable convenient back redirection after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Admin / Permission Route - Ensures role-based or permission-based route safety
export function AdminRoute({ children, requiredPermission }) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-blue-600 tracking-widest text-xs uppercase animate-pulse">Verifying Permissions...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin / Owner bypasses all checks
  if (isSuperAdminRole(userProfile?.role)) {
    return children;
  }

  // Check permission requirement
  const hasAccess = requiredPermission
    ? userProfile.permissions?.includes(requiredPermission)
    : false;

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto my-12">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Restrained</h2>
        <p className="text-slate-500 font-medium mb-6">
          You lack the required operational clearance ({requiredPermission}) to render this administrative board.
        </p>
        <a 
          href="/" 
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all hover:shadow-blue-600/10"
        >
          Return to Hub
        </a>
      </div>
    );
  }

  return children;
}
