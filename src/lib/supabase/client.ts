'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabasePublicCredentials } from './env';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabase() {
  if (!client) {
    const { url, anonKey } = requireSupabasePublicCredentials();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
