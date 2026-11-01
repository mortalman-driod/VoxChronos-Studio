"""
VoxChronos Studio - Announcer Bark Inference API Server
Runs local or GPU-accelerated synthesis with Anti-Humming & Anti-Droning Guards.
"""

import os
import io
import wave
import torch
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from transformers import BarkModel, AutoProcessor

app = FastAPI(title="VoxChronos Announcer Voice Engine", version="1.0.0")

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

print(f"[VoxChronos] Loading Announcer model on {DEVICE} ({DTYPE})...")
processor = AutoProcessor.from_pretrained(MODEL_DIR)
model = BarkModel.from_pretrained(MODEL_DIR, torch_dtype=DTYPE).to(DEVICE)
print("[VoxChronos] Announcer Model successfully loaded into memory!")

class SynthesizeRequest(BaseModel):
    text: str
    temperature: float = 0.68
    speed: float = 1.0

def clean_script_for_bark(raw_text: str) -> str:
    """Ensures clean sentence endings with punctuation to stop Bark humming/singing loops."""
    cleaned = raw_text.strip()
    if not cleaned:
        return ""
    if cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned

@app.post("/synthesize")
async def synthesize_announcer(req: SynthesizeRequest):
    clean_text = clean_script_for_bark(req.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        inputs = processor(clean_text, voice_preset="announcer").to(DEVICE)
        
        # Anti-humming bounded temperature
        safe_temp = max(0.55, min(0.75, req.temperature))

        with torch.no_grad():
            output = model.generate(
                **inputs,
                text_temp=safe_temp,
                waveform_temp=safe_temp,
                do_sample=True,
            )

        audio_arr = output.squeeze().cpu().numpy()
        audio_int16 = (np.clip(audio_arr, -1.0, 1.0) * 32767).astype(np.int16)

        # Build 24kHz mono WAV
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(24000)
            wav_file.writeframes(audio_int16.tobytes())

        wav_bytes = wav_io.getvalue()
        return Response(content=wav_bytes, media_type="audio/wav")

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
