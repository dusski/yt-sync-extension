declare var chrome: any;

let currentVideoId: string | null = null;
let syncTimer: any = null;
let promptShown = false;
let isSyncEnabled = false;

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function getVideoDetails() {
  let title = document.title.replace(/^\(\d+\)\s*/, '');
  title = title.replace(' - YouTube', '');
  const videoId = getVideoId();
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return { videoId, title, thumbnail };
}

function removeExistingPrompts() {
  const existing = document.querySelectorAll('.yt-sync-prompt');
  existing.forEach(e => e.remove());
}

function showResumePrompt(savedProgress: number) {
  removeExistingPrompts();
  if (promptShown) return;
  promptShown = true;
  
  const videoEl = document.querySelector('video.html5-main-video') as HTMLVideoElement;
  if (!videoEl) return;
  
  if (videoEl.currentTime >= savedProgress - 5) return;
  if (savedProgress < 10) return; // Don't prompt for the first 10 seconds

  const m = Math.floor(savedProgress / 60);
  const s = Math.floor(savedProgress % 60).toString().padStart(2, '0');
  const timeStr = `${m}:${s}`;

  const promptDiv = document.createElement('div');
  promptDiv.className = 'yt-sync-prompt';
  promptDiv.style.cssText = `
    position: absolute;
    bottom: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 9999;
    font-family: Roboto, Arial, sans-serif;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;

  const text = document.createElement('span');
  text.innerText = `Resume from ${timeStr}?`;
  text.style.fontSize = '14px';
  
  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '8px';

  const yesBtn = document.createElement('button');
  yesBtn.innerText = 'Yes';
  yesBtn.style.cssText = 'background: #cc0000; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;';
  yesBtn.onclick = () => {
    videoEl.currentTime = savedProgress;
    videoEl.play();
    promptDiv.remove();
  };

  const noBtn = document.createElement('button');
  noBtn.innerText = 'No';
  noBtn.style.cssText = 'background: transparent; color: #aaa; border: none; padding: 6px 12px; cursor: pointer;';
  noBtn.onclick = () => {
    promptDiv.remove();
  };

  btnGroup.appendChild(yesBtn);
  btnGroup.appendChild(noBtn);
  promptDiv.appendChild(text);
  promptDiv.appendChild(btnGroup);

  const playerContainer = document.querySelector('#movie_player');
  if (playerContainer) {
    playerContainer.appendChild(promptDiv);
    setTimeout(() => {
      if (promptDiv.parentNode) promptDiv.remove();
    }, 10000);
  }
}

function triggerSync() {
  if (!isSyncEnabled) return;
  const videoEl = document.querySelector('video.html5-main-video') as HTMLVideoElement;
  if (!videoEl || Number.isNaN(videoEl.duration)) return;

  const moviePlayer = document.querySelector('#movie_player');
  if (moviePlayer && moviePlayer.classList.contains('ad-showing')) return;

  const details = getVideoDetails();
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'SYNC_PROGRESS',
      payload: {
        ...details,
        progress: videoEl.currentTime
      }
    });
  }
}

function setupVideoListeners() {
  const videoEl = document.querySelector('video.html5-main-video') as HTMLVideoElement;
  if (!videoEl) {
    setTimeout(setupVideoListeners, 1000);
    return;
  }

  const anyVideo = videoEl as any;
  if (!anyVideo._syncListenersAdded) {
    videoEl.addEventListener('play', () => {
      if (syncTimer) clearTimeout(syncTimer);
      if (!isSyncEnabled) {
        syncTimer = setTimeout(() => {
          const moviePlayer = document.querySelector('#movie_player');
          if (moviePlayer && moviePlayer.classList.contains('ad-showing')) {
            return; // Don't enable sync during an ad, wait for the actual video
          }
          isSyncEnabled = true;
          triggerSync();
        }, 5000);
      }
    });

    videoEl.addEventListener('pause', () => {
      if (syncTimer && !isSyncEnabled) {
        clearTimeout(syncTimer);
      } else if (isSyncEnabled) {
        triggerSync();
      }
    });

    videoEl.addEventListener('seeked', () => {
      if (isSyncEnabled) triggerSync();
    });

    anyVideo._syncListenersAdded = true;
  }
}

function init() {
  const newVideoId = getVideoId();
  if (!newVideoId) return;

  if (newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;
    promptShown = false;
    isSyncEnabled = false;
    if (syncTimer) clearTimeout(syncTimer);
    
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_PROGRESS', videoId: currentVideoId }, (response: any) => {
        if (response && response.progress) {
          const checkVideo = setInterval(() => {
            const videoEl = document.querySelector('video.html5-main-video') as HTMLVideoElement;
            if (videoEl && videoEl.readyState > 0) {
              clearInterval(checkVideo);
              showResumePrompt(response.progress);
            }
          }, 500);
        }
      });
    }

    setupVideoListeners();
  }
}

window.addEventListener('yt-navigate-finish', init);
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
