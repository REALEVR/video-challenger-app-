import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCompactNumber } from "../lib/format";
import type { Submission } from "../types";

interface Props {
  submission: Submission;
  showChallengeLink?: boolean;
  onVoteChange?: (submissionId: string, delta: number) => void;
}

/**
 * A single vertical video card, TikTok/Reels-style: autoplays when scrolled
 * into view, records exactly one counted view per viewer per cooldown window
 * (server-side dedupe — see /api/views), and lets any logged-in visitor cast
 * one vote.
 */
export function VideoCard({ submission, showChallengeLink, onVoteChange }: Props) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [viewCount, setViewCount] = useState(submission.viewCount);
  const [voteCount, setVoteCount] = useState(submission.voteCount);
  const [voted, setVoted] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const hasCountedView = useRef(false);

  useEffect(() => {
    if (user) {
      api
        .get<{ voted: boolean }>(`/api/votes/${submission.id}/mine`)
        .then(({ data }) => setVoted(data.voted))
        .catch(() => {});
    } else {
      setVoted(false);
    }
  }, [user, submission.id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
          if (!hasCountedView.current) {
            hasCountedView.current = true;
            api
              .post<{ counted: boolean; viewCount: number }>(`/api/views/${submission.id}`)
              .then(({ data }) => setViewCount(data.viewCount))
              .catch(() => {});
          }
        } else {
          el.pause();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [submission.id]);

  const handleVote = async () => {
    if (!user) return;
    setVoteBusy(true);
    try {
      if (voted) {
        await api.delete(`/api/votes/${submission.id}`);
        setVoted(false);
        setVoteCount((c) => c - 1);
        onVoteChange?.(submission.id, -1);
      } else {
        await api.post(`/api/votes/${submission.id}`);
        setVoted(true);
        setVoteCount((c) => c + 1);
        onVoteChange?.(submission.id, 1);
      }
    } catch (err) {
      // most likely voting-window-closed or duplicate; surface briefly
      console.warn((err as Error).message);
    } finally {
      setVoteBusy(false);
    }
  };

  return (
    <div className="relative mx-auto flex h-[calc(100vh-4rem)] max-h-[850px] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl">
      <video
        ref={videoRef}
        src={submission.videoUrl}
        className="h-full w-full object-cover"
        loop
        muted
        playsInline
        controls={false}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 text-white">
        <div className="min-w-0">
          <Link
            to={`/profile/${submission.user?.id}`}
            className="pointer-events-auto text-sm font-semibold hover:underline"
          >
            @{submission.user?.displayName ?? "creator"}
          </Link>
          {submission.caption && <p className="mt-1 line-clamp-2 text-sm text-zinc-200">{submission.caption}</p>}
          {showChallengeLink && submission.challenge && (
            <Link
              to={`/challenges/${submission.challenge.id}`}
              className="pointer-events-auto mt-1 inline-block text-xs font-medium text-fuchsia-300 hover:underline"
            >
              #{submission.challenge.title}
            </Link>
          )}
          <p className="mt-1 text-xs text-zinc-400">{formatCompactNumber(viewCount)} views</p>
        </div>

        <button
          onClick={handleVote}
          disabled={!user || voteBusy}
          title={user ? "Vote for this entry" : "Log in to vote"}
          className={`pointer-events-auto flex flex-col items-center gap-1 rounded-full px-3 py-2 transition ${
            voted ? "bg-fuchsia-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
          } disabled:opacity-50`}
        >
          <span className="text-xl">{voted ? "❤️" : "🤍"}</span>
          <span className="text-xs font-semibold">{formatCompactNumber(voteCount)}</span>
        </button>
      </div>
    </div>
  );
}
