import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { VideoCard } from "../components/VideoCard";
import { Spinner } from "../components/Spinner";
import type { Submission } from "../types";

/**
 * The landing page for a shared link (/s/:id): one entry, full height, with a
 * way into the challenge it belongs to. Most people arriving here have never
 * seen the app, so the call to action is the challenge, not the feed.
 */
export function SubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setSubmission(null);
    setError(null);
    api
      .get<Submission>(`/api/submissions/${id}`)
      .then(({ data }) => !cancelled && setSubmission(data))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-bold text-white">This entry isn't available</h1>
        <p className="mt-2 text-zinc-400">It may have been removed, or the link is incomplete.</p>
        <Link
          to="/challenges"
          className="mt-6 inline-block rounded-full bg-fuchsia-600 px-6 py-3 font-semibold text-white hover:bg-fuchsia-500"
        >
          Browse challenges
        </Link>
      </div>
    );
  }

  if (!submission) return <Spinner label="Loading entry…" />;

  return (
    <div className="flex flex-col items-center gap-4">
      <VideoCard submission={submission} showChallengeLink />
      {submission.challenge && (
        <Link
          to={`/challenges/${submission.challenge.id}`}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          See every entry in #{submission.challenge.title}
        </Link>
      )}
    </div>
  );
}
