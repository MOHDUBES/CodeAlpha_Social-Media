const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');
let currUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  currUser = JSON.parse(userStr);
  
  if (!postId) {
    window.location.href = '/feed.html';
    return;
  }

  loadPost();
});

async function loadPost() {
  try {
    const res = await fetchWithAuth(`/posts/${postId}`);
    if (res.ok) {
      const post = await res.json();
      renderPostSplit(post);
    } else {
      document.getElementById('postContainer').innerHTML = '<div style="text-align:center; padding: 40px;">Post not found</div>';
    }
  } catch (err) {}
}

function renderPostSplit(post) {
  const container = document.getElementById('postContainer');
  const verifiedBadge = post.user.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 14px; margin-left: 4px;"></i>' : '';
  
  let mediaHTML = '';
  if (post.mediaType === 'video') {
    mediaHTML = `<video src="${post.mediaUrl}" controls autoplay></video>`;
  } else if (post.mediaType === 'image') {
    mediaHTML = `<img src="${post.mediaUrl}" loading="lazy">`;
  } else {
    mediaHTML = `<div style="font-size: 24px; font-weight: 600; padding: 40px; text-align: center;">${escapeHTML(post.caption)}</div>`;
  }

  let locationHTML = post.location ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="fas fa-map-marker-alt"></i> ${post.location}</div>` : '';

  container.innerHTML = `
    <div class="split-post">
      <div class="split-media">
        ${mediaHTML}
      </div>
      
      <div class="split-sidebar">
        <!-- Header -->
        <div class="split-header">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.location.href='/profile.html?id=${post.user.id}'">
              <img src="${post.user.profilePic}" class="avatar avatar--sm" onerror="handleImageError(this)">
              <div>
                <div style="font-weight: 600;">${post.user.username}${verifiedBadge}</div>
                ${locationHTML}
              </div>
            </div>
            ${post.isOwner ? `<button class="btn btn-ghost btn-sm" onclick="deletePost()"><i class="fas fa-trash text-error"></i></button>` : ''}
          </div>
        </div>
        
        <!-- Comments Area -->
        <div class="split-comments" id="commentsList">
          <!-- Caption -->
          ${post.caption ? `
          <div class="comment-item">
            <img src="${post.user.profilePic}" class="avatar avatar--sm" onerror="handleImageError(this)">
            <div class="comment-content">
              <span style="font-weight: 600; cursor: pointer;" onclick="window.location.href='/profile.html?id=${post.user.id}'">${post.user.username}</span>
              <span style="margin-left: 4px;">${escapeHTML(post.caption)}</span>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${timeSince(new Date(post.createdAt))}</div>
            </div>
          </div>
          ` : ''}
          
          <div style="text-align: center; color: var(--text-muted); font-size: 12px; margin: 16px 0;">Loading comments...</div>
        </div>
        
        <!-- Footer Actions -->
        <div class="split-footer">
          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            <button class="action-btn ${post.hasLiked ? 'liked' : ''}" onclick="toggleLike(this)" style="font-size: 24px; padding: 0;">
              <i class="${post.hasLiked ? 'fas' : 'far'} fa-heart"></i>
            </button>
            <button class="action-btn" onclick="document.getElementById('commentInput').focus()" style="font-size: 24px; padding: 0;">
              <i class="far fa-comment"></i>
            </button>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;" id="likesCountText">${post.likeCount} likes</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 16px;">${timeSince(new Date(post.createdAt))}</div>
          
          <form id="commentForm" style="display: flex; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <input type="text" id="commentInput" placeholder="Add a comment..." style="flex: 1; background: none; border: none; color: var(--text-primary); outline: none;">
            <button type="submit" style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer;">Post</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('commentForm').addEventListener('submit', addComment);
  loadComments();
}

async function loadComments() {
  try {
    const res = await fetchWithAuth(`/posts/${postId}/comments`);
    if (res.ok) {
      const comments = await res.json();
      renderComments(comments);
    }
  } catch(e) {}
}

function renderComments(comments) {
  const list = document.getElementById('commentsList');
  
  // Keep the caption which is the first element, remove the rest
  const captionNode = list.firstElementChild;
  list.innerHTML = '';
  if (captionNode && captionNode.classList.contains('comment-item')) {
    list.appendChild(captionNode);
  }

  comments.forEach(c => {
    const isOwner = c.user.id === currUser.id;
    const verifiedBadge = c.user.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 12px; margin-left: 4px;"></i>' : '';
    
    // Parent Comment
    const commentHTML = `
      <div class="comment-item" id="comment-${c.id}">
        <img src="${c.user.profilePic}" class="avatar avatar--sm" style="cursor: pointer;" onclick="window.location.href='/profile.html?id=${c.user.id}'" onerror="handleImageError(this)">
        <div class="comment-content">
          <div>
            <span style="font-weight: 600; cursor: pointer;" onclick="window.location.href='/profile.html?id=${c.user.id}'">${c.user.username}${verifiedBadge}</span>
            <span style="margin-left: 4px;">${escapeHTML(c.text)}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px;">
            <span>${timeSince(new Date(c.createdAt))}</span>
            <span style="cursor: pointer; font-weight: 600;" onclick="replyTo('${c.id}', '${c.user.username}')">Reply</span>
            ${isOwner ? `<span style="cursor: pointer; color: var(--error);" onclick="deleteComment('${c.id}')"><i class="fas fa-trash"></i></span>` : ''}
          </div>
        </div>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', commentHTML);

    // Replies
    if (c.Replies && c.Replies.length > 0) {
      c.Replies.forEach(r => {
        const rOwner = r.user.id === currUser.id;
        const rVerified = r.user.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 12px; margin-left: 4px;"></i>' : '';
        const replyHTML = `
          <div class="comment-item" id="comment-${r.id}" style="margin-left: 32px; margin-top: -4px;">
            <img src="${r.user.profilePic}" class="avatar avatar--sm" style="width: 24px; height: 24px;" style="cursor: pointer;" onclick="window.location.href='/profile.html?id=${r.user.id}'" onerror="handleImageError(this)">
            <div class="comment-content">
              <div>
                <span style="font-weight: 600; font-size: 13px; cursor: pointer;" onclick="window.location.href='/profile.html?id=${r.user.id}'">${r.user.username}${rVerified}</span>
                <span style="margin-left: 4px; font-size: 13px;">${escapeHTML(r.text)}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px;">
                <span>${timeSince(new Date(r.createdAt))}</span>
                ${rOwner ? `<span style="cursor: pointer; color: var(--error);" onclick="deleteComment('${r.id}')"><i class="fas fa-trash"></i></span>` : ''}
              </div>
            </div>
          </div>
        `;
        list.insertAdjacentHTML('beforeend', replyHTML);
      });
    }
  });
}

let activeReplyId = null;

function replyTo(commentId, username) {
  activeReplyId = commentId;
  const input = document.getElementById('commentInput');
  input.value = `@${username} `;
  input.focus();
}

async function addComment(e) {
  e.preventDefault();
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetchWithAuth(`/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, parentId: activeReplyId })
    });
    if (res.ok) {
      input.value = '';
      activeReplyId = null;
      loadComments();
    }
  } catch(e) {}
}

async function deleteComment(commentId) {
  if (!confirm('Delete comment?')) return;
  try {
    const res = await fetchWithAuth(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) loadComments();
  } catch(e) {}
}

async function deletePost() {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetchWithAuth(`/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) window.location.href = '/feed.html';
  } catch (err) {}
}

async function toggleLike(btnElem) {
  try {
    const res = await fetchWithAuth(`/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      const icon = btnElem.querySelector('i');
      const likesText = document.getElementById('likesCountText');
      
      if (data.liked) {
        btnElem.classList.add('liked');
        icon.className = 'fas fa-heart';
      } else {
        btnElem.classList.remove('liked');
        icon.className = 'far fa-heart';
      }
      likesText.textContent = `${data.likeCount} likes`;
    }
  } catch (err) {}
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
