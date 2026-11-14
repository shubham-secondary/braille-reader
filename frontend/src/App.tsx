import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type TabKey = 'scan' | 'learn' | 'history' | 'settings'

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

const navItems: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'scan', label: 'Scan', icon: '◉' },
  { key: 'learn', label: 'Learn', icon: '⌨' },
  { key: 'history', label: 'History', icon: '☰' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

const guidanceCards = [
  { title: 'Alignment', detail: 'Keep the line centered', tone: 'amber' },
  { title: 'Lighting', detail: 'Use flashlight in low light', tone: 'blue' },
  { title: 'Focus', detail: 'Avoid glare and shadows', tone: 'green' },
]

const recentResults = [
  { label: 'Medicine label', text: 'Take 1 tablet after meals.' },
  { label: 'Room board', text: 'Room 302 • East wing' },
  { label: 'Book page', text: 'Braille literacy opens access.' },
]

const brailleLessons = [
  { title: 'Perkins keypad', subtitle: '3 left • 3 right', value: 'Tap to type' },
  { title: 'Reverse visualizer', subtitle: 'Type to preview', value: 'Grade 1 / Grade 2' },
  { title: 'Live-reading', subtitle: 'Continuous speaking', value: 'Audio on' },
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('scan')
  const [apiStatus, setApiStatus] = useState('Checking API...')
  const [resultText, setResultText] = useState('The quick brown fox jumps over the lazy dog.')
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [alignmentHint, setAlignmentHint] = useState('Center the braille cell inside the grid')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`)
        if (!response.ok) {
          throw new Error('API unavailable')
        }
        const data: HealthStatus = await response.json()
        setApiStatus(`${data.app} • ${data.status}`)
      } catch {
        setApiStatus('API unavailable — start backend')
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
      setAlignmentHint('Center the braille cell inside the grid')
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      return
    }

    if (!streamRef.current || !videoRef.current) {
      return
    }

    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => {
      setCameraError('Camera preview could not start. Please try again.')
    })
  }, [cameraOpen])

  const currentMode = useMemo(() => {
    switch (activeTab) {
      case 'learn':
        return 'Learning tools'
      case 'history':
        return 'Saved scans'
      case 'settings':
        return 'Accessibility'
      default:
        return 'Live scan'
    }
  }, [activeTab])

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
      setCameraError('Camera not supported on this browser.')
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
      setAlignmentHint('Center the braille cell inside the grid')
    } catch {
      setCameraError('Unable to access camera. Please allow camera permission.')
      setCameraOpen(false)
    }
  }

  const analyzeImage = async (imageData: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, text: resultText }),
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const data: ScanResponse = await response.json()
      setResultText(data.extractedText)
      setApiStatus(`${data.message} • confidence ${data.confidence.toFixed(2)}`)
    } catch {
      setResultText('Please scan a clearer braille image or upload a better photo.')
      setApiStatus('Scan failed. Try adjusting light or camera focus.')
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPreviewImage(dataUrl)
    setCameraOpen(false)
    stopCamera()
    setAlignmentHint('Captured image sent for recognition')
    await analyzeImage(dataUrl)
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
    setIsSpeaking(true)

    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resultText, voice: 'default', rate: 1.2 }),
      })

      const data = await response.json()
      setApiStatus(`Speech ready • ${data.voice} • ${data.rate}x`)

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(resultText)
        utterance.rate = Number(data.rate)
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      setApiStatus('Speech is unavailable in this browser')
    } finally {
      setIsSpeaking(false)
    }
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
          <p className="eyebrow">Braille Reader</p>
          <h1>Scan • Read • Speak</h1>
        </div>
        <button type="button" className="icon-button" aria-label="Open menu">
          ☰
        </button>
      </header>

      <div className="api-status">{apiStatus}</div>

      <nav className="nav-bar" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === activeTab ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <main className="content-area">
        <section className="scan-panel">
          <div className="panel-header">
            <div>
              <span className="status-pill">{currentMode}</span>
            </div>
            <button type="button" className="ghost-btn">
              + Add label
            </button>
          </div>

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
                  {isLoading ? 'Scanning...' : 'Capture image'}
                </button>
                <button type="button" className="secondary-btn" onClick={stopCamera}>
                  Close camera
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
                  Upload image
                </button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleUpload}
          />

          <div className="guidance-grid">
            {guidanceCards.map((item) => (
              <article key={item.title} className={`hint-card ${item.tone}`}>
                <div className="hint-title">{item.title}</div>
                <div className="hint-detail">{item.detail}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="result-panel">
          <div className="result-header">
            <h2>Converted text</h2>
            <button type="button" className="ghost-btn small" onClick={handleCopy}>
              Copy
            </button>
          </div>

          <textarea aria-label="Converted text" readOnly value={resultText} />

          <div className="voice-row">
            <button type="button" className="primary-btn small" onClick={handleSpeak} disabled={isSpeaking}>
              {isSpeaking ? 'Speaking...' : '🔊 Speak'}
            </button>
            <div className="voice-slider">
              <label htmlFor="voice-rate">Voice rate</label>
              <input id="voice-rate" type="range" min="0.7" max="1.8" step="0.1" defaultValue="1.2" />
            </div>
          </div>

          <div className="utility-row">
            <button type="button" className="utility-btn">
              Share
            </button>
            <button type="button" className="utility-btn">
              Export
            </button>
            <button type="button" className="utility-btn accent">
              Save scan
            </button>
          </div>
        </section>
      </main>

      <section className="feature-panel">
        <div className="section-heading">
          <h3>Smart tools</h3>
        </div>

        <div className="learning-grid">
          {brailleLessons.map((lesson) => (
            <article key={lesson.title} className="lesson-card">
              <div className="lesson-topline">{lesson.title}</div>
              <div className="lesson-subtitle">{lesson.subtitle}</div>
              <div className="lesson-value">{lesson.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="history-panel">
        <div className="section-heading">
          <h3>Recent results</h3>
        </div>

        <div className="history-list">
          {recentResults.map((entry) => (
            <article key={entry.label} className="history-item">
              <div className="history-label">{entry.label}</div>
              <div className="history-text">{entry.text}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
