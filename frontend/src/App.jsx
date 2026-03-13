import { useState, useCallback } from 'react'
import './App.css'

const STEPS = [
  { id: 'upload',      label: 'Upload' },
  { id: 'transcribed', label: 'Transcribe' },
  { id: 'analyzed',   label: 'Analyze' },
  { id: 'email',       label: 'Email' },
]

const STAGE_INDEX = { upload: 0, transcribed: 1, analyzed: 2, email: 3 }

function StepProgress({ stage }) {
  const current = STAGE_INDEX[stage] ?? 0
  return (
    <div className="steps" role="list" aria-label="Progress">
      {STEPS.map((step, i) => {
        const isDone   = i < current
        const isActive = i === current
        return (
          <div key={step.id} style={{ display: 'contents' }}>
            <div
              className={`step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="step-bubble">
                {isDone ? '✓' : i + 1}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? 'done' : ''}`} aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function App() {
  const [file, setFile]               = useState(null)
  const [transcript, setTranscript]   = useState('')
  const [summary, setSummary]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [stage, setStage]             = useState('upload')
  const [email, setEmail]             = useState('')
  const [meetingTitle, setMeetingTitle] = useState('Team Meeting')
  const [emailSent, setEmailSent]     = useState(false)
  const [dragOver, setDragOver]       = useState(false)

  const API_URL = 'https://ai-meeting-assistant-ll3f.onrender.com'

  const applyFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setTranscript('')
    setSummary('')
    setStage('upload')
    setEmailSent(false)
  }

  const handleFileChange = (e) => applyFile(e.target.files[0])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) applyFile(dropped)
  }, [])

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)

  const handleTranscribe = async () => {
    if (!file) { alert('Please select an audio file first'); return }
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: formData })
      const data = await response.json()
      if (data.success) {
        setTranscript(data.transcript)
        setStage('transcribed')
      } else {
        alert('Transcription failed')
      }
    } catch {
      alert('Error connecting to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!transcript) { alert('No transcript available to analyze'); return }
    setLoading(true)
    const formData = new FormData()
    formData.append('transcript', transcript)
    try {
      const response = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData })
      const data = await response.json()
      if (data.success) {
        setSummary(data.summary)
        setStage('analyzed')
      } else {
        alert('Analysis failed')
      }
    } catch {
      alert('Analysis failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!email || !summary) { alert('Please enter an email and ensure summary is generated'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { alert('Please enter a valid email address'); return }
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, summary, transcript, meeting_title: meetingTitle }),
      })
      const data = await response.json()
      if (data.success) {
        setEmailSent(true)
        setStage('email')
      } else {
        alert('Failed to send email')
      }
    } catch {
      alert('Email sending failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const resetApp = () => {
    setFile(null)
    setTranscript('')
    setSummary('')
    setStage('upload')
    setEmail('')
    setMeetingTitle('Team Meeting')
    setEmailSent(false)
  }

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <header className="header">
          <h1>🎯 AI Meeting Assistant</h1>
          <p>Upload audio · Transcribe · AI summary · Email results</p>
        </header>

        {/* Step Progress */}
        <StepProgress stage={stage} />

        {/* Step 1 — Upload */}
        <div className="card">
          <h2>📁 Upload Audio</h2>

          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              aria-label="Choose audio or video file"
            />
            <span className="upload-icon">🎵</span>
            <p>
              <strong>Click to browse</strong> or drag &amp; drop
              <br />
              <span style={{ fontSize: '0.8rem' }}>Supports MP3, MP4, WAV, M4A and more</span>
            </p>
          </div>

          {file && (
            <p className="file-name">
              <span>✅</span> {file.name}
            </p>
          )}

          <button
            onClick={handleTranscribe}
            disabled={!file || loading}
            className="btn btn-primary"
          >
            {loading && stage === 'upload' ? (
              <><span className="spinner" aria-hidden="true" /> Transcribing…</>
            ) : (
              '🎙 Transcribe Audio'
            )}
          </button>
        </div>

        {/* Step 2 — Transcript */}
        {transcript && (
          <div className="card">
            <h2>📝 Transcript</h2>
            <div className="transcript-box" role="region" aria-label="Transcript text">
              {transcript}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading && stage === 'transcribed' ? (
                <><span className="spinner" aria-hidden="true" /> Analyzing…</>
              ) : (
                '✨ Generate AI Summary'
              )}
            </button>
          </div>
        )}

        {/* Step 3 — Summary */}
        {summary && (
          <div className="card">
            <h2>✨ AI Summary</h2>
            <div className="summary-box" role="region" aria-label="AI generated summary">
              <pre>{summary}</pre>
            </div>
          </div>
        )}

        {/* Step 4 — Email */}
        {summary && (
          <div className="card email-card">
            <h2>📧 Send via Email</h2>
            <input
              type="text"
              placeholder="Meeting Title (e.g., Team Standup)"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="email-input"
              aria-label="Meeting title"
            />
            <input
              type="email"
              placeholder="Recipient email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
              aria-label="Recipient email"
            />
            <button
              onClick={handleSendEmail}
              disabled={loading || !email}
              className="btn btn-success"
            >
              {loading && (stage === 'analyzed' || stage === 'email') ? (
                <><span className="spinner" aria-hidden="true" /> Sending…</>
              ) : (
                '✉️ Send Summary'
              )}
            </button>
            {emailSent && (
              <p className="success-message" role="status">
                ✅ Email sent successfully to {email}!
              </p>
            )}
          </div>
        )}

        {/* Reset */}
        {(transcript || summary) && (
          <div className="reset-row">
            <button onClick={resetApp} className="btn btn-secondary">
              🔄 Start New Analysis
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
