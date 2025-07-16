import { LayoutDashboard, Users, Settings, LogOut, ChevronLeft, ChevronRight, Shield, DollarSign, Calendar, CreditCard, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const Sidebar = ({ onLogout, onCollapseChange }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const userType = localStorage.getItem('userType') || 'user';
  
  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  // Check if user has permission to access a specific feature
  const hasPermission = (feature) => {
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

  // Define navigation links based on user role
  const getNavLinks = () => {
    // For employees, show Dashboard, Your Leads, Claim, and Leave Application
    if (currentUser && currentUser.role === 'employee') {
      const links = [
        { to: "/", icon: <LayoutDashboard />, label: "Dashboard" },
        { to: "/your-leads", icon: <Users />, label: "Your Leads" },
        { to: "/your-sheet", icon: <Users />, label: "Your Sheet" }, // NEW LINK
        { to: "/claim", icon: <CreditCard />, label: "Claim" },
        { to: "/leave-application", icon: <Calendar />, label: "Leave Application" },
      ];
      // Add Add Lead link if employee has leadAdd access
      if (currentUser.access?.leadAdd) {
        links.splice(3, 0, { to: "/add-lead", icon: <UserPlus />, label: "Add Lead" });
      }
      return links;
    }
    // For operations, show Operations Dashboard and individual pages
    if (currentUser && currentUser.role === 'operation') {
      return [
        { to: "/operations-dashboard", icon: <LayoutDashboard />, label: "Operations Dashboard" },
        { to: "/leads", icon: <Users />, label: "Leads" },
        { to: "/operations-add-lead", icon: <UserPlus />, label: "Add Lead" },
      ];
    }
    // For advocate, show Advocate page
    if (currentUser && currentUser.role === 'advocate') {
      return [
        { to: "/advocate-leads", icon: <Users />, label: "All Leads" },
      ];
    }
    // For admin and super-admin, show Dashboard and Leads (no Leave Application)
    const baseLinks = [
      { to: "/", icon: <LayoutDashboard />, label: "Dashboard" },
      { to: "/leads", icon: <Users />, label: "Leads" },
    ];

    // Add role-specific links
    if (currentUser) {
      if (currentUser.role === 'super-admin') {
        // Super admin sees everything
        baseLinks.push(
          { to: "/admin", icon: <Shield />, label: "Admin" },
          { to: "/employee", icon: <Users />, label: "Employee" },
          { to: "/create-advocate", icon: <UserPlus />, label: "Create Advocate" },
          { to: "/payment-management", icon: <DollarSign />, label: "Payment Management" },
          { to: "/operation", icon: <Shield />, label: "Operations" }
        );
      } else if (currentUser.role === 'admin') {
        // Admin sees admin pages and employee management if they have permission
        if (hasPermission('employee')) {
          baseLinks.push({ to: "/employee", icon: <Users />, label: "Employee" });
        }
        // Only show Create Advocate if admin has advocate permission
        if (currentUser.adminAccess?.advocate) {
          baseLinks.push({ to: "/create-advocate", icon: <UserPlus />, label: "Create Advocate" });
        }
        baseLinks.push({ to: "/payment-management", icon: <DollarSign />, label: "Payment Management" });
        // Only show Operations if admin has operation permission
        if (currentUser.adminAccess?.operation) {
          baseLinks.push({ to: "/operation", icon: <Shield />, label: "Operations" });
        }
      }
    }
    return baseLinks;
  };

  const navLinks = getNavLinks();
  
  return (
    <div className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col shadow-lg transition-all duration-300 z-50 ${collapsed ? 'w-12' : 'w-44'}`}>
      {/* Branding */}
      <div className={`flex items-center gap-2 p-3 border-b border-gray-100 ${collapsed ? 'justify-center' : 'justify-between'} flex-shrink-0`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-md">
              <span>C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800">CRM System</span>
              <span className="text-xs text-gray-500">
                {currentUser?.role === 'super-admin' ? 'Super Admin' : 
                 currentUser?.role === 'admin' ? 'Admin' : 
                 currentUser?.role === 'employee' ? 'Employee' : 
                 currentUser?.role === 'operation' ? 'Operation' : 
                 currentUser?.role === 'advocate' ? 'Advocate' : 'User'}
              </span>
            </div>
          </div>
        )}
        <button
          className={`${collapsed ? 'mx-auto' : ''} w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors`}
          onClick={handleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      
      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-2'} py-2 rounded-lg font-medium text-xs transition-all duration-200 ${
              location.pathname === link.to
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
            }`}
          >
            <div className={`${location.pathname === link.to ? 'text-white' : 'text-gray-500'}`}>
              {link.icon}
            </div>
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        ))}
      </nav>
      
      {/* User Info */}
      {!collapsed && currentUser && (
        <div className="p-2 border-t border-gray-100 flex-shrink-0">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-700 mb-1">
              <div className="font-semibold text-gray-800">{currentUser.name}</div>
              <div className="text-gray-500 text-xs">{currentUser.email}</div>
            {currentUser.employeeId && (
                <div className="text-gray-500 text-xs">ID: {currentUser.employeeId}</div>
            )}
            </div>
          </div>
        </div>
      )}
      
      {/* Logout Button */}
      <div className="p-2 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={onLogout}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-2'} py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium w-full transition-all duration-200 text-xs shadow-sm hover:shadow-md`}
        >
          <LogOut size={14} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
