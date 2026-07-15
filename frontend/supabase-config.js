window.SUPABASE_URL = 'https://wkxtvfuwzedafezmuqxz.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHR2ZnV3emVkYWZlem11cXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDYzMzEsImV4cCI6MjA5OTU4MjMzMX0.XQr1n9j9aK3QCrMcIjooId0It0_efOiCmYtqmdNCOns';

window.supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
