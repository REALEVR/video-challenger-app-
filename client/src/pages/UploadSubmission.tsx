import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

export function UploadSubmission() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a video file first.");
      return;
    }
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("challengeId", id!);
      form.append("caption", caption);
      form.append("video", file);
      await api.post("/api/submissions", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      navigate(`/challenges/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-white">Submit your entry</h1>
      <p className="mb-6 text-sm text-zinc-400">
        MP4, MOV, WebM, or MKV, up to 200MB. Once submitted, anyone in the world can watch and vote for it.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-fuchsia-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-fuchsia-500"
        />
        <textarea
          rows={3}
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-fuchsia-500 focus:outline-none"
        />
        {busy && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-fuchsia-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
        >
          {busy ? `Uploading… ${progress}%` : "Submit entry"}
        </button>
      </form>
    </div>
  );
}
