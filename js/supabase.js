// js/supabase.js
// Supabase Client Configuration with Enhanced Robustness

const SUPABASE_URL = 'https://tvdjnadwylhmdxoistuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2ZGpuYWR3eWxobWR4b2lzdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDU5MjAsImV4cCI6MjA5MDQyMTkyMH0.0_BKwcHgWvYw-g6axGjghnOKrW6H2C0SMCxv1cl6Yck';

(function() {
  // Check if the library is loaded from the CDN
  const lib = window.supabase;

  if (lib && typeof lib.createClient === 'function') {
    // Create the client instance
    const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Assign to a global variable for use in other scripts
    // This naming convention ('supabase') is used throughout data.js and app.js
    window.supabase = client;
    
    console.log("QwikDoc: Supabase client initialized effectively.");
  } else {
    console.error("QwikDoc Error: Supabase library not detected. Ensure the CDN script is loaded before initialization.");
  }
})();
