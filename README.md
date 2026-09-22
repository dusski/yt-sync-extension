# YouTube Sync Extension 🎥 ⚡

> Seamlessly synchronize your YouTube playback progress across multiple devices, browsers, and accounts in real time.

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 📖 Overview

Have you ever started a long documentary, lecture, or podcast on your work laptop, only to sit down at your home desktop or open another browser profile and lose your place? 

**YouTube Sync Extension** solves this by maintaining a lightweight, real-time shared playback state in Firebase Firestore. By pairing your browsers with a simple 6-character sync code, any video you watch on one device can be seamlessly resumed on another.

---

## ✨ Features

- **⏱️ Smart 5-Second Watch Buffer:** Automatically activates progress tracking only after a video has actively played for at least 5 seconds, ignoring accidental clicks, quick previews, and instant tab closes.
- **🚫 Ad-Detection Protection:** Ignores YouTube advertisement playback so ad timestamps never overwrite your actual video progress.
- **⚡ Event-Driven State Sync:** Progress updates when you pause, seek (scrub), or navigate away—saving bandwidth and database read/writes without aggressive polling intervals.
- **🔔 On-Screen Resume Prompt:** When opening a video previously played on another device, an unobtrusive "Resume from MM:SS?" prompt appears inside YouTube's player. Clicking "Yes" jumps straight to your timestamp and starts playback.
- **👥 Multi-Account / Profile Management:** Manage multiple sync profiles (e.g., *Personal*, *Work*, *Family*) right from the popup menu, each with its own independent sync code.
- **🔑 Group Sync Codes:** Connect any number of devices by generating a random 6-character code or entering an existing one.
- **📺 Recent Watch History:** Browse synced videos directly in the extension popup with thumbnails, titles, timestamps, and one-click direct watch links.
- **💾 Account Persistence & Healing:** Backs up account configurations to Chrome's synced storage and automatically re-authenticates group memberships if the extension is reinstalled or the browser cache is cleared.

---

## 🏗️ Architecture & Technology

- **Extension Framework:** Chrome Extension Manifest V3
  - **Content Script (`src/extension/content.ts`):** Injected into `youtube.com/watch*` to monitor video playback, detect ad states, record progress, and render the resume overlay.
  - **Background Worker (`src/extension/background.ts`):** Handles background API authentication and communication with Google Firestore via REST, isolating credentials from the page DOM.
  - **Popup UI (`src/App.tsx`, `src/components/*`):** Interactive React 19 single-page dashboard built with Lucide icons and Tailwind CSS.
- **Database & Auth:** Firebase Anonymous Authentication + Cloud Firestore.
- **Build System:** Vite 6 with Rollup multi-input configuration compiling the React popup, background worker, and content script into optimized bundles.

---

## 📂 Project Structure

```text
├── public/
│   └── manifest.json          # Chrome Extension Manifest V3 configuration
├── src/
│   ├── components/
│   │   ├── AccountsTab.tsx    # Account switching, creation, and sync code management
│   │   └── VideosTab.tsx      # Synced video history list with progress bars & quick links
│   ├── extension/
│   │   ├── background.ts      # Manifest V3 service worker & Firestore REST sync
│   │   └── content.ts         # YouTube DOM observer, video listener & resume prompt
│   ├── App.tsx                # Popup root container & navigation tabs
│   ├── firebase.ts            # Firebase client initialization
│   └── main.tsx               # Popup entrypoint
├── firebase-applet-config.json # Firebase connection credentials
├── firestore.rules            # Firestore security rules for group & video data
├── vite.config.ts             # Vite & Rollup multi-entry bundle configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- Google Chrome, Brave, Edge, or any Chromium-based browser

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/<your-username>/youtube-sync-extension.git
cd youtube-sync-extension

# Install project dependencies
npm install
```

### 3. Firebase Configuration

Ensure `firebase-applet-config.json` is present in the root directory with your Firebase project credentials:

```json
{
  "apiKey": "YOUR_FIREBASE_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.firebasestorage.app",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "YOUR_DATABASE_ID"
}
```

> **Note:** In the [Firebase Console](https://console.firebase.google.com/):
> 1. Go to **Authentication** &rarr; **Sign-in method** and enable **Anonymous** authentication.
> 2. Go to **Firestore Database** and verify rules allow members of `/groups/{groupId}` to read and write videos according to `firestore.rules`.

### 4. Build the Extension

Compile the React app and extension scripts:

```bash
npm run build
```

This generates production-ready assets in the `dist/` directory, including:
- `dist/index.html` (Extension popup)
- `dist/assets/background.js` (Service worker)
- `dist/assets/content.js` (Content script)
- `dist/manifest.json` (Copied from `public/`)

---

## 📥 Loading into Chrome

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge).
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the **`dist`** folder inside this project directory.
5. The **YouTube Sync Extension** icon will appear in your extensions toolbar. Pin it for quick access!

---

## 🎮 How to Use

1. **Create or Join a Sync Group:**
   - Click the extension icon in your browser toolbar.
   - Switch to the **Accounts** tab.
   - Click **Create New Sync Group** to generate a 6-character code (e.g. `K9X2P1`).
   - On your other computer or browser profile, install the extension, open the **Accounts** tab, and enter the code under **Join Sync Group**.

2. **Watch Videos:**
   - Go to any video on [YouTube](https://www.youtube.com).
   - Once the video plays for at least 5 seconds, it is automatically registered.
   - Pausing, skipping, or switching tabs updates your saved timestamp in real time.

3. **Resume on Another Device:**
   - Open the same video on any synced device.
   - A prompt will appear in the bottom-right of the player: **"Resume from MM:SS?"**.
   - Click **Yes** to instantly jump to your last position.
   - You can also click any video card in the extension popup's **Videos** tab to open it directly at your saved timestamp.

---

## 🔒 Security & Privacy

- **Minimal Permissions:** Only requests access to `storage` and permissions for `*://*.youtube.com/*` and Firebase endpoints.
- **Anonymous Sessions:** No personal Google account credentials or passwords are exchanged or collected; connections are managed through anonymous Firebase tokens and random sync codes.
- **Ad Safe:** No tracking or storage of advertisement playback or user analytics.

---

## 🛠️ Development Scripts

- `npm run dev`: Starts the local Vite development preview server on port 3000.
- `npm run build`: Bundles the React popup and builds the extension background/content scripts into `dist/`.
- `npm run lint`: Validates TypeScript typing across the entire codebase (`tsc --noEmit`).
- `npm run clean`: Cleans up the previous `dist/` build directory.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

