
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./AdminDashboard.css";

const specializations = [
  "General Physician", "Cardiologist", "Orthopedic",
  "Neurologist", "Neurosurgeon", "Gynecologist",
  "Obstetrician", "Pediatrician", "Dermatologist",
  "Ophthalmologist", "ENT Specialist", "Psychiatrist",
  "Psychologist", "Gastroenterologist", "Urologist",
  "Nephrologist", "Oncologist", "Pulmonologist",
  "Endocrinologist", "Dentist", "Radiologist",
  "Pathologist", "General Surgeon", "Physiotherapist", "Other"
];

const emptyDoctor = {
  name: "",
  email: "",
  mobileNumber: "",
  password: "",
  specialization: "",
};

const menuItems = [
  { name: "Overview", icon: "▦" },
  { name: "Doctors", icon: "⚕" },
  { name: "Settings", icon: "⚙" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const [activeMenu, setActiveMenu] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyDoctor);

  // Admin profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  // Load the saved admin profile from the backend.
  useEffect(() => {
    let active = true;
    API.get("/admin/profile")
      .then(({ data }) => {
        if (!active) return;
        setProfileForm({
          name: data.admin?.name || user?.name || "",
          email: data.admin?.email || user?.email || "",
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err.response?.data?.message ||
          "Admin profile could not be loaded."
        );
      });
    return () => {
      active = false;
    };
  }, [user?.name, user?.email]);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("/admin/doctors");
      setDoctors(response.data.doctors || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Doctors load nahi ho sake. Login aur backend check karein."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const openCreateForm = () => {
    clearMessages();
    setEditingId(null);
    setForm(emptyDoctor);
    setShowForm(true);
  };

  const openEditForm = (doctor) => {
    clearMessages();
    setEditingId(doctor._id);

    setForm({
      name: doctor.name || "",
      email: doctor.email || "",
      mobileNumber: doctor.mobileNumber || "",
      password: "",
      specialization: doctor.specialization || "",
    });

    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Update admin name and email
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const name = profileForm.name.trim();
    const email = profileForm.email.trim().toLowerCase();

    if (!name) {
      setError("Admin name is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSavingProfile(true);

    try {
      const response = await API.put("/admin/profile", {
        name,
        email,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Profile update failed."
        );
      }

      const updatedAdmin =
        response.data.admin ||
        response.data.user ||
        { name, email };

      setProfileForm({
        name: updatedAdmin.name || name,
        email: updatedAdmin.email || email,
      });

      // Update AuthContext user if its setter is available.
      // This keeps the dashboard header synchronized.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("admin-profile-updated", {
            detail: updatedAdmin,
          })
        );
      }

      setSuccess(
        response.data.message ||
        "Admin profile updated successfully."
      );

      setEditingProfile(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Admin profile update nahi ho saka."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!/^[0-9]{10}$/.test(form.mobileNumber)) {
      setError("Mobile number exactly 10 digits ka hona chahiye.");
      return;
    }

    if (!form.specialization) {
      setError("Doctor specialization select karein.");
      return;
    }

    if (!editingId && form.password.length < 8) {
      setError("Password minimum 8 characters ka hona chahiye.");
      return;
    }

    if (editingId && form.password && form.password.length < 8) {
      setError("New password minimum 8 characters ka hona chahiye.");
      return;
    }

    setSaving(true);

    try {
      const payload = { ...form };

      if (!payload.password) {
        delete payload.password;
      }

      if (editingId) {
        await API.put(`/admin/doctors/${editingId}`, payload);
        setSuccess("Doctor details successfully updated.");
      } else {
        await API.post("/admin/doctors", payload);
        setSuccess("New doctor account successfully created.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyDoctor);

      await loadDoctors();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Doctor details save nahi ho sake."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (doctor) => {
    clearMessages();

    const nextStatus = !doctor.isActive;

    if (
      !window.confirm(
        `${doctor.name} ka account ${
          nextStatus ? "activate" : "deactivate"
        } karna hai?`
      )
    ) return;

    try {
      await API.patch(`/admin/doctors/${doctor._id}/status`, {
        isActive: nextStatus,
      });

      setSuccess("Doctor account status updated.");
      await loadDoctors();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Doctor status update nahi hua."
      );
    }
  };

  const handleDelete = async (doctor) => {
    clearMessages();

    if (
      !window.confirm(
        `Kya aap ${doctor.name} ka account permanently delete karna chahte hain?`
      )
    ) return;

    try {
      await API.delete(`/admin/doctors/${doctor._id}`);

      setSuccess("Doctor account deleted successfully.");
      await loadDoctors();
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.message || "Doctor delete nahi ho saka."
      );

      if (data?.patientCount || data?.teamCount) {
        setError(
          `${data.message} Linked patients: ${
            data.patientCount || 0
          }, team members: ${data.teamCount || 0}.`
        );
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    clearMessages();

    if (passwordForm.newPassword.length < 8) {
      setError("New password minimum 8 characters ka hona chahiye.");
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setError("New password aur confirm password match nahi karte.");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await API.patch(
        "/admin/change-password",
        passwordForm
      );

      setSuccess(response.data.message);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Password change nahi ho saka."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const activeDoctors = doctors.filter(
    (d) => d.isActive
  ).length;

  const inactiveDoctors = doctors.length - activeDoctors;

  const navigate = (name) => {
    setActiveMenu(name);
    setSidebarOpen(false);
    clearMessages();
    setShowForm(false);
  };

  const adminName = profileForm.name || user?.name || "Admin";
  const adminEmail = profileForm.email || user?.email || "";

  return (
    <div className="admin-layout">

      {sidebarOpen && (
        <div
          className="admin-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="admin-brand">
          <div className="admin-brand-icon">M</div>

          <div>
            <h2>MediChain</h2>
            <span>HEALTHCARE ADMIN</span>
          </div>
        </div>

        <p className="admin-menu-label">WORKSPACE</p>

        <nav className="admin-navigation">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`admin-nav-item ${
                activeMenu === item.name ? "active" : ""
              }`}
              onClick={() => navigate(item.name)}
            >
              <span className="admin-nav-icon">
                {item.icon}
              </span>

              {item.name}

              {activeMenu === item.name && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user">
            <div className="admin-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{adminName}</strong>
              <span>System Admin</span>
            </div>
          </div>

          <button className="admin-logout" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">

        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>

            <div>
              <h1>{activeMenu}</h1>
              <p>Home / Admin / {activeMenu}</p>
            </div>
          </div>

          <div className="admin-topbar-profile">
            <div className="admin-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{adminName}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <section className="admin-content">

          {error && (
            <div className="admin-alert error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="admin-alert success" role="status">
              {success}
            </div>
          )}

          {activeMenu === "Overview" && (
            <>
              <div className="admin-welcome-card">
                <div>
                  <span className="welcome-eyebrow">
                    ADMINISTRATOR WORKSPACE
                  </span>

                  <h2>
                    Welcome back, {adminName}!
                  </h2>

                  <p>
                    Manage your doctors and healthcare administration
                    from one place.
                  </p>

                  <button
                    className="admin-primary-btn"
                    onClick={() => navigate("Doctors")}
                  >
                    Manage Doctors →
                  </button>
                </div>

                <div className="welcome-symbol">✚</div>
              </div>

              <div className="admin-stat-grid">
                <div className="admin-stat-card">
                  <span className="stat-symbol teal">⚕</span>
                  <p>Total Doctors</p>
                  <h2>{doctors.length}</h2>
                  <small>Registered accounts</small>
                </div>

                <div className="admin-stat-card">
                  <span className="stat-symbol green">✓</span>
                  <p>Active Doctors</p>
                  <h2>{activeDoctors}</h2>
                  <small>Active accounts</small>
                </div>

                <div className="admin-stat-card">
                  <span className="stat-symbol orange">⊘</span>
                  <p>Inactive Doctors</p>
                  <h2>{inactiveDoctors}</h2>
                  <small>Inactive accounts</small>
                </div>

                <div className="admin-stat-card">
                  <span className="stat-symbol purple">⚙</span>
                  <p>Administrator</p>
                  <h2>ADMIN</h2>
                  <small>Account role</small>
                </div>
              </div>

              <div className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Quick Actions</h3>
                    <p>
                      Frequently used administration tools
                    </p>
                  </div>
                </div>

                <div className="admin-quick-actions">
                  <button onClick={() => navigate("Doctors")}>
                    <span>⚕</span>
                    <strong>Doctor Management</strong>
                    <small>
                      Create, edit and manage doctors
                    </small>
                  </button>

                  <button onClick={() => navigate("Settings")}>
                    <span>⚙</span>
                    <strong>Account Settings</strong>
                    <small>
                      Edit profile and change password
                    </small>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeMenu === "Doctors" && (
            <div className="admin-panel">

              <div className="admin-panel-heading doctor-heading">
                <div>
                  <h3>Doctor Management</h3>
                  <p>
                    Manage all registered doctor accounts.
                  </p>
                </div>

                <div className="admin-heading-actions">
                  <button
                    className="admin-secondary-btn"
                    onClick={loadDoctors}
                    disabled={loading}
                  >
                    ↻ Refresh
                  </button>

                  <button
                    className="admin-primary-btn"
                    onClick={openCreateForm}
                  >
                    + Add Doctor
                  </button>
                </div>
              </div>

              {showForm && (
                <form
                  className="admin-doctor-form"
                  onSubmit={handleDoctorSubmit}
                >
                  <h3>
                    {editingId
                      ? "Edit Doctor Account"
                      : "Create New Doctor"}
                  </h3>

                  <div className="admin-form-grid">
                    <label>
                      Doctor Name
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        required
                      />
                    </label>

                    <label>
                      Email Address
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="doctor@example.com"
                        required
                      />
                    </label>

                    <label>
                      Mobile Number
                      <input
                        name="mobileNumber"
                        value={form.mobileNumber}
                        onChange={handleChange}
                        maxLength={10}
                        inputMode="numeric"
                        placeholder="10 digit number"
                        required
                      />
                    </label>

                    <label>
                      Specialization
                      <select
                        name="specialization"
                        value={form.specialization}
                        onChange={handleChange}
                        required
                      >
                        <option value="">
                          Select specialization
                        </option>

                        {specializations.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-full">
                      {editingId
                        ? "New Password (optional)"
                        : "Temporary Password"}

                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        required={!editingId}
                      />
                    </label>
                  </div>

                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setForm(emptyDoctor);
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="admin-primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                          ? "Save Changes"
                          : "Create Doctor"}
                    </button>
                  </div>
                </form>
              )}

              <div className="admin-table-title">
                <h3>Registered Doctors</h3>
                <span>{doctors.length} Total</span>
              </div>

              {loading ? (
                <div className="admin-empty">
                  Loading doctors...
                </div>
              ) : doctors.length === 0 ? (
                <div className="admin-empty">
                  No doctors registered yet. Click Add Doctor to create one.
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Specialization</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor._id}>
                          <td>
                            <strong>{doctor.name}</strong>
                            <small>Doctor</small>
                          </td>

                          <td>{doctor.email}</td>
                          <td>{doctor.mobileNumber}</td>

                          <td>
                            {doctor.specialization || "Not specified"}
                          </td>

                          <td>
                            <span
                              className={`admin-status ${
                                doctor.isActive ? "active" : "inactive"
                              }`}
                            >
                              {doctor.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="edit-action"
                                onClick={() => openEditForm(doctor)}
                              >
                                Edit
                              </button>

                              <button
                                className="status-action"
                                onClick={() => handleStatus(doctor)}
                              >
                                {doctor.isActive ? "Disable" : "Enable"}
                              </button>

                              <button
                                className="delete-action"
                                onClick={() => handleDelete(doctor)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeMenu === "Settings" && (
            <div className="admin-settings-grid">

              {/* ADMIN PROFILE SETTINGS */}
              <div className="admin-panel settings-info">
                <span className="settings-icon">👤</span>

                <h3>Admin Profile Settings</h3>

                <p>
                  Update your administrator name and email address.
                  No OTP verification is requested by this form.
                </p>

                {!editingProfile ? (
                  <>
                    <div className="settings-detail">
                      <span>Name</span>
                      <strong>{adminName}</strong>
                    </div>

                    <div className="settings-detail">
                      <span>Email</span>
                      <strong>{adminEmail || "Not available"}</strong>
                    </div>

                    <div className="settings-detail">
                      <span>Role</span>
                      <strong>ADMIN</strong>
                    </div>

                    <button
                      type="button"
                      className="admin-primary-btn"
                      onClick={() => {
                        clearMessages();
                        setProfileForm({
                          name: adminName,
                          email: adminEmail ||
                            "",
                        });
                        setEditingProfile(true);
                      }}
                    >
                      ✎ Edit Profile
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleProfileSubmit}>
                    <label>
                      Admin Name
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter admin name"
                        required
                      />
                    </label>

                    <label>
                      Admin Email
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            email: e.target.value,
                          })
                        }
                        placeholder=""
                        required
                      />
                    </label>

                    <div className="admin-form-actions">
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            name: adminName,
                            email: adminEmail,
                          });
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="admin-primary-btn"
                        disabled={savingProfile}
                      >
                        {savingProfile
                          ? "Updating..."
                          : "Save Profile"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* PASSWORD SETTINGS */}
              <div className="admin-panel password-panel">
                <h3>Change Password</h3>

                <p>
                  Enter your current password and choose a new password.
                </p>

                <form onSubmit={handlePasswordChange}>
                  <label>
                    Current Password
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    New Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="admin-primary-btn"
                    disabled={changingPassword}
                  >
                    {changingPassword
                      ? "Updating..."
                      : "Update Password"}
                  </button>
                </form>

                <small className="password-note">
                  Password change ke liye OTP ya email link ki zaroorat
                  nahi hai. Current password verify hoga.
                </small>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}
