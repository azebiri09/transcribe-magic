import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AudioWaveform, Check, Copy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Transcriber — Audio & Video Link to Text" },
      {
        name: "description",
        content:
          "Paste a YouTube, X, TikTok, Instagram or any audio/video link and get an accurate transcript in seconds.",
      },
      { property: "og:title", content: "Transcriber — Audio & Video Link to Text" },
      {
        property: "og:description",
        content:
          "Paste any audio or video link and get a fast, accurate transcript you can copy in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function transcribe() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    setTranscript("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setTranscript(data.text);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="page-gradient flex min-h-screen items-center justify-center px-5 py-14">
      <div className="w-full max-w-2xl">
        <header className="flex flex-col items-center text-center">
          <div className="glass-panel flex size-12 items-center justify-center rounded-2xl">
            <AudioWaveform className="size-6 text-accent" strokeWidth={2.2} />
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground">Transcriber</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste any audio or video link and get the transcript.
          </p>
        </header>

        <section className="glass-panel mt-9 rounded-3xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && transcribe()}
              placeholder="Paste YouTube, X, TikTok, Instagram or any audio/video link..."
              aria-label="Media link"
              className="h-12 flex-1 rounded-2xl border-transparent bg-secondary/70 px-4 text-sm shadow-none focus-visible:ring-ring/50"
            />
            <Button
              onClick={transcribe}
              disabled={loading || !url.trim()}
              className="h-12 rounded-2xl px-5 text-sm font-semibold"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Transcribe
            </Button>
          </div>
          {error && (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        <section className="glass-panel mt-5 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Transcription</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
              disabled={!transcript}
              className="h-8 rounded-lg text-xs"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="mt-3 min-h-52 rounded-2xl bg-secondary/60 p-4">
            {loading ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Extracting audio and transcribing…
                </p>
                {[92, 100, 78, 88].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 animate-pulse rounded-full bg-muted-foreground/15"
                    style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            ) : transcript ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {transcript}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your transcript will appear here once it's ready.
              </p>
            )}
          </div>
        </section>

        <p className="mt-7 text-center text-xs text-muted-foreground">
          Your data is private and secure.
        </p>
      </div>
    </main>
  );
}
