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
    const apiRes = await fetch('https://www.smdownloader.com/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Referer: 'https://www.smdownloader.com/',
        Origin: 'https://www.smdownloader.com',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: JSON.stringify({ url })
    })

    if (!apiRes.ok) {
      const text = await apiRes.text()
      console.error('smdownloader api error', apiRes.status, text)
      // Pass through status and body to help debugging client-side
      return res.status(apiRes.status).json({ error: text || `SMDownloader error: ${apiRes.status}` })
    }

    const payload = await apiRes.json()
    if (!payload || !payload.ok) {
      console.error('smdownloader returned non-ok', payload)
      return res.status(502).json({ error: payload || 'SMDownloader returned an error' })
    }

    const data = payload.data || {}
    // return a compact video info object
    return res.status(200).json({
      title: data.title || null,
      description: data.description || null,
      sourceUrl: data.sourceUrl || null,
      thumbnails: data.media && data.media[0] && data.media[0].thumbnail ? [data.media[0].thumbnail] : []
    })
  } catch (err) {
    console.error('video_info proxy error', err)
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
