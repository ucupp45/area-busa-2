import axios from 'axios';

/**
 * Konfigurasi Global Axios Interceptor
 * 1. Otomatis menyisipkan Header Authorization: Bearer <token> pada setiap HTTP request
 * 2. Mengarahkan pengguna ke halaman /login jika token expired / ditolak (HTTP 401)
 */
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jangan redirect jika request berasal dari upaya login itu sendiri
      const isLoginRequest = error.config && error.config.url && error.config.url.includes('/api/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
