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
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
