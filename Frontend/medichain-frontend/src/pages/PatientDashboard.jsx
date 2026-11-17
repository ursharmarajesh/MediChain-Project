
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import ReportDownloadButton from "../components/ReportDownloadButton";
import "./PatientDashboard.css";

const menuItems = [
  { id: "overview", icon: "⌂", label: "Dashboard" },
  { id: "profile", icon: "♙", label: "My Profile" },
  { id: "reports", icon: "▤", label: "Reports & Prescriptions" },
  { id: "history", icon: "♡", label: "Medical History" },
];

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await API.get("/patients/dashboard");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Dashboard loading failed"
        );
      }

      setDashboard(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your medical information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const patient = dashboard?.patient || user || {};
  const reports = dashboard?.reports || [];
  const history = dashboard?.medicalHistory || [];

  const formatDate = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const handleLogout = () => {
    logout();
    navigate("/patient-login", { replace: true });
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setMobileMenu(false);
  };

  const renderProfile = () => (
    <section className="pd-card">
      <div className="pd-section-heading">
        <div>
          <h2>Personal Information</h2>
          <p>Your registered patient information</p>
        </div>
      </div>

      <div className="pd-info-grid">
        {[
          ["Full Name", patient.name],
          ["Patient ID", patient.uniqueId],
          ["Mobile Number", patient.mobileNumber],
          ["Email Address", patient.email],
          ["Age", patient.age],
          ["Gender", patient.gender],
          ["Date of Birth", formatDate(patient.dateOfBirth)],
          ["Blood Group", patient.bloodGroup],
          ["Emergency Contact", patient.emergencyContact],
          ["Address", patient.address],
          ["Registration Date", formatDate(patient.createdAt)],
        ].map(([label, value]) => (
          <div className="pd-info-item" key={label}>
            <span>{label}</span>
            <strong>
              {value !== null && value !== undefined && value !== ""
                ? value
                : "Not available"}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );

  const renderReports = () => (
    <section className="pd-card">
      <div className="pd-section-heading">
        <div>
          <h2>Reports & Prescriptions</h2>
          <p>Medical documents uploaded by your doctor</p>
        </div>
        <span className="pd-count">{reports.length} Documents</span>
      </div>

      {reports.length === 0 ? (
        <div className="pd-empty">
          <span>▤</span>
          <h3>No reports available</h3>
          <p>
            Your uploaded medical reports and prescriptions
            will appear here.
          </p>
        </div>
      ) : (
        <div className="pd-report-list">
          {reports.map((report) => (
            <article className="pd-report" key={report._id}>
              <div className="pd-report-icon">▤</div>

              <div className="pd-report-details">
                <h3>{report.reportTitle || "Medical Document"}</h3>
                <span>{report.reportType || "OTHER"}</span>
                <p>Date: {formatDate(report.reportDate)}</p>
                {report.description && <p>{report.description}</p>}
                <small>{report.fileName || "Document"}</small>
              </div>

              <ReportDownloadButton report={report} />
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderHistory = () => (
    <section className="pd-card">
      <div className="pd-section-heading">
        <div>
          <h2>Medical History</h2>
          <p>Your diagnosis, treatment and prescribed medicines</p>
        </div>
        <span className="pd-count">{history.length} Records</span>
      </div>

      {history.length === 0 ? (
        <div className="pd-empty">
          <span>♡</span>
          <h3>No medical history available</h3>
          <p>Records added by your doctor will appear here.</p>
        </div>
      ) : (
        <div className="pd-history-list">
          {history.map((record) => (
            <article className="pd-history" key={record._id}>
              <div className="pd-history-top">
                <h3>{record.diagnosis}</h3>
                <span>{formatDate(record.recordDate)}</span>
              </div>

              <div className="pd-history-grid">
                <div>
                  <span>Doctor</span>
                  <strong>{record.doctorName || "Not available"}</strong>
                </div>
                <div>
                  <span>Symptoms</span>
                  <strong>
                    {Array.isArray(record.symptoms)
                      ? record.symptoms.join(", ") || "Not available"
                      : "Not available"}
                  </strong>
                </div>
                <div>
                  <span>Treatment</span>
                  <strong>{record.treatment || "Not available"}</strong>
                </div>
                <div>
                  <span>Medicines</span>
                  <strong>
                    {Array.isArray(record.medicines)
                      ? record.medicines.join(", ") || "Not available"
                      : "Not available"}
                  </strong>
                </div>
              </div>

              {record.notes && (
                <div className="pd-notes">
                  <span>Doctor's Notes</span>
                  <p>{record.notes}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="pd-layout">
      <aside className={`pd-sidebar ${mobileMenu ? "pd-sidebar-open" : ""}`}>
        <div className="pd-brand">
          <div className="pd-logo">M</div>
          <div>
            <h2>MediChain</h2>
            <span>PATIENT PORTAL</span>
          </div>
        </div>

        <p className="pd-menu-title">MY WORKSPACE</p>

        <nav className="pd-navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={activeTab === item.id ? "active" : ""}
              onClick={() => selectTab(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pd-sidebar-bottom">
          <div className="pd-user">
            <div className="pd-avatar">
              {(patient.name || "P").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{patient.name || "Patient"}</strong>
              <span>Patient Account</span>
            </div>
          </div>

          <button className="pd-logout" onClick={handleLogout}>
            ↪ Sign Out
          </button>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="pd-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close menu"
        />
      )}

      <main className="pd-main">
        <header className="pd-topbar">
          <div className="pd-topbar-left">
            <button
              className="pd-mobile-toggle"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              ☰
            </button>
            <div>
              <span>MEDICHAIN / PATIENT PORTAL</span>
              <h1>
                {menuItems.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          <button
            className="pd-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            ↻ {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <div className="pd-content">
          {error && (
            <div className="pd-error">
              <strong>Unable to load dashboard</strong>
              <p>{error}</p>
              <button onClick={loadDashboard}>Try Again</button>
            </div>
          )}

          {loading && !dashboard ? (
            <div className="pd-loading">Loading your medical records...</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <>
                  <section className="pd-welcome">
                    <div>
                      <span>YOUR HEALTH, YOUR RECORDS</span>
                      <h2>
                        Welcome back, {patient.name || "Patient"}!
                      </h2>
                      <p>
                        Your personal health information and medical
                        documents, all in one secure place.
                      </p>
                    </div>
                    <div className="pd-welcome-symbol">✚</div>
                  </section>

                  <section className="pd-stats">
                    <div className="pd-stat">
                      <span>Patient ID</span>
                      <strong>{patient.uniqueId || "—"}</strong>
                      <small>Your unique identification</small>
                    </div>
                    <div className="pd-stat">
                      <span>Medical Reports</span>
                      <strong>{reports.length}</strong>
                      <small>Reports and prescriptions</small>
                    </div>
                    <div className="pd-stat">
                      <span>Medical Records</span>
                      <strong>{history.length}</strong>
                      <small>Diagnosis and treatment records</small>
                    </div>
                  </section>

                  {renderProfile()}

                  <section className="pd-card">
                    <div className="pd-section-heading">
                      <div>
                        <h2>Recent Medical Documents</h2>
                        <p>Your latest uploaded reports</p>
                      </div>
                      <button
                        className="pd-text-button"
                        onClick={() => selectTab("reports")}
                      >
                        View All →
                      </button>
                    </div>

                    {reports.length === 0 ? (
                      <div className="pd-empty">
                        No medical documents uploaded yet.
                      </div>
                    ) : (
                      <div className="pd-report-list">
                        {reports.slice(0, 3).map((report) => (
                          <article className="pd-report" key={report._id}>
                            <div className="pd-report-icon">▤</div>
                            <div className="pd-report-details">
                              <h3>{report.reportTitle}</h3>
                              <span>{report.reportType || "OTHER"}</span>
                              <p>{formatDate(report.reportDate)}</p>
                            </div>
                            <ReportDownloadButton report={report} />
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeTab === "profile" && renderProfile()}
              {activeTab === "reports" && renderReports()}
              {activeTab === "history" && renderHistory()}
            </>
          )}

          <footer className="pd-footer">
            © 2026 MediChain Healthcare Management System
          </footer>
        </div>
      </main>
    </div>
  );
}
