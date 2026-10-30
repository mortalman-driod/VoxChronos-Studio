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

export type PublicCompiledSynthesisPayload = Omit<
  CompiledSynthesisPayload,
  'internalVoiceCode'
>;

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
    recommendedRole: 'Bible & Devotional Reading, Keynote Briefings & Long-Form Essays',
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
    description: 'Poised, unhurried cadence with deep chest resonance for Bibles, devotionals, and solemn prose.',
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

/**
 * Complete 66-book Old & New Testament abbreviation + full book name dictionary,
 * supporting both Arabic (1, 2, 3) and Roman numeral (I, II, III) prefixes.
 */
const BIBLE_BOOK_EXPANSIONS: Record<string, string> = {
  // Old Testament (39 Books)
  'Gen(?:esis)?\\.?': 'Genesis',
  'Exod(?:us)?\\.?|Ex\\.?': 'Exodus',
  'Lev(?:iticus)?\\.?': 'Leviticus',
  'Num(?:bers)?\\.?': 'Numbers',
  'Deut(?:eronomy)?\\.?': 'Deuteronomy',
  'Josh(?:ua)?\\.?': 'Joshua',
  'Judg(?:es)?\\.?': 'Judges',
  'Ruth\\.?': 'Ruth',
  '(?:1|I)\\s*Sam(?:uel)?\\.?': 'First Samuel',
  '(?:2|II)\\s*Sam(?:uel)?\\.?': 'Second Samuel',
  '(?:1|I)\\s*(?:Kgs|Kings)\\.?': 'First Kings',
  '(?:2|II)\\s*(?:Kgs|Kings)\\.?': 'Second Kings',
  '(?:1|I)\\s*(?:Chr|Chron(?:icles)?)\\.?': 'First Chronicles',
  '(?:2|II)\\s*(?:Chr|Chron(?:icles)?)\\.?': 'Second Chronicles',
  'Ezra\\.?': 'Ezra',
  'Neh(?:emiah)?\\.?': 'Nehemiah',
  'Esth(?:er)?\\.?': 'Esther',
  'Job\\.?': 'Job',
  'Ps(?:a|alm|alms)?\\.?': 'Psalm',
  'Prov(?:erbs)?\\.?': 'Proverbs',
  'Eccl(?:esiastes)?\\.?': 'Ecclesiastes',
  'Song(?:\\s+of\\s+Solomon)?\\.?|Cant\\.?': 'Song of Solomon',
  'Isa(?:iah)?\\.?': 'Isaiah',
  'Jer(?:emiah)?\\.?': 'Jeremiah',
  'Lam(?:entations)?\\.?': 'Lamentations',
  'Ezek(?:iel)?\\.?': 'Ezekiel',
  'Dan(?:iel)?\\.?': 'Daniel',
  'Hos(?:ea)?\\.?': 'Hosea',
  'Joel\\.?': 'Joel',
  'Amos\\.?': 'Amos',
  'Obad(?:iah)?\\.?': 'Obadiah',
  'Jonah\\.?': 'Jonah',
  'Mic(?:ah)?\\.?': 'Micah',
  'Nah(?:um)?\\.?': 'Nahum',
  'Hab(?:akkuk)?\\.?': 'Habakkuk',
  'Zeph(?:aniah)?\\.?': 'Zephaniah',
  'Hag(?:gai)?\\.?': 'Haggai',
  'Zech(?:ariah)?\\.?': 'Zechariah',
  'Mal(?:achi)?\\.?': 'Malachi',
  // New Testament (27 Books)
  'Matt(?:hew)?\\.?|Mt\\.?': 'Matthew',
  'Mark\\.?|Mk\\.?': 'Mark',
  'Luke\\.?|Lk\\.?': 'Luke',
  'John\\.?|Jn\\.?': 'John',
  'Acts\\.?': 'Acts',
  'Rom(?:ans)?\\.?': 'Romans',
  '(?:1|I)\\s*Cor(?:inthians)?\\.?': 'First Corinthians',
  '(?:2|II)\\s*Cor(?:inthians)?\\.?': 'Second Corinthians',
  'Gal(?:atians)?\\.?': 'Galatians',
  'Eph(?:esians)?\\.?': 'Ephesians',
  'Phil(?:ippians)?\\.?': 'Philippians',
  'Col(?:ossians)?\\.?': 'Colossians',
  '(?:1|I)\\s*Thess(?:alonians)?\\.?': 'First Thessalonians',
  '(?:2|II)\\s*Thess(?:alonians)?\\.?': 'Second Thessalonians',
  '(?:1|I)\\s*Tim(?:othy)?\\.?': 'First Timothy',
  '(?:2|II)\\s*Tim(?:othy)?\\.?': 'Second Timothy',
  'Titus\\.?': 'Titus',
  'Phlm\\.?|Philem(?:on)?\\.?': 'Philemon',
  'Heb(?:rews)?\\.?': 'Hebrews',
  'Jas\\.?|James\\.?': 'James',
  '(?:1|I)\\s*Pet(?:er)?\\.?': 'First Peter',
  '(?:2|II)\\s*Pet(?:er)?\\.?': 'Second Peter',
  '(?:1|I)\\s*John\\.?': 'First John',
  '(?:2|II)\\s*John\\.?': 'Second John',
  '(?:3|III)\\s*John\\.?': 'Third John',
  'Jude\\.?': 'Jude',
  'Rev(?:elation)?\\.?': 'Revelation',
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

  // 1. Replace typographic ligatures from PDFs
  text = text
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl');

  // 2. Repair PDF column/line-wrap hyphens and running page headers/footers
  if (options.repairPdfHyphens) {
    text = text.replace(/([a-zA-Z])-\s*\r?\n\s*([a-z])/g, '$1$2');
    text = text.replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, '');
    text = text.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  }

  // 3. Expand all 66 Bible books + Roman numerals + en-dash/em-dash/hyphen verse ranges
  if (options.expandBibleCitations) {
    for (const [pattern, fullBook] of Object.entries(BIBLE_BOOK_EXPANSIONS)) {
      const regex = new RegExp(
        `\\b(?:${pattern})\\s+(\\d+):(\\d+)(?:[-–—](\\d+))?\\b`,
        'g'
      );
      text = text.replace(regex, (_match, ch, v1, v2) => {
        if (v2) {
          return `${fullBook} chapter ${ch}, verses ${v1} through ${v2}`;
        }
        return `${fullBook} chapter ${ch}, verse ${v1}`;
      });
    }
    // Expand standalone v. / vv. references (e.g., "vv. 4-7" -> "verses 4 through 7", "v. 3" -> "verse 3")
    text = text.replace(/\bvv\.\s*(\d+)[-–—](\d+)\b/gi, 'verses $1 through $2');
    text = text.replace(/\bv\.\s*(\d+)\b/gi, 'verse $1');
  }

  // 4. Strip inline Scripture verse numbers ([71:1], [1], (1), and bare leading verse numbers before capital letters)
  if (options.stripVerseNumbers) {
    text = text.replace(/\[\d+:\d+\]/g, ' ');
    text = text.replace(/(?:^|\s)\d+:\d+(?=\s+[A-Z])/g, ' ');
    // Strip bracketed single verse numbers at start of line or after sentence punctuation: e.g. "[2] And the earth..."
    text = text.replace(/(?:^|(?<=[.!?;:\n]))\s*\[\d{1,3}\](?=\s+[A-Z"'\u201C\u2018])/gm, ' ');
    // Strip bare leading verse numbers at start of line/paragraph: e.g. "2 And the earth was without form"
    text = text.replace(/(?:^|\n)\s*\d{1,3}\s+(?=[A-Z"'\u201C\u2018])/g, '\n');
  }

  // 5. Normalize all-caps liturgical LORD / GOD in KJV/ESV scripture so the vocal engine never spells out L-O-R-D
  text = text.replace(/\bLORD\b/g, 'Lord');
  text = text.replace(/\bGOD\b/g, 'God');

  // 6. Strip academic footnote/citation brackets [14] or [22, 25]
  if (options.stripAcademicBrackets) {
    text = text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '');
  }

  // 7. Insert natural breath pause at paragraph breaks or after liturgical "Selah."
  if (options.insertBreathAtParagraphs) {
    text = text.replace(/\bSelah\./g, 'Selah. <breath>');
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
        if (clause.length > maxCharsPerChunk) {
          // Hard word-boundary split for extraordinarily long unpunctuated clauses
          if (currentBuffer) {
            flushBuffer(currentBuffer);
            currentBuffer = '';
          }
          const words = clause.split(/\s+/);
          let wordBuf = '';
          for (const w of words) {
            if (!wordBuf) wordBuf = w;
            else if ((wordBuf + ' ' + w).length <= maxCharsPerChunk) {
              wordBuf = `${wordBuf} ${w}`;
            } else {
              flushBuffer(wordBuf);
              wordBuf = w;
            }
          }
          currentBuffer = wordBuf;
        } else if (!currentBuffer) {
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
  lookaheadCount = 3
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

export function sanitizePublicCompiledPayload(
  compiled: CompiledSynthesisPayload
): PublicCompiledSynthesisPayload {
  const { internalVoiceCode: _omitted, ...publicCompiled } = compiled;
  return publicCompiled;
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

/**
 * Guarantees that any returned audio byte buffer (whether already a RIFF WAVE container
 * or raw 24kHz 16-bit signed little-endian PCM `audio/L16`) is wrapped in a valid 44-byte
 * RIFF WAVE header so mobile `<audio>` elements on Android and iOS play it cleanly.
 */
export function ensureValidWavBytes(rawBytes: Uint8Array, sampleRate = 24000): Uint8Array {
  if (
    rawBytes.byteLength >= 44 &&
    rawBytes[0] === 0x52 && // 'R'
    rawBytes[1] === 0x49 && // 'I'
    rawBytes[2] === 0x46 && // 'F'
    rawBytes[3] === 0x46 && // 'F'
    rawBytes[8] === 0x57 && // 'W'
    rawBytes[9] === 0x41 && // 'A'
    rawBytes[10] === 0x56 && // 'V'
    rawBytes[11] === 0x45 // 'E'
  ) {
    return rawBytes;
  }

  const evenLength = rawBytes.byteLength - (rawBytes.byteLength % 2);
  const sampleCount = evenLength / 2;
  const pcm = new Int16Array(sampleCount);
  const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, evenLength);
  for (let i = 0; i < sampleCount; i++) {
    pcm[i] = view.getInt16(i * 2, true);
  }
  return createWavFromPcm16(pcm, sampleRate);
}

/**
 * Stitches multiple 24kHz 16-bit mono WAV buffers into a single seamless RIFF WAVE file
 * with an 8ms cosine fade-in/fade-out at segment boundaries and a natural inter-clause
 * breath pause (default 160ms) so full devotionals and Bible chapters never truncate or click.
 */
export function stitchMultipleWavBuffers(
  wavBuffers: Uint8Array[],
  interChunkPauseMs = 160,
  sampleRate = 24000
): Uint8Array {
  if (wavBuffers.length === 0) {
    return createWavFromPcm16(new Int16Array(0), sampleRate);
  }
  if (wavBuffers.length === 1) {
    return ensureValidWavBytes(wavBuffers[0], sampleRate);
  }

  const pauseSamples = Math.max(0, Math.floor((interChunkPauseMs / 1000) * sampleRate));
  const fadeSamples = Math.min(192, Math.floor(0.008 * sampleRate)); // 8ms smooth zero-crossing taper

  const pcmSegments: Int16Array[] = wavBuffers.map((raw) => {
    const validWav = ensureValidWavBytes(raw, sampleRate);
    const payloadByteLen = Math.max(0, validWav.byteLength - 44);
    const evenByteLen = payloadByteLen - (payloadByteLen % 2);
    const count = evenByteLen / 2;
    const samples = new Int16Array(count);
    const view = new DataView(validWav.buffer, validWav.byteOffset + 44, evenByteLen);
    for (let i = 0; i < count; i++) {
      samples[i] = view.getInt16(i * 2, true);
    }
    // Apply gentle 8ms fade-in and fade-out to eliminate inter-segment boundary clicks
    const actualFade = Math.min(fadeSamples, Math.floor(count / 4));
    for (let i = 0; i < actualFade; i++) {
      const gain = 0.5 * (1 - Math.cos((Math.PI * i) / actualFade));
      samples[i] = Math.round(samples[i] * gain);
      samples[count - 1 - i] = Math.round(samples[count - 1 - i] * gain);
    }
    return samples;
  });

  const totalSamples =
    pcmSegments.reduce((sum, seg) => sum + seg.length, 0) +
    pauseSamples * Math.max(0, pcmSegments.length - 1);

  const combinedPcm = new Int16Array(totalSamples);
  let writeOffset = 0;
  for (let idx = 0; idx < pcmSegments.length; idx++) {
    const seg = pcmSegments[idx];
    combinedPcm.set(seg, writeOffset);
    writeOffset += seg.length;
    if (idx < pcmSegments.length - 1 && pauseSamples > 0) {
      // Inter-segment breath silence is already zero-initialized in combinedPcm
      writeOffset += pauseSamples;
    }
  }

  return createWavFromPcm16(combinedPcm, sampleRate);
}

/**
 * Fallback native OS speech synthesizer when a mobile device is completely offline.
 * Speaks real intelligible words using the mobile browser's speech engine instead of a tone.
 */
export function speakWithNativeSpeechFallback(
  text: string,
  persona: VoicePersona,
  accent: AccentProfile,
  tempoMultiplier: number,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 1200);
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\|[^|]+\|/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = accent.localeCode || 'en-GB';
    utterance.rate = clampTempo(tempoMultiplier);
    utterance.pitch = persona.gender === 'female' ? 1.08 : 0.88;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const langPrefix = (accent.localeCode || 'en').split('-')[0].toLowerCase();
      const genderHint = persona.gender;
      const matched =
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes((accent.localeCode || '').toLowerCase()) &&
            (genderHint === 'male'
              ? /male|daniel|david|james|arthur|george|oliver|guy|alex/i.test(v.name)
              : /female|kate|serena|samantha|victoria|hazel|zira|uk english female/i.test(
                  v.name
                ))
        ) ||
        voices.find((v) =>
          v.lang.toLowerCase().includes((accent.localeCode || '').toLowerCase())
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matched) utterance.voice = matched;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    if (onEnd) setTimeout(onEnd, 1200);
    return false;
  }
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

  const mobileDropInSdk = `// Drop-In Mobile Web App Reader (10/10 Long-Form Bible, Devotional & PDF Engine)
// Includes: Dual-Audio Ping-Pong, Sliding-Window Blob Memory Manager (No OOM),
// Screen WakeLock API, AbortController Priority Queue, and RIFF WAVE Wrapping.
export class VoxChronosMobileReader {
  private audioA = new Audio();
  private audioB = new Audio();
  private activePlayer: 'A' | 'B' = 'A';
  private blobUrlWindow = new Map<number, string>();
  private inFlightControllers = new Map<number, AbortController>();
  private inFlightPromises = new Map<number, Promise<string>>();
  private wakeLock: any = null;
  private chunks: string[] = [];
  private activeIdx = 0;
  private tempo = ${compiled.tempoMultiplier};
  private maxRamChunks = 20;

  constructor(private apiBase = '${baseUrl}') {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        window.indexedDB.deleteDatabase('voxchronos_mobile_audio_v1');
        window.indexedDB.deleteDatabase('voxchronos_mobile_audio_v2');
      } catch {}
    }
    [this.audioA, this.audioB].forEach((el) => {
      el.preload = 'auto';
      el.addEventListener('ended', () => this.playChunk(this.activeIdx + 1));
    });
  }

  // Ensures raw 24kHz 16-bit PCM (audio/L16) has a valid 44-byte RIFF WAVE header & returns a Blob
  public static ensureWavBlob(base64Audio: string, sampleRate = 24000): Blob {
    const bin = atob(base64Audio);
    if (bin.slice(0, 4) === 'RIFF' && bin.slice(8, 12) === 'WAVE') {
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return new Blob([out], { type: 'audio/wav' });
    }
    const dataLen = bin.length - (bin.length % 2);
    const wav = new Uint8Array(44 + dataLen);
    const view = new DataView(wav.buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLen, true);
    for (let i = 0; i < dataLen; i++) wav[44 + i] = bin.charCodeAt(i);
    return new Blob([wav], { type: 'audio/wav' });
  }

  // Legacy data-URL helper for single-element integrations
  public static ensureWavDataUrl(base64Audio: string, sampleRate = 24000): string {
    const bin = atob(base64Audio);
    if (bin.slice(0, 4) === 'RIFF' && bin.slice(8, 12) === 'WAVE') {
      return \`data:audio/wav;base64,\${base64Audio}\`;
    }
    const dataLen = bin.length - (bin.length % 2);
    const wav = new Uint8Array(44 + dataLen);
    const view = new DataView(wav.buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLen, true);
    for (let i = 0; i < dataLen; i++) wav[44 + i] = bin.charCodeAt(i);
    let out = '';
    for (let i = 0; i < wav.length; i += 8192) {
      out += String.fromCharCode(...wav.subarray(i, i + 8192));
    }
    return \`data:audio/wav;base64,\${btoa(out)}\`;
  }

  private async acquireWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {}
    }
  }

  private pruneSlidingBlobWindow(centerIdx: number) {
    if (this.blobUrlWindow.size <= this.maxRamChunks) return;
    for (const [idx, objUrl] of this.blobUrlWindow.entries()) {
      if (idx < centerIdx - 2 || idx > centerIdx + 8) {
        URL.revokeObjectURL(objUrl);
        this.blobUrlWindow.delete(idx);
      }
    }
  }

  // Call synchronously inside your Mobile "Listen & Pray Aloud" / "Read Aloud" tap handler
  async loadAndPlayDocument(rawDocumentText: string) {
    const silentUnlock = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    this.audioA.src = silentUnlock;
    this.audioB.src = silentUnlock;
    await Promise.allSettled([this.audioA.play(), this.audioB.play()]);
    this.audioB.pause();
    await this.acquireWakeLock();

    const res = await fetch(\`\${this.apiBase}/api/v1/voice/chunk-document\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawDocumentText, tempoMultiplier: this.tempo })
    });
    const { chunks } = await res.json();
    this.chunks = chunks.map((c: any) => c.normalizedText);
    this.blobUrlWindow.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrlWindow.clear();
    await this.playChunk(0);
  }

  setTempoRealTime(newTempo: number) {
    this.tempo = Math.max(0.5, Math.min(2.0, newTempo));
    [this.audioA, this.audioB].forEach((el) => {
      el.preservesPitch = true;
      el.playbackRate = this.tempo;
    });
  }

  private fetchChunkAudio(idx: number): Promise<string> {
    if (this.blobUrlWindow.has(idx)) return Promise.resolve(this.blobUrlWindow.get(idx)!);
    if (this.inFlightPromises.has(idx)) return this.inFlightPromises.get(idx)!;

    const ctrl = new AbortController();
    this.inFlightControllers.set(idx, ctrl);

    const task = (async () => {
      try {
        const res = await fetch(\`\${this.apiBase}/api/v1/voice/synthesize\`, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engineMode: '${compiled.engineMode}',
            voiceId: '${config.voiceId}',
            accentId: '${config.accentId}',
            tempoMultiplier: this.tempo,
            emotion: ${JSON.stringify(config.emotion)},
            text: this.chunks[idx],
            skipNormalization: true
          })
        });
        const { audioBase64 } = await res.json();
        const blob = VoxChronosMobileReader.ensureWavBlob(audioBase64, 24000);
        const objUrl = URL.createObjectURL(blob);
        this.blobUrlWindow.set(idx, objUrl);
        this.pruneSlidingBlobWindow(this.activeIdx);
        return objUrl;
      } finally {
        this.inFlightControllers.delete(idx);
        this.inFlightPromises.delete(idx);
      }
    })();

    this.inFlightPromises.set(idx, task);
    return task;
  }

  async playChunk(idx: number) {
    if (idx < 0 || idx >= this.chunks.length) {
      if (this.wakeLock) { this.wakeLock.release().catch(() => {}); this.wakeLock = null; }
      return;
    }
    this.activeIdx = idx;

    // Abort stale prefetches outside our [idx, idx + 3] lookahead window
    for (const [pendingIdx, ctrl] of this.inFlightControllers.entries()) {
      if (pendingIdx < idx || pendingIdx > idx + 3) {
        ctrl.abort();
        this.inFlightControllers.delete(pendingIdx);
        this.inFlightPromises.delete(pendingIdx);
      }
    }

    // Resolve active chunk FIRST (with 1x automatic retry if an earlier prefetch was aborted)
    let url = '';
    try {
      url = await this.fetchChunkAudio(idx);
    } catch {
      url = await this.fetchChunkAudio(idx);
    }

    // Trigger 3-chunk lookahead prefetch (idx + 1, idx + 2, idx + 3) in background
    for (let offset = 1; offset <= 3; offset++) {
      if (idx + offset < this.chunks.length) {
        this.fetchChunkAudio(idx + offset).catch(() => {});
      }
    }

    const currentEl = this.activePlayer === 'A' ? this.audioA : this.audioB;
    const standbyEl = this.activePlayer === 'A' ? this.audioB : this.audioA;
    standbyEl.pause();

    currentEl.src = url;
    currentEl.preservesPitch = true;
    currentEl.playbackRate = this.tempo;
    await currentEl.play();
    this.activePlayer = this.activePlayer === 'A' ? 'B' : 'A';
  }
}`;

  const restTypescript = `// Low-Latency Unary WAV Synthesis (Automatically Stitches Multi-Chunk Chapters)
const response = await fetch('${baseUrl}/api/v1/voice/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${jsonFormatted})
});

const { audioBase64, mimeType, tempoMultiplier, latencyMs } = await response.json();
const wavBlob = VoxChronosMobileReader.ensureWavBlob(audioBase64, 24000);
const audio = new Audio(URL.createObjectURL(wavBlob));
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
print(f"Synthesized {data['compiled']['voiceCode']} ({data['compiled']['gender']}) in {data['latencyMs']}ms")`;

  return {
    mobileDropInSdk,
    restTypescript,
    streamingWebAudio,
    curlCommand,
    pythonSdk,
  };
}
