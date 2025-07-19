import React, { useEffect, useState } from "react";
import Header from "../components/Header";

const YourSheet = ({ sidebarCollapsed }) => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));
  // Make sure to use the correct employeeId (EMP... format)
  const employeeId = user?.employeeId;

  useEffect(() => {
    if (!employeeId) return;
    fetch(`/api/leads/sheet-assigned?employeeId=${employeeId}`, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSheets(data.assignedSheets || []);
        setLoading(false);
      });
  }, [employeeId]);

  // Sidebar width: 176px (open), 48px (collapsed)
  const sidebarWidth = sidebarCollapsed ? 48 : 176;

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("en-GB");
  };
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleString("en-GB");
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Get all unique headers from the first row's data
  const allHeaders = React.useMemo(() => {
    if (!sheets.length) return [];
    const keys = new Set();
    sheets.forEach((row) => {
      Object.keys(row.data || {}).forEach((k) => keys.add(k));
    });
    // Always include assignedAt
    keys.add("assignedAt");
    return Array.from(keys);
  }, [sheets]);

  // Paginated data
  const paginatedSheets = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sheets.slice(start, start + rowsPerPage);
  }, [sheets, currentPage]);

  const totalPages = Math.ceil(sheets.length / rowsPerPage);

  const [editRow, setEditRow] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit handler
  const handleRowDoubleClick = (row) => {
    setEditRow({ ...row.data, assignedAt: row.assignedAt, _id: row._id });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (key, value) => {
    setEditRow((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/leads/sheet-assigned/${editRow._id}?employeeId=${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editRow),
      });
      // Update local state
      setSheets((prev) =>
        prev.map((row) =>
          row._id === editRow._id ? { ...row, data: { ...editRow } } : row
        )
      );
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Failed to update row");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div
        className="pt-20 px-4 md:px-8 max-w-6xl mx-auto transition-all duration-300"
        style={{ marginLeft: sidebarWidth, transition: "margin-left 0.3s" }}
      >
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-black">
              Your Assigned Sheets
            </h1>
          </div>
          {loading ? (
            <div className="text-center text-blue-500 text-lg py-8">
              Loading...
            </div>
          ) : sheets.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-8">
              No sheets assigned to you yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-100">
                  <tr>
                    {allHeaders.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedSheets.map((row, idx) => {
                    const d = row.data || {};
                    return (
                      <tr
                        key={row._id}
                        className={idx % 2 === 0 ? "bg-blue-50" : ""}
                        onDoubleClick={() => handleRowDoubleClick(row)}
                        style={{ cursor: "pointer" }}
                      >
                        {allHeaders.map((header) => (
                          <td
                            key={header}
                            className="px-4 py-2 text-sm text-black"
                          >
                            {header === "assignedAt"
                              ? formatDateTime(row.assignedAt)
                              : d[header] ||
                                d[header.toUpperCase()] ||
                                d[header.toLowerCase()] ||
                                "-"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination Controls */}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <h3 className="text-lg font-bold mb-4">Edit Assigned Sheet Row</h3>
            {editRow && (
              <form onSubmit={handleEditSave}>
                {Object.keys(editRow).map((key) => (
                  key === "_id" || key === "assignedAt" || key === "NUMBER" ? null : (
                    <div key={key} className="mb-2">
                      <label className="block text-xs font-medium text-gray-700">{key}</label>
                      <input
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                        value={editRow[key] || ""}
                        onChange={(e) => handleEditChange(key, e.target.value)}
                      />
                    </div>
                  )
                ))}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
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

export default YourSheet;
