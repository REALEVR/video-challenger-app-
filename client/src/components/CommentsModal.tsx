import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../lib/format";
import type { Comment } from "../types";

interface Props {
  submissionId: string;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}

export function CommentsModal({ submissionId, onClose, onCountChange }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Comment[]>(`/api/comments/${submissionId}`)
      .then(({ data }) => setComments(data))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const { data } = await api.post<Comment>(`/api/comments/${submissionId}`, { body: text.trim() });
      setComments((c) => [data, ...c]);
      onCountChange?.(1);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/comments/${id}`);
      setComments((c) => c.filter((x) => x.id !== id));
      onCountChange?.(-1);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="font-semibold text-white">Comments</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close comments">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-zinc-500">No comments yet. Say something first.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                    {c.user?.displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${c.userId}`} className="font-medium text-zinc-200 hover:underline">
                        {c.user?.displayName}
                      </Link>
                      <span className="text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="break-words text-zinc-300">{c.body}</p>
                  </div>
                  {user?.id === c.userId && (
                    <button
                      onClick={() => remove(c.id)}
                      className="shrink-0 text-xs text-zinc-500 hover:text-red-400"
                      aria-label="Delete comment"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3">
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
          {user ? (
            <form onSubmit={submit} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              <Link to="/login" className="text-fuchsia-400 hover:underline">
                Log in
              </Link>{" "}
              to comment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
