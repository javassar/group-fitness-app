import type { DataClient } from './types';
import { MockDataClient } from './mockClient';

export function isMockMode(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const useMock = import.meta.env.VITE_USE_MOCK;
  return useMock === 'true' || !url || !anonKey;
}

// In Milestone 1, this always builds a MockDataClient.
// Milestone 2 will integrate the Supabase client when credentials are present.
export function createDataClient(passcode: string): DataClient {
  return new MockDataClient(passcode);
}
