export type VoiceGender = 'female' | 'male';

export type AcousticVoiceCode = 'Kore' | 'Zephyr' | 'Fenrir' | 'Charon' | 'Puck';

export type EngineQualityMode = 'studio-master' | 'low-latency-stream';

export interface VoicePersona {
  id: string;
  name: string;
  studioCode: string;
  internalVoiceCode: AcousticVoiceCode;
  gender: VoiceGender;
  registerLabel: string;
  fundamentalFreqHz: [number, number];
  formantSignature: string;
  timbreSummary: string;
  recommendedRole: string;
  baseWarmth: number;
  baseCrispness: number;
}

export interface AccentProfile {
  id: string;
  name: string;
  region: string;
  localeCode: string;
  phoneticSignature: string;
  vowelShiftRule: string;
  prosodyContour: string;
  directivePrompt: string;
  formantOffsetHz: [number, number];
  rhythmicSyllableTiming: 'stress-timed' | 'syllable-timed' | 'mora-timed';
  isCustomClone?: boolean;
  confidenceScore?: number;
}

export type EmotionPresetId =
  | 'neutral_broadcast'
  | 'warm_empathetic'
  | 'urgent_command'
  | 'enthusiastic_keynote'
  | 'reflective_intimate'
  | 'conversational_natural'
  | 'sacred_liturgical';

export interface EmotionalModulation {
  presetId: EmotionPresetId;
  intensity: number; // 0 to 100
  warmth: number; // 0 to 100
  expressiveness: number; // 0 to 100 (pitch variance)
  crispness: number; // 0 to 100 (consonant articulation)
}

export interface SynthesisConfig {
  voiceId: string;
  genderFilter: VoiceGender | 'all';
  engineTier: EngineQualityMode;
  accentId: string;
  tempoMultiplier: number; // 0.50 to 2.00
  pitchLockEnabled: boolean;
  emotion: EmotionalModulation;
  scriptText: string;
}

export interface TempoMetrics {
  clampedMultiplier: number;
  estimatedWpm: number;
  syllablesPerSecond: number;
  wordCount: number;
  estimatedDurationSec: number;
  pacingLabel: string;
}

export interface CompiledSynthesisPayload {
  engineMode: EngineQualityMode;
  voiceCode: string;
  internalVoiceCode: AcousticVoiceCode;
  gender: VoiceGender;
  styleDirective: string;
  decoratedText: string;
  tempoMultiplier: number;
  pitchLockEnabled: boolean;
  accentName: string;
  localeCode: string;
  emotionSummary: string;
}

export interface SynthesisTake {
  id: string;
  createdAt: string;
  voicePersona: VoicePersona;
  accentProfile: AccentProfile;
  tempoMultiplier: number;
  emotion: EmotionalModulation;
  engineTier: EngineQualityMode;
  scriptText: string;
  styleDirective: string;
  audioDataUrl: string;
  durationSec: number;
  latencyMs: number;
  sampleRateHz: number;
  sourceMode: 'master-bus' | 'studio-dsp';
}

export interface DocumentNormalizerOptions {
  repairPdfHyphens: boolean;
  stripVerseNumbers: boolean;
  expandBibleCitations: boolean;
  stripAcademicBrackets: boolean;
  insertBreathAtParagraphs: boolean;
}

export interface StreamDocumentChunk {
  index: number;
  id: string;
  rawText: string;
  normalizedText: string;
  wordCount: number;
  estimatedDurationSec: number;
  verseOrSectionLabel?: string;
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'clara-female-soprano',
    name: 'Clara — Studio Mezzo-Soprano',
    studioCode: 'VC-CLARA-F1',
    internalVoiceCode: 'Kore',
    gender: 'female',
    registerLabel: 'Mezzo-Soprano',
    fundamentalFreqHz: [195, 245],
    formantSignature: 'F1 520Hz · F2 1850Hz',
    timbreSummary: 'Articulate, crystalline upper-mid presence with natural breath control',
    recommendedRole: 'Commercial Broadcast, Global Localization & Editorial Narration',
    baseWarmth: 72,
    baseCrispness: 88,
  },
  {
    id: 'elena-female-contralto',
    name: 'Elena — Warm Contralto',
    studioCode: 'VC-ELENA-F2',
    internalVoiceCode: 'Zephyr',
    gender: 'female',
    registerLabel: 'Contralto',
    fundamentalFreqHz: [165, 210],
    formantSignature: 'F1 480Hz · F2 1690Hz',
    timbreSummary: 'Rich chest resonance, velvet lower harmonics, intimate micro-inflections',
    recommendedRole: 'Audiobooks, Scripture Narration, Healthcare & Long-Form PDFs',
    baseWarmth: 88,
    baseCrispness: 76,
  },
  {
    id: 'marcus-male-baritone',
    name: 'Marcus — Resonant Baritone',
    studioCode: 'VC-MARCUS-M1',
    internalVoiceCode: 'Fenrir',
    gender: 'male',
    registerLabel: 'Lyric Baritone',
    fundamentalFreqHz: [98, 138],
    formantSignature: 'F1 410Hz · F2 1320Hz',
    timbreSummary: 'Deep chest authority, controlled transient attack, zero sibilance harshness',
    recommendedRole: 'Bible & Liturgical Reading, Keynote Briefings & Long-Form Essays',
    baseWarmth: 78,
    baseCrispness: 85,
  },
  {
    id: 'julian-male-bass',
    name: 'Julian — Studio Bass-Baritone',
    studioCode: 'VC-JULIAN-M2',
    internalVoiceCode: 'Charon',
    gender: 'male',
    registerLabel: 'Bass-Baritone',
    fundamentalFreqHz: [85, 122],
    formantSignature: 'F1 380Hz · F2 1210Hz',
    timbreSummary: 'Grounded low-end fundamental with measured, unhurried cadence',
    recommendedRole: 'Biblical Chapters, Technical PDFs, Legal Briefs & Documentary',
    baseWarmth: 84,
    baseCrispness: 80,
  },
  {
    id: 'liam-male-tenor',
    name: 'Liam — Agile Tenor',
    studioCode: 'VC-LIAM-M3',
    internalVoiceCode: 'Puck',
    gender: 'male',
    registerLabel: 'Light Tenor',
    fundamentalFreqHz: [125, 168],
    formantSignature: 'F1 450Hz · F2 1490Hz',
    timbreSummary: 'Quick transient articulation, bright conversational energy, expressive pitch arc',
    recommendedRole: 'Interactive Mobile Apps, Article Briefings & Live Broadcast',
    baseWarmth: 68,
    baseCrispness: 92,
  },
];

export const BUILTIN_ACCENT_PROFILES: AccentProfile[] = [
  {
    id: 'rp-british',
    name: 'Received Pronunciation (UK)',
    region: 'London & Southern England',
    localeCode: 'en-GB',
    phoneticSignature: 'Non-rhotic /r/ · Elongated /ɑː/ · Crisp alveolar /t/',
    vowelShiftRule: 'TRAP-BATH split (/ɑː/), rounded LOT vowel (/ɒ/), glottal-free intervocalic plosives',
    prosodyContour: 'High-falling nuclear pitch accent with measured descending stepping head',
    directivePrompt:
      'Speak with an authentic British Received Pronunciation (London RP) accent: non-rhotic post-vocalic R, elongated broad A in bath/chance, crisp un-flapped alveolar T consonants, and poised descending intonation.',
    formantOffsetHz: [-25, 65],
    rhythmicSyllableTiming: 'stress-timed',
  },
  {
    id: 'general-american',
    name: 'General American (Broadcast)',
    region: 'North America Midwest / West Coast',
    localeCode: 'en-US',
    phoneticSignature: 'Full rhotic /ɹ/ · Intervocalic alveolar flap [ɾ] · Merged LOT-PALM',
    vowelShiftRule: 'Rhotic retroflexion on all post-vocalic R, intervocalic T/D flapping, raised TRAP before nasals',
    prosodyContour: 'Balanced mid-level declarative pitch contour with clear stress-timed content words',
    directivePrompt:
      'Speak with a natural General American broadcast accent: full rhotic R coloration, smooth intervocalic T flapping, open unrounded LOT vowel, and balanced stress-timed cadence.',
    formantOffsetHz: [0, 0],
    rhythmicSyllableTiming: 'stress-timed',
  },
  {
    id: 'dublin-irish',
    name: 'Hiberno-English (Dublin)',
    region: 'Dublin, Ireland',
    localeCode: 'en-IE',
    phoneticSignature: 'Soft dental fricatives [t̪/d̪] · Musical rising-falling lilt · Clear /l/ in all positions',
    vowelShiftRule: 'Monophthongized FACE (/eː/) and GOAT (/oː/), fronted STRUT vowel, palatalized velars',
    prosodyContour: 'Melodic low-rising nuclear tones on declaratives with warm rhythmic elasticity',
    directivePrompt:
      'Speak with an authentic Dublin Irish (Hiberno-English) accent: melodic rising-falling cadence, light clear L in all syllable positions, monophthongal FACE and GOAT vowels, and warm dentalized TH articulation.',
    formantOffsetHz: [15, 95],
    rhythmicSyllableTiming: 'stress-timed',
  },
  {
    id: 'sydney-australian',
    name: 'Cultivated Australian (Sydney)',
    region: 'New South Wales, Australia',
    localeCode: 'en-AU',
    phoneticSignature: 'Non-rhotic · Diphthongized FLEECE & GOOSE · Fronted START vowel [aː]',
    vowelShiftRule: 'Raised DRESS and TRAP vowels, centralized KIT vowel, wide diphthong glide on FACE (/æɪ/)',
    prosodyContour: 'Fluid phrase-final intonation with crisp mid-register vowel projection',
    directivePrompt:
      'Speak with a natural Cultivated Sydney Australian accent: non-rhotic R, bright fronted broad A in start/dance, raised front vowels in dress/trap, and characteristic Australian diphthong glides.',
    formantOffsetHz: [35, 110],
    rhythmicSyllableTiming: 'stress-timed',
  },
  {
    id: 'lagos-nigerian',
    name: 'Nigerian Educated English (Lagos)',
    region: 'Lagos, Nigeria',
    localeCode: 'en-NG',
    phoneticSignature: 'Syllable-timed cadence · Full vowel quality in unstressed syllables · Resonant plosives',
    vowelShiftRule: 'Minimal schwa reduction in unstressed syllables, distinct monophthongal tense vowels, resonant chest projection',
    prosodyContour: 'Tonal syllable-timed rhythm with deliberate weight on every syllable and warm projection',
    directivePrompt:
      'Speak with an articulate Lagos Nigerian English accent: syllable-timed rhythm with full unreduced vowels in unstressed syllables, resonant chest projection, and dignified melodic cadence.',
    formantOffsetHz: [-40, -50],
    rhythmicSyllableTiming: 'syllable-timed',
  },
  {
    id: 'parisian-french-en',
    name: 'Parisian French-Inflected English',
    region: 'Île-de-France, France',
    localeCode: 'fr-FR',
    phoneticSignature: 'Uvular /ʁ/ trace · Phrase-final oxytonic stress · Rounded front vowels',
    vowelShiftRule: 'Tense pure vowels without off-glides, softened H-onset, phrase-final syllable lengthening',
    prosodyContour: 'Syllable-timed flow culminating in gentle phrase-final pitch rise and oxytonic emphasis',
    directivePrompt:
      'Speak English with a refined Parisian French accent: subtle uvular R inflection, pure tense vowels without diphthong off-glides, gentle H-dropping, and syllable-timed phrase-final stress.',
    formantOffsetHz: [20, -35],
    rhythmicSyllableTiming: 'syllable-timed',
  },
  {
    id: 'mumbai-indian-en',
    name: 'Cosmopolitan Indian English (Mumbai)',
    region: 'Maharashtra, India',
    localeCode: 'en-IN',
    phoneticSignature: 'Light retroflex apical /ʈ ɖ/ · Labiodental approximant [ʋ] · Syllable-timed flow',
    vowelShiftRule: 'Monophthongal /eː/ and /oː/ in FACE and GOAT, unaspirated voiceless plosives, clear syllable boundaries',
    prosodyContour: 'Crisp syllable-timed delivery with expressive pitch modulation on auxiliary and focus words',
    directivePrompt:
      'Speak with a polished Mumbai Cosmopolitan Indian English accent: gentle retroflex T and D consonants, monophthongal O and E vowels, smooth labiodental V/W approximants, and fluid syllable-timed pacing.',
    formantOffsetHz: [10, 45],
    rhythmicSyllableTiming: 'syllable-timed',
  },
  {
    id: 'tokyo-japanese-en',
    name: 'Tokyo Mora-Timed English',
    region: 'Kanto, Japan',
    localeCode: 'ja-JP',
    phoneticSignature: 'Mora-timed isochrony · Unaspirated stops · Crisp palatalization before /i/',
    vowelShiftRule: 'Unrounded high back vowel [ɯ] in GOOSE, clean 5-vowel formant targets, zero consonant cluster slurring',
    prosodyContour: 'Pitch-accented mora timing with calm, precise articulation and restrained dynamic variance',
    directivePrompt:
      'Speak English with a subtle, articulate Tokyo Japanese accent: mora-timed syllable cadence, unrounded high back U vowels, crisp unaspirated stops, and calm pitch-accented intonation.',
    formantOffsetHz: [30, 80],
    rhythmicSyllableTiming: 'mora-timed',
  },
];

export const EMOTION_PRESETS: Record<
  EmotionPresetId,
  {
    label: string;
    description: string;
    defaultValues: Omit<EmotionalModulation, 'presetId'>;
    styleKeywords: string;
  }
> = {
  neutral_broadcast: {
    label: 'Neutral Studio Broadcast',
    description: 'Balanced dynamic range, transparent prosody, and authoritative studio clarity.',
    defaultValues: { intensity: 45, warmth: 65, expressiveness: 40, crispness: 85 },
    styleKeywords: 'balanced, composed, studio-grade broadcast neutrality',
  },
  warm_empathetic: {
    label: 'Warm & Empathetic',
    description: 'Softened transients, enriched chest harmonics, and reassuring micro-pauses.',
    defaultValues: { intensity: 60, warmth: 92, expressiveness: 68, crispness: 72 },
    styleKeywords: 'deeply warm, empathetic, reassuring, gentle micro-inflections',
  },
  sacred_liturgical: {
    label: 'Reverent Scripture & Liturgical',
    description: 'Poised, unhurried cadence with deep chest resonance for Bibles, poetry, and solemn prose.',
    defaultValues: { intensity: 58, warmth: 90, expressiveness: 64, crispness: 86 },
    styleKeywords: 'reverent, poised, resonant liturgical narrator with deliberate clause pacing and dignified gravitas',
  },
  urgent_command: {
    label: 'Urgent & Decisive',
    description: 'Elevated subglottal pressure, rapid transient attack, and focused pitch contour.',
    defaultValues: { intensity: 88, warmth: 45, expressiveness: 75, crispness: 95 },
    styleKeywords: 'urgent, decisive, high-focus alert cadence with crisp consonant attack',
  },
  enthusiastic_keynote: {
    label: 'Enthusiastic Keynote',
    description: 'Wide pitch excursion, bright upper-formant projection, and engaging forward momentum.',
    defaultValues: { intensity: 82, warmth: 78, expressiveness: 90, crispness: 88 },
    styleKeywords: 'enthusiastic, bright, inspiring keynote speaker with dynamic pitch range',
  },
  reflective_intimate: {
    label: 'Reflective & Intimate',
    description: 'Close-mic proximity effect, subtle breathiness, and unhurried contemplative phrasing.',
    defaultValues: { intensity: 35, warmth: 88, expressiveness: 52, crispness: 65 },
    styleKeywords: 'intimate, close-mic reflective tone with natural breath texture and unhurried phrasing',
  },
  conversational_natural: {
    label: 'Natural Conversational',
    description: 'Spontaneous prosodic rhythm with natural backchanneling and lively micro-dynamics.',
    defaultValues: { intensity: 65, warmth: 76, expressiveness: 78, crispness: 80 },
    styleKeywords: 'spontaneous, natural conversational flow with authentic human micro-hesitations',
  },
};

export function clampTempo(tempo: number): number {
  if (Number.isNaN(tempo) || !Number.isFinite(tempo)) return 1.0;
  return Math.round(Math.min(2.0, Math.max(0.5, tempo)) * 100) / 100;
}

export function getVoicesByGender(gender: VoiceGender | 'all'): VoicePersona[] {
  if (gender === 'all') return VOICE_PERSONAS;
  return VOICE_PERSONAS.filter((v) => v.gender === gender);
}

export function calculateTempoMetrics(scriptText: string, tempoMultiplier: number): TempoMetrics {
  const clampedMultiplier = clampTempo(tempoMultiplier);
  const cleanText = scriptText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\|[^|]+\|/g, ' ')
    .trim();
  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const baseWpm = 150;
  const estimatedWpm = Math.round(baseWpm * clampedMultiplier);
  const syllablesPerSecond = Math.round((estimatedWpm / 60) * 1.45 * 10) / 10;

  const estimatedDurationSec =
    wordCount === 0
      ? 0
      : Math.max(0.8, Math.round(((wordCount / estimatedWpm) * 60) * 10) / 10);

  let pacingLabel = 'Natural Studio Cadence';
  if (clampedMultiplier < 0.75) pacingLabel = 'Deliberate Slow Articulation';
  else if (clampedMultiplier < 0.95) pacingLabel = 'Measured Documentary Pace';
  else if (clampedMultiplier <= 1.08) pacingLabel = 'Natural Studio Cadence';
  else if (clampedMultiplier <= 1.35) pacingLabel = 'Brisk Conversational Clip';
  else if (clampedMultiplier <= 1.65) pacingLabel = 'High-Velocity Broadcast';
  else pacingLabel = 'Ultra-Rapid Time-Compressed';

  return {
    clampedMultiplier,
    estimatedWpm,
    syllablesPerSecond,
    wordCount,
    estimatedDurationSec,
    pacingLabel,
  };
}

const BIBLE_BOOK_EXPANSIONS: Record<string, string> = {
  'Gen\\.?': 'Genesis',
  'Exod?\\.?': 'Exodus',
  'Lev\\.?': 'Leviticus',
  'Num\\.?': 'Numbers',
  'Deut\\.?': 'Deuteronomy',
  'Josh\\.?': 'Joshua',
  'Ps\\.?': 'Psalm',
  'Psa\\.?': 'Psalm',
  'Prov\\.?': 'Proverbs',
  'Eccl\\.?': 'Ecclesiastes',
  'Isa\\.?': 'Isaiah',
  'Jer\\.?': 'Jeremiah',
  'Matt?\\.?': 'Matthew',
  'Rom\\.?': 'Romans',
  '1\\s*Cor\\.?': 'First Corinthians',
  '2\\s*Cor\\.?': 'Second Corinthians',
  'Gal\\.?': 'Galatians',
  'Eph\\.?': 'Ephesians',
  'Phil\\.?': 'Philippians',
  'Col\\.?': 'Colossians',
  '1\\s*Thess\\.?': 'First Thessalonians',
  '2\\s*Thess\\.?': 'Second Thessalonians',
  '1\\s*Tim\\.?': 'First Timothy',
  '2\\s*Tim\\.?': 'Second Timothy',
  'Heb\\.?': 'Hebrews',
  'Jas\\.?': 'James',
  '1\\s*Pet\\.?': 'First Peter',
  '2\\s*Pet\\.?': 'Second Peter',
  '1\\s*John': 'First John',
  '2\\s*John': 'Second John',
  '3\\s*John': 'Third John',
  'Rev\\.?': 'Revelation',
};

export function normalizeDocumentText(
  rawText: string,
  options: DocumentNormalizerOptions = {
    repairPdfHyphens: true,
    stripVerseNumbers: true,
    expandBibleCitations: true,
    stripAcademicBrackets: true,
    insertBreathAtParagraphs: false,
  }
): string {
  let text = rawText || '';

  text = text
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl');

  if (options.repairPdfHyphens) {
    text = text.replace(/([a-zA-Z])-\s*\r?\n\s*([a-z])/g, '$1$2');
    text = text.replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, '');
  }

  if (options.expandBibleCitations) {
    for (const [pattern, fullBook] of Object.entries(BIBLE_BOOK_EXPANSIONS)) {
      const regex = new RegExp(
        `\\b${pattern}\\s+(\\d+):(\\d+)(?:-(\\d+))?\\b`,
        'g'
      );
      text = text.replace(regex, (_match, ch, v1, v2) => {
        if (v2) {
          return `${fullBook} chapter ${ch}, verses ${v1} through ${v2}`;
        }
        return `${fullBook} chapter ${ch}, verse ${v1}`;
      });
    }
    text = text.replace(
      /\b(Genesis|Exodus|Psalms?|Proverbs|Isaiah|Matthew|Mark|Luke|John|Acts|Romans|Revelation)\s+(\d+):(\d+)\b/g,
      '$1 chapter $2, verse $3'
    );
  }

  if (options.stripVerseNumbers) {
    text = text.replace(/\[\d+:\d+\]/g, ' ');
    text = text.replace(/(?:^|\s)\d+:\d+(?=\s+[A-Z])/g, ' ');
  }

  if (options.stripAcademicBrackets) {
    text = text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '');
  }

  if (options.insertBreathAtParagraphs) {
    text = text.replace(/\r?\n\s*\r?\n+/g, ' <breath> ');
  } else {
    text = text.replace(/\r?\n\s*\r?\n+/g, '\n\n');
  }

  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .trim();

  return text;
}

export function chunkLongDocumentForStreaming(
  rawText: string,
  tempoMultiplier = 1.0,
  normalizerOptions?: DocumentNormalizerOptions,
  maxCharsPerChunk = 220
): StreamDocumentChunk[] {
  const normalizedFull = normalizeDocumentText(rawText, normalizerOptions);
  if (!normalizedFull) return [];

  const rawSentences = normalizedFull
    .split(/(?<=[.!?;:])\s+|\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: StreamDocumentChunk[] = [];
  let currentBuffer = '';

  const flushBuffer = (textToFlush: string) => {
    const clean = textToFlush.trim();
    if (!clean) return;
    const metrics = calculateTempoMetrics(clean, tempoMultiplier);
    const idx = chunks.length;
    chunks.push({
      index: idx,
      id: `chunk-${idx}`,
      rawText: clean,
      normalizedText: clean,
      wordCount: metrics.wordCount,
      estimatedDurationSec: metrics.estimatedDurationSec,
      verseOrSectionLabel: `Passage ${String(idx + 1).padStart(2, '0')}`,
    });
  };

  const appendOrSplitSentence = (sentence: string) => {
    if (!currentBuffer && sentence.length <= maxCharsPerChunk) {
      currentBuffer = sentence;
      return;
    }
    if (
      currentBuffer &&
      (currentBuffer + ' ' + sentence).length <= maxCharsPerChunk
    ) {
      currentBuffer = `${currentBuffer} ${sentence}`;
      return;
    }
    if (currentBuffer) {
      flushBuffer(currentBuffer);
      currentBuffer = '';
    }
    if (sentence.length <= maxCharsPerChunk) {
      currentBuffer = sentence;
    } else {
      const clauses = sentence.split(/(?<=,)\s+/g);
      for (const clause of clauses) {
        if (!currentBuffer) {
          currentBuffer = clause;
        } else if ((currentBuffer + ' ' + clause).length <= maxCharsPerChunk) {
          currentBuffer = `${currentBuffer} ${clause}`;
        } else {
          flushBuffer(currentBuffer);
          currentBuffer = clause;
        }
      }
    }
  };

  for (const sentence of rawSentences) {
    appendOrSplitSentence(sentence);
  }

  if (currentBuffer) {
    flushBuffer(currentBuffer);
  }

  return chunks;
}

export function getPrefetchWindowIndices(
  activeChunkIndex: number,
  totalChunks: number,
  lookaheadCount = 2
): number[] {
  const indices: number[] = [];
  if (totalChunks <= 0 || activeChunkIndex < 0) return indices;
  for (let offset = 0; offset <= lookaheadCount; offset++) {
    const target = activeChunkIndex + offset;
    if (target < totalChunks) {
      indices.push(target);
    }
  }
  return indices;
}

export function compileSynthesisPayload(
  config: SynthesisConfig,
  customAccents: AccentProfile[] = []
): CompiledSynthesisPayload {
  const persona =
    VOICE_PERSONAS.find((v) => v.id === config.voiceId) || VOICE_PERSONAS[0];
  const allAccents = [...BUILTIN_ACCENT_PROFILES, ...customAccents];
  const accent =
    allAccents.find((a) => a.id === config.accentId) || BUILTIN_ACCENT_PROFILES[0];
  const preset = EMOTION_PRESETS[config.emotion.presetId] || EMOTION_PRESETS.neutral_broadcast;
  const tempo = calculateTempoMetrics(config.scriptText, config.tempoMultiplier);

  const warmthDescriptor =
    config.emotion.warmth >= 75
      ? 'rich warm chest resonance'
      : config.emotion.warmth <= 35
      ? 'cool analytical tone'
      : 'balanced vocal warmth';

  const intensityDescriptor =
    config.emotion.intensity >= 75
      ? 'high emotional intensity and projected energy'
      : config.emotion.intensity <= 35
      ? 'understated, subdued dynamic intensity'
      : 'moderate controlled emotional intensity';

  const expressivenessDescriptor =
    config.emotion.expressiveness >= 75
      ? 'wide melodic pitch inflection'
      : config.emotion.expressiveness <= 35
      ? 'steady, level pitch contour'
      : 'natural prosodic pitch variation';

  const crispnessDescriptor =
    config.emotion.crispness >= 80
      ? 'ultra-crisp consonant articulation'
      : 'smooth legato consonant transitions';

  const tempoDirective =
    tempo.clampedMultiplier === 1.0
      ? `Speak at a natural 150 WPM studio cadence (1.00x tempo).`
      : `Adjust speaking tempo to ${tempo.clampedMultiplier.toFixed(2)}x (${tempo.estimatedWpm} WPM, ${tempo.pacingLabel.toLowerCase()}) while preserving natural vocal formant pitch.`;

  const styleDirective = [
    `${persona.gender === 'female' ? 'Female' : 'Male'} ${persona.registerLabel} voice.`,
    accent.directivePrompt,
    `Emotional Modulation: ${preset.styleKeywords}; ${intensityDescriptor}, ${warmthDescriptor}, ${expressivenessDescriptor}, and ${crispnessDescriptor}.`,
    tempoDirective,
  ].join(' ');

  const emotionSummary = `${preset.label} · Intensity ${config.emotion.intensity}% · Warmth ${config.emotion.warmth}%`;

  return {
    engineMode: config.engineTier,
    voiceCode: persona.studioCode,
    internalVoiceCode: persona.internalVoiceCode,
    gender: persona.gender,
    styleDirective,
    decoratedText: config.scriptText.trim(),
    tempoMultiplier: tempo.clampedMultiplier,
    pitchLockEnabled: config.pitchLockEnabled,
    accentName: accent.name,
    localeCode: accent.localeCode,
    emotionSummary,
  };
}

export function createWavFromPcm16(pcmSamples: Int16Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmSamples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcmSamples.length; i++, offset += 2) {
    view.setInt16(offset, pcmSamples[i], true);
  }

  return new Uint8Array(buffer);
}

export function synthesizeFormantPreviewWav(
  config: SynthesisConfig,
  customAccents: AccentProfile[] = []
): { wavBytes: Uint8Array; durationSec: number; sampleRate: number } {
  const sampleRate = 24000;
  const persona =
    VOICE_PERSONAS.find((v) => v.id === config.voiceId) || VOICE_PERSONAS[0];
  const allAccents = [...BUILTIN_ACCENT_PROFILES, ...customAccents];
  const accent =
    allAccents.find((a) => a.id === config.accentId) || BUILTIN_ACCENT_PROFILES[0];
  const tempo = calculateTempoMetrics(config.scriptText, config.tempoMultiplier);

  const rawDuration = Math.min(4.5, Math.max(1.4, tempo.estimatedDurationSec || 2.2));
  const totalSamples = Math.floor(rawDuration * sampleRate);
  const pcm = new Int16Array(totalSamples);

  const baseF0 = (persona.fundamentalFreqHz[0] + persona.fundamentalFreqHz[1]) / 2;
  const expressivenessFactor = (config.emotion.expressiveness / 100) * 0.18 + 0.04;
  const warmthFactor = config.emotion.warmth / 100;
  const intensityGain = 0.45 + (config.emotion.intensity / 100) * 0.4;
  const syllableRateHz = Math.max(2.2, Math.min(7.5, 3.8 * tempo.clampedMultiplier));

  const f1Base = (persona.gender === 'female' ? 510 : 410) + accent.formantOffsetHz[0];
  const f2Base = (persona.gender === 'female' ? 1780 : 1340) + accent.formantOffsetHz[1];

  let phase0 = 0;
  let phaseF1 = 0;
  let phaseF2 = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;

    const syllablePhase = t * syllableRateHz * 2 * Math.PI;
    const syllableEnv = Math.pow(0.5 + 0.5 * Math.sin(syllablePhase), 1.4);

    const edgeEnv =
      t < 0.05
        ? t / 0.05
        : totalSamples - i < sampleRate * 0.06
        ? (totalSamples - i) / (sampleRate * 0.06)
        : 1.0;

    const phraseContour = 1.0 - 0.12 * progress + 0.08 * Math.sin(t * 2.5);
    const vibrato = 1.0 + expressivenessFactor * 0.12 * Math.sin(2 * Math.PI * 5.2 * t);
    const instF0 = baseF0 * phraseContour * vibrato;

    const f1Inst = f1Base + 90 * Math.sin(syllablePhase * 0.5);
    const f2Inst = f2Base + 180 * Math.cos(syllablePhase * 0.5);

    phase0 += (2 * Math.PI * instF0) / sampleRate;
    phaseF1 += (2 * Math.PI * f1Inst) / sampleRate;
    phaseF2 += (2 * Math.PI * f2Inst) / sampleRate;

    const fundamental = Math.sin(phase0) + 0.55 * warmthFactor * Math.sin(2 * phase0);
    const formant1 = 0.45 * Math.sin(phaseF1) * (0.6 + 0.4 * Math.cos(phase0));
    const formant2 =
      0.22 * (1.1 - warmthFactor * 0.4) * Math.sin(phaseF2) * (0.5 + 0.5 * Math.sin(phase0));

    const signal = (fundamental * 0.55 + formant1 + formant2) * syllableEnv * edgeEnv * intensityGain;
    const clamped = Math.max(-0.95, Math.min(0.95, signal));
    pcm[i] = Math.round(clamped * 32767);
  }

  return {
    wavBytes: createWavFromPcm16(pcm, sampleRate),
    durationSec: Math.round(rawDuration * 10) / 10,
    sampleRate,
  };
}

export function generateIntegrationSnippets(
  config: SynthesisConfig,
  customAccents: AccentProfile[] = [],
  baseUrl = 'https://your-app-domain.run.app'
): {
  mobileDropInSdk: string;
  restTypescript: string;
  streamingWebAudio: string;
  curlCommand: string;
  pythonSdk: string;
} {
  const compiled = compileSynthesisPayload(config, customAccents);

  const requestBody = {
    engineMode: compiled.engineMode,
    voiceId: config.voiceId,
    voiceCode: compiled.voiceCode,
    gender: compiled.gender,
    accentId: config.accentId,
    localeCode: compiled.localeCode,
    tempoMultiplier: compiled.tempoMultiplier,
    pitchLockEnabled: compiled.pitchLockEnabled,
    emotion: config.emotion,
    text: compiled.decoratedText,
  };

  const jsonFormatted = JSON.stringify(requestBody, null, 2);

  const mobileDropInSdk = `// Drop-In Mobile Web App Reader SDK (Zero-Lag Lookahead Queue + iOS/Android MediaSession)
export class VoxChronosMobileReader {
  private audio = new Audio();
  private cache = new Map<number, string>();
  private chunks: string[] = [];
  private activeIdx = 0;
  private tempo = ${compiled.tempoMultiplier};

  constructor(private apiBase = '${baseUrl}') {
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.playChunk(this.activeIdx + 1));
  }

  // Call synchronously inside your Mobile "Read Aloud" button tap handler to unlock iOS Safari audio
  async loadAndPlayDocument(rawDocumentText: string) {
    this.audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    await this.audio.play().catch(() => {});

    const res = await fetch(\`\${this.apiBase}/api/v1/voice/chunk-document\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawDocumentText, tempoMultiplier: this.tempo })
    });
    const { chunks } = await res.json();
    this.chunks = chunks.map((c: any) => c.normalizedText);
    this.cache.clear();
    await this.playChunk(0);
  }

  setTempoRealTime(newTempo: number) {
    this.tempo = Math.max(0.5, Math.min(2.0, newTempo));
    this.audio.preservesPitch = true;
    this.audio.playbackRate = this.tempo;
  }

  private async fetchChunkAudio(idx: number): Promise<string> {
    if (this.cache.has(idx)) return this.cache.get(idx)!;
    const res = await fetch(\`\${this.apiBase}/api/v1/voice/synthesize\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engineMode: '${compiled.engineMode}',
        voiceId: '${config.voiceId}',
        accentId: '${config.accentId}',
        tempoMultiplier: this.tempo,
        emotion: ${JSON.stringify(config.emotion)},
        text: this.chunks[idx]
      })
    });
    const { audioBase64, mimeType } = await res.json();
    const url = \`data:\${mimeType};base64,\${audioBase64}\`;
    this.cache.set(idx, url);
    return url;
  }

  async playChunk(idx: number) {
    if (idx < 0 || idx >= this.chunks.length) return;
    this.activeIdx = idx;
    // Prefetch next 2 segments in parallel for 0ms gapless transition on PDFs & Bibles
    if (idx + 1 < this.chunks.length) this.fetchChunkAudio(idx + 1);
    if (idx + 2 < this.chunks.length) this.fetchChunkAudio(idx + 2);

    const url = await this.fetchChunkAudio(idx);
    this.audio.src = url;
    this.audio.preservesPitch = true;
    this.audio.playbackRate = this.tempo;
    await this.audio.play();
  }
}`;

  const restTypescript = `// Low-Latency Unary WAV Synthesis + Real-Time Tempo Control
const response = await fetch('${baseUrl}/api/v1/voice/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${jsonFormatted})
});

const { audioBase64, mimeType, tempoMultiplier, latencyMs } = await response.json();
const audio = new Audio(\`data:\${mimeType};base64,\${audioBase64}\`);
audio.preservesPitch = ${compiled.pitchLockEnabled}; // Keep formants locked while adjusting tempo
audio.playbackRate = tempoMultiplier; // Real-time adjustable (0.50x – 2.00x)
await audio.play();`;

  const streamingWebAudio = `// Ultra-Low-Latency Streaming PCM (24kHz 16-bit LE) with Web Audio API
const audioCtx = new AudioContext({ sampleRate: 24000 });
const response = await fetch('${baseUrl}/api/v1/voice/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${jsonFormatted})
});

const reader = response.body!.getReader();
let nextStartTime = audioCtx.currentTime;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const pcm16 = new Int16Array(value.buffer, value.byteOffset, value.byteLength / 2);
  const float32 = Float32Array.from(pcm16, (s) => s / 32768);
  const buffer = audioCtx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = ${compiled.tempoMultiplier};
  source.connect(audioCtx.destination);
  nextStartTime = Math.max(nextStartTime, audioCtx.currentTime);
  source.start(nextStartTime);
  nextStartTime += buffer.duration / ${compiled.tempoMultiplier};
}`;

  const curlCommand = `curl -X POST "${baseUrl}/api/v1/voice/synthesize" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody)}'`;

  const pythonSdk = `import requests, base64

payload = ${jsonFormatted
    .replace(/true/g, 'True')
    .replace(/false/g, 'False')}

resp = requests.post("${baseUrl}/api/v1/voice/synthesize", json=payload)
data = resp.json()
with open("cloned_voice_output.wav", "wb") as f:
    f.write(base64.b64decode(data["audioBase64"]))
print(f"Synthesized {data['voiceCode']} ({data['gender']}) in {data['latencyMs']}ms")`;

  return {
    mobileDropInSdk,
    restTypescript,
    streamingWebAudio,
    curlCommand,
    pythonSdk,
  };
}
