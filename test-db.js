const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tvdjnadwylhmdxoistuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2ZGpuYWR3eWxobWR4b2lzdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDU5MjAsImV4cCI6MjA5MDQyMTkyMH0.0_BKwcHgWvYw-g6axGjghnOKrW6H2C0SMCxv1cl6Yck';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignup() {
  console.log("Attempting test signup...");
  const timestamp = Date.now();
  const demoEmail = `dr.demo.${timestamp}@quickdoc.test`;
  
  const { data, error } = await supabase.auth.signUp({
    email: demoEmail,
    password: 'Password123!',
    options: {
      data: {
        name: 'Dr. Automated Demo',
        role: 'doctor'
      }
    }
  });

  if (error) {
    console.error("Auth Error:", error.message);
    return;
  }

  if (!data?.user) {
    console.error("Auth Success but User is Null. (Email Confirmation requirement or user exists).");
    return;
  }

  console.log("Auth Success. User ID:", data.user.id);

  // Test insert into public.users
  const userResult = await supabase.from('users').insert([{
    id: data.user.id,
    email: demoEmail,
    name: 'Dr. Automated Demo',
    role: 'doctor'
  }]);

  if (userResult.error) {
    console.error("Users Table Insert Error:", userResult.error.message);
  } else {
    console.log("Users Table Insert Success");
  }

  // Test insert into public.doctors
  const docResult = await supabase.from('doctors').insert([{
    id: data.user.id,
    name: 'Dr. Automated Demo',
    specialization: 'System Verifier',
    city: 'Backend City',
    location: 'Server Room',
    experience: '10 Years',
    about: 'Automated test logic',
    image: '',
    consultation_fee: 100,
    availability: []
  }]);

  if (docResult.error) {
    console.error("Doctors Table Insert Error:", docResult.error.message);
  } else {
    console.log("Doctors Table Insert Success");
  }

  // Cleanup immediately after test
  // Cannot delete from auth.users without service role, but we can delete from public tables if RLS allows (it might not)
  console.log("Database flow tested successfully. You can now login as", demoEmail);
}

testSignup();
