import { useCallback, useEffect, useState } from "react";
import apiClient, { getApiErrorMessage } from "../api/client.js";

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

export default function ManagerDashboard({ user, onLogout, onUnauthorized, isLoggingOut }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const handleApiError = useCallback((requestError, fallbackMessage) => {
    if (requestError.response?.status === 401) {
      onUnauthorized();
      return;
    }
    setError(getApiErrorMessage(requestError, fallbackMessage));
  }, [onUnauthorized]);

  const loadRequests = useCallback(async () => {
    setError("");
    try {
      const response = await apiClient.get("/manager/leave-requests");
      setRequests(response.data);
    } catch (requestError) {
      handleApiError(requestError, "Could not load team leave requests.");
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateStatus = async (id, status) => {
    setProcessingId(id);
    setError("");
    try {
      await apiClient.patch(`/leave-requests/${id}/status`, { status });
      await loadRequests();
    } catch (requestError) {
      handleApiError(requestError, `Could not ${status === "approved" ? "approve" : "reject"} the request.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Leave Management</p>
          <h1>Manager dashboard</h1>
        </div>
        <button className="secondary-button" onClick={onLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
      </header>

      <main className="dashboard">
        <section className="profile-card" aria-label="Logged-in manager details">
          <div className="avatar" aria-hidden="true">{user.name?.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <span className="role-pill">{user.role}</span>
        </section>

        {error && <div className="message error-message" role="alert">{error}</div>}

        <section className="panel" aria-labelledby="team-requests-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Team</p>
              <h2 id="team-requests-title">Direct reports' requests</h2>
            </div>
            <span className="count-pill">{requests.length}</span>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading requests…</p>
          ) : requests.length === 0 ? (
            <p className="empty-state">There are no leave requests from your direct reports.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.employee_name}</strong>
                        <span className="table-secondary">{request.employee_email}</span>
                      </td>
                      <td>{formatDate(request.start_date)} – {formatDate(request.end_date)}</td>
                      <td className="reason-cell">{request.reason}</td>
                      <td><span className={`status status-${request.status}`}>{request.status}</span></td>
                      <td>
                        {request.status === "pending" && (
                          <div className="actions manager-actions">
                            <button
                              type="button"
                              className="approve-button small-button"
                              onClick={() => updateStatus(request.id, "approved")}
                              disabled={processingId === request.id}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="danger-button small-button"
                              onClick={() => updateStatus(request.id, "rejected")}
                              disabled={processingId === request.id}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
