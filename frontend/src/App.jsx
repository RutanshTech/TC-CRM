import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Admin from "./pages/Admin";
import Employee from "./pages/Employee";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import { ToastContainer, toast } from "react-toastify";
import YourLeads from "./pages/YourLeads";
import axios from "axios";
import EmployeeLeadDetails from "./pages/EmployeeLeadDetails";
import Operation from './pages/Operation';
import OperationsDashboard from './pages/OperationsDashboard';
import OperationsLeads from './pages/OperationsLeads';
import LeaveApplication from './pages/LeaveApplication';
import OperationsTotalLeads from './pages/OperationsTotalLeads';
import PaymentManagement from "./pages/PaymentManagement";
import Claim from './pages/Claim';
import AllLeads from './pages/AllLeads';
import AdvocateLeads from './pages/AdvocateLeads';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("isAuthenticated") === "true"
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    // If employee or operation, set status offline before logout
    if (user && (user.role === "employee" || user.role === "operation")) {
      try {
        if (user.role === "employee") {
        await axios.patch(
          "http://localhost:3000/api/employees/status",
          { status: "offline" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        } else if (user.role === "operation") {
          // For operations, we can update their status in the operations collection
          await axios.patch(
            `http://localhost:3000/api/operations/${user.id}/status`,
            { status: "offline" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (err) {
        // ignore error
      }
    }
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSidebarCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  // Check if user can access admin pages
  const canAccessAdmin = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && (user.role === 'super-admin' || user.role === 'admin');
  };

  // Check if user can access employee management
  const canAccessEmployeeManagement = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;
    
    if (user.role === 'super-admin') return true;
    if (user.role === 'admin' && user.adminAccess) {
      return user.adminAccess.employee || user.adminAccess.allThings;
    }
    return false;
  };

  // Inactivity tracker for employees
  useEffect(() => {
    let timer;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      clearTimeout(timer);
      const user = JSON.parse(localStorage.getItem("user"));
      if (isAuthenticated && user && user.role === "employee") {
        timer = setTimeout(async () => {
          try {
            const token = localStorage.getItem("token");
            await axios.post(
              "http://localhost:3000/api/employees/self-block",
              { reason: "Inactivity for 30 minutes" },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.error("You have been blocked due to inactivity.");
            handleLogout();
          } catch (err) {
            toast.error(
              err.response?.data?.reason ||
                err.response?.data?.message ||
                "Blocked due to inactivity."
            );
            handleLogout();
          }
        }, INACTIVITY_LIMIT);
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart"
    ];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });
    resetTimer();
    return () => {
      clearTimeout(timer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  // Get user from localStorage for route logic
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="flex">
      {isAuthenticated && <Sidebar onLogout={handleLogout} onCollapseChange={handleSidebarCollapse} />}
      <div className="flex-1 bg-gray-50 min-h-screen">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/*"
            element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Routes>
                  <Route path="/" element={
                    user && user.role === 'operation' ? (
                      <Navigate to="/operations-dashboard" replace />
                    ) : (
                      <Dashboard sidebarCollapsed={sidebarCollapsed} />
                    )
                  } />
                  <Route path="/leads" element={
                    canAccessAdmin() ? (
                      <Leads sidebarCollapsed={sidebarCollapsed} />
                    ) : (
                      <Navigate to={user && (user.role === 'employee' || user.role === 'operation') ? "/your-leads" : "/"} replace />
                    )
                  } />
                  <Route path="/all-leads" element={
                    canAccessAdmin() ? (
                      <AllLeads sidebarCollapsed={sidebarCollapsed} />
                    ) : (
                      <Navigate to={user && (user.role === 'employee' || user.role === 'operation') ? "/your-leads" : "/"} replace />
                    )
                  } />
                  <Route path="/your-leads" element={
                    user && user.role === 'employee' ? (
                      <YourLeads sidebarCollapsed={sidebarCollapsed} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } />
                  
                  {/* Admin routes - only accessible by super-admin */}
                  <Route 
                    path="/admin" 
                    element={
                      canAccessAdmin() ? (
                        <Admin sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Employee management - only accessible by admin with permission or super-admin */}
                  <Route 
                    path="/employee" 
                    element={
                      canAccessEmployeeManagement() ? (
                        <Employee sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Employee lead details - only accessible by employee */}
                  <Route path="/employee-lead/:leadId" element={<EmployeeLeadDetails />} />
                  
                  {/* Claim page - only accessible by employees */}
                  <Route 
                    path="/claim" 
                    element={
                      user && user.role === 'employee' ? (
                        <Claim sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Leave Application - accessible by all authenticated users */}
                  <Route path="/leave-application" element={<LeaveApplication sidebarCollapsed={sidebarCollapsed} />} />
                  
                  {/* Operations Management - only accessible by admin and super-admin */}
                  <Route 
                    path="/operation" 
                    element={
                      canAccessAdmin() ? (
                        <Operation sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Operations Dashboard - only accessible by operations */}
                  <Route 
                    path="/operations-dashboard" 
                    element={
                      user && user.role === 'operation' ? (
                        <OperationsDashboard sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Operations Individual Pages - only accessible by operations */}
                  <Route 
                    path="/operations-leads" 
                    element={
                      user && user.role === 'operation' ? (
                        <OperationsLeads sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  <Route 
                    path="/operations-total-leads" 
                    element={
                      user && user.role === 'operation' ? (
                        <OperationsTotalLeads sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Payment management - only accessible by admin and super-admin */}
                  <Route 
                    path="/payment-management" 
                    element={
                      canAccessAdmin() ? (
                        <PaymentManagement sidebarCollapsed={sidebarCollapsed} />
                      ) : (
                        <Navigate to="/" replace />
                      )
                    } 
                  />
                  
                  {/* Advocate leads - only accessible by employees with role 'advocate' */}
                  <Route path="/advocate-leads" element={
                    user && user.role === 'advocate' ? (
                      <AdvocateLeads sidebarCollapsed={sidebarCollapsed} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } />
                  
                  {/* Catch all other routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PrivateRoute>
            }
          />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    </div>
  );
}

export default App;
