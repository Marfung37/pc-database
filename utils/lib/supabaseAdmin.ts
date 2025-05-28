import { createClient } from '@supabase/supabase-js';

if(!(process.env.PUBLIC_SUPABASE_URL && process.env.PUBLIC_SUPABASE_ANON_KEY)) {
  console.error("Missing supabase url and anon key");
  process.exit(1);
}

export const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Important for server-side/script usage
    autoRefreshToken: false,
  },
});
