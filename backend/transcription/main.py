from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import whisper
import tempfile

app = FastAPI()

model = whisper.load_model("base")


class TranscriptionResponse(BaseModel):
    text: str


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".wav") as temp:
        temp.write(await file.read())
        temp.flush()

        result = model.transcribe(temp.name)

    return TranscriptionResponse(text=result["text"])