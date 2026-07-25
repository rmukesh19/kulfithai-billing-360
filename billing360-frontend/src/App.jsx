/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import GSTReports from './pages/GSTReports';
import TallyExport from './pages/TallyExport';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Masters from './pages/Masters';
import Employees from './pages/Employees';
import BarcodeManagement from './pages/BarcodeManagement';
import Login from './pages/Login';
import DataImport from './pages/DataImport';
import { useAuth } from './lib/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/layout/RouteGuards';
import { isSuperAdminRole } from './lib/utils';

export default function App() {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-blue-600 tracking-widest text-xs uppercase animate-pulse">Initializing Billing360...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route 
          path="/login" 
          element={
            userProfile ? <Navigate to="/" replace /> : <Login />
          } 
        />

        {/* Guarded app pathways */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={isSuperAdminRole(userProfile?.role) ? <SuperAdminDashboard /> : <Dashboard />} />
                  <Route path="/billing" element={<POS />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/barcode" element={<BarcodeManagement />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/masters" element={<Masters />} />
                  
                  {/* Admin Protected Routes */}
                  <Route 
                    path="/accounting" 
                    element={
                      <AdminRoute requiredPermission="can_manage_accounts">
                        <Accounting />
                      </AdminRoute>
                    } 
                  />
                  <Route path="/gst" element={<GSTReports />} />
                  <Route path="/tally" element={<TallyExport />} />
                  
                  <Route 
                    path="/reports" 
                    element={
                      <AdminRoute requiredPermission="can_view_reports">
                        <Reports />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route 
                    path="/employees" 
                    element={
                      <AdminRoute requiredPermission="can_manage_employees">
                        <Employees />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route 
                    path="/import" 
                    element={
                      <AdminRoute requiredPermission="can_manage_branches">
                        <DataImport />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route path="/notifications" element={<Notifications />} />
                  
                  <Route 
                    path="/settings" 
                    element={
                      <AdminRoute requiredPermission="can_manage_branches">
                        <Settings />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
