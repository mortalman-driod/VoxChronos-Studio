import React, { useEffect, useRef } from 'react';
import {
  AccentProfile,
  EmotionalModulation,
  VoicePersona,
} from '../utils/voiceEngine';

interface AcousticScopeCanvasProps {
  persona: VoicePersona;
  accent: AccentProfile;
  tempoMultiplier: number;
  emotion: EmotionalModulation;
  isPlaying: boolean;
  analyserNode: AnalyserNode | null;
  viewMode: 'waveform' | 'formants';
}

export const AcousticScopeCanvas: React.FC<AcousticScopeCanvasProps> = ({
  persona,
  accent,
  tempoMultiplier,
  emotion,
  isPlaying,
  analyserNode,
  viewMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({
    persona,
    accent,
    tempoMultiplier,
    emotion,
    isPlaying,
    analyserNode,
    viewMode,
  });

  useEffect(() => {
    propsRef.current = {
      persona,
      accent,
      tempoMultiplier,
      emotion,
      isPlaying,
      analyserNode,
      viewMode,
    };
  }, [persona, accent, tempoMultiplier, emotion, isPlaying, analyserNode, viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;
    const timeData = new Uint8Array(256);
    const freqData = new Uint8Array(128);

    const renderFrame = () => {
      const {
        persona: curPersona,
        accent: curAccent,
        tempoMultiplier: curTempo,
        emotion: curEmotion,
        isPlaying: playing,
        analyserNode: analyser,
        viewMode: mode,
      } = propsRef.current;

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#08090C';
      ctx.fillRect(0, 0, width, height);

      // Hardware oscilloscope graticule grid
      ctx.strokeStyle = 'rgba(161, 161, 170, 0.08)';
      ctx.lineWidth = 1;
      const hSteps = 4;
      for (let i = 1; i < hSteps; i++) {
        const y = (height / hSteps) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const vSteps = 8;
      for (let i = 1; i < vSteps; i++) {
        const x = (width / vSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const f0Mid =
        (curPersona.fundamentalFreqHz[0] + curPersona.fundamentalFreqHz[1]) / 2;
      const intensityNorm = curEmotion.intensity / 100;
      const warmthNorm = curEmotion.warmth / 100;
      const exprNorm = curEmotion.expressiveness / 100;

      if (mode === 'waveform') {
        const hasLiveSignal = playing && analyser !== null;
        if (hasLiveSignal && analyser) {
          analyser.getByteTimeDomainData(timeData);
        }

        // Primary acoustic waveform trace (Warm Studio Amber for Female register, Broadcast Emerald for Male register)
        ctx.beginPath();
        ctx.strokeStyle = curPersona.gender === 'female' ? '#F59E0B' : '#10B981';
        ctx.lineWidth = 2;

        const sliceWidth = width / 200;
        for (let i = 0; i <= 200; i++) {
          const x = i * sliceWidth;
          let yNorm = 0;

          if (hasLiveSignal) {
            const idx = Math.min(
              timeData.length - 1,
              Math.floor((i / 200) * timeData.length)
            );
            yNorm = (timeData[idx] - 128) / 128;
          } else {
            const t = i / 200;
            const speed = playing ? curTempo * 0.09 : curTempo * 0.025;
            const syllableEnv =
              0.35 +
              0.65 *
                Math.pow(
                  0.5 + 0.5 * Math.sin(t * Math.PI * 4 * curTempo + phase * 0.6),
                  1.4
                );
            const carrier =
              Math.sin(t * (f0Mid / 14) + phase) +
              0.45 * warmthNorm * Math.sin(t * (f0Mid / 7) + phase * 1.5) +
              0.25 * exprNorm * Math.cos(t * 28 - phase);
            const activeScale = playing ? 0.52 : 0.26;
            yNorm =
              carrier *
              syllableEnv *
              (0.45 + intensityNorm * 0.55) *
              activeScale;
            if (i === 0) phase += speed;
          }

          const y = height / 2 + yNorm * (height * 0.42);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Secondary formant envelope trace
        ctx.beginPath();
        ctx.strokeStyle =
          curPersona.gender === 'female'
            ? 'rgba(245, 158, 11, 0.25)'
            : 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 200; i++) {
          const x = i * sliceWidth;
          const t = i / 200;
          const env =
            Math.sin(t * 18 + phase * 0.8) *
            (0.2 + exprNorm * 0.25) *
            (playing ? 0.48 : 0.2);
          const y = height / 2 + env * (height * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Formant Spectrum View (F0, F1, F2 harmonic peaks)
        if (playing && analyser) {
          analyser.getByteFrequencyData(freqData);
        }
        const barCount = 48;
        const barWidth = width / barCount - 3;
        const f1Hz =
          (curPersona.gender === 'female' ? 510 : 410) +
          curAccent.formantOffsetHz[0];
        const f2Hz =
          (curPersona.gender === 'female' ? 1780 : 1340) +
          curAccent.formantOffsetHz[1];

        const f0Bin = Math.max(2, Math.min(10, Math.round(f0Mid / 32)));
        const f1Bin = Math.max(11, Math.min(22, Math.round(f1Hz / 40)));
        const f2Bin = Math.max(25, Math.min(42, Math.round(f2Hz / 50)));

        phase += playing ? 0.08 * curTempo : 0.02;

        for (let i = 0; i < barCount; i++) {
          const distF0 = Math.exp(-Math.pow(i - f0Bin, 2) / 5);
          const distF1 = Math.exp(-Math.pow(i - f1Bin, 2) / 9) * (0.7 + warmthNorm * 0.3);
          const distF2 =
            Math.exp(-Math.pow(i - f2Bin, 2) / 12) *
            (0.5 + (curEmotion.crispness / 100) * 0.5);

          const jitter =
            0.88 + 0.12 * Math.sin(phase * 2 + i * 0.7) * (playing ? 1.5 : 0.4);
          let mag =
            (distF0 * 0.85 + distF1 * 0.78 + distF2 * 0.65 + 0.06) *
            (0.6 + intensityNorm * 0.4) *
            jitter;
          mag = Math.min(0.92, Math.max(0.05, mag));

          const barHeight = mag * (height - 24);
          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          ctx.fillStyle =
            i === f0Bin || i === f1Bin || i === f2Bin
              ? '#F59E0B'
              : curPersona.gender === 'female'
              ? 'rgba(245, 158, 11, 0.42)'
              : 'rgba(16, 185, 129, 0.45)';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      if (playing) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    if (isPlaying) {
      animId = requestAnimationFrame(renderFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [persona, accent, tempoMultiplier, emotion, isPlaying, analyserNode, viewMode]);

  const f1Target =
    (persona.gender === 'female' ? 510 : 410) + accent.formantOffsetHz[0];
  const f2Target =
    (persona.gender === 'female' ? 1780 : 1340) + accent.formantOffsetHz[1];

  return (
    <div className="relative rounded-lg border border-zinc-800 bg-[#08090C] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={680}
        height={148}
        data-testid="acoustic-scope-canvas"
        className="w-full h-[148px] block"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-zinc-800/80 bg-zinc-950/90 text-xs text-zinc-400 font-mono tabular-nums">
        <div className="flex items-center gap-2">
          <span className="text-zinc-200 font-medium">
            F0 {persona.fundamentalFreqHz[0]}–{persona.fundamentalFreqHz[1]}Hz
          </span>
          <span aria-hidden="true">·</span>
          <span>F1 {f1Target}Hz</span>
          <span aria-hidden="true">·</span>
          <span>F2 {f2Target}Hz</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Tempo {tempoMultiplier.toFixed(2)}x</span>
          <span aria-hidden="true">·</span>
          <span>{accent.localeCode}</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-400">
            {isPlaying ? 'Signal Active' : 'Formant Lock Ready'}
          </span>
        </div>
      </div>
    </div>
  );
};
