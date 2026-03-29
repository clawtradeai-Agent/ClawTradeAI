'use client';

import { useAuth as useAuthStore } from '../stores/authStore';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  const signIn = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user, token } = response.data;
      login(user, token);

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        username,
      });

      const { user, token } = response.data;
      login(user, token);

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  const logOut = () => {
    logout();
    delete axios.defaults.headers.common['Authorization'];
  };

  return {
    user,
    token,
    isAuthenticated,
    login: signIn,
    logout: logOut,
    signUp,
  };
}
