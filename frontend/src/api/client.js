import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

export const getApiErrorMessage = (error, fallbackMessage) => {
  if (error.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  return error.response?.data?.message || fallbackMessage;
};

export default apiClient;
