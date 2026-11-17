import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

export default function AdminProfileForm() {
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: "sharmarajesh2109@gmail.com",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await API.get("/admin/profile");

        if (!mounted) return;

        setForm({
          name: response.data.admin?.name || user?.name || "",
          // The requested email is prefilled for the admin to save.
          email: "sharmarajesh2109@gmail.com",
        });
      } catch (err) {
        if (!mounted) return;

        setError(
          err.response?.data?.message ||
          "Admin profile load nahi ho saka."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.name]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      setError("Name aur email dono bharna zaroori hai.");
      return;
    }

    setSaving(true);

    try {
      const response = await API.put("/admin/profile", {
        name,
        email,
      });

      const updatedAdmin = response.data.admin;
      const token = localStorage.getItem("medichain_token");

      // Update AuthContext and localStorage without logging out.
      login(
        {
          ...user,
          ...updatedAdmin,
        },
        token
      );

      setForm({
        name: updatedAdmin.name,
        email: updatedAdmin.email,
      });

      setSuccess(
        response.data.message || "Profile successfully updated."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Profile update nahi ho saka. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    marginTop: "7px",
    border: "1px solid #d9e2ec",
    borderRadius: "8px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
  };

  return (
    <div className="admin-panel" style={{ minWidth: 0 }}>
      <h3 style={{ marginTop: 0 }}>Edit Admin Profile</h3>

      <p style={{ color: "#64748b", fontSize: "14px" }}>
        Apna admin name aur email address update karein.
      </p>

      {error && (
        <div
          className="admin-alert error"
          role="alert"
          style={{ marginBottom: "15px" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="admin-alert success"
          role="status"
          style={{ marginBottom: "15px" }}
        >
          {success}
        </div>
      )}

      {loading ? (
        <p>Loading admin profile...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Admin Name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter admin name"
              autoComplete="name"
              required
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Admin Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter admin email"
              autoComplete="email"
              required
              style={fieldStyle}
            />
          </label>

          <button
            type="submit"
            className="admin-primary-btn"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      <small
        style={{
          display: "block",
          marginTop: "15px",
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Profile update ke liye OTP ya email verification link nahi bheja
        jayega. Update logged-in admin session se hoga.
      </small>
    </div>
  );
}