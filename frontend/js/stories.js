let currentStories = [];
let currentStoryGroupIndex = 0;
let currentStoryIndex = 0;
let storyProgressInterval;

async function loadStories() {
  try {
    const res = await fetchWithAuth('/stories');
    if (res.ok) {
      const data = await res.json();
      currentStories = data;
      renderStoriesBar();
    }
  } catch (e) {
    console.error('Failed to load stories', e);
  }
}

function renderStoriesBar() {
  const container = document.getElementById('storiesContainer');
  // Keep the 'Add Story' button
  const addStoryHTML = container.firstElementChild.outerHTML;
  const inputHTML = container.querySelector('#storyInput').outerHTML;
  
  let storiesHTML = addStoryHTML + inputHTML;

  currentStories.forEach((group, index) => {
    // If the group has unseen stories, we add the 'story-ring' class
    const hasUnseen = group.stories.some(s => new Date(s.expiresAt) > new Date()); // basic unseen logic
    
    storiesHTML += `
      <div class="story-item" onclick="openStoryViewer(${index})">
        <div class="story-ring ${!hasUnseen ? 'seen' : ''}">
          <img src="${group.user.profilePic}" class="avatar avatar--lg" onerror="handleImageError(this)">
        </div>
        <span class="story-username">${group.user.id === JSON.parse(localStorage.getItem('user')).id ? 'Your story' : group.user.username}</span>
      </div>
    `;
  });

  container.innerHTML = storiesHTML;
}

async function uploadStory(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('media', file);

  try {
    const res = await fetchWithAuth('/stories', {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      showToast('Story added!', 'success');
      loadStories(); // Refresh stories
    } else {
      showToast('Failed to add story', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
  
  e.target.value = ''; // Reset
}

function openStoryViewer(groupIndex) {
  if (!currentStories[groupIndex]) return;
  currentStoryGroupIndex = groupIndex;
  currentStoryIndex = 0;
  
  const viewer = document.getElementById('storyViewer');
  viewer.classList.add('active');
  
  renderCurrentStory();
}

function closeStoryViewer() {
  const viewer = document.getElementById('storyViewer');
  viewer.classList.remove('active');
  clearInterval(storyProgressInterval);
  const video = document.getElementById('storyVideo');
  if (video) video.pause();
}

function renderCurrentStory() {
  const group = currentStories[currentStoryGroupIndex];
  if (!group) {
    closeStoryViewer();
    return;
  }
  
  const story = group.stories[currentStoryIndex];
  if (!story) {
    // Move to next group
    currentStoryGroupIndex++;
    currentStoryIndex = 0;
    renderCurrentStory();
    return;
  }

  const contentDiv = document.getElementById('storyViewerContent');
  
  // Progress Bars
  let progressBarsHTML = '<div style="display: flex; gap: 4px; position: absolute; top: 12px; left: 12px; right: 12px; z-index: 10;">';
  for (let i = 0; i < group.stories.length; i++) {
    const bg = i < currentStoryIndex ? '#fff' : (i === currentStoryIndex ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)');
    progressBarsHTML += `<div style="flex: 1; height: 3px; background: ${bg}; border-radius: 2px; overflow: hidden;">
      ${i === currentStoryIndex ? '<div id="storyProgressBar" style="height: 100%; width: 0%; background: #fff;"></div>' : ''}
    </div>`;
  }
  progressBarsHTML += '</div>';

  // User Info
  const userInfoHTML = `
    <div style="position: absolute; top: 24px; left: 12px; z-index: 10; display: flex; align-items: center; gap: 8px;">
      <img src="${group.user.profilePic}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3);" onerror="handleImageError(this)">
      <span style="color: white; font-weight: 600; font-size: 14px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${group.user.username}</span>
      <span style="color: rgba(255,255,255,0.8); font-size: 12px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${timeSince(new Date(story.createdAt))}</span>
    </div>
  `;

  // Media
  let mediaHTML = '';
  if (story.mediaType === 'video') {
    mediaHTML = `<video id="storyVideo" src="${story.mediaUrl}" autoplay style="width: 100%; height: 100%; object-fit: cover;" onended="nextStory()"></video>`;
  } else {
    mediaHTML = `<img src="${story.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
  }

  // Delete btn (if owner)
  const user = JSON.parse(localStorage.getItem('user'));
  let deleteHTML = '';
  if (user && user.id === group.user.id) {
    deleteHTML = `<button onclick="deleteCurrentStory('${story.id}')" style="position: absolute; bottom: 20px; right: 20px; z-index: 10; background: rgba(0,0,0,0.5); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer;"><i class="fas fa-trash"></i> Delete</button>`;
  }

  // Click areas for navigation
  const navHTML = `
    <div onclick="prevStory()" style="position: absolute; top: 0; left: 0; width: 30%; height: 100%; z-index: 5; cursor: pointer;"></div>
    <div onclick="nextStory()" style="position: absolute; top: 0; right: 0; width: 70%; height: 100%; z-index: 5; cursor: pointer;"></div>
  `;

  contentDiv.innerHTML = progressBarsHTML + userInfoHTML + mediaHTML + deleteHTML + navHTML;

  // Progress logic
  clearInterval(storyProgressInterval);
  if (story.mediaType === 'image') {
    let progress = 0;
    const bar = document.getElementById('storyProgressBar');
    storyProgressInterval = setInterval(() => {
      progress += 2; // 50 * 2 = 100 in 5 seconds (50 * 100ms)
      if (bar) bar.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(storyProgressInterval);
        nextStory();
      }
    }, 100);
  } else {
    const video = document.getElementById('storyVideo');
    const bar = document.getElementById('storyProgressBar');
    if (video) {
      video.ontimeupdate = () => {
        if (bar) bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      };
    }
  }
}

function nextStory() {
  currentStoryIndex++;
  renderCurrentStory();
}

function prevStory() {
  if (currentStoryIndex > 0) {
    currentStoryIndex--;
    renderCurrentStory();
  } else if (currentStoryGroupIndex > 0) {
    currentStoryGroupIndex--;
    currentStoryIndex = currentStories[currentStoryGroupIndex].stories.length - 1;
    renderCurrentStory();
  } else {
    currentStoryIndex = 0;
    renderCurrentStory();
  }
}

async function deleteCurrentStory(storyId) {
  if (!confirm('Delete this story?')) return;
  clearInterval(storyProgressInterval);
  try {
    const res = await fetchWithAuth(`/stories/${storyId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Story deleted', 'success');
      closeStoryViewer();
      loadStories();
    }
  } catch(e) {
    showToast('Failed to delete', 'error');
  }
}

// Utility for time since
function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return Math.floor(seconds) + "s";
}
