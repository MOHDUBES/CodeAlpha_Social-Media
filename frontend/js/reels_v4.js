document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  
  const user = JSON.parse(userStr);
  const avatarEl = document.getElementById('currentUserAvatar');
  if (avatarEl && user.profilePic) {
    avatarEl.src = user.profilePic;
  }
  
  loadReels();
});

let reels = [];
let observer;

async function loadReels() {
  const container = document.getElementById('reelsContainer');
  try {
    const res = await fetchWithAuth('/posts/reels?limit=20');
    if (res.ok) {
      reels = await res.json();
      if (reels.length === 0) {
        container.innerHTML = `<div style="height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">No reels available. Upload a video post to see it here!</div>`;
        return;
      }
      renderReels();
      setupObserver();
    }
  } catch (err) {
    container.innerHTML = `<div style="height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--error);">Failed to load reels.</div>`;
  }
}

function renderReels() {
  const container = document.getElementById('reelsContainer');
  let html = '';
  
  reels.forEach((reel, index) => {
    let mediaHTML = '';
    let topControls = '';
    
    if (reel.mediaType === 'video' && reel.mediaUrl) {
      mediaHTML = `
        <video class="reel-video" src="${reel.mediaUrl}" loop playsinline data-index="${index}" onclick="togglePlay(this)" ondblclick="likeReel(event, '${reel.id}')"></video>
        <div class="progress-container">
          <div class="progress-bar"></div>
        </div>
      `;
      topControls = ''; // Removing top controls for authentic Instagram look
    } else if (reel.mediaType === 'image' && reel.mediaUrl) {
      mediaHTML = `<img src="${reel.mediaUrl}" style="width: 100%; height: 100%; object-fit: contain; background: #000;" ondblclick="likeReel(event, '${reel.id}')">`;
    } else {
      mediaHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 30px; text-align: center; font-size: 24px; font-weight: 600; background: linear-gradient(135deg, var(--bg-surface), var(--bg-base));" ondblclick="likeReel(event, '${reel.id}')">${escapeHTML(reel.caption || '')}</div>`;
    }

    html += `
      <div class="reel-container" data-id="${reel.id}">
        ${mediaHTML}

        <div class="top-controls" style="display: none;">
        </div>

        <i class="fas fa-play play-icon"></i>
        <i class="fas fa-heart heart-animation"></i>
        
        <div class="reel-overlay">
          <div class="reel-info" style="margin-bottom: 12px;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="window.location.href='/profile.html?id=${reel.user.id}'">
              @${reel.user.username} ${reel.user.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 14px;"></i>' : ''}
              <button class="btn btn-outline" style="padding: 2px 10px; font-size: 12px; height: 26px; border-color: white; color: white; border-radius: 13px;">Subscribe</button>
            </div>
            <div style="font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.8); line-height: 1.4;">${escapeHTML(reel.caption || '')}</div>
          </div>
          
          <div class="reel-actions">
            <div class="reel-action-wrapper">
              <button class="reel-action-btn ${reel.hasLiked ? 'liked' : ''}" style="background: transparent;" onclick="toggleLikeReel('${reel.id}', this.parentElement)">
                <i class="${reel.hasLiked ? 'fas' : 'far'} fa-heart" style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>
              </button>
              <span>${reel.likeCount || 0}</span>
            </div>
            
            <div class="reel-action-wrapper">
              <button class="reel-action-btn" style="background: transparent;" onclick="openCommentsModal('${reel.id}')">
                <i class="far fa-comment" style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>
              </button>
              <span>${reel.Comments ? reel.Comments.length : 0}</span>
            </div>

            <div class="reel-action-wrapper">
              <button class="reel-action-btn" style="background: transparent;" onclick="shareReel('${reel.id}')">
                <i class="far fa-paper-plane" style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>
              </button>
              <span>Share</span>
            </div>
            
            <div class="reel-action-wrapper">
              <button class="reel-action-btn" style="background: transparent;" onclick="showToast('More options coming soon', 'info')">
                <i class="fas fa-ellipsis-v" style="font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>
              </button>
            </div>

            <div class="reel-action-wrapper" style="margin-top: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #fff; padding: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.5); overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${reel.user.profilePic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" onerror="handleImageError(this)">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function setupObserver() {
  const videos = document.querySelectorAll('.reel-video');
  
  videos.forEach(video => {
    video.addEventListener('timeupdate', () => {
      const progressBar = video.parentElement.querySelector('.progress-bar');
      if (progressBar && video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        progressBar.style.width = percentage + '%';
      }
    });
  });
  
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      const playIcon = video.parentElement.querySelector('.play-icon');
      
      if (entry.isIntersecting) {
        // Video is in view, play it
        if (video && video.tagName === 'VIDEO') {
          video.play().catch(e => console.log('Autoplay prevented by browser:', e));
        }
        if(playIcon) playIcon.classList.remove('visible');
      } else {
        // Video out of view, pause it
        if (video && video.tagName === 'VIDEO') {
          video.pause();
        }
        // video.currentTime = 0; // Optional reset
      }
    });
  }, {
    threshold: 0.6 // Trigger when 60% of the video is visible
  });
  
  videos.forEach(video => observer.observe(video));
}

function togglePlay(video) {
  const playIcon = video.parentElement.querySelector('.play-icon');
  const topPlayBtn = video.parentElement.querySelector('.top-controls-left button i.fa-play, .top-controls-left button i.fa-pause');
  
  if (video.paused) {
    video.play();
    playIcon.classList.remove('visible');
    if (topPlayBtn) { topPlayBtn.classList.remove('fa-play'); topPlayBtn.classList.add('fa-pause'); }
  } else {
    video.pause();
    playIcon.classList.add('visible');
    if (topPlayBtn) { topPlayBtn.classList.remove('fa-pause'); topPlayBtn.classList.add('fa-play'); }
  }
}

function toggleMute(video, btn) {
  video.muted = !video.muted;
  const icon = btn.querySelector('i');
  if (video.muted) {
    icon.classList.remove('fa-volume-up');
    icon.classList.add('fa-volume-mute');
  } else {
    icon.classList.remove('fa-volume-mute');
    icon.classList.add('fa-volume-up');
  }
}

async function toggleLikeReel(postId, wrapperElem) {
  const btn = wrapperElem.querySelector('.reel-action-btn');
  try {
    const res = await fetchWithAuth(`/posts/${postId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const icon = btn.querySelector('i');
      const countSpan = wrapperElem.querySelector('.like-count');
      
      if (data.liked) {
        btn.classList.add('liked');
        icon.classList.remove('far');
        icon.classList.add('fas');
      } else {
        btn.classList.remove('liked');
        icon.classList.remove('fas');
        icon.classList.add('far');
      }
      countSpan.textContent = data.likeCount;
    }
  } catch(e) {}
}

async function likeReel(e, postId) {
  const video = e.target;
  const container = video.parentElement;
  
  // Show heart animation
  const heart = container.querySelector('.heart-animation');
  
  // Position heart at click location
  const rect = video.getBoundingClientRect();
  const x = e.clientX - rect.left - 50; 
  const y = e.clientY - rect.top - 50;
  
  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;
  heart.style.animation = 'none';
  void heart.offsetWidth; // trigger reflow
  heart.style.animation = 'likeHeartAnim 1s ease-out forwards';
  
  // Actually like it via API if not liked
  const wrapperBtn = container.querySelector('.reel-action-btn:first-child');
  const wrapperElem = wrapperBtn.parentElement;
  if (!wrapperBtn.classList.contains('liked')) {
    await toggleLikeReel(postId, wrapperElem);
  }
}

function shareReel(postId) {
  const url = `${window.location.origin}/post.html?id=${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard!', 'success');
  });
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

// Comments Modal Logic
let currentReelIdForComments = null;

async function openCommentsModal(postId) {
  currentReelIdForComments = postId;
  const overlay = document.getElementById('commentsOverlay');
  const sheet = document.getElementById('commentsSheet');
  const list = document.getElementById('commentsList');
  
  overlay.classList.add('active');
  sheet.classList.add('active');
  
  list.innerHTML = '<div style="text-align:center; color:#888; margin-top: 20px;">Loading comments...</div>';
  
  try {
    const res = await fetchWithAuth(`/posts/${postId}/comments`);
    if (res.ok) {
      const comments = await res.json();
      renderCommentsList(comments);
    } else {
      list.innerHTML = '<div style="text-align:center; color:var(--error); margin-top: 20px;">Failed to load comments</div>';
    }
  } catch (err) {
    list.innerHTML = '<div style="text-align:center; color:var(--error); margin-top: 20px;">Error loading comments</div>';
  }
}

function closeCommentsModal() {
  const overlay = document.getElementById('commentsOverlay');
  const sheet = document.getElementById('commentsSheet');
  
  overlay.classList.remove('active');
  sheet.classList.remove('active');
  currentReelIdForComments = null;
}

function renderCommentsList(comments) {
  const list = document.getElementById('commentsList');
  const countSpan = document.getElementById('headerCommentCount');
  
  if (countSpan) countSpan.textContent = comments.length;
  
  if (comments.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#888; margin-top: 20px;">No comments yet. Be the first!</div>';
    return;
  }
  
  let html = '';
  comments.forEach(c => {
    // Generate a random like count between 0 and 50 for the display
    // Because we don't have comment likes in backend yet, we use a static visual or just 0, but user said "aur like bhi" (and likes too)
    // Actually the user wants "nothing fake". I will show 0 if not supported, or just omit the fake numbers. Let's show 0.
    html += `
      <div class="comment-item">
        <img src="${c.user.profilePic}" onerror="handleImageError(this)">
        <div class="comment-content">
          <div class="comment-user">@${c.user.username} <span class="time">${timeSince(new Date(c.createdAt))}</span></div>
          <div class="comment-text">${escapeHTML(c.text)}</div>
          <div class="comment-actions">
            <i class="far fa-thumbs-up"></i> 0
            <i class="far fa-thumbs-down"></i>
            <span class="action-btn">Reply</span>
          </div>
        </div>
        <i class="fas fa-ellipsis-v" style="color: #aaa; cursor: pointer; font-size: 14px;"></i>
      </div>
    `;
  });
  list.innerHTML = html;
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
}

function toggleCommentButton(input) {
  const btn = document.getElementById('submitCommentBtn');
  if (input.value.trim().length > 0) {
    btn.disabled = false;
    btn.classList.add('active');
  } else {
    btn.disabled = true;
    btn.classList.remove('active');
  }
}

function clearCommentInput() {
  const input = document.getElementById('commentInput');
  input.value = '';
  toggleCommentButton(input);
}

async function submitReelComment(e) {
  e.preventDefault();
  if (!currentReelIdForComments) return;
  
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    const res = await fetchWithAuth(`/posts/${currentReelIdForComments}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (res.ok) {
      const newComment = await res.json();
      clearCommentInput();
      
      const list = document.getElementById('commentsList');
      if (list.innerHTML.includes('No comments yet')) {
        list.innerHTML = '';
      }
      
      const html = `
        <div class="comment-item">
          <img src="${newComment.user.profilePic}" onerror="handleImageError(this)">
          <div class="comment-content">
            <div class="comment-user">@${newComment.user.username} <span class="time">Just now</span></div>
            <div class="comment-text">${escapeHTML(newComment.text)}</div>
            <div class="comment-actions">
              <i class="far fa-thumbs-up"></i> 0
              <i class="far fa-thumbs-down"></i>
              <span class="action-btn">Reply</span>
            </div>
          </div>
          <i class="fas fa-ellipsis-v" style="color: #aaa; cursor: pointer; font-size: 14px;"></i>
        </div>
      `;
      
      list.insertAdjacentHTML('beforeend', html);
      list.scrollTop = list.scrollHeight;
      
      const countSpanHeader = document.getElementById('headerCommentCount');
      if (countSpanHeader) countSpanHeader.textContent = parseInt(countSpanHeader.textContent || 0) + 1;
      
      // Update comment count on reel icon
      const reelContainer = document.querySelector(`.reel-container[data-id="${currentReelIdForComments}"]`);
      if (reelContainer) {
        const commentBtnWrapper = reelContainer.querySelectorAll('.reel-action-wrapper')[2];
        const countSpan = commentBtnWrapper.querySelector('span');
        if (countSpan) countSpan.textContent = parseInt(countSpan.textContent || 0) + 1;
      }
    } else {
      showToast('Failed to post comment', 'error');
    }
  } catch (err) {
    showToast('Error posting comment', 'error');
  }
}
