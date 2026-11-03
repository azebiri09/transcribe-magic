import express from "express";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const app = express();
app.use(express.json({ limit: "16kb" }));

const TOKEN = process.env.YTDLP_SERVICE_TOKEN;

// Cookies in Netscape format. Prefer the base64 variable because multiline
// values are easy to break in env var fields.
function loadCookies() {
  const b64 = process.env.YTDLP_COOKIES_B64;
  if (b64 && b64.trim()) {
    try {
      return Buffer.from(b64.trim(), "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  const raw = process.env.YTDLP_COOKIES;
  return raw && raw.trim() ? raw : "";
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, cookies: Boolean(loadCookies()) }),
);

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

    const args = [
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
    ];

    // yt-dlp can rewrite the cookie file, so each request gets its own copy
    // inside the temp dir, which is deleted in the finally block.
    const cookies = loadCookies();
    if (cookies) {
      const cookiePath = join(dir, "cookies.txt");
      await writeFile(cookiePath, cookies, { mode: 0o600 });
      args.push("--cookies", cookiePath);
    }

    args.push("--", url);
    await run("yt-dlp", args);

    const file = (await readdir(dir)).find((f) => f.startsWith("audio."));
    if (!file) throw new Error("No audio track was produced for that link.");
    const buffer = await readFile(join(dir, file));

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("x-audio-filename", file);
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: err?.message || "Download failed" });
  } finally {
    // Always clean up temporary audio and cookie files.
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
