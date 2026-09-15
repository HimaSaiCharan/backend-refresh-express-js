import { useEffect, useState } from "react";

const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

export default function LeaveForm({ leaveRequest, onSave, onCancel }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(leaveRequest);

  useEffect(() => {
    setStartDate(toDateInputValue(leaveRequest?.start_date));
    setEndDate(toDateInputValue(leaveRequest?.end_date));
    setReason(leaveRequest?.reason || "");
    setError("");
  }, [leaveRequest]);

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (startDate > endDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ startDate, endDate, reason: reason.trim() });
      if (!isEditing) resetForm();
    } catch (requestError) {
      setError(requestError.message || "Could not save the leave request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel form-panel" aria-labelledby="leave-form-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Request</p>
          <h2 id="leave-form-title">{isEditing ? "Edit leave" : "Apply for leave"}</h2>
        </div>
        {isEditing && (
          <button type="button" className="text-button" onClick={onCancel} disabled={isSubmitting}>
            Stop editing
          </button>
        )}
      </div>

      {error && <div className="message error-message" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="leave-form">
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            required
          />
        </label>

        <label className="reason-field">
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows="4"
            placeholder="Briefly explain your request"
            required
          />
        </label>

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Submit request"}
        </button>
      </form>
    </section>
  );
}
