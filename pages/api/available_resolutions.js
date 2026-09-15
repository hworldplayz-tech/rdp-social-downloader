// Proxy available formats via SMDownloader API

// This endpoint is deprecated in favor of /api/video_info which now
// returns a normalized formats array. Keep the route to avoid UI errors
// but respond with a helpful message directing callers to use /api/video_info.
export default async function handler(req, res) {
  return res.status(410).json({ error: 'Deprecated. Use POST /api/video_info to get formats and download URLs.' })
}
