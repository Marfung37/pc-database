import { createClient } from '@supabase/supabase-js';

// have supabase related environment variables?
if(!(process.env.PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error("Missing supabase url or private supabase key");
  process.exit(1);
}

export const supabaseAdmin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false, // Important for server-side/script usage
    autoRefreshToken: false,
  },
});
