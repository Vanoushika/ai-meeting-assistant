import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('upload') // upload, transcribed, analyzed
  const [email, setEmail] = useState('')
  const [meetingTitle, setMeetingTitle] = useState('Team Meeting')
  const [emailSent, setEmailSent] = useState(false)

  const API_URL = 'https://ai-meeting-assistant-ll3f.onrender.com'

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setTranscript('')
      setSummary('')
      setStage('upload')
      setEmailSent(false)
    }
  }

  const handleTranscribe = async () => {
    if (!file) {
      alert('Please select an audio file first')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setTranscript(data.transcript)
        setStage('transcribed')
      } else {
        alert('Transcription failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error connecting to server. Make sure backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!transcript) {
      alert('No transcript available to analyze')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('transcript', transcript)

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
        setStage('analyzed')
      } else {
        alert('Analysis failed')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Analysis failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!email || !summary) {
      alert('Please enter an email and ensure summary is generated')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          summary: summary,
          transcript: transcript,
          meeting_title: meetingTitle,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEmailSent(true)
        alert(`✅ Summary sent to ${email}!`)
      } else {
        alert('Failed to send email')
      }
    } catch (error) {
      console.error('Error:', error)
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
        <header className="header">
          <h1>🎯 AI Meeting Assistant</h1>
          <p>Upload audio → Get transcription → AI summary → Email results</p>
        </header>

        {/* Upload Section */}
        <div className="card">
          <h2>📁 1. Upload Audio</h2>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileChange}
            className="file-input"
          />
          {file && (
            <p className="file-name">Selected: {file.name}</p>
          )}
          <button
            onClick={handleTranscribe}
            disabled={!file || loading}
            className="btn btn-primary"
          >
            {loading && stage === 'upload' ? 'Transcribing...' : 'Transcribe Audio'}
          </button>
        </div>

        {/* Transcript Section */}
        {transcript && (
          <div className="card">
            <h2>📝 2. Transcript</h2>
            <div className="transcript-box">
              {transcript}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading && stage === 'transcribed' ? 'Analyzing...' : 'Generate AI Summary'}
            </button>
          </div>
        )}

        {/* Summary Section */}
        {summary && (
          <div className="card">
            <h2>✨ 3. AI Summary</h2>
            <div className="summary-box">
              <pre>{summary}</pre>
            </div>
          </div>
        )}

        {/* Email Section */}
        {summary && (
          <div className="card email-card">
            <h2>📧 4. Send via Email</h2>
            <input
              type="text"
              placeholder="Meeting Title (e.g., Team Standup)"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="email-input"
            />
            <input
              type="email"
              placeholder="Enter recipient email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
            />
            <button
              onClick={handleSendEmail}
              disabled={loading || !email}
              className="btn btn-success"
            >
              {loading && stage === 'analyzed' ? 'Sending...' : '✉️ Send Summary'}
            </button>
            {emailSent && (
              <p className="success-message">✅ Email sent successfully!</p>
            )}
          </div>
        )}

        {/* Reset Button */}
        {(transcript || summary) && (
          <button onClick={resetApp} className="btn btn-secondary">
            🔄 Start New Analysis
          </button>
        )}
      </div>
    </div>
  )
}

export default App
