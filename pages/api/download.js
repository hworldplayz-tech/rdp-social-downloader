// Proxy download requests via SMDownloader direct download URL

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end('Method Not Allowed')
  }

  const { downloadUrl } = req.query || {}
  if (!downloadUrl) return res.status(400).end('Missing downloadUrl')

  // Allow googlevideo.com and smdownloader.com hosts (RapidAPI returns googlevideo URLs)
  try {
    const parsed = new URL(downloadUrl)
    const host = parsed.hostname || ''
    if (!host.includes('smdownloader.com') && !host.includes('googlevideo.com')) {
      return res.status(400).end('downloadUrl must be from smdownloader.com or googlevideo.com')
    }
  } catch (e) {
    return res.status(400).end('Invalid downloadUrl')
  }

  try {
    const externalRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Referer: 'https://www.smdownloader.com/',
        Origin: 'https://www.smdownloader.com',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    if (!externalRes.ok) {
      const text = await externalRes.text()
      console.error('external download fetch failed', externalRes.status, text)
      return res.status(externalRes.status).end(text || 'Failed to fetch remote file')
    }

    const contentType = externalRes.headers.get('content-type') || 'application/octet-stream'
    const contentLength = externalRes.headers.get('content-length')
    const disposition = externalRes.headers.get('content-disposition') || null

    res.setHeader('Content-Type', contentType)
    if (contentLength) res.setHeader('Content-Length', contentLength)
    if (disposition) res.setHeader('Content-Disposition', disposition)

    // Buffering for now — streaming could be implemented if needed
    const buffer = Buffer.from(await externalRes.arrayBuffer())
    res.status(200).end(buffer)
  } catch (err) {
    console.error('download proxy error', err)
    return res.status(500).end(String(err?.message || err))
  }
}
