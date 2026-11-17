
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./PatientLogin.css";

export default function PatientLogin() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const sendOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setDemoOtp("");

    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      setError("Enter a valid 10 digit mobile number.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/otp/send", {
        mobileNumber,
      });

      if (!response.data.success) {
        throw new Error("Unable to generate OTP.");
      }

      setOtpSent(true);
      setDemoOtp(response.data.demoOtp || "");
      setMessage(response.data.message);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "OTP generate nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();

    setError("");

    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Enter a valid 6 digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/otp/verify", {
        mobileNumber,
        otp,
      });

      const data = response.data;

      if (!data.success || !data.token || !data.patient) {
        throw new Error("Invalid patient login response.");
      }

      login(
        {
          ...data.patient,
          role: "PATIENT",
        },
        data.token
      );

      navigate("/patient", { replace: true });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="patient-login-page">
      <div className="patient-login-card">

        <Link to="/login" className="patient-back">
          ← Staff Login
        </Link>

        <div className="patient-logo">M</div>

        <span className="patient-tag">
          MEDICHAIN HEALTHCARE
        </span>

        <h1>Patient Portal</h1>

        <p className="patient-subtitle">
          Access your medical records, reports
          and healthcare information securely.
        </p>

        {!otpSent ? (
          <form onSubmit={sendOtp}>

            <label>Mobile Number</label>

            <div className="patient-mobile-input">
              <span>+91</span>

              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) =>
                  setMobileNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="patient-primary-button"
            >
              {loading ? "Sending OTP..." : "Generate OTP →"}
            </button>

          </form>
        ) : (
          <form onSubmit={verifyOtp}>

            <label>Enter 6 Digit OTP</label>

            <input
              className="patient-otp-input"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="000000"
              maxLength={6}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="patient-primary-button"
            >
              {loading ? "Verifying..." : "Verify & Login →"}
            </button>

            <button
              type="button"
              className="patient-secondary-button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setDemoOtp("");
                setMessage("");
                setError("");
              }}
            >
              Change Mobile Number
            </button>

          </form>
        )}

        {demoOtp && (
          <div className="patient-demo-otp">
            Demo OTP: <strong>{demoOtp}</strong>
          </div>
        )}

        {message && (
          <div className="patient-success">
            {message}
          </div>
        )}

        {error && (
          <div className="patient-error">
            {error}
          </div>
        )}

        <div className="patient-security">
          Secure Patient Authentication
        </div>

      </div>
    </main>
  );
}
