import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Spinner } from "../components/Spinner";
import { formatMoney, formatCompactNumber } from "../lib/format";
import type { Challenge, Payout } from "../types";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-zinc-400",
  SIMULATED: "text-amber-400",
  PROCESSING: "text-amber-400",
  PAID: "text-emerald-400",
  FAILED: "text-red-400",
};

export function AdminPayouts() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      api.get<Challenge>(`/api/challenges/${id}`),
      api.get<Payout[]>(`/api/payouts/challenge/${id}`),
    ]);
    setChallenge(c);
    setPayouts(p);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!challenge) return <Spinner label="Loading payouts…" />;

  const isOwner = user?.id === challenge.createdById || user?.role === "ADMIN";
  const totalPaid = payouts.reduce((sum, p) => sum + p.amountCents, 0);

  const disburse = async () => {
    setBusy(true);
    try {
      await api.post(`/api/challenges/${challenge.id}/disburse-payouts`);
      showToast("Payouts disbursed (or simulated, if Stripe isn't connected).", "success");
      await load();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to={`/challenges/${challenge.id}`} className="text-sm text-fuchsia-400 hover:underline">
        ← Back to {challenge.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-white">Payouts</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Prize pool {formatMoney(challenge.prizePoolCents, challenge.currency)}, split by{" "}
        {challenge.payoutModel.toLowerCase()}. Allocated so far: {formatMoney(totalPaid, challenge.currency)}.
      </p>

      {payouts.length === 0 ? (
        <p className="mt-6 text-zinc-400">
          No payouts computed yet.{" "}
          {isOwner && "Close voting on the challenge page first, then payouts appear here."}
        </p>
      ) : (
        <>
          {isOwner && payouts.some((p) => p.status === "PENDING") && (
            <button
              onClick={disburse}
              disabled={busy}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Disbursing…" : "Disburse all pending payouts"}
            </button>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3 text-right">View share</th>
                  <th className="px-4 py-3 text-right">Vote share</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800 text-zinc-200">
                    <td className="px-4 py-3">
                      <Link to={`/profile/${p.userId}`} className="hover:text-fuchsia-400">
                        {p.user?.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{(p.viewShare * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">{(p.voteShare * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                      {formatMoney(p.amountCents, p.currency)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            "SIMULATED" means the amount was computed correctly but no real money moved — connect Stripe on the
            server (STRIPE_SECRET_KEY) and have creators link a payout account to disburse for real.
          </p>
        </>
      )}
    </div>
  );
}
