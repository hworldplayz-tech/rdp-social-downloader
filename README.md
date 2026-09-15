# Social Video Downloader (Next.js, Vercel-ready)

This is a minimal single-page Next.js app that allows fetching YouTube video info, listing available formats/resolutions, and streaming a selected format for download. The app exposes server-side API routes which perform YouTube operations using ytdl-core so the browser does not hit CORS-protected endpoints directly.

WARNING: Downloading video content may violate the terms of service of platforms such as YouTube. Use this project only for permitted personal uses and respect copyright and platform rules.

Quick start
1. Install dependencies:

   npm install

2. Run development server:

   npm run dev

Open http://localhost:3000

Vercel deployment notes
- This project uses serverless functions (Next.js API routes). Vercel imposes execution time and memory limits; streaming large videos may fail or be cut off. For production or heavy usage consider self-hosting on a server with sufficient resources.
- If deploying to Vercel, simply push this repo and deploy. Alternatively, you can deploy to other Node hosts.

API endpoints
- POST /api/video_info { url } -> returns metadata (title, author, lengthSeconds, viewCount, description, thumbnails)
- POST /api/available_resolutions { url } -> returns available formats (itag, qualityLabel, container, audioBitrate)
- GET /api/download?url=<url>&itag=<itag> -> streams the chosen format for download

Limitations & next steps
- Add input validation and rate-limiting.
- Support other platforms (Twitter, Instagram) by integrating platform-specific scrapers or server-side libraries.
- Add queuing or temporary storage for large files.
