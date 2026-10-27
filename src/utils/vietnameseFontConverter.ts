/**
 * Vietnamese Font Encoding Converter & Normalizer
 * Accurately supports TCVN3 (ABC / .VnTime) and VNI-Windows to Standard Unicode UTF-8 (NFC)
 * Completely eliminates false-positive corruptions on modern Unicode text and Word .docx files
 */

// Characters uniquely present in standard Vietnamese Unicode (Precomposed with diacritics and đ/Đ)
// Code points in \u1EA0-\u1EF9, plus đ (U+0111), Đ (U+0110), ư (U+01B0), ơ (U+01A1), Ư (U+01AF), Ơ (U+01A0)
const UNICODE_VIET_PATTERN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/;

// Frequent Vietnamese words in TCVN3 (.VnTime)
const TCVN3_WORD_REGEX = /\b(häc|bµi|trêng|ngêi|to¸n|c©u|®Ò|viÖt|líp|kh«ng|®îc|cña|®iÓm|nµy|®ã|mét|c¸c|thÕ|gi¸o|viªn|phÇn)\b/i;

// Frequent Vietnamese words in VNI-Windows
const VNI_WORD_REGEX = /\b(ngöôøi|tröôøng|baøi|hoïc|ñieåm|khoâng|cuûa|trong|laø|coù|caùc|ñöôïc|moät|giaùo|vieân|phaàn)\b/i;

// TCVN3 (ABC / .VnTime) to Unicode mapping
const TCVN3_MAP: Record<string, string> = {
  // Lowercase vowels
  '¸': 'á', // 0xB8
  'µ': 'à', // 0xB5
  '¶': 'ả', // 0xB6
  '·': 'ã', // 0xB7
  '¹': 'ạ', // 0xB9
  '¨': 'ă', // 0xA8
  '¾': 'ắ', // 0xBE
  '»': 'ằ', // 0xBB
  '¼': 'ẳ', // 0xBC
  '½': 'ẵ', // 0xBD
  'Æ': 'ặ', // 0xC6
  '©': 'â', // 0xA9
  'Ê': 'ấ', // 0xCA
  'Ç': 'ầ', // 0xC7
  'È': 'ẩ', // 0xC8
  'É': 'ẫ', // 0xC9
  'Ë': 'ậ', // 0xCB
  'Ð': 'é', // 0xD0
  'Ì': 'è', // 0xCC
  'Î': 'ẻ', // 0xCE
  'Ï': 'ẽ', // 0xCF
  'Ñ': 'ẹ', // 0xD1
  'ª': 'ê', // 0xAA
  'Ö': 'ế', // 0xD6
  'Ò': 'ề', // 0xD2
  'Ó': 'ể', // 0xD3
  'Ô': 'ễ', // 0xD4
  'Õ': 'ệ', // 0xD5
  'Ý': 'í', // 0xDD
  '×': 'ì', // 0xD7
  'Ø': 'ỉ', // 0xD8
  'Ü': 'ĩ', // 0xDC
  'Þ': 'ị', // 0xDE
  'ã': 'ó', // 0xE3
  'ß': 'ò', // 0xDF
  'á': 'ỏ', // 0xE1
  'â': 'õ', // 0xE2
  'ä': 'ọ', // 0xE4
  '«': 'ô', // 0xAB
  'é': 'ố', // 0xE9
  'å': 'ồ', // 0xE5
  'æ': 'ổ', // 0xE6
  'ç': 'ỗ', // 0xE7
  'è': 'ộ', // 0xE8
  '¬': 'ơ', // 0xAC
  'î': 'ớ', // 0xEE
  'ê': 'ờ', // 0xEA
  'ë': 'ở', // 0xEB
  'ì': 'ỡ', // 0xEC
  'í': 'ợ', // 0xED
  'ó': 'ú', // 0xF3
  'ï': 'ù', // 0xEF
  'ñ': 'ủ', // 0xF1
  'ò': 'ũ', // 0xF2
  'ô': 'ụ', // 0xF4
  '­': 'ư', // 0xAD
  'ø': 'ứ', // 0xF8
  'õ': 'ừ', // 0xF5
  'ö': 'ử', // 0xF6
  '÷': 'ữ', // 0xF7
  'ù': 'ự', // 0xF9
  'ý': 'ý', // 0xFD
  'ú': 'ỳ', // 0xFA
  'û': 'ỷ', // 0xFB
  'ü': 'ỹ', // 0xFC
  'þ': 'ỵ', // 0xFE
  '®': 'đ', // 0xAE

  // Uppercase special characters
  '¡': 'Ă', // 0xA1
  '¢': 'Â', // 0xA2
  '§': 'Đ', // 0xA7
  '£': 'Ê', // 0xA3
  '¤': 'Ô', // 0xA4
  '¥': 'Ơ', // 0xA5
  '¦': 'Ư', // 0xA6
};

// VNI-Windows to Unicode mapping table
const VNI_DOUBLE_MAP: [RegExp, string][] = [
  [/aù/g, 'á'], [/aø/g, 'à'], [/aû/g, 'ả'], [/aõ/g, 'ã'], [/aï/g, 'ạ'],
  [/aê/g, 'ă'], [/aé/g, 'ắ'], [/aè/g, 'ằ'], [/aú/g, 'ẳ'], [/aü/g, 'ẵ'], [/aë/g, 'ặ'],
  [/aâ/g, 'â'], [/aá/g, 'ấ'], [/aà/g, 'ầ'], [/aå/g, 'ẩ'], [/aã/g, 'ẫ'], [/aä/g, 'ậ'],
  [/eù/g, 'é'], [/eø/g, 'è'], [/eû/g, 'ẻ'], [/eõ/g, 'ẽ'], [/eï/g, 'ẹ'],
  [/eâ/g, 'ê'], [/eá/g, 'ế'], [/eà/g, 'ề'], [/eå/g, 'ể'], [/eã/g, 'ễ'], [/eä/g, 'ệ'],
  [/où/g, 'ó'], [/oø/g, 'ò'], [/oû/g, 'ỏ'], [/oõ/g, 'õ'], [/oï/g, 'ọ'],
  [/oâ/g, 'ô'], [/oá/g, 'ố'], [/oà/g, 'ồ'], [/oå/g, 'ổ'], [/oã/g, 'ỗ'], [/oä/g, 'ộ'],
  [/ôù/g, 'ớ'], [/ôø/g, 'ờ'], [/ôû/g, 'ở'], [/ôõ/g, 'ỡ'], [/ôï/g, 'ợ'],
  [/uù/g, 'ú'], [/uø/g, 'ù'], [/uû/g, 'ủ'], [/uõ/g, 'ũ'], [/uï/g, 'ụ'],
  [/öù/g, 'ứ'], [/öø/g, 'ừ'], [/öû/g, 'ử'], [/öõ/g, 'ữ'], [/öï/g, 'ự'],
  [/yù/g, 'ý'], [/yø/g, 'ỳ'], [/yû/g, 'ỷ'], [/yõ/g, 'ỹ'], [/î/g, 'ỵ'],
  [/ñ/g, 'đ'], [/Ñ/g, 'Đ'],
  [/AÙ/g, 'Á'], [/AØ/g, 'À'], [/AÛ/g, 'Ả'], [/AÕ/g, 'Ã'], [/AÏ/g, 'Ạ'],
  [/AÊ/g, 'Ă'], [/AÉ/g, 'Ắ'], [/AÈ/g, 'Ằ'], [/AÚ/g, 'Ẳ'], [/AÜ/g, 'Ẵ'], [/AË/g, 'Ặ'],
  [/AÂ/g, 'Â'], [/AÁ/g, 'Ấ'], [/AÀ/g, 'Ầ'], [/AÅ/g, 'Ẩ'], [/AÃ/g, 'Ẫ'], [/AÄ/g, 'Ậ'],
  [/EÙ/g, 'É'], [/EØ/g, 'È'], [/EÛ/g, 'Ẻ'], [/EÕ/g, 'Ẽ'], [/EÏ/g, 'Ẹ'],
  [/EÂ/g, 'Ê'], [/EÁ/g, 'Ế'], [/EÀ/g, 'Ề'], [/EÅ/g, 'Ể'], [/EÃ/g, 'Ễ'], [/EÄ/g, 'Ệ'],
  [/OÙ/g, 'Ó'], [/OØ/g, 'Ò'], [/OÛ/g, 'Ỏ'], [/OÕ/g, 'Õ'], [/OÏ/g, 'Ọ'],
  [/OÂ/g, 'Ô'], [/OÁ/g, 'Ố'], [/OÀ/g, 'Ồ'], [/OÅ/g, 'Ổ'], [/OÃ/g, 'Ỗ'], [/OÄ/g, 'Ộ'],
  [/ÔÙ/g, 'Ớ'], [/ÔØ/g, 'Ờ'], [/ÔÛ/g, 'Ở'], [/ÔÕ/g, 'Ỡ'], [/ÔÏ/g, 'Ợ'],
  [/UÙ/g, 'Ú'], [/UØ/g, 'Ù'], [/UÛ/g, 'Ủ'], [/UÕ/g, 'Ũ'], [/UÏ/g, 'Ụ'],
  [/ÖÙ/g, 'Ứ'], [/ÖØ/g, 'Ừ'], [/ÖÛ/g, 'Ử'], [/ÖÕ/g, 'Ữ'], [/ÖÏ/g, 'Ự'],
  [/YÙ/g, 'Ý'], [/YØ/g, 'Ỳ'], [/YÛ/g, 'Ỷ'], [/YÕ/g, 'Ỹ'],
];

/**
 * Check if text already contains standard Vietnamese Unicode characters.
 * If yes, it is guaranteed to be Unicode and MUST NOT be converted as TCVN3 or VNI.
 */
export function isStandardUnicode(text: string): boolean {
  if (!text) return true;
  const matches = text.match(new RegExp(UNICODE_VIET_PATTERN.source, 'gi'));
  // If there are 3 or more standard Vietnamese Unicode characters, it's definitively modern Unicode
  return (matches?.length || 0) >= 3;
}

/**
 * Detect if text appears to be encoded in TCVN3 (ABC / .VnTime)
 */
export function isTCVN3(text: string): boolean {
  if (!text || text.length < 5) return false;
  // If it already has standard Vietnamese Unicode characters, it is NOT TCVN3
  if (isStandardUnicode(text)) return false;

  // Check for common words written in TCVN3
  if (TCVN3_WORD_REGEX.test(text)) return true;

  // Check for word-level TCVN3 character occurrences (surrounded by word characters)
  const wordInternalMatches = text.match(/\w[¸µ¶·¹©¾»¼½Æ¨ÊÇÈÉËª«¬­®¡¢§£¤¥¦]\w/g);
  return wordInternalMatches !== null && wordInternalMatches.length >= 2;
}

/**
 * Detect if text appears to be encoded in VNI-Windows
 */
export function isVNI(text: string): boolean {
  if (!text || text.length < 5) return false;
  // If it already has standard Vietnamese Unicode characters, it is NOT VNI
  if (isStandardUnicode(text)) return false;

  if (VNI_WORD_REGEX.test(text)) return true;

  const vniMatches = text.match(/(aù|aø|aû|aõ|aï|aê|aâ|eù|eø|eû|eõ|eï|eâ|où|oø|oû|oõ|oï|oâ|uù|uø|uû|uõ|uï|öù|öø|yù|yø|ñ)/gi);
  return vniMatches !== null && vniMatches.length >= 4;
}

/**
 * Convert TCVN3 (.VnTime) text to Unicode
 */
export function tcvn3ToUnicode(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += TCVN3_MAP[char] !== undefined ? TCVN3_MAP[char] : char;
  }
  return result.normalize('NFC');
}

/**
 * Convert VNI-Windows text to Unicode
 */
export function vniToUnicode(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [regex, replacement] of VNI_DOUBLE_MAP) {
    result = result.replace(regex, replacement);
  }
  return result.normalize('NFC');
}

/**
 * Smart automatic converter:
 * 1. Normalizes all Unicode decomposed characters (NFD -> NFC) to prevent broken diacritics
 * 2. Only converts if genuine legacy encoding (TCVN3 or VNI) is detected
 * 3. Never damages valid modern Unicode text
 */
export function autoConvertToUnicode(text: string): { convertedText: string; detectedEncoding: string | null } {
  if (!text) return { convertedText: '', detectedEncoding: null };

  // Step 1: Pre-normalize to standard precomposed Unicode (NFC)
  const normalized = text.normalize('NFC');

  // Step 2: If text is already standard Unicode, preserve it completely
  if (isStandardUnicode(normalized)) {
    return {
      convertedText: normalized,
      detectedEncoding: null,
    };
  }

  // Step 3: Check for genuine TCVN3
  if (isTCVN3(normalized)) {
    return {
      convertedText: tcvn3ToUnicode(normalized),
      detectedEncoding: 'TCVN3 (.VnTime)',
    };
  }

  // Step 4: Check for genuine VNI
  if (isVNI(normalized)) {
    return {
      convertedText: vniToUnicode(normalized),
      detectedEncoding: 'VNI-Windows',
    };
  }

  // Default: Return NFC normalized text without altering any characters
  return {
    convertedText: normalized,
    detectedEncoding: null,
  };
}

/**
 * Read text from an uploaded file with smart charset detection and format parsing (.docx, .txt, etc.)
 */
export async function readTextFromFile(file: File): Promise<{ text: string; encodingDetected?: string }> {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

  // 1. DOCX (Modern Microsoft Word format - standard XML / UTF-8)
  if (extension === '.docx') {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = (result.value || '').normalize('NFC');

      // Word .docx is already UTF-8. Only run conversion if user typed in a legacy font inside Word
      const { convertedText, detectedEncoding } = autoConvertToUnicode(rawText);
      return {
        text: convertedText,
        encodingDetected: detectedEncoding ? `Word DOCX (${detectedEncoding})` : 'Word DOCX (Unicode)',
      };
    } catch (err: any) {
      console.warn('Mammoth docx extraction warning:', err);
      throw new Error(`Không thể đọc tệp Word .docx: ${err?.message || 'Tệp bị lỗi định dạng'}`);
    }
  }

  // 2. Legacy .doc warning (Binary OLE format)
  if (extension === '.doc') {
    throw new Error(
      'Tệp .doc (Word 97-2003) là định dạng nhị phân cũ không thể đọc trực tiếp. Vui lòng mở tệp trong Word, chọn "Lưu thành" (Save As) dạng .docx hoặc .txt, hoặc Copy (Ctrl+C) và Dán trực tiếp vào ô bên dưới.'
    );
  }

  // 3. Text / plain files (.txt, .csv, etc.)
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check UTF-16 LE / BE BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder('utf-16le');
    const text = decoder.decode(bytes).normalize('NFC');
    const { convertedText, detectedEncoding } = autoConvertToUnicode(text);
    return {
      text: convertedText,
      encodingDetected: detectedEncoding || 'UTF-16LE',
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder('utf-16be');
    const text = decoder.decode(bytes).normalize('NFC');
    const { convertedText, detectedEncoding } = autoConvertToUnicode(text);
    return {
      text: convertedText,
      encodingDetected: detectedEncoding || 'UTF-16BE',
    };
  }

  // Try standard UTF-8 first
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    const utf8Text = utf8Decoder.decode(bytes).normalize('NFC');
    const { convertedText, detectedEncoding } = autoConvertToUnicode(utf8Text);
    return {
      text: convertedText,
      encodingDetected: detectedEncoding || 'UTF-8',
    };
  } catch (_e) {
    // If not valid UTF-8, it's likely Windows-1258 (Vietnamese ANSI) or Windows-1252
    try {
      const winDecoder = new TextDecoder('windows-1258');
      const winText = winDecoder.decode(bytes).normalize('NFC');
      const { convertedText, detectedEncoding } = autoConvertToUnicode(winText);
      return {
        text: convertedText,
        encodingDetected: detectedEncoding || 'Windows-1258',
      };
    } catch (_e2) {
      // Fallback
      const fallbackDecoder = new TextDecoder('utf-8');
      const fallbackText = fallbackDecoder.decode(bytes).normalize('NFC');
      const { convertedText, detectedEncoding } = autoConvertToUnicode(fallbackText);
      return {
        text: convertedText,
        encodingDetected: detectedEncoding || 'Auto-Unicode',
      };
    }
  }
}
