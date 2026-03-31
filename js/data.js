// js/data.js
// Supabase Data Service
// Note: Requires supabase.js to be loaded first

const DataService = {
  getDoctors: async () => {
    // Also fetch doctor_clinic_links (venues) to filter out doctors without clinics
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, specialization, experience, consultation_fee, rating, image, city, availability, doctor_venues:doctor_clinic_links(clinic:clinics(name, pin))')
      .order('rating', { ascending: false });
    
    if (error) {
      console.error('Error fetching doctors:', error);
      return [];
    }
    
    // Filter out doctors who have no registered clinics linked
    return data.filter(doc => doc.doctor_venues && doc.doctor_venues.length > 0);
  },
  
  getDoctorById: async (id) => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, venues:doctor_clinic_links(*, clinic:clinics(*))')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching doctor:', error);
      return null;
    }
    return data;
  },

  getCategories: () => {
    // Statics categories for the UI
    return [
      { name: "General Physician", icon: "🩺" },
      { name: "Dentist", icon: "🦷" },
      { name: "Dermatologist", icon: "✨" },
      { name: "Pediatrician", icon: "🧸" },
      { name: "Cardiologist", icon: "🫀" },
      { name: "Orthopedic", icon: "🦴" }
    ];
  },

  saveBooking: async (booking) => {
    // Generate a unique 4-digit appointment number
    const apptNum = Math.floor(1000 + Math.random() * 9000);
    booking.appointment_number = apptNum;

    const { data, error } = await supabase
      .from('appointments')
      .insert([booking])
      .select();
      
    if (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
    return data[0];
  },

  getUserBookings: async (userId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(*), clinic:clinics(*)')
      .eq('patient_id', userId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
    
    // Map to frontend expectations
    return data.map(b => ({
      ...b,
      doctorName: b.doctor?.name || 'Dr. Unknown',
      doctorImage: b.doctor?.image || 'https://via.placeholder.com/150',
      doctorSpecialty: b.doctor?.specialization || 'Healthcare Provider'
    }));
  },

  getDoctorBookings: async (doctorId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, clinic:clinics(*)')
      .eq('doctor_id', doctorId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching doctor bookings:', error);
      return [];
    }
    
    // Map to frontend expectations
    return data.map(b => ({
      ...b,
      patientName: b.patient_name,
      patientEmail: b.patient_email,
      patientPhone: b.patient_phone
    }));
  },

  getSystemStats: async () => {
    // Optimization: Parallelized counts and targeted list fetching
    const [docsCount, patientsCount, apptsCount, recentDocs, recentAppts] = await Promise.all([
      supabase.from('doctors').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('doctors').select('id, name, specialization').limit(10),
      supabase.from('appointments').select('id, patient_name, date, status, doctor_id').order('created_at', { ascending: false }).limit(10)
    ]);
    
    return {
      docCount: docsCount.count || 0,
      patientCount: patientsCount.count || 0,
      apptCount: apptsCount.count || 0,
      doctors: recentDocs.data || [], 
      patients: [], // Patients list not currently used in a table
      appointments: recentAppts.data || []
    };
  },
  
  updateAppointmentStatus: async (appointmentId, status) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: status })
      .eq('id', appointmentId);
      
    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
    return true;
  },
  
  updateDoctorProfile: async (doctorId, updates) => {
    const { error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', doctorId);
      
    if (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
    return true;
  },

  // Venue Management (Legacy compatibility removed in favor of doctor_clinic_links)

  // Clinic Management
  getClinics: async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Error fetching clinics:', error);
      return [];
    }
    return data;
  },

  saveClinic: async (clinic) => {
    // Upsert clinic data including password
    const { data, error } = await supabase
      .from('clinics')
      .upsert([clinic], { onConflict: 'email' })
      .select();
      
    if (error) {
      console.error('Error saving clinic:', error.message, error);
      throw error;
    }
    return data[0];
  },

  loginClinic: async (email, password) => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
      
    if (error || !data) {
      console.error('Clinic login failed:', error);
      throw new Error('Invalid email or password');
    }
    return data;
  },

  getClinicById: async (id) => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching clinic:', error);
      return null;
    }
    return data;
  },

  // Doctor-Clinic Links (Venues)
  getDoctorClinics: async (doctorId) => {
    const { data, error } = await supabase
      .from('doctor_clinic_links')
      .select('*, clinic:clinics(*)')
      .eq('doctor_id', doctorId);
      
    if (error) {
      console.error('Error fetching doctor clinics:', error);
      return [];
    }
    return data;
  },

  linkDoctorToClinic: async (linkData) => {
    // linkData: { doctor_id, clinic_id, schedule }
    const { data, error } = await supabase
      .from('doctor_clinic_links')
      .upsert([linkData], { onConflict: 'doctor_id,clinic_id' })
      .select();
      
    if (error) {
      console.error('Error linking doctor to clinic:', error.message, error);
      if (error.code === '42501') {
        throw new Error('Permission denied. Please ensure RLS policies are enabled on doctor_clinic_links table.');
      }
      throw error;
    }
    return data[0];
  },

  removeDoctorFromClinic: async (linkId) => {
    const { error } = await supabase
      .from('doctor_clinic_links')
      .delete()
      .eq('id', linkId);
      
    if (error) {
      console.error('Error removing doctor from clinic:', error);
      throw error;
    }
    return true;
  },

  getClinicAppointments: async (clinicId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(*)')
      .eq('clinic_id', clinicId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching clinic appointments:', error);
      return [];
    }

    // Map to frontend expectations
    return data.map(b => ({
      ...b,
      patientName: b.patient_name,
      patientEmail: b.patient_email,
      patientPhone: b.patient_phone,
      doctorName: b.doctor?.name || 'Unknown Doctor'
    }));
  },

  // Clinic Dashboard: doctors linked as venues
  getClinicLinkedDoctors: async (clinicId) => {
    const { data, error } = await supabase
      .from('doctor_clinic_links')
      .select('id, doctor_id, schedule, doctor:doctors(*)')
      .eq('clinic_id', clinicId);

    if (error) {
      console.error('Error fetching clinic-linked doctors:', error);
      return [];
    }

    return data.map(link => ({
      link_id: link.id,
      doctor_id: link.doctor_id,
      doctorName: link.doctor?.name || 'Unknown Doctor',
      doctorImage: link.doctor?.image || 'https://via.placeholder.com/80',
      doctorSpecialization: link.doctor?.specialization || '',
      doctorCity: link.doctor?.city || '',
      doctorConsultationFee: link.doctor?.consultation_fee || 0,
      schedule: link.schedule
    }));
  },

  // Clinic Dashboard: appointments filtered by doctor
  getClinicAppointmentsByDoctor: async (clinicId, doctorId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctor:doctors(*)')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching clinic appointments by doctor:', error);
      return [];
    }

    return data.map(b => ({
      ...b,
      patientName: b.patient_name,
      patientEmail: b.patient_email,
      patientPhone: b.patient_phone,
      doctorName: b.doctor?.name || 'Unknown Doctor'
    }));
  }
};
