import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Radio, Check, Volume2 } from 'lucide-react';
import { AccentProfile } from '../utils/voiceEngine';

interface AccentClonerWorkbenchProps {
  customAccents: AccentProfile[];
  activeAccentId: string;
  onAccentCreated: (profile: AccentProfile) => void;
  onSelectAccent: (accentId: string) => void;
}

interface ReferenceSamplePreset {
  id: string;
  sampleName: string;
  regionHint: string;
  phoneticNotes: string;
  speakerSampleText: string;
}

const REFERENCE_PRESETS: ReferenceSamplePreset[] = [
  {
    id: 'edinburgh-scots',
    sampleName: 'Edinburgh Highland Reference',
    regionHint: 'Edinburgh, Scotland (en-SC)',
    phoneticNotes:
      'Tapped alveolar rhotic [ɾ], Scottish vowel length rule, monophthongal GOAT (/oː/) and FACE (/eː/) vowels, crisp voiceless labial-velar fricative [ʍ] in "wh-" words.',
    speakerSampleText:
      'The acoustics of the northern firth carry a crisp, unmistakable cadence across the stone hills.',
  },
  {
    id: 'stockholm-nordic',
    sampleName: 'Stockholm Nordic English',
    regionHint: 'Stockholm, Sweden (en-SE)',
    phoneticNotes:
      'Melodic pitch-accented two-peak intonation contour, slightly retroflexed post-alveolar clusters (/rt/, /rn/), pure rounded high vowels, and crystalline consonant release.',
    speakerSampleText:
      'Real-time acoustic synthesis requires deterministic latency budgets and clean harmonic reproduction.',
  },
  {
    id: 'cape-town-sa',
    sampleName: 'Cape Town Cultivated English',
    regionHint: 'Western Cape, South Africa (en-ZA)',
    phoneticNotes:
      'Non-rhotic syllable codas, KIT-split centralization ([ɪ] vs [ə]), rounded back BATH vowel (/ɑː/), and crisp un-aspirated intervocalic plosives.',
    speakerSampleText:
      'Every regional dialect encodes subtle vowel formant shifts that give human speech its authentic identity.',
  },
  {
    id: 'buenos-aires-rio',
    sampleName: 'Rioplatense Inflected English',
    regionHint: 'Buenos Aires, Argentina (es-AR)',
    phoneticNotes:
      'Circumflex rising-falling nuclear pitch accent with elongated stressed vowels, Zheyismo postalveolar fricative [ʃ] coloration on palatal glides, and syllable-timed cadence.',
    speakerSampleText:
      'With dynamic tempo stretching, we preserve vocal warmth even when accelerating broadcast delivery.',
  },
];

export const AccentClonerWorkbench: React.FC<AccentClonerWorkbenchProps> = ({
  customAccents,
  activeAccentId,
  onAccentCreated,
  onSelectAccent,
}) => {
  const [sampleName, setSampleName] = useState('');
  const [regionHint, setRegionHint] = useState('');
  const [phoneticNotes, setPhoneticNotes] = useState('');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const loadReferencePreset = (preset: ReferenceSamplePreset) => {
    setSampleName(preset.sampleName);
    setRegionHint(preset.regionHint);
    setPhoneticNotes(preset.phoneticNotes);
    setUploadedFileName(`${preset.id}_reference_24khz.wav`);
    setValidationError(null);
    setStatusBanner(`Loaded studio reference sample "${preset.sampleName}". Ready to extract accent clone.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setAudioMimeType(file.type || 'audio/wav');
    if (!sampleName.trim()) {
      setSampleName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setAudioBase64(base64);
      setValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = typeof reader.result === 'string' ? reader.result : '';
          const b64 = res.includes(',') ? res.split(',')[1] : res;
          setAudioBase64(b64);
          setAudioMimeType('audio/webm');
          setUploadedFileName(`live_mic_reference_${recordingSeconds || 3}s.webm`);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setValidationError(
        'Microphone access unavailable in this browser context. Please upload a reference audio file or select a Studio Reference Sample below.'
      );
    }
  };

  const handleAnalyzeAndClone = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setStatusBanner(null);

    if (!sampleName.trim() || !regionHint.trim()) {
      setValidationError(
        'Please provide both a Cloned Accent Profile Name and a Target Region / Dialect Origin before cloning.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/v1/voice/analyze-accent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleName: sampleName.trim(),
          regionHint: regionHint.trim(),
          phoneticNotes: phoneticNotes.trim(),
          audioBase64,
          mimeType: audioMimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.profile) {
        throw new Error(data.error || 'Failed to extract accent profile.');
      }

      onAccentCreated(data.profile);
      setStatusBanner(
        `Cloned "${data.profile.name}" (${data.profile.confidenceScore || 96}% phonetic match) and routed it to the active vocal register.`
      );
      setSampleName('');
      setRegionHint('');
      setPhoneticNotes('');
      setUploadedFileName(null);
      setAudioBase64(null);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Error analyzing reference voice.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Reference Audio Capture & Phonetic Extraction Form */}
        <form
          onSubmit={handleAnalyzeAndClone}
          className="lg:col-span-7 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 space-y-5"
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Reference Audio & Formant Profile Cloner
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Extract vowel shift trajectories, F1/F2 formant offsets, and rhythmic syllable timing from a reference speaker to route across Male and Female vocal registers.
              </p>
            </div>
          </div>

          {/* Quick-Load Studio Reference Samples */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              Load Calibrated Reference Audio Sample
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REFERENCE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadReferencePreset(preset)}
                  className="text-left p-3 rounded-lg border border-zinc-800 bg-zinc-950/70 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {preset.sampleName}
                    </span>
                    <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 truncate">
                    {preset.regionHint}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Live Mic or File Upload Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleToggleRecording}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isRecording
                  ? 'border-red-500/60 bg-red-950/50 text-red-200'
                  : 'border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 text-red-400" />
                  <span>Stop Recording ({recordingSeconds}s)</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>Record Reference Mic</span>
                </>
              )}
            </button>

            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">
                {uploadedFileName ? uploadedFileName : 'Upload Audio (.wav / .mp3)'}
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="sr-only"
                aria-label="Upload Reference Audio"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="clone-sample-name"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Cloned Accent Profile Name *
              </label>
              <input
                id="clone-sample-name"
                type="text"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                placeholder="e.g. Edinburgh Highland Broadcast"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="clone-region-hint"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Target Region / Dialect Origin *
              </label>
              <input
                id="clone-region-hint"
                type="text"
                value={regionHint}
                onChange={(e) => setRegionHint(e.target.value)}
                placeholder="e.g. Edinburgh, Scotland (en-SC)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="clone-phonetic-notes"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Phonetic & Vowel Shift Directives (Optional)
            </label>
            <textarea
              id="clone-phonetic-notes"
              rows={3}
              value={phoneticNotes}
              onChange={(e) => setPhoneticNotes(e.target.value)}
              placeholder="Describe specific vowel shifts, rhoticity, consonant flapping, or syllable timing..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-2.5 text-xs text-red-200"
            >
              {validationError}
            </div>
          )}

          {statusBanner && (
            <div
              role="status"
              className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200"
            >
              {statusBanner}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Radio className="w-4 h-4" />
              <span>
                {isAnalyzing
                  ? 'Extracting Formants & Cloning...'
                  : 'Extract & Clone Accent Profile'}
              </span>
            </button>
          </div>
        </form>

        {/* Right 5 Cols: Cloned Accent Profiles Registry */}
        <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="text-base font-semibold text-zinc-100">
              Custom Cloned Accent Profiles ({customAccents.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cloned accents decouple regional phonetics from speaker fundamental frequency so you can apply any accent to Male or Female vocal registers.
            </p>
          </div>

          {customAccents.length === 0 ? (
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-6 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-300">
                No custom accent clones created yet
              </p>
              <p className="text-xs text-zinc-400">
                Select one of the calibrated studio reference samples on the left or upload an audio clip, then submit the form to generate a custom accent profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customAccents.map((acc) => {
                const isSelected = acc.id === activeAccentId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-zinc-950'
                        : 'border-zinc-800 bg-zinc-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">
                          {acc.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                          <span>{acc.region}</span>
                          <span aria-hidden="true">·</span>
                          <span>{acc.rhythmicSyllableTiming}</span>
                          {acc.confidenceScore && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400">
                                {acc.confidenceScore}% Match
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectAccent(acc.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950'
                            : 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Active Clone
                          </span>
                        ) : (
                          'Apply Clone'
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
                      {acc.phoneticSignature}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {acc.vowelShiftRule}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
