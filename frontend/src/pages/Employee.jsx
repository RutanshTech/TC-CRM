import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";
import LeadModal from "../components/LeadModal";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function usePresence(employeeId) {
  useEffect(() => {
    if (!employeeId) return;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // Determine the correct endpoint based on user role
    const endpoint =
      user.role === "employee"
        ? "https://tc-crm.vercel.app/api/employees/status"
        : `https://tc-crm.vercel.app/api/employees/${employeeId}/status`;

    // Set online on mount
    axios.patch(
      endpoint,
      { status: "online" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Heartbeat every 2 min
    const interval = setInterval(() => {
      axios.patch(
        endpoint,
        { status: "online" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }, 2 * 60 * 1000);

    // Set offline on tab close
    const handleOffline = () => {
      const offlineData = JSON.stringify({ status: "offline" });
      if (user.role === "employee") {
        // For employees, use the new endpoint
        navigator.sendBeacon(
          "https://tc-crm.vercel.app/api/employees/status",
          offlineData
        );
      } else {
        // For admins, use the old endpoint
        navigator.sendBeacon(
          `https://tc-crm.vercel.app/api/employees/${employeeId}/status`,
          offlineData
        );
      }
    };
    window.addEventListener("beforeunload", handleOffline);

    return () => {
      clearInterval(interval);
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [employeeId]);
}

const Employee = ({ sidebarCollapsed }) => {
  // Main states
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [productivityFilter, setProductivityFilter] = useState("daily");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });

  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    productivity: "daily",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalRecords: 0,
  });

  // Employee form data
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
      upiId: "",
    },
    joinedThrough: "",
    additionalNotes: "",
    access: {
      sales: false,
      operation: false,
      advocate: false,
      leadAdd: false,
      copy: false,
    },
  });

  // Super Admin option to create without access
  const [createWithoutAccess, setCreateWithoutAccess] = useState(false);
  const [userRole, setUserRole] = useState("");

  // Lead distribution states
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showDuplicateLeads, setShowDuplicateLeads] = useState(false);
  const [showAssignedLeads, setShowAssignedLeads] = useState(false);

  // Approval states
  const [approvals, setApprovals] = useState({
    leaveApplications: [],
    blockRequests: [],
    loginRequests: [],
  });

  // Payment states
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [claimedPayments, setClaimedPayments] = useState([]);

  // Assigned leads
  const [assignedLeads, setAssignedLeads] = useState([]);

  // New state for selected employee leads
  const [selectedEmployeeLeads, setSelectedEmployeeLeads] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Add a live clock state
  const [liveTime, setLiveTime] = useState(new Date());
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Replace addLeadState with an array of leadRows
  const [leadRows, setLeadRows] = useState([
    { mobileNumber: "", brandName: "", additionalNotes: "" },
  ]);
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false);

  // State for Lead Distribution modal
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [distributionLeads, setDistributionLeads] = useState([]); // available leads
  const [distributionEmployees, setDistributionEmployees] = useState([]); // employees
  const [selectedDistributionLeads, setSelectedDistributionLeads] = useState(
    []
  );
  const [selectedDistributionEmployees, setSelectedDistributionEmployees] =
    useState([]);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [hasCopyAccess, setHasCopyAccess] = useState(false);

  // Add state for new password input
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // Add state for leave rejection modal
  const [showRejectLeaveModal, setShowRejectLeaveModal] = useState(false);
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const [rejectLeaveNotes, setRejectLeaveNotes] = useState("");

  // Add state for existing leads modal
  const [existingLeadsModal, setExistingLeadsModal] = useState({
    isOpen: false,
    phoneNumber: "",
    leads: [],
  });

  // Default firm type options

  // const [firmTypeOptions, setFirmTypeOptions] = useState(DEFAULT_FIRM_TYPE_OPTIONS);

  // Update firmTypeOptions when assignedSheetPaste changes

  // Helper to parse pasted data (tab-separated or CSV)

  // Test function to debug data format
  function testDataFormat(data) {
    console.log("=== TESTING DATA FORMAT ===");
    console.log("Raw data:", data);

    const parsed = parseAssignedSheetData(data);
    console.log("Parsed rows:", parsed);

    const formatted = parsed.map((row) => ({
      NAME: (row[0] || "").trim(),
      NUMBER: (row[1] || "").trim(),
      FIRM_TYPE: (row[2] || "").trim(),
      CITY: (row[3] || "").trim(),
      CLASS: (row[4] || "").trim(),
      BRAND_NAME: (row[5] || "").trim(),
      FOLLOUP_DATE: (row[6] || "").trim(),
      remark: (row[7] || "").trim(),
    }));

    console.log("Formatted rows:", formatted);

    const valid = formatted.filter((row) => row.NAME && row.NUMBER);
    console.log("Valid rows:", valid);
    console.log(
      "Invalid rows:",
      formatted.filter((row) => !row.NAME || !row.NUMBER)
    );
    console.log("=== END TEST ===");

    return { parsed, formatted, valid };
  }

  // Fetch assigned sheet rows from backend

  // Add multiple rows from pasted Excel data

  // Add new assigned sheet row

  // Delete row from backend

  // Edit assigned sheet row

  // Update assigned sheet row

  // Fetch on mount and when tab changes
  useEffect(() => {
    if (activeTab === "assignedSheet") fetchAssignedSheetRows();
  }, [activeTab]);

  useEffect(() => {
    fetchEmployees();
    if (
      activeTab === "leads" &&
      (userRole === "admin" || userRole === "super-admin")
    )
      fetchLeads();
    if (
      activeTab === "approvals" &&
      (userRole === "admin" || userRole === "super-admin")
    ) {
      fetchApprovals();
      fetchLeaveApplications();
    }
    if (activeTab === "payments") fetchPayments();
    if (activeTab === "assignedLeads") fetchAssignedLeads();
  }, [filters, pagination.current, activeTab, userRole]);

  // Redirect to employees tab if user doesn't have access to current tab
  useEffect(() => {
    if (userRole && userRole !== "admin" && userRole !== "super-admin") {
      if (["leads", "assignedLeads", "approvals"].includes(activeTab)) {
        setActiveTab("employees");
      }
    }
  }, [userRole, activeTab]);

  // Real-time status updates for admins
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    // Only set up real-time updates for admin/super-admin
    if (user && ["admin", "super-admin"].includes(user.role)) {
      // Poll for status updates every 30 seconds
      const statusInterval = setInterval(() => {
        fetchEmployees();
      }, 30010); // 30 seconds

      // Socket.io setup
      const socket = io("https://tc-crm.vercel.app");
      socket.on("employeeStatusUpdate", () => {
        fetchEmployees();
      });

      return () => {
        clearInterval(statusInterval);
        socket.disconnect();
      };
    }
  }, []);

  // Fetch employees with productivity data
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters,
        productivity: productivityFilter,
        ...(productivityFilter === "custom" &&
          customDateRange.start &&
          customDateRange.end && {
            startDate: customDateRange.start,
            endDate: customDateRange.end,
          }),
      });

      const res = await axios.get(
        `https://tc-crm.vercel.app/api/employees?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Employees from API:", res.data.employees);
      setEmployees(res.data.employees);
      setUserRole(res.data.userRole);
      setPagination({
        current: res.data.pagination.current,
        total: res.data.pagination.total,
        totalRecords: res.data.pagination.totalRecords,
      });
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching employees");
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads for distribution
  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      // Check if user has permission
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        toast.error(
          "Access denied. You do not have permission to view leads for distribution."
        );
        return;
      }

      const res = await axios.get(
        "https://tc-crm.vercel.app/api/leads/distribution",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Leads from API:", res.data.leads);
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error("Error fetching leads for distribution:", err);
      console.error("Error details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
      });

      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else if (err.response?.status === 403) {
        toast.error(
          "Access denied. You do not have permission to view leads for distribution."
        );
      } else if (err.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      } else if (
        err.code === "NETWORK_ERROR" ||
        err.message.includes("Network Error")
      ) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch leads for distribution"
        );
      }
    }
  };

  // Fetch approvals
  const fetchApprovals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://tc-crm.vercel.app/api/approvals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovals(res.data);
    } catch (err) {
      toast.error("Error fetching approvals");
    }
  };

  // Fetch leave applications for admin/super-admin
  const fetchLeaveApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://tc-crm.vercel.app/api/employees/leaves/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setApprovals((prev) => ({
        ...prev,
        leaveApplications: res.data.leaves || [],
      }));
    } catch (err) {
      console.error("Error fetching leave applications:", err);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://tc-crm.vercel.app/api/payments/entries",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPayments(res.data.payments);
      setClaimedPayments(res.data.claimed);
    } catch (err) {
      toast.error("Error fetching payments");
    }
  };

  // Fetch assigned leads
  const fetchAssignedLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://tc-crm.vercel.app/api/leads/assigned", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedLeads(res.data.assignedLeads);
    } catch (err) {
      console.error(
        "Assigned Leads Error:",
        err.response?.data || err.message || err
      );
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Error fetching assigned leads"
      );
    }
  };

  // Employee management functions
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      personalMobile: employee.personalMobile || "",
      companyMobile: employee.companyMobile || "",
      referenceMobile: employee.referenceMobile || "",
      personalEmail: employee.personalEmail || "",
      companyEmail: employee.companyEmail || "",
      dateOfBirth: employee.dateOfBirth
        ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
        : "",
      aadharCard: employee.aadharCard || "",
      panCard: employee.panCard || "",
      bankDetails: {
        accountNumber: employee.bankDetails?.accountNumber || "",
        ifscCode: employee.bankDetails?.ifscCode || "",
        bankName: employee.bankDetails?.bankName || "",
        accountHolderName: employee.bankDetails?.accountHolderName || "",
        upiId: employee.bankDetails?.upiId || "",
      },
      joinedThrough: employee.joinedThrough || "",
      additionalNotes: employee.additionalNotes || "",
      access: {
        sales: employee.access?.sales || false,
        operation: employee.access?.operation || false,
        advocate: employee.access?.advocate || false,
        leadAdd: employee.access?.leadAdd || false,
        copy: employee.access?.copy || false,
      },
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
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
        upiId: "",
      },
      joinedThrough: "",
      additionalNotes: "",
      access: {
        sales: false,
        operation: false,
        advocate: false,
        leadAdd: false,
        copy: false,
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      if (editingEmployee) {
        await axios.put(
          `https://tc-crm.vercel.app/api/employees/${editingEmployee.employeeId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Employee updated successfully");
      } else {
        // Prepare the request data - remove userRole as it's not needed
        const requestData = {
          ...formData,
          createWithoutAccess,
        };

        console.log("Sending employee creation request:", requestData);

        const response = await axios.post(
          "https://tc-crm.vercel.app/api/employees",
          requestData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("Employee creation response:", response.data);
        toast.success("Employee created successfully");
      }

      setIsModalOpen(false);
      resetForm();
      setCreateWithoutAccess(false); // Reset the checkbox
      fetchEmployees();
    } catch (err) {
      console.error("Employee creation error:", err);
      if (err.response) {
        console.error("Error response:", err.response.data);
        if (
          err.response.data?.errors &&
          Array.isArray(err.response.data.errors)
        ) {
          err.response.data.errors.forEach((error) => {
            toast.error(error);
          });
        } else if (err.response.data?.message) {
          toast.error(err.response.data.message);
        } else {
          toast.error("Operation failed");
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error("No response received:", err.request);
        toast.error(
          "No response from server. Please check your connection or try again later."
        );
      } else {
        // Something else happened
        console.error("Error", err.message);
        toast.error("Network error or server not reachable.");
      }
    }
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://tc-crm.vercel.app/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // State for block/unblock modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showAccessControlModal, setShowAccessControlModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [unblockReason, setUnblockReason] = useState("");
  const [accessControlData, setAccessControlData] = useState({
    sales: false,
    operation: false,
    advocate: false,
    leadAdd: false,
    copy: false,
  });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Block employee with reason
  const handleBlockEmployee = async () => {
    if (!blockReason.trim()) {
      toast.error("Please enter a reason for blocking");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/block`,
        { reason: blockReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Employee blocked successfully");
      setShowBlockModal(false);
      setBlockReason("");
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Blocking failed");
    }
  };

  // Unblock employee with reason
  const handleUnblockEmployee = async () => {
    if (!unblockReason.trim()) {
      toast.error("Please enter a reason for unblocking");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/unblock`,
        { reason: unblockReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Employee unblocked successfully");
      setShowUnblockModal(false);
      setUnblockReason("");
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unblocking failed");
    }
  };

  // Open block modal
  const openBlockModal = (employee) => {
    setSelectedEmployee(employee);
    setBlockReason("");
    setShowBlockModal(true);
  };

  // Open unblock modal
  const openUnblockModal = (employee) => {
    setSelectedEmployee(employee);
    setUnblockReason("");
    setShowUnblockModal(true);
  };

  // Handle access control update
  const handleAccessControlUpdate = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.patch(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/access`,
        { access: accessControlData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Access permissions updated successfully");
      setShowAccessControlModal(false);
      setSelectedEmployee(null);
      setAccessControlData({
        sales: false,
        operation: false,
        advocate: false,
        leadAdd: false,
        copy: false,
      });
      fetchEmployees();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Access control update failed"
      );
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!newPasswordInput || newPasswordInput.length < 6) {
        toast.error("Please enter a password with at least 6 characters");
        setResetPasswordLoading(false);
        return;
      }
      await axios.patch(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/reset-password`,
        { newPassword: newPasswordInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password reset successfully.");
      setShowResetPasswordModal(false);
      setSelectedEmployee(null);
      setNewPasswordInput("");
      setResetPasswordLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
      setResetPasswordLoading(false);
    }
  };

  // Open access control modal
  const openAccessControlModal = (employee) => {
    setSelectedEmployee(employee);
    setAccessControlData(
      employee.access || {
        sales: false,
        operation: false,
        advocate: false,
        leadAdd: false,
        copy: false,
      }
    );
    setShowAccessControlModal(true);
  };

  // Open reset password modal
  const openResetPasswordModal = (employee) => {
    setSelectedEmployee(employee);
    setShowResetPasswordModal(true);
  };

  // Status color coding
  const getStatusColor = (status, isBlocked) => {
    if (isBlocked) return "bg-red-100 text-red-800";

    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "blocked":
        return "Blocked";
      case "on_leave":
        return "On Leave";
      default:
        return "Unknown";
    }
  };

  // Lead distribution functions
  const handleLeadDistribution = async () => {
    if (selectedLeads.length === 0 || selectedEmployees.length === 0) {
      toast.error("Please select leads and employees");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://tc-crm.vercel.app/api/leads/distribute",
        {
          leadIds: selectedLeads,
          employeeIds: selectedEmployees,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message with details
      const { reassignments, newAssignments, totalAssigned } = response.data;
      let message = `Successfully assigned ${totalAssigned} leads`;
      if (reassignments > 0) {
        message += ` (${reassignments} reassignments to same employee)`;
      }
      if (newAssignments > 0) {
        message += ` (${newAssignments} new assignments)`;
      }
      toast.success(message);

      setSelectedLeads([]);
      setSelectedEmployees([]);
      fetchLeads();
    } catch (err) {
      // Handle specific error messages from the backend
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        err.response.data.errors.forEach((error) => {
          toast.error(error);
        });
      } else {
        toast.error(err.response?.data?.message || "Lead distribution failed");
      }
    }
  };

  // Approval functions
  const handleApproval = async (type, id, action, notes = "") => {
    try {
      const token = localStorage.getItem("token");

      if (type === "leave") {
        // For leave applications, we need to find the employee and leave details
        const leaveApplication = approvals.leaveApplications.find(
          (app) => app.id === id
        );
        if (leaveApplication) {
          await axios.patch(
            `https://tc-crm.vercel.app/api/employees/${leaveApplication.employeeId}/leave/${id}`,
            { status: action === "approve" ? "approved" : "rejected", notes },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } else {
        // For other approval types, use the general endpoint
        await axios.patch(
          `https://tc-crm.vercel.app/api/approvals`,
          { type, id, action },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success(
        `Request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      fetchApprovals();
      fetchLeaveApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval action failed");
    }
  };

  // Payment functions
  const handlePaymentEntry = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://tc-crm.vercel.app/api/payments/entries",
        { amount: parseFloat(paymentAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Payment entry created successfully");
      setPaymentAmount("");
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment entry failed");
    }
  };

  const handleClaimPayment = async (paymentId, leadId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `https://tc-crm.vercel.app/api/payments/claim/${paymentId}`,
        { leadId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Payment claimed successfully");
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment claim failed");
    }
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("bankDetails.")) {
      const bankField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [bankField]: value },
      }));
    } else if (name.startsWith("access.")) {
      const accessField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        access: { ...prev.access, [accessField]: checked },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Access control input handler
  const handleAccessControlChange = (field, checked) => {
    setAccessControlData((prev) => ({
      ...prev,
      [field]: checked,
    }));
  };

  // Employee row component
  const EmployeeRow = ({ employee }) => (
    <tr
      key={employee.employeeId}
      className="border-b border-gray-200 hover:bg-gray-50 text-sm"
    >
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {employee.name?.charAt(0)?.toUpperCase() || "E"}
              </span>
            </div>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium text-gray-900">
              {employee.name}
            </div>
            <div className="text-sm text-gray-500">{employee.email}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.employeeId}</div>
        <div className="text-sm text-gray-500">{employee.personalMobile}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusColor(
            employee.status,
            employee.isBlocked
          )}`}
        >
          {employee.isBlocked ? "Blocked" : getStatusText(employee.status)}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
        <div>On: {employee.onlineTime || "0h"}</div>
        <div>Break: {employee.breakTime || "0h"}</div>
        <div>Blk: {employee.blockedTime || "0h"}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
        <div>Pend: {employee.leadsPending || 0}</div>
        <div>Assg: {employee.leadsAssigned || 0}</div>
        <div>Cls: {employee.leadsClosed || 0}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
        <div>Col: ₹{employee.paymentCollection || 0}</div>
        <div>Pend: ₹{employee.pendingPayment || 0}</div>
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium">
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => handleEdit(employee)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => openAccessControlModal(employee)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 focus:outline-none text-sm"
          >
            Access
          </button>
          <button
            onClick={() => openResetPasswordModal(employee)}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 focus:outline-none text-sm"
          >
            Reset Pwd
          </button>
          {employee.isBlocked ? (
            <button
              onClick={() => openUnblockModal(employee)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 focus:outline-none text-sm"
            >
              Unblock
            </button>
          ) : (
            <button
              onClick={() => openBlockModal(employee)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none text-sm"
            >
              Block
            </button>
          )}
          <button
            onClick={() => handleDelete(employee.employeeId)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none text-sm"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );

  // Inside Employee component:
  useEffect(() => {
    // Only run for employee self-panel (not admin panel)
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.role === "employee" && user.employeeId) {
      usePresence(user.employeeId);
    }
  }, []);

  const handleAddLead = async (newLead, idx) => {
    try {
      console.log("handleAddLead called with:", newLead, "for row:", idx);
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No token found");
        toast.error("Authentication required");
        return;
      }

      console.log("Making API call to create lead...");
      const res = await axios.post(
        "https://tc-crm.vercel.app/api/leads/led",
        newLead,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API response:", res.data);
      const created = res.data?.lead || res.data; // adjust if backend returns differently

      if (created && created._id) {
        console.log("Lead created successfully with ID:", created._id);
        setLeadRows((rows) =>
          rows.map((row, i) =>
            i === idx
              ? {
                  ...row,
                  _id: created._id,
                  mobileNumber:
                    created.number ||
                    (created.mobileNumbers && created.mobileNumbers[0]) ||
                    row.mobileNumber,
                  brandName: created.brandName || row.brandName || "",
                  additionalNotes:
                    created.additionalNotes || row.additionalNotes || "",
                  _submitted: true,
                  _lastBrandName: created.brandName || row.brandName || "",
                  _lastNotes:
                    created.additionalNotes || row.additionalNotes || "",
                }
              : row
          )
        );
        toast.success("Lead created successfully!");
        // Always refresh distribution data after lead creation
        refreshDistributionData();
      } else {
        console.error("No lead ID in response:", res.data);
        toast.error("Failed to create lead - no ID returned");
      }
    } catch (err) {
      console.error("Error in handleAddLead:", err);
      console.error("Error response:", err.response?.data);
      toast.error(
        err.response?.data?.message || err.message || "Failed to add lead"
      );
    }
  };

  // Update handleLeadDistribution for single lead/employee
  const handleSingleLeadAssign = async () => {
    if (!selectedLeadId || !selectedEmployeeId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://tc-crm.vercel.app/api/leads/distribute",
        {
          leadIds: [selectedLeadId],
          employeeIds: [selectedEmployeeId],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message with details
      const { reassignments, newAssignments, totalAssigned } = response.data;
      let message = `Successfully assigned ${totalAssigned} lead`;
      if (reassignments > 0) {
        message += ` (reassigned to same employee)`;
      }
      toast.success(message);

      setSelectedLeadId(null);
      setSelectedEmployeeId("");
      fetchLeads();
      fetchEmployees();

      // Check for assigned leads
      setTimeout(() => {
        checkAndRemoveAssignedLeads();
      }, 1000);
    } catch (err) {
      // Handle specific error messages from the backend
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        err.response.data.errors.forEach((error) => {
          toast.error(error);
        });
      } else {
        toast.error(err.response?.data?.message || "Failed to assign lead");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add new row handler for '+ Add another' button
  const handleAddRow = () => {
    setLeadRows((rows) => [
      ...rows,
      { mobileNumber: "", brandName: "", additionalNotes: "" },
    ]);
  };

  // Remove a row handler for the × button
  const handleRemoveRow = (idx) => {
    setLeadRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleLeadRowChange = (idx, field, value) => {
    setLeadRows((rows) => {
      const updated = [...rows];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Check for existing leads when phone number is entered
  const checkExistingLeads = async (phoneNumber) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://tc-crm.vercel.app/api/leads/check-duplicate`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { phoneNumber },
        }
      );
      return res.data.existingLeads || [];
    } catch (err) {
      console.error("Error checking existing leads:", err);
      return [];
    }
  };

  // Check if leads are assigned and remove them from rows
  const checkAndRemoveAssignedLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://tc-crm.vercel.app/api/leads/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(res.data)) {
        // Get all lead IDs that are assigned
        const assignedLeadIds = res.data
          .filter((lead) => lead.assignedTo)
          .map((lead) => lead._id);

        // Remove assigned leads from rows
        setLeadRows((currentRows) =>
          currentRows.filter(
            (row) => !row._id || !assignedLeadIds.includes(row._id)
          )
        );
      }
    } catch (err) {
      console.error("Error checking assigned leads:", err);
    }
  };

  // Refresh distribution data
  const refreshDistributionData = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return;
      }

      console.log("Refreshing distribution data...");
      const leadsRes = await axios.get(
        "https://tc-crm.vercel.app/api/leads/distribution",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Refreshed leads response:", leadsRes.data);
      console.log("Number of leads found:", leadsRes.data.leads?.length || 0);
      // Only show completed leads
      // const completedLeads = (leadsRes.data.leads || leadsRes.data || []).filter(lead => lead.status && lead.status === 'completed');
      // setDistributionLeads(completedLeads);
      // setCompletedLeadsCount(completedLeads.length);
      setDistributionLeads(leadsRes.data.leads || leadsRes.data || []);
      setCompletedLeadsCount(
        (leadsRes.data.leads || leadsRes.data || []).length
      );
    } catch (err) {
      console.error("Error refreshing distribution data:", err);
    }
  };

  // Auto-submit when mobile number is filled in any row
  useEffect(() => {
    const processRow = async (row, idx) => {
      // Only trigger when mobile number is exactly 10 digits (adjust as needed)
      if (
        row.mobileNumber &&
        /^\d{10}$/.test(row.mobileNumber) &&
        !row._submitted
      ) {
        console.log("Processing row:", idx, "with number:", row.mobileNumber);

        // First check for existing leads
        const existingLeads = await checkExistingLeads(row.mobileNumber);

        if (existingLeads.length > 0) {
          // Show existing leads info
          const assignedLeads = existingLeads.filter((lead) => lead.assignedTo);
          const unassignedLeads = existingLeads.filter(
            (lead) => !lead.assignedTo
          );

          let message = `Found ${existingLeads.length} existing lead(s) for ${row.mobileNumber}`;
          if (assignedLeads.length > 0) {
            message += ` (${assignedLeads.length} assigned)`;
          }
          if (unassignedLeads.length > 0) {
            message += ` (${unassignedLeads.length} unassigned)`;
          }

          toast.info(message, {
            duration: 5000,
            onClick: () => {
              // Show detailed modal with existing leads
              setExistingLeadsModal({
                phoneNumber: row.mobileNumber,
                leads: existingLeads,
                isOpen: true,
              });
            },
          });
        }

        // Mark as submitted first
        setLeadRows((rows) =>
          rows.map((r, i) => (i === idx ? { ...r, _submitted: true } : r))
        );

        // Then create the lead
        setAddLeadSubmitting(true);
        try {
          console.log("Creating lead for row:", idx);
          await handleAddLead(
            {
              mobileNumbers: [row.mobileNumber],
              number: row.mobileNumber, // Also send as number field for compatibility
              brandName: row.brandName,
              additionalNotes: row.additionalNotes,
            },
            idx
          );
          console.log("Lead created successfully for row:", idx);
        } catch (err) {
          console.error("Error creating lead for row:", idx, err);
          toast.error(err?.message || "Failed to save lead");
          // Reset the submitted flag on error
          setLeadRows((rows) =>
            rows.map((r, i) => (i === idx ? { ...r, _submitted: false } : r))
          );
        } finally {
          setAddLeadSubmitting(false);
        }
      }
    };

    // Process each row
    leadRows.forEach((row, idx) => {
      processRow(row, idx);
    });
  }, [leadRows]);

  // Check for assigned leads periodically and remove them from rows
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRemoveAssignedLeads();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Update lead in backend if brand name or notes change after lead is created (10-digit number and _submitted)
  useEffect(() => {
    leadRows.forEach((row, idx) => {
      if (
        row._id &&
        row.mobileNumber &&
        /^\d{10}$/.test(row.mobileNumber) &&
        row._submitted &&
        (row._lastBrandName !== row.brandName ||
          row._lastNotes !== row.additionalNotes)
      ) {
        setLeadRows((rows) =>
          rows.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  _lastBrandName: row.brandName,
                  _lastNotes: row.additionalNotes,
                }
              : r
          )
        );
        (async () => {
          try {
            await axios.put(
              `https://tc-crm.vercel.app/api/leads/${row._id}`,
              {
                brandName: row.brandName,
                additionalNotes: row.additionalNotes,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
          } catch (err) {
            toast.error(
              err?.response?.data?.message ||
                err?.message ||
                "Failed to update lead"
            );
          }
        })();
      }
    });
  }, [leadRows]);

  // On mount, fetch backend leads and set as leadRows
  useEffect(() => {
    const fetchBackendLeads = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://tc-crm.vercel.app/api/leads/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(res.data)) {
          // Only show unassigned leads
          const unassigned = res.data.filter((lead) => !lead.assignedTo);
          const rows = unassigned.map((lead) => ({
            _id: lead._id,
            mobileNumber: lead.mobileNumber || lead.mobileNumbers?.[0] || "",
            brandName: lead.brandName || "",
            additionalNotes: lead.additionalNotes || "",
            _submitted: true,
            _lastBrandName: lead.brandName || "",
            _lastNotes: lead.additionalNotes || "",
          }));

          // Only set rows if there are no existing rows (first load)
          setLeadRows((currentRows) => {
            if (
              currentRows.length === 0 ||
              (currentRows.length === 1 && !currentRows[0].mobileNumber)
            ) {
              return rows.length > 0
                ? rows
                : [
                    {
                      mobileNumber: "",
                      brandName: "",
                      additionalNotes: "",
                      _submitted: false,
                    },
                  ];
            }
            return currentRows;
          });
        }
      } catch (err) {
        setLeadRows((currentRows) => {
          if (currentRows.length === 0) {
            return [
              {
                mobileNumber: "",
                brandName: "",
                additionalNotes: "",
                _submitted: false,
              },
            ];
          }
          return currentRows;
        });
      }
    };
    fetchBackendLeads();
  }, []);

  // Fetch available leads and employees for distribution
  const openDistribution = async () => {
    console.log("openDistribution called");
    setIsDistributionOpen(true);
    setDistributionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      console.log("User:", user);

      // Check if user has permission
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        toast.error(
          "Access denied. You do not have permission to access distribution data."
        );
        setIsDistributionOpen(false);
        return;
      }

      // Check if user has copy access for lead selection
      const userHasCopyAccess =
        user.role === "super-admin" || user.role === "admin";
      setHasCopyAccess(userHasCopyAccess);

      // No need to block admin for lack of copy access

      console.log("Fetching leads for distribution...");
      // Get available leads (unassigned)
      const leadsRes = await axios.get(
        "https://tc-crm.vercel.app/api/leads/distribution",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Leads response:", leadsRes.data);
      console.log("Number of leads found:", leadsRes.data.leads?.length || 0);
      // Only show completed leads
      // const completedLeads = (leadsRes.data.leads || leadsRes.data || []).filter(lead => lead.status && lead.status === 'completed');
      // setDistributionLeads(completedLeads);
      // setCompletedLeadsCount(completedLeads.length);
      setDistributionLeads(leadsRes.data.leads || leadsRes.data || []);
      setCompletedLeadsCount(
        (leadsRes.data.leads || leadsRes.data || []).length
      );

      console.log("Fetching employees for distribution...");
      // Get employees
      const employeesRes = await axios.get(
        "https://tc-crm.vercel.app/api/employees/lead-distribution",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Employees response:", employeesRes.data);
      setDistributionEmployees(employeesRes.data || []);

      // Show message if no leads found
      if (!leadsRes.data.leads || leadsRes.data.leads.length === 0) {
        toast.info(
          'No unassigned leads found. Create leads in the "Add New Lead" section above.'
        );
      }
    } catch (err) {
      console.error("Distribution data loading error:", err);
      console.error("Error details:", {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
      });

      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else if (err.response?.status === 403) {
        toast.error(
          "Access denied. You do not have permission to access distribution data."
        );
      } else if (err.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      } else if (
        err.code === "NETWORK_ERROR" ||
        err.message.includes("Network Error")
      ) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Failed to load distribution data"
        );
      }
      setIsDistributionOpen(false);
    } finally {
      setDistributionLoading(false);
    }
  };

  // Distribute selected leads to selected employees
  const handleDistributeLeads = async () => {
    if (
      !selectedDistributionLeads.length ||
      !selectedDistributionEmployees.length
    )
      return;
    setDistributionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "https://tc-crm.vercel.app/api/leads/distribute",
        {
          leadIds: selectedDistributionLeads,
          employeeIds: selectedDistributionEmployees,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message with details
      const { reassignments, newAssignments, totalAssigned } = response.data;
      let message = `Successfully assigned ${totalAssigned} leads`;
      if (reassignments > 0) {
        message += ` (${reassignments} reassignments to same employee)`;
      }
      if (newAssignments > 0) {
        message += ` (${newAssignments} new assignments)`;
      }
      toast.success(message);

      // Remove assigned leads from leadRows
      setLeadRows((rows) =>
        rows.filter((row) => !selectedDistributionLeads.includes(row._id))
      );
      setIsDistributionOpen(false);
      setSelectedDistributionLeads([]);
      setSelectedDistributionEmployees([]);

      // Also check for any other assigned leads
      setTimeout(() => {
        checkAndRemoveAssignedLeads();
      }, 1000);
    } catch (err) {
      // Handle specific error messages from the backend
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        err.response.data.errors.forEach((error) => {
          toast.error(error);
        });
      } else {
        toast.error(
          err.response?.data?.message || "Failed to distribute leads"
        );
      }
    } finally {
      ñ;
      setDistributionLoading(false);
    }
  };

  // Fetch employees for distribution (on modal open)
  const fetchDistributionEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://tc-crm.vercel.app/api/employees?limit=10",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Only update if not in Sheet Distribution tab
      if (activeTab !== "sheetDistribution") {
        setDistributionEmployees(res.data.employees || res.data || []);
      }
    } catch (err) {
      if (activeTab !== "sheetDistribution") {
        setDistributionEmployees([]);
      }
    }
  };

  // Fetch leads for selected employee
  const fetchDistributionLeads = async (employeeId) => {
    setDistributionLeads([]);
    if (!employeeId) return;
    setDistributionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://tc-crm.vercel.app/api/leads/employee/${employeeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDistributionLeads(res.data.leads || res.data || []);
    } catch (err) {
      setDistributionLeads([]);
    } finally {
      setDistributionLoading(false);
    }
  };

  // Open modal handler

  // Handle employee select

  // Handle lead select

  // Handle sheet count change

  // Handle distribute

  // At the top of Employee component, with other useState hooks:

  const [selectedDistributionEmployee, setSelectedDistributionEmployee] =
    useState("");

  // Add state for completed leads count
  const [completedLeadsCount, setCompletedLeadsCount] = useState(0);

  // Add state for selected sheet ID

  // Add these states and handlers at the top of the Employee component:
  // Sheet Distribution states and handlers
  const [sheetPasteData, setSheetPasteData] = useState("");
  const [sheetRows, setSheetRows] = useState([]);
  const [selectedSheetEmployee, setSelectedSheetEmployee] = useState("");

  function handleSheetPaste(val) {
    setSheetPasteData(val);
    parseSheetData(val);
  }

  // Add at the top of the Employee component:
  const [sheetFileLoading, setSheetFileLoading] = useState(false);

  function handleSheetFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSheetFileLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      let workbook;
      try {
        workbook = XLSX.read(data, { type: "binary" });
      } catch (err) {
        toast.error(
          "Failed to read file. Please upload a valid Excel or CSV file."
        );
        setSheetFileLoading(false);
        return;
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      setSheetRows(json);
      setSheetPasteData("");
      setSheetFileLoading(false);
    };
    reader.readAsBinaryString(file);
  }

  function parseSheetData(val) {
    // Split by newlines, then by tab or comma
    const rows = val
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(/\t|,/));
    if (rows.length === 0) {
      setSheetRows([]);
      return;
    }
    // Use first row as header if it looks like header, else generate generic headers
    let headers = rows[0];
    let dataRows = rows.slice(1);
    // If headers are all numbers, treat as data
    if (headers.every((h) => /^\d+$/.test(h))) {
      headers = headers.map((_, i) => `Col${i + 1}`);
      dataRows = rows;
    }
    // Map phone number-like headers to 'NUMBER'
    const phoneHeadersRaw = [
      "phone",
      "contact",
      "mobile",
      "mobile number",
      "number",
      "mobileno.",
      "mobileno",
      "mobile no",
      "mobile_no",
      "mobile no.",
      "mobile number",
      "mobile no_",
      "mobile no.",
    ];
    // Normalize function: uppercase, remove spaces, dots, underscores
    function normalizeHeader(h) {
      return h.replace(/[_ .]/g, "").toUpperCase();
    }
    const phoneHeaders = phoneHeadersRaw.map(normalizeHeader);
    let mappedHeaders = headers.map((h) =>
      phoneHeaders.includes(normalizeHeader(h)) ? "NUMBER" : h.trim()
    );
    // Always add 'Notes' header if not present
    if (!mappedHeaders.includes("Notes")) {
      mappedHeaders.push("Notes");
    }
    const parsed = dataRows.map((row) => {
      const obj = {};
      mappedHeaders.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      // Ensure Notes field always exists
      if (!("Notes" in obj)) obj["Notes"] = "";
      return obj;
    });
    setSheetRows(parsed);
  }

  // Add this handler inside the Employee component:
  async function handleAssignSheet() {
    if (!sheetRows || sheetRows.length === 0 || !selectedSheetEmployee) return;
    // Normalize phone numbers in sheetRows before sending
    function normalizePhone(phone) {
      if (!phone) return "";
      let p = phone.toString().replace(/[^\d+]/g, ""); // remove spaces, dashes, etc.
      if (p.startsWith("+91")) p = p.slice(3);
      else if (p.startsWith("91") && p.length > 10) p = p.slice(2);
      if (p.length > 10) p = p.slice(-10);
      return p;
    }
    const normalizedRows = sheetRows.map((row) => {
      const newRow = { ...row };
      if (row.NUMBER) newRow.NUMBER = normalizePhone(row.NUMBER);
      if (row.MOBILE) newRow.MOBILE = normalizePhone(row.MOBILE);
      if (row.phoneNumber) newRow.phoneNumber = normalizePhone(row.phoneNumber);
      if (row.number) newRow.number = normalizePhone(row.number);
      if (row.mobileNumber)
        newRow.mobileNumber = normalizePhone(row.mobileNumber);
      return newRow;
    });
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://tc-crm.vercel.app/api/leads/sheet-distribution",
        {
          leads: normalizedRows,
          employeeId: selectedSheetEmployee,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Sheet assign response:", res.data); // Debug log
      // Naya logic: Agar response me message hai to success toast dikhao
      if (
        res.data.message &&
        res.data.message.includes("Sheet assigned successfully")
      ) {
        toast.success(res.data.message);
      }
      setSheetPasteData("");
      setSheetRows([]);
      setSelectedSheetEmployee("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign sheet");
    }
  }

  // Add at the top of the Employee component:
  const [sheetAssignedLeads, setSheetAssignedLeads] = useState([]);
  const [sheetAssignedLoading, setSheetAssignedLoading] = useState(false);
  const [selectedAssignedLead, setSelectedAssignedLead] = useState(null);
  const [isAssignedLeadModalOpen, setIsAssignedLeadModalOpen] = useState(false);

  // Fetch assigned leads when Sheet Assigned tab is active
  useEffect(() => {
    if (activeTab === "sheetAssigned") {
      fetchSheetAssignedLeads();
    }
  }, [activeTab]);

  async function fetchSheetAssignedLeads() {
    setSheetAssignedLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://tc-crm.vercel.app/api/leads/assigned", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSheetAssignedLeads(res.data.assignedLeads || []);
    } catch (err) {
      setSheetAssignedLeads([]);
      toast.error("Failed to fetch assigned leads");
    } finally {
      setSheetAssignedLoading(false);
    }
  }

  function groupLeadsByEmployee(leads) {
    const grouped = {};
    leads.forEach((lead) => {
      const empId = lead.assignedTo?.employeeId || "Unknown";
      if (!grouped[empId])
        grouped[empId] = { employee: lead.assignedTo, leads: [] };
      grouped[empId].leads.push(lead);
    });
    return grouped;
  }

  function handleAssignedLeadDoubleClick(lead) {
    setSelectedAssignedLead(lead);
    setIsAssignedLeadModalOpen(true);
  }

  async function handleAssignedLeadSave(updatedLead) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `https://tc-crm.vercel.app/api/leads/${updatedLead.id}`,
        updatedLead,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Lead updated");
      setIsAssignedLeadModalOpen(false);
      fetchSheetAssignedLeads();
    } catch (err) {
      toast.error("Failed to update lead");
    }
  }

  // Add these states at the top of the Employee component:
  const [sheetAssignedSearch, setSheetAssignedSearch] = useState("");
  const [sheetAssignedEmpFilter, setSheetAssignedEmpFilter] = useState("");

  // Export to CSV
  function handleExportAssignedLeads() {
    if (!sheetAssignedLeads.length) return;
    const headers = [
      "Employee Name",
      "Employee ID",
      "Lead ID",
      "Name",
      "Phone",
      "Brand",
      "Notes",
      "Assigned At",
    ];
    const rows = sheetAssignedLeads.map((lead) => [
      lead.assignedTo?.name || "",
      lead.assignedTo?.employeeId || "",
      lead.id,
      lead.notes,
      lead.phoneNumber,
      lead.brandName,
      lead.notes,
      lead.assignedAt ? new Date(lead.assignedAt).toLocaleString() : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((x) => `"${(x || "").toString().replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "assigned_leads.csv");
  }

  // Filtered and searched leads
  function getFilteredAssignedLeads() {
    let leads = sheetAssignedLeads;
    if (sheetAssignedEmpFilter) {
      leads = leads.filter(
        (l) => l.assignedTo?.employeeId === sheetAssignedEmpFilter
      );
    }
    if (sheetAssignedSearch) {
      const q = sheetAssignedSearch.toLowerCase();
      leads = leads.filter(
        (l) =>
          (l.assignedTo?.name || "").toLowerCase().includes(q) ||
          (l.assignedTo?.employeeId || "").toLowerCase().includes(q) ||
          (l.notes || "").toLowerCase().includes(q) ||
          (l.phoneNumber || "").toLowerCase().includes(q) ||
          (l.brandName || "").toLowerCase().includes(q)
      );
    }
    return leads;
  }

  // Add this state at the top of the Employee component:
  const [assignedEmployeeFilter, setAssignedEmployeeFilter] = useState("");

  // Helper to get assigned leads for selected employee
  function getAssignedLeadsForSelectedEmployee() {
    if (!assignedEmployeeFilter) return [];
    return sheetAssignedLeads.filter(
      (l) => l.assignedTo?.employeeId === assignedEmployeeFilter
    );
  }

  // Add at the top of the Employee component:
  const [assignedSheetRows, setAssignedSheetRows] = useState([]);
  const [assignedSheetLoading, setAssignedSheetLoading] = useState(false);

  // Fetch assigned sheet rows for selected employee
  async function fetchAssignedSheetRows(employeeId) {
    console.log("Fetching assigned sheets for employeeId:", employeeId); // Debug log
    if (!employeeId) {
      setAssignedSheetRows([]);
      return;
    }
    setAssignedSheetLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://tc-crm.vercel.app/api/leads/sheet-assigned?employeeId=${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignedSheetRows(
        res.data.assignedSheets.map((row) => {
          const { _id, assignedAt, data } = row;
          return {
            ...data,
            assignedAt,
            _id,
            Notes: data.Notes || data.notes || "",
          };
        })
      );
    } catch (err) {
      setAssignedSheetRows([]);
      toast.error("Failed to fetch assigned sheets");
    } finally {
      setAssignedSheetLoading(false);
    }
  }

  // Fetch when tab or employee changes
  useEffect(() => {
    if (activeTab === "sheetAssigned" && assignedEmployeeFilter) {
      fetchAssignedSheetRows(assignedEmployeeFilter);
    }
  }, [activeTab, assignedEmployeeFilter]);

  console.log("Employees for dropdown:", employees);
  if (employees && employees.length > 0) {
    console.log(
      "Employee IDs in dropdown:",
      employees.map((e) => e.employeeId)
    );
  }

  // Add at the top of the Employee component:
  const [editSheetRow, setEditSheetRow] = useState(null);
  const [isEditSheetModalOpen, setIsEditSheetModalOpen] = useState(false);

  function handleEditAssignedSheetRow(row) {
    setEditSheetRow(row);
    setIsEditSheetModalOpen(true);
  }

  async function handleSaveAssignedSheetRow(updatedRow) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `https://tc-crm.vercel.app/api/leads/sheet-assigned/${updatedRow._id}`,
        updatedRow,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Sheet row updated!");
      setIsEditSheetModalOpen(false);
      // Refresh the assigned sheet rows
      fetchAssignedSheetRows(assignedEmployeeFilter);
    } catch (err) {
      toast.error("Failed to update sheet row");
    }
  }

  // Add at the top of the Employee component:
  const [selectedSheetRows, setSelectedSheetRows] = useState([]);

  function handleSheetRowCheckboxChange(rowId, checked) {
    setSelectedSheetRows((prev) =>
      checked ? [...prev, rowId] : prev.filter((id) => id !== rowId)
    );
  }

  function handleSelectAllSheetRows(checked) {
    if (checked) {
      setSelectedSheetRows(assignedSheetRows.map((row) => row._id));
    } else {
      setSelectedSheetRows([]);
    }
  }

  // 1. Add state for bulk delete loading
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // 2. Update handleDeleteSelectedSheetRows to show/hide loader
  async function handleDeleteSelectedSheetRows() {
    if (!selectedSheetRows.length || !assignedEmployeeFilter) return;
    if (!window.confirm("Are you sure you want to delete the selected rows?"))
      return;
    setBulkDeleteLoading(true);
    let timeoutId = setTimeout(() => {
      setBulkDeleteLoading(false);
      toast.error(
        "Delete taking too long. Please check your connection or try again."
      );
    }, 10000); // 10 seconds fallback
    try {
      const token = localStorage.getItem("token");
      console.log(
        "Bulk deleting rows:",
        selectedSheetRows,
        "for employee:",
        assignedEmployeeFilter
      );
      await axios.post(
        "https://tc-crm.vercel.app/api/leads/sheet-assigned/bulk-delete",
        {
          rowIds: selectedSheetRows,
          employeeId: assignedEmployeeFilter,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Selected rows deleted!");
      setAssignedSheetRows((prev) =>
        prev.filter((row) => !selectedSheetRows.includes(row._id))
      );
      setSelectedSheetRows([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Failed to delete selected rows");
    } finally {
      clearTimeout(timeoutId);
      setBulkDeleteLoading(false);
    }
  }

  console.log("userRole:", userRole);
  console.log(
    "Rendering Sheet Assigned table, userRole:",
    userRole,
    "assignedSheetRows:",
    assignedSheetRows
  );

  // Add the delete handler function:
  async function handleDeleteAssignedSheetRow(rowId) {
    if (!window.confirm("Are you sure you want to delete this row?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://tc-crm.vercel.app/api/leads/sheet-assigned/${rowId}?employeeId=${assignedEmployeeFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Row deleted!");
      // Remove deleted row from UI instantly
      setAssignedSheetRows((prev) => prev.filter((row) => row._id !== rowId));
    } catch (err) {
      toast.error("Failed to delete row");
    }
  }

  // Add at the top of the Employee component:
  const [assignedSheetPage, setAssignedSheetPage] = useState(1);
  const assignedSheetRowsPerPage = 10;

  // Calculate paginated rows
  const paginatedAssignedSheetRows = assignedSheetRows.slice(
    (assignedSheetPage - 1) * assignedSheetRowsPerPage,
    assignedSheetPage * assignedSheetRowsPerPage
  );
  const totalAssignedSheetPages = Math.ceil(
    assignedSheetRows.length / assignedSheetRowsPerPage
  );

  // Reset page to 1 when data or filter changes
  useEffect(() => {
    setAssignedSheetPage(1);
  }, [assignedSheetRows, assignedEmployeeFilter]);

  // Pagination logic for showing only 6 page numbers at a time
  const paginationGroupSize = 6;
  const currentGroup = Math.floor(
    (assignedSheetPage - 1) / paginationGroupSize
  );
  const startPage = currentGroup * paginationGroupSize + 1;
  const endPage = Math.min(
    startPage + paginationGroupSize - 1,
    totalAssignedSheetPages
  );
  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  // Sheet Distribution pagination state and logic
  const [sheetDistributionPage, setSheetDistributionPage] = useState(1);
  const sheetDistributionRowsPerPage = 10;
  const paginatedSheetRows = sheetRows.slice(
    (sheetDistributionPage - 1) * sheetDistributionRowsPerPage,
    sheetDistributionPage * sheetDistributionRowsPerPage
  );
  const totalSheetDistributionPages = Math.ceil(sheetRows.length / sheetDistributionRowsPerPage);
  // Pagination group logic for Sheet Distribution
  const sheetDistPaginationGroupSize = 6;
  const sheetDistCurrentGroup = Math.floor((sheetDistributionPage - 1) / sheetDistPaginationGroupSize);
  const sheetDistStartPage = sheetDistCurrentGroup * sheetDistPaginationGroupSize + 1;
  const sheetDistEndPage = Math.min(sheetDistStartPage + sheetDistPaginationGroupSize - 1, totalSheetDistributionPages);
  const sheetDistVisiblePages = [];
  for (let i = sheetDistStartPage; i <= sheetDistEndPage; i++) {
    sheetDistVisiblePages.push(i);
  }
  // Reset page to 1 when data changes
  useEffect(() => {
    setSheetDistributionPage(1);
  }, [sheetRows]);

  // Fetch all employees for Sheet Distribution dropdown
  const fetchAllEmployeesForSheetDistribution = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://tc-crm.vercel.app/api/employees?all=true",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('All employees response:', res.data); // Debug log
      setSheetDistributionEmployees(res.data.employees || res.data || []);
    } catch (err) {
      setSheetDistributionEmployees([]);
    }
  };

  const openSheetDistribution = () => {
    setActiveTab("sheetDistribution");
    fetchAllEmployeesForSheetDistribution();
    // ... any other logic for opening the tab/modal
  };

  // Add this with other useState hooks at the top of the Employee component
  const [sheetDistributionEmployees, setSheetDistributionEmployees] = useState([]);

  return (
    <div
      className={`flex-1 transition-margin duration-300 mt-16 ${
        sidebarCollapsed ? "ml-16" : "ml-48"
      }`}
    >
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "pl-4" : "pl-0"
        }`}
      >
        <Header
          title="Employee Management"
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>
      <div
        className={`p-4 sm:p-6 transition-all duration-300 ${
          sidebarCollapsed ? "pl-4" : "pl-0"
        }`}
      >
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            {[
              { id: "employees", name: "Employees" },
              ...(userRole === "admin" || userRole === "super-admin"
                ? [
                    { id: "leads", name: "Lead Distribution" },
                    { id: "sheetDistribution", name: "Sheet Distribution" }, // <-- New tab
                    { id: "assignedLeads", name: "Assigned Leads" },
                    { id: "sheetAssigned", name: "Sheet Assigned" }, // <-- New tab
                    { id: "approvals", name: "Approvals" },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "sheetDistribution") {
                    openSheetDistribution();
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div>
            {/* Filters and Add Button */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="blocked">Blocked</option>
                  <option value="on_leave">On Leave</option>
                </select>

                <select
                  value={productivityFilter}
                  onChange={(e) => setProductivityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>

                {productivityFilter === "custom" && (
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) =>
                        setCustomDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col items-end space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddEmployee}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Employee
                  </button>
                </div>
                {/* Show live clock in 12-hour format with AM/PM */}
                <div className="text-xs text-green-600 font-semibold">
                  Live time:{" "}
                  {liveTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
            </div>

            {/* Employee Table: Responsive, Compact, Larger Text */}
            <div className="bg-white shadow overflow-x-auto sm:rounded-md max-h-[60vh] min-h-[200px]">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Emp
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          ID/Contact
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Time
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Leads
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Payment
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <EmployeeRow
                          key={employee.employeeId}
                          employee={employee}
                        />
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {pagination.total > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current: prev.current - 1,
                            }))
                          }
                          disabled={pagination.current === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current: prev.current + 1,
                            }))
                          }
                          disabled={pagination.current === pagination.total}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{" "}
                            <span className="font-medium">
                              {(pagination.current - 1) * 10 + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {Math.min(
                                pagination.current * 10,
                                pagination.totalRecords
                              )}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                              {pagination.totalRecords}
                            </span>{" "}
                            results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() =>
                                setPagination((prev) => ({
                                  ...prev,
                                  current: prev.current - 1,
                                }))
                              }
                              disabled={pagination.current === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() =>
                                setPagination((prev) => ({
                                  ...prev,
                                  current: prev.current + 1,
                                }))
                              }
                              disabled={pagination.current === pagination.total}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Lead Distribution Tab */}
        {activeTab === "leads" &&
        (userRole === "admin" || userRole === "super-admin") ? (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Add New Lead
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {leadRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-col lg:flex-row gap-4 items-start border-b pb-4 mb-2"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold self-center lg:self-auto">
                    {idx + 1}
                  </div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={row.mobileNumber}
                      onChange={(e) =>
                        handleLeadRowChange(idx, "mobileNumber", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={row.brandName}
                      onChange={(e) =>
                        handleLeadRowChange(idx, "brandName", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={row.additionalNotes}
                      onChange={(e) =>
                        handleLeadRowChange(
                          idx,
                          "additionalNotes",
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none h-[40px]"
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 self-start"
                  disabled={addLeadSubmitting}
                  onClick={() =>
                    setLeadRows((rows) => [
                      ...rows,
                      {
                        mobileNumber: "",
                        brandName: "",
                        additionalNotes: "",
                        _submitted: false,
                      },
                    ])
                  }
                >
                  + Add another
                </button>
                <button
                  type="button"
                  className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 self-start"
                  onClick={openDistribution}
                >
                  Lead Distribution
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "leads" ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-500">
              You do not have permission to access Lead Distribution.
            </p>
          </div>
        ) : null}

        {/* Assigned Leads Tab */}
        {activeTab === "assignedLeads" &&
          (userRole === "admin" || userRole === "super-admin") && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assigned Leads
              </h3>
              <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Leads
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedLeads.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center py-4 text-gray-400"
                        >
                          No assigned leads found.
                        </td>
                      </tr>
                    ) : (
                      // Group by assignedTo
                      Object.entries(
                        assignedLeads.reduce((acc, lead) => {
                          const key = lead.assignedTo
                            ? lead.assignedTo.employeeId || lead.assignedTo._id
                            : "Unassigned";
                          if (!acc[key])
                            acc[key] = { employee: lead.assignedTo, leads: [] };
                          acc[key].leads.push(lead);
                          return acc;
                        }, {})
                      ).map(([key, group]) => (
                        <tr key={key}>
                          <td
                            className="px-3 py-2 cursor-pointer text-blue-600 hover:underline"
                            onClick={() => setSelectedEmployeeLeads(group)}
                          >
                            {group.employee ? (
                              `${group.employee.name || "-"} (${
                                group.employee.employeeId ||
                                group.employee._id ||
                                "-"
                              })`
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">{group.leads.length}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Enhanced Modal for Assigned Leads */}
              {selectedEmployeeLeads && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            Assigned Leads for{" "}
                            {selectedEmployeeLeads.employee
                              ? selectedEmployeeLeads.employee.name
                              : "Unknown Employee"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Employee ID:{" "}
                            {selectedEmployeeLeads.employee
                              ? selectedEmployeeLeads.employee.employeeId ||
                                selectedEmployeeLeads.employee._id
                              : "-"}
                            • Total Leads: {selectedEmployeeLeads.leads.length}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEmployeeLeads(null)}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Content with Auto-scroll */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="flex-1 overflow-y-auto p-6">
                        <div>
                          {/* Summary Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-blue-600">
                                    Total Leads
                                  </p>
                                  <p className="text-2xl font-bold text-blue-900">
                                    {selectedEmployeeLeads.leads.length}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                  <svg
                                    className="w-5 h-5 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-green-600">
                                    Recent Assignments
                                  </p>
                                  <p className="text-2xl font-bold text-green-900">
                                    {
                                      selectedEmployeeLeads.leads.filter(
                                        (lead) => {
                                          const assignedDate = new Date(
                                            lead.assignedAt
                                          );
                                          const weekAgo = new Date();
                                          weekAgo.setDate(
                                            weekAgo.getDate() - 7
                                          );
                                          return assignedDate > weekAgo;
                                        }
                                      ).length
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                  <svg
                                    className="w-5 h-5 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-purple-600">
                                    With Brand Names
                                  </p>
                                  <p className="text-2xl font-bold text-purple-900">
                                    {
                                      selectedEmployeeLeads.leads.filter(
                                        (lead) =>
                                          lead.brandName &&
                                          lead.brandName.trim()
                                      ).length
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Table with Proper Scroll */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="max-h-80 overflow-y-auto overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                      <div className="flex items-center space-x-1">
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                          />
                                        </svg>
                                        <span>Phone Number</span>
                                      </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                      <div className="flex items-center space-x-1">
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                          />
                                        </svg>
                                        <span>Brand Name</span>
                                      </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                      <div className="flex items-center space-x-1">
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                          />
                                        </svg>
                                        <span>Notes</span>
                                      </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                      <div className="flex items-center space-x-1">
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                          />
                                        </svg>
                                        <span>Assigned By</span>
                                      </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                                      <div className="flex items-center space-x-1">
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <span>Assigned At</span>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {selectedEmployeeLeads.leads.map(
                                    (lead, index) => (
                                      <tr
                                        key={lead.id}
                                        className={`hover:bg-gray-50 transition-colors ${
                                          index % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                        }`}
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                              <span className="text-sm font-medium text-blue-600">
                                                #{index + 1}
                                              </span>
                                            </div>
                                            <div>
                                              <div className="text-sm font-medium text-gray-900">
                                                {lead.phoneNumber ? (
                                                  <span className="text-blue-600 font-semibold">
                                                    {lead.phoneNumber}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400 italic">
                                                    No phone number
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Lead ID: {lead.id}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {lead.brandName ? (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {lead.brandName}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400 italic">
                                                No brand name
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                          <div className="text-sm text-gray-900 max-w-xs">
                                            {lead.notes ? (
                                              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                                                <p className="text-sm text-yellow-800">
                                                  {lead.notes}
                                                </p>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400 italic">
                                                No notes
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {lead.assignedBy ? (
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                                                  <svg
                                                    className="w-3 h-3 text-purple-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                  </svg>
                                                </div>
                                                <div>
                                                  <div className="font-medium">
                                                    {lead.assignedBy.name ||
                                                      "Unknown"}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {lead.assignedBy.role ||
                                                      "Unknown Role"}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400 italic">
                                                System assigned
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {lead.assignedAt ? (
                                              <div className="flex items-center">
                                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                                  <svg
                                                    className="w-3 h-3 text-green-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                  </svg>
                                                </div>
                                                <div>
                                                  <div className="font-medium">
                                                    {new Date(
                                                      lead.assignedAt
                                                    ).toLocaleDateString()}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {new Date(
                                                      lead.assignedAt
                                                    ).toLocaleTimeString()}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400 italic">
                                                Unknown
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer - Fixed at Bottom */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing {selectedEmployeeLeads.leads.length} leads for{" "}
                          {selectedEmployeeLeads.employee
                            ? selectedEmployeeLeads.employee.name
                            : "this employee"}
                        </div>
                        <button
                          onClick={() => setSelectedEmployeeLeads(null)}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Approvals Tab */}
        {activeTab === "approvals" &&
          (userRole === "admin" || userRole === "super-admin") && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leave Applications */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Leave Applications
                  </h4>
                  <div className="space-y-3">
                    {approvals.leaveApplications.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No pending leave applications
                      </div>
                    ) : (
                      approvals.leaveApplications.map((app) => (
                        <div
                          key={app.id}
                          className="border rounded-md p-3 bg-blue-50 border-blue-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-blue-900">
                              {app.employeeName}
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              ID: {app.employeeId}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mb-2">
                            <strong>Reason:</strong> {app.reason}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Period:</strong> {app.dates}
                          </div>
                          <div className="text-xs text-gray-500 mb-3">
                            Applied:{" "}
                            {new Date(app.requestedAt).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                handleApproval("leave", app.id, "approve")
                              }
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectLeaveId(app.id);
                                setRejectLeaveNotes("");
                                setShowRejectLeaveModal(true);
                              }}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Block Requests */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Block Requests
                  </h4>
                  <div className="space-y-3">
                    {approvals.blockRequests.map((req) => (
                      <div key={req.id} className="border rounded-md p-3">
                        <div className="font-medium">{req.employeeName}</div>
                        <div className="text-sm text-gray-600">
                          {req.reason}
                        </div>
                        <div className="text-sm text-gray-500">
                          {req.requestedAt}
                        </div>
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() =>
                              handleApproval("block", req.id, "approve")
                            }
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApproval("block", req.id, "reject")
                            }
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Login Requests */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Login Requests
                  </h4>
                  <div className="space-y-3">
                    {approvals.loginRequests.map((req) => (
                      <div key={req.id} className="border rounded-md p-3">
                        <div className="font-medium">{req.employeeName}</div>
                        <div className="text-sm text-gray-600">
                          {req.reason}
                        </div>
                        <div className="text-sm text-gray-500">
                          {req.requestedAt}
                        </div>
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() =>
                              handleApproval("login", req.id, "approve")
                            }
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApproval("login", req.id, "reject")
                            }
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Assigned Sheet Tab */}
        {activeTab === "assignedSheet" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Assigned Sheet
              </h3>
              <div className="flex gap-2">
                {(userRole === "admin" || userRole === "super-admin") && (
                  <>
                    <button
                      onClick={() => setShowAddAssignedSheetModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    >
                      + Add
                    </button>
                    <button
                      onClick={openSheetDistribution}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                    >
                      Sheet Distribution
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      NAME
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      NUMBER
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      FIRM TYPE
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      CITY
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      CLASS
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      BRAND NAME
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      FOLLOUP DATE
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedSheetLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center text-gray-400 py-6"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : assignedSheetRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center text-gray-400 py-6"
                      >
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    assignedSheetRows.map((row) => (
                      <tr
                        key={row._id}
                        onDoubleClick={() => handleEditAssignedSheetRow(row)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.NAME}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.NUMBER}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.FIRM_TYPE}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.CITY}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.CLASS}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.BRAND_NAME}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.FOLLOUP_DATE
                            ? row.FOLLOUP_DATE.split(" ")[0]
                            : ""}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.Notes || ""}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditAssignedSheetRow(row)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                              title="Edit row"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteAssignedSheetRow(row._id)
                              }
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                              title="Delete row"
                            >
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
        )}
        {/* Sheet Distribution Tab */}
        {activeTab === "sheetDistribution" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Sheet Distribution</h2>
            <div className="bg-white p-6 rounded shadow text-gray-700">
              <div className="mb-4">
                <label className="block font-medium mb-2">
                  Paste Excel Data or Upload File
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 mb-2 min-h-[100px]"
                  placeholder="Paste your Excel data here (Ctrl+V)"
                  value={sheetPasteData || ""}
                  onChange={(e) => handleSheetPaste(e.target.value)}
                />
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="mb-2"
                  onChange={handleSheetFileUpload}
                />
                {sheetFileLoading && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <span className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full inline-block"></span>
                    Loading file, please wait...
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-2">
                  Select Employee
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2"
                  value={selectedSheetEmployee || ""}
                  onChange={(e) => setSelectedSheetEmployee(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {sheetDistributionEmployees &&
                    sheetDistributionEmployees.length > 0 &&
                    sheetDistributionEmployees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                {sheetRows && sheetRows.length > 0 ? (
                  <table className="min-w-full border text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        {Object.keys(sheetRows[0]).map((col, idx) => (
                          <th key={idx} className="border px-2 py-1">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSheetRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="border px-2 py-1">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500">
                    No data to display. Paste or upload Excel data above.
                  </p>
                )}
              </div>
              {/* Pagination Controls for Sheet Distribution */}
              {sheetRows && sheetRows.length > 0 && (
                <div className="flex justify-center items-center gap-2 my-4">
                  <button
                    className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                    onClick={() => setSheetDistributionPage(p => Math.max(1, p - 1))}
                    disabled={sheetDistributionPage === 1}
                  >
                    Prev
                  </button>
                  {sheetDistStartPage > 1 && (
                    <button
                      className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setSheetDistributionPage(sheetDistStartPage - 1)}
                    >
                      ...
                    </button>
                  )}
                  {sheetDistVisiblePages.map(page => (
                    <button
                      key={page}
                      className={`px-2 py-1 rounded text-xs ${sheetDistributionPage === page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setSheetDistributionPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  {sheetDistEndPage < totalSheetDistributionPages && (
                    <button
                      className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setSheetDistributionPage(sheetDistEndPage + 1)}
                    >
                      ...
                    </button>
                  )}
                  <button
                    className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                    onClick={() => setSheetDistributionPage(p => Math.min(totalSheetDistributionPages, p + 1))}
                    disabled={sheetDistributionPage === totalSheetDistributionPages}
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                disabled={
                  !sheetRows || sheetRows.length === 0 || !selectedSheetEmployee
                }
                onClick={handleAssignSheet}
              >
                Assign Sheet
              </button>
            </div>
          </div>
        )}
        {/* Sheet Assigned Tab */}
        {activeTab === "sheetAssigned" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Sheet Assigned</h2>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select
                className="border rounded p-2 text-sm"
                value={assignedEmployeeFilter}
                onChange={(e) => setAssignedEmployeeFilter(e.target.value)}
              >
                <option value="">Select Employee</option>
                {sheetDistributionEmployees &&
                  sheetDistributionEmployees.length > 0 &&
                  sheetDistributionEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
              </select>
            </div>
            <div className="bg-white p-6 rounded shadow text-gray-700">
              {assignedSheetLoading ? (
                <div className="py-8 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !assignedEmployeeFilter ? (
                <p className="text-gray-500">
                  Please select an employee to view assigned sheets.
                </p>
              ) : assignedSheetRows.length === 0 ? (
                <p className="text-gray-500">
                  No assigned sheet rows found for this employee.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedSheetRows.length === assignedSheetRows.length &&
                        assignedSheetRows.length > 0
                      }
                      onChange={(e) =>
                        handleSelectAllSheetRows(e.target.checked)
                      }
                    />
                    <span>Select All</span>
                    <button
                      className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs font-medium disabled:opacity-50"
                      disabled={
                        selectedSheetRows.length === 0 ||
                        !assignedEmployeeFilter ||
                        bulkDeleteLoading
                      }
                      onClick={handleDeleteSelectedSheetRows}
                    >
                      {bulkDeleteLoading ? (
                        <span className="flex items-center">
                          <span className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></span>
                          Deleting...
                        </span>
                      ) : (
                        "Delete Selected"
                      )}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-xs mb-4">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-2 py-1">
                            <input
                              type="checkbox"
                              checked={
                                selectedSheetRows.length ===
                                  assignedSheetRows.length &&
                                assignedSheetRows.length > 0
                              }
                              onChange={(e) =>
                                handleSelectAllSheetRows(e.target.checked)
                              }
                            />
                          </th>
                          {Object.keys(assignedSheetRows[0])
                            .filter((key) => key !== "_id")
                            .map((col, idx) => (
                              <th key={idx} className="border px-2 py-1">
                                {col}
                              </th>
                            ))}
                          <th className="border px-2 py-1">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAssignedSheetRows.map((row, idx) => (
                          <tr
                            key={row._id}
                            className="hover:bg-blue-50"
                            onDoubleClick={() =>
                              handleEditAssignedSheetRow(row)
                            }
                          >
                            <td className="border px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectedSheetRows.includes(row._id)}
                                onChange={(e) =>
                                  handleSheetRowCheckboxChange(
                                    row._id,
                                    e.target.checked
                                  )
                                }
                              />
                            </td>
                            {Object.keys(assignedSheetRows[0])
                              .filter((key) => key !== "_id")
                              .map((col, i) => (
                                <td key={i} className="border px-2 py-1">
                                  {row[col]}
                                </td>
                              ))}
                            <td className="border px-2 py-1 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() =>
                                    handleEditAssignedSheetRow(row)
                                  }
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                                  title="Edit row"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteAssignedSheetRow(row._id)
                                  }
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                                  title="Delete row"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination Controls (now below the scroll area) */}
                  </div>
                  <div className="flex justify-center items-center gap-2 my-4">
                    <button
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                      onClick={() =>
                        setAssignedSheetPage((p) => Math.max(1, p - 1))
                      }
                      disabled={assignedSheetPage === 1}
                    >
                      Prev
                    </button>
                    {startPage > 1 && (
                      <button
                        className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setAssignedSheetPage(startPage - 1)}
                      >
                        ...
                      </button>
                    )}
                    {visiblePages.map((page) => (
                      <button
                        key={page}
                        className={`px-2 py-1 rounded text-xs ${
                          assignedSheetPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => setAssignedSheetPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    {endPage < totalAssignedSheetPages && (
                      <button
                        className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setAssignedSheetPage(endPage + 1)}
                      >
                        ...
                      </button>
                    )}
                    <button
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                      onClick={() =>
                        setAssignedSheetPage((p) =>
                          Math.min(totalAssignedSheetPages, p + 1)
                        )
                      }
                      disabled={assignedSheetPage === totalAssignedSheetPages}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Password {!editingEmployee ? "*" : ""}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingEmployee}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editingEmployee && (
                      <p className="text-xxs text-gray-500 mt-0.5">
                        Leave blank to keep current password
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Personal Mobile
                    </label>
                    <input
                      type="text"
                      name="personalMobile"
                      value={formData.personalMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Company Mobile
                    </label>
                    <input
                      type="text"
                      name="companyMobile"
                      value={formData.companyMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Reference Mobile
                    </label>
                    <input
                      type="text"
                      name="referenceMobile"
                      value={formData.referenceMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      name="personalEmail"
                      value={formData.personalEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Company Email
                    </label>
                    <input
                      type="email"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Aadhar Card
                    </label>
                    <input
                      type="text"
                      name="aadharCard"
                      value={formData.aadharCard}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Pan Card
                    </label>
                    <input
                      type="text"
                      name="panCard"
                      value={formData.panCard}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Joined Through
                    </label>
                    <input
                      type="text"
                      name="joinedThrough"
                      value={formData.joinedThrough}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Super Admin: Create Without Access Option */}
                {userRole === "super-admin" && !editingEmployee && (
                  <div className="border-t pt-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="createWithoutAccess"
                        checked={createWithoutAccess}
                        onChange={(e) =>
                          setCreateWithoutAccess(e.target.checked)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="createWithoutAccess"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Create employee without access permissions (Super Admin
                        only)
                      </label>
                    </div>
                    <p className="text-xxs text-gray-500 mt-0.5">
                      This will create the employee with all access permissions
                      set to false. You can update them later.
                    </p>
                  </div>
                )}

                {/* Access Permissions - Only show if not creating without access */}
                {(!createWithoutAccess || editingEmployee) && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        Access Permissions
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">
                                Operation
                              </label>
                              <p className="text-xs text-gray-500">
                                Access to operations
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.operation"
                            checked={formData.access.operation}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                              <svg
                                className="w-5 h-5 text-yellow-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                                />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">
                                Advocate
                              </label>
                              <p className="text-xs text-gray-500">
                                Legal advocate access
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.access.advocate}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                              <svg
                                className="w-5 h-5 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">
                                Lead Add
                              </label>
                              <p className="text-xs text-gray-500">
                                Add new leads
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.leadAdd"
                            checked={formData.access.leadAdd}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <svg
                                className="w-5 h-5 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">
                                Copy
                              </label>
                              <p className="text-xs text-gray-500">
                                Copy data access
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.copy"
                            checked={formData.access.copy}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <svg
                          className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">
                            Access Control
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Select the permissions this employee should have.
                            Each permission grants access to specific features
                            and data.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingEmployee ? "Update Employee" : "Create Employee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lead Distribution Modal */}
      {isDistributionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full relative border border-blue-100">
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-3xl font-bold transition-colors"
              onClick={() => setIsDistributionOpen(false)}
            >
              &times;
            </button>
            <div className="px-8 pt-8 pb-2">
              <h3 className="text-2xl font-bold text-blue-900 mb-2 tracking-tight">
                Lead Distribution
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                Assign available leads to employees. Select multiple leads and
                employees for bulk assignment.
              </p>
              {!hasCopyAccess && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span className="text-yellow-800 text-sm font-medium">
                      Copy access required to select leads for distribution
                    </span>
                  </div>
                </div>
              )}
              {distributionLoading ? (
                <div className="text-center py-12 text-lg text-blue-600 font-semibold">
                  Loading...
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Leads */}
                  <div className="w-full md:w-1/2 bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-blue-800 text-lg">
                          Available Leads
                        </h4>
                        <button
                          onClick={refreshDistributionData}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                          title="Refresh leads"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                      <span className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-0.5">
                        {selectedDistributionLeads.length} selected
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded bg-white p-2">
                      {distributionLeads.length > 0 && (
                        <label
                          className={`flex items-center gap-2 mb-2 font-medium text-blue-700 ${
                            hasCopyAccess
                              ? "cursor-pointer"
                              : "cursor-not-allowed opacity-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectedDistributionLeads.length ===
                              distributionLeads.length
                            }
                            indeterminate={
                              selectedDistributionLeads.length > 0 &&
                              selectedDistributionLeads.length <
                                distributionLeads.length
                                ? "true"
                                : undefined
                            }
                            disabled={!hasCopyAccess}
                            onChange={(e) => {
                              if (!hasCopyAccess) return;
                              if (e.target.checked) {
                                setSelectedDistributionLeads(
                                  distributionLeads.map((lead) => lead.id)
                                );
                              } else {
                                setSelectedDistributionLeads([]);
                              }
                            }}
                          />
                          <span>
                            {hasCopyAccess
                              ? "Select All"
                              : "Select All (No Copy Access)"}
                          </span>
                        </label>
                      )}
                      {distributionLeads.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8">
                          <div className="mb-2">No available leads</div>
                          <div className="text-xs text-gray-500">
                            Create leads in the "Add New Lead" section above
                          </div>
                        </div>
                      ) : (
                        distributionLeads.map((lead) => (
                          <label
                            key={lead.id}
                            className={`flex items-center gap-2 mb-1 rounded px-2 py-1 transition ${
                              selectedDistributionLeads.includes(lead.id)
                                ? "bg-blue-100"
                                : hasCopyAccess
                                ? "hover:bg-blue-50 cursor-pointer"
                                : "cursor-not-allowed opacity-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDistributionLeads.includes(
                                lead.id
                              )}
                              disabled={!hasCopyAccess}
                              onChange={(e) => {
                                if (!hasCopyAccess) return;
                                setSelectedDistributionLeads((sel) =>
                                  e.target.checked
                                    ? [...sel, lead.id]
                                    : sel.filter((id) => id !== lead.id)
                                );
                              }}
                            />
                            <span className="text-sm text-gray-800">
                              {lead.phoneNumber}{" "}
                              {lead.brandName && (
                                <span className="text-gray-500">
                                  ({lead.brandName})
                                </span>
                              )}
                              {!hasCopyAccess && (
                                <span className="text-red-500 text-xs ml-1">
                                  (No Copy Access)
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() =>
                                hasCopyAccess &&
                                navigator.clipboard.writeText(lead.id)
                              }
                              disabled={!hasCopyAccess}
                              className={`ml-2 px-2 py-1 rounded text-xs ${
                                !hasCopyAccess
                                  ? "opacity-50 cursor-not-allowed"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              }`}
                              title={
                                hasCopyAccess ? "Copy ID" : "No Copy Access"
                              }
                            >
                              Copy
                            </button>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  {/* Employees */}
                  <div className="w-full md:w-1/2 bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800 text-lg">
                        Select Employees
                      </h4>
                      <span className="text-xs text-green-700 bg-green-100 rounded px-2 py-0.5">
                        {selectedDistributionEmployees.length} selected
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded bg-white p-2">
                      {distributionEmployees.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8">
                          No employees found
                        </div>
                      ) : (
                        distributionEmployees.map((emp) => (
                          <label
                            key={emp._id}
                            className={`flex items-center gap-2 mb-1 cursor-pointer rounded px-2 py-1 transition ${
                              selectedDistributionEmployees.includes(emp._id)
                                ? "bg-green-100"
                                : "hover:bg-green-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="distribution-employee"
                              checked={selectedDistributionEmployees.includes(
                                emp._id
                              )}
                              onChange={(e) =>
                                setSelectedDistributionEmployees(
                                  e.target.checked ? [emp._id] : []
                                )
                              }
                            />
                            <span className="text-sm text-gray-800">
                              {emp.name}{" "}
                              <span className="text-gray-500">
                                (ID: {emp.employeeId || emp.email})
                              </span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-end gap-3 border-t pt-4">
                <button
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                  onClick={() => setIsDistributionOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={
                    distributionLoading ||
                    !selectedDistributionLeads.length ||
                    !selectedDistributionEmployees.length ||
                    !hasCopyAccess
                  }
                  onClick={handleDistributeLeads}
                >
                  {!hasCopyAccess
                    ? "Distribute (No Copy Access)"
                    : "Distribute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Employee Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Block Employee
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to block{" "}
                <span className="font-semibold">{selectedEmployee?.name}</span>?
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for blocking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter the reason for blocking this employee..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockEmployee}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Block Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Employee Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Unblock Employee
              </h3>
              <button
                onClick={() => setShowUnblockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to unblock{" "}
                <span className="font-semibold">{selectedEmployee?.name}</span>?
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for unblocking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                placeholder="Enter the reason for unblocking this employee..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnblockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUnblockEmployee}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Unblock Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {showAccessControlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Access Control
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage permissions for {selectedEmployee?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAccessControlModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Operation
                        </label>
                        <p className="text-xs text-gray-500">
                          Access to operations
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.operation}
                      onChange={(e) =>
                        handleAccessControlChange("operation", e.target.checked)
                      }
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Lead Add
                        </label>
                        <p className="text-xs text-gray-500">Add new leads</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.leadAdd}
                      onChange={(e) =>
                        handleAccessControlChange("leadAdd", e.target.checked)
                      }
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-indigo-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Copy
                        </label>
                        <p className="text-xs text-gray-500">
                          Copy data access
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.copy}
                      onChange={(e) =>
                        handleAccessControlChange("copy", e.target.checked)
                      }
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAccessControlModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAccessControlUpdate}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                Update Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600">
                    Set a new password for {selectedEmployee?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetPasswordLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Resetting...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Leave Modal */}
      {showRejectLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Reject Leave Application
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={rejectLeaveNotes}
              onChange={(e) => setRejectLeaveNotes(e.target.value)}
              rows={3}
              placeholder="Enter reason for rejection"
              required
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRejectLeaveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectLeaveNotes.trim()) return;
                  handleApproval(
                    "leave",
                    rejectLeaveId,
                    "reject",
                    rejectLeaveNotes
                  );
                  setShowRejectLeaveModal(false);
                }}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={!rejectLeaveNotes.trim()}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Leads Modal */}
      {existingLeadsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Existing Leads for {existingLeadsModal.phoneNumber}
              </h2>
              <button
                onClick={() =>
                  setExistingLeadsModal({
                    isOpen: false,
                    phoneNumber: "",
                    leads: [],
                  })
                }
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="border px-4 py-2 text-left">Brand Name</th>
                      <th className="border px-4 py-2 text-left">Notes</th>
                      <th className="border px-4 py-2 text-left">
                        Assigned To
                      </th>
                      <th className="border px-4 py-2 text-left">
                        Assigned By
                      </th>
                      <th className="border px-4 py-2 text-left">Created</th>
                      <th className="border px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingLeadsModal.leads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border px-4 py-2">
                          {lead.brandName || "N/A"}
                        </td>
                        <td className="border px-4 py-2">
                          {lead.notes || "N/A"}
                        </td>
                        <td className="border px-4 py-2">
                          {lead.assignedTo ? (
                            <span className="text-green-600 font-medium">
                              {lead.assignedTo.name} (
                              {lead.assignedTo.employeeId})
                            </span>
                          ) : (
                            <span className="text-orange-500 font-medium">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="border px-4 py-2">
                          {lead.assignedBy ? (
                            <span>
                              {lead.assignedBy.name} ({lead.assignedBy.role})
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="border px-4 py-2">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              lead.assignedTo
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {lead.assignedTo ? "Assigned" : "Unassigned"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() =>
                  setExistingLeadsModal({
                    isOpen: false,
                    phoneNumber: "",
                    leads: [],
                  })
                }
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Assigned Sheet Row Modal */}

      {/* Edit Assigned Sheet Row Modal */}

      {/* Sheet Distribution Modal */}

      {isEditSheetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <h3 className="text-lg font-bold mb-4">Edit Assigned Sheet Row</h3>
            {editSheetRow && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleSaveAssignedSheetRow(editSheetRow);
                }}
              >
                {Object.keys(editSheetRow).map((key) => (
                  <div key={key} className="mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      {key}
                    </label>
                    <input
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      value={editSheetRow[key]}
                      onChange={(e) =>
                        setEditSheetRow({
                          ...editSheetRow,
                          [key]: e.target.value,
                        })
                      }
                      disabled={
                        key === "_id" ||
                        key === "assignedAt" ||
                        key === "NUMBER"
                      }
                    />
                  </div>
                ))}
                {/* Always show Notes field if not present */}
                {!("Notes" in editSheetRow) && (
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Notes
                    </label>
                    <input
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      value={editSheetRow["Notes"] || ""}
                      onChange={(e) =>
                        setEditSheetRow({
                          ...editSheetRow,
                          Notes: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => setIsEditSheetModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Employee;
