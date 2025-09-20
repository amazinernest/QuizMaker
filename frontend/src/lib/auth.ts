import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'TUTOR' | 'STUDENT';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'TUTOR' | 'STUDENT';
}

export const authService = {
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/login', data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Login failed');
    }
    
    const { user, token } = response.data.data;
    
    // Store token in cookie
    Cookies.set('token', token, { expires: 7 }); // 7 days
    
    return { user, token };
  },

  async register(data: RegisterData): Promise<{ user: User; token?: string; requiresEmailVerification?: boolean }> {
    const response = await api.post('/auth/register', data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Registration failed');
    }
    
    const responseData = response.data.data;
    
    // Only store token if email verification is not required
    if (responseData.token && !responseData.requiresEmailVerification) {
      Cookies.set('token', responseData.token, { expires: 7 }); // 7 days
    }
    
    return {
      user: responseData.user,
      token: responseData.token,
      requiresEmailVerification: responseData.requiresEmailVerification
    };
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data.data.user;
  },

  logout() {
    Cookies.remove('token');
    window.location.href = '/login';
  },

  getToken(): string | undefined {
    return Cookies.get('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export { api };