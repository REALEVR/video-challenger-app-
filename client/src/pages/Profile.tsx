import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCompactNumber, formatMoney } from "../lib/format";
import type { Payout, Submission, User } from "../types";

interface ProfileData extends User {
  submissions: Submission[];
}

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<ProfileData>(`/api/users/${id}`).then(({ data }) => setProfile(data));
  }, [id]);

  useEffect(() => {
    if (me && me.id === id) {
      api
        .get<Payout[]>(`/api/users/${id}/payouts`)
        .then(({ data }) => setPayouts(data))
        .catch(() => {});
    }
  }, [me, id]);

  if (!profile) return <p className="text-zinc-400">Loading…</p>;

  const isSelf = me?.id === id;
  const totalEarned = payouts
    .filter((p) => p.status === "PAID" || p.status === "SIMULATED")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const connectStripe = async () => {
    setBusy(true);
    setOnboardError(null);
    try {
      const { data } = await api.post<{ url: string }>("/api/users/me/stripe/onboard");
      window.location.href = data.url;
    } catch (err) {
      setOnboardError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-2xl font-bold text-white">
          {profile.displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
          {profile.bio && <p className="text-sm text-zinc-400">{profile.bio}</p>}
        </div>
      </div>

      {isSelf && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-2 text-lg font-bold text-white">Your earnings</h2>
          <p className="mb-4 text-3xl font-bold text-emerald-400">{formatMoney(totalEarned)}</p>
          {!me?.hasStripeAccount && (
            <>
              <p className="mb-2 text-sm text-zinc-400">
                Connect a payout account to receive real money when your entries win. Until you do, payouts are
                computed and shown here but marked "simulated".
              </p>
              <button
                onClick={connectStripe}
                disabled={busy}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {busy ? "Redirecting…" : "Connect payout account"}
              </button>
              {onboardError && <p className="mt-2 text-sm text-amber-400">{onboardError}</p>}
            </>
          )}

          {payouts.length > 0 && (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1">Challenge</th>
                  <th className="py-1 text-right">Amount</th>
                  <th className="py-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800 text-zinc-200">
                    <td className="py-2">
                      <Link to={`/challenges/${p.challengeId}`} className="hover:text-fuchsia-400">
                        {p.challenge?.title}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                    <td className="py-2 text-right text-zinc-400">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-bold text-white">Entries</h2>
        {profile.submissions.length === 0 ? (
          <p className="text-zinc-400">No entries yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.submissions.map((s) => (
              <Link
                key={s.id}
                to={`/challenges/${s.challenge?.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-fuchsia-600"
              >
                <p className="truncate font-medium text-white">{s.caption || "(untitled entry)"}</p>
                <p className="mt-1 text-xs text-zinc-500">in {s.challenge?.title}</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {formatCompactNumber(s.viewCount)} views · {formatCompactNumber(s.voteCount)} votes
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
