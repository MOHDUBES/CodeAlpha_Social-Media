const urlParams = new URLSearchParams(window.location.search);
const profileId = urlParams.get('id');
let isOwner = false;
let profileUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const currUser = JSON.parse(userStr);
  isOwner = currUser.id === profileId;
  
  if (isOwner) {
    document.getElementById('editProfileBtn').style.display = 'flex';
    document.getElementById('shareProfileBtn').style.display = 'flex';
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.style.display = 'flex';
    document.getElementById('avatarUploadBtn').style.display = 'flex';
  } else {
    // Hide Edit/Share for other users and replace with Message/Follow
    const btnContainer = document.getElementById('profileActionBtnContainer');
    btnContainer.innerHTML = `
      <button class="profile-action-btn" onclick="window.location.href='/messages.html'">Message</button>
      <button id="followBtn" class="profile-action-btn primary" onclick="toggleFollow()">Follow</button>
      <button class="icon-btn-small" onclick="showToast('Discover coming soon', 'info')"><i class="fas fa-user-plus"></i></button>
    `;
  }

  loadProfile();

  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('editFullName').value;
    const bio = document.getElementById('editBio').value;
    
    try {
      const res = await fetchWithAuth('/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, bio })
      });
      if (res.ok) {
        showToast('Profile updated', 'success');
        closeEditModal();
        loadProfile();
      }
    } catch(err) {}
  });
});

async function loadProfile() {
  try {
    const res = await fetchWithAuth(`/users/${profileId}`);
    if (res.ok) {
      const data = await res.json();
      profileUser = data.user;
      
      document.getElementById('fName').textContent = profileUser.fullName || profileUser.username;
      // document.getElementById('uName').textContent = profileUser.username; // Moved to nav header
      document.getElementById('profileBio').textContent = profileUser.bio || '';
      document.getElementById('postsCount').textContent = data.posts ? data.posts.length : 0;
      document.getElementById('followersCount').textContent = data.followersCount;
      document.getElementById('followingCount').textContent = data.followingCount;
      document.getElementById('profileAvatar').src = profileUser.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
      
      if (profileUser.isVerified) {
        document.getElementById('fName').innerHTML += ' <i class="fas fa-check-circle text-accent" style="font-size: 14px;"></i>';
      }

      if (!isOwner) {
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
          if (data.isFollowing) {
            followBtn.classList.remove('primary');
            followBtn.textContent = 'Following';
            followBtn.style.background = 'var(--bg-hover)';
            followBtn.style.color = 'var(--text-primary)';
          } else {
            followBtn.classList.add('primary');
            followBtn.textContent = 'Follow';
            followBtn.style.background = '#0095f6';
            followBtn.style.color = 'white';
          }
        }
      }

      renderGrid(data.posts);
    } else {
      showToast('Profile not found', 'error');
    }
  } catch (err) {}
}

function renderGrid(posts) {
  const grid = document.getElementById('profileGrid');
  const emptyState = document.getElementById('emptyPostsState');
  
  if (!posts || posts.length === 0) {
    grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  grid.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';


  let html = '';
  posts.forEach(post => {
    let mediaContent = '';
    if (post.mediaType === 'video') {
      mediaContent = `<video src="${post.mediaUrl}" muted></video><div style="position:absolute; top:8px; right:8px; color:white; text-shadow:0 1px 3px rgba(0,0,0,0.5);"><i class="fas fa-video"></i></div>`;
    } else if (post.mediaType === 'image') {
      mediaContent = `<img src="${post.mediaUrl}" loading="lazy">`;
    } else {
      // Text post representation
      mediaContent = `<div style="width:100%; height:100%; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; padding:16px; text-align:center; font-size:12px;">${escapeHTML(post.caption)}</div>`;
    }

    html += `
      <div class="grid-item" onclick="window.location.href='/post.html?id=${post.id}'">
        ${mediaContent}
        <div class="grid-overlay">
          <span><i class="fas fa-heart"></i> ${post.likeCount || 0}</span>
          <span><i class="fas fa-comment"></i> ${post.commentCount || 0}</span>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
}

async function uploadImage(type) {
  const input = document.getElementById(type + 'Input');
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetchWithAuth(`/users/me/${type}`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      showToast('Image updated!', 'success');
      loadProfile();
      
      // Update local storage if avatar changed
      if (type === 'avatar') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const data = await res.json();
          user.profilePic = data.profilePic;
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
    }
  } catch(e) {}
  
  input.value = '';
}

async function toggleFollow() {
  const followBtn = document.getElementById('followBtn');
  const isFollowing = followBtn.textContent === 'Unfollow';
  
  try {
    const res = await fetchWithAuth(`/users/${profileId}/${isFollowing ? 'unfollow' : 'follow'}`, { method: 'POST' });
    if (res.ok) {
      loadProfile();
    }
  } catch(e) {}
}

function openEditModal() {
  document.getElementById('editFullName').value = profileUser.fullName || '';
  document.getElementById('editBio').value = profileUser.bio || '';
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function openFollowers() {
  document.getElementById('usersModalTitle').textContent = 'Followers';
  document.getElementById('usersModal').classList.add('active');
  const list = document.getElementById('usersModalList');
  list.innerHTML = '<div style="text-align:center; padding:20px;">Loading...</div>';
  
  try {
    const res = await fetchWithAuth(`/users/${profileId}/followers`);
    const users = await res.json();
    renderUsersList(users, list);
  } catch(e) {}
}

async function openFollowing() {
  document.getElementById('usersModalTitle').textContent = 'Following';
  document.getElementById('usersModal').classList.add('active');
  const list = document.getElementById('usersModalList');
  list.innerHTML = '<div style="text-align:center; padding:20px;">Loading...</div>';
  
  try {
    const res = await fetchWithAuth(`/users/${profileId}/following`);
    const users = await res.json();
    renderUsersList(users, list);
  } catch(e) {}
}

function closeUsersModal() {
  document.getElementById('usersModal').classList.remove('active');
}

function renderUsersList(users, container) {
  if (users.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No users found</div>';
    return;
  }
  
  let html = '';
  users.forEach(u => {
    html += `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border-subtle); cursor:pointer;" onclick="window.location.href='/profile.html?id=${u.id}'">
        <img src="${u.profilePic}" class="avatar avatar--sm" onerror="handleImageError(this)">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:14px;">${u.username} ${u.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 12px;"></i>' : ''}</div>
          <div style="font-size:12px; color:var(--text-muted);">${escapeHTML(u.fullName)}</div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}
