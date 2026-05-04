import { useState, FormEvent, ChangeEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface UploadResult {
  deck_id: string
  access_token: string
}

export default function App() {
  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !email) return

    setStatus('loading')
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('file', file)

    try {
      const response = await fetch('/.netlify/functions/upload-deck', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === 'application/pdf') {
      setFile(selected)
    } else {
      setFile(null)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Pitch Deck Check</h1>
      <p>Upload your pitch deck PDF to get an investor-readiness score.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Email:<br />
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            PDF File:<br />
            <input
              type="file"
              name="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
            />
          </label>
        </div>

        <button type="submit" disabled={status === 'loading' || !file || !email}>
          Upload Deck
        </button>
      </form>

      {status === 'loading' && <p>Uploading...</p>}

      {status === 'error' && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {status === 'success' && result && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid green' }}>
          <p><strong>Upload successful!</strong></p>
          <p>deck_id: {result.deck_id}</p>
          <p>access_token: {result.access_token}</p>
        </div>
      )}
    </div>
  )
}
