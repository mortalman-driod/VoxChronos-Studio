import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTempo,
  getVoicesByGender,
  calculateTempoMetrics,
  compileSynthesisPayload,
  createWavFromPcm16,
  synthesizeFormantPreviewWav,
  generateIntegrationSnippets,
  normalizeDocumentText,
  chunkLongDocumentForStreaming,
  getPrefetchWindowIndices,
  SynthesisConfig,
} from './voiceEngine';

const sampleConfig: SynthesisConfig = {
  voiceId: 'clara-female-soprano',
  genderFilter: 'female',
  engineTier: 'studio-master',
  accentId: 'rp-british',
  tempoMultiplier: 1.25,
  pitchLockEnabled: true,
  emotion: {
    presetId: 'warm_empathetic',
    intensity: 80,
    warmth: 90,
    expressiveness: 75,
    crispness: 85,
  },
  scriptText:
    'Welcome to VoxChronos. <breath> Our low-latency voice engine clones regional accents and modulates tempo in real time.',
};

test('getVoicesByGender returns both male and female voice models accurately', () => {
  const femaleVoices = getVoicesByGender('female');
  const maleVoices = getVoicesByGender('male');
  const allVoices = getVoicesByGender('all');

  assert.equal(femaleVoices.length >= 2, true);
  assert.equal(maleVoices.length >= 3, true);
  assert.equal(
    femaleVoices.every((v) => v.gender === 'female'),
    true
  );
  assert.equal(
    maleVoices.every((v) => v.gender === 'male'),
    true
  );
  assert.equal(allVoices.length, femaleVoices.length + maleVoices.length);
});

test('clampTempo enforces 0.50x to 2.00x bounds and rounds to 2 decimals', () => {
  assert.equal(clampTempo(0.2), 0.5);
  assert.equal(clampTempo(2.8), 2.0);
  assert.equal(clampTempo(1.256), 1.26);
  assert.equal(clampTempo(Number.NaN), 1.0);
});

test('calculateTempoMetrics computes WPM, duration, and strips prosody tags from word count', () => {
  const metricsNormal = calculateTempoMetrics(
    'One two three four five <breath> |yeah| six',
    1.0
  );
  assert.equal(metricsNormal.wordCount, 6);
  assert.equal(metricsNormal.estimatedWpm, 150);

  const metricsFast = calculateTempoMetrics(
    'One two three four five <breath> |yeah| six',
    1.5
  );
  assert.equal(metricsFast.estimatedWpm, 225);
  assert.equal(metricsFast.clampedMultiplier, 1.5);
});

test('normalizeDocumentText repairs PDF line-breaks, strips inline verse numbers, and expands Scripture citations', () => {
  const rawInput =
    '[1:1] In the begin-\nning God created the heaven and the earth [14]. Page 4 of 12 See 1 Cor. 13:4-7 and John 3:16.';
  const normalized = normalizeDocumentText(rawInput, {
    repairPdfHyphens: true,
    stripVerseNumbers: true,
    expandBibleCitations: true,
    stripAcademicBrackets: true,
    insertBreathAtParagraphs: false,
  });

  assert.equal(normalized.includes('beginning'), true);
  assert.equal(normalized.includes('[1:1]'), false);
  assert.equal(normalized.includes('[14]'), false);
  assert.equal(normalized.includes('Page 4 of 12'), false);
  assert.equal(
    normalized.includes('First Corinthians chapter 13, verses 4 through 7'),
    true
  );
  assert.equal(normalized.includes('John chapter 3, verse 16'), true);
});

test('chunkLongDocumentForStreaming splits Bibles and PDFs into bounded low-latency segments and computes prefetch windows', () => {
  const biblePassage =
    '[1:1] In the beginning God created the heaven and the earth. [1:2] And the earth was without form, and void; and darkness was upon the face of the deep. [1:3] And the Spirit of God moved upon the face of the waters. [1:4] And God said, Let there be light: and there was light.';
  const chunks = chunkLongDocumentForStreaming(biblePassage, 1.0, undefined, 100);

  assert.equal(chunks.length >= 3, true);
  assert.equal(chunks.every((c) => c.normalizedText.length <= 100), true);
  assert.equal(chunks[0].normalizedText.includes('[1:1]'), false);
  assert.equal(chunks[0].normalizedText.includes('In the beginning'), true);

  const window0 = getPrefetchWindowIndices(0, chunks.length, 2);
  assert.deepEqual(window0, [0, 1, 2]);
});

test('compileSynthesisPayload embeds gender, accent directive, emotional modulation, and tempo', () => {
  const compiled = compileSynthesisPayload(sampleConfig);
  assert.equal(compiled.voiceCode, 'VC-CLARA-F1');
  assert.equal(compiled.gender, 'female');
  assert.equal(compiled.localeCode, 'en-GB');
  assert.equal(compiled.tempoMultiplier, 1.25);
  assert.equal(compiled.styleDirective.includes('Received Pronunciation'), true);
  assert.equal(compiled.styleDirective.includes('1.25x'), true);
  assert.equal(compiled.styleDirective.includes('warm'), true);
});

test('createWavFromPcm16 and synthesizeFormantPreviewWav generate valid RIFF WAVE headers', () => {
  const pcm = new Int16Array([0, 1200, -1200, 3200]);
  const wav = createWavFromPcm16(pcm, 24000);
  assert.equal(wav.byteLength, 44 + pcm.length * 2);
  const headerStr = String.fromCharCode(wav[0], wav[1], wav[2], wav[3]);
  const waveStr = String.fromCharCode(wav[8], wav[9], wav[10], wav[11]);
  assert.equal(headerStr, 'RIFF');
  assert.equal(waveStr, 'WAVE');

  const preview = synthesizeFormantPreviewWav(sampleConfig);
  assert.equal(preview.sampleRate, 24000);
  assert.equal(preview.wavBytes.byteLength > 30000, true);
});

test('generateIntegrationSnippets produces Mobile Drop-In Reader SDK, REST, Streaming WebAudio, cURL, and Python code', () => {
  const snippets = generateIntegrationSnippets(sampleConfig, [], 'https://voxchronos.dev');
  assert.equal(snippets.mobileDropInSdk.includes('VoxChronosMobileReader'), true);
  assert.equal(snippets.restTypescript.includes('/api/v1/voice/synthesize'), true);
  assert.equal(snippets.streamingWebAudio.includes('/api/v1/voice/stream'), true);
  assert.equal(snippets.curlCommand.includes('clara-female-soprano'), true);
  assert.equal(snippets.pythonSdk.includes('cloned_voice_output.wav'), true);
});
