const API_BASE = "http://localhost:8000/api";


export function getAuthStorageKey(panel) {
  return `scpe_auth_${panel}`;
}

export function loadAuth(panel) {
  try {
    const raw = sessionStorage.getItem(getAuthStorageKey(panel));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth(panel, data) {
  sessionStorage.setItem(getAuthStorageKey(panel), JSON.stringify(data));
}

export function clearAuth(panel) {
  sessionStorage.removeItem(getAuthStorageKey(panel));
}

async function request(path, { method = "GET", body, token, isForm = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Unexpected response" };
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  health: () => request("/health"),
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: (token) => request("/auth/me", { token }),
  updateProfile: (token, body) => request("/auth/profile", { method: "PUT", token, body }),

  student: {
    dashboard: (token) => request("/student/dashboard", { token }),
    projects: (token) => request("/student/projects", { token }),
    project: (token, id) => request(`/student/projects/${id}`, { token }),
    createProject: (token, formData) =>
      request("/student/projects", { method: "POST", token, body: formData, isForm: true }),
    updateProject: (token, id, formData) =>
      request(`/student/projects/${id}`, { method: "PUT", token, body: formData, isForm: true }),
    submitProject: (token, id) =>
      request(`/student/projects/${id}/submit`, { method: "POST", token }),
    removeFile: (token, id, filename) =>
      request(`/student/projects/${id}/files/${filename}`, { method: "DELETE", token }),
    rankings: (token) => request("/student/rankings", { token }),
    results: (token) => request("/student/results", { token }),
  },

  staff: {
    dashboard: (token) => request("/staff/dashboard", { token }),
    session: (token) => request("/staff/session", { token }),
    distributeAll: (token) =>
      request("/staff/session/distribute", { method: "POST", token }),
    projects: (token, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/staff/projects${qs ? `?${qs}` : ""}`, { token });
    },
    project: (token, id) => request(`/staff/projects/${id}`, { token }),
    updateMark: (token, id, body) =>
      request(`/staff/projects/${id}/mark`, { method: "PUT", token, body }),
    evaluated: (token) => request("/staff/evaluated", { token }),
  },

  admin: {
    dashboard: (token) => request("/admin/dashboard", { token }),
    users: (token, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/users${qs ? `?${qs}` : ""}`, { token });
    },
    createUser: (token, body) => request("/admin/users", { method: "POST", token, body }),
    createAdmin: (token, body) => request("/admin/admins", { method: "POST", token, body }),
    updateUser: (token, id, body) =>
      request(`/admin/users/${id}`, { method: "PUT", token, body }),
    deleteUser: (token, id) => request(`/admin/users/${id}`, { method: "DELETE", token }),
    projects: (token, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/projects${qs ? `?${qs}` : ""}`, { token });
    },
    project: (token, id) => request(`/admin/projects/${id}`, { token }),
    updateMark: (token, id, body) =>
      request(`/admin/projects/${id}/mark`, { method: "PUT", token, body }),
    publishProject: (token, id) =>
      request(`/admin/projects/${id}/publish`, { method: "POST", token }),
    rankings: (token) => request("/admin/rankings", { token }),
    publishRankings: (token) => request("/admin/rankings/publish", { method: "POST", token }),
    recalculateRankings: (token) =>
      request("/admin/rankings/recalculate", { method: "POST", token }),
    activities: (token, limit = 50) => request(`/admin/activities?limit=${limit}`, { token }),
    reports: (token) => request("/admin/reports", { token }),
  },
};

export default api;
