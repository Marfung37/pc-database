import { createClient } from '@supabase/supabase-js';
// import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// DEBUG
const PUBLIC_SUPABASE_URL = 'https://xlixeudymsirbbbdgjwm.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXhldWR5bXNpcmJiYmRnandtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjg5ODAsImV4cCI6MjA2MjkwNDk4MH0.RN0e2eGnRuO9WwpZMdPxvh5dH8jZ0CkzH-vqvV9XcYo';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
