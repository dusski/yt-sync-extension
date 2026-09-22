import { useState, type FormEvent } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Copy, Check, LogOut, KeyRound, Plus, Trash2, ChevronDown } from "lucide-react";
import type { YouTubeAccount } from "../App";

interface AccountsTabProps {
  accounts: YouTubeAccount[];
  activeAccountId: string;
  onAddAccount: (name: string) => void;
  onRemoveAccount: (id: string) => void;
  onSwitchAccount: (id: string) => void;
  onUpdateSyncGroup: (groupId: string | null) => void;
}

export function AccountsTab({
  accounts,
  activeAccountId,
  onAddAccount,
  onRemoveAccount,
  onSwitchAccount,
  onUpdateSyncGroup
}: AccountsTabProps) {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const groupId = activeAccount?.syncGroupId || null;

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGroup = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");
    try {
      const newCode = generateCode();
      await setDoc(doc(db, "groups", newCode), {
        members: [auth.currentUser.uid],
        createdAt: new Date().toISOString()
      });
      onUpdateSyncGroup(newCode);
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError("Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !joinCode.trim()) return;
    
    const code = joinCode.trim().toUpperCase();
    setLoading(true);
    setError("");
    
    try {
      const groupRef = doc(db, "groups", code);
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        await updateDoc(groupRef, {
          members: arrayUnion(auth.currentUser.uid)
        });
        onUpdateSyncGroup(code);
        setJoinCode("");
      } else {
        setError("Invalid sync code.");
      }
    } catch (err: any) {
      console.error("Error joining group:", err);
      setError("Failed to join group.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (groupId) {
      navigator.clipboard.writeText(groupId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddNewAccount = (e: FormEvent) => {
    e.preventDefault();
    if (newAccountName.trim()) {
      onAddAccount(newAccountName.trim());
      setNewAccountName("");
      setIsAddingAccount(false);
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Account Selector Section */}
      <div className="relative z-10">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
          Active Account
        </label>
        
        {isAddingAccount ? (
          <form onSubmit={handleAddNewAccount} className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Account name (e.g. Work)"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={!newAccountName.trim()}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingAccount(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 transition-colors"
            >
              <span className="font-medium truncate">{activeAccount?.name || "Select Account"}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-800 cursor-pointer transition-colors ${activeAccountId === acc.id ? 'bg-zinc-800/50 text-red-400' : 'text-zinc-300'}`}
                      onClick={() => {
                        onSwitchAccount(acc.id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="font-medium truncate">{acc.name}</span>
                      {accounts.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAccount(acc.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded-md hover:bg-zinc-700 transition-colors"
                          title="Remove account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800 p-2">
                  <button
                    onClick={() => {
                      setIsAddingAccount(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-800 w-full" />

      {/* Sync Group Section */}
      {groupId ? (
        <div className="flex flex-col flex-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-center space-y-3">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Your Sync Code</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-bold tracking-widest text-zinc-100">
                {groupId}
              </span>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                title="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Enter this code on your other devices to sync progress.
            </p>
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={() => onUpdateSyncGroup(null)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-red-400 text-sm font-medium rounded-xl transition-colors border border-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              Leave Sync Group
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 space-y-4">
          <div className="text-center space-y-1 mb-2">
            <h2 className="text-lg font-medium text-zinc-200">Connect Devices</h2>
            <p className="text-sm text-zinc-500">Create a new sync group or join an existing one for this account.</p>
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create New Sync Group"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-zinc-600 uppercase tracking-wider font-medium">or</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <form onSubmit={handleJoinGroup} className="space-y-3">
            <div>
              <label htmlFor="code" className="sr-only">Sync Code</label>
              <input
                id="code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter 6-character code"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono uppercase tracking-widest text-center"
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || joinCode.length < 6}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Sync Group"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
