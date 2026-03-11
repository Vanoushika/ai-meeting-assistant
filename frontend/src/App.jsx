import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setFile(selectedFile)
    setMessage('')
    setTranscription('')
    setSummary('')
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first!')
      return
    }

    setUploading(true)
    setMessage('Transcribing and analyzing... this may take a moment ⏳')
    setTranscription('')
    setSummary('')

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Send to backend
      const response = await fetch('http://127.0.0.1:8000/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Analysis complete!')
        setTranscription(data.transcription)
        setSummary(data.summary)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="app">
      <h1>🎙️ AI Meeting Assistant</h1>
      <p>Upload your meeting audio and get AI-powered summaries</p>

      <div className="upload-container">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {file && (
          <div className="file-info">
            <p>Selected: {file.name}</p>
            <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
        >
          {uploading ? 'Processing...' : 'Upload & Transcribe'}
        </button>

        {message && <p className="message">{message}</p>}

        {summary && (
          <div className="summary">
            <h2>📊 AI Analysis:</h2>
            <pre>{summary}</pre>
          </div>
        )}

        {transcription && (
          <div className="transcription">
            <h2>📝 Full Transcription:</h2>
            <p>{transcription}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App