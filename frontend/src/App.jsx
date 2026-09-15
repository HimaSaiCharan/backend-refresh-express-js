import { useCallback, useState } from "react";
import apiClient from "./api/client.js";
import EmployeeDashboard from "./components/EmployeeDashboard.jsx";
import LoginForm from "./components/LoginForm.jsx";
import ManagerDashboard from "./components/ManagerDashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [authMessage, setAuthMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogin = async (credentials) => {
    const response = await apiClient.post("/login", credentials);
    setUser(response.data);
    setAuthMessage("");
  };

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setAuthMessage("Your session has expired. Please log in again.");
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    let message = "";
    try {
      await apiClient.post("/logout");
    } catch {
      message = "The logout request failed. Please try signing in again.";
    } finally {
      setUser(null);
      setAuthMessage(message);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} message={authMessage} />;
  }

  const dashboardProps = {
    user,
    onLogout: handleLogout,
    onUnauthorized: handleUnauthorized,
    isLoggingOut,
  };

  return user.role === "manager" ? (
    <ManagerDashboard {...dashboardProps} />
  ) : (
    <EmployeeDashboard {...dashboardProps} />
  );
}
