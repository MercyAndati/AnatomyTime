// frontend/src/config/index.ts
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
};

export default config;