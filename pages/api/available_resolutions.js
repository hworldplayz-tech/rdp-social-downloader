import ytdl from 'ytdl-core'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url in request body' })

  try {
    const info = await ytdl.getInfo(url)
    const formats = info.formats || []

    // Filter out formats that are not downloadable or are dash-only without container
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
      // Deduplicate by itag
      .reduce((acc, cur) => {
        if (!acc.find((a) => a.itag === cur.itag)) acc.push(cur)
        return acc
      }, [])

    return res.status(200).json({ formats: available })
  } catch (err) {
    console.error('available_resolutions error', err?.message || err)
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
