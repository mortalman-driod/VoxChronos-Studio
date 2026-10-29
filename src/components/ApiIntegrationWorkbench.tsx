import React, { useState } from 'react';
import { Copy, Check, Play, Terminal, Code2 } from 'lucide-react';
import {
  AccentProfile,
  SynthesisConfig,
  compileSynthesisPayload,
  generateIntegrationSnippets,
} from '../utils/voiceEngine';

interface ApiIntegrationWorkbenchProps {
  config: SynthesisConfig;
  customAccents: AccentProfile[];
  onTriggerLiveSynthesize: () => Promise<void>;
  isSynthesizing: boolean;
  lastLatencyMs: number | null;
}

type CodeTab =
  | 'mobileDropInSdk'
  | 'restTypescript'
  | 'streamingWebAudio'
  | 'curlCommand'
  | 'pythonSdk';

export const ApiIntegrationWorkbench: React.FC<ApiIntegrationWorkbenchProps> = ({
  config,
  customAccents,
  onTriggerLiveSynthesize,
  isSynthesizing,
  lastLatencyMs,
}) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('mobileDropInSdk');
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://voxchronos.app';
  const snippets = generateIntegrationSnippets(config, customAccents, origin);
  const compiled = compileSynthesisPayload(config, customAccents);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippets[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Endpoint Specification & Live Telemetry Inspector */}
        <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 space-y-5">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Mobile Web App SDK & Low-Latency Voice API
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Drop `VoxChronosMobileReader` directly into your existing mobile web application for zero-lag PDF, Bible, and article narration with CORS enabled.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-amber-400 font-semibold">
                  POST /api/v1/voice/chunk-document
                </span>
                <span className="text-zinc-400">PDF & Bible Chunker</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Extracts PDFs, repairs hyphenated line-wraps, expands Scripture citations (`1 Cor. 13:4`), and segments long texts into 220-char prosodic chunks.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-emerald-400 font-semibold">
                  POST /api/v1/voice/synthesize
                </span>
                <span className="text-zinc-400">24kHz WAV + LRU Cache</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Synthesizes 24kHz 16-bit mono WAV audio with server-side 120-entry LRU caching (1ms cache hits on repeated verses).
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/80 space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-amber-300 font-semibold">
                  POST /api/v1/voice/stream
                </span>
                <span className="text-zinc-400">Raw PCM L16 Stream</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Streams headerless 24kHz 16-bit little-endian PCM chunks for gapless Web Audio API `AudioBufferSourceNode` scheduling.
              </p>
            </div>
          </div>

          {/* Compiled Acoustic Routing Spec Preview */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono tabular-nums">
              <span>Compiled Acoustic Routing & Prosody Spec</span>
              <span>
                {compiled.voiceCode} ({compiled.gender}) · {compiled.tempoMultiplier.toFixed(2)}x
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-200 leading-relaxed">
              {compiled.styleDirective}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-xs text-zinc-400 font-mono tabular-nums">
              {lastLatencyMs !== null
                ? `Last Round-Trip: ${lastLatencyMs}ms · CORS Enabled`
                : 'Endpoint Ready · 24,000 Hz Mono PCM'}
            </div>
            <button
              type="button"
              onClick={onTriggerLiveSynthesize}
              disabled={isSynthesizing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isSynthesizing ? 'Executing API Request...' : 'Test Live API Endpoint'}
              </span>
            </button>
          </div>
        </div>

        {/* Right 7 Cols: Live-Synced Code Generator */}
        <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('mobileDropInSdk')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'mobileDropInSdk'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Mobile Web App SDK
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('restTypescript')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'restTypescript'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                TypeScript Fetch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('streamingWebAudio')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'streamingWebAudio'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Web Audio PCM Stream
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('curlCommand')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'curlCommand'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pythonSdk')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'pythonSdk'
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Python
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Snippet</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="p-5 bg-[#08090C] overflow-x-auto">
            <pre className="text-xs font-mono text-zinc-200 leading-relaxed">
              <code>{snippets[activeTab]}</code>
            </pre>
          </div>

          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 font-mono tabular-nums">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Engine: {compiled.engineMode}</span>
              <span aria-hidden="true">·</span>
              <span>Voice: {compiled.voiceCode}</span>
              <span aria-hidden="true">·</span>
              <span>Accent: {compiled.accentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pitch-Lock: {compiled.pitchLockEnabled ? 'Enabled' : 'Off'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
