
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./DoctorDashboard.css";

const EMPTY_PATIENT = {
  name: "", mobileNumber: "", email: "", age: "", gender: "",
  dateOfBirth: "", bloodGroup: "", address: "", emergencyContact: "",
};

const EMPTY_REPORT = {
  patientId: "", reportTitle: "", reportType: "OTHER",
  description: "", report: null,
};

const EMPTY_HISTORY = {
  patientId: "", diagnosis: "", symptoms: "", treatment: "",
  medicines: "", notes: "",
  recordDate: new Date().toISOString().slice(0, 10),
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "patients", label: "My Patients", icon: "♙" },
  { id: "reports", label: "Medical Reports", icon: "▤" },
  { id: "history", label: "Medical History", icon: "♡" },
  { id: "team", label: "My Team", icon: "♧" },
  { id: "profile", label: "My Profile", icon: "◉" },
];

const displayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const valueOrDash = (value) =>
  value === 0 ? "0" : value || "—";

export default function DoctorDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [histories, setHistories] = useState([]);
  const [team, setTeam] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT);
  const [historyForm, setHistoryForm] = useState(EMPTY_HISTORY);

  const doctorName = user?.name || "Doctor";
  const specialization =
    user?.specialization || "Specialization not set";

  const pageTitle =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ||
    "Overview";

  // LOAD DOCTOR DASHBOARD DATA
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const patientsResponse = await API.get(
        "/doctor-dashboard/patients"
      );

      const patientRows = Array.isArray(
        patientsResponse.data?.patients
      )
        ? patientsResponse.data.patients
        : [];

      const enriched = await Promise.all(
        patientRows.map(async (patient) => {
          try {
            const response = await API.get(
              `/doctor-dashboard/patients/${patient._id}/reports`
            );

            return {
              ...patient,
              reports: response.data?.reports || [],
              reportCount:
                response.data?.count ??
                response.data?.reports?.length ??
                0,
            };
          } catch {
            return {
              ...patient,
              reports: [],
              reportCount: 0,
            };
          }
        })
      );

      setPatients(enriched);

      setReports(
        enriched.flatMap((patient) =>
          (patient.reports || []).map((report) => ({
            ...report,
            patientName: patient.name,
            patientId: patient._id,
            patientUniqueId: patient.uniqueId,
          }))
        )
      );

      const detailRows = await Promise.all(
        enriched.map(async (patient) => {
          try {
            const response = await API.get(
              `/doctor-dashboard/patients/${patient._id}`
            );

            const record = response.data?.patient;

            return (record?.medicalHistory || []).map(
              (entry) => ({
                ...entry,
                patientName: patient.name,
                patientUniqueId: patient.uniqueId,
                patientId: patient._id,
              })
            );
          } catch {
            return [];
          }
        })
      );

      setHistories(detailRows.flat());

      try {
        const teamResponse = await API.get(
          "/doctor-dashboard/team"
        );

        setTeam(
          Array.isArray(teamResponse.data?.team)
            ? teamResponse.data.team
            : []
        );
      } catch {
        setTeam([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Dashboard data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return patients;

    return patients.filter((patient) =>
      [
        patient.name,
        patient.mobileNumber,
        patient.uniqueId,
        patient.email,
      ].some((item) =>
        String(item || "").toLowerCase().includes(query)
      )
    );
  }, [patients, search]);

  const notifyError = (err, fallback) => {
    setError(
      err.response?.data?.message ||
      err.message ||
      fallback
    );
  };

  const openModal = (name) => {
    setError("");
    setSuccess("");
    setModal(name);
  };

  // REGISTER PATIENT
  const createPatient = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...patientForm,
        name: patientForm.name.trim(),
        mobileNumber: patientForm.mobileNumber.trim(),
        age:
          patientForm.age === ""
            ? undefined
            : Number(patientForm.age),
      };

      const response = await API.post(
        "/doctor-dashboard/patients",
        payload
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
          "Patient registration failed"
        );
      }

      setModal("");
      setPatientForm(EMPTY_PATIENT);
      setSuccess(
        "Patient registered and assigned to your account."
      );

      await loadDashboard();
      setActiveTab("patients");
    } catch (err) {
      notifyError(err, "Unable to register patient.");
    } finally {
      setBusy(false);
    }
  };

  // UPLOAD REPORT
  const uploadReport = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");

    if (
      !reportForm.patientId ||
      !reportForm.reportTitle.trim() ||
      !reportForm.report
    ) {
      setError(
        "Patient, report title and file are required."
      );
      setBusy(false);
      return;
    }

    if (
      ![
        "application/pdf",
        "image/jpeg",
        "image/png",
      ].includes(reportForm.report.type)
    ) {
      setError("Only PDF, JPG and PNG files are allowed.");
      setBusy(false);
      return;
    }

    if (reportForm.report.size > 5 * 1024 * 1024) {
      setError("File size must not exceed 5 MB.");
      setBusy(false);
      return;
    }

    try {
      const data = new FormData();

      data.append("patientId", reportForm.patientId);
      data.append(
        "reportTitle",
        reportForm.reportTitle.trim()
      );
      data.append("reportType", reportForm.reportType);
      data.append("description", reportForm.description);
      data.append("report", reportForm.report);

      const response = await API.post(
        "/report-upload/upload",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Report upload failed"
        );
      }

      setModal("");
      setReportForm(EMPTY_REPORT);
      setSuccess("Medical report uploaded successfully.");

      await loadDashboard();
    } catch (err) {
      notifyError(err, "Unable to upload report.");
    } finally {
      setBusy(false);
    }
  };

  // ADD MEDICAL HISTORY
  const addHistory = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const { patientId, ...payload } = historyForm;

      if (!patientId) {
        throw new Error("Please select a patient.");
      }

      const response = await API.post(
        `/doctor-dashboard/patients/${patientId}/medical-history`,
        payload
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
          "Could not save medical history"
        );
      }

      setModal("");
      setHistoryForm(EMPTY_HISTORY);
      setSuccess("Medical history saved successfully.");

      await loadDashboard();
      setActiveTab("history");
    } catch (err) {
      notifyError(err, "Unable to save medical history.");
    } finally {
      setBusy(false);
    }
  };

  const startEditPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientForm({
      name: patient.name || "",
      mobileNumber: patient.mobileNumber || "",
      email: patient.email || "",
      age: patient.age == null ? "" : String(patient.age),
      gender: patient.gender || "",
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : "",
      bloodGroup: patient.bloodGroup || "",
      address: patient.address || "",
      emergencyContact: patient.emergencyContact || "",
    });
    openModal("edit-patient");
  };

  const savePatientEdit = async (event) => {
    event.preventDefault();
    if (!selectedPatient?._id) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...patientForm,
        name: patientForm.name.trim(),
        mobileNumber: patientForm.mobileNumber.trim(),
        age: patientForm.age === "" ? null : Number(patientForm.age),
      };
      await API.put(`/doctor-dashboard/patients/${selectedPatient._id}`, payload);
      setModal("");
      setSuccess("Patient details updated successfully.");
      await loadDashboard();
    } catch (err) {
      notifyError(err, "Unable to update patient.");
    } finally {
      setBusy(false);
    }
  };

  const removePatient = async (patient) => {
    if (!window.confirm(`Deactivate patient ${patient.name}? They will be removed from your active patient list. Existing reports and history are retained.`)) return;
    setBusy(true);
    try {
      await API.delete(`/doctor-dashboard/patients/${patient._id}`);
      setModal("");
      setSuccess("Patient removed from the active list.");
      await loadDashboard();
    } catch (err) {
      notifyError(err, "Unable to remove patient.");
    } finally {
      setBusy(false);
    }
  };

  const startEditHistory = (item) => {
    setHistoryForm({
      patientId: item.patientId || item.patient?._id || "",
      diagnosis: item.diagnosis || "",
      symptoms: Array.isArray(item.symptoms) ? item.symptoms.join(", ") : "",
      treatment: item.treatment || "",
      medicines: Array.isArray(item.medicines) ? item.medicines.join("\n") : "",
      notes: item.notes || "",
      recordDate: item.recordDate ? String(item.recordDate).slice(0, 10) : "",
    });
    setSelectedPatient({ _id: item.patientId || item.patient?._id });
    setSelectedHistory(item);
    openModal("edit-history");
  };

  const saveHistoryEdit = async (event) => {
    event.preventDefault();
    if (!selectedPatient?._id || !selectedHistory?._id) return;
    setBusy(true);
    try {
      const payload = {
        ...historyForm,
        symptoms: historyForm.symptoms.split(",").map(v => v.trim()).filter(Boolean),
        medicines: historyForm.medicines.split("\n").map(v => v.trim()).filter(Boolean),
      };
      await API.put(`/doctor-dashboard/patients/${selectedPatient._id}/medical-history/${selectedHistory._id}`, payload);
      setModal("");
      setSuccess("Medical history updated successfully.");
      await loadDashboard();
    } catch (err) {
      notifyError(err, "Unable to update medical history.");
    } finally {
      setBusy(false);
    }
  };

  const removeHistory = async (item) => {
    const patientId = item.patientId || item.patient?._id;
    if (!patientId || !window.confirm("Delete this medical history record permanently?")) return;
    setBusy(true);
    try {
      await API.delete(`/doctor-dashboard/patients/${patientId}/medical-history/${item._id}`);
      setSuccess("Medical history record deleted.");
      await loadDashboard();
      if (modal === "patient-detail" && selectedPatient?._id) {
        const response = await API.get(`/doctor-dashboard/patients/${selectedPatient._id}`);
        setPatientDetail(response.data?.patient || null);
      }
    } catch (err) {
      notifyError(err, "Unable to delete medical history.");
    } finally {
      setBusy(false);
    }
  };

  // VIEW PATIENT DETAILS
  const viewPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientDetail(null);
    setPatientReports([]);

    openModal("patient-detail");
    setBusy(true);

    try {
      const [detailResponse, reportResponse] =
        await Promise.all([
          API.get(
            `/doctor-dashboard/patients/${patient._id}`
          ),
          API.get(
            `/doctor-dashboard/patients/${patient._id}/reports`
          ),
        ]);

      setPatientDetail(
        detailResponse.data?.patient || patient
      );

      setPatientReports(
        reportResponse.data?.reports || []
      );
    } catch (err) {
      notifyError(err, "Unable to load patient details.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    window.location.assign("/login");
  };

  return (
    <div className="dc-shell">
      <aside className="dc-sidebar">
        <div className="dc-brand">
          <div className="dc-brand-mark">M</div>
          <div>
            <b>MediChain</b>
            <span>DOCTOR WORKSPACE</span>
          </div>
        </div>

        <div className="dc-nav-caption">MAIN MENU</div>

        <nav className="dc-nav" aria-label="Doctor navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`dc-nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(item.id);
                setSearch("");
              }}
            >
              <span className="dc-nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {item.id === "patients" && (
                <em>{patients.length}</em>
              )}
            </button>
          ))}
        </nav>

        <div className="dc-sidebar-bottom">
          <div className="dc-mini-profile">
            <div className="dc-avatar">
              {doctorName.charAt(0).toUpperCase()}
            </div>

            <div>
              <b>{doctorName}</b>
              <span>{specialization}</span>
            </div>
          </div>

          <button className="dc-logout" onClick={signOut}>
            ↪ <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="dc-main">
        <header className="dc-topbar">
          <div>
            <div className="dc-breadcrumb">
              Workspace <span>/</span> {pageTitle}
            </div>
            <h1>{pageTitle}</h1>
          </div>

          <div className="dc-top-actions">
            <div className="dc-doctor-chip">
              <div className="dc-avatar small">
                {doctorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <b>Dr. {doctorName}</b>
                <span>{specialization}</span>
              </div>
            </div>

            <button
              className="dc-icon-button"
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh dashboard"
            >
              ↻
            </button>
          </div>
        </header>

        <div className="dc-content">
          {error && (
            <div className="dc-alert error">
              <span>{error}</span>
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {success && (
            <div className="dc-alert success">
              <span>{success}</span>
              <button onClick={() => setSuccess("")}>×</button>
            </div>
          )}

          {activeTab === "overview" && (
            <>
              <section className="dc-welcome">
                <div>
                  <span className="dc-eyebrow">
                    MEDICHAIN CLINICAL PORTAL
                  </span>

                  <h2>Good day, Dr. {doctorName}</h2>

                  <p>
                    Your clinical workspace is ready. Review your
                    patients and keep their records up to date.
                  </p>

                  <div className="dc-specialty-pill">
                    ✚ {specialization}
                  </div>
                </div>

                <div className="dc-welcome-art">
                  <div className="dc-art-circle">✚</div>
                  <span>CARE · RECORDS · FOLLOW-UP</span>
                </div>
              </section>

              <section className="dc-stat-grid">
                <StatCard
                  icon="♙"
                  label="Assigned patients"
                  value={loading ? "—" : patients.length}
                  tone="blue"
                  detail="Patients under your care"
                />

                <StatCard
                  icon="▤"
                  label="Medical reports"
                  value={loading ? "—" : reports.length}
                  tone="teal"
                  detail="Uploaded patient documents"
                />

                <StatCard
                  icon="♡"
                  label="Medical history"
                  value={loading ? "—" : histories.length}
                  tone="violet"
                  detail="Clinical records saved"
                />

                <StatCard
                  icon="♧"
                  label="Team members"
                  value={loading ? "—" : team.length}
                  tone="amber"
                  detail="Linked support staff"
                />
              </section>

              <section className="dc-section-card">
                <div className="dc-section-head">
                  <div>
                    <h3>Quick actions</h3>
                    <p>
                      Open a task directly from your workspace.
                    </p>
                  </div>
                </div>

                <div className="dc-quick-grid">
                  <QuickAction
                    icon="＋"
                    title="Register patient"
                    text="Add a patient to your list"
                    onClick={() => openModal("patient")}
                  />

                  <QuickAction
                    icon="↑"
                    title="Upload report"
                    text="Attach a test or scan report"
                    onClick={() => openModal("report")}
                    disabled={!patients.length}
                  />

                  <QuickAction
                    icon="♡"
                    title="Add medical history"
                    text="Record diagnosis and treatment"
                    onClick={() => openModal("history")}
                    disabled={!patients.length}
                  />

                  <QuickAction
                    icon="♙"
                    title="View patients"
                    text="Browse your assigned patients"
                    onClick={() => setActiveTab("patients")}
                  />
                </div>
              </section>

              <section className="dc-section-card">
                <div className="dc-section-head">
                  <div>
                    <h3>Recently added patients</h3>
                    <p>Your latest patient registrations.</p>
                  </div>

                  <button
                    className="dc-text-button"
                    onClick={() => setActiveTab("patients")}
                  >
                    View all →
                  </button>
                </div>

                <PatientTable
                  patients={patients.slice(0, 5)}
                  onView={viewPatient}
                  onEdit={startEditPatient}
                  onDelete={removePatient}
                  onUpload={(patient) => {
                    setReportForm({
                      ...EMPTY_REPORT,
                      patientId: patient._id,
                    });
                    openModal("report");
                  }}
                />
              </section>
            </>
          )}

          {activeTab === "patients" && (
            <section className="dc-section-card">
              <div className="dc-section-head responsive-head">
                <div>
                  <h3>
                    My patients{" "}
                    <span className="dc-count">
                      {patients.length}
                    </span>
                  </h3>
                  <p>
                    Only patients assigned to your doctor account
                    are listed here.
                  </p>
                </div>

                <div className="dc-head-actions">
                  <input
                    className="dc-search"
                    placeholder="Search name, mobile or patient ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  <button
                    className="dc-primary"
                    onClick={() => openModal("patient")}
                  >
                    ＋ Register patient
                  </button>
                </div>
              </div>

              {loading ? (
                <Loading />
              ) : (
                <PatientTable
                  patients={filteredPatients}
                  onView={viewPatient}
                  onEdit={startEditPatient}
                  onDelete={removePatient}
                  onUpload={(patient) => {
                    setReportForm({
                      ...EMPTY_REPORT,
                      patientId: patient._id,
                    });
                    openModal("report");
                  }}
                />
              )}
            </section>
          )}

          {activeTab === "reports" && (
            <section className="dc-section-card">
              <div className="dc-section-head responsive-head">
                <div>
                  <h3>
                    Medical reports{" "}
                    <span className="dc-count">
                      {reports.length}
                    </span>
                  </h3>
                  <p>
                    Reports belonging to your assigned patients.
                  </p>
                </div>

                <button
                  className="dc-primary"
                  onClick={() => openModal("report")}
                  disabled={!patients.length}
                >
                  ↑ Upload report
                </button>
              </div>

              {loading ? (
                <Loading />
              ) : reports.length === 0 ? (
                <EmptyState
                  title="No reports available"
                  text="Upload a report for one of your assigned patients."
                  action="Upload report"
                  onClick={() => openModal("report")}
                  disabled={!patients.length}
                />
              ) : (
                <div className="dc-table-wrap">
                  <table className="dc-table">
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Patient</th>
                        <th>Type</th>
                        <th>Uploaded by</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report._id}>
                          <td>
                            <b>
                              {report.reportTitle ||
                                report.fileName ||
                                "Medical report"}
                            </b>
                            <small>{report.fileName || "Document"}</small>
                          </td>
                          <td>
                            {report.patientName}
                            <small>{report.patientUniqueId}</small>
                          </td>
                          <td>
                            <span className="dc-tag">
                              {(report.reportType || "OTHER").replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>{report.uploadedBy?.name || "—"}</td>
                          <td>{displayDate(report.reportDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === "history" && (
            <section className="dc-section-card">
              <div className="dc-section-head responsive-head">
                <div>
                  <h3>
                    Medical history{" "}
                    <span className="dc-count">
                      {histories.length}
                    </span>
                  </h3>
                  <p>
                    Diagnoses, symptoms, treatments and clinical notes.
                  </p>
                </div>

                <button
                  className="dc-primary"
                  onClick={() => openModal("history")}
                  disabled={!patients.length}
                >
                  ＋ Add record
                </button>
              </div>

              {loading ? (
                <Loading />
              ) : histories.length === 0 ? (
                <EmptyState
                  title="No medical history yet"
                  text="Add a clinical record for one of your assigned patients."
                  action="Add medical history"
                  onClick={() => openModal("history")}
                  disabled={!patients.length}
                />
              ) : (
                <div className="dc-history-list">
                  {histories.map((item, index) => (
                    <article
                      className="dc-history-card"
                      key={item._id || index}
                    >
                      <div className="dc-history-date">
                        {displayDate(item.recordDate)}
                      </div>

                      <div className="dc-history-body">
                        <h4>{item.diagnosis}</h4>

                        <p>
                          <b>Patient:</b> {item.patientName}
                          <span>·</span> {item.patientUniqueId}
                        </p>

                        {item.symptoms?.length > 0 && (
                          <p>
                            <b>Symptoms:</b>{" "}
                            {item.symptoms.join(", ")}
                          </p>
                        )}

                        {item.treatment && (
                          <p>
                            <b>Treatment:</b> {item.treatment}
                          </p>
                        )}

                        {item.medicines?.length > 0 && (
                          <p>
                            <b>Medicines:</b>{" "}
                            {item.medicines.join(", ")}
                          </p>
                        )}

                        {item.notes && (
                          <p>
                            <b>Notes:</b> {item.notes}
                          </p>
                        )}
                        <div className="dc-row-actions" style={{ marginTop: 12 }}>
                          <button type="button" onClick={() => startEditHistory(item)}>Edit</button>
                          <button type="button" onClick={() => removeHistory(item)}>Delete</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "team" && (
            <section className="dc-section-card">
              <div className="dc-section-head">
                <div>
                  <h3>
                    My team{" "}
                    <span className="dc-count">{team.length}</span>
                  </h3>
                  <p>
                    Team members linked with your doctor account.
                  </p>
                </div>
              </div>

              {loading ? (
                <Loading />
              ) : team.length === 0 ? (
                <EmptyState
                  title="No team members linked"
                  text="There are currently no active team members linked to your account."
                />
              ) : (
                <div className="dc-team-grid">
                  {team.map((member) => (
                    <article className="dc-team-card" key={member._id}>
                      <div className="dc-avatar">
                        {(member.name || "T").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h4>{member.name}</h4>
                        <p>{member.email}</p>
                        <small>{member.mobileNumber}</small>
                      </div>

                      <span
                        className={`dc-status ${
                          member.isActive ? "on" : "off"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "profile" && (
            <section className="dc-section-card">
              <div className="dc-section-head">
                <div>
                  <h3>Doctor profile</h3>
                  <p>Your account information.</p>
                </div>
              </div>

              <div className="dc-profile-panel">
                <div className="dc-profile-large">
                  {doctorName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <span className="dc-eyebrow">DOCTOR ACCOUNT</span>
                  <h2>Dr. {doctorName}</h2>
                  <p>{specialization}</p>
                </div>
              </div>

              <div className="dc-profile-grid">
                <Info label="Full name" value={doctorName} />
                <Info label="Email address" value={user?.email} />
                <Info label="Role" value={user?.role || "DOCTOR"} />
                <Info label="Specialization" value={specialization} />
              </div>

              <div className="dc-note">
                Password changes are not connected to an existing
                backend endpoint in the uploaded project. No fake
                password-reset action has been added here.
              </div>
            </section>
          )}

          <footer className="dc-footer">
            © {new Date().getFullYear()} MediChain · Clinical workspace
          </footer>
        </div>
      </main>

      {modal && (
        <div
          className="dc-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal("");
          }}
        >
          {(modal === "patient" || modal === "edit-patient") && (
            <Modal
              title={modal === "edit-patient" ? "Edit patient details" : "Register new patient"}
              subtitle={modal === "edit-patient" ? "Update this assigned patient's information." : "The patient will be assigned to your doctor account."}
              onClose={() => setModal("")}
            >
              <form className="dc-form" onSubmit={modal === "edit-patient" ? savePatientEdit : createPatient}>
                <div className="dc-form-grid">
                  <Field label="Patient name *">
                    <input
                      required
                      value={patientForm.name}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Mobile number *">
                    <input
                      required
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      value={patientForm.mobileNumber}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          mobileNumber: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      value={patientForm.email}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          email: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Date of birth">
                    <input
                      type="date"
                      value={patientForm.dateOfBirth}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Age">
                    <input
                      type="number"
                      min="0"
                      value={patientForm.age}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          age: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Gender">
                    <select
                      value={patientForm.gender}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          gender: e.target.value,
                        })
                      }
                    >
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </Field>

                  <Field label="Blood group">
                    <select
                      value={patientForm.bloodGroup}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          bloodGroup: e.target.value,
                        })
                      }
                    >
                      <option value="">Select blood group</option>
                      {[
                        "A+", "A-", "B+", "B-",
                        "AB+", "AB-", "O+", "O-",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Emergency contact">
                    <input
                      value={patientForm.emergencyContact}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          emergencyContact: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Address" wide>
                    <textarea
                      rows="2"
                      value={patientForm.address}
                      onChange={(e) =>
                        setPatientForm({
                          ...patientForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <ModalActions
                  busy={busy}
                  onCancel={() => setModal("")}
                  submit={modal === "edit-patient" ? "Save patient changes" : "Register patient"}
                />
              </form>
            </Modal>
          )}

          {modal === "report" && (
            <Modal
              title="Upload medical report"
              subtitle="PDF, JPG or PNG · Maximum file size 5 MB."
              onClose={() => setModal("")}
            >
              <form className="dc-form" onSubmit={uploadReport}>
                <div className="dc-form-grid">
                  <Field label="Select patient *" wide>
                    <select
                      required
                      value={reportForm.patientId}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          patientId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose assigned patient</option>
                      {patients.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} · {p.uniqueId}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Report title *">
                    <input
                      required
                      value={reportForm.reportTitle}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          reportTitle: e.target.value,
                        })
                      }
                      placeholder="e.g. CBC Report"
                    />
                  </Field>

                  <Field label="Report type">
                    <select
                      value={reportForm.reportType}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          reportType: e.target.value,
                        })
                      }
                    >
                      {[
                        "BLOOD_TEST", "XRAY", "MRI", "CT_SCAN",
                        "ULTRASOUND", "PRESCRIPTION", "OTHER",
                      ].map((x) => (
                        <option key={x} value={x}>
                          {x.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Description" wide>
                    <textarea
                      rows="3"
                      value={reportForm.description}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Choose report file *" wide>
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          report: e.target.files?.[0] || null,
                        })
                      }
                    />
                  </Field>
                </div>

                <ModalActions
                  busy={busy}
                  onCancel={() => setModal("")}
                  submit="Upload report"
                />
              </form>
            </Modal>
          )}

          {modal === "history" && (
            <Modal
              title="Add medical history"
              subtitle="Save a diagnosis and treatment record for an assigned patient."
              onClose={() => setModal("")}
            >
              <form className="dc-form" onSubmit={addHistory}>
                <div className="dc-form-grid">
                  <Field label="Select patient *" wide>
                    <select
                      required
                      value={historyForm.patientId}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          patientId: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose assigned patient</option>
                      {patients.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} · {p.uniqueId}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Diagnosis *" wide>
                    <input
                      required
                      value={historyForm.diagnosis}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          diagnosis: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Symptoms (comma separated)" wide>
                    <input
                      value={historyForm.symptoms}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          symptoms: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Treatment" wide>
                    <textarea
                      rows="2"
                      value={historyForm.treatment}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          treatment: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Medicines (one per line)" wide>
                    <textarea
                      rows="3"
                      value={historyForm.medicines}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          medicines: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Record date">
                    <input
                      type="date"
                      value={historyForm.recordDate}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          recordDate: e.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Clinical notes">
                    <input
                      value={historyForm.notes}
                      onChange={(e) =>
                        setHistoryForm({
                          ...historyForm,
                          notes: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <ModalActions
                  busy={busy}
                  onCancel={() => setModal("")}
                  submit="Save medical history"
                />
              </form>
            </Modal>
          )}


          {modal === "edit-history" && (
            <Modal title="Edit medical history" subtitle="Update the selected clinical record." onClose={() => setModal("")}>
              <form className="dc-form" onSubmit={saveHistoryEdit}>
                <div className="dc-form-grid">
                  <Field label="Diagnosis *" wide><input required value={historyForm.diagnosis} onChange={e => setHistoryForm({ ...historyForm, diagnosis: e.target.value })} /></Field>
                  <Field label="Symptoms (comma separated)" wide><input value={historyForm.symptoms} onChange={e => setHistoryForm({ ...historyForm, symptoms: e.target.value })} /></Field>
                  <Field label="Treatment" wide><textarea rows="2" value={historyForm.treatment} onChange={e => setHistoryForm({ ...historyForm, treatment: e.target.value })} /></Field>
                  <Field label="Medicines (one per line)" wide><textarea rows="3" value={historyForm.medicines} onChange={e => setHistoryForm({ ...historyForm, medicines: e.target.value })} /></Field>
                  <Field label="Record date"><input type="date" value={historyForm.recordDate} onChange={e => setHistoryForm({ ...historyForm, recordDate: e.target.value })} /></Field>
                  <Field label="Clinical notes"><input value={historyForm.notes} onChange={e => setHistoryForm({ ...historyForm, notes: e.target.value })} /></Field>
                </div>
                <ModalActions busy={busy} onCancel={() => setModal("")} submit="Save history changes" />
              </form>
            </Modal>
          )}

          {modal === "patient-detail" && (
            <Modal
              title={
                patientDetail?.name ||
                selectedPatient?.name ||
                "Patient details"
              }
              subtitle={
                patientDetail?.uniqueId ||
                selectedPatient?.uniqueId ||
                "Patient record"
              }
              onClose={() => setModal("")}
              wide
            >
              <div className="dc-detail-content">
                {busy && !patientDetail ? (
                  <Loading />
                ) : patientDetail ? (
                  <>
                    <div className="dc-row-actions" style={{ marginBottom: 16 }}>
                      <button type="button" onClick={() => startEditPatient(patientDetail)}>Edit patient</button>
                      <button type="button" onClick={() => removePatient(patientDetail)}>Delete patient</button>
                    </div>
                    <div className="dc-detail-grid">
                      <Info label="Patient ID" value={patientDetail.uniqueId} />
                      <Info label="Mobile" value={patientDetail.mobileNumber} />
                      <Info label="Email" value={patientDetail.email} />
                      <Info label="Date of birth" value={displayDate(patientDetail.dateOfBirth)} />
                      <Info label="Age" value={patientDetail.age} />
                      <Info label="Gender" value={patientDetail.gender} />
                      <Info label="Blood group" value={patientDetail.bloodGroup} />
                      <Info label="Emergency contact" value={patientDetail.emergencyContact} />
                      <Info label="Address" value={patientDetail.address} />
                      <Info label="Registered" value={displayDate(patientDetail.createdAt)} />
                    </div>

                    <div className="dc-detail-subhead">
                      <h4>Medical reports ({patientReports.length})</h4>
                      <button
                        className="dc-primary compact"
                        onClick={() => {
                          setReportForm({
                            ...EMPTY_REPORT,
                            patientId: patientDetail._id,
                          });
                          setModal("report");
                        }}
                      >
                        Upload report
                      </button>
                    </div>

                    {patientReports.length ? (
                      <ul className="dc-simple-list">
                        {patientReports.map((r) => (
                          <li key={r._id}>
                            <div>
                              <b>{r.reportTitle}</b>
                              <span>
                                {r.reportType?.replaceAll("_", " ")}
                                {" · "}
                                {displayDate(r.reportDate)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="dc-muted">
                        No reports uploaded for this patient.
                      </p>
                    )}

                    <div className="dc-detail-subhead">
                      <h4>
                        Medical history (
                        {patientDetail.medicalHistory?.length || 0})
                      </h4>
                      <button
                        className="dc-secondary compact"
                        onClick={() => {
                          setHistoryForm({
                            ...EMPTY_HISTORY,
                            patientId: patientDetail._id,
                          });
                          setModal("history");
                        }}
                      >
                        Add history
                      </button>
                    </div>

                    {patientDetail.medicalHistory?.length ? (
                      <ul className="dc-simple-list">
                        {patientDetail.medicalHistory.map((h) => (
                          <li key={h._id}>
                            <div>
                              <b>{h.diagnosis}</b>
                              <span>
                                {displayDate(h.recordDate)}
                                {" · "}
                                {h.treatment || "No treatment notes"}
                              </span>
                              <div className="dc-row-actions" style={{ marginTop: 8 }}>
                                <button type="button" onClick={() => startEditHistory({ ...h, patientId: patientDetail._id })}>Edit</button>
                                <button type="button" onClick={() => removeHistory({ ...h, patientId: patientDetail._id })}>Delete</button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="dc-muted">
                        No medical history recorded.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="dc-muted">
                    Patient details are unavailable.
                  </p>
                )}
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone, detail }) {
  return (
    <article className="dc-stat-card">
      <div className={`dc-stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function QuickAction({ icon, title, text, onClick, disabled }) {
  return (
    <button
      className="dc-quick-action"
      onClick={onClick}
      disabled={disabled}
    >
      <span>{icon}</span>
      <b>{title}</b>
      <small>{text}</small>
      <i>Open →</i>
    </button>
  );
}

function Field({ label, wide, children }) {
  return (
    <label className={`dc-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="dc-info">
      <span>{label}</span>
      <b>{valueOrDash(value)}</b>
    </div>
  );
}

function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <section className={`dc-modal ${wide ? "wide" : ""}`}>
      <header className="dc-modal-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      {children}
    </section>
  );
}

function ModalActions({ busy, onCancel, submit }) {
  return (
    <div className="dc-modal-actions">
      <button
        type="button"
        className="dc-secondary"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="dc-primary"
        disabled={busy}
      >
        {busy ? "Please wait…" : submit}
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="dc-loading">
      <span className="dc-spinner" />
      Loading records…
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
  onClick,
  disabled,
}) {
  return (
    <div className="dc-empty">
      <div>▤</div>
      <h4>{title}</h4>
      <p>{text}</p>
      {action && (
        <button
          className="dc-primary"
          disabled={disabled}
          onClick={onClick}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function PatientTable({ patients, onView, onEdit, onDelete, onUpload }) {
  return patients.length ? (
    <div className="dc-table-wrap">
      <table className="dc-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Contact</th>
            <th>Age / Gender</th>
            <th>Blood group</th>
            <th>Reports</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient._id}>
              <td>
                <div className="dc-patient-cell">
                  <div className="dc-avatar">
                    {(patient.name || "P").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <b>{patient.name}</b>
                    <small>
                      {patient.uniqueId || patient._id}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {patient.mobileNumber || "—"}
                <small>{patient.email || ""}</small>
              </td>
              <td>
                {valueOrDash(patient.age)} / {valueOrDash(patient.gender)}
              </td>
              <td>{valueOrDash(patient.bloodGroup)}</td>
              <td>
                <span className="dc-tag">
                  {patient.reportCount || 0} files
                </span>
              </td>
              <td>{displayDate(patient.createdAt)}</td>
              <td>
                <div className="dc-row-actions">
                  <button onClick={() => onView(patient)}>
                    Details
                  </button>
                  <button onClick={() => onUpload(patient)}>Upload</button>
                  <button onClick={() => onEdit(patient)}>Edit</button>
                  <button onClick={() => onDelete(patient)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState
      title="No patients found"
      text="No assigned patients match this view. Register a patient to get started."
    />
  );
}
