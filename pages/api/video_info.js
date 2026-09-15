import ytdl from 'ytdl-core'

function normalizeYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    // youtu.be short link
    if (u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be')) {
      const id = u.pathname.replace(/^\//, '')
      return id ? `https://www.youtube.com/watch?v=${id}` : null
    }
    // youtube.com with v param
    if (u.searchParams && u.searchParams.get('v')) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`
    }
    // If already a watch URL
    if (u.hostname.includes('youtube.com')) return url
  } catch (e) {
    // fallback: try to extract id via regex
    const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url in request body' })

  const normalized = normalizeYoutubeUrl(url)
  if (!normalized) return res.status(400).json({ error: 'Could not parse YouTube URL' })

  try {
    const info = await ytdl.getInfo(normalized, {
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    })
    const d = info.videoDetails || {}
    return res.status(200).json({
      title: d.title,
      author: d.author && d.author.name,
      lengthSeconds: d.lengthSeconds,
      viewCount: d.viewCount,
      description: d.description,
      publishDate: d.publishDate,
      thumbnails: d.thumbnails
    })
  } catch (err) {
    console.error('video_info error', err?.message || err)
    // ytdl-core sometimes throws with a complex error; return status and message
    const message = err?.message || String(err)
    return res.status(500).json({ error: message })
  }
}
