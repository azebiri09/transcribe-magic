# yt-dlp extractor service (Render)

`yt-dlp` needs a full persistent runtime, so audio extraction runs as its own
standard Node service. The app's `/api/transcribe` route calls it, then sends the
audio to Groq (`whisper-large-v3-turbo`) and returns the transcript.

## Deploy to Render

1. Push this repo to GitHub.
2. Render → **New → Web Service** → pick the repo.
3. Root directory: `render`, Runtime: **Docker** (the Dockerfile installs yt-dlp + ffmpeg).
4. Environment variables:
   - `YTDLP_SERVICE_TOKEN` — any strong random string (optional but recommended).
5. Deploy, then copy the service URL (e.g. `https://transcriber-ytdlp.onrender.com`).

## Wire it to the app

Set these environment variables on the app:

- `GROQ_API_KEY` — your Groq API key.
- `YTDLP_SERVICE_URL` — the Render service URL from above.
- `YTDLP_SERVICE_TOKEN` — the same token as the service, if you set one.

Without `YTDLP_SERVICE_URL`, the app can still transcribe direct audio/video file
links (`.mp3`, `.m4a`, `.mp4`, ...) but not platform links.

## Local run

```bash
cd render && npm install && npm start
```

## Endpoints

- `GET /health` → `{ ok: true }`
- `POST /extract` `{ "url": "..." }` → mp3 bytes (temp files are always deleted)
