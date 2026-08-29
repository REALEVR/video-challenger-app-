import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { formatMoney, timeUntil } from "../lib/format";
import type { Challenge, ChallengeListResponse } from "../types";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-700 text-zinc-200",
  OPEN: "bg-emerald-600/20 text-emerald-400",
  VOTING: "bg-amber-500/20 text-amber-400",
  CLOSED: "bg-zinc-600/30 text-zinc-300",
  PAID: "bg-fuchsia-600/20 text-fuchsia-300",
};

const PAGE_SIZE = 9;

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
    if (debouncedSearch) params.q = debouncedSearch;
    if (category) params.category = category;
    api
      .get<ChallengeListResponse>("/api/challenges", { params })
      .then(({ data }) => {
        setChallenges(data.items);
        setTotal(data.total);
        setCategories(data.categories);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, category]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Challenges</h1>
        <Link
          to="/create-challenge"
          className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
        >
          + Start a Challenge
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search challenges…"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-fuchsia-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading challenges…" />
      ) : challenges.length === 0 ? (
        <p className="text-zinc-400">
          {search || category ? "No challenges match your filters." : "No challenges yet — start the first one."}
        </p>
      ) : (
        <>
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
                {c.category && <p className="mt-0.5 text-xs font-medium text-fuchsia-400">{c.category}</p>}
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-emerald-400">
                    {formatMoney(c.prizePoolCents, c.currency)} pool
                  </span>
                  <span className="text-zinc-500">{c._count?.submissions ?? 0} entries</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
