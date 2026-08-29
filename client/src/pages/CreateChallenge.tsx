import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { PayoutModel } from "../types";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateChallenge() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [prizePool, setPrizePool] = useState("100");
  const [payoutModel, setPayoutModel] = useState<PayoutModel>("VIEWS");
  const inWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [submissionDeadline, setSubmissionDeadline] = useState(toLocalInputValue(inWeek));
  const [votingDeadline, setVotingDeadline] = useState(toLocalInputValue(inTwoWeeks));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.post("/api/challenges", {
        title,
        description,
        category: category || undefined,
        prizePoolCents: Math.round(Number(prizePool) * 100),
        payoutModel,
        submissionDeadline: new Date(submissionDeadline).toISOString(),
        votingDeadline: new Date(votingDeadline).toISOString(),
      });
      navigate(`/challenges/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Start a Challenge</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Set a prize pool up front. When voting closes, it's split automatically among approved entries based on their
        share of views (or votes, or both) — nobody has to decide winners by hand.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          placeholder="Challenge title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
        />
        <textarea
          required
          rows={4}
          placeholder="What should people submit? Rules, theme, format…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
        />
        <input
          placeholder="Category (optional, e.g. Dance, Comedy, Talent)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm text-zinc-400">
            Prize pool (USD)
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-fuchsia-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Payout split by
            <select
              value={payoutModel}
              onChange={(e) => setPayoutModel(e.target.value as PayoutModel)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="VIEWS">Views (like YouTube)</option>
              <option value="VOTES">Public votes</option>
              <option value="HYBRID">Both, blended</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm text-zinc-400">
            Submissions close
            <input
              type="datetime-local"
              required
              value={submissionDeadline}
              onChange={(e) => setSubmissionDeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-fuchsia-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Voting closes
            <input
              type="datetime-local"
              required
              value={votingDeadline}
              onChange={(e) => setVotingDeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-fuchsia-500 focus:outline-none"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create challenge"}
        </button>
      </form>
    </div>
  );
}
