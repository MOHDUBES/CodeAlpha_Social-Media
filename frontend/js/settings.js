document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  
  const user = JSON.parse(userStr);
  
  // Populate sidebar user details
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarUsername = document.getElementById('sidebarUsername');
  
  if (sidebarAvatar && user.profilePic) {
    sidebarAvatar.src = user.profilePic;
  }
  if (sidebarUsername && user.username) {
    sidebarUsername.textContent = '@' + user.username;
  }
});

async function logout() {
  try {
    const res = await fetchWithAuth('/auth/logout', { method: 'POST' });
    if (res.ok) {
      localStorage.removeItem('user');
      window.location.href = '/index.html';
    } else {
      showToast('Logout failed', 'error');
    }
  } catch (err) {
    console.error(err);
    // Fallback if server is unreachable
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  }
}
