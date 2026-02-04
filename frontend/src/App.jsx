import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Core App Router containing all protected and public routes
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import Login from './pages/Login';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeFormPage from './pages/EmployeeFormPage';
import SystemConfig from './pages/SystemConfig';
import AppMap from './pages/AppMap';
import RolesPermissions from './pages/RolesPermissions';
import UiElements from './pages/UiElements';
import Marketplace from './pages/Marketplace';
import InstalledApps from './pages/InstalledApps';
import MondayConnector from './pages/connectors/MondayConnector';
import MondayAppView from './pages/apps/MondayAppView';
import UserGuide from './pages/UserGuide';
import { ToastProvider } from './context/ToastContext';
import { LayoutProvider } from './context/LayoutContext';
import { ThemeProvider } from './context/ThemeContext';
import { DebugProvider } from './context/DebugContext';
import BarcodeConfig from './pages/BarcodeConfig';

import AuthorizedRoute from './components/AuthorizedRoute';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <LayoutProvider>
            <ThemeProvider>
              <ToastProvider>
                <DebugProvider>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Dashboard />} />

                      {/* User Management - Admin/Manager Only */}
                      <Route path="users" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                          <Users />
                        </AuthorizedRoute>
                      } />

                      <Route path="profile" element={<Profile />} />

                      {/* HR/Employees - Admin/Manager Only */}
                      <Route path="employees" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                          <Employees />
                        </AuthorizedRoute>
                      } />
                      <Route path="employees/new" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                          <EmployeeFormPage />
                        </AuthorizedRoute>
                      } />
                      <Route path="employees/:id/edit" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                          <EmployeeFormPage />
                        </AuthorizedRoute>
                      } />
                      <Route path="employees/:id" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin', 'manager']}>
                          <EmployeeDetail />
                        </AuthorizedRoute>
                      } />

                      {/* System Configuration - Admin Only */}
                      <Route path="system/config" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <SystemConfig />
                        </AuthorizedRoute>
                      } />
                      <Route path="system/roles" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <RolesPermissions />
                        </AuthorizedRoute>
                      } />
                      <Route path="system/user-guide" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <UserGuide />
                        </AuthorizedRoute>
                      } />
                      <Route path="system/mobile-barcode" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <BarcodeConfig />
                        </AuthorizedRoute>
                      } />
                      <Route path="system/map" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <AppMap />
                        </AuthorizedRoute>
                      } />
                      <Route path="ui-elements" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <UiElements />
                        </AuthorizedRoute>
                      } />

                      {/* Marketplace & App Management - Admin Only */}
                      <Route path="marketplace" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <Marketplace />
                        </AuthorizedRoute>
                      } />
                      <Route path="apps" element={
                        <ProtectedRoute>
                          <InstalledApps />
                        </ProtectedRoute>
                      } />
                      {/* Connector Config - usually Admin */}
                      <Route path="apps/monday/:installedAppId" element={
                        <AuthorizedRoute requiredRoles={['super_admin', 'admin']}>
                          <MondayConnector />
                        </AuthorizedRoute>
                      } />
                    </Route>

                    {/* Monday App View - Full Screen (Outside MainLayout) */}
                    <Route path="/apps/:installedAppId/view" element={
                      <ProtectedRoute>
                        <MondayAppView />
                      </ProtectedRoute>
                    } />

                    {/* Catch all - 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </DebugProvider>
              </ToastProvider>
            </ThemeProvider>
          </LayoutProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
