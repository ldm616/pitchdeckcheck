import { useState, FormEvent, ChangeEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface UploadResult {
  deck_id: string
  access_token: string
}

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export default function App() {
  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !email) return

    setStatus('loading')
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
        const errorMessage = data.error || 'Upload failed'
        console.error('Upload error:', errorMessage)
        throw new Error(errorMessage)
      }

      setResult(data)
      setStatus('success')
    } catch (err) {
      console.error('Upload error:', err)
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

  const isDisabled = status === 'loading' || !file || !email

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#f8f9fa',
        fontFamily,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          padding: '40px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 12px 0',
              letterSpacing: '-0.025em',
            }}
          >
            Pitch Deck Check
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Upload your pitch deck to get an investor-readiness review.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '15px',
                fontFamily,
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="file"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Pitch deck (PDF)
            </label>
            <div
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <input
                id="file"
                type="file"
                name="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                style={{
                  fontSize: '14px',
                  fontFamily,
                  cursor: 'pointer',
                }}
              />
              {file && (
                <p
                  style={{
                    marginTop: '8px',
                    marginBottom: 0,
                    fontSize: '13px',
                    color: '#059669',
                  }}
                >
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily,
              color: '#ffffff',
              backgroundColor: isDisabled ? '#9ca3af' : '#2563eb',
              border: 'none',
              borderRadius: '8px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'loading' ? 'Uploading...' : 'Upload Deck'}
          </button>
        </form>

        {status === 'error' && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#dc2626',
              }}
            >
              Upload failed. Please try again.
            </p>
          </div>
        )}

        {status === 'success' && result && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '15px',
                fontWeight: 500,
                color: '#166534',
              }}
            >
              Upload successful
            </p>
            <div style={{ fontSize: '13px', color: '#374151' }}>
              <p style={{ margin: '0 0 4px 0' }}>
                <span style={{ color: '#6b7280' }}>deck_id:</span>{' '}
                <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                  {result.deck_id}
                </code>
              </p>
              <p style={{ margin: 0 }}>
                <span style={{ color: '#6b7280' }}>access_token:</span>{' '}
                <code style={{ backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                  {result.access_token}
                </code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
