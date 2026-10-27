import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { calculateMatrixFromQuestions, generateSpecificationFromQuestions } from './src/utils/matrixHelper.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Shared Gemini client setup according to guidelines
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
const MODEL_NAME = CANDIDATE_MODELS[0];

interface AppErrorDetail {
  title: string;
  reason: string;
  solution: string;
  technicalInfo?: string;
  targetSection?: string;
}

function fixNewlinesInJsonStrings(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString && char === '\n') {
      result += '\\n';
    } else if (inString && char === '\r') {
      // skip carriage return
    } else if (inString && char === '\t') {
      result += '\\t';
    } else {
      result += char;
    }

    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
  }

  return result;
}

/**
 * Robust JSON extraction and sanitizer:
 * - Strips ```json ... ``` codeblocks
 * - Fixes single backslashes in LaTeX formulas (e.g. \Delta, \mu, \approx, \text, \degree, \to)
 * - Escapes literal unescaped newlines/tabs inside JSON string literals
 * - Removes trailing commas before closing braces
 * - Handles unescaped control characters
 */
function cleanAndParseJSON(rawText: string): any {
  if (!rawText || !rawText.trim()) return {};

  let cleaned = rawText.trim();

  // 1. Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // 2. Extract outermost JSON object if wrapped in conversational text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Attempt 1: Standard JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (_err1) {
    // Attempt 2: Fix unescaped newlines inside strings
    try {
      const fixedNl = fixNewlinesInJsonStrings(cleaned);
      return JSON.parse(fixedNl);
    } catch (_err2) {
      // Attempt 3: Fix unescaped LaTeX backslashes + newlines
      try {
        const fixedEscapes = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
        const fixedNl = fixNewlinesInJsonStrings(fixedEscapes);
        return JSON.parse(fixedNl);
      } catch (_err3) {
        // Attempt 4: Fix trailing commas before } or ] + LaTeX + newlines
        try {
          const fixedCommas = cleaned
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
          const fixedNl = fixNewlinesInJsonStrings(fixedCommas);
          return JSON.parse(fixedNl);
        } catch (_err4) {
          // Attempt 5: Clean invalid control characters and retry
          try {
            const sanitized = cleaned
              .replace(/[\x00-\x1F\x7F-\x9F]/g, (c) => (c === '\n' || c === '\r' || c === '\t' ? c : ''))
              .replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')
              .replace(/,\s*([}\]])/g, '$1');
            const fixedNl = fixNewlinesInJsonStrings(sanitized);
            return JSON.parse(fixedNl);
          } catch (finalErr: any) {
            console.error('Failed to parse AI JSON response:', finalErr.message);
            throw finalErr;
          }
        }
      }
    }
  }
}

/**
 * Executes generateContent with automatic model failover and retries on high demand (503), rate-limits (429) or timeouts
 */
async function generateContentWithRetry(params: any, maxRetriesPerModel = 1) {
  let lastError: any = null;
  const initialModel = params.model || MODEL_NAME;
  const modelsToTry = [initialModel, ...CANDIDATE_MODELS.filter((m) => m !== initialModel)];

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${modelName} (lần ${attempt + 1})...`);
        const result = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        console.log(`[Gemini API] Thành công với ${modelName}!`);
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const statusCode = err?.status || err?.statusCode || 0;
        console.warn(`[Gemini API] ${modelName} thất bại (lần ${attempt + 1}, status ${statusCode}):`, errMsg.slice(0, 150));

        // Nếu mã 404 (model không tìm thấy), chuyển ngay sang model tiếp theo không cần thử lại
        if (statusCode === 404 || errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('NOT_FOUND')) {
          break;
        }

        const isTransient =
          statusCode === 503 ||
          statusCode === 429 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('fetch failed') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('high demand') ||
          errMsg.includes('timeout') ||
          errMsg.includes('ECONNRESET');

        if (isTransient) {
          if (attempt < maxRetriesPerModel) {
            const delay = 1000 * (attempt + 1);
            console.log(`[Gemini API] Đợi ${delay}ms và thử lại với ${modelName}...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          // Chuyển sang model dự phòng tiếp theo
          break;
        } else {
          // Với lỗi khác, thử model tiếp theo trước khi dừng
          break;
        }
      }
    }
  }
  throw lastError;
}

function parseToVietnameseError(error: any): AppErrorDetail {
  let errMsg = '';
  let statusCode = 0;

  if (error) {
    if (typeof error === 'string') {
      errMsg = error;
    } else {
      statusCode = error.status || error.statusCode || error.code || 0;
      errMsg = String(error.message || error.statusText || error.stack || error);
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) {
          if (parsed.error.code) statusCode = parsed.error.code;
          if (parsed.error.message) errMsg = `${errMsg} | ${parsed.error.message}`;
          if (parsed.error.status) errMsg = `${errMsg} | ${parsed.error.status}`;
        }
      } catch (_ignore) {}
    }
  }

  // 1. Máy chủ AI quá tải nhu cầu / 503 / UNAVAILABLE / High demand
  if (
    statusCode === 503 ||
    errMsg.includes('503') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('high demand') ||
    errMsg.includes('overloaded')
  ) {
    return {
      title: 'Máy chủ AI đang có lượng truy cập cao (Mã lỗi: 503 - Tải tăng đột biến)',
      reason: 'Hệ thống máy chủ Google AI đang tiếp nhận số lượng lớn yêu cầu cùng lúc (Spikes in demand).',
      solution:
        '1. Thầy/cô vui lòng bấm nút "Thử lại ngay" bên dưới. Hệ thống sẽ tự động dùng mô hình siêu tốc Gemini 3.1 Flash Lite với tốc độ phản hồi chỉ vài giây.\n2. Nếu đề kiểm tra có nhiều câu tự luận dài, hãy thử giảm bớt 1-2 câu tự luận để tăng tốc độ phản hồi.\n3. Nếu vừa bấm Tạo đề liên tục nhiều lần, vui lòng đợi 3 - 5 giây rồi bấm Thử lại.',
      technicalInfo: errMsg,
      targetSection: 'questionTypes',
    };
  }

  // 2. Quá tải hạn mức / 429 / RESOURCE_EXHAUSTED
  if (
    statusCode === 429 ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('rate limit')
  ) {
    return {
      title: 'Hệ thống AI tạm thời vượt quá hạn ngạch (Mã lỗi: 429)',
      reason: 'Số lượt gửi yêu cầu tạo đề trong thời gian ngắn vượt ngưỡng xử lý cho phép của hệ thống.',
      solution:
        '1. Thầy/cô vui lòng đợi khoảng 10 - 15 giây rồi nhấn nút "Thử lại ngay".\n2. Hệ thống đã tối ưu thuật toán tính ma trận và bản đặc tả tự động để tiết kiệm tối đa lượt gọi AI.\n3. Nếu đang tạo đề có số lượng câu quá lớn (>25 câu), hãy giảm bớt số lượng câu hỏi để hệ thống phản hồi nhanh hơn.',
      technicalInfo: errMsg,
      targetSection: 'questionTypes',
    };
  }

  // 3. Thiếu hoặc sai API Key / 401 / 403 / PERMISSION_DENIED
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('401') ||
    errMsg.includes('403') ||
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('API key not valid')
  ) {
    return {
      title: 'Khóa API AI không hợp lệ hoặc chưa được kích hoạt',
      reason: 'Máy chủ không thể xác thực mã khóa GEMINI_API_KEY do khóa bị thiếu, hết hạn hoặc sai quyền truy cập.',
      solution:
        '1. Kiểm tra lại biến môi trường GEMINI_API_KEY trong hệ thống cấu hình.\n2. Đảm bảo dịch vụ Gemini API đã được kích hoạt trên tài khoản Google Cloud.',
      technicalInfo: errMsg,
    };
  }

  // 4. Nội dung vi phạm bộ lọc an toàn / SAFETY
  if (errMsg.includes('SAFETY') || errMsg.includes('blocked') || errMsg.includes('HARM_CATEGORY')) {
    return {
      title: 'Nội dung đề thi bị bộ lọc an toàn của AI từ chối',
      reason: 'Văn bản trong mục "Tài liệu tham chiếu" hoặc "Tên bài học" chứa từ ngữ hoặc ngữ liệu bị hệ thống an toàn đánh giá là nhạy cảm.',
      solution:
        '1. Kiểm tra lại nội dung dán vào mục Tài liệu tham chiếu, xóa bỏ các từ ngữ nhạy cảm.\n2. Đặt lại tên chủ đề rõ ràng, mang tính học thuật sư phạm hơn.',
      technicalInfo: errMsg,
      targetSection: 'referenceMaterial',
    };
  }

  // 5. Lỗi độ dài tài liệu / Payload too large / Token limit
  if (
    errMsg.includes('too large') ||
    errMsg.includes('token count') ||
    errMsg.includes('max tokens') ||
    errMsg.includes('context length')
  ) {
    return {
      title: 'Tài liệu tham chiếu quá dài vượt mức xử lý',
      reason: 'Đoạn văn bản tài liệu thầy/cô tải lên hoặc dán vào quá dài, làm tràn bộ nhớ ngữ cảnh của mô hình AI.',
      solution:
        '1. Rút ngắn nội dung tài liệu tham chiếu xuống dưới 4.000 từ (chỉ giữ lại các nội dung trọng tâm cần kiểm tra).\n2. Chia nhỏ tài liệu thành từng bài học riêng biệt để ra đề.',
      technicalInfo: errMsg,
      targetSection: 'referenceMaterial',
    };
  }

  // 6. Mất kết nối mạng / timeout / fetch failed
  if (
    errMsg.includes('fetch failed') ||
    errMsg.includes('ENOTFOUND') ||
    errMsg.includes('ECONNREFUSED') ||
    errMsg.includes('timeout') ||
    errMsg.includes('NetworkError') ||
    errMsg.includes('UND_ERR_CONNECT_TIMEOUT')
  ) {
    return {
      title: 'Thời gian kết nối máy chủ AI vượt quá hạn chờ (Timeout)',
      reason: 'Quá trình biên soạn đề thi kéo dài hơn thời gian chờ của đường truyền mạng hoặc kết nối mạng bị gián đoạn.',
      solution:
        '1. Hệ thống đã kích hoạt chế độ tạo đề siêu tốc bằng Gemini 3.1 Flash Lite (dưới 10 - 15 giây). Thầy/cô chỉ cần nhấn nút "Thử lại ngay".\n2. Nếu số lượng câu hỏi đang đặt quá lớn (trên 20 câu), hãy giảm bớt 2-3 câu để máy chủ phản hồi trong chớp mắt.\n3. Kiểm tra lại kết nối Wifi/Internet của thiết bị.',
      technicalInfo: errMsg,
      targetSection: 'questionTypes',
    };
  }

  // 7. Lỗi phân tích cú pháp JSON
  if (errMsg.includes('SyntaxError') || errMsg.includes('Unexpected token')) {
    return {
      title: 'Lỗi định dạng dữ liệu từ máy chủ AI',
      reason: 'Dữ liệu đề thi gửi về chứa ký hiệu đặc biệt hoặc công thức toán học/khoa học chưa được đóng gói chuẩn JSON.',
      solution:
        '1. Thầy/cô chỉ cần bấm nút "Thử lại ngay", hệ thống đã có bộ lọc công thức thông minh tự động sửa lỗi.\n2. Nếu vẫn xảy ra, hãy giảm bớt 1-2 câu hỏi tự luận dài để AI sinh mã nhanh hơn.',
      technicalInfo: errMsg,
    };
  }

  // Mặc định cụ thể
  return {
    title: 'Chưa thể khởi tạo đề kiểm tra lúc này',
    reason: `Máy chủ AI phản hồi thông báo: ${errMsg.slice(0, 180) || 'Không có phản hồi hợp lệ'}`,
    solution:
      '1. Nhấn nút "Thử lại ngay" sau vài giây (mô hình dự phòng Gemini Flash Lite sẽ tự động đảm nhiệm).\n2. Kiểm tra lại các trường thông tin ở cột Thiết lập bên trái (đã được bôi đỏ nếu có sai sót).\n3. Nếu vẫn không được, hãy thử giảm bớt số lượng câu hỏi hoặc rút gọn tài liệu tham chiếu.',
    technicalInfo: errMsg,
  };
}

// API Endpoints
app.post('/api/generate-exam', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const {
      educationLevel, // 'tieuhoc' | 'thcs' | 'thpt'
      grade,
      subject,
      customSubject,
      examType,
      customExamTitle,
      durationMinutes,
      totalScore,
      topic,
      chapter,
      scope,
      learningOutcomes,
      specialNotes,
      referenceMaterial,
      referenceSourceMode, // 'only_upload' | 'upload_and_gdpt' | 'teacher_input'
      questionTypeCounts, // { multipleChoice, trueFalse, matching, fillInBlank, shortAnswer, essay }
      levelsDistribution, // { recognition, understanding, application, highApplication }
      distributionMode, // 'percent' | 'count'
      matrixInput, // optional existing matrix text/schema
      preservedQuestions, // array of teacher's locked questions
    } = config;

    const activeSubject = customSubject?.trim() || subject;

    const systemPrompt = `Bạn là một Chuyên gia Khảo thí và Giáo viên Giỏi hàng đầu Việt Nam, am hiểu sâu sắc Chương trình Giáo dục Phổ thông 2018 (GDPT 2018), các quy định kiểm tra đánh giá của Bộ Giáo dục và Đào tạo (Thông tư 22/2021, Thông tư 27/2020 cho Tiểu học, cấu trúc định dạng đề thi mới nhất).

NHIỆM VỤ: Hãy tạo một bộ CÂU HỎI ĐỀ KIỂM TRA hoàn chỉnh, chuẩn mực sư phạm, kèm ĐÁP ÁN, LỜI GIẢI CHI TIẾT và HƯỚNG DẪN CHẤM BAREM ĐIỂM.
(LƯU Ý HIỆU NĂNG TỐI ĐA: Bạn CHỈ CẦN tạo danh sách câu hỏi 'questions' và thông tin tiêu đề đề thi. Ma trận 'matrix' và bản đặc tả 'specification' sẽ được hệ thống khảo thí tự động tính toán tức thì theo thuật toán toán học chính xác 100% từ các câu hỏi của bạn. Điều này giúp đề thi được tạo siêu tốc dưới 10-15 giây và loại bỏ hoàn toàn sai số điểm số).

NGUYÊN TẮC BẮT BUỘC:
1. ĐÚNG ĐỐI TƯỢNG VÀ CHƯƠNG TRÌNH:
   - Cấp học: ${educationLevel} - Lớp: ${grade}
   - Môn học: ${activeSubject}
   - Lời văn trong sáng, chuẩn mực sư phạm tiếng Việt, phù hợp với lứa tuổi học sinh lớp ${grade}.
2. TUÂN THỦ TÀI LIỆU THAM CHIẾU:
   - Chế độ nguồn: ${referenceSourceMode}
   ${referenceMaterial ? `- Nội dung tài liệu giáo viên cung cấp:\n"""${referenceMaterial.slice(0, 6000)}"""\nƯu tiên tuyệt đối nội dung tài liệu này, không tự bịa thông tin lệch khỏi tài liệu.` : '- Dựa trên chương trình GDPT môn ' + activeSubject + ' lớp ' + grade + '.'}
3. CÁC MÔN ĐẶC THÙ (Toán, KHTN, Lý, Hóa, Sinh, Văn, Lịch sử...):
   - Toán, Khoa học tự nhiên, Vật lí, Hóa học: Công thức chính xác (dùng ký hiệu toán học phổ thông dễ đọc, tránh dùng backslash gãy chuỗi JSON), số liệu thực tế, giải toán ra kết quả đẹp, KHÔNG tạo dữ kiện mâu thuẫn.
   - Ngữ văn, Tiếng Việt: Nếu có ngữ liệu đọc hiểu, trích dẫn đoạn văn chuẩn mực, giàu tính nhân văn.
   - Lịch sử, Địa lí: Tuyệt đối chính xác về niên đại, sự kiện lịch sử, địa danh.
4. PHƯƠNG ÁN NHIỄU TRẮC NGHIỆM:
   - Đủ 4 phương án A, B, C, D hợp lý, cùng loại dữ liệu. Không dùng "Tất cả đều đúng/sai".
5. LỜI GIẢI & BIỂU ĐIỂM SÚC TÍCH (TĂNG TỐC ĐỘ SOẠN ĐỀ):
   - Viết lời giải và biểu điểm ngắn gọn, súc tích (1-2 câu giải thích rõ ràng cho trắc nghiệm, các bước chính cho tự luận). Tránh viết dài dòng để đảm bảo thời gian tạo đề nhanh nhất.
6. CẤU TRÚC VÀ ĐIỂM:
   - Tổng điểm toàn bài: ${totalScore} điểm.
   - Thời gian làm bài: ${durationMinutes} phút.
   - Phân bổ số câu và mức độ theo yêu cầu của giáo viên.
   - Nếu có câu hỏi giáo viên yêu cầu giữ nguyên, phải tích hợp đầy đủ không thay đổi nội dung.`;

    const userPrompt = `Hãy tạo đề kiểm tra với các thông số sau:
- Cấp: ${educationLevel}, Lớp: ${grade}, Môn: ${activeSubject}
- Loại đề: ${examType} (${customExamTitle || ''})
- Thời gian: ${durationMinutes} phút | Thang điểm: ${totalScore}
- Chủ đề/Bài học: ${topic || 'Theo chương trình chuẩn'}
- Chương: ${chapter || 'Toàn diện'}
- Phạm vi kiến thức: ${scope || 'Trọng tâm'}
- Yêu cầu cần đạt: ${learningOutcomes || 'Theo chuẩn kiến thức kỹ năng GDPT 2018'}
- Ghi chú giáo viên: ${specialNotes || 'Không có'}
- Cấu hình số lượng các dạng câu:
  + Trắc nghiệm 4 lựa chọn (multiple_choice): ${questionTypeCounts?.multipleChoice || 0} câu
  + Trắc nghiệm Đúng/Sai (true_false) (mỗi câu gồm 4 ý a,b,c,d): ${questionTypeCounts?.trueFalse || 0} câu
  + Ghép nối (matching): ${questionTypeCounts?.matching || 0} câu
  + Điền khuyết (fill_in_blank): ${questionTypeCounts?.fillInBlank || 0} câu
  + Trả lời ngắn (short_answer): ${questionTypeCounts?.shortAnswer || 0} câu
  + Tự luận (essay): ${questionTypeCounts?.essay || 0} câu
- Phân bổ mức độ (${distributionMode}):
  + Nhận biết: ${levelsDistribution?.recognition}
  + Thông hiểu: ${levelsDistribution?.understanding}
  + Vận dụng: ${levelsDistribution?.application}
  + Vận dụng cao: ${levelsDistribution?.highApplication}
${preservedQuestions && preservedQuestions.length > 0 ? `- CÁC CÂU HỎI GIÁO VIÊN ĐÃ NHẬP (BẮT BUỘC GIỮ NGUYÊN):\n${JSON.stringify(preservedQuestions, null, 2)}` : ''}
${matrixInput ? `- MA TRẬN GIÁO VIÊN CUNG CẤP CẦN TUÂN THỦ:\n${matrixInput}` : ''}

Trả về định dạng JSON hợp lệ tuân thủ schema quy định.`;

    const response = await generateContentWithRetry({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 6144,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examTitle: { type: Type.STRING },
            schoolName: { type: Type.STRING },
            departmentName: { type: Type.STRING },
            grade: { type: Type.STRING },
            subject: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            totalScore: { type: Type.NUMBER },
            schoolYear: { type: Type.STRING },
            examInstructions: { type: Type.STRING },
            readingPassage: { type: Type.STRING, description: 'Đoạn trích/ngữ liệu đọc hiểu nếu môn Văn/Ngoại ngữ có, hoặc để trống' },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  number: { type: Type.NUMBER },
                  part: { type: Type.STRING, description: 'Phần I, Phần II, Phần III, hoặc Tự luận' },
                  type: {
                    type: Type.STRING,
                    description: 'multiple_choice | true_false | matching | fill_in_blank | short_answer | essay',
                  },
                  level: {
                    type: Type.STRING,
                    description: 'recognition | understanding | application | high_application',
                  },
                  topic: { type: Type.STRING },
                  subTopic: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '4 lựa chọn cho multiple_choice (A, B, C, D) hoặc để trống nếu tự luận',
                  },
                  subQuestions: {
                    type: Type.ARRAY,
                    description: 'Dành cho dạng Đúng/Sai (gồm 4 ý a, b, c, d) hoặc Ghép nối',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        statement: { type: Type.STRING },
                        correctAnswer: { type: Type.STRING },
                      },
                    },
                  },
                  correctAnswer: { type: Type.STRING, description: 'Đáp án đúng (A/B/C/D hoặc câu trả lời ngắn)' },
                  explanation: { type: Type.STRING, description: 'Lời giải chi tiết từng bước' },
                  score: { type: Type.NUMBER },
                  criteria: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        step: { type: Type.STRING },
                        points: { type: Type.NUMBER },
                      },
                    },
                    description: 'Biểu điểm chi tiết cho câu tự luận',
                  },
                  needsTeacherReview: { type: Type.BOOLEAN },
                  reviewNote: { type: Type.STRING },
                },
                required: ['id', 'number', 'type', 'level', 'questionText', 'score', 'explanation'],
              },
            },
          },
          required: ['examTitle', 'questions'],
        },
      },
    });

    const rawResponseText = response.text || '';
    if (!rawResponseText.trim()) {
      throw new Error('Máy chủ AI phản hồi chuỗi rỗng. Vui lòng bấm thử lại.');
    }

    const examData = cleanAndParseJSON(rawResponseText);

    // Ensure questions array exists and has valid values
    if (!Array.isArray(examData.questions)) {
      examData.questions = [];
    }

    examData.questions = examData.questions.map((q: any, idx: number) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${idx + 1}`,
      number: typeof q.number === 'number' && q.number > 0 ? q.number : idx + 1,
      type: q.type || 'multiple_choice',
      level: q.level || 'recognition',
      topic: q.topic || topic || 'Nội dung kiến thức trọng tâm',
      score: Number(q.score) || (q.type === 'essay' ? 1 : 0.5),
      questionText: q.questionText || '',
      options: Array.isArray(q.options) ? q.options : [],
      explanation: q.explanation || '',
    }));

    // Instantly calculate exact, mathematically flawless matrix and specification
    const safeTotalScore = Number(totalScore) || Number(examData.totalScore) || 10;
    examData.totalScore = safeTotalScore;
    examData.durationMinutes = Number(durationMinutes) || Number(examData.durationMinutes) || 45;

    try {
      examData.matrix = calculateMatrixFromQuestions(examData.questions, safeTotalScore);
      examData.specification = generateSpecificationFromQuestions(examData.questions);
    } catch (matrixErr) {
      console.warn('Lỗi nhẹ khi tính ma trận đề thi (đã bỏ qua):', matrixErr);
    }

    return res.json({ success: true, exam: examData });
  } catch (error: any) {
    console.error('Error generating exam:', error);
    const errDetail = parseToVietnameseError(error);
    return res.status(500).json({
      success: false,
      error: `${errDetail.title}: ${errDetail.reason}`,
      errorDetail: errDetail,
    });
  }
});

// Single question regeneration
app.post('/api/regenerate-question', async (req: Request, res: Response) => {
  try {
    const { currentQuestion, subject, grade, topic, educationLevel, referenceMaterial } = req.body;

    const systemPrompt = `Bạn là giáo viên chuyên môn giỏi môn ${subject} lớp ${grade} (${educationLevel}).
Nhiệm vụ: Tạo một câu hỏi mới thay thế cho câu hỏi cũ, đảm bảo đúng chuẩn chương trình, lời giải rõ ràng và không trùng lặp.`;

    const userPrompt = `Hãy tạo một CÂU HỎI MỚI để THAY THẾ cho câu hỏi sau nhưng giữ nguyên:
- Mức độ tư duy: ${currentQuestion.level}
- Dạng câu: ${currentQuestion.type}
- Chủ đề: ${topic || currentQuestion.topic || 'Kiến thức bài học'}
- Điểm số: ${currentQuestion.score} điểm

Câu hỏi cũ cần thay thế:
"""${currentQuestion.questionText}"""

${referenceMaterial ? `Tài liệu tham chiếu:\n"""${referenceMaterial.slice(0, 3000)}"""` : ''}

Yêu cầu:
- Câu hỏi mới phải khác biệt, chính xác tuyệt đối, có đáp án và lời giải chi tiết.
- Trả về đúng JSON cấu trúc câu hỏi.`;

    const response = await generateContentWithRetry({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2048,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            questionText: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            subQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  statement: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                },
              },
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            score: { type: Type.NUMBER },
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                },
              },
            },
            needsTeacherReview: { type: Type.BOOLEAN },
            reviewNote: { type: Type.STRING },
          },
          required: ['questionText', 'explanation'],
        },
      },
    });

    const newQuestion = cleanAndParseJSON(response.text || '{}');
    newQuestion.id = currentQuestion.id || `q_${Date.now()}`;
    newQuestion.number = currentQuestion.number;
    newQuestion.type = currentQuestion.type;
    newQuestion.level = currentQuestion.level;
    newQuestion.part = currentQuestion.part;
    newQuestion.score = currentQuestion.score;

    return res.json({ success: true, question: newQuestion });
  } catch (error: any) {
    console.error('Error regenerating question:', error);
    const errDetail = parseToVietnameseError(error);
    return res.status(500).json({
      success: false,
      error: `${errDetail.title}: ${errDetail.reason}`,
      errorDetail: errDetail,
    });
  }
});

// Analyze document / reference material endpoint
app.post('/api/analyze-document', async (req: Request, res: Response) => {
  try {
    const { documentText, subject, grade } = req.body;
    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Chưa có nội dung văn bản để phân tích.',
        errorDetail: {
          title: 'Chưa có tài liệu tham chiếu',
          reason: 'Ô nhập tài liệu tham chiếu hiện đang để trống.',
          solution: 'Vui lòng dán văn bản bài học hoặc tải tệp tài liệu trước khi nhấn nút "Phân tích tài liệu".',
          targetSection: 'referenceMaterial',
        },
      });
    }

    const prompt = `Phân tích văn bản/tài liệu giáo khoa sau đây dành cho môn ${subject || 'chuyên đề'} lớp ${grade || 'phổ thông'}:
"""${documentText.slice(0, 10000)}"""

Hãy trích xuất:
1. Danh sách chủ đề / bài học trọng tâm
2. Các yêu cầu cần đạt (chuẩn kiến thức, kỹ năng)
3. Các dạng câu hỏi phù hợp nhất có thể kiểm tra từ tài liệu này
4. Gợi ý ma trận đề (tỷ lệ Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)`;

    const response = await generateContentWithRetry({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        maxOutputTokens: 2048,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedQuestionTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedMatrix: {
              type: Type.OBJECT,
              properties: {
                recognitionPercent: { type: Type.NUMBER },
                understandingPercent: { type: Type.NUMBER },
                applicationPercent: { type: Type.NUMBER },
                highApplicationPercent: { type: Type.NUMBER },
              },
            },
            summary: { type: Type.STRING },
          },
          required: ['topics', 'outcomes'],
        },
      },
    });

    const analysis = cleanAndParseJSON(response.text || '{}');
    return res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    const errDetail = parseToVietnameseError(error);
    return res.status(500).json({
      success: false,
      error: `${errDetail.title}: ${errDetail.reason}`,
      errorDetail: errDetail,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

startServer();
