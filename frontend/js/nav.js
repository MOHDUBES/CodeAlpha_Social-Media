async function renderNavbar() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const user = JSON.parse(userStr);
  const path = window.location.pathname;

  let unreadCount = 0;
  try {
    const res = await fetchWithAuth('/notifications/unread-count');
    if (res.ok) {
      const data = await res.json();
      unreadCount = data.count;
    }
  } catch (err) {}
  
  const badgeHTML = unreadCount > 0 ? `<div class="notification-badge active" style="position: absolute; top: 12px; left: 24px;"></div>` : '';
  
  // Create Sidebar
  const sidebarHTML = `
    <aside class="sidebar">
      <a href="/feed.html" class="brand-logo">
        <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="url(#brandGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#833AB4"/>
              <stop offset="50%" stop-color="#E1306C"/>
              <stop offset="100%" stop-color="#F77737"/>
            </linearGradient>
          </defs>
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
        </svg>
        Loopline
      </a>
      
      <nav class="nav-menu">
        <a href="/feed.html" class="nav-item ${path.includes('feed') ? 'active' : ''}">
          <i class="fa${path.includes('feed') ? 's' : 'r'} fa-house nav-icon" style="font-size: 22px; width: 24px; text-align: center;"></i>
          <span>Home</span>
        </a>
        <a href="/explore.html" class="nav-item ${path.includes('explore') ? 'active' : ''}">
          <i class="fa${path.includes('explore') ? 's' : 's'} fa-search nav-icon" style="font-size: 22px; width: 24px; text-align: center;"></i>
          <span>Search</span>
        </a>
        <a href="/messages.html" class="nav-item ${path.includes('messages') ? 'active' : ''}">
          <i class="fa${path.includes('messages') ? 's' : 'r'} fa-paper-plane nav-icon" style="font-size: 22px; width: 24px; text-align: center;"></i>
          <span>Messages</span>
        </a>
        <a href="/reels.html" class="nav-item ${path.includes('reels') ? 'active' : ''}">
          <i class="fa${path.includes('reels') ? 's' : 's'} fa-film nav-icon" style="font-size: 22px; width: 24px; text-align: center;"></i>
          <span>Reels</span>
        </a>
        <a href="/notifications.html" class="nav-item ${path.includes('notifications') ? 'active' : ''}" style="position: relative;">
          <i class="fa${path.includes('notifications') ? 's' : 'r'} fa-heart nav-icon" style="font-size: 22px; width: 24px; text-align: center;"></i>
          <span>Notifications</span>
          ${badgeHTML}
        </a>
      </nav>
      
      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">

        <a href="/profile.html?id=${user.id}" class="nav-item ${(path.includes('profile') && window.location.search.includes(user.id)) ? 'active' : ''}">
          <img src="${user.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}" class="nav-icon" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: ${path.includes('profile') ? '2px solid var(--text-primary)' : '1px solid transparent'};" onerror="handleImageError(this)">
          <span style="${path.includes('profile') ? 'font-weight: 700;' : ''}">Profile</span>
        </a>
      </div>
    </aside>
  `;
  
  // Create Bottom Bar
  const bottombarHTML = `
    <nav class="bottom-bar">
      <div class="bottom-nav">
        <a href="/feed.html" class="bottom-nav-item ${path.includes('feed') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </a>
        <a href="/explore.html" class="bottom-nav-item ${path.includes('explore') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </a>
        <a href="/messages.html" class="bottom-nav-item ${path.includes('messages') ? 'active' : ''}">
          <i class="far fa-paper-plane" style="font-size: 20px;"></i>
        </a>
        <a href="/reels.html" class="bottom-nav-item ${path.includes('reels') ? 'active' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
        </a>
        <a href="/profile.html?id=${user.id}" class="bottom-nav-item ${(path.includes('profile') && window.location.search.includes(user.id)) ? 'active' : ''}" style="position: relative;">
          <img src="${user.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username}" alt="${user.username}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: ${(path.includes('profile') && window.location.search.includes(user.id)) ? '2px solid var(--text-primary)' : '2px solid transparent'};" onerror="handleImageError(this)">
          ${unreadCount > 0 ? `<div class="notification-badge active" style="top: -2px; right: 0px;"></div>` : ''}
        </a>
      </div>
    </nav>
  `;
  const mobileHeaderHTML = `
    <header class="mobile-top-bar">
      ${path.includes('profile') ? `
        <a href="/post.html" class="mobile-header-icon">
          <i class="fas fa-plus"></i>
        </a>
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px;">
          <i class="fas fa-lock" style="font-size: 12px;"></i>
          ${user.username}
          <i class="fas fa-chevron-down" style="font-size: 12px; margin-left: 2px;"></i>
        </div>
        <div style="display: flex; gap: 16px; align-items: center;">
          <a href="#" class="mobile-header-icon" onclick="showToast('Threads coming soon', 'info')">
            <i class="fas fa-at"></i>
          </a>
          <a href="/settings.html" class="mobile-header-icon">
            <i class="fas fa-bars"></i>
          </a>
        </div>
      ` : path.includes('reels') ? `
        <a href="/post.html" class="mobile-header-icon" style="font-size: 28px; font-weight: 300;">
          <i class="fas fa-plus"></i>
        </a>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px; font-weight: 700;">Reels</span>
          <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.8;"></i>
        </div>
        <a href="/notifications.html" class="mobile-header-icon" style="position: relative;">
          <i class="fas fa-camera"></i>
        </a>
      ` : `
        <a href="/messages.html" class="mobile-header-icon" style="${path.includes('messages') ? 'color: var(--accent);' : ''}">
          <i class="far fa-paper-plane"></i>
        </a>
        <a href="/feed.html" class="brand-logo" style="margin: 0; padding: 0; padding-top: 4px;">
          Loopline
        </a>
        <div style="display: flex; gap: 16px; align-items: center;">

          <a href="/notifications.html" class="mobile-header-icon" style="position: relative;">
            <i class="far fa-heart"></i>
            ${unreadCount > 0 ? `<div class="notification-badge active" style="top: -2px; right: -4px;"></div>` : ''}
          </a>
        </div>
      `}
    </header>
  `;

  const container = document.querySelector('.app-container');
  container.insertAdjacentHTML('afterbegin', mobileHeaderHTML);
  container.insertAdjacentHTML('afterbegin', sidebarHTML);
  container.insertAdjacentHTML('beforeend', bottombarHTML);
}

async function logout() {
  try {
    await fetchWithAuth('/auth/logout', { method: 'POST' });
  } catch(e) {}
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

// Global ripple effect listener
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.ripple-btn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty('--x', x + 'px');
    btn.style.setProperty('--y', y + 'px');
    
    btn.classList.remove('rippling');
    void btn.offsetWidth; // trigger reflow
    btn.classList.add('rippling');
  }
});

// Run renderNavbar on script load if not in login page
if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
  renderNavbar();
}
