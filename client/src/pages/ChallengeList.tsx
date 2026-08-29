import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { formatMoney, timeUntil } from "../lib/format";
import type { Challenge } from "../types";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-700 text-zinc-200",
  OPEN: "bg-emerald-600/20 text-emerald-400",
  VOTING: "bg-amber-500/20 text-amber-400",
  CLOSED: "bg-zinc-600/30 text-zinc-300",
  PAID: "bg-fuchsia-600/20 text-fuchsia-300",
};

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Challenge[]>("/api/challenges")
      .then(({ data }) => setChallenges(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Challenges</h1>
        <Link
          to="/create-challenge"
          className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
        >
          + Start a Challenge
        </Link>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading…</p>
      ) : challenges.length === 0 ? (
        <p className="text-zinc-400">No challenges yet — start the first one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c) => (
            <Link
              key={c.id}
              to={`/challenges/${c.id}`}
              className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-fuchsia-600"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                  {c.status}
                </span>
                <span className="text-xs text-zinc-500">{timeUntil(c.votingDeadline)}</span>
              </div>
              <h2 className="text-lg font-semibold text-white">{c.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-emerald-400">{formatMoney(c.prizePoolCents, c.currency)} pool</span>
                <span className="text-zinc-500">{c._count?.submissions ?? 0} entries</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
