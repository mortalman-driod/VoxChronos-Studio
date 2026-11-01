# 🎙️ VoxChronos Studio — Announcer Voice Model

The **Announcer Voice Model** is a custom acoustic model trained and synthesized via Google Colab, leveraging the **Suno Bark** generative architecture with custom coarse, fine, and semantic prompt embeddings.

---

## 📐 Architecture & Model Specifications

| Parameter | Specification |
| :--- | :--- |
| **Model Architecture** | `BarkModel` (Transformer Auto-Regressive + Dual Codebook) |
| **Audio Codec** | `EncodecModel` (24,000 Hz, 128-dim codebook, single mono channel) |
| **Coarse Acoustic Vocab** | 12,096 tokens, 12 attention heads, 12 layers (`hidden_size: 768`) |
| **Target Timbre** | Golden Age Orator / Dramatic Sacred Baritone (`VC-ANNOUNCER-M4`) |
| **Fundamental Frequency** | 110 Hz – 160 Hz (Resonant Lower Chest Harmonics) |
| **Formant Signature** | F1 450 Hz · F2 1,520 Hz · F3 2,600 Hz |
| **Speaker Embeddings** | `announcer_semantic_prompt.npy`, `announcer_coarse_prompt.npy`, `announcer_fine_prompt.npy` |

---

## 🛡️ Anti-Humming & Anti-Droning Generation Protocol

> **Root Cause of Humming:** Auto-regressive acoustic models like Bark can enter repetition/hallucination loops (humming, droning, mumbling, or breathing) if:
> 1. Unconditioned generation temperature is set too high (> 0.85).
> 2. Punctuation is missing from sentence boundaries.
> 3. Semantic prompt tokens mismatch text sequence lengths.

### Required Inference Hyperparameters:
```python
generation_kwargs = {
    "text_temp": 0.68,          # Clamped between 0.65 - 0.70 to eliminate humming
    "waveform_temp": 0.68,      # Stable acoustic reconstruction
    "min_eos_p": 0.05,          # Prevents indefinite trailing murmur
    "sliding_window_len": 60,   # Stable attention context
}
```

---

## 🚀 Running Inference in Python

```python
import torch
from transformers import BarkModel, AutoProcessor
import numpy as np

device = "cuda" if torch.cuda.is_available() else "cpu"

# 1. Load Model & Processor
processor = AutoProcessor.from_pretrained("./")
model = BarkModel.from_pretrained("./", torch_dtype=torch.float16 if device == "cuda" else torch.float32).to(device)

# 2. Prepare Script Text (Always ensure ending punctuation to avoid humming)
text_prompt = "In the beginning was the Word, and the Word was with God, and the Word was God."

# 3. Synthesize with Custom Announcer Speaker Embeddings
inputs = processor(text_prompt, voice_preset="announcer").to(device)
with torch.no_grad():
    audio_array = model.generate(
        **inputs,
        text_temp=0.68,
        waveform_temp=0.68,
        do_sample=True
    )

audio_array = audio_array.squeeze().cpu().numpy()
# Output is pristine 24,000 Hz mono PCM
```

---

## ☁️ Model Weights & Deployment
- The 1.67 GB `model.safetensors` binary is hosted and loaded via Hugging Face Hub or cloud storage.
- The repository tracks all semantic, coarse, and fine speaker prompt vectors, tokenizer artifacts, and generation configs.
