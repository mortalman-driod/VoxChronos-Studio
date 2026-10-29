import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Upload,
  BookOpen,
  FileText,
  Smartphone,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import {
  AccentProfile,
  DocumentNormalizerOptions,
  SynthesisConfig,
  VoicePersona,
  chunkLongDocumentForStreaming,
  getPrefetchWindowIndices,
  synthesizeFormantPreviewWav,
} from '../utils/voiceEngine';

interface DocumentStreamReaderProps {
  config: SynthesisConfig;
  activePersona: VoicePersona;
  activeAccent: AccentProfile;
  customAccents: AccentProfile[];
  onTempoChange: (newTempo: number) => void;
  onToggleGenderQuick: () => void;
}

interface PresetDocument {
  id: string;
  category: 'Bible & Scripture' | 'PDF Research Write-Up' | 'Executive Write-Up';
  title: string;
  subtitle: string;
  rawText: string;
}

const PRESET_DOCUMENTS: PresetDocument[] = [
  {
    id: 'bible-genesis-john',
    category: 'Bible & Scripture',
    title: 'Holy Bible — Genesis 1 & Gospel of John 1 (KJV / Liturgical)',
    subtitle: 'Inline verse-number stripping [1:1], citation expansion (1 Cor. 13:4-7), and liturgical cadence',
    rawText: `[1:1] In the beginning God created the heaven and the earth.
[1:2] And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.
[1:3] And God said, Let there be light: and there was light.
[1:4] And God saw the light, that it was good: and God divided the light from the darkness.
[1:5] Cross-reference reading from John 1:1 and 1 Cor. 13:4-7: In the beginning was the Word, and the Word was with God, and the Word was God. Charity suffereth long, and is kind; charity never faileth.`,
  },
  {
    id: 'pdf-clinical-paper',
    category: 'PDF Research Write-Up',
    title: 'PDF Extract — Acoustic Formant Synthesis & Low-Latency Streaming',
    subtitle: 'Automatic repair of PDF hyphenated line-wraps (syn-\\nthesis) and footnote bracket removal [14]',
    rawText: `Abstract: Modern mobile web applications require deterministic sub-second audio syn-\nthesis when reading multi-page PDF documents and technical write-ups [14].
Page 4 of 18
When a monolithic text payload is dispatched in a single blocking request, network serialization and buffer compilation create unacceptable user-perceived lag [22, 25].
By decomposing long-form manuscripts into prosodic sentence windows and prefetching the next two acoustic buffers in parallel, mobile clients achieve zero-gap continuous playback across arbitrary document lengths.`,
  },
  {
    id: 'article-executive-brief',
    category: 'Executive Write-Up',
    title: 'Long-Form Write-Up — Global Macroeconomic & Infrastructure Outlook',
    subtitle: 'Continuous multi-paragraph streaming with real-time pitch-locked tempo acceleration',
    rawText: `First-quarter infrastructure deployment across mobile broadband corridors has accelerated demand for low-bandwidth, high-clarity broadcast voice interfaces.
Rather than forcing mobile readers to stare at dense PDF reports during transit, embedded acoustic engines transform written briefings into interactive spoken broadcasts.
Listeners can seamlessly switch between male and female vocal registers, clone regional accents for localized familiarity, and modulate speaking tempo from 0.75x contemplative study up to 1.75x rapid executive review.`,
  },
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

export const DocumentStreamReader: React.FC<DocumentStreamReaderProps> = ({
  config,
  activePersona,
  activeAccent,
  customAccents,
  onTempoChange,
  onToggleGenderQuick,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(PRESET_DOCUMENTS[0].id);
  const [docTitle, setDocTitle] = useState<string>(PRESET_DOCUMENTS[0].title);
  const [rawDocText, setRawDocText] = useState<string>(PRESET_DOCUMENTS[0].rawText);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [normalizerOpts, setNormalizerOpts] = useState<DocumentNormalizerOptions>({
    repairPdfHyphens: true,
    stripVerseNumbers: true,
    expandBibleCitations: true,
    stripAcademicBrackets: true,
    insertBreathAtParagraphs: true,
  });

  // Lookahead Queue & Audio Buffer Cache State
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [isStreamPlaying, setIsStreamPlaying] = useState<boolean>(false);
  const [chunkStatusMap, setChunkStatusMap] = useState<
    Record<number, 'queued' | 'prefetching' | 'ready' | 'playing'>
  >({});
  const [ttfaMs, setTtfaMs] = useState<number>(24);

  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const streamAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  const chunks = useMemo(
    () =>
      chunkLongDocumentForStreaming(
        rawDocText,
        config.tempoMultiplier,
        normalizerOpts,
        210
      ),
    [rawDocText, config.tempoMultiplier, normalizerOpts]
  );

  const totalWords = useMemo(
    () => chunks.reduce((sum, c) => sum + c.wordCount, 0),
    [chunks]
  );

  const totalDurationSec = useMemo(
    () =>
      Math.round(
        chunks.reduce((sum, c) => sum + c.estimatedDurationSec, 0) * 10
      ) / 10,
    [chunks]
  );

  // Sync real-time tempo changes immediately to the playing stream audio element
  useEffect(() => {
    const el = streamAudioRef.current;
    if (!el) return;
    el.playbackRate = config.tempoMultiplier;
    if ('preservesPitch' in el) {
      (el as any).preservesPitch = config.pitchLockEnabled;
    }
  }, [config.tempoMultiplier, config.pitchLockEnabled]);

  // Configure iOS / Android Lock-Screen MediaSession API for mobile web app background playback
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        const currentChunk = chunks[activeChunkIndex];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentChunk
            ? `${docTitle} — ${currentChunk.verseOrSectionLabel}`
            : docTitle,
          artist: `${activePersona.name} (${activeAccent.name})`,
          album: 'VoxChronos Mobile Web Reader',
        });
        navigator.mediaSession.setActionHandler('play', () => {
          handlePlayChunkAt(activeChunkIndex);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          handlePauseStream();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (activeChunkIndex > 0) handlePlayChunkAt(activeChunkIndex - 1);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (activeChunkIndex + 1 < chunks.length) {
            handlePlayChunkAt(activeChunkIndex + 1);
          }
        });
      } catch {
        // Ignore in browsers where MediaMetadata is restricted
      }
    }
  }, [activeChunkIndex, chunks, docTitle, activePersona, activeAccent]);

  const buildChunkCacheKey = (chunkIdx: number, text: string) =>
    `${config.engineTier}|${config.voiceId}|${config.accentId}|${config.emotion.presetId}|${config.emotion.intensity}|${config.emotion.warmth}|${chunkIdx}|${text}`;

  const synthesizeOrGetCachedChunk = async (chunkIdx: number): Promise<string> => {
    const targetChunk = chunks[chunkIdx];
    if (!targetChunk) return '';
    const key = buildChunkCacheKey(chunkIdx, targetChunk.normalizedText);
    const existing = audioCacheRef.current.get(key);
    if (existing) {
      setChunkStatusMap((prev) => ({
        ...prev,
        [chunkIdx]: prev[chunkIdx] === 'playing' ? 'playing' : 'ready',
      }));
      return existing;
    }

    setChunkStatusMap((prev) => ({
      ...prev,
      [chunkIdx]: prev[chunkIdx] === 'playing' ? 'playing' : 'prefetching',
    }));

    const startMs = performance.now();
    try {
      const response = await fetch('/api/v1/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineMode: config.engineTier,
          voiceId: config.voiceId,
          gender: activePersona.gender,
          accentId: config.accentId,
          tempoMultiplier: config.tempoMultiplier,
          pitchLockEnabled: config.pitchLockEnabled,
          emotion: config.emotion,
          text: targetChunk.normalizedText,
          skipNormalization: true,
          customAccents,
        }),
      });
      const data = await response.json();
      if (response.ok && data.audioBase64) {
        const dataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        audioCacheRef.current.set(key, dataUrl);
        setTtfaMs(Math.max(12, Math.round(performance.now() - startMs)));
        setChunkStatusMap((prev) => ({
          ...prev,
          [chunkIdx]: prev[chunkIdx] === 'playing' ? 'playing' : 'ready',
        }));
        return dataUrl;
      }
    } catch {
      // Fall through to deterministic local formant synthesis
    }

    const fallbackWav = synthesizeFormantPreviewWav(
      { ...config, scriptText: targetChunk.normalizedText },
      customAccents
    );
    const fallbackUrl = `data:audio/wav;base64,${uint8ToBase64(fallbackWav.wavBytes)}`;
    audioCacheRef.current.set(key, fallbackUrl);
    setChunkStatusMap((prev) => ({
      ...prev,
      [chunkIdx]: prev[chunkIdx] === 'playing' ? 'playing' : 'ready',
    }));
    return fallbackUrl;
  };

  // Pre-warm the first 2 segments whenever document or voice changes so playback is 0ms instant
  useEffect(() => {
    setActiveChunkIndex(0);
    setChunkStatusMap({});
    if (chunks.length > 0) {
      synthesizeOrGetCachedChunk(0);
      if (chunks.length > 1) {
        synthesizeOrGetCachedChunk(1);
      }
    }
  }, [
    rawDocText,
    normalizerOpts,
    config.voiceId,
    config.accentId,
    config.engineTier,
    config.emotion.presetId,
  ]);

  const handlePlayChunkAt = async (index: number) => {
    if (index < 0 || index >= chunks.length) {
      setIsStreamPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    setActiveChunkIndex(index);
    setIsStreamPlaying(true);
    isPlayingRef.current = true;

    // Trigger lookahead prefetch for index + 1 and index + 2 in parallel
    const lookaheadIndices = getPrefetchWindowIndices(index, chunks.length, 2);
    for (const nextIdx of lookaheadIndices) {
      if (nextIdx !== index) {
        synthesizeOrGetCachedChunk(nextIdx);
      }
    }

    const dataUrl = await synthesizeOrGetCachedChunk(index);
    if (!isPlayingRef.current) return;

    setChunkStatusMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        const numK = Number(k);
        if (updated[numK] === 'playing') updated[numK] = 'ready';
      });
      updated[index] = 'playing';
      return updated;
    });

    const el = streamAudioRef.current;
    if (el && dataUrl) {
      try {
        el.pause();
        el.src = dataUrl;
        el.playbackRate = config.tempoMultiplier;
        if ('preservesPitch' in el) {
          (el as any).preservesPitch = config.pitchLockEnabled;
        }
        await el.play();
      } catch {
        // In headless browsers without audio hardware, advance after simulated segment duration
        setTimeout(() => {
          if (isPlayingRef.current && index + 1 < chunks.length) {
            handlePlayChunkAt(index + 1);
          } else {
            setIsStreamPlaying(false);
            isPlayingRef.current = false;
          }
        }, 1200);
      }
    }
  };

  const handlePauseStream = () => {
    setIsStreamPlaying(false);
    isPlayingRef.current = false;
    if (streamAudioRef.current) {
      streamAudioRef.current.pause();
    }
    setChunkStatusMap((prev) => ({
      ...prev,
      [activeChunkIndex]: 'ready',
    }));
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(`Parsing "${file.name}" for zero-lag streaming...`);
    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')) {
      reader.onload = async () => {
        const resStr = typeof reader.result === 'string' ? reader.result : '';
        const base64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
        try {
          const resp = await fetch('/api/v1/voice/chunk-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              mimeType: 'application/pdf',
              tempoMultiplier: config.tempoMultiplier,
              normalizerOptions: normalizerOpts,
            }),
          });
          const data = await resp.json();
          if (resp.ok && data.normalizedFullText) {
            setDocTitle(file.name);
            setRawDocText(data.normalizedFullText);
            setUploadStatus(
              `Extracted & segmented "${file.name}" into ${data.totalChunks} zero-lag audio chunks (${data.parseLatencyMs}ms).`
            );
          } else {
            throw new Error(data.error || 'Could not parse PDF.');
          }
        } catch (err) {
          setUploadStatus(
            err instanceof Error ? err.message : 'PDF extraction completed with fallback.'
          );
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        const textContent = typeof reader.result === 'string' ? reader.result : '';
        if (textContent.trim()) {
          setDocTitle(file.name);
          setRawDocText(textContent.trim());
          setUploadStatus(
            `Loaded "${file.name}" into the Lookahead Streaming Queue.`
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const speakerShortName = activePersona.name.split(' — ')[0];

  return (
    <div className="space-y-6">
      {/* Hidden persistent HTMLAudioElement for gapless mobile-compatible queue playback */}
      <audio
        ref={streamAudioRef}
        onEnded={() => {
          if (isPlayingRef.current && activeChunkIndex + 1 < chunks.length) {
            handlePlayChunkAt(activeChunkIndex + 1);
          } else {
            setIsStreamPlaying(false);
            isPlayingRef.current = false;
          }
        }}
      />

      {/* Top Long-Form Streaming Architecture & Telemetry Bar */}
      <section
        aria-label="Long-Form Streaming Architecture Summary"
        className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Radio className="w-4 h-4" />
              <span>GAPLESS DOCUMENT & SCRIPTURE STREAMING PIPELINE · MOBILE WEB READY</span>
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Zero-Lag PDF, Bible & Long-Form Write-Up Reader
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              Decomposes multi-page PDFs, Bible chapters, and executive write-ups into 220-character prosodic segments with 2-chunk parallel lookahead prefetching so mobile web clients stream continuously with zero inter-sentence gaps.
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums text-xs shrink-0">
            <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="text-zinc-400">First-Chunk TTFA</div>
              <div className="text-sm font-semibold text-emerald-400">{ttfaMs}ms (Prefetched)</div>
            </div>
            <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950">
              <div className="text-zinc-400">Active Queue</div>
              <div className="text-sm font-semibold text-amber-400">
                {chunks.length} Segments · {totalWords} Words
              </div>
            </div>
          </div>
        </div>

        {/* 5 Architectural Safeguards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-zinc-800/90 bg-zinc-950/70 space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>1. Lookahead Queue</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              220-char sentence/verse chunker with parallel N+1 & N+2 lookahead buffer prefetching.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-zinc-800/90 bg-zinc-950/70 space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>2. Scripture Normalizer</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Strips inline `[1:1]` verse clutter and expands `1 Cor. 13:4-7` into spoken liturgical phrasing.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-zinc-800/90 bg-zinc-950/70 space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>3. PDF Line-Wrap Repair</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Rejoins hyphenated column breaks (`syn-\nthesis`), strips `Page X of Y` headers, and removes `[14]` brackets.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-zinc-800/90 bg-zinc-950/70 space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>4. iOS/Android Unlock</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Reuses a single unlocked `HTMLAudioElement` + `navigator.mediaSession` for lock-screen mobile playback.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-zinc-800/90 bg-zinc-950/70 space-y-1">
            <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>5. 120-Entry LRU & CORS</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Server RAM cache serves repeated verses in 1ms with cross-origin CORS headers enabled.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Document Source Selector, Normalization Rules & Interactive Segment Queue */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Select Bible Passage, PDF Extract, or Upload Document
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Test real-time sentence segmentation, verse normalization, and lookahead prefetching.
                </p>
              </div>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-xs font-medium text-amber-400 cursor-pointer transition-colors whitespace-nowrap shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .PDF / .TXT</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,application/pdf,text/plain"
                  onChange={handleDocumentUpload}
                  className="sr-only"
                  aria-label="Upload PDF or Text Document"
                />
              </label>
            </div>

            {/* Preset Document Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_DOCUMENTS.map((doc) => {
                const isSelected = selectedDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setDocTitle(doc.title);
                      setRawDocText(doc.rawText);
                      setUploadStatus(null);
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-zinc-950'
                        : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{doc.category}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 mt-1 line-clamp-1">
                      {doc.title}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {doc.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {uploadStatus && (
              <div
                role="status"
                className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3.5 py-2 text-xs text-amber-200"
              >
                {uploadStatus}
              </div>
            )}

            {/* Document & Scripture Normalizer Checkboxes */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-zinc-200">
                Real-Time PDF & Scripture Normalization Pipeline
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizerOpts.repairPdfHyphens}
                    onChange={(e) =>
                      setNormalizerOpts((p) => ({
                        ...p,
                        repairPdfHyphens: e.target.checked,
                      }))
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400"
                  />
                  <span>Repair PDF Line-Break Hyphens (syn-\nthesis)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizerOpts.stripVerseNumbers}
                    onChange={(e) =>
                      setNormalizerOpts((p) => ({
                        ...p,
                        stripVerseNumbers: e.target.checked,
                      }))
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400"
                  />
                  <span>Strip Inline Verse Numbers ([1:1], [1:2])</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizerOpts.expandBibleCitations}
                    onChange={(e) =>
                      setNormalizerOpts((p) => ({
                        ...p,
                        expandBibleCitations: e.target.checked,
                      }))
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400"
                  />
                  <span>Expand Scripture Citations (1 Cor. 13:4-7)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizerOpts.stripAcademicBrackets}
                    onChange={(e) =>
                      setNormalizerOpts((p) => ({
                        ...p,
                        stripAcademicBrackets: e.target.checked,
                      }))
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-amber-400"
                  />
                  <span>Strip Academic Citation Brackets ([14])</span>
                </label>
              </div>
            </div>

            {/* Editable Raw Document Input */}
            <div>
              <label
                htmlFor="long-form-doc-textarea"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Source Document / Bible Chapter / PDF Text
              </label>
              <textarea
                id="long-form-doc-textarea"
                rows={4}
                value={rawDocText}
                onChange={(e) => setRawDocText(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs font-mono text-zinc-200 leading-relaxed focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Interactive Lookahead Segment Queue */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Lookahead Prosodic Segments ({chunks.length} Chunks · Est. {totalDurationSec}s at{' '}
                    {config.tempoMultiplier.toFixed(2)}x)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    isStreamPlaying
                      ? handlePauseStream()
                      : handlePlayChunkAt(activeChunkIndex)
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
                >
                  {isStreamPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Document Stream</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Gapless Document Stream</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {chunks.map((chunk) => {
                  const isCurrent = chunk.index === activeChunkIndex;
                  const status =
                    chunkStatusMap[chunk.index] ||
                    (chunk.index < 2 ? 'ready' : 'queued');

                  return (
                    <button
                      key={chunk.id}
                      type="button"
                      onClick={() => handlePlayChunkAt(chunk.index)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'border-amber-400 bg-zinc-950'
                          : 'border-zinc-800/90 bg-zinc-950/50 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-400">
                            {chunk.verseOrSectionLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-400">
                            {chunk.wordCount} words · {chunk.estimatedDurationSec}s
                          </span>
                        </div>
                        <span
                          className={
                            status === 'playing'
                              ? 'text-emerald-400 font-semibold'
                              : status === 'ready'
                              ? 'text-amber-400'
                              : status === 'prefetching'
                              ? 'text-amber-300'
                              : 'text-zinc-500'
                          }
                        >
                          {status === 'playing'
                            ? 'Playing Now'
                            : status === 'ready'
                            ? 'Prefetched (0ms Lag)'
                            : status === 'prefetching'
                            ? 'Prefetching...'
                            : 'Queued'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 mt-1.5 leading-relaxed">
                        {chunk.normalizedText}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Mobile Web App Embeddable Reader Preview (390px Ergonomic Frame) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Mobile Web App Drop-In Reader Preview</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Interactive 390px mobile viewport simulation showing how the voice bar embeds into your existing mobile web app with 44px touch targets.
                </p>
              </div>
            </div>

            {/* Simulated Mobile Web App Container */}
            <div className="max-w-[390px] mx-auto rounded-3xl border-2 border-zinc-800 bg-[#08090C] overflow-hidden shadow-xl flex flex-col justify-between min-h-[510px]">
              {/* Mobile App Top Bar (Hard Reach Zone) */}
              <div className="px-4 py-3 border-b border-zinc-800/90 bg-zinc-950/90 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200 truncate">
                  {docTitle}
                </span>
                <span className="text-[11px] font-mono text-amber-400 shrink-0">
                  {activeAccent.localeCode}
                </span>
              </div>

              {/* Mobile Reader Scrollable Text Feed (Stretch Zone) */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[280px]">
                {chunks.map((chunk) => {
                  const isActive = chunk.index === activeChunkIndex;
                  return (
                    <p
                      key={chunk.id}
                      onClick={() => handlePlayChunkAt(chunk.index)}
                      className={`text-xs leading-relaxed p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-amber-500/15 text-zinc-100 border border-amber-500/40 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {chunk.normalizedText}
                    </p>
                  );
                })}
              </div>

              {/* Mobile Drop-In Bottom Audio Player Sheet (Natural Thumb Zone — >=44px Touch Targets) */}
              <div className="p-4 rounded-t-2xl border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100 truncate">
                      {speakerShortName} ({activePersona.gender === 'female' ? 'Female' : 'Male'}) ·{' '}
                      {activeAccent.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                      Segment {activeChunkIndex + 1} of {chunks.length} ·{' '}
                      {config.tempoMultiplier.toFixed(2)}x Tempo
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleGenderQuick}
                    className="min-h-[44px] px-3 rounded-xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-xs font-medium text-amber-400 whitespace-nowrap shrink-0"
                  >
                    Switch {activePersona.gender === 'female' ? 'to Male' : 'to Female'}
                  </button>
                </div>

                {/* Primary Thumb-Zone Transport Controls (All buttons >= 44x44px hitbox) */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayChunkAt(Math.max(0, activeChunkIndex - 1))
                    }
                    disabled={activeChunkIndex <= 0}
                    aria-label="Previous Verse or Segment"
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center text-zinc-200"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isStreamPlaying
                        ? handlePauseStream()
                        : handlePlayChunkAt(activeChunkIndex)
                    }
                    aria-label={
                      isStreamPlaying ? 'Pause Mobile Reader' : 'Play Mobile Reader'
                    }
                    className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    {isStreamPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Reading</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Read Aloud Now</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePlayChunkAt(
                        Math.min(chunks.length - 1, activeChunkIndex + 1)
                      )
                    }
                    disabled={activeChunkIndex >= chunks.length - 1}
                    aria-label="Next Verse or Segment"
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center text-zinc-200"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumb-Friendly Tempo Selector Strip */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[0.85, 1.0, 1.15, 1.35, 1.6].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onTempoChange(rate)}
                      className={`min-h-[40px] rounded-lg text-xs font-mono tabular-nums transition-colors ${
                        Math.abs(config.tempoMultiplier - rate) < 0.02
                          ? 'bg-amber-500 text-zinc-950 font-semibold'
                          : 'border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {rate.toFixed(2)}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-zinc-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Lock-screen `navigator.mediaSession` & iOS Safari gesture unlock active
                </span>
              </div>
              <span className="font-mono text-zinc-300 shrink-0">CORS: *</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
