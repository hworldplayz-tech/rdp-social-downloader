// This API route proxies video info requests to the public SMDownloader API
// to avoid direct scraping in serverless functions and handle CORS.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url in request body' })

  try {
    // Use RapidAPI yt-downloader1 as requested. Uses RAPIDAPI_KEY env or provided fallback.
    const RAPID_HOST = 'yt-downloader1.p.rapidapi.com'
    const RAPID_KEY = process.env.RAPIDAPI_KEY || '62986a77ebmsh62840eb3353b7adp1e4b2ejsne434dd8370ea'

    // extract video id for 'key' query param as example in user's curl
    let videoId = null
    try {
      const u = new URL(url)
      if (u.searchParams && u.searchParams.get('v')) videoId = u.searchParams.get('v')
      if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.replace(/^\//, '')
    } catch (e) {
      const m = (url || '').match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
      if (m) videoId = m[1]
    }

    const queryUrl = `https://${RAPID_HOST}/api?url=${encodeURIComponent(url)}${videoId ? `&key=${encodeURIComponent(videoId)}` : ''}`
    const apiRes = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPID_HOST,
        'x-rapidapi-key': RAPID_KEY,
        Accept: 'application/json'
      }
    })

    const text = await apiRes.text()
    // Try parse JSON, otherwise return raw text
    try {
      const payload = JSON.parse(text)
      // Normalize payload: ensure thumbnail and formats list are in a friendly shape
      const out = {
        title: payload.title || payload.name || null,
        author: payload.author || payload.channel || null,
        description: payload.description || payload.desc || null,
        lengthSeconds: payload.lengthSeconds || payload.duration || payload.length || null,
        viewCount: payload.viewCount || payload.views || null,
        thumbnail: payload.thumbnail || payload.thumbnailUrl || (payload.thumbnails && payload.thumbnails[0]) || null,
        // formats: prefer payload.formats or payload.data.media or payload.streams
        formats: (payload.formats && payload.formats.map(fmt => ({
          itag: fmt.itag || fmt.itagNo || fmt.itagNumber || null,
          qualityLabel: fmt.qualityLabel || fmt.quality || fmt.label || null,
          container: fmt.container || fmt.extension || fmt.mimeType || null,
          downloadUrl: fmt.url || fmt.downloadUrl || fmt.direct || null,
          audioUrl: fmt.audioUrl || null,
          size: fmt.clen || fmt.size || fmt.filesizeBytes || null,
          audioBitrate: fmt.audioBitrate || null
        }))) || (payload.data && payload.data.media && payload.data.media.map(m => ({
          itag: m.itag || null,
          qualityLabel: m.quality || m.label || null,
          container: m.container || m.extension || null,
          downloadUrl: m.url && m.url.startsWith('http') ? m.url : (m.url ? `https://www.smdownloader.com${m.url}` : null),
          size: m.filesizeBytes || null
        }))) || payload.streams || payload.items || []
      }

      return res.status(apiRes.status).json(out)
    } catch (e) {
      return res.status(apiRes.status).send(text)
    }
  } catch (err) {
    console.error('video_info proxy error', err)
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
