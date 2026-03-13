from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import os
from dotenv import load_dotenv
import tempfile
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from pydantic import BaseModel, EmailStr
import traceback

load_dotenv()

app = FastAPI(title="AI Meeting Assistant API")

# CORS - Updated to include Vercel domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5177",
        "https://ai-meeting-assistant-tan.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class EmailRequest(BaseModel):
    email: EmailStr
    summary: str
    transcript: str
    meeting_title: str = "Meeting Summary"

@app.get("/")
async def root():
    return {
        "message": "AI Meeting Assistant API",
        "version": "2.0",
        "endpoints": {
            "/transcribe": "POST - Upload audio for transcription",
            "/analyze": "POST - Analyze transcript",
            "/send-email": "POST - Send summary via email"
        }
    }

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using Groq Whisper"""
    
    print(f"Received file: {file.filename}")
    print(f"Content type: {file.content_type}")
    
    if not file.filename.endswith(('.mp3', '.wav', '.m4a', '.mp4', '.webm')):
        raise HTTPException(400, "Invalid file format. Use mp3, wav, m4a, mp4, or webm")
    
    try:
        # Save uploaded file temporarily
        print("Saving file temporarily...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"File saved to: {tmp_path}")
        print(f"File size: {os.path.getsize(tmp_path)} bytes")
        
        # Transcribe
        print("Sending to Groq for transcription...")
        with open(tmp_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(file.filename, audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
                language="en"
            )
        
        print("Transcription successful!")
        
        # Cleanup
        os.unlink(tmp_path)
        
        return {
            "success": True,
            "transcript": transcription.text,
            "language": "en"
        }
        
    except Exception as e:
        print("=" * 80)
        print("ERROR IN TRANSCRIPTION:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        print("=" * 80)
        raise HTTPException(500, f"Transcription failed: {str(e)}")

@app.post("/analyze")
async def analyze_transcript(transcript: str = Form(...)):
    """Generate AI summary with key points and action items"""
    
    if not transcript or len(transcript.strip()) < 10:
        raise HTTPException(400, "Transcript too short")
    
    try:
        prompt = f"""Analyze this meeting transcript and provide:

1. **Summary** (2-3 sentences overview)
2. **Key Points** (3-5 bullet points of main topics discussed)
3. **Action Items** (specific tasks with owner if mentioned)
4. **Decisions Made** (key decisions or conclusions)

Transcript:
{transcript}

Format your response clearly with headers."""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert meeting analyst. Provide concise, actionable summaries."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        summary = response.choices[0].message.content
        
        return {
            "success": True,
            "summary": summary,
            "model": "llama-3.3-70b-versatile"
        }
        
    except Exception as e:
        print("=" * 80)
        print("ERROR IN ANALYSIS:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()
        print("=" * 80)
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@app.post("/send-email")
async def send_summary_email(request: EmailRequest):
    """Send meeting summary via email using Resend"""
    
    try:
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 30px; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .summary {{ background: white; padding: 20px; border-radius: 8px; 
                           margin: 20px 0; border-left: 4px solid #667eea; }}
                .transcript {{ background: white; padding: 20px; border-radius: 8px; 
                              margin: 20px 0; max-height: 300px; overflow-y: auto; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 12px; 
                          margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }}
                h1 {{ margin: 0; font-size: 24px; }}
                h2 {{ color: #667eea; margin-top: 0; }}
                pre {{ white-space: pre-wrap; font-family: 'Courier New', monospace; 
                      font-size: 13px; color: #4b5563; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 {request.meeting_title}</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">AI-Generated Meeting Summary</p>
                </div>
                <div class="content">
                    <div class="summary">
                        <h2>📋 Summary & Action Items</h2>
                        <pre>{request.summary}</pre>
                    </div>
                    
                    <div class="transcript">
                        <h2>📝 Full Transcript</h2>
                        <pre>{request.transcript}</pre>
                    </div>
                    
                    <div class="footer">
                        <p>Generated by AI Meeting Assistant</p>
                        <p style="margin-top: 10px;">Powered by Groq (Whisper + Llama 3.3)</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=os.getenv("SENDER_EMAIL"),
            to_emails=request.email,
            subject=f"Meeting Summary: {request.meeting_title}",
            html_content=email_html,
        )

        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        sg.send(message)

        return {
            "success": True,
            "message": f"Summary sent to {request.email}",
        }
        
    except Exception as e:
        print("=" * 80)
        print("ERROR IN EMAIL:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()
        print("=" * 80)
        raise HTTPException(500, f"Email sending failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "resend_configured": bool(os.getenv("RESEND_API_KEY"))
    }