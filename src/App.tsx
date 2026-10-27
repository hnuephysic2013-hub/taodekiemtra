import React, { useState, useEffect } from 'react';
import {
  ExamConfig,
  ExamData,
  ExamVariant,
  Question,
  EducationLevel,
} from './types/exam';
import { INITIAL_SAMPLE_EXAM } from './utils/sampleData';
import { generateExamVariants } from './utils/variantGenerator';
import { calculateMatrixFromQuestions, generateSpecificationFromQuestions } from './utils/matrixHelper';
import { performQualityAudit, QAReport } from './utils/qaChecker';
import { Header } from './components/Header';
import { ExamSetupPanel } from './components/ExamSetupPanel';
import { ExamPreview } from './components/ExamPreview';
import { ProgressOverlay } from './components/ProgressOverlay';
import { EditQuestionModal } from './components/EditQuestionModal';
import { QualityAuditModal } from './components/QualityAuditModal';
import { QuestionBankModal } from './components/QuestionBankModal';
import { SavedExamsModal } from './components/SavedExamsModal';
import { ErrorNotificationModal, ErrorModalData } from './components/ErrorNotificationModal';

const DEFAULT_CONFIG: ExamConfig = {
  educationLevel: 'thcs',
  grade: '8',
  subject: 'Khoa học tự nhiên',
  customSubject: '',
  examType: 'Kiểm tra định kỳ Giữa Học kỳ I',
  customExamTitle: 'ĐỀ KIỂM TRA ĐỊNH KỲ GIỮA HỌC KỲ I',
  schoolName: 'Trường THCS Thái Hòa',
  departmentName: 'UBND Phường Thái Hòa',
  schoolYear: '2026 - 2027',
  durationMinutes: 60,
  totalScore: 10,
  topic: 'Chất và sự biến đổi của chất, Khối lượng riêng & Áp suất, Hệ vận động và Tiêu hóa ở người',
  chapter: 'Chủ đề: Chất và sự biến đổi của chất - Lực và chuyển động - Cơ thể người',
  scope: 'Kiến thức trọng tâm giữa học kỳ I (Khoa học tự nhiên 8 - GDPT 2018)',
  learningOutcomes: 'Nhận biết biến đổi hóa học, tính mol và nồng độ dung dịch; hiểu tác dụng của áp suất và lực đẩy Archimedes; vận dụng kiến thức dinh dưỡng và vệ sinh hệ vận động để bảo vệ sức khỏe.',
  specialNotes: '',
  referenceMaterial: '',
  referenceSourceMode: 'upload_and_gdpt',
  questionTypeCounts: {
    multipleChoice: 4,
    trueFalse: 1,
    matching: 0,
    fillInBlank: 0,
    shortAnswer: 1,
    essay: 2,
  },
  levelsDistribution: {
    recognition: 30,
    understanding: 30,
    application: 25,
    highApplication: 15,
  },
  distributionMode: 'percent',
  matrixInput: '',
  preservedQuestions: [],
  variantCount: 4,
};

export default function App() {
  // Config state with localStorage persistence (Prompt item 24)
  const [config, setConfig] = useState<ExamConfig>(() => {
    try {
      const saved = localStorage.getItem('viet_exam_ai_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically migrate previous default Math grade 10 exam to KHTN grade 8
        if (parsed.subject === 'Toán học' && (parsed.grade === '10' || parsed.educationLevel === 'thpt')) {
          return DEFAULT_CONFIG;
        }
        if (!parsed.schoolName || parsed.schoolName === 'TRƯỜNG THPT LÊ QUÝ ĐÔN') {
          parsed.schoolName = 'Trường THCS Thái Hòa';
        }
        if (!parsed.departmentName || parsed.departmentName === 'SỞ GIÁO DỤC VÀ ĐÀO TẠO' || parsed.departmentName === 'Sở/Phòng văn hóa') {
          parsed.departmentName = 'UBND Phường Thái Hòa';
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIG;
  });

  // Current Exam Data
  const [exam, setExam] = useState<ExamData>(() => {
    try {
      const saved = localStorage.getItem('viet_exam_ai_current_exam');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically migrate previous sample Math grade 10 exam to KHTN grade 8
        if (parsed.id === 'sample_toan_10' || (parsed.subject === 'Toán học' && parsed.grade === '10')) {
          return INITIAL_SAMPLE_EXAM;
        }
        if (!parsed.schoolName || parsed.schoolName === 'TRƯỜNG THPT LÊ QUÝ ĐÔN') {
          parsed.schoolName = 'Trường THCS Thái Hòa';
        }
        if (!parsed.departmentName || parsed.departmentName === 'SỞ GIÁO DỤC VÀ ĐÀO TẠO' || parsed.departmentName === 'Sở/Phòng văn hóa') {
          parsed.departmentName = 'UBND Phường Thái Hòa';
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SAMPLE_EXAM;
  });

  // Exam Variants (101, 102, 103, 104)
  const [variants, setVariants] = useState<ExamVariant[]>(() => {
    return generateExamVariants(INITIAL_SAMPLE_EXAM.questions, DEFAULT_CONFIG.variantCount);
  });
  const [selectedVariantCode, setSelectedVariantCode] = useState<string>('101');

  // Question Bank with localStorage persistence (Prompt item 18)
  const [questionBank, setQuestionBank] = useState<(Question & { savedSubject?: string; savedGrade?: string; savedAt?: string })[]>(() => {
    try {
      const saved = localStorage.getItem('viet_exam_ai_question_bank');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Saved Exams History with localStorage persistence
  const [savedExams, setSavedExams] = useState<ExamData[]>(() => {
    try {
      const saved = localStorage.getItem('viet_exam_ai_saved_exams');
      if (saved) {
        const list: ExamData[] = JSON.parse(saved);
        return list.map((item) =>
          item.id === 'sample_toan_10' || (item.subject === 'Toán học' && item.grade === '10')
            ? INITIAL_SAMPLE_EXAM
            : item
        );
      }
    } catch (e) {
      console.error(e);
    }
    return [INITIAL_SAMPLE_EXAM];
  });

  // UI Modal States
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQAModal, setShowQAModal] = useState(false);
  const [qaReport, setQAReport] = useState<QAReport | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, string[]>>({});
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModalData | null>(null);

  // Sync config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('viet_exam_ai_config', JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Sync current exam to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('viet_exam_ai_current_exam', JSON.stringify(exam));
    } catch (e) {
      console.error(e);
    }
  }, [exam]);

  // Sync question bank to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('viet_exam_ai_question_bank', JSON.stringify(questionBank));
    } catch (e) {
      console.error(e);
    }
  }, [questionBank]);

  // Sync saved exams to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('viet_exam_ai_saved_exams', JSON.stringify(savedExams));
    } catch (e) {
      console.error(e);
    }
  }, [savedExams]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reset config to defaults
  const handleResetConfig = () => {
    if (window.confirm('Khôi phục lại toàn bộ thiết lập về giá trị mặc định?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.removeItem('viet_exam_ai_config');
      showToast('Đã khôi phục thiết lập mặc định.');
    }
  };

  // Generate full exam via API call
  const handleGenerateExam = async () => {
    // 1. Kiểm tra số lượng câu hỏi
    const totalQuestionCount =
      (config.questionTypeCounts.multipleChoice || 0) +
      (config.questionTypeCounts.trueFalse || 0) +
      (config.questionTypeCounts.matching || 0) +
      (config.questionTypeCounts.fillInBlank || 0) +
      (config.questionTypeCounts.shortAnswer || 0) +
      (config.questionTypeCounts.essay || 0);

    if (totalQuestionCount === 0) {
      setHighlightedSection('questionTypes');
      setErrorModal({
        title: 'Chưa thiết lập số lượng câu hỏi',
        reason: 'Đề thi hiện có 0 câu hỏi do thầy/cô chưa nhập số lượng cho bất kỳ dạng câu nào.',
        solution:
          '1. Cuộn xuống mục "Bước 6: Hình Thức Câu Hỏi" ở cột bên trái.\n2. Nhập số lượng câu hỏi mong muốn (Ví dụ: Trắc nghiệm: 12 câu, Tự luận: 2 câu).\n3. Sau đó nhấn lại nút "✨ TẠO ĐỀ KIỂM TRA AI".',
        targetSection: 'questionTypes',
      });
      return;
    }

    // 2. Kiểm tra tỷ lệ % ma trận
    const totalPercent =
      Number(config.levelsDistribution.recognition) +
      Number(config.levelsDistribution.understanding) +
      Number(config.levelsDistribution.application) +
      Number(config.levelsDistribution.highApplication);

    if (config.distributionMode === 'percent' && totalPercent !== 100) {
      setHighlightedSection('levelsDistribution');
      setErrorModal({
        title: 'Tổng tỷ lệ ma trận chưa bằng 100%',
        reason: `Tổng tỷ lệ 4 mức độ nhận thức hiện đang là ${totalPercent}%, không đạt chuẩn 100% của ma trận đề thi.`,
        solution:
          '1. Xem mục "Thiết Lập 4 Mức Độ Nhận Thức" ở cột bên trái.\n2. Cân chỉnh lại % của 4 mức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) sao cho tổng vừa đúng 100%.\n3. Hoặc bấm chọn nhanh một trong các "Mẫu nhanh" (như Chuẩn 70-30 hoặc 50-50).',
        targetSection: 'levelsDistribution',
      });
      return;
    }

    // 3. Kiểm tra thông tin nội dung đề thi
    if (!config.topic?.trim() && !config.referenceMaterial?.trim()) {
      setHighlightedSection('topic');
      setErrorModal({
        title: 'Chưa có tên bài học hoặc tài liệu tham chiếu',
        reason: 'Hệ thống AI cần biết nội dung kiến thức bài học hoặc tài liệu cụ thể để biên soạn đề thi chính xác theo chương trình.',
        solution:
          '1. Nhập tên bài học / chủ đề tại "Bước 5: Nội Dung Kiến Thức" (ví dụ: Chuyển động biến đổi đều, Phân số và các phép tính...).\n2. Hoặc dán nội dung bài học vào ô "📁 TÀI LIỆU THAM CHIẾU" phía dưới.',
        targetSection: 'topic',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (_jsonErr) {
        if (!response.ok) {
          throw new Error(
            response.status === 504 || response.status === 408
              ? 'Thời gian máy chủ AI phản hồi quá thời hạn cho phép (Timeout).'
              : `Máy chủ phản hồi mã lỗi ${response.status}. Vui lòng thử lại.`
          );
        }
      }

      if (!data || !data.success || !data.exam) {
        if (data?.errorDetail) {
          if (data.errorDetail.targetSection) {
            setHighlightedSection(data.errorDetail.targetSection);
          }
          setErrorModal({
            ...data.errorDetail,
            onRetry: handleGenerateExam,
          });
        } else {
          setErrorModal({
            title: 'Không thể tạo đề kiểm tra lúc này',
            reason: data?.error || 'Máy chủ AI không phản hồi dữ liệu đề thi hợp lệ.',
            solution:
              '1. Bấm nút "Thử lại ngay" để hệ thống gửi lại yêu cầu.\n2. Nếu đang tạo đề có quá nhiều câu hỏi (>20 câu), hãy giảm bớt 2-3 câu để máy chủ phản hồi tức thì.\n3. Kiểm tra xem tài liệu tham chiếu có bị quá dài hay không.',
            onRetry: handleGenerateExam,
          });
        }
        return;
      }

      const generated: ExamData = {
        ...data.exam,
        id: `exam_${Date.now()}`,
        createdAt: new Date().toISOString(),
        schoolName: config.schoolName || data.exam.schoolName,
        departmentName: config.departmentName || data.exam.departmentName,
        schoolYear: config.schoolYear || data.exam.schoolYear,
        educationLevel: config.educationLevel,
        grade: config.grade,
        subject: config.customSubject?.trim() || config.subject,
        durationMinutes: config.durationMinutes,
        totalScore: config.totalScore,
      };

      // Ensure matrix and specification are fully aligned
      if (!generated.matrix || !generated.matrix.rows || generated.matrix.rows.length === 0) {
        generated.matrix = calculateMatrixFromQuestions(generated.questions, generated.totalScore);
      }
      if (!generated.specification || generated.specification.length === 0) {
        generated.specification = generateSpecificationFromQuestions(generated.questions);
      }

      setExam(generated);

      // Generate multi-code variants
      const newVariants = generateExamVariants(generated.questions, config.variantCount);
      setVariants(newVariants);
      setSelectedVariantCode('101');

      // Auto run QA
      const audit = performQualityAudit(generated, config);
      setQAReport(audit);
      setHighlightedSection(null);

      showToast('✅ Tạo đề kiểm tra và ma trận thành công!');
    } catch (error: any) {
      console.error(error);
      const isTimeout =
        error.message?.includes('Timeout') ||
        error.message?.includes('timeout') ||
        error.message?.includes('quá thời hạn') ||
        error.message?.includes('fetch failed');

      if (isTimeout) {
        setHighlightedSection('questionTypes');
      }

      setErrorModal({
        title: isTimeout ? 'Thời gian máy chủ phản hồi quá hạn (Timeout)' : 'Lỗi kết nối khi gửi yêu cầu đến máy chủ AI',
        reason: isTimeout
          ? 'Quá trình biên soạn đề thi kéo dài hơn thời gian chờ của đường truyền mạng hoặc máy chủ AI phản hồi chậm.'
          : 'Đường truyền mạng Internet bị gián đoạn: ' + (error.message || 'Lỗi mạng'),
        solution:
          '1. Hệ thống đã kích hoạt cơ chế sinh đề siêu tốc (dưới 15s). Thầy/cô chỉ cần bấm nút "Thử lại ngay".\n2. Nếu số lượng câu hỏi đang đặt lớn (>20 câu), hãy giảm bớt 2-3 câu để máy chủ xử lý nhanh nhất.\n3. Kiểm tra lại đường truyền mạng Wifi/4G của thiết bị.',
        technicalInfo: error.stack || error.message,
        targetSection: isTimeout ? 'questionTypes' : undefined,
        onRetry: handleGenerateExam,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate equivalent test (Keep matrix & points, regenerate questions)
  const handleGenerateEquivalent = async () => {
    setIsGenerating(true);
    try {
      const equivConfig = {
        ...config,
        specialNotes: (config.specialNotes || '') + ' [YÊU CẦU: Tạo đề tương đương với đề trước, đổi số liệu hoặc ngữ cảnh mới nhưng giữ nguyên ma trận và chuẩn kiến thức]',
      };

      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equivConfig),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (_jsonErr) {
        if (!response.ok) {
          throw new Error(
            response.status === 504 || response.status === 408
              ? 'Thời gian máy chủ AI phản hồi quá thời hạn cho phép (Timeout).'
              : `Máy chủ phản hồi mã lỗi ${response.status}.`
          );
        }
      }

      if (!data || !data.success || !data.exam) {
        if (data?.errorDetail) {
          setErrorModal({
            ...data.errorDetail,
            onRetry: handleGenerateEquivalent,
          });
        } else {
          setErrorModal({
            title: 'Lỗi khi tạo đề tương đương',
            reason: data?.error || 'Máy chủ AI chưa phản hồi đề tương đương.',
            solution:
              '1. Nhấn nút "Thử lại ngay" để gửi lại yêu cầu.\n2. Đảm bảo kết nối mạng ổn định trong suốt quá trình tạo đề.',
            onRetry: handleGenerateEquivalent,
          });
        }
        return;
      }

      const equivExam: ExamData = {
        ...data.exam,
        id: `exam_equiv_${Date.now()}`,
        createdAt: new Date().toISOString(),
        examTitle: `${exam.examTitle} (ĐỀ TƯƠNG ĐƯƠNG / CA 2)`,
        schoolName: config.schoolName,
        departmentName: config.departmentName,
        schoolYear: config.schoolYear,
        educationLevel: config.educationLevel,
        grade: config.grade,
        subject: config.customSubject?.trim() || config.subject,
        durationMinutes: config.durationMinutes,
        totalScore: config.totalScore,
      };

      equivExam.matrix = calculateMatrixFromQuestions(equivExam.questions, equivExam.totalScore);
      equivExam.specification = generateSpecificationFromQuestions(equivExam.questions);

      setExam(equivExam);
      const newVariants = generateExamVariants(equivExam.questions, config.variantCount);
      setVariants(newVariants);
      setSelectedVariantCode('101');
      showToast('🧠 Đã tạo thành công đề thi tương đương!');
    } catch (error: any) {
      console.error(error);
      setErrorModal({
        title: 'Lỗi khi tạo đề tương đương',
        reason: 'Không thể kết nối đến máy chủ AI: ' + (error.message || 'Lỗi mạng'),
        solution:
          '1. Nhấn nút "Thử lại ngay" sau vài giây.\n2. Kiểm tra lại kết nối mạng Internet của thiết bị.',
        technicalInfo: error.stack || error.message,
        onRetry: handleGenerateEquivalent,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate matrix only based on settings
  const handleGenerateMatrixOnly = () => {
    const calculatedMatrix = calculateMatrixFromQuestions(exam.questions, exam.totalScore);
    const calculatedSpec = generateSpecificationFromQuestions(exam.questions);
    setExam({
      ...exam,
      matrix: calculatedMatrix,
      specification: calculatedSpec,
    });
    showToast('📊 Đã cập nhật ma trận đề và bản đặc tả!');
  };

  // Regenerate a single question (Prompt item 19)
  const handleRegenerateSingleQuestion = async (q: Question) => {
    setRegeneratingQuestionId(q.id);
    try {
      const response = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQuestion: q,
          subject: exam.subject,
          grade: exam.grade,
          topic: q.topic || config.topic,
          educationLevel: exam.educationLevel,
          referenceMaterial: config.referenceMaterial,
        }),
      });

      const data = await response.json();
      if (!data.success || !data.question) {
        if (data.errorDetail) {
          setErrorModal({
            ...data.errorDetail,
            onRetry: () => handleRegenerateSingleQuestion(q),
          });
        } else {
          setErrorModal({
            title: `Không thể tạo lại Câu ${q.number}`,
            reason: data.error || 'Máy chủ AI không thể tạo câu hỏi thay thế lúc này.',
            solution:
              '1. Bấm nút "Thử lại ngay" để AI thử tạo lại câu hỏi.\n2. Hoặc bấm nút "✏️ Sửa" trên thanh công cụ của câu hỏi để tự nhập nội dung theo ý muốn.',
            onRetry: () => handleRegenerateSingleQuestion(q),
          });
        }
        return;
      }

      const updatedQuestions = exam.questions.map((oldQ) =>
        oldQ.id === q.id ? { ...data.question, id: q.id, number: q.number, score: q.score } : oldQ
      );

      const updatedExam = {
        ...exam,
        questions: updatedQuestions,
        matrix: calculateMatrixFromQuestions(updatedQuestions, exam.totalScore),
        specification: generateSpecificationFromQuestions(updatedQuestions),
      };

      setExam(updatedExam);
      setVariants(generateExamVariants(updatedQuestions, config.variantCount));
      showToast(`🔄 Đã đổi mới nội dung Câu ${q.number}!`);
    } catch (error: any) {
      console.error(error);
      setErrorModal({
        title: `Lỗi khi tạo lại Câu ${q.number}`,
        reason: 'Không thể kết nối đến máy chủ AI: ' + (error.message || 'Lỗi mạng'),
        solution:
          '1. Nhấn nút "Thử lại ngay" sau vài giây.\n2. Hoặc bấm nút "✏️ Sửa" để chỉnh sửa câu hỏi trực tiếp bằng tay.',
        technicalInfo: error.stack || error.message,
        onRetry: () => handleRegenerateSingleQuestion(q),
      });
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  // Update question from modal
  const handleSaveQuestion = (updated: Question) => {
    const updatedList = exam.questions.map((q) => (q.id === updated.id ? updated : q));
    const updatedExam = {
      ...exam,
      questions: updatedList,
      matrix: calculateMatrixFromQuestions(updatedList, exam.totalScore),
      specification: generateSpecificationFromQuestions(updatedList),
    };
    setExam(updatedExam);
    setVariants(generateExamVariants(updatedList, config.variantCount));
    setEditingQuestion(null);
    showToast(`✏️ Đã cập nhật Câu ${updated.number}`);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?')) return;
    const filtered = exam.questions
      .filter((q) => q.id !== id)
      .map((q, idx) => ({ ...q, number: idx + 1 }));

    const updatedExam = {
      ...exam,
      questions: filtered,
      matrix: calculateMatrixFromQuestions(filtered, exam.totalScore),
      specification: generateSpecificationFromQuestions(filtered),
    };
    setExam(updatedExam);
    setVariants(generateExamVariants(filtered, config.variantCount));
    showToast('🗑 Đã xóa câu hỏi và đánh lại số thứ tự.');
  };

  // Add question at position
  const handleAddQuestion = (insertIndex: number) => {
    const newQ: Question = {
      id: `q_user_${Date.now()}`,
      number: insertIndex + 1,
      type: 'multiple_choice',
      level: 'understanding',
      topic: config.topic || 'Nội dung kiến thức bổ sung',
      questionText: 'Nhập nội dung câu hỏi mới tại đây...',
      options: ['A. Phương án A', 'B. Phương án B', 'C. Phương án C', 'D. Phương án D'],
      correctAnswer: 'A',
      explanation: 'Giải thích chi tiết phương án A đúng...',
      score: 0.5,
    };

    const updatedList = [...exam.questions];
    updatedList.splice(insertIndex, 0, newQ);
    const renumbered = updatedList.map((q, idx) => ({ ...q, number: idx + 1 }));

    const updatedExam = {
      ...exam,
      questions: renumbered,
      matrix: calculateMatrixFromQuestions(renumbered, exam.totalScore),
      specification: generateSpecificationFromQuestions(renumbered),
    };
    setExam(updatedExam);
    setVariants(generateExamVariants(renumbered, config.variantCount));
    setEditingQuestion(newQ);
  };

  // Move question up or down
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exam.questions.length) return;

    const newList = [...exam.questions];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const renumbered = newList.map((q, idx) => ({ ...q, number: idx + 1 }));
    setExam({
      ...exam,
      questions: renumbered,
    });
    setVariants(generateExamVariants(renumbered, config.variantCount));
  };

  // Save question to Bank
  const handleSaveQuestionToBank = (q: Question) => {
    const isAlready = questionBank.some((item) => item.id === q.id);
    if (isAlready) {
      showToast('Câu hỏi này đã có trong Ngân hàng câu hỏi.');
      return;
    }
    const bankItem = {
      ...q,
      savedSubject: exam.subject,
      savedGrade: exam.grade,
      savedAt: new Date().toLocaleDateString('vi-VN'),
    };
    setQuestionBank([bankItem, ...questionBank]);
    showToast(`💾 Đã lưu Câu ${q.number} vào Ngân hàng câu hỏi!`);
  };

  // Insert question from bank to current exam
  const handleInsertFromBank = (q: Question) => {
    const newQ: Question = {
      ...q,
      id: `q_bank_${Date.now()}`,
      number: exam.questions.length + 1,
    };
    const updated = [...exam.questions, newQ];
    setExam({
      ...exam,
      questions: updated,
      matrix: calculateMatrixFromQuestions(updated, exam.totalScore),
      specification: generateSpecificationFromQuestions(updated),
    });
    setVariants(generateExamVariants(updated, config.variantCount));
    showToast(`Đã thêm câu hỏi từ Ngân hàng vào đề (Câu ${newQ.number})`);
  };

  // Save current exam to history
  const handleSaveExam = () => {
    const existingIdx = savedExams.findIndex((e) => e.id === exam.id);
    let updatedHistory: ExamData[];
    if (existingIdx >= 0) {
      updatedHistory = savedExams.map((e, idx) => (idx === existingIdx ? exam : e));
    } else {
      updatedHistory = [{ ...exam, id: exam.id || `exam_${Date.now()}`, createdAt: new Date().toISOString() }, ...savedExams];
    }
    setSavedExams(updatedHistory);
    showToast('💾 Đã lưu đề thi vào kho lưu trữ cá nhân!');
  };

  // Open QA modal
  const handleOpenQA = () => {
    const report = performQualityAudit(exam, config);
    setQAReport(report);
    setShowQAModal(true);
  };

  // Red error highlighting handlers
  const handleHighlightQuestion = (qId: string, reason: string, allIds?: string[]) => {
    const map: Record<string, string[]> = { ...flaggedQuestions };
    if (allIds && allIds.length > 0) {
      allIds.forEach((id) => {
        if (!map[id]) map[id] = [];
        if (!map[id].includes(reason)) map[id].push(reason);
      });
    } else {
      if (!map[qId]) map[qId] = [];
      if (!map[qId].includes(reason)) map[qId].push(reason);
    }
    setFlaggedQuestions(map);
    setFocusedQuestionId(qId);
    setShowQAModal(false);
    setTimeout(() => {
      const el = document.getElementById(`question-card-${qId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    showToast(`🔴 Đã bôi đỏ các câu hỏi bị lỗi trên đề thi để giáo viên rà soát.`);
  };

  const handleHighlightAllErrors = () => {
    if (!qaReport) return;
    setFlaggedQuestions(qaReport.allFlaggedQuestionIds);
    const firstId = Object.keys(qaReport.allFlaggedQuestionIds)[0];
    if (firstId) {
      setFocusedQuestionId(firstId);
      setTimeout(() => {
        const el = document.getElementById(`question-card-${firstId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
    setShowQAModal(false);
    showToast(`🔴 Đã bôi đỏ toàn bộ các khu vực phát hiện lỗi trong đề thi.`);
  };

  const handleHighlightSection = (sectionKey: string) => {
    setHighlightedSection(sectionKey);
    setShowQAModal(false);
    setTimeout(() => {
      const el = document.getElementById(`setup-section-${sectionKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    showToast(`🔴 Đã chuyển tới và bôi đỏ khu vực thiết lập cần chỉnh sửa.`);
  };

  // Auto rebalance points
  const handleAutoRebalancePoints = () => {
    const count = exam.questions.length;
    if (count === 0) return;

    // Separate multiple choice vs essay
    const mcQuestions = exam.questions.filter((q) => q.type !== 'essay');
    const essayQuestions = exam.questions.filter((q) => q.type === 'essay');

    let updatedQuestions: Question[] = [];

    if (essayQuestions.length === 0) {
      // All MC: divide totalScore evenly
      const ptPerQ = Number((exam.totalScore / count).toFixed(2));
      let currentSum = 0;
      updatedQuestions = exam.questions.map((q, idx) => {
        if (idx === count - 1) {
          const lastPt = Number((exam.totalScore - currentSum).toFixed(2));
          return { ...q, score: lastPt };
        }
        currentSum += ptPerQ;
        return { ...q, score: ptPerQ };
      });
    } else {
      // 70% MC, 30% Essay or balanced
      const mcTotal = Number((exam.totalScore * 0.6).toFixed(2));
      const essayTotal = Number((exam.totalScore - mcTotal).toFixed(2));

      const mcPt = mcQuestions.length > 0 ? Number((mcTotal / mcQuestions.length).toFixed(2)) : 0;
      const essayPt = essayQuestions.length > 0 ? Number((essayTotal / essayQuestions.length).toFixed(2)) : 0;

      updatedQuestions = exam.questions.map((q) => {
        if (q.type === 'essay') {
          return { ...q, score: essayPt };
        }
        return { ...q, score: mcPt };
      });
    }

    const updatedExam = {
      ...exam,
      questions: updatedQuestions,
      matrix: calculateMatrixFromQuestions(updatedQuestions, exam.totalScore),
      specification: generateSpecificationFromQuestions(updatedQuestions),
    };
    setExam(updatedExam);
    setVariants(generateExamVariants(updatedQuestions, config.variantCount));
    setShowQAModal(false);
    showToast('⚖️ Đã tự động cân bằng lại điểm cho tròn thang điểm!');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-800 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <Header
        onOpenBank={() => setShowBankModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onResetConfig={handleResetConfig}
        bankCount={questionBank.length}
        historyCount={savedExams.length}
      />

      {/* Main Workspace Layout (2 Columns) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exam Setup Panel (5 Cols on large screens) */}
        <div className="lg:col-span-5 xl:col-span-4 print:hidden">
          <ExamSetupPanel
            config={config}
            onChangeConfig={setConfig}
            onGenerateExam={handleGenerateExam}
            onGenerateEquivalent={handleGenerateEquivalent}
            onGenerateMatrixOnly={handleGenerateMatrixOnly}
            onError={setErrorModal}
            isGenerating={isGenerating}
          />
        </div>

        {/* Right Column: Live Exam Preview & Tabs (7 Cols on large screens) */}
        <div className="lg:col-span-7 xl:col-span-8 print:w-full print:col-span-12">
          <ExamPreview
            exam={exam}
            variants={variants}
            selectedVariantCode={selectedVariantCode}
            onSelectVariant={setSelectedVariantCode}
            onUpdateQuestion={handleSaveQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onAddQuestion={handleAddQuestion}
            onMoveQuestion={handleMoveQuestion}
            onRegenerateSingleQuestion={handleRegenerateSingleQuestion}
            onSaveQuestionToBank={handleSaveQuestionToBank}
            onOpenEditModal={(q) => setEditingQuestion(q)}
            onOpenQAModal={handleOpenQA}
            onSaveExam={handleSaveExam}
            onRegenerateAll={handleGenerateExam}
            onGenerateEquivalent={handleGenerateEquivalent}
            isRegeneratingQuestionId={regeneratingQuestionId}
          />
        </div>
      </main>

      {/* 7-Step Progress Overlay during AI generation */}
      <ProgressOverlay isOpen={isGenerating} />

      {/* Edit Question Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {/* 12-Criteria QA Checklist Modal */}
      {showQAModal && qaReport && (
        <QualityAuditModal
          report={qaReport}
          onClose={() => setShowQAModal(false)}
          onAutoRebalancePoints={handleAutoRebalancePoints}
        />
      )}

      {/* Question Bank Modal */}
      {showBankModal && (
        <QuestionBankModal
          bank={questionBank}
          onInsertToExam={handleInsertFromBank}
          onDeleteFromBank={(id) => setQuestionBank(questionBank.filter((q) => q.id !== id))}
          onClearBank={() => setQuestionBank([])}
          onClose={() => setShowBankModal(false)}
        />
      )}

      {/* Saved Exams History Modal */}
      {showHistoryModal && (
        <SavedExamsModal
          savedExams={savedExams}
          onLoadExam={(loaded) => {
            setExam(loaded);
            setVariants(generateExamVariants(loaded.questions, config.variantCount));
            setSelectedVariantCode('101');
            showToast(`Đã mở đề: ${loaded.examTitle}`);
          }}
          onDeleteExam={(id) => setSavedExams(savedExams.filter((e) => e.id !== id))}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Specific Vietnamese Error & Guidance Modal */}
      <ErrorNotificationModal error={errorModal} onClose={() => setErrorModal(null)} />

      {/* Footer with Developer Attribution */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <span className="font-bold text-white text-sm">
                RA ĐỀ KIỂM TRA AI – 3 CẤP (Tiểu học • THCS • THPT)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/20">
                Phiên bản GDPT 2018
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Hệ thống hỗ trợ khảo thí, tự động hóa ma trận đề, bản đặc tả và đề kiểm tra dành cho giáo viên Việt Nam.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-center sm:text-right space-y-0.5 shadow-sm">
            <div className="text-amber-300 font-bold text-xs flex items-center justify-center sm:justify-end gap-1.5">
              <span>👨‍🏫 Người phát triển phần mềm:</span>
              <span className="text-white text-sm underline decoration-amber-400 font-extrabold">Trần Minh Chiến</span>
            </div>
            <div className="text-slate-300 text-xs font-medium">
              Đơn vị: <strong className="text-white">Trường THCS Thái Hòa - Nghệ An</strong>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
