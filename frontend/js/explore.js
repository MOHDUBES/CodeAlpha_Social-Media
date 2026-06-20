document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 500));
  }
  
  loadSuggestions();
  loadExploreGrid();
});

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

async function handleSearch(e) {
  const query = e.target.value.trim();
  const resultsContainer = document.getElementById('searchResults');
  const resultsList = document.getElementById('searchResultsList');
  
  if (query.length === 0) {
    resultsContainer.style.display = 'none';
    return;
  }
  
  try {
    const res = await fetchWithAuth(`/users/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const users = await res.json();
      
      if (users.length === 0) {
        resultsList.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--text-muted);">No users found for "${escapeHTML(query)}"</div>`;
      } else {
        let html = '';
        users.forEach(u => {
          const verifiedBadge = u.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 14px; margin-left: 4px;"></i>' : '';
          html += `
            <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-subtle); cursor: pointer;" onclick="window.location.href='/profile.html?id=${u.id}'">
              <img src="${u.profilePic}" class="avatar" onerror="handleImageError(this)">
              <div>
                <div style="font-weight: 600;">${u.username}${verifiedBadge}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">${escapeHTML(u.fullName)}</div>
              </div>
            </div>
          `;
        });
        resultsList.innerHTML = html;
      }
      
      resultsContainer.style.display = 'block';
    }
  } catch (err) {
    console.error('Search failed', err);
  }
}

async function loadSuggestions() {
  const list = document.getElementById('suggestionsList');
  if (!list) return;

  try {
    const res = await fetchWithAuth('/users/suggestions');
    if (res.ok) {
      const users = await res.json();
      
      if (users.length === 0) {
        list.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--text-muted);">No suggestions right now</div>`;
        return;
      }

      let html = '';
      users.forEach(u => {
        const verifiedBadge = u.isVerified ? '<i class="fas fa-check-circle text-accent" style="font-size: 14px; margin-left: 4px;"></i>' : '';
        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: var(--space-3); cursor: pointer;" onclick="window.location.href='/profile.html?id=${u.id}'">
              <img src="${u.profilePic}" class="avatar" onerror="handleImageError(this)">
              <div>
                <div style="font-weight: 600;">${u.username}${verifiedBadge}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">Suggested for you</div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="followUser('${u.id}', this)">Follow</button>
          </div>
        `;
      });
      list.innerHTML = html;
    }
  } catch (err) {}
}

async function loadExploreGrid() {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;

  try {
    const res = await fetchWithAuth('/posts/explore');
    if (res.ok) {
      const posts = await res.json();
      
      if (posts.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: var(--space-5);">No posts found to explore</div>`;
        return;
      }

      let html = '';
      posts.forEach((post, index) => {
        const tallClass = index % 5 === 0 ? 'masonry-item-tall' : '';
        const isVideo = post.mediaType === 'video';
        const mediaTag = isVideo 
          ? `<video src="${post.mediaUrl}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>`
          : `<img src="${post.mediaUrl}" loading="lazy">`;

        html += `
          <div class="masonry-item ${tallClass}" onclick="window.location.href='/post.html?id=${post.id}'">
            ${mediaTag}
            <div class="masonry-overlay">
              <div class="masonry-stat"><i class="fas fa-heart"></i> ${post.likeCount}</div>
              <div class="masonry-stat"><i class="fas fa-comment"></i> ${post.commentCount}</div>
            </div>
          </div>
        `;
      });
      grid.innerHTML = html;
    }
  } catch (err) {}
}

async function followUser(userId, btnElem) {
  try {
    btnElem.classList.add('loading');
    const res = await fetchWithAuth(`/users/${userId}/follow`, { method: 'POST' });
    if (res.ok) {
      btnElem.classList.remove('btn-secondary');
      btnElem.classList.add('btn-ghost');
      btnElem.textContent = 'Following';
      btnElem.disabled = true;
    }
  } catch (err) {
  } finally {
    btnElem.classList.remove('loading');
  }
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
