from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

app = FastAPI()

# Allow React to talk to our backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.get("/")
def read_root():
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        return {"message": "AI Meeting Assistant API is running!", "status": "Groq API key loaded ✅"}
    else:
        return {"message": "API running but no Groq key found ❌"}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Read the uploaded file
        audio_data = await file.read()
        
        # Save temporarily (Groq needs a file path)
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(audio_data)
        
        # Transcribe with Groq Whisper
        with open(temp_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=(file.filename, audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="json"
            )
        
        # Clean up temp file
        os.remove(temp_path)
        
        # Generate summary and action items with AI
        transcription_text = transcription.text
        
        summary_prompt = f"""
You are an AI meeting assistant. Analyze this meeting transcription and provide:

1. A brief summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Action items (if any)

Transcription:
{transcription_text}

Format your response as:
SUMMARY:
[summary here]

KEY POINTS:
- [point 1]
- [point 2]

ACTION ITEMS:
- [action 1]
- [action 2]
"""
        
        # Get summary from Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": summary_prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        
        summary_response = chat_completion.choices[0].message.content
        
        return {
            "success": True,
            "transcription": transcription_text,
            "summary": summary_response,
            "filename": file.filename
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }