import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  url: z.string().trim().min(1).max(2000).url(),
});

const DIRECT_MEDIA = /\.(mp3|m4a|wav|webm|ogg|opus|flac|mp4|mov|mkv)(\?|$)/i;
const MAX_BYTES = 24 * 1024 * 1024; // Groq upload cap

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Fetches the audio track for a given media URL.
 *
 * Platform links (YouTube, X, TikTok, Instagram, ...) require yt-dlp, which needs a
 * full persistent runtime. Deploy the companion service in `render/` to Render and set
 * YTDLP_SERVICE_URL so this route can delegate extraction to it.
 */
async function extractAudio(url: string, serviceUrl?: string) {
  if (serviceUrl) {
    const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env["YTDLP_SERVICE_TOKEN"]
          ? { Authorization: `Bearer ${process.env["YTDLP_SERVICE_TOKEN"]}` }
          : {}),
      },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Could not download audio from that link. ${detail.slice(0, 300)}`.trim(),
      );
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const name = res.headers.get("x-audio-filename") ?? "audio.m4a";
    return { bytes, name };
  }

  if (!DIRECT_MEDIA.test(url)) {
    throw new Error(
      "Extraction service not configured. Deploy the yt-dlp service (see render/README.md) and set YTDLP_SERVICE_URL to transcribe YouTube, X, TikTok or Instagram links.",
    );
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download the media file from that link.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("The downloaded file was empty.");
  if (bytes.byteLength > MAX_BYTES)
    throw new Error("That file is too large to transcribe (max 24 MB of audio).");
  const name = new URL(url).pathname.split("/").pop() || "audio.mp3";
  return { bytes, name };
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GROQ_API_KEY"];
        if (!apiKey) {
          return json({ error: "Transcription is not configured yet (missing API key)." }, 500);
        }

        let url: string;
        try {
          const parsed = BodySchema.parse(await request.json());
          url = parsed.url;
        } catch {
          return json({ error: "Please paste a valid link." }, 400);
        }

        let audio: { bytes: Uint8Array; name: string };
        try {
          audio = await extractAudio(url, process.env["YTDLP_SERVICE_URL"]);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Download failed." }, 502);
        }

        try {
          const form = new FormData();
          form.append("model", "whisper-large-v3-turbo");
          form.append("file", new Blob([audio.bytes as unknown as BlobPart]), audio.name);

          const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => "");
            return json(
              { error: `Transcription failed (${res.status}). ${detail.slice(0, 300)}`.trim() },
              502,
            );
          }

          const data = (await res.json()) as { text?: string };
          if (!data.text?.trim()) {
            return json({ error: "No speech was detected in that media." }, 422);
          }
          return json({ text: data.text.trim() });
        } catch {
          return json({ error: "Transcription failed unexpectedly. Please try again." }, 500);
        }
      },
    },
  },
});
