import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate required fields
    if (!email || !password || !role) {
      setError("All fields are required including role selection");
      return;
    }
    
    try {
      let res;
      
      // Use different endpoints based on role
      if (role === 'employee') {
        res = await axios.post("tc-crm.vercel.app/api/auth/employee-login", {
          email,
          password,
        });
      } else if (role === 'operation') {
        res = await axios.post("tc-crm.vercel.app/api/auth/operation-login", {
          email,
          password,
        });
      } else {
        res = await axios.post("tc-crm.vercel.app/api/auth/login", {
          email,
          password,
          role,
        });
      }
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("userType", res.data.userType || 'user');
      // Advocate online status update
      if (role === 'advocate' || (res.data.user && res.data.user.role === 'advocate')) {
        try {
          await axios.patch(
            `tc-crm.vercel.app/api/advocates/${res.data.user._id}/status`,
            { isActive: true },
            { headers: { Authorization: `Bearer ${res.data.token}` } }
          );
        } catch (e) { /* ignore */ }
      }
      console.log('Login.jsx user saved:', res.data.user);
      setError("");
      if (onLogin) onLogin();
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-80"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">User Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="super-admin">Super Admin</option>
          <option value="employee">Employee</option>
          <option value="operation">Operation</option>
          <option value="advocate">Advocate</option>
        </select>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
