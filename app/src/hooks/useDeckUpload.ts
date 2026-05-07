import { useState, useCallback, ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadDeck, triggerBackgroundProcessing } from '../lib/api'
import { getProcessingPath } from '../lib/routes'
import type { Status } from '../lib/types'

interface UseDeckUploadReturn {
  file: File | null
  fileName: string | null
  status: Status
  errorMessage: string | null
  isProcessing: boolean
  isDisabled: boolean
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleFileDrop: (file: File) => void
  handleSubmit: (e: FormEvent) => Promise<void>
  reset: () => void
}

export function useDeckUpload(): UseDeckUploadReturn {
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isProcessing = status === 'uploading' || status === 'processing'
  const isDisabled = isProcessing || !file

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === 'application/pdf') {
      setFile(selected)
      setErrorMessage(null)
    } else {
      setFile(null)
      if (selected) {
        setErrorMessage('Please select a PDF file')
      }
    }
  }, [])

  const handleFileDrop = useCallback((droppedFile: File) => {
    if (droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      setErrorMessage(null)
    } else {
      setErrorMessage('Please drop a PDF file')
    }
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setErrorMessage(null)

    try {
      // Upload the deck (no email required)
      const uploadResult = await uploadDeck(file)

      // Switch to processing state
      setStatus('processing')

      // Fire and forget - trigger background processing
      triggerBackgroundProcessing(uploadResult.deck_id, uploadResult.access_token).catch((err) => {
        console.error('Background processing trigger error:', err)
        // Don't fail - polling will detect the actual status
      })

      // Navigate to processing page
      navigate(getProcessingPath(uploadResult.deck_id, uploadResult.access_token), { replace: true })
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('error')
      setErrorMessage('Upload failed. Please try again.')
    }
  }, [file, navigate])

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  return {
    file,
    fileName: file?.name || null,
    status,
    errorMessage,
    isProcessing,
    isDisabled,
    handleFileChange,
    handleFileDrop,
    handleSubmit,
    reset,
  }
}
