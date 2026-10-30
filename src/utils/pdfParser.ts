import zlib from 'zlib';

/**
 * Decodes PDF string escape sequences (\n, \r, \t, \(, \), \\, and octal \ddd)
 */
function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\(\d{1,3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Decodes hex strings <...> in PDF text blocks (both UTF-16BE with FEFF BOM and 8-bit Latin1)
 */
function decodePdfHexString(hexRaw: string): string {
  const clean = hexRaw.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length < 2) return '';
  if (clean.toUpperCase().startsWith('FEFF')) {
    let out = '';
    for (let i = 4; i + 3 < clean.length; i += 4) {
      const code = parseInt(clean.slice(i, i + 4), 16);
      if (code >= 32) out += String.fromCharCode(code);
    }
    return out;
  }
  let out = '';
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code >= 32 && code <= 126) out += String.fromCharCode(code);
  }
  return out;
}

/**
 * Extracts text tokens from a decompressed PDF content stream (BT ... ET blocks, Tj, TJ, ', ")
 */
function extractTextFromPdfContentStream(streamContent: string): string[] {
  const lines: string[] = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let blockMatch: RegExpExecArray | null;

  const extractFromBlock = (block: string) => {
    const pieces: string[] = [];
    // Match TJ arrays: [(text) -20 (more)] TJ
    const tokenRegex = /\[([\s\S]*?)\]\s*TJ|\((?:\\.|[^\\()])*\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj/g;
    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(block)) !== null) {
      if (tok[1] !== undefined) {
        // Inside [...] TJ array
        const arrayContent = tok[1];
        const subRegex = /\(((?:\\.|[^\\()])*)\)|<([0-9A-Fa-f\s]+)>/g;
        let sub: RegExpExecArray | null;
        let lineBuf = '';
        while ((sub = subRegex.exec(arrayContent)) !== null) {
          if (sub[1] !== undefined) {
            lineBuf += decodePdfLiteralString(sub[1]);
          } else if (sub[2] !== undefined) {
            lineBuf += decodePdfHexString(sub[2]);
          }
        }
        if (lineBuf.trim()) pieces.push(lineBuf.trim());
      } else if (tok[2] !== undefined) {
        const hexDecoded = decodePdfHexString(tok[2]);
        if (hexDecoded.trim()) pieces.push(hexDecoded.trim());
      } else {
        const litMatch = tok[0].match(/^\(((?:\\.|[^\\()])*)\)/);
        if (litMatch) {
          const decoded = decodePdfLiteralString(litMatch[1]);
          if (decoded.trim()) pieces.push(decoded.trim());
        }
      }
    }
    if (pieces.length > 0) {
      lines.push(pieces.join(' '));
    }
  };

  while ((blockMatch = btEtRegex.exec(streamContent)) !== null) {
    extractFromBlock(blockMatch[1]);
  }

  if (lines.length === 0) {
    // Fallback if stream has no explicit BT/ET delimiters
    extractFromBlock(streamContent);
  }

  return lines;
}

/**
 * High-speed native PDF text extractor supporting compressed FlateDecode streams,
 * BT/ET text operators (Tj, TJ), and uncompressed literal strings without external API lag.
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const rawLatin1 = buffer.toString('latin1');
  const extractedSegments: string[] = [];

  // 1. Locate all PDF stream ... endstream blocks and decompress FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawLatin1)) !== null) {
    const rawStreamBytes = Buffer.from(match[1], 'latin1');
    let decodedStreamText = '';

    try {
      const inflated = zlib.inflateSync(rawStreamBytes);
      decodedStreamText = inflated.toString('latin1');
    } catch {
      try {
        const inflatedRaw = zlib.inflateRawSync(rawStreamBytes);
        decodedStreamText = inflatedRaw.toString('latin1');
      } catch {
        // Stream is not zlib compressed; inspect raw content if it contains text operators
        if (match[1].includes('Tj') || match[1].includes('TJ')) {
          decodedStreamText = match[1];
        }
      }
    }

    if (decodedStreamText) {
      const streamLines = extractTextFromPdfContentStream(decodedStreamText);
      for (const line of streamLines) {
        if (
          line.length > 1 &&
          /[a-zA-Z]{2,}/.test(line) &&
          !/^(Identity-H|Adobe|WinAnsiEncoding|BaseFont|Type1|TrueType|FlateDecode)$/i.test(
            line.trim()
          )
        ) {
          extractedSegments.push(line);
        }
      }
    }
  }

  // 2. Also scan top-level uncompressed BT...ET or literal text blocks if no stream blocks matched
  if (extractedSegments.length === 0) {
    const topLevelLines = extractTextFromPdfContentStream(rawLatin1);
    for (const line of topLevelLines) {
      if (
        line.length > 1 &&
        /[a-zA-Z]{2,}/.test(line) &&
        !/^(Identity-H|Adobe|WinAnsiEncoding|BaseFont|Type1|TrueType|FlateDecode)/i.test(
          line.trim()
        )
      ) {
        extractedSegments.push(line);
      }
    }
  }

  // 3. Final fallback to parenthesized strings
  if (extractedSegments.length === 0) {
    const textLiteralRegex = /\(([^()\\]{2,240})\)/g;
    let litMatch: RegExpExecArray | null;
    while ((litMatch = textLiteralRegex.exec(rawLatin1)) !== null) {
      const candidate = decodePdfLiteralString(litMatch[1]).trim();
      if (
        candidate.length > 2 &&
        /[a-zA-Z]{2,}/.test(candidate) &&
        !/^(Identity-H|Adobe|WinAnsiEncoding|BaseFont|Type1|TrueType|FlateDecode|PDF-1)/i.test(
          candidate
        )
      ) {
        extractedSegments.push(candidate);
      }
    }
  }

  if (extractedSegments.length > 0) {
    return extractedSegments
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  return buffer
    .toString('utf8')
    .replace(/[^\x20-\x7E\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
