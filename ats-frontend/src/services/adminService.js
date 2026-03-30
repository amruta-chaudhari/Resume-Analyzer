import apiClient from './api';

export const adminService = {
  async listUsers(params = {}) {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data.data;
  },

  async getUser(userId) {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return response.data.data;
  },

  async updateUser(userId, payload) {
    const response = await apiClient.patch(`/api/admin/users/${userId}`, payload);
    return response.data.data;
  },

  async setUserPassword(userId, password) {
    const response = await apiClient.post(`/api/admin/users/${userId}/password`, {
      password,
    });
    return response.data.data;
  },

  async revokeUserSessions(userId) {
    const response = await apiClient.post(`/api/admin/users/${userId}/revoke-sessions`);
    return response.data.data;
  },

  async bulkUpdateUsers(payload) {
    const response = await apiClient.post('/api/admin/users/bulk-update', payload);
    return response.data.data;
  },

  async bulkRevokeUserSessions(userIds) {
    const response = await apiClient.post('/api/admin/users/bulk-revoke-sessions', { userIds });
    return response.data.data;
  },

  async deleteUserResume(userId, resumeId) {
    const response = await apiClient.delete(`/api/admin/users/${userId}/resumes/${resumeId}`);
    return response.data.data;
  },

  async deleteUserJobDescription(userId, jobDescriptionId) {
    const response = await apiClient.delete(`/api/admin/users/${userId}/job-descriptions/${jobDescriptionId}`);
    return response.data.data;
  },

  async getLlmAnalytics(params = {}) {
    const response = await apiClient.get('/api/admin/analytics/llm', { params });
    return response.data.data;
  },

  async getSystemSettings() {
    const response = await apiClient.get('/api/admin/settings');
    return response.data.data;
  },

  async updateSystemSettings(payload) {
    const response = await apiClient.patch('/api/admin/settings', payload);
    return response.data.data;
  },

  async getModels(providerOverride) {
    const params = providerOverride ? { provider: providerOverride } : {};
    const response = await apiClient.get('/api/admin/models', { params });
    return response.data.data;
  },
};
