document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
});

async function loadNotifications() {
  const list = document.getElementById('notificationsList');
  const markReadBtn = document.getElementById('markReadBtn');
  if (!list) return;

  try {
    const res = await fetchWithAuth('/notifications');
    if (res.ok) {
      const data = await res.json();
      
      if (data.length === 0) {
        list.innerHTML = `
          <div style="padding: var(--space-8) var(--space-4); text-align: center;">
            <div style="font-size: 48px; color: var(--border-default); margin-bottom: var(--space-3);">🔕</div>
            <h3 style="color: var(--text-secondary); margin-bottom: var(--space-2);">No notifications yet</h3>
            <p style="color: var(--text-muted); font-size: var(--text-sm);">When people interact with you, you'll see it here.</p>
          </div>
        `;
        return;
      }

      const hasUnread = data.some(n => !n.isRead);
      if (hasUnread && markReadBtn) {
        markReadBtn.style.display = 'block';
      }

      let html = '';
      data.forEach(notification => {
        html += generateNotificationHTML(notification);
      });
      list.innerHTML = html;
    }
  } catch (err) {
    list.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--error);">Failed to load notifications</div>`;
  }
}

function generateNotificationHTML(notification) {
  let icon = '';
  let text = '';
  let actionLink = '#';

  const username = `<span style="font-weight: 600; color: var(--text-primary);">${notification.sender.username}</span>`;

  switch (notification.type) {
    case 'like':
      icon = '<i class="fas fa-heart" style="color: var(--error); font-size: 20px;"></i>';
      text = `${username} liked your post.`;
      actionLink = `/post.html?id=${notification.postId}`;
      break;
    case 'comment':
      icon = '<i class="fas fa-comment" style="color: var(--accent); font-size: 20px;"></i>';
      text = `${username} commented on your post.`;
      actionLink = `/post.html?id=${notification.postId}`;
      break;
    case 'comment_reply':
      icon = '<i class="fas fa-reply" style="color: #F59E0B; font-size: 20px;"></i>';
      text = `${username} replied to your comment.`;
      actionLink = `/post.html?id=${notification.postId}`;
      break;
    case 'follow':
      icon = '<i class="fas fa-user-plus" style="color: var(--success); font-size: 20px;"></i>';
      text = `${username} started following you.`;
      actionLink = `/profile.html?id=${notification.sender.id}`;
      break;
  }

  return `
    <div class="notification-item ${!notification.isRead ? 'unread' : ''}" style="cursor: pointer; position: relative;" onclick="window.location.href='${actionLink}'">
      ${!notification.isRead ? '<div class="notification-badge active"></div>' : ''}
      <div style="width: 40px; display: flex; justify-content: center; align-items: center; height: 40px;">
        ${icon}
      </div>
      <img src="${notification.sender.profilePic}" class="avatar" onerror="handleImageError(this)">
      <div class="notification-content">
        <div>${text}</div>
        <div class="notification-time">${timeSince(new Date(notification.createdAt))}</div>
      </div>
    </div>
  `;
}

async function markAllRead() {
  try {
    const res = await fetchWithAuth('/notifications/read-all', { method: 'PUT' });
    if (res.ok) {
      loadNotifications(); // reload list
      document.getElementById('markReadBtn').style.display = 'none';
      
      // hide badges in sidebar/bottombar
      document.querySelectorAll('.notification-badge').forEach(b => b.classList.remove('active'));
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
  return "Just now";
}
