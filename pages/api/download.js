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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end('Method Not Allowed')
  }

  const { url, itag } = req.query || {}
  if (!url) return res.status(400).end('Missing url')
  if (!itag) return res.status(400).end('Missing itag')

  const normalized = normalizeYoutubeUrl(url)
  if (!normalized) return res.status(400).end('Could not parse YouTube URL')

  try {
    const info = await ytdl.getInfo(normalized, {
      requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    })
    const chosen = info.formats.find((f) => String(f.itag) === String(itag))
    if (!chosen) return res.status(404).end('Format not found')

    const title = (info.videoDetails && info.videoDetails.title) || 'video'
    const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '')
    const ext = chosen.container || 'mp4'

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${ext}"`)

    const stream = ytdl.downloadFromInfo(info, { format: chosen })
    stream.on('error', (err) => {
      console.error('download stream error', err)
      try { res.end() } catch (e) {}
    })
    stream.pipe(res)
  } catch (err) {
    console.error('download error', err?.message || err)
    return res.status(500).end(String(err?.message || err))
  }
}
