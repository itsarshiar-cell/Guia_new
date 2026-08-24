from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import whisper
import tempfile
import os

app = FastAPI()

model = whisper.load_model("base")


class TranscriptionResponse(BaseModel):
    text: str


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)):
    # Windows keeps NamedTemporaryFile open exclusively.  Close it before
    # asking FFmpeg (via Whisper) to read the file.
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp:
        temp.write(await file.read())
        temp_path = temp.name

    try:
        result = model.transcribe(temp_path)
    finally:
        os.unlink(temp_path)

    return TranscriptionResponse(text=result["text"])
