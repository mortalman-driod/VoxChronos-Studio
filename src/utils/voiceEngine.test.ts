import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'zlib';
import {
  clampTempo,
  getVoicesByGender,
  calculateTempoMetrics,
  compileSynthesisPayload,
  sanitizePublicCompiledPayload,
  createWavFromPcm16,
  ensureValidWavBytes,
  stitchMultipleWavBuffers,
  generateIntegrationSnippets,
  normalizeDocumentText,
  chunkLongDocumentForStreaming,
  getPrefetchWindowIndices,
  SynthesisConfig,
} from './voiceEngine';
import { extractTextFromPdfBuffer } from './pdfParser';

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

test('normalizeDocumentText repairs PDF line-breaks, strips bare & bracketed verse numbers, normalizes LORD, and expands all 66 Bible books', () => {
  const rawInput = `[71:1] In the begin-\nning the LORD created the heaven and the earth [14].
Page 4 of 12
2 He maketh me to lie down in green pastures. Selah.
See I Cor. 13:4–7, Ps. 71:1–8, 2 Chr. 7:14, and Jn. 3:16.`;

  const normalized = normalizeDocumentText(rawInput, {
    repairPdfHyphens: true,
    stripVerseNumbers: true,
    expandBibleCitations: true,
    stripAcademicBrackets: true,
    insertBreathAtParagraphs: true,
  });

  assert.equal(normalized.includes('beginning'), true);
  assert.equal(normalized.includes('the Lord created'), true);
  assert.equal(normalized.includes('LORD'), false);
  assert.equal(normalized.includes('[71:1]'), false);
  assert.equal(normalized.includes('[14]'), false);
  assert.equal(normalized.includes('Page 4 of 12'), false);
  assert.equal(normalized.includes('2 He maketh'), false);
  assert.equal(normalized.includes('He maketh me to lie down'), true);
  assert.equal(normalized.includes('Selah. <breath>'), true);
  assert.equal(
    normalized.includes('First Corinthians chapter 13, verses 4 through 7'),
    true
  );
  assert.equal(
    normalized.includes('Psalm chapter 71, verses 1 through 8'),
    true
  );
  assert.equal(
    normalized.includes('Second Chronicles chapter 7, verse 14'),
    true
  );
  assert.equal(normalized.includes('John chapter 3, verse 16'), true);
});

test('chunkLongDocumentForStreaming splits Bibles and PDFs into bounded low-latency segments and computes 3-chunk prefetch windows', () => {
  const biblePassage =
    '[1:1] In the beginning God created the heaven and the earth. [1:2] And the earth was without form, and void; and darkness was upon the face of the deep. [1:3] And the Spirit of God moved upon the face of the waters. [1:4] And God said, Let there be light: and there was light.';
  const chunks = chunkLongDocumentForStreaming(biblePassage, 1.0, undefined, 100);

  assert.equal(chunks.length >= 3, true);
  assert.equal(chunks.every((c) => c.normalizedText.length <= 100), true);
  assert.equal(chunks[0].normalizedText.includes('[1:1]'), false);
  assert.equal(chunks[0].normalizedText.includes('In the beginning'), true);

  const windowClamped = getPrefetchWindowIndices(0, chunks.length, 3);
  assert.deepEqual(windowClamped, [0, 1, 2]);
  const windowFull = getPrefetchWindowIndices(0, 6, 3);
  assert.deepEqual(windowFull, [0, 1, 2, 3]);
});

test('compileSynthesisPayload and sanitizePublicCompiledPayload strip internalVoiceCode while preserving public prosody fields', () => {
  const compiled = compileSynthesisPayload(sampleConfig);
  assert.equal(compiled.voiceCode, 'VC-CLARA-F1');
  assert.equal(compiled.gender, 'female');
  assert.equal(compiled.localeCode, 'en-GB');
  assert.equal(compiled.tempoMultiplier, 1.25);
  assert.equal(compiled.styleDirective.includes('Received Pronunciation'), true);

  const publicCompiled = sanitizePublicCompiledPayload(compiled);
  assert.equal('internalVoiceCode' in publicCompiled, false);
  assert.equal(publicCompiled.voiceCode, 'VC-CLARA-F1');
});

test('createWavFromPcm16, ensureValidWavBytes, and stitchMultipleWavBuffers guarantee valid RIFF WAVE headers and seamless multi-chunk concatenation', () => {
  const pcm1 = new Int16Array(2400).fill(1200); // 100ms
  const pcm2 = new Int16Array(2400).fill(-1200); // 100ms
  const wav1 = createWavFromPcm16(pcm1, 24000);
  const wav2 = createWavFromPcm16(pcm2, 24000);

  assert.equal(wav1.byteLength, 44 + pcm1.length * 2);
  assert.equal(String.fromCharCode(wav1[0], wav1[1], wav1[2], wav1[3]), 'RIFF');
  assert.equal(String.fromCharCode(wav1[8], wav1[9], wav1[10], wav1[11]), 'WAVE');

  // Stitch two 100ms WAVs with a 100ms (2400 samples) breath pause -> 7200 samples total
  const stitched = stitchMultipleWavBuffers([wav1, wav2], 100, 24000);
  const expectedTotalSamples = 2400 + 2400 + 2400;
  assert.equal(stitched.byteLength, 44 + expectedTotalSamples * 2);
  assert.equal(
    String.fromCharCode(stitched[0], stitched[1], stitched[2], stitched[3]),
    'RIFF'
  );

  // Raw PCM without RIFF header gets wrapped in 44-byte RIFF WAVE header
  const rawPcmBytes = new Uint8Array([0x00, 0x05, 0x10, 0xff, 0x20, 0x01, 0x00, 0x00]);
  const wrapped = ensureValidWavBytes(rawPcmBytes, 24000);
  assert.equal(wrapped.byteLength, 44 + rawPcmBytes.byteLength);
});

test('extractTextFromPdfBuffer decompresses FlateDecode PDF streams and parses BT/ET Tj and TJ blocks', () => {
  const contentStream = `BT /F1 12 Tf 72 712 Td (I will praise thee, O Lord.) Tj 0 -18 Td [(Praise )-20(should )-15(always )-10(follow prayer.)] TJ ET`;
  const compressed = zlib.deflateSync(Buffer.from(contentStream, 'latin1'));
  const pdfBinary = Buffer.concat([
    Buffer.from('%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n', 'latin1'),
    compressed,
    Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1'),
  ]);

  const extracted = extractTextFromPdfBuffer(pdfBinary);
  assert.equal(extracted.includes('I will praise thee, O Lord.'), true);
  assert.equal(extracted.includes('Praise should always follow prayer.'), true);
});

test('generateIntegrationSnippets produces hardened Mobile Drop-In Reader SDK with Dual-Audio Ping-Pong, Sliding-Window Blob URLs, WakeLock, and AbortController', () => {
  const snippets = generateIntegrationSnippets(sampleConfig, [], 'https://voxchronos.dev');
  assert.equal(snippets.mobileDropInSdk.includes('VoxChronosMobileReader'), true);
  assert.equal(snippets.mobileDropInSdk.includes('ensureWavBlob'), true);
  assert.equal(snippets.mobileDropInSdk.includes('ensureWavDataUrl'), true);
  assert.equal(snippets.mobileDropInSdk.includes('acquireWakeLock'), true);
  assert.equal(snippets.mobileDropInSdk.includes('pruneSlidingBlobWindow'), true);
  assert.equal(snippets.mobileDropInSdk.includes('AbortController'), true);
});
