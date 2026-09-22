import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Clock, ExternalLink } from "lucide-react";

interface VideoProgress {
  videoId: string;
  title: string;
  thumbnail: string;
  progress: number;
  lastUpdated: string;
  lastUpdatedBy: string;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideosTab({ groupId, onGoToAccounts }: { groupId: string | null; onGoToAccounts: () => void }) {
  const [videos, setVideos] = useState<VideoProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `groups/${groupId}/videos`),
      orderBy("lastUpdated", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vids: VideoProgress[] = [];
      snapshot.forEach((doc) => {
        vids.push(doc.data() as VideoProgress);
      });
      setVideos(vids);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching videos:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (!groupId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
          <Clock className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-lg font-medium text-zinc-300">No Sync Group</h2>
        <p className="text-sm text-zinc-500">
          Join or create a sync group to start tracking your videos.
        </p>
        <button
          onClick={onGoToAccounts}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg transition-colors"
        >
          Go to Accounts
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex space-x-4">
            <div className="rounded-md bg-zinc-800 h-16 w-28"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-2">
          <Clock className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-lg font-medium text-zinc-300">No Videos Yet</h2>
        <p className="text-sm text-zinc-500">
          Start watching a YouTube video, and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <a
          key={video.videoId}
          href={`https://www.youtube.com/watch?v=${video.videoId}&t=${Math.floor(video.progress)}s`}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700 rounded-xl overflow-hidden transition-all"
        >
          <div className="flex">
            <div className="relative w-28 h-16 shrink-0 bg-black">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-mono px-1 rounded">
                {formatTime(video.progress)}
              </div>
            </div>
            <div className="p-2 flex flex-col justify-between flex-1 min-w-0">
              <h3 className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug">
                {video.title}
              </h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-zinc-500">
                  {new Date(video.lastUpdated).toLocaleDateString()}
                </span>
                <span className="text-[10px] font-medium text-red-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Continue <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
