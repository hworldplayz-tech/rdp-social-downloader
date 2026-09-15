import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [info, setInfo] = useState(null)
  const [formats, setFormats] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchInfo = async () => {
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const res = await fetch('/api/video_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setInfo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchResolutions = async () => {
    setError(null)
    setFormats([])
    setLoading(true)
    try {
      const res = await fetch('/api/available_resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setFormats(data.formats || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Social Video Downloader (YouTube)</h1>
      <p>Paste a YouTube URL and fetch video info, available resolutions, or download the video. This app proxies requests server-side to avoid CORS.</p>

      <div style={{ marginBottom: 12 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
          style={{ width: '80%', padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={fetchInfo} disabled={loading || !url} style={{ marginRight: 8 }}>
          Get Video Info
        </button>
        <button onClick={fetchResolutions} disabled={loading || !url}>
          Get Available Resolutions
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {info && (
        <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 16 }}>
          <h2>{info.title}</h2>
          <p>Author: {info.author}</p>
          <p>Length: {info.lengthSeconds}s • Views: {info.viewCount}</p>
          {info.description && (
            <details>
              <summary>Description</summary>
              <p style={{ whiteSpace: 'pre-wrap' }}>{info.description}</p>
            </details>
          )}
        </div>
      )}

      {formats.length > 0 && (
        <div>
          <h3>Available Formats</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Resolution / Type</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Container</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Itag</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formats.map((f) => (
                <tr key={f.itag}>
                  <td style={{ padding: 8 }}>{f.qualityLabel || f.audioBitrate ? `${f.qualityLabel || 'audio'} ${f.audioBitrate ? '(audio)' : ''}` : f.itag}</td>
                  <td style={{ padding: 8 }}>{f.container}</td>
                  <td style={{ padding: 8 }}>{f.itag}</td>
                  <td style={{ padding: 8 }}>
                    {f.downloadUrl ? (
                      <a href={`/api/download?downloadUrl=${encodeURIComponent(f.downloadUrl)}`}>
                        Download
                      </a>
                    ) : (
                      <span>Not available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <strong>Notes:</strong>
        <ul>
          <li>This tool is for personal use. Downloading content may violate platform terms of service.</li>
          <li>Vercel has execution and bandwidth limits for serverless functions — for large files consider self-hosting.</li>
        </ul>
      </div>
    </div>
  )
}
