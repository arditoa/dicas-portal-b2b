export className Config {
  static API_BASE_URL = 
    import.meta.env?.VITE_API_URL || 
    process.env.NEXT_PUBLIC_API_URL || 
    'https://dicas-portal-backend.onrender.com/api';
}
