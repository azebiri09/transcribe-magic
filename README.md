# Transcribe Magic

Build a web app called "Transcriber" with this design: clean, minimal, glassmorphism style, centered card layout on a soft gradient background.



Header: a small rounded icon (sound wave icon), title "Transcriber" in bold, subtitle text "Paste any audio or video link and get the transcript."



Main input section: a card with a link input field (placeholder: "Paste YouTube, X, TikTok, Instagram or any audio/video link...") and a dark "Transcribe" button with a sparkle icon, positioned to the right of the input.



Below that, a second card labeled "Transcription" with a "Copy" button in the top right, and a text area below that displays the returned transcript once ready. Show a loading state while transcription is in progress.



Footer text: "Your data is private and secure."



Backend functionality:

- Create an API route that accepts a video/audio URL via POST request

- The route should use yt-dlp to extract the audio track from the given URL

- Send the extracted audio to Groq's API using model "whisper-large-v3-turbo" for transcription (Groq API endpoint: https://api.groq.com/openai/v1/audio/transcriptions)

- Return the transcribed text as JSON

- Store the Groq API key as an environment variable (GROQ_API_KEY), not hardcoded

- Handle errors gracefully (invalid URL, failed download, failed transcription) and show a clear error message in the UI

- Clean up any temporary audio files after transcription completes



Deploy target: Render (not Vercel, not serverless functions — a standard persistent Node/Python service, since yt-dlp needs a full runtime environment).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/14aa6309-cf02-441a-a297-9956eea0f10c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
