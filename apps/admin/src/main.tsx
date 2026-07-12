import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createSupabaseClient } from '@transitops/shared';

// Initialize Supabase client once at app startup
createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
