import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://brhegcxnzniosyibbufs.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaGVnY3huem5pb3N5aWJidWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjU3ODQsImV4cCI6MjEwMDM0MTc4NH0.IzYWNsQWi3SCZIKgKl91-jxKHunAsm1jE7TSbYBP5Ew";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);
