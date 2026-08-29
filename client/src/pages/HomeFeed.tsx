import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { VideoCard } from "../components/VideoCard";
import { Spinner } from "../components/Spinner";
import type { Challenge, ChallengeListResponse, Submission } from "../types";

/**
 * The global, TikTok-style feed: every approved submission across every
 * open/voting challenge, newest challenges first. This is the "visitors
 * from all over the world" surface — no login needed to browse and watch,
 * just to vote.
 */
export function HomeFeed() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<ChallengeListResponse>("/api/challenges", { params: { pageSize: 50 } });
        const active = data.items.filter((c: Challenge) => c.status === "OPEN" || c.status === "VOTING");
        const detailed = await Promise.all(
          active.slice(0, 8).map((c) => api.get<Challenge>(`/api/challenges/${c.id}`).then((r) => r.data))
        );
        const all = detailed
          .flatMap((c) => (c.submissions ?? []).map((s) => ({ ...s, challenge: { id: c.id, title: c.title, status: c.status } })))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(all);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner label="Loading the feed…" />;

  if (submissions.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-bold text-white">No entries yet</h1>
        <p className="mt-2 text-zinc-400">Be the first to start a challenge or upload an entry.</p>
        <Link
          to="/challenges"
          className="mt-6 inline-block rounded-full bg-fuchsia-600 px-6 py-3 font-semibold text-white hover:bg-fuchsia-500"
        >
          Browse challenges
        </Link>
      </div>
    );
  }

  return (
    <div className="snap-feed flex flex-col items-center gap-6 overflow-y-auto">
      {submissions.map((s) => (
        <VideoCard key={s.id} submission={s} showChallengeLink />
      ))}
    </div>
  );
}
