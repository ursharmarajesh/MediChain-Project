
import { useAuth } from "../context/AuthContext";

export default function TeamDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>MediChain Team</h2>
        <button onClick={logout}>Logout</button>
      </header>
      <section className="welcome-card">
        <h1>Welcome, {user?.name || "Team Member"}</h1>
        <p>Access permitted patient information and reports.</p>
      </section>
    </div>
  );
}
