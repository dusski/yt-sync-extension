import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onIdTokenChanged, signInAnonymously } from "firebase/auth";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { VideosTab } from "./components/VideosTab";
import { AccountsTab } from "./components/AccountsTab";
import { PlaySquare, Users, AlertCircle } from "lucide-react";

declare var chrome: any;

export interface YouTubeAccount {
  id: string;
  name: string;
  syncGroupId: string | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"videos" | "accounts">("videos");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<YouTubeAccount[]>(() => {
    const saved = localStorage.getItem("yt_accounts");
    if (saved) return JSON.parse(saved);
    const oldGroupId = localStorage.getItem("syncGroupId");
    return [{ id: 'default', name: 'Personal', syncGroupId: oldGroupId }];
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return localStorage.getItem("yt_active_account") || 'default';
  });

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const groupId = activeAccount?.syncGroupId || null;

  useEffect(() => {
    localStorage.setItem("yt_accounts", JSON.stringify(accounts));
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ yt_accounts: JSON.stringify(accounts) });
    }
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("yt_active_account", activeAccountId);
    if (typeof chrome !== "undefined" && chrome.storage) {
      if (chrome.storage.sync) chrome.storage.sync.set({ yt_active_account: activeAccountId });
      const currentGroup = accounts.find(a => a.id === activeAccountId)?.syncGroupId || null;
      if (currentGroup) {
        chrome.storage.local.set({ syncGroupId: currentGroup });
      } else {
        chrome.storage.local.remove("syncGroupId");
      }
    }
  }, [activeAccountId, accounts]);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["yt_accounts", "yt_active_account"], (result) => {
        if (result.yt_accounts) {
          try {
            const syncedAccounts = JSON.parse(result.yt_accounts);
            if (Array.isArray(syncedAccounts) && syncedAccounts.length > 0) {
              setAccounts(syncedAccounts);
            }
          } catch(e) {}
        }
        if (result.yt_active_account) {
          setActiveAccountId(result.yt_active_account);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthReady && auth.currentUser) {
      const uid = auth.currentUser.uid;
      const healedGroupsStr = sessionStorage.getItem("healedGroups") || "[]";
      let healedGroups: string[] = [];
      try { healedGroups = JSON.parse(healedGroupsStr); } catch(e) {}

      accounts.forEach(async (acc) => {
        if (acc.syncGroupId && !healedGroups.includes(acc.syncGroupId)) {
          try {
            const groupRef = doc(db, "groups", acc.syncGroupId);
            await updateDoc(groupRef, {
              members: arrayUnion(uid)
            });
            healedGroups.push(acc.syncGroupId);
            sessionStorage.setItem("healedGroups", JSON.stringify(healedGroups));
          } catch(e) {
            console.error("Failed to automatically re-authorize sync group:", e);
          }
        }
      });
    }
  }, [isAuthReady, accounts]);

  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("Error signing in anonymously:", error);
      if (error.code === 'auth/admin-restricted-operation') {
        setAuthError("Anonymous Authentication is disabled in Firebase.");
      } else {
        setAuthError(error.message);
      }
    });

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        setIsAuthReady(true);
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const idToken = await user.getIdToken();
          chrome.storage.local.set({
            firebaseAuth: {
              idToken,
              refreshToken: user.refreshToken,
              localId: user.uid
            }
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddAccount = (name: string) => {
    const newAccount: YouTubeAccount = {
      id: Date.now().toString(),
      name,
      syncGroupId: null
    };
    setAccounts([...accounts, newAccount]);
    setActiveAccountId(newAccount.id);
  };

  const handleRemoveAccount = (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    if (updated.length === 0) {
      const defaultAcc = { id: 'default', name: 'Personal', syncGroupId: null };
      setAccounts([defaultAcc]);
      setActiveAccountId('default');
    } else {
      setAccounts(updated);
      if (activeAccountId === id) {
        setActiveAccountId(updated[0].id);
      }
    }
  };

  const handleUpdateSyncGroup = (newGroupId: string | null) => {
    setAccounts(accounts.map(acc => 
      acc.id === activeAccountId ? { ...acc, syncGroupId: newGroupId } : acc
    ));
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="w-[350px] h-[500px] flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans rounded-xl border border-zinc-800 shadow-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-medium text-red-400">Authentication Error</h2>
          <p className="text-sm text-zinc-400">{authError}</p>
          {authError.includes("disabled") && (
            <p className="text-xs text-zinc-500 mt-4">
              Please go to your Firebase Console &rarr; Authentication &rarr; Sign-in method, and enable "Anonymous".
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="w-[350px] h-[500px] flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans rounded-xl border border-zinc-800 shadow-2xl">
          <div className="animate-pulse text-zinc-500">Connecting...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-[350px] h-[500px] flex flex-col bg-zinc-950 text-zinc-100 font-sans border border-zinc-800 shadow-2xl rounded-xl overflow-hidden relative">
        <header className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-red-500" />
            YouTube Sync
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === "videos" ? (
            <VideosTab groupId={groupId} onGoToAccounts={() => setActiveTab("accounts")} />
          ) : (
            <AccountsTab 
              accounts={accounts}
              activeAccountId={activeAccountId}
              onAddAccount={handleAddAccount}
              onRemoveAccount={handleRemoveAccount}
              onSwitchAccount={setActiveAccountId}
              onUpdateSyncGroup={handleUpdateSyncGroup}
            />
          )}
        </main>

        <nav className="flex border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === "videos" ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <PlaySquare className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Videos</span>
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              activeTab === "accounts" ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Accounts</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
