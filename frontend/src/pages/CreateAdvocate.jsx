import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";

const CreateAdvocate = ({ sidebarCollapsed }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advocates, setAdvocates] = useState([]);
  const [fetchingAdvocates, setFetchingAdvocates] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user"));

  // Access control: Only super-admin or admin with advocate permission
  if (!currentUser || (currentUser.role !== 'super-admin' && !(currentUser.role === 'admin' && (currentUser.adminAccess?.advocate || currentUser.adminAccess?.allThings)))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchAdvocates();
  }, []);

  const fetchAdvocates = async () => {
    setFetchingAdvocates(true);
    try {
      const response = await axios.get("https://tc-crm.vercel.app/api/advocates", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAdvocates(Array.isArray(response.data.users) ? response.data.users : []);
    } catch (error) {
      console.log("fetchAdvocates error:", error);
      // Show a more specific error for operation users
      if (error.response && error.response.status === 403) {
        toast.error("Only admin/super-admin can view all advocates.");
      } else {
        toast.error("Error fetching advocates.");
      }
    } finally {
      setFetchingAdvocates(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "https://tc-crm.vercel.app/api/advocates",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Advocate created successfully!");
      setFormData({
        name: "",
        email: "",
        password: ""
      });
      // Refresh the advocates list after creating
      fetchAdvocates();
    } catch (error) {
      setError(error.response?.data?.message || "Error creating advocate");
      toast.error(error.response?.data?.message || "Error creating advocate");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdvocate = (advocate) => {
    setSelectedAdvocate(advocate);
    setFormData({
      name: advocate.name || "",
      email: advocate.email || "",
      password: ""
    });
    setIsEditModalOpen(true);
    setError("");
  };

  const handleDeleteAdvocate = (advocate) => {
    setSelectedAdvocate(advocate);
    setIsDeleteModalOpen(true);
    setError("");
  };

  const handleResetPassword = (advocate) => {
    setSelectedAdvocate(advocate);
    setNewPassword("");
    setIsResetPasswordModalOpen(true);
    setError("");
  };

  const confirmDeleteAdvocate = async () => {
    try {
      await axios.delete(`https://tc-crm.vercel.app/api/advocates/${selectedAdvocate._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Advocate deleted successfully");
      fetchAdvocates();
      setIsDeleteModalOpen(false);
      setSelectedAdvocate(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting advocate.");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.patch(
        `https://tc-crm.vercel.app/api/advocates/${selectedAdvocate._id}/reset-password`,
        { password: newPassword },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Password reset successfully");
      setIsResetPasswordModalOpen(false);
      setSelectedAdvocate(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resetting password.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.put(
        `https://tc-crm.vercel.app/api/advocates/${selectedAdvocate._id}`,
        {
          name: formData.name,
          email: formData.email
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Advocate updated successfully");
      fetchAdvocates();
      setIsEditModalOpen(false);
      setSelectedAdvocate(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating advocate.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? "ml-12" : "ml-48"}`}>
        <div className="p-4 max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Create New Advocate</h1>
            <p className="text-sm text-gray-600 mt-1">Add a new advocate to the system</p>
          </div>

          {/* Create Advocate Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Advocate"}
                </button>
              </div>
            </form>
          </div>

          {/* Advocates Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">All Advocates</h2>
              <p className="text-sm text-gray-600 mt-1">List of all advocates in the system</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fetchingAdvocates ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        Loading advocates...
                      </td>
                    </tr>
                  ) : advocates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No advocates found.
                      </td>
                    </tr>
                  ) : (
                    advocates.map((advocate) => (
                      <tr key={advocate._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{advocate.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{advocate.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            advocate.isBlocked 
                              ? 'bg-red-100 text-red-800' 
                              : advocate.status === 'online'
                              ? 'bg-green-100 text-green-800'
                              : advocate.status === 'offline'
                              ? 'bg-gray-100 text-gray-800'
                              : advocate.status === 'on_leave'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {advocate.isBlocked ? 'Blocked' : 
                             advocate.status === 'online' ? 'Online' :
                             advocate.status === 'offline' ? 'Offline' :
                             advocate.status === 'on_leave' ? 'On Leave' :
                             'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {advocate.lastActiveTime ? new Date(advocate.lastActiveTime).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {advocate.createdAt ? new Date(advocate.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditAdvocate(advocate)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 hover:text-blue-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              title="Edit Advocate"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleResetPassword(advocate)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 hover:text-green-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                              title="Reset Password"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Reset
                            </button>
                            <button
                              onClick={() => handleDeleteAdvocate(advocate)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 hover:text-red-800 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                              title="Delete Advocate"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Advocate Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Advocate
              </h3>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Advocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Advocate Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Delete Advocate
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{selectedAdvocate?.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAdvocate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Advocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Reset Password for {selectedAdvocate?.name}
              </h3>
            </div>
            <form onSubmit={handlePasswordReset} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
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

      <ToastContainer
        position="top-right"
        autoClose={3001}
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
  );
};

export default CreateAdvocate; 