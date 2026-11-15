import { useEffect, useRef, useState } from 'react'
import './App.css'

type HealthStatus = {
  status: string
  app: string
}

type ScanResponse = {
  status: string
  message: string
  extractedText: string
  confidence: number
  source: 'image' | 'manual'
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function App() {
  const [apiStatus, setApiStatus] = useState('Checking API...')
  const [resultText, setResultText] = useState('The quick brown fox jumps over the lazy dog.')
  const [voiceRate, setVoiceRate] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [alignmentHint, setAlignmentHint] = useState('Center the braille line in the frame')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`)
        if (!response.ok) throw new Error('API unavailable')
        const data: HealthStatus = await response.json()
        setApiStatus(`${data.app} • ${data.status}`)
      } catch {
        setApiStatus('API unavailable. Check backend connection.')
      }
    }

    void checkHealth()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (!cameraOpen) {
      setAlignmentHint('Center the braille line in the frame')
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      return
    }

    if (!streamRef.current || !videoRef.current) return

    videoRef.current.srcObject = streamRef.current
    videoRef.current.muted = true
    videoRef.current.playsInline = true
    videoRef.current.play().catch(() => {
      setCameraError('Camera preview could not start. Please try again.')
    })
  }, [cameraOpen])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraOpen(false)
  }

  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera is not supported on this browser.')
      return
    }

    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      setCameraOpen(true)
      setAlignmentHint('Center the braille line in the frame')
    } catch {
      setCameraError('Camera permission denied or unavailable. Please allow access.')
      setCameraOpen(false)
    }
  }

  const analyzeImage = async (imageData: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) throw new Error('Scan failed')

      const data: ScanResponse = await response.json()
      setResultText(data.extractedText)
      setApiStatus(`${data.message} • confidence ${data.confidence.toFixed(2)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setResultText('Scan failed. Try a clearer photo with better light.')
      setApiStatus(`Unable to read the braille image. (${message})`)
    } finally {
      setIsLoading(false)
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL('image/jpeg', 0.92)

    setPreviewImage(imageData)
    setAlignmentHint('Image captured, reading braille...')
    setCameraOpen(false)
    stopCamera()
    await analyzeImage(imageData)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const imageData = String(reader.result)
      setPreviewImage(imageData)
      await analyzeImage(imageData)
    }
    reader.readAsDataURL(file)
  }

  const handleSpeak = async () => {
    const textToSpeak = resultText.trim()
    if (!textToSpeak) return

    setIsSpeaking(true)

    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: 'default', rate: voiceRate }),
      })

      if (!response.ok) {
        throw new Error('TTS API unavailable')
      }

      const data = await response.json()
      setApiStatus(`Voice ready • ${data.voice} • ${data.rate}x`)
    } catch {
      setApiStatus('Voice ready in browser')
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = voiceRate
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }

    setIsSpeaking(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText)
      setApiStatus('Copied to clipboard')
    } catch {
      setApiStatus('Copy not supported in this browser')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ScanBraille</p>
          <h1>Braille Reader</h1>
        </div>
      </header>

      <div className="api-status">{apiStatus}</div>

      <main className="scan-layout">
        <section className="card scan-card">
          <div className="camera-stage" aria-label="Camera preview area">
            {cameraOpen ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                <div className="braille-grid-overlay" aria-hidden="true">
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                </div>
                <div className="camera-overlay-hint">{alignmentHint}</div>
              </>
            ) : previewImage ? (
              <img src={previewImage} alt="Braille capture preview" className="preview-image" />
            ) : (
              <div className="camera-placeholder">
                <div className="scan-border" />
                <div className="scan-hud scan-hud-left" />
                <div className="scan-hud scan-hud-right" />
                <div className="scan-overlay">
                  <span className="pulse-dot" />
                  camera ready
                </div>
                <div className="braille-grid-overlay" aria-hidden="true">
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                  <span className="braille-dot" />
                </div>
                <div className="camera-overlay-hint">{alignmentHint}</div>
              </div>
            )}
          </div>

          {cameraError ? <div className="camera-error">{cameraError}</div> : null}

          <div className="action-row">
            {cameraOpen ? (
              <>
                <button type="button" className="primary-btn" onClick={capturePhoto} disabled={isLoading}>
                  {isLoading ? 'Scanning...' : 'Capture'}
                </button>
                <button type="button" className="secondary-btn" onClick={stopCamera}>
                  Close
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary-btn" onClick={openCamera} disabled={isLoading}>
                  Open camera
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload
                </button>
              </>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleUpload} />
        </section>

        <section className="card result-card">
          <div className="result-header">
            <h2>Converted text</h2>
            <button type="button" className="ghost-btn" onClick={handleCopy}>
              Copy
            </button>
          </div>

          <textarea aria-label="Converted text" readOnly value={resultText} />

          <div className="voice-row">
            <button type="button" className="primary-btn small" onClick={handleSpeak} disabled={isSpeaking}>
              {isSpeaking ? 'Speaking...' : 'Speak'}
            </button>

            <div className="voice-slider">
              <label htmlFor="voice-rate">Speed</label>
              <input
                id="voice-rate"
                type="range"
                min="0.7"
                max="1.8"
                step="0.1"
                value={voiceRate}
                onChange={(event) => setVoiceRate(Number(event.target.value))}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
