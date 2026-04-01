// js/app.js
// Core UI and application logic shared across pages

let currentUserData = null; // Store fetched user row
let _authResolve = null;
const _authReadyPromise = new Promise(resolve => { _authResolve = resolve; });

document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Sticky navbar with glassmorphism on scroll
  const header = document.getElementById('main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.classList.add('glass', 'shadow-sm');
        header.classList.remove('bg-white');
      } else {
        header.classList.remove('glass', 'shadow-sm');
        header.classList.add('bg-white');
      }
    });
  }

  // Initialize auth state
  try {
    updateAuthUI(); // Eagerly render default UI so it's not empty
    await AuthService.initAuth();
  } catch (e) {
    console.error("Auth initialization failed:", e);
  } finally {
    updateAuthUI(); // Update UI with correct state
  }
});

// Authentication Service
const AuthService = {
  ready: _authReadyPromise,

  initAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await AuthService.fetchUserMetadata(session.user.id);
    }
    _authResolve(); // Signal that auth is fully initialised

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) await AuthService.fetchUserMetadata(session.user.id);
        updateAuthUI();
      } else if (event === 'SIGNED_OUT') {
        currentUserData = null;
        updateAuthUI();
      }
    });
  },

  fetchUserMetadata: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!error && data) {
      currentUserData = data; // Includes role, name, email
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };
      
      // Fetch role manually to handle redirects immediately
      await AuthService.fetchUserMetadata(data.user.id);
      
      if (!currentUserData) {
        // If the trigger failed or user was created before the trigger, their public profile is missing.
        await supabase.auth.signOut();
        return { success: false, message: 'Profile incomplete. Please delete this account in Supabase and register again.'};
      }
      
      return { success: true, user: currentUserData };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.message || 'System error during login.' };
    }
  },

  signup: async (email, password, userData) => {
    try {
      // 1. Sign up user in Supabase Auth
      // The database trigger will handle inserting into users and doctors tables
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
            specialization: userData.specialization,
            city: userData.city,
            location: userData.location
          }
        }
      });
      
      if (error) return { success: false, message: error.message };
      if (!data || !data.user) return { success: false, message: 'Signup failed. User may already exist.' };

      await AuthService.fetchUserMetadata(data.user.id);
      return { success: true, user: currentUserData };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.message || 'System error during signup.' };
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  },

  getCurrentUser: () => {
    return currentUserData;
  },

  isAuthenticated: () => {
    return currentUserData !== null;
  }
};

// UI Helpers
function updateAuthUI() {
  const user = AuthService.getCurrentUser();
  const authContainer = document.getElementById('auth-menu-container');
  const mobileAuthContainer = document.getElementById('mobile-auth-container');
  
  if (!authContainer) return;

  if (user) {
    let dashboardLink = 'user-dashboard.html';
    if (user.role === 'doctor') dashboardLink = 'doctor-dashboard.html';

    const userHtml = `
      <div class="relative group cursor-pointer inline-flex items-center space-x-2">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
          ${user.name.charAt(0)}
        </div>
        <span class="text-sm font-medium text-slate-700">${user.name.split(' ')[0]}</span>
        
        <!-- Dropdown -->
        <div class="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div class="w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2">
            <a href="${dashboardLink}" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Dashboard</a>
            <button onclick="AuthService.logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </div>
    `;
    
    authContainer.innerHTML = userHtml;

    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = `
        <div class="border-t border-slate-100 pt-4 mt-4">
          <p class="px-4 text-sm font-medium text-slate-500 mb-2">Signed in as ${user.name}</p>
          <a href="${dashboardLink}" class="block px-4 py-2 text-base font-medium text-slate-900 hover:text-primary-600">Dashboard</a>
          <button onclick="AuthService.logout()" class="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:text-red-700">Logout</button>
        </div>
      `;
    }
  } else {
    // Logged out UI
    const defaultHtml = `
      <a href="login.html" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30">Book Appointment</a>
    `;
    authContainer.innerHTML = defaultHtml;

    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = `
        <a href="login.html" class="block w-full max-w-full px-4 py-3 mt-2 bg-primary-600 text-white text-center rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/30 box-border border-2 border-primary-600">Book Appointment</a>
      `;
    }
  }
}

// Toast notification helper
function showToast(message, type = 'success') {
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) { existingToast.remove(); }

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  
  toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-xl shadow-lg z-50 fade-in flex items-center space-x-3`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="text-white hover:text-slate-200">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}
