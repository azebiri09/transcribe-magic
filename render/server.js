import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const app = express();
app.use(express.json({ limit: "16kb" }));

const TOKEN = process.env.YTDLP_SERVICE_TOKEN;

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/extract", async (req, res) => {
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  try {
    // Rejects anything that is not a valid absolute http(s) URL.
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), "transcriber-"));
    await run("yt-dlp", [
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "-f",
      "bestaudio/best",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "5",
      "--max-filesize",
      "200M",
      "-o",
      join(dir, "audio.%(ext)s"),
      "--",
      url,
    ]);

    const file = (await readdir(dir)).find((f) => f.startsWith("audio."));
    if (!file) throw new Error("No audio track was produced for that link.");
    const buffer = await readFile(join(dir, file));

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("x-audio-filename", file);
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: err?.message || "Download failed" });
  } finally {
    // Always clean up temporary audio files.
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", () => reject(new Error("yt-dlp is not installed")));
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(stderr.split("\n").filter(Boolean).pop() || "Download failed")),
    );
  });
}

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`yt-dlp extractor listening on ${port}`));
