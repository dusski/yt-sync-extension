declare var chrome: any;

const API_KEY = "AIzaSyByDuyb1FTTi_FSc639ygtaZ-u-X5G3OHg";
const PROJECT_ID = "stable-liberty-467018-t7";
const DATABASE_ID = "ai-studio-b4fdcb9c-4496-4e6f-aece-c3f0c6144a86";

let idToken = null;
let uid = null;

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 5 * 60 * 1000;
  } catch (e) {
    return true;
  }
}

async function getAuthToken() {
  const data = await chrome.storage.local.get(['firebaseAuth']);
  if (!data.firebaseAuth) return null;

  uid = data.firebaseAuth.localId;

  if (!isTokenExpired(data.firebaseAuth.idToken)) {
    return data.firebaseAuth.idToken;
  }

  // Attempt to refresh the token using the refresh_token
  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${data.firebaseAuth.refreshToken}`
    });
    
    if (res.ok) {
      const refreshData = await res.json();
      const newAuth = {
        ...data.firebaseAuth,
        idToken: refreshData.id_token,
        refreshToken: refreshData.refresh_token
      };
      await chrome.storage.local.set({ firebaseAuth: newAuth });
      return newAuth.idToken;
    }
  } catch (e) {
    console.error("Failed to refresh token", e);
  }

  // Fallback to the stored idToken if refresh fails
  return data.firebaseAuth.idToken;
}

async function getGroupId() {
  // The React app (popup) saves the groupId to localStorage, but popup localStorage is separate from background in MV3?
  // Actually, popup and background share chrome.storage.local.
  // We need to update the React app to also save to chrome.storage.local if available.
  const data = await chrome.storage.local.get(['syncGroupId']);
  return data.syncGroupId;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_PROGRESS') {
    handleSyncProgress(message.payload);
    sendResponse({ success: true });
  } else if (message.type === 'GET_PROGRESS') {
    handleGetProgress(message.videoId).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

async function handleSyncProgress(payload) {
  const groupId = await getGroupId();
  if (!groupId) return;

  const token = await getAuthToken();
  if (!token) return;

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/groups/${groupId}/videos/${payload.videoId}?key=${API_KEY}&updateMask.fieldPaths=videoId&updateMask.fieldPaths=title&updateMask.fieldPaths=thumbnail&updateMask.fieldPaths=progress&updateMask.fieldPaths=lastUpdated&updateMask.fieldPaths=lastUpdatedBy`;
  
  const docData = {
    fields: {
      videoId: { stringValue: payload.videoId },
      title: { stringValue: payload.title },
      thumbnail: { stringValue: payload.thumbnail },
      progress: { doubleValue: payload.progress },
      lastUpdated: { timestampValue: new Date().toISOString() },
      lastUpdatedBy: { stringValue: uid }
    }
  };

  await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(docData)
  });
}

async function handleGetProgress(videoId) {
  const groupId = await getGroupId();
  if (!groupId) return null;

  const token = await getAuthToken();
  if (!token) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/groups/${groupId}/videos/${videoId}?key=${API_KEY}`;
  
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data && data.fields && data.fields.progress) {
      // Don't prompt if we were the last ones to update it
      if (data.fields.lastUpdatedBy && data.fields.lastUpdatedBy.stringValue === uid) {
        return null;
      }
      return { progress: data.fields.progress.doubleValue || data.fields.progress.integerValue };
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}
