import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";

const Admin = ({ sidebarCollapsed }) => {
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isAdvocateModalOpen, setIsAdvocateModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionsData, setPermissionsData] = useState({
    employee: false,
    sales: false,
    operation: false,
    advocate: false,
    allThings: false
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    personalMobile: "",
    companyMobile: "",
    referenceMobile: "",
    personalEmail: "",
    companyEmail: "",
    dateOfBirth: "",
    aadharCard: "",
    panCard: "",
    bankDetails: {
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      accountHolderName: "",
      upiId: ""
    },
    joinedThrough: "",
    additionalNotes: "",
    adminAccess: {
      employee: true,
      operation: true,
      advocate: true,
    }
  });

  const [advocateFormData, setAdvocateFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    specialization: "",
    experience: "",
    barCouncilNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    additionalNotes: ""
  });
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!currentUser || currentUser.role !== "super-admin") {
      setError("Access denied: Only super-admin can view this page.");
      setLoading(false);
      return;
    }
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await axios.get("https://tc-crm.vercel.app/api/adminsget", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAdmins(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log("fetchAdmins error:", error);
      toast.error("Error fetching admins.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      personalMobile: "",
      companyMobile: "",
      referenceMobile: "",
      personalEmail: "",
      companyEmail: "",
      dateOfBirth: "",
      aadharCard: "",
      panCard: "",
      bankDetails: {
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
        upiId: ""
      },
      joinedThrough: "",
      additionalNotes: "",
      adminAccess: {
        employee: true,
        operation: true,
        advocate: true,
      }
    });
    setIsModalOpen(true);
    setError("");
  };

  const handleAddAdvocate = () => {
    setAdvocateFormData({
      name: "",
      email: "",
      password: "",
      mobile: "",
      specialization: "",
      experience: "",
      barCouncilNumber: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      additionalNotes: ""
    });
    setIsAdvocateModalOpen(true);
    setError("");
  };

  const handleEditAdmin = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name || "",
      email: admin.email || "",
      password: "",
      personalMobile: admin.personalMobile || "",
      companyMobile: admin.companyMobile || "",
      referenceMobile: admin.referenceMobile || "",
      personalEmail: admin.personalEmail || "",
      companyEmail: admin.companyEmail || "",
      dateOfBirth: admin.dateOfBirth ? new Date(admin.dateOfBirth).toISOString().split('T')[0] : "",
      aadharCard: admin.aadharCard || "",
      panCard: admin.panCard || "",
      bankDetails: {
        accountNumber: admin.bankDetails?.accountNumber || "",
        ifscCode: admin.bankDetails?.ifscCode || "",
        bankName: admin.bankDetails?.bankName || "",
        accountHolderName: admin.bankDetails?.accountHolderName || "",
        upiId: admin.bankDetails?.upiId || ""
      },
      joinedThrough: admin.joinedThrough || "",
      additionalNotes: admin.additionalNotes || "",
      adminAccess: {
        employee: admin.adminAccess?.employee || false,
        sales: admin.adminAccess?.sales || false,
        operation: admin.adminAccess?.operation || false,
        advocate: admin.adminAccess?.advocate || false,
        allThings: admin.adminAccess?.allThings || false
      }
    });
    setIsEditModalOpen(true);
    setError("");
  };

  const handleResetPassword = (admin) => {
    setSelectedAdmin(admin);
    setNewPassword("");
    setIsPasswordModalOpen(true);
    setError("");
  };

  const handleDeleteAdmin = (admin) => {
    setSelectedAdmin(admin);
    setIsDeleteModalOpen(true);
    setError("");
  };

  const handleManagePermissions = (admin) => {
    setSelectedAdmin(admin);
    setPermissionsData({
      employee: admin.adminAccess?.employee || false,
      sales: admin.adminAccess?.sales || false,
      operation: admin.adminAccess?.operation || false,
      advocate: admin.adminAccess?.advocate || false,
      allThings: admin.adminAccess?.allThings || false
    });
    setIsPermissionsModalOpen(true);
    setError("");
  };

  const handleRowClick = (admin) => {
    setSelectedAdmin(admin);
    setIsBankDetailsModalOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    try {
      await axios.delete(`https://tc-crm.vercel.app/api/admin/${selectedAdmin.adminId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Admin deleted successfully");
      fetchAdmins();
      setIsDeleteModalOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting admin.");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setIsEditModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsBankDetailsModalOpen(false);
    setIsPermissionsModalOpen(false);
    setSelectedAdmin(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      personalMobile: "",
      companyMobile: "",
      referenceMobile: "",
      personalEmail: "",
      companyEmail: "",
      dateOfBirth: "",
      aadharCard: "",
      panCard: "",
      bankDetails: {
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: "",
        upiId: ""
      },
      joinedThrough: "",
      additionalNotes: "",
      adminAccess: {
        employee: true,
        operation: true,
        advocate: true,
      }
    });
    setError("");
  };

  const closeBankDetailsModal = () => {
    console.log("Closing bank details modal");
    setIsBankDetailsModalOpen(false);
    setSelectedAdmin(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('bankDetails.')) {
      const bankField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [bankField]: value
        }
      }));
    } else if (name.startsWith('adminAccess.')) {
      const accessField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        adminAccess: {
          ...prev.adminAccess,
          [accessField]: checked
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleAdvocateInputChange = (e) => {
    const { name, value } = e.target;
    setAdvocateFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isEditModalOpen) {
        const response = await axios.put(
          `https://tc-crm.vercel.app/api/admin/${selectedAdmin.adminId}`,
          formData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        toast.success("Admin updated successfully");
      } else {
        const response = await axios.post(
          "https://tc-crm.vercel.app/api/adminsadd",
          formData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        toast.success(`Admin created successfully with ID: ${response.data.adminId}`);
      }
      
      fetchAdmins();
      handleModalClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error processing request.");
    }
  };

  const handleAdvocateSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        "https://tc-crm.vercel.app/api/advocate",
        advocateFormData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Advocate created successfully");
      setIsAdvocateModalOpen(false);
      setAdvocateFormData({
        name: "",
        email: "",
        password: "",
        mobile: "",
        specialization: "",
        experience: "",
        barCouncilNumber: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        additionalNotes: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating advocate.");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.patch(
        `https://tc-crm.vercel.app/api/admin/${selectedAdmin.adminId}/reset-password`,
        { newPassword },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Password reset successfully");
      handleModalClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resetting password.");
    }
  };

  const handlePermissionsChange = (e) => {
    const { name, checked } = e.target;
    setPermissionsData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handlePermissionsSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.patch(
        `https://tc-crm.vercel.app/api/admin/${selectedAdmin.adminId}/permissions`,
        { adminAccess: permissionsData },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Admin permissions updated successfully");
      fetchAdmins();
      handleModalClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating permissions.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header sidebarCollapsed={sidebarCollapsed} />
        <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-48"}`}>
          <div className="p-4 flex items-center justify-center h-64">
            <div className="text-gray-500">Loading admins...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentUser?.role === "super-admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header sidebarCollapsed={sidebarCollapsed} />
        <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-48"}`}>
          <div className="p-4 flex items-center justify-center h-64">
            <div className="text-red-500 font-semibold">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-48"}`}>
        <div className="p-4 max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Super Admin - Admin Management</h1>
              <p className="text-sm text-gray-600 mt-1">Create and manage system admins and advocates with comprehensive onboarding</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAddAdmin}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Create New Admin
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ID</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Name</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Email</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Password</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Mobile</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-auto">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr 
                      key={admin._id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => handleRowClick(admin)}
                    >
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-xs font-medium text-gray-900 truncate" title={admin.adminId}>{admin.adminId}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-xs font-medium text-gray-900 truncate" title={admin.name}>{admin.name}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-xs text-gray-900 truncate" title={admin.email}>{admin.email}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-xs text-gray-900 font-mono truncate" title={admin.plainPassword || "N/A"}>{admin.plainPassword || "N/A"}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <div className="text-xs text-gray-900 truncate" title={admin.personalMobile || admin.companyMobile}>{admin.personalMobile || admin.companyMobile}</div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${
                          admin.onboardingStatus === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : admin.onboardingStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.onboardingStatus}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleEditAdmin(admin)}
                            className="inline-flex items-center px-1.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 hover:text-blue-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            title="Edit Admin"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleResetPassword(admin)}
                            className="inline-flex items-center px-1.5 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 hover:text-green-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                            title="Reset Password"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleManagePermissions(admin)}
                            className="inline-flex items-center px-1.5 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200 hover:text-purple-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            title="Manage Permissions"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="inline-flex items-center px-1.5 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 hover:text-red-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                            title="Delete Admin"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden">
              {admins.map((admin) => (
                <div 
                  key={admin._id}
                  className="border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleRowClick(admin)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{admin.name}</div>
                      <div className="text-xs text-gray-500">{admin.email}</div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      admin.onboardingStatus === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : admin.onboardingStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.onboardingStatus}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">ID:</span> {admin.adminId}
                    </div>
                    <div>
                      <span className="font-medium">Mobile:</span> {admin.personalMobile || admin.companyMobile || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Password:</span> {admin.plainPassword || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditAdmin(admin)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 hover:text-blue-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      title="Edit Admin"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetPassword(admin)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 hover:text-green-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                      title="Reset Password"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Reset
                    </button>
                    <button
                      onClick={() => handleManagePermissions(admin)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded hover:bg-purple-200 hover:text-purple-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      title="Manage Permissions"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Permissions
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 hover:text-red-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                      title="Delete Admin"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Admin Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {isEditModalOpen ? 'Edit Admin' : 'Create New Admin'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Basic Information</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {!isEditModalOpen && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {/* Contact Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-700 mb-3 mt-4">Contact Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Mobile</label>
                  <input
                    type="tel"
                    name="personalMobile"
                    value={formData.personalMobile}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Mobile</label>
                  <input
                    type="tel"
                    name="companyMobile"
                    value={formData.companyMobile}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference/Emergency Mobile</label>
                  <input
                    type="tel"
                    name="referenceMobile"
                    value={formData.referenceMobile}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                  <input
                    type="email"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {/* Identity Documents */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-700 mb-3 mt-4">Identity Documents</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card</label>
                  <input
                    type="text"
                    name="aadharCard"
                    value={formData.aadharCard}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
                  <input
                    type="text"
                    name="panCard"
                    value={formData.panCard}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {/* Bank Details */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-700 mb-3 mt-4">Bank Details</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails.accountNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    name="bankDetails.ifscCode"
                    value={formData.bankDetails.ifscCode}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankDetails.bankName"
                    value={formData.bankDetails.bankName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    name="bankDetails.accountHolderName"
                    value={formData.bankDetails.accountHolderName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    type="text"
                    name="bankDetails.upiId"
                    value={formData.bankDetails.upiId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {/* Additional Information */}
                <div className="md:col-span-2">
                  <h4 className="text-md font-medium text-gray-700 mb-3 mt-4">Additional Information</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joined Through</label>
                  <input
                    type="text"
                    name="joinedThrough"
                    value={formData.joinedThrough}
                    onChange={handleInputChange}
                    placeholder="e.g., Referral, Direct, etc."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>

                {/* Admin Access Permissions - Only show when creating new admin */}
                {!isEditModalOpen && (
                  <>
                    <div className="md:col-span-2">
                      <h4 className="text-md font-medium text-gray-700 mb-3 mt-4">Admin Access Permissions</h4>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="adminAccess.employee"
                          checked={formData.adminAccess.employee}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Employee</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="adminAccess.operation"
                          checked={formData.adminAccess.operation}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Operation</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="adminAccess.advocate"
                          checked={formData.adminAccess.advocate}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Advocate</label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="text-red-500 text-sm mb-4 mt-4">{error}</div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditModalOpen ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Reset Password for {selectedAdmin?.name}
              </h3>
            </div>
            <form onSubmit={handlePasswordReset} className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm mb-4">{error}</div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Confirm Delete
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete admin <strong>{selectedAdmin?.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAdmin}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {isBankDetailsModalOpen && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4" onClick={closeBankDetailsModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] mx-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white text-black p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black">Bank Account Details</h2>
                    <p className="text-gray-600 text-sm">
                      {selectedAdmin?.name} • Admin ID: {selectedAdmin?.adminId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeBankDetailsModal}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Account Number */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">Account Number</h3>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Primary</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-emerald-500">
                    <div className="text-sm font-mono text-gray-900 tracking-wide">
                      {selectedAdmin?.bankDetails?.accountNumber || "Not provided"}
                    </div>
                  </div>
                </div>

                {/* IFSC Code */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M7 7h4m0 0V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">IFSC Code</h3>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Required</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                    <div className="text-sm font-mono text-gray-900 tracking-wide">
                      {selectedAdmin?.bankDetails?.ifscCode || "Not provided"}
                    </div>
                  </div>
                </div>

                {/* Bank Name */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">Bank Name</h3>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Institution</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-purple-500">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedAdmin?.bankDetails?.bankName || "Not provided"}
                    </div>
                  </div>
                </div>

                {/* Account Holder */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">Account Holder</h3>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Owner</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-orange-500">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedAdmin?.bankDetails?.accountHolderName || "Not provided"}
                    </div>
                  </div>
                </div>

                {/* UPI ID */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">UPI ID</h3>
                    </div>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">Digital</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-teal-500">
                    <div className="text-sm font-mono text-gray-900">
                      {selectedAdmin?.bankDetails?.upiId || "Not provided"}
                    </div>
                  </div>
                </div>

                {/* Admin ID */}
                <div className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">Admin ID</h3>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Unique</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-indigo-500">
                    <div className="text-sm font-mono text-gray-900">
                      {selectedAdmin?.adminId || "Not generated"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={closeBankDetailsModal}
                  className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium flex items-center justify-center space-x-2 border border-gray-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {isPermissionsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Manage Permissions for {selectedAdmin?.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Admin ID: {selectedAdmin?.adminId}</p>
            </div>
            <form onSubmit={handlePermissionsSubmit} className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="employee"
                    checked={permissionsData.employee}
                    onChange={handlePermissionsChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">Employee Management</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="operation"
                    checked={permissionsData.operation}
                    onChange={handlePermissionsChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">Operations Management</label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="advocate"
                    checked={permissionsData.advocate}
                    onChange={handlePermissionsChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-700">Advocate Management</label>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm mb-4 mt-4">{error}</div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Update Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div style={{ zIndex: 9999 }}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </div>
  );
};

export default Admin; 