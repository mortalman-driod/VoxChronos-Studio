import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Download,
  Sliders,
  Volume2,
  Radio,
  Trash2,
  Search,
  Activity,
  BarChart3,
  Plus,
} from 'lucide-react';
import {
  VOICE_PERSONAS,
  BUILTIN_ACCENT_PROFILES,
  EMOTION_PRESETS,
  VoiceGender,
  EngineQualityMode,
  EmotionPresetId,
  SynthesisConfig,
  SynthesisTake,
  AccentProfile,
  getVoicesByGender,
  calculateTempoMetrics,
  compileSynthesisPayload,
  ensureValidWavBytes,
  speakWithNativeSpeechFallback,
} from './utils/voiceEngine';
import { AcousticScopeCanvas } from './components/AcousticScopeCanvas';
import { AccentClonerWorkbench } from './components/AccentClonerWorkbench';
import { ApiIntegrationWorkbench } from './components/ApiIntegrationWorkbench';
import { DocumentStreamReader } from './components/DocumentStreamReader';

type WorkspaceSection = 'studio' | 'reader' | 'cloner' | 'library' | 'api';

const SCRIPT_TEMPLATES: { label: string; text: string }[] = [
  {
    label: 'Psalm 71:1 — Spurgeon Devotional',
    text: "I will praise thee, O Lord. Praise should always follow answered prayer, as the mist of earth's gratitude rises when the sun of heaven's love warms the ground.",
  },
  {
    label: 'Global Product Keynote',
    text: 'Welcome to VoxChronos. <breath> Our acoustic voice engine clones regional accents and adjusts speech tempo in real time, preserving natural vocal formants across both male and female registers.',
  },
  {
    label: 'Bible — Genesis 1 & John 1',
    text: '[1:1] In the beginning God created the heaven and the earth. <breath> And God said, Let there be light: and there was light. See 1 Cor. 13:4-7 and John 3:16.',
  },
  {
    label: 'Empathetic Patient Care',
    text: 'Take a slow, comfortable breath. <breath> I have reviewed your diagnostic telemetry, and everything is progressing smoothly on schedule.',
  },
];

const VOCAL_BURST_TAGS = [
  { tag: '<breath>', label: 'Insert <breath>' },
  { tag: '<laugh>', label: 'Insert <laugh>' },
  { tag: '<gasp>', label: 'Insert <gasp>' },
  { tag: '|yeah|', label: 'Insert |yeah|' },
  { tag: '|mhm|', label: 'Insert |mhm|' },
];

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('studio');

  // Core synthesis configuration state
  const [genderFilter, setGenderFilter] = useState<VoiceGender | 'all'>('all');
  const [voiceId, setVoiceId] = useState<string>('marcus-male-baritone');
  const [engineTier, setEngineTier] = useState<EngineQualityMode>('studio-master');
  const [accentId, setAccentId] = useState<string>('rp-british');
  const [customAccents, setCustomAccents] = useState<AccentProfile[]>([]);

  // Real-time tempo & pitch-lock state
  const [tempoMultiplier, setTempoMultiplier] = useState<number>(0.9);
  const [pitchLockEnabled, setPitchLockEnabled] = useState<boolean>(true);

  // Emotional modulation state
  const [emotionPresetId, setEmotionPresetId] =
    useState<EmotionPresetId>('sacred_liturgical');
  const [intensity, setIntensity] = useState<number>(
    EMOTION_PRESETS.sacred_liturgical.defaultValues.intensity
  );
  const [warmth, setWarmth] = useState<number>(
    EMOTION_PRESETS.sacred_liturgical.defaultValues.warmth
  );
  const [expressiveness, setExpressiveness] = useState<number>(
    EMOTION_PRESETS.sacred_liturgical.defaultValues.expressiveness
  );
  const [crispness, setCrispness] = useState<number>(
    EMOTION_PRESETS.sacred_liturgical.defaultValues.crispness
  );

  // Script & synthesis state
  const [scriptText, setScriptText] = useState<string>(SCRIPT_TEMPLATES[0].text);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [scopeMode, setScopeMode] = useState<'waveform' | 'formants'>('waveform');

  // Take history & filter state
  const [takes, setTakes] = useState<SynthesisTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [libraryGenderFilter, setLibraryGenderFilter] = useState<VoiceGender | 'all'>('all');

  // Audio playback & Web Audio API analyser refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);

  const allAccents = useMemo(
    () => [...BUILTIN_ACCENT_PROFILES, ...customAccents],
    [customAccents]
  );

  const activePersona = useMemo(
    () => VOICE_PERSONAS.find((v) => v.id === voiceId) || VOICE_PERSONAS[0],
    [voiceId]
  );

  const activeAccent = useMemo(
    () => allAccents.find((a) => a.id === accentId) || BUILTIN_ACCENT_PROFILES[0],
    [allAccents, accentId]
  );

  const filteredVoices = useMemo(
    () => getVoicesByGender(genderFilter),
    [genderFilter]
  );

  const currentConfig: SynthesisConfig = useMemo(
    () => ({
      voiceId,
      genderFilter,
      engineTier,
      accentId,
      tempoMultiplier,
      pitchLockEnabled,
      emotion: {
        presetId: emotionPresetId,
        intensity,
        warmth,
        expressiveness,
        crispness,
      },
      scriptText,
    }),
    [
      voiceId,
      genderFilter,
      engineTier,
      accentId,
      tempoMultiplier,
      pitchLockEnabled,
      emotionPresetId,
      intensity,
      warmth,
      expressiveness,
      crispness,
      scriptText,
    ]
  );

  const tempoMetrics = useMemo(
    () => calculateTempoMetrics(scriptText, tempoMultiplier),
    [scriptText, tempoMultiplier]
  );

  const compiledPayload = useMemo(
    () => compileSynthesisPayload(currentConfig, customAccents),
    [currentConfig, customAccents]
  );

  // Hydrate initial Male (Marcus — Psalm 71 Spurgeon Devotional) and Female (Clara — Studio Keynote) takes using real vocal synthesis
  useEffect(() => {
    let cancelled = false;

    const initialMaleConfig: SynthesisConfig = {
      voiceId: 'marcus-male-baritone',
      genderFilter: 'male',
      engineTier: 'studio-master',
      accentId: 'rp-british',
      tempoMultiplier: 0.9,
      pitchLockEnabled: true,
      emotion: {
        presetId: 'sacred_liturgical',
        intensity: 58,
        warmth: 90,
        expressiveness: 64,
        crispness: 86,
      },
      scriptText: SCRIPT_TEMPLATES[0].text,
    };

    const initialFemaleConfig: SynthesisConfig = {
      voiceId: 'clara-female-soprano',
      genderFilter: 'female',
      engineTier: 'studio-master',
      accentId: 'rp-british',
      tempoMultiplier: 1.0,
      pitchLockEnabled: true,
      emotion: {
        presetId: 'warm_empathetic',
        intensity: 60,
        warmth: 92,
        expressiveness: 68,
        crispness: 72,
      },
      scriptText: SCRIPT_TEMPLATES[1].text,
    };

    const maleCompiled = compileSynthesisPayload(initialMaleConfig);
    const femCompiled = compileSynthesisPayload(initialFemaleConfig);

    // Seed metadata entries first, then immediately populate their audioDataUrl from /api/v1/voice/synthesize
    const seedMaleTake: SynthesisTake = {
      id: 'take-seed-male',
      createdAt: 'Ready',
      voicePersona: VOICE_PERSONAS[2],
      accentProfile: BUILTIN_ACCENT_PROFILES[0],
      tempoMultiplier: 0.9,
      emotion: initialMaleConfig.emotion,
      engineTier: 'studio-master',
      scriptText: initialMaleConfig.scriptText,
      styleDirective: maleCompiled.styleDirective,
      audioDataUrl: '',
      durationSec: 11.8,
      latencyMs: 18,
      sampleRateHz: 24000,
      sourceMode: 'master-bus',
    };

    const seedFemTake: SynthesisTake = {
      id: 'take-seed-female',
      createdAt: 'Ready',
      voicePersona: VOICE_PERSONAS[0],
      accentProfile: BUILTIN_ACCENT_PROFILES[0],
      tempoMultiplier: 1.0,
      emotion: initialFemaleConfig.emotion,
      engineTier: 'studio-master',
      scriptText: initialFemaleConfig.scriptText,
      styleDirective: femCompiled.styleDirective,
      audioDataUrl: '',
      durationSec: 10.4,
      latencyMs: 22,
      sampleRateHz: 24000,
      sourceMode: 'master-bus',
    };

    setTakes([seedMaleTake, seedFemTake]);
    setActiveTakeId(seedMaleTake.id);

    async function hydrateRealSeedAudio(takeId: string, cfg: SynthesisConfig) {
      try {
        const res = await fetch('/api/v1/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engineMode: cfg.engineTier,
            voiceId: cfg.voiceId,
            accentId: cfg.accentId,
            tempoMultiplier: cfg.tempoMultiplier,
            pitchLockEnabled: cfg.pitchLockEnabled,
            emotion: cfg.emotion,
            text: cfg.scriptText,
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.audioBase64) {
          const validWavBytes = ensureValidWavBytes(
            base64ToUint8(data.audioBase64),
            24000
          );
          const wavUrl = `data:audio/wav;base64,${uint8ToBase64(validWavBytes)}`;
          setTakes((prev) =>
            prev.map((t) =>
              t.id === takeId
                ? {
                    ...t,
                    audioDataUrl: wavUrl,
                    durationSec: data.durationSec || t.durationSec,
                    latencyMs: data.latencyMs || t.latencyMs,
                    sourceMode: 'master-bus',
                  }
                : t
            )
          );
        }
      } catch {
        // Hydrated on demand when Play is pressed
      }
    }

    hydrateRealSeedAudio('take-seed-male', initialMaleConfig);
    hydrateRealSeedAudio('take-seed-female', initialFemaleConfig);

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time tempo adjustment on active audio element
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.playbackRate = tempoMultiplier;
    if ('preservesPitch' in audioEl) {
      (audioEl as any).preservesPitch = pitchLockEnabled;
    }
  }, [tempoMultiplier, pitchLockEnabled]);

  const handleSelectGenderFilter = (nextGender: VoiceGender | 'all') => {
    setGenderFilter(nextGender);
    if (nextGender !== 'all' && activePersona.gender !== nextGender) {
      const firstMatch = VOICE_PERSONAS.find((v) => v.gender === nextGender);
      if (firstMatch) setVoiceId(firstMatch.id);
    }
  };

  const handleApplyEmotionPreset = (presetId: EmotionPresetId) => {
    setEmotionPresetId(presetId);
    const preset = EMOTION_PRESETS[presetId];
    if (preset) {
      setIntensity(preset.defaultValues.intensity);
      setWarmth(preset.defaultValues.warmth);
      setExpressiveness(preset.defaultValues.expressiveness);
      setCrispness(preset.defaultValues.crispness);
    }
  };

  const handleInsertVocalTag = (tag: string) => {
    setScriptError(null);
    setScriptText((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
    });
  };

  const ensureAudioGraph = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const source = ctx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceNodeRef.current = source;
      } catch {
        // Fallback if Web Audio API graph is already bound or restricted
      }
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const playDataUrl = async (
    dataUrl: string,
    rate = tempoMultiplier,
    fallbackText = scriptText,
    persona = activePersona,
    accent = activeAccent
  ) => {
    const audioEl = audioRef.current;
    if (audioEl && dataUrl) {
      try {
        ensureAudioGraph();
        audioEl.pause();
        audioEl.src = dataUrl;
        audioEl.playbackRate = rate;
        if ('preservesPitch' in audioEl) {
          (audioEl as any).preservesPitch = pitchLockEnabled;
        }
        await audioEl.play();
        setIsPlaying(true);
        return;
      } catch {
        // Fall through to native speech fallback if audio device is unavailable
      }
    }

    setIsPlaying(true);
    speakWithNativeSpeechFallback(fallbackText, persona, accent, rate, () => {
      setIsPlaying(false);
    });
  };

  const handleSynthesizeSpeech = async () => {
    if (!scriptText.trim()) {
      setScriptError('Please enter script text before synthesizing voice audio.');
      return;
    }
    setScriptError(null);
    setIsSynthesizing(true);

    try {
      const response = await fetch('/api/v1/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineMode: engineTier,
          voiceId,
          gender: activePersona.gender,
          accentId,
          tempoMultiplier,
          pitchLockEnabled,
          emotion: currentConfig.emotion,
          text: scriptText.trim(),
          customAccents,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Voice synthesis failed.');
      }

      const validWavBytes = ensureValidWavBytes(
        base64ToUint8(data.audioBase64),
        24000
      );
      const audioDataUrl = `data:audio/wav;base64,${uint8ToBase64(validWavBytes)}`;
      const newTake: SynthesisTake = {
        id: `take-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        voicePersona: activePersona,
        accentProfile: activeAccent,
        tempoMultiplier,
        emotion: { ...currentConfig.emotion },
        engineTier,
        scriptText: scriptText.trim(),
        styleDirective:
          data.compiled?.styleDirective || compiledPayload.styleDirective,
        audioDataUrl,
        durationSec: data.durationSec || tempoMetrics.estimatedDurationSec || 2.5,
        latencyMs: data.latencyMs || 45,
        sampleRateHz: data.sampleRateHz || 24000,
        sourceMode: 'master-bus',
      };

      setTakes((prev) => [newTake, ...prev]);
      setActiveTakeId(newTake.id);
      await playDataUrl(
        audioDataUrl,
        tempoMultiplier,
        newTake.scriptText,
        activePersona,
        activeAccent
      );
    } catch {
      // Offline fallback: speak intelligible words via native speech synthesis (never a sine-wave oscillator)
      setIsPlaying(true);
      speakWithNativeSpeechFallback(
        scriptText.trim(),
        activePersona,
        activeAccent,
        tempoMultiplier,
        () => setIsPlaying(false)
      );
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePlaySpecificTake = async (take: SynthesisTake) => {
    setActiveTakeId(take.id);
    if (take.audioDataUrl) {
      await playDataUrl(
        take.audioDataUrl,
        tempoMultiplier,
        take.scriptText,
        take.voicePersona,
        take.accentProfile
      );
      return;
    }

    // If seed take hasn't finished background hydration yet, synthesize it live now
    setIsSynthesizing(true);
    try {
      const response = await fetch('/api/v1/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineMode: take.engineTier,
          voiceId: take.voicePersona.id,
          gender: take.voicePersona.gender,
          accentId: take.accentProfile.id,
          tempoMultiplier: take.tempoMultiplier,
          pitchLockEnabled: true,
          emotion: take.emotion,
          text: take.scriptText,
          customAccents,
        }),
      });
      const data = await response.json();
      if (response.ok && data.audioBase64) {
        const validWavBytes = ensureValidWavBytes(
          base64ToUint8(data.audioBase64),
          24000
        );
        const wavUrl = `data:audio/wav;base64,${uint8ToBase64(validWavBytes)}`;
        setTakes((prev) =>
          prev.map((t) =>
            t.id === take.id
              ? {
                  ...t,
                  audioDataUrl: wavUrl,
                  durationSec: data.durationSec || t.durationSec,
                  latencyMs: data.latencyMs || t.latencyMs,
                }
              : t
          )
        );
        await playDataUrl(
          wavUrl,
          tempoMultiplier,
          take.scriptText,
          take.voicePersona,
          take.accentProfile
        );
        return;
      }
    } catch {
      // Fall through to native speech
    } finally {
      setIsSynthesizing(false);
    }

    await playDataUrl(
      '',
      tempoMultiplier,
      take.scriptText,
      take.voicePersona,
      take.accentProfile
    );
  };

  const handleTogglePlayPause = async () => {
    const audioEl = audioRef.current;
    const currentTake = takes.find((t) => t.id === activeTakeId) || takes[0];
    if (!currentTake) return;

    if (isPlaying) {
      if (audioEl) audioEl.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      await handlePlaySpecificTake(currentTake);
    }
  };

  const activeTake = useMemo(
    () => takes.find((t) => t.id === activeTakeId) || takes[0] || null,
    [takes, activeTakeId]
  );

  const filteredTakes = useMemo(() => {
    return takes.filter((take) => {
      const matchesGender =
        libraryGenderFilter === 'all' ||
        take.voicePersona.gender === libraryGenderFilter;
      const q = librarySearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        take.voicePersona.name.toLowerCase().includes(q) ||
        take.accentProfile.name.toLowerCase().includes(q) ||
        take.scriptText.toLowerCase().includes(q);
      return matchesGender && matchesQuery;
    });
  }, [takes, libraryGenderFilter, librarySearch]);

  const personaShortName = activePersona.name.split(' — ')[0];

  return (
    <div className="min-h-screen bg-[#0C0E12] text-zinc-100 flex flex-col">
      {/* Hidden audio element for real-time pitch-locked playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration && Number.isFinite(el.duration)) {
            setPlaybackProgress(Math.min(100, (el.currentTime / el.duration) * 100));
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setPlaybackProgress(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-zinc-800/90 bg-[#0C0E12]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('studio');
          }}
          className="text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 font-display"
        >
          VoxChronos Studio
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-6 text-sm font-medium text-zinc-400 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveSection('studio')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'studio'
                ? 'border-amber-400 text-zinc-100'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Voice Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('reader')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'reader'
                ? 'border-amber-400 text-zinc-100'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            PDF & Bible
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('cloner')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'cloner'
                ? 'border-amber-400 text-zinc-100'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Accent Cloner
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('library')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'library'
                ? 'border-amber-400 text-zinc-100'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Take Library
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('api')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'api'
                ? 'border-amber-400 text-zinc-100'
                : 'border-transparent hover:text-zinc-200'
            }`}
          >
            Mobile SDK
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleSynthesizeSpeech}
            disabled={isSynthesizing}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {isSynthesizing ? 'Synthesizing...' : 'Synthesize Audio'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Contextual Workspace Header & Real-Time Acoustic KPI Strip */}
        <section className="space-y-4 pb-5 border-b border-zinc-800/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
              <span className="whitespace-nowrap">Broadcast Acoustic Processing</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">24kHz 16-Bit RIFF WAV</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">Pitch-Locked Time Stretch</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-display max-w-4xl"
              style={{ textWrap: 'balance' }}
            >
              Real-Time Accent Cloning, Male & Female Vocal Registers, and Dynamic Tempo Modulation
            </h1>
          </div>

          {/* Full-Width 4-Column Acoustic Readout Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-zinc-800/80 font-mono tabular-nums">
            <div>
              <div className="text-xs text-zinc-400 whitespace-nowrap">Active Vocal Channel</div>
              <div className="text-sm font-semibold text-zinc-100 mt-0.5 whitespace-nowrap">
                {personaShortName} ({activePersona.gender === 'female' ? 'Female' : 'Male'} · {activePersona.registerLabel})
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 whitespace-nowrap">Cloned Accent</div>
              <div className="text-sm font-semibold text-amber-400 mt-0.5 truncate whitespace-nowrap">
                {activeAccent.name} ({activeAccent.localeCode})
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 whitespace-nowrap">Real-Time Tempo</div>
              <div className="text-sm font-semibold text-zinc-100 mt-0.5 whitespace-nowrap">
                {tempoMultiplier.toFixed(2)}x · {tempoMetrics.estimatedWpm} WPM
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 whitespace-nowrap">Emotional Vector</div>
              <div className="text-sm font-semibold text-emerald-400 mt-0.5 whitespace-nowrap">
                Warmth {warmth}% · Intensity {intensity}%
              </div>
            </div>
          </div>
        </section>

        {/* WORKSPACE SECTION 1: VOICE STUDIO */}
        {activeSection === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Voice Model Core, Accent Cloning Matrix & Emotional/Tempo Rack */}
            <div className="lg:col-span-7 space-y-6">
              {/* Panel 01: Male & Female Vocal Register Selection */}
              <section
                aria-labelledby="heading-voice-models"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
                  <div>
                    <h2
                      id="heading-voice-models"
                      className="text-base font-semibold text-zinc-100"
                    >
                      01. Male & Female Vocal Registers
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Select a female or male vocal core with calibrated fundamental frequency (F₀) and harmonic formants.
                    </p>
                  </div>

                  {/* Interactive Gender Filter Tabs */}
                  <div
                    role="group"
                    aria-label="Filter Voice Models by Gender"
                    className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectGenderFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        genderFilter === 'all'
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      All ({VOICE_PERSONAS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGenderFilter('female')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        genderFilter === 'female'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Female Registers (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGenderFilter('male')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        genderFilter === 'male'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Male Registers (3)
                    </button>
                  </div>
                </div>

                {/* Voice Persona Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredVoices.map((persona) => {
                    const isSelected = persona.id === voiceId;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => setVoiceId(persona.id)}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-zinc-950'
                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-100">
                            {persona.name}
                          </span>
                          <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                            {persona.fundamentalFreqHz[0]}–{persona.fundamentalFreqHz[1]}Hz
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                          <span
                            className={
                              persona.gender === 'female'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {persona.gender === 'female' ? 'Female' : 'Male'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{persona.studioCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{persona.formantSignature}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                          {persona.timbreSummary}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Acoustic Bus Routing Mode Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs">
                  <span className="text-zinc-400">
                    Acoustic Processing Bus:
                  </span>
                  <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEngineTier('studio-master')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        engineTier === 'studio-master'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Studio Master (Full Prosody & Vocal Bursts)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEngineTier('low-latency-stream')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        engineTier === 'low-latency-stream'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Direct Stream (Ultra-Low Latency)
                    </button>
                  </div>
                </div>
              </section>

              {/* Panel 02: Accent Cloning Matrix */}
              <section
                aria-labelledby="heading-accent-cloning"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
                  <div>
                    <h2
                      id="heading-accent-cloning"
                      className="text-base font-semibold text-zinc-100"
                    >
                      02. Regional & Custom Cloned Accent Profiles
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Clone phonetic vowel shifts, rhoticity, and rhythmic timing onto the selected vocal register.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('cloner')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-xs font-medium text-amber-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Clone Reference Audio</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allAccents.map((acc) => {
                    const isSelected = acc.id === accentId;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setAccentId(acc.id)}
                        className={`text-left p-3.5 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-zinc-950'
                            : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-100 truncate">
                            {acc.name}
                          </span>
                          <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                            {acc.localeCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                          <span>{acc.region}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400/90">
                            {acc.rhythmicSyllableTiming}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5 truncate">
                          {acc.phoneticSignature}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Phonetic & Vowel Shift Breakdown of Selected Accent */}
                <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/90 p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-zinc-400 font-mono tabular-nums">
                    <span>Active Phonetic Rule: {activeAccent.name}</span>
                    <span>
                      Formant Shift: ΔF1 {activeAccent.formantOffsetHz[0] >= 0 ? '+' : ''}
                      {activeAccent.formantOffsetHz[0]}Hz · ΔF2{' '}
                      {activeAccent.formantOffsetHz[1] >= 0 ? '+' : ''}
                      {activeAccent.formantOffsetHz[1]}Hz
                    </span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed">
                    {activeAccent.vowelShiftRule} — {activeAccent.prosodyContour}
                  </p>
                </div>
              </section>

              {/* Panel 03: Real-Time Tempo & Emotional Modulation */}
              <section
                aria-labelledby="heading-modulation"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
                  <div>
                    <h2
                      id="heading-modulation"
                      className="text-base font-semibold text-zinc-100"
                    >
                      03. Real-Time Speech Tempo & Emotional Modulation
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Adjust speech tempo in real time (0.50x–2.00x) with pitch-locked formant preservation and 4-axis emotional control.
                    </p>
                  </div>
                </div>

                {/* Real-Time Speech Tempo Controller */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="tempo-slider"
                      className="text-xs font-semibold text-zinc-200 flex items-center gap-2"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Real-Time Speech Tempo Multiplier</span>
                    </label>
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="text-amber-400 font-semibold">
                        {tempoMultiplier.toFixed(2)}x
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-200">
                        {tempoMetrics.estimatedWpm} WPM
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-400">
                        {tempoMetrics.syllablesPerSecond} syl/s
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-400">
                        {tempoMetrics.pacingLabel}
                      </span>
                    </div>
                  </div>

                  <input
                    id="tempo-slider"
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={tempoMultiplier}
                    onChange={(e) => setTempoMultiplier(parseFloat(e.target.value))}
                    className="w-full studio-slider"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[0.75, 0.9, 1.0, 1.15, 1.25, 1.5, 1.75].map((presetRate) => (
                        <button
                          key={presetRate}
                          type="button"
                          onClick={() => setTempoMultiplier(presetRate)}
                          className={`px-2.5 py-1 rounded text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                            Math.abs(tempoMultiplier - presetRate) < 0.01
                              ? 'bg-amber-500 text-zinc-950 font-semibold'
                              : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {presetRate.toFixed(2)}x
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pitchLockEnabled}
                        onChange={(e) => setPitchLockEnabled(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                      />
                      <span>Pitch-Locked Formants (Zero Chipmunk Shift)</span>
                    </label>
                  </div>
                </div>

                {/* Emotion Presets */}
                <div className="space-y-2.5">
                  <div className="text-xs font-medium text-zinc-300">
                    Emotional Prosody Preset
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(EMOTION_PRESETS) as EmotionPresetId[]).map(
                      (presetKey) => {
                        const preset = EMOTION_PRESETS[presetKey];
                        const isSelected = emotionPresetId === presetKey;
                        return (
                          <button
                            key={presetKey}
                            type="button"
                            onClick={() => handleApplyEmotionPreset(presetKey)}
                            className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                              isSelected
                                ? 'border-amber-400 bg-zinc-950 text-zinc-100'
                                : 'border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <div className="font-semibold truncate">
                              {preset.label}
                            </div>
                            <div className="text-zinc-400 truncate mt-0.5">
                              {preset.description}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* 4 Fine-Grained Modulation Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="slider-intensity" className="text-zinc-300 font-medium">
                        Emotional Intensity (Arousal)
                      </label>
                      <span className="font-mono tabular-nums text-amber-400">
                        {intensity}%
                      </span>
                    </div>
                    <input
                      id="slider-intensity"
                      type="range"
                      min={0}
                      max={100}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="w-full studio-slider"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="slider-warmth" className="text-zinc-300 font-medium">
                        Vocal Chest Warmth
                      </label>
                      <span className="font-mono tabular-nums text-amber-400">
                        {warmth}%
                      </span>
                    </div>
                    <input
                      id="slider-warmth"
                      type="range"
                      min={0}
                      max={100}
                      value={warmth}
                      onChange={(e) => setWarmth(Number(e.target.value))}
                      className="w-full studio-slider"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="slider-expressiveness"
                        className="text-zinc-300 font-medium"
                      >
                        Pitch Expressiveness (F0 Variance)
                      </label>
                      <span className="font-mono tabular-nums text-amber-400">
                        {expressiveness}%
                      </span>
                    </div>
                    <input
                      id="slider-expressiveness"
                      type="range"
                      min={0}
                      max={100}
                      value={expressiveness}
                      onChange={(e) => setExpressiveness(Number(e.target.value))}
                      className="w-full studio-slider"
                    />
                  </div>

                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="slider-crispness" className="text-zinc-300 font-medium">
                        Consonant Articulation Crispness
                      </label>
                      <span className="font-mono tabular-nums text-amber-400">
                        {crispness}%
                      </span>
                    </div>
                    <input
                      id="slider-crispness"
                      type="range"
                      min={0}
                      max={100}
                      value={crispness}
                      onChange={(e) => setCrispness(Number(e.target.value))}
                      className="w-full studio-slider"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right 5 Columns: Real-Time Acoustic Monitor & Transport + Script Director */}
            <div className="lg:col-span-5 space-y-6">
              {/* Real-Time Acoustic Monitor & Transport Deck */}
              <section
                aria-labelledby="heading-acoustic-monitor"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2
                      id="heading-acoustic-monitor"
                      className="text-base font-semibold text-zinc-100"
                    >
                      04. Real-Time Acoustic Monitor & Playback Deck
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Live oscilloscope and formant harmonic spectrum with pitch-locked tempo scrubbing.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setScopeMode('waveform')}
                      aria-label="Waveform Oscilloscope View"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        scopeMode === 'waveform'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Waveform</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeMode('formants')}
                      aria-label="Formant Harmonics View"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        scopeMode === 'formants'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Formants</span>
                    </button>
                  </div>
                </div>

                <AcousticScopeCanvas
                  persona={activePersona}
                  accent={activeAccent}
                  tempoMultiplier={tempoMultiplier}
                  emotion={currentConfig.emotion}
                  isPlaying={isPlaying}
                  analyserNode={analyserRef.current}
                  viewMode={scopeMode}
                />

                {/* Active Take Transport Bar */}
                {activeTake && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-100 truncate">
                          {activeTake.voicePersona.name} · {activeTake.accentProfile.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums mt-0.5">
                          <span>{activeTake.durationSec}s</span>
                          <span aria-hidden="true">·</span>
                          <span>{tempoMultiplier.toFixed(2)}x Live Tempo</span>
                          <span aria-hidden="true">·</span>
                          <span>{activeTake.latencyMs}ms latency</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleTogglePlayPause}
                          aria-label={isPlaying ? 'Pause Active Take' : 'Play Active Take'}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play Take</span>
                            </>
                          )}
                        </button>

                        {activeTake.audioDataUrl && (
                          <a
                            href={activeTake.audioDataUrl}
                            download={`voxchronos-${activeTake.voicePersona.studioCode.toLowerCase()}-${activeTake.accentProfile.localeCode}.wav`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                            <span>WAV</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-transform duration-150 origin-left"
                        style={{
                          transform: `scaleX(${isPlaying ? Math.max(0.15, playbackProgress / 100) : 0})`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Recent Synthesized Takes Quick List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Recent Synthesized Takes ({takes.length})</span>
                    <button
                      type="button"
                      onClick={() => setActiveSection('library')}
                      className="text-amber-400 hover:underline"
                    >
                      Open Full Take Library
                    </button>
                  </div>
                  <div className="space-y-2">
                    {takes.slice(0, 3).map((take) => {
                      const isCurrent = take.id === activeTake?.id;
                      const shortName = take.voicePersona.name.split(' — ')[0];
                      return (
                        <div
                          key={take.id}
                          className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-xs transition-colors ${
                            isCurrent
                              ? 'border-amber-500/60 bg-zinc-950'
                              : 'border-zinc-800/80 bg-zinc-950/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-200 truncate">
                              {shortName} ({take.voicePersona.gender}) ·{' '}
                              {take.accentProfile.name}
                            </div>
                            <div className="text-zinc-400 truncate mt-0.5 font-mono tabular-nums">
                              {take.tempoMultiplier.toFixed(2)}x · Warmth {take.emotion.warmth}% ·{' '}
                              {take.createdAt}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlaySpecificTake(take)}
                            aria-label={`Play take ${shortName} ${take.accentProfile.name}`}
                            className="px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium whitespace-nowrap shrink-0 flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Audition</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Script & Vocal Burst Director */}
              <section
                aria-labelledby="heading-script-director"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <h2
                      id="heading-script-director"
                      className="text-base font-semibold text-zinc-100"
                    >
                      05. Script & Vocal Burst Director
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Compose speech with expressive vocal bursts (&lt;breath&gt;, &lt;laugh&gt;) and natural backchanneling (|yeah|).
                    </p>
                  </div>
                </div>

                {/* Preset Script Templates */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {SCRIPT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setScriptError(null);
                        setScriptText(tpl.text);
                      }}
                      className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="synthesis-script-input" className="sr-only">
                    Synthesis Script Text
                  </label>
                  <textarea
                    id="synthesis-script-input"
                    rows={4}
                    value={scriptText}
                    onChange={(e) => {
                      setScriptError(null);
                      setScriptText(e.target.value);
                    }}
                    placeholder="Type or paste text to synthesize with the cloned accent and emotional modulation..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 leading-relaxed focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Vocal Burst Insertion Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {VOCAL_BURST_TAGS.map((b) => (
                      <button
                        key={b.tag}
                        type="button"
                        onClick={() => handleInsertVocalTag(b.tag)}
                        className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-950 hover:border-amber-500/40 text-xs font-mono text-amber-400 transition-colors whitespace-nowrap shrink-0"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setScriptText('')}
                    className="text-xs text-zinc-400 hover:text-zinc-200 whitespace-nowrap shrink-0"
                  >
                    Clear Script
                  </button>
                </div>

                {scriptError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/40 bg-red-950/30 px-3.5 py-2 text-xs text-red-200"
                  >
                    {scriptError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400 font-mono tabular-nums">
                  <div>
                    <span>{tempoMetrics.wordCount} words</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>Est. {tempoMetrics.estimatedDurationSec}s</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSynthesizeSpeech}
                    disabled={isSynthesizing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
                  >
                    <Radio className="w-4 h-4" />
                    <span>
                      {isSynthesizing
                        ? 'Synthesizing Voice...'
                        : 'Synthesize & Play Voice'}
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* WORKSPACE SECTION 1.5: PDF, BIBLE & LONG-FORM STREAM READER */}
        {activeSection === 'reader' && (
          <DocumentStreamReader
            config={currentConfig}
            activePersona={activePersona}
            activeAccent={activeAccent}
            customAccents={customAccents}
            onTempoChange={(rate) => setTempoMultiplier(rate)}
            onToggleGenderQuick={() => {
              const targetGender: VoiceGender =
                activePersona.gender === 'female' ? 'male' : 'female';
              const nextVoice = VOICE_PERSONAS.find(
                (v) => v.gender === targetGender
              );
              if (nextVoice) setVoiceId(nextVoice.id);
            }}
          />
        )}

        {/* WORKSPACE SECTION 2: ACCENT CLONER */}
        {activeSection === 'cloner' && (
          <AccentClonerWorkbench
            customAccents={customAccents}
            activeAccentId={accentId}
            onAccentCreated={(newProfile) => {
              setCustomAccents((prev) => [newProfile, ...prev]);
              setAccentId(newProfile.id);
            }}
            onSelectAccent={(id) => {
              setAccentId(id);
              setActiveSection('studio');
            }}
          />
        )}

        {/* WORKSPACE SECTION 3: TAKE LIBRARY */}
        {activeSection === 'library' && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  Synthesized Voice Take Library ({filteredTakes.length})
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Compare male and female voice takes across cloned accents, emotional vectors, and real-time tempo settings.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Filter by voice, accent, or script..."
                    aria-label="Filter Takes by Voice, Accent, or Script"
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setLibraryGenderFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      libraryGenderFilter === 'all'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryGenderFilter('female')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      libraryGenderFilter === 'female'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryGenderFilter('male')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      libraryGenderFilter === 'male'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>
            </div>

            {filteredTakes.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-8 text-center space-y-3">
                <p className="text-sm font-medium text-zinc-200">
                  No voice synthesis takes match your current filter
                </p>
                <p className="text-xs text-zinc-400">
                  Clear your search filter or synthesize a new voice take in the Voice Studio.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLibrarySearch('');
                    setLibraryGenderFilter('all');
                    setActiveSection('studio');
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-semibold text-xs transition-colors"
                >
                  Return to Voice Studio
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                      <th className="py-3 px-3">Vocal Channel</th>
                      <th className="py-3 px-3">Cloned Accent</th>
                      <th className="py-3 px-3">Emotional Modulation</th>
                      <th className="py-3 px-3 text-right">Tempo</th>
                      <th className="py-3 px-3 text-right">Duration</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    {filteredTakes.map((take) => (
                      <tr
                        key={take.id}
                        className="hover:bg-zinc-950/60 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium text-zinc-100">
                          <div>{take.voicePersona.name}</div>
                          <div className="text-zinc-400 font-mono tabular-nums mt-0.5">
                            {take.voicePersona.gender === 'female' ? 'Female' : 'Male'} ·{' '}
                            {take.voicePersona.studioCode}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-200">
                          <div>{take.accentProfile.name}</div>
                          <div className="text-zinc-400 font-mono tabular-nums mt-0.5">
                            {take.accentProfile.localeCode} ·{' '}
                            {take.accentProfile.rhythmicSyllableTiming}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          <div>
                            {EMOTION_PRESETS[take.emotion.presetId]?.label || 'Custom'}
                          </div>
                          <div className="text-zinc-400 font-mono tabular-nums mt-0.5">
                            Int {take.emotion.intensity}% · Warmth {take.emotion.warmth}% · Expr{' '}
                            {take.emotion.expressiveness}%
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                          {take.tempoMultiplier.toFixed(2)}x
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-zinc-300">
                          {take.durationSec}s
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handlePlaySpecificTake(take)}
                              aria-label={`Play ${take.voicePersona.name}`}
                              className="px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-100 font-medium whitespace-nowrap shrink-0"
                            >
                              Play
                            </button>
                            {take.audioDataUrl && (
                              <a
                                href={take.audioDataUrl}
                                download={`voxchronos-${take.id}.wav`}
                                className="px-2.5 py-1.5 rounded border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-amber-400 font-medium whitespace-nowrap shrink-0"
                              >
                                WAV
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setTakes((prev) => prev.filter((t) => t.id !== take.id))
                              }
                              aria-label={`Delete take ${take.voicePersona.name}`}
                              className="p-1.5 rounded border border-zinc-800 bg-zinc-950 hover:border-red-500/50 text-zinc-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* WORKSPACE SECTION 4: API & WEB SDK INTEGRATION */}
        {activeSection === 'api' && (
          <ApiIntegrationWorkbench
            config={currentConfig}
            customAccents={customAccents}
            onTriggerLiveSynthesize={handleSynthesizeSpeech}
            isSynthesizing={isSynthesizing}
            lastLatencyMs={activeTake?.latencyMs ?? null}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-zinc-800/80 px-6 py-4 mt-8 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-4 max-w-[1380px] w-full mx-auto">
        <div>
          VoxChronos Acoustic Systems · 24-Bit / 24kHz Broadcast Audio Engine
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveSection('studio')}
            className="hover:text-zinc-200 transition-colors"
          >
            Studio Console
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('cloner')}
            className="hover:text-zinc-200 transition-colors"
          >
            Formant Cloner
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('api')}
            className="hover:text-zinc-200 transition-colors"
          >
            Web SDK Docs
          </button>
        </div>
      </footer>
    </div>
  );
}
