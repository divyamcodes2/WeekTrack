import axios from 'axios';

/**
 * Axios instance configured for the WeekTrack API.
 * - Sends cookies with every request (credentials)
 * - Base URL from environment variable
 * - Response interceptor for error handling
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';

    // Don't redirect on auth check failures (silent checks)
    if (error.response?.status === 401 && !error.config._silentAuth) {
      console.warn('Auth error:', message);
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default api;
