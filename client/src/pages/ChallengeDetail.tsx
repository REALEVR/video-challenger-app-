import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCompactNumber, formatMoney, timeUntil } from "../lib/format";
import type { Challenge } from "../types";

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => api.get<Challenge>(`/api/challenges/${id}`).then(({ data }) => setChallenge(data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-zinc-400">Loading…</p>;
  if (!challenge) return <p className="text-zinc-400">Challenge not found.</p>;

  const isOwner = user?.id === challenge.createdById || user?.role === "ADMIN";
  const submissions = [...(challenge.submissions ?? [])].sort(
    (a, b) => b.voteCount - a.voteCount || b.viewCount - a.viewCount
  );

  const runStatusChange = async (status: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await api.patch(`/api/challenges/${challenge.id}/status`, { status });
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runComputePayouts = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/api/challenges/${challenge.id}/compute-payouts`);
      setMessage("Payouts computed from current views/votes. Review them, then disburse.");
      await load();
      navigate(`/challenges/${challenge.id}/payouts`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              by{" "}
              <Link to={`/profile/${challenge.createdBy?.id}`} className="text-fuchsia-400 hover:underline">
                {challenge.createdBy?.displayName}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-400">{formatMoney(challenge.prizePoolCents, challenge.currency)}</p>
            <p className="text-xs text-zinc-500">prize pool · split by {challenge.payoutModel.toLowerCase()}</p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-line text-zinc-300">{challenge.description}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
          <span>Status: <strong className="text-zinc-200">{challenge.status}</strong></span>
          <span>Submissions {challenge.status === "OPEN" ? timeUntil(challenge.submissionDeadline) : "closed"}</span>
          <span>Voting {timeUntil(challenge.votingDeadline)}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {challenge.status === "OPEN" && user && (
            <Link
              to={`/challenges/${challenge.id}/upload`}
              className="rounded-full bg-fuchsia-600 px-5 py-2 font-semibold text-white hover:bg-fuchsia-500"
            >
              Submit your entry
            </Link>
          )}
          {isOwner && challenge.status === "OPEN" && (
            <button
              disabled={busy}
              onClick={() => runStatusChange("VOTING")}
              className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Close submissions, start voting
            </button>
          )}
          {isOwner && challenge.status === "VOTING" && (
            <button
              disabled={busy}
              onClick={runComputePayouts}
              className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              End voting &amp; compute payouts
            </button>
          )}
          {isOwner && (challenge.status === "CLOSED" || challenge.status === "PAID") && (
            <Link
              to={`/challenges/${challenge.id}/payouts`}
              className="rounded-full border border-zinc-700 px-5 py-2 font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              View payouts
            </Link>
          )}
        </div>
        {message && <p className="mt-3 text-sm text-amber-400">{message}</p>}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Leaderboard ({submissions.length} entries)</h2>
        {submissions.length === 0 ? (
          <p className="text-zinc-400">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Caption</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Votes</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr key={s.id} className="border-t border-zinc-800 text-zinc-200">
                    <td className="px-4 py-3 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/profile/${s.user?.id}`} className="hover:text-fuchsia-400">
                        {s.user?.displayName}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                      <a href={s.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {s.caption || "(untitled entry)"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCompactNumber(s.viewCount)}</td>
                    <td className="px-4 py-3 text-right">{formatCompactNumber(s.voteCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
