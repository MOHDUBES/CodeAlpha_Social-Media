let socket;
let currentChatUserId = null;
let userObj = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar();
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return;
  userObj = JSON.parse(userStr);

  // Set user details in the top UI
  document.getElementById('currentUserHeaderUsername').textContent = userObj.username;
  document.getElementById('myNoteAvatar').src = userObj.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userObj.username;

  initSocket();
  await loadConversations();
  await loadActiveFriends();

  document.getElementById('chatForm').addEventListener('submit', handleSendMessage);
  document.getElementById('backToConversations').addEventListener('click', () => {
    document.getElementById('chatArea').classList.remove('active');
    currentChatUserId = null;
  });

  // Since it's a new layout, let's fix margins for desktop vs mobile
  if (window.innerWidth > 768) {
    document.getElementById('messagesLayout').style.marginLeft = '280px';
    document.getElementById('messagesLayout').style.marginTop = '0';
    document.getElementById('messagesLayout').style.height = '100vh';
  } else {
    document.getElementById('messagesLayout').style.marginLeft = '0';
    document.getElementById('messagesLayout').style.marginTop = '60px';
    document.getElementById('messagesLayout').style.height = 'calc(100vh - 120px)';
  }
});

function initSocket() {
  const token = localStorage.getItem('token');
  // Use current origin for socket
  socket = io(window.location.origin, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Connected to chat server');
  });

  socket.on('newMessage', (message) => {
    // If the message is for the active chat, append it
    if (message.senderId === currentChatUserId) {
      appendMessage(message, false);
      scrollToBottom();
      // Mark as read
      markAsRead(currentChatUserId);
    } else {
      // Otherwise, just reload conversations to show unread dot
      loadConversations();
    }
  });
}

async function loadConversations() {
  try {
    const res = await fetchWithAuth('/messages/conversations');
    const conversations = await res.json();
    
    const listEl = document.getElementById('conversationsList');
    listEl.innerHTML = '';

    if (conversations.length === 0) {
      listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No conversations yet. Go to a profile to message someone.</div>';
      return;
    }

    conversations.forEach(conv => {
      const otherUser = conv.otherUser;
      let lastMsgDisplay = '';
      let activeDotHtml = '';

      if (!conv.lastMessage) {
        lastMsgDisplay = `<div class="conversation-last-msg">Active now</div>`;
        activeDotHtml = `<div class="active-dot"></div>`;
      } else {
        let lastMsgText = conv.lastMessage.text;
        if (lastMsgText.length > 25) lastMsgText = lastMsgText.substring(0, 25) + '...';
        
        const diff = new Date() - new Date(conv.lastMessage.createdAt);
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        let timeString = '';
        if (weeks > 0) timeString = ` · ${weeks}w`;
        else if (days > 0) timeString = ` · ${days}d`;
        else if (hours > 0) timeString = ` · ${hours}h`;
        else if (mins > 0) timeString = ` · ${mins}m`;
        else timeString = ` · now`;

        if (conv.lastMessage.senderId === userObj.id) {
          lastMsgDisplay = `<div class="conversation-last-msg">You: ${lastMsgText}${timeString}</div>`;
        } else {
          if (conv.unreadCount > 0) {
            lastMsgDisplay = `<div class="conversation-last-msg" style="font-weight: 700; color: var(--text-primary);">${lastMsgText}${timeString}</div>`;
          } else {
            lastMsgDisplay = `<div class="conversation-last-msg">${lastMsgText}${timeString}</div>`;
          }
        }
      }

      const unreadHtml = conv.unreadCount > 0 ? `<div class="unread-dot"></div>` : '';
      
      const div = document.createElement('div');
      div.className = `conversation-item ${currentChatUserId === otherUser.id ? 'active' : ''}`;
      div.onclick = () => openChat(otherUser);
      
      div.innerHTML = `
        <div class="avatar-wrapper">
          <img src="${otherUser.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + otherUser.username}" class="conversation-avatar">
          ${activeDotHtml}
        </div>
        <div class="conversation-details">
          <div class="conversation-name">${otherUser.username}</div>
          ${lastMsgDisplay}
        </div>
        ${unreadHtml}
      `;
      listEl.appendChild(div);
    });

  } catch (err) {
    console.error('Error loading conversations:', err);
  }
}

async function openChat(otherUser) {
  currentChatUserId = otherUser.id;
  
  // Update UI
  document.getElementById('emptyChat').style.display = 'none';
  document.getElementById('activeChat').style.display = 'flex';
  
  document.getElementById('chatAvatar').src = otherUser.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + otherUser.username;
  document.getElementById('chatName').textContent = otherUser.username;
  
  // Mobile slide in
  if (window.innerWidth <= 768) {
    document.getElementById('chatArea').classList.add('active');
  }

  // Load messages
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Loading...</div>';
  
  try {
    const res = await fetchWithAuth(`/messages/${otherUser.id}`);
    
    if (!res.ok) {
      let errorText = await res.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.message || errorText;
      } catch(e) {}
      throw new Error(`Server Error: ${errorText}`);
    }

    const messages = await res.json();
    
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
      appendMessage(msg, msg.senderId === userObj.id);
    });
    
    scrollToBottom();
    
    // Join socket room
    if (messages.length > 0) {
      socket.emit('joinChat', messages[0].conversationId);
      markAsRead(otherUser.id);
    }
    
    // Refresh conversation list to clear unread dots
    loadConversations();
    
  } catch (err) {
    console.error('Error loading messages:', err);
    chatMessages.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--error);">Error: ${err.message}</div>`;
  }
}

function appendMessage(msg, isSentByMe) {
  const chatMessages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}`;
  div.textContent = msg.text; // TextContent prevents XSS
  chatMessages.appendChild(div);
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text || !currentChatUserId) return;
  
  input.value = '';
  
  // Optimistic UI update
  const tempMsg = { text: text, senderId: userObj.id, createdAt: new Date() };
  appendMessage(tempMsg, true);
  scrollToBottom();
  
  try {
    await fetchWithAuth(`/messages/${currentChatUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    loadConversations();
  } catch (err) {
    console.error('Error sending message:', err);
    showToast('Failed to send message', 'error');
  }
}

async function markAsRead(userId) {
  try {
    await fetchWithAuth(`/messages/${userId}/read`, { method: 'PUT' });
  } catch(e) {}
}

async function loadActiveFriends() {
  try {
    const res = await fetchWithAuth(`/users/${userObj.id}/following`);
    const following = await res.json();
    
    const notesSection = document.getElementById('notesSection');
    
    // We already have the current user's "Your note" in the HTML.
    // Let's append the friends.
    following.forEach(friend => {
      if (!friend) return;
      
      const div = document.createElement('div');
      div.className = 'note-item';
      div.onclick = () => openChat(friend);
      
      div.innerHTML = `
        <div class="avatar-wrapper">
          <img src="${friend.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + friend.username}" class="note-avatar" style="border: 2px solid var(--border);">
        </div>
        <span class="note-name">${friend.username}</span>
      `;
      
      notesSection.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading friends:', err);
  }
}
