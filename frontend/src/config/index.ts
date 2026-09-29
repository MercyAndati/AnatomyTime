const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  // Master Feature Flag for AI Generation, change to 'true'for ai geration to resume
  isAiEnabled: true,
};

export default config;