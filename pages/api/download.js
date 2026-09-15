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
    // Try fetching with a few header variations to improve chances with googlevideo URLs
    const headerSets = [
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Referer: 'https://www.smdownloader.com/',
        Origin: 'https://www.smdownloader.com',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'video/*'
      },
      {
        // alternate: present as YouTube referrer
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Referer: 'https://www.youtube.com/',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'video/*'
      }
    ]

    let externalRes = null
    let lastErrText = null
    for (const headers of headerSets) {
      try {
        externalRes = await fetch(downloadUrl, { headers })
      } catch (e) {
        console.error('fetch error for downloadUrl', e)
        lastErrText = String(e?.message || e)
        externalRes = null
      }
      if (externalRes) {
        if (!externalRes.ok) {
          // try to capture body for debugging
          try { lastErrText = await externalRes.text() } catch (e) { lastErrText = String(e?.message || e) }
          console.error('external download fetch failed', externalRes.status, lastErrText)
          // try next header set
          externalRes = null
          continue
        }
        // success
        break
      }
    }

    if (!externalRes) {
      // If the URL is a googlevideo signed URL it is often IP- or client-bound
      // (contains ip= or sparams tying it to the original requester). In that
      // case the server (Vercel) cannot fetch it from its own IP. Fall back to
      // redirecting the user's browser to the direct URL so the download occurs
      // from the user's IP (works in most cases).
      try {
        const parsed = new URL(downloadUrl)
        if (parsed.hostname && parsed.hostname.includes('googlevideo.com')) {
          // Use 307 Temporary Redirect to preserve method semantics
          res.setHeader('Cache-Control', 'no-store')
          return res.redirect(307, downloadUrl)
        }
      } catch (e) {
        // ignore parse errors
      }

      return res.status(502).end(`Failed to fetch remote file${lastErrText ? `: ${lastErrText}` : ''}`)
    }

    const contentType = externalRes.headers.get('content-type') || 'application/octet-stream'
    const contentLength = externalRes.headers.get('content-length')
    const disposition = externalRes.headers.get('content-disposition') || null

    res.setHeader('Content-Type', contentType)
    if (contentLength) res.setHeader('Content-Length', contentLength)
    if (disposition) res.setHeader('Content-Disposition', disposition)

    // Stream the response body to the client to avoid buffering large files
    // Support both WHATWG ReadableStream and Node Readable stream
    const body = externalRes.body
    if (!body) {
      // fallback to buffering small responses
      const buffer = Buffer.from(await externalRes.arrayBuffer())
      res.status(200).end(buffer)
      return
    }

    // If it's a web ReadableStream (has getReader), use reader
    if (typeof body.getReader === 'function') {
      res.status(200)
      const reader = body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
      } catch (e) {
        console.error('stream pipe error', e)
      } finally {
        res.end()
      }
      return
    }

    // Otherwise assume Node.js Readable and pipe
    if (body.pipe) {
      res.status(200)
      body.pipe(res)
      return
    }
  } catch (err) {
    console.error('download proxy error', err)
    return res.status(500).end(String(err?.message || err))
  }
}
