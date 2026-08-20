import { useEffect, useRef, useState } from "react";
import { uploadFile, getUploads } from "../api";

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef();

  const refreshHistory = () => getUploads().then(setHistory).catch(() => {});

  useEffect(() => { refreshHistory(); }, []);

  const handleFile = async (file) => {
    setError(null);
    setStatus("uploading");
    try {
      const summary = await uploadFile(file);
      setStatus(summary);
      refreshHistory();
    } catch (e) {
      setError(e?.response?.data?.detail || "Upload failed — check the file format");
      setStatus(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Upload data</h1>
          <p className="page-sub">Upload the latest export — new dates are added, existing dates are updated. History is kept for a year.</p>
        </div>
      </div>

      <div
        className={"dropzone" + (dragging ? " dragging" : "")}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm"
          style={{ display: "none" }}
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div className="dropzone-title">Drop an .xlsx attendance export here</div>
        <div className="dropzone-sub">or click to browse</div>
      </div>

      {status === "uploading" && <div className="card">Processing file…</div>}
      {error && <div className="card card-danger">{error}</div>}
      {status && status !== "uploading" && (
        <div className="card card-success">
          Ingested {status.rows_ingested} rows for {status.employees_seen} employees
          ({status.period_start} to {status.period_end}).
        </div>
      )}

      <div className="card">
        <div className="section-label">Upload history</div>
        <table className="data-table">
          <thead>
            <tr><th>File</th><th>Uploaded</th><th>Period</th><th>Rows</th><th>Employees</th></tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td className="td-name">{h.filename}</td>
                <td className="td-muted">{h.uploaded_at?.replace("T", " ")}</td>
                <td className="td-muted">{h.period_start} → {h.period_end}</td>
                <td>{h.row_count}</td>
                <td>{h.employee_count}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={5} className="td-muted">No uploads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
