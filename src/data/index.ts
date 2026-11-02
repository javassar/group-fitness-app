import type { DataClient } from './types';
import { MockDataClient } from './mockClient';
import { SupabaseDataClient } from './supabaseClient';

export function isMockMode(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const useMock = import.meta.env.VITE_USE_MOCK;
  return useMock === 'true' || !url || !anonKey;
}

export function createDataClient(passcode: string): DataClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isMockMode()) {
    return new MockDataClient(passcode);
  }

  return new SupabaseDataClient(url, anonKey, passcode);
}
