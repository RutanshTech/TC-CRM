import { Navigate } from "react-router-dom";

// Check if user has permission to access a specific feature
const hasPermission = (feature) => {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) return false;
  
  // Super admin has all permissions
  if (currentUser.role === 'super-admin') return true;
  
  // Check adminAccess permissions for admin users
  if (currentUser.role === 'admin' && currentUser.adminAccess) {
    return currentUser.adminAccess[feature] || currentUser.adminAccess.allThings;
  }
  
  // Check employee access permissions
  if (currentUser.role === 'employee' && currentUser.access) {
    return currentUser.access[feature] || false;
  }
  
  return false;
};

// Check if user can access admin pages
const canAccessAdmin = () => {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  return currentUser && (currentUser.role === 'super-admin' || currentUser.role === 'admin');
};

// Check if user can access employee management
const canAccessEmployeeManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) return false;
  
  if (currentUser.role === 'super-admin') return true;
  if (currentUser.role === 'admin' && currentUser.adminAccess) {
    return currentUser.adminAccess.employee || currentUser.adminAccess.allThings;
  }
  return false;
};

export default function PrivateRoute({ isAuthenticated, children, requiredPermission = null, requireAdmin = false, requireEmployeeManagement = false }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check admin access
  if (requireAdmin && !canAccessAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Check employee management access
  if (requireEmployeeManagement && !canAccessEmployeeManagement()) {
    return <Navigate to="/" replace />;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return children;
} 