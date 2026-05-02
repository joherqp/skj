import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseRequestTimeoutMs = Number(process.env.NEXT_PUBLIC_SUPABASE_REQUEST_TIMEOUT_MS || '30000');
const supabaseStorageKey = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || 'cvskj-auth-token';

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

const getSupabaseToken = async () => {
  if (typeof window === 'undefined') return null;
  if (cachedToken) return cachedToken;
  
  if (!tokenPromise) {
    tokenPromise = fetch('/api/auth/supabase-token')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.token) {
          cachedToken = data.token;
          return data.token;
        }
        return null;
      })
      .catch((e) => {
        console.error("Error fetching supabase token:", e);
        return null;
      })
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
};

const timeoutFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), supabaseRequestTimeoutMs);
  const externalSignal = init.signal;

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
      throw new Error('Request aborted');
    }
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const token = await getSupabaseToken();
    if (token) {
      if (init.headers instanceof Headers) {
        init.headers.set('Authorization', `Bearer ${token}`);
      } else if (Array.isArray(init.headers)) {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        init.headers = headers;
      } else {
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${token}`
        };
      }
    }

    return await fetch(input, { 
      ...init, 
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: timeoutFetch as typeof fetch,
  },
  auth: {
    persistSession: true,
    storageKey: supabaseStorageKey,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper types for database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          nama: string;
          email: string;
          telepon: string;
          roles: string[];
          cabang_id: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      // Add more table types as needed
    };
  };
};
