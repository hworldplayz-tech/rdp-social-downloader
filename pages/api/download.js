import ytdl from 'ytdl-core'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end('Method Not Allowed')
  }

  const { url, itag } = req.query || {}
  if (!url) return res.status(400).end('Missing url')
  if (!itag) return res.status(400).end('Missing itag')

  try {
    const info = await ytdl.getInfo(url)
    const chosen = info.formats.find((f) => String(f.itag) === String(itag))
    if (!chosen) return res.status(404).end('Format not found')

    const title = (info.videoDetails && info.videoDetails.title) || 'video'
    // sanitize filename basic
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
