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
      // Normalize RapidAPI response (they return `medias` in the sample)
      const out = {
        title: payload.title || payload.name || null,
        thumbnail: payload.thumbnail || payload.thumbnailUrl || null,
        duration: payload.duration || payload.length || null,
        source: payload.source || null,
        // Map `medias` -> formats
        formats: (payload.medias && Array.isArray(payload.medias) ? payload.medias.map(m => ({
          downloadUrl: m.url || null,
          audioUrl: m.audioUrl || null,
          qualityLabel: m.quality || null,
          container: m.extension || m.container || null,
          size: m.size || m.clen || null,
          formattedSize: m.formattedSize || null,
          videoAvailable: !!m.videoAvailable,
          audioAvailable: !!m.audioAvailable,
          requiresMerge: !!m.requiresMerge
        })) : []),
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
