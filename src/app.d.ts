import { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      getSafeSession(): Promise<{
        session: Session | null;
        user: User | null;
        user_id: string | null;
      }>;
    }
    interface PageData {
      session: Session | null;
      user: User | null;
    }
    // interface Error {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
