let currentPage = 1;
const limit = 10;
let isLoading = false;
let hasMore = true;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser = JSON.parse(userStr);
    const currAvatar = document.getElementById('currUserAvatar');
    if (currAvatar) currAvatar.src = currentUser.profilePic;
    const currStoryAvatar = document.getElementById('currUserStoryAvatar');
    if (currStoryAvatar) currStoryAvatar.src = currentUser.profilePic;
  }

  if (typeof loadStories === 'function') {
    loadStories();
  }

  loadFeed(true);

  // Media preview logic
  const mediaInput = document.getElementById('postMedia');
  if (mediaInput) {
    mediaInput.addEventListener('change', function () {
      const file = this.files[0];
      const imgPreview = document.getElementById('mediaPreviewImage');
      const vidPreview = document.getElementById('mediaPreviewVideo');

      imgPreview.style.display = 'none';
      vidPreview.style.display = 'none';

      if (file) {
        if (file.type.startsWith('video/')) {
          vidPreview.src = URL.createObjectURL(file);
          vidPreview.style.display = 'block';
        } else if (file.type.startsWith('image/')) {
          imgPreview.src = URL.createObjectURL(file);
          imgPreview.style.display = 'block';
        }
      }
    });
  }

  document.getElementById('postContent')?.addEventListener('focus', () => {
    document.getElementById('expandPost').style.display = 'block';
  });

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadFeed(false));
  }
});

function updateCharCount() {
  const textarea = document.getElementById('postContent');
  const countDisplay = document.getElementById('charCount');
  if (!textarea || !countDisplay) return;

  const count = textarea.value.length;
  countDisplay.textContent = `${count} / 500`;

  if (count > 500) countDisplay.style.color = 'var(--error)';
  else countDisplay.style.color = 'var(--text-muted)';
}

async function handlePostSubmit(e) {
  e.preventDefault();
  const caption = document.getElementById('postContent').value;
  if (caption.length > 500) {
    showToast('Caption exceeds 500 characters', 'error');
    return;
  }

  setBtnLoading('postBtn', true);

  const form = document.getElementById('createPostForm');
  const formData = new FormData(form);

  try {
    const res = await fetchWithAuth('/posts', {
      method: 'POST',
      body: formData // sending FormData directly (multer will parse)
    });

    if (res.ok) {
      showToast('Posted successfully!', 'success');
      form.reset();
      document.getElementById('mediaPreviewImage').style.display = 'none';
      document.getElementById('mediaPreviewVideo').style.display = 'none';
      document.getElementById('expandPost').style.display = 'none';
      updateCharCount();
      loadFeed(true);
    } else {
      showToast('Failed to create post', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    setBtnLoading('postBtn', false);
  }
}

async function loadFeed(isReset = false) {
  if (isLoading || (!hasMore && !isReset)) return;
  isLoading = true;

  if (isReset) {
    currentPage = 1;
    hasMore = true;
    document.getElementById('feedList').innerHTML = `
      <div class="card post-card skeleton stagger-1" style="margin-bottom: var(--space-6);">
        <div style="display: flex; gap: 12px;"><div class="skeleton-avatar"></div><div style="flex:1"><div class="skeleton-text"></div><div class="skeleton-text" style="width: 30%;"></div></div></div>
        <div class="skeleton-text" style="margin-top: 16px;"></div><div class="skeleton-text"></div>
      </div>
    `;
  }

  try {
    const res = await fetchWithAuth(`/posts?page=${currentPage}&limit=${limit}`);
    const data = await res.json();

    if (res.ok) {
      if (isReset) document.getElementById('feedList').innerHTML = '';

      if (data.length === 0 && isReset) {
        document.getElementById('feedList').innerHTML = `
          <div class="card" style="text-align: center; padding: var(--space-8) var(--space-4);">
            <div style="font-size: 48px; color: var(--border-default); margin-bottom: var(--space-3);">📭</div>
            <h3 style="color: var(--text-secondary); margin-bottom: var(--space-2);">Your feed is empty</h3>
            <p style="color: var(--text-muted); font-size: var(--text-sm);">Follow some users to see their posts here!</p>
            <a href="/explore.html" class="btn btn-primary" style="margin-top: var(--space-4);">Explore Users</a>
          </div>
        `;
        hasMore = false;
      } else {
        if (data.length < limit) hasMore = false;

        let html = '';
        data.forEach(post => {
          html += generatePostHTML(post);
        });

        document.getElementById('feedList').insertAdjacentHTML('beforeend', html);
        currentPage++;
      }

      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';

    } else {
      showToast('Failed to load feed', 'error');
    }
  } catch (err) {
    console.error(err);
    if (isReset) document.getElementById('feedList').innerHTML = '<div class="card" style="text-align:center; padding:30px;">Error loading feed</div>';
  } finally {
    isLoading = false;
  }
}

function generatePostHTML(post) {
  const isOwner = post.userId === currentUser?.id;
  const verifiedBadge = post.user.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 14px; margin-left: 4px;"></i>' : '';

  let mediaHTML = '';
  if (post.mediaUrl) {
    if (post.mediaType === 'video') {
      mediaHTML = `<video src="${post.mediaUrl}" controls class="post-image"></video>`;
    } else {
      mediaHTML = `<img src="${post.mediaUrl}" class="post-image" loading="lazy" onclick="window.location.href='/post.html?id=${post.id}'">`;
    }
  }

  let locationHTML = post.location ? `<div style="font-size: 12px; color: var(--text-muted);"><i class="fas fa-map-marker-alt"></i> ${post.location}</div>` : '';

  return `
    <div class="card post-card page-enter stagger-2" id="post-${post.id}" style="margin-bottom: var(--space-6);">
      <div class="post-header">
        <div class="post-author" style="cursor: pointer;" onclick="window.location.href='/profile.html?id=${post.userId}'">
          <img src="${post.user.profilePic}" alt="Avatar" class="avatar" onerror="handleImageError(this)">
          <div>
            <div class="post-author-name">${post.user.username}${verifiedBadge}</div>
            ${locationHTML}
            <div class="post-time">${timeSince(new Date(post.createdAt))}</div>
          </div>
        </div>
        ${isOwner ? `
          <button class="action-btn" onclick="deletePost('${post.id}')"><i class="fas fa-trash" style="font-size: 14px;"></i></button>
        ` : ''}
      </div>
      
      <div class="post-content" onclick="this.classList.toggle('expanded')">${escapeHTML(post.caption)}</div>
      
      ${mediaHTML}
      
      <div class="post-actions">
        <button class="action-btn ${post.hasLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
          <i class="${post.hasLiked ? 'fas' : 'far'} fa-heart"></i>
          <span>${post.likeCount}</span>
        </button>
        <button class="action-btn" onclick="window.location.href='/post.html?id=${post.id}'">
          <i class="far fa-comment"></i>
          <span>${post.Comments ? post.Comments.length : 0}</span>
        </button>
      </div>
    </div>
  `;
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
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

function setBtnLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function toggleLike(postId, btnElem) {
  try {
    const res = await fetchWithAuth(`/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      const icon = btnElem.querySelector('i');
      const span = btnElem.querySelector('span');

      if (data.liked) {
        btnElem.classList.add('liked');
        icon.className = 'fas fa-heart';
      } else {
        btnElem.classList.remove('liked');
        icon.className = 'far fa-heart';
      }
      span.textContent = data.likeCount;
    }
  } catch (err) { }
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    const res = await fetchWithAuth(`/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      document.getElementById(`post-${postId}`).remove();
      showToast('Post deleted', 'success');
    }
  } catch (err) { }
}
