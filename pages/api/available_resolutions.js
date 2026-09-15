import ytdl from 'ytdl-core'

function normalizeYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be')) {
      const id = u.pathname.replace(/^\//, '')
      return id ? `https://www.youtube.com/watch?v=${id}` : null
    }
    if (u.searchParams && u.searchParams.get('v')) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`
    }
    if (u.hostname.includes('youtube.com')) return url
  } catch (e) {
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
    const formats = info.formats || []

    const available = formats
      .filter((f) => f.container)
      .map((f) => ({
        itag: f.itag,
        qualityLabel: f.qualityLabel || null,
        audioBitrate: f.audioBitrate || null,
        container: f.container || null,
        hasVideo: !!f.qualityLabel,
        hasAudio: !!f.audioBitrate || !!f.mimeType && f.mimeType.includes('audio')
      }))
      .reduce((acc, cur) => {
        if (!acc.find((a) => a.itag === cur.itag)) acc.push(cur)
        return acc
      }, [])

    return res.status(200).json({ formats: available })
  } catch (err) {
    console.error('available_resolutions error', err?.message || err)
    const message = err?.message || String(err)
    return res.status(500).json({ error: message })
  }
}
