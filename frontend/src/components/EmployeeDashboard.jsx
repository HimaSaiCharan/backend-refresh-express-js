import { useCallback, useEffect, useState } from "react";
import apiClient, { getApiErrorMessage } from "../api/client.js";
import LeaveForm from "./LeaveForm.jsx";

const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

export default function EmployeeDashboard({ user, onLogout, onUnauthorized, isLoggingOut }) {
  const [requests, setRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
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
      const response = await apiClient.get("/leave-requests");
      setRequests(response.data);
    } catch (requestError) {
      handleApiError(requestError, "Could not load your leave requests.");
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const saveRequest = async (values) => {
    setError("");
    try {
      if (editingRequest) {
        await apiClient.put(`/leave-requests/${editingRequest.id}`, values);
      } else {
        await apiClient.post("/leave-requests", values);
      }
      setEditingRequest(null);
      await loadRequests();
    } catch (requestError) {
      handleApiError(requestError, "Could not save the leave request.");
      throw new Error(getApiErrorMessage(requestError, "Could not save the leave request."));
    }
  };

  const cancelRequest = async (request) => {
    if (!window.confirm("Cancel this leave request?")) return;

    setProcessingId(request.id);
    setError("");
    try {
      await apiClient.delete(`/leave-requests/${request.id}`);
      if (editingRequest?.id === request.id) setEditingRequest(null);
      await loadRequests();
    } catch (requestError) {
      handleApiError(requestError, "Could not cancel the leave request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Leave Management</p>
          <h1>Employee dashboard</h1>
        </div>
        <button className="secondary-button" onClick={onLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
      </header>

      <main className="dashboard">
        <section className="profile-card" aria-label="Logged-in user details">
          <div className="avatar" aria-hidden="true">{user.name?.charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <span className="role-pill">{user.role}</span>
        </section>

        {error && <div className="message error-message" role="alert">{error}</div>}

        <div className="employee-grid">
          <LeaveForm
            leaveRequest={editingRequest}
            onSave={saveRequest}
            onCancel={() => setEditingRequest(null)}
          />

          <section className="panel" aria-labelledby="requests-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">History</p>
                <h2 id="requests-title">My leave requests</h2>
              </div>
              <span className="count-pill">{requests.length}</span>
            </div>

            {isLoading ? (
              <p className="empty-state">Loading requests…</p>
            ) : requests.length === 0 ? (
              <p className="empty-state">You have not submitted any leave requests.</p>
            ) : (
              <div className="request-list">
                {requests.map((request) => (
                  <article className="request-card" key={request.id}>
                    <div className="request-card-header">
                      <strong>{formatDate(request.start_date)} – {formatDate(request.end_date)}</strong>
                      <span className={`status status-${request.status}`}>{request.status}</span>
                    </div>
                    <p>{request.reason}</p>
                    {request.status === "pending" && (
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary-button small-button"
                          onClick={() => setEditingRequest(request)}
                          disabled={processingId === request.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button small-button"
                          onClick={() => cancelRequest(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? "Cancelling…" : "Cancel"}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
