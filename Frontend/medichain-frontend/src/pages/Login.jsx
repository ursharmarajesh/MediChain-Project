
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/staff-auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;
      const token = data.token;
      const user = data.user;

      if (!data.success || !token || !user?.role) {
        throw new Error("Invalid login response from server.");
      }

      const dashboards = {
        ADMIN: "/admin",
        DOCTOR: "/doctor",
        TEAM: "/team",
      };

      const destination = dashboards[user.role];

      if (!destination) {
        throw new Error("Your account role is not supported.");
      }

      login(user, token);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-shell">

        {/* Left Branding Section */}
        <section className="login-visual">
          <div className="visual-top">
            <div className="brand-logo">
              <span className="brand-icon">M</span>
              <span>MediChain</span>
            </div>
            <span className="portal-label">HEALTHCARE PORTAL</span>
          </div>

          <div className="visual-content">
            <span className="visual-tag">
              <span className="status-dot"></span>
              SMART HEALTHCARE MANAGEMENT
            </span>

            <h1>
              Better care.
              <br />
              <span>Connected</span>
              <br />
              healthcare.
            </h1>

            <p>
              A unified healthcare management platform
              designed to connect doctors, patients and
              healthcare teams in one secure place.
            </p>

            <div className="visual-features">
              <div className="visual-feature">
                <span className="feature-icon">✚</span>
                <div>
                  <strong>Connected Care</strong>
                  <small>Healthcare information in one place</small>
                </div>
              </div>

              <div className="visual-feature">
                <span className="feature-icon">⌘</span>
                <div>
                  <strong>Smart Management</strong>
                  <small>Manage patients and medical reports</small>
                </div>
              </div>

              <div className="visual-feature">
                <span className="feature-icon">✓</span>
                <div>
                  <strong>Secure Access</strong>
                  <small>Role-based staff authentication</small>
                </div>
              </div>
            </div>
          </div>

          <div className="visual-footer">
            <span>MEDICHAIN HEALTHCARE SYSTEM</span>
            <span>BUILT FOR BETTER CARE</span>
          </div>
        </section>

        {/* Right Login Section */}
        <section className="login-panel">
          <div className="login-panel-inner">

            <div className="mobile-brand">
              <div className="brand-icon">M</div>
              <span>MediChain</span>
            </div>

            <div className="login-heading">
              <span className="welcome-label">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>
                Enter your credentials to access your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">

              <div className="form-group">
                <label htmlFor="email">Email address</label>

                <div className="input-wrapper">
                  <span className="input-icon">✉</span>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@medichain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>

                <div className="input-wrapper">
                  <span className="input-icon">♙</span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <span>!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to MediChain
                    <span>→</span>
                  </>
                )}
              </button>

            </form>

            {/* Patient Login Link */}
            <div className="patient-login-link">
              <span>Are you a patient?</span>
              <Link to="/patient-login">
                Login with Mobile &amp; OTP →
              </Link>
            </div>

            <div className="access-section">
              <span className="access-title">AUTHORIZED STAFF ACCESS</span>

              <div className="role-list">
                <span>Admin</span>
                <span>Doctor</span>
              </div>
            </div>

            <div className="login-security">
              <span>♧</span>
              Your session is protected by secure authentication.
            </div>

          </div>

          <div className="login-bottom">
            © {new Date().getFullYear()} MediChain. All rights reserved.
          </div>
        </section>

      </div>
    </main>
  );
}
