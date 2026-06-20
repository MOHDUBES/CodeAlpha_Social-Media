const API_URL = '/api';

async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('token');
  
  if (!options.headers) {
    options.headers = {};
  }
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  options.credentials = 'include';

  try {
    let response = await fetch(`${API_URL}${url}`, options);
    
    // Auto refresh token
    if (response.status === 401 && !options._retry) {
      options._retry = true;
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('token', data.token);
          options.headers['Authorization'] = `Bearer ${data.token}`;
          response = await fetch(`${API_URL}${url}`, options);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/index.html';
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type} animate-toast`;
  toast.innerHTML = `
    <span>${message}</span>
    <div class="toast-progress"></div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Theme Handling
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Wait for DOM content
  document.addEventListener('DOMContentLoaded', updateThemeIcons);
  // Also run immediately in case DOM is already loaded
  updateThemeIcons();
}

function updateThemeIcons() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.querySelectorAll('.fa-moon, .fa-sun').forEach(icon => {
    if (theme === 'light') {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcons();
}

initTheme();

// Utility: fallback image
function handleImageError(img) {
  img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
}
