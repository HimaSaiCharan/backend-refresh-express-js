import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../api/client.js";

export default function LoginForm({ onLogin, message }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(message || "");
  }, [message]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin({ email: email.trim(), password });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to log in right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">L</div>
        <p className="eyebrow">Leave Management</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="muted">Sign in to manage your leave requests.</p>

        {error && <div className="message error-message" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="stack-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="primary-button full-width" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
