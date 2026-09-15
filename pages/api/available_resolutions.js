// Proxy available formats via SMDownloader API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Missing url in request body' })

  try {
    const apiRes = await fetch('https://www.smdownloader.com/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!apiRes.ok) {
      const text = await apiRes.text()
      console.error('smdownloader api error', apiRes.status, text)
      return res.status(500).json({ error: `SMDownloader error: ${apiRes.status}` })
    }

    const payload = await apiRes.json()
    if (!payload || !payload.ok) {
      console.error('smdownloader returned non-ok', payload)
      return res.status(500).json({ error: 'SMDownloader returned an error' })
    }

    const media = (payload.data && payload.data.media) || []
    const formats = media.map((m, idx) => {
      const downloadUrl = m.url && m.url.startsWith('http') ? m.url : `https://www.smdownloader.com${m.url}`
      return {
        id: idx,
        label: m.label || null,
        container: m.container || null,
        filesizeBytes: m.filesizeBytes || null,
        downloadUrl,
        filename: m.filename || null
      }
    })

    return res.status(200).json({ formats })
  } catch (err) {
    console.error('available_resolutions proxy error', err)
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
