import "./ReportDownloadButton.css";
import { useState } from "react";
import API from "../api/axios";

export default function ReportDownloadButton({ report }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const downloadReport = async () => {
    if (!report?._id) {
      setError("Report ID is missing.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await API.get(
        `/reports/${report._id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type:
            response.headers["content-type"] ||
            report.mimeType ||
            "application/octet-stream",
        }
      );

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = report.fileName || "medical-report";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError("Unable to download report. Please try again.");
      console.error("Report Download Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-download-wrapper">
      <button
        type="button"
        className="report-download-button"
        onClick={downloadReport}
        disabled={loading}
      >
        {loading ? "Downloading..." : "↓ Download Report"}
      </button>

      {error && (
        <p className="report-download-error">
          {error}
        </p>
      )}
    </div>
  );
}
