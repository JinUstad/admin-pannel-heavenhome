import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// We use the anon key here for public read operations (like user facing things) 
// and in Next.js Server Components, we could use the service role key for admin privileges.
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

export const supabaseAdmin = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey)
  : null as any;
