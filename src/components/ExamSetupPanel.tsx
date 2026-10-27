import React, { useState } from 'react';
import {
  EducationLevel,
  ExamConfig,
  Question,
  CognitiveLevel,
  QuestionType,
} from '../types/exam';
import {
  GRADES_BY_LEVEL,
  SUBJECTS_BY_LEVEL,
  EXAM_TYPES,
  STANDARD_DURATIONS,
  STANDARD_MATRIX_PRESETS,
} from '../utils/curriculumData';
import {
  School,
  BookOpen,
  FileText,
  Sliders,
  HelpCircle,
  Sparkles,
  Upload,
  AlertTriangle,
  Plus,
  Trash2,
  Lock,
  Layers,
  Wand2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { readTextFromFile, autoConvertToUnicode } from '../utils/vietnameseFontConverter';

import { ErrorModalData } from './ErrorNotificationModal';

interface ExamSetupPanelProps {
  config: ExamConfig;
  onChangeConfig: (newConfig: ExamConfig) => void;
  onGenerateExam: () => void;
  onGenerateEquivalent: () => void;
  onGenerateMatrixOnly: () => void;
  onError: (error: ErrorModalData) => void;
  isGenerating: boolean;
  highlightedSection?: string | null;
  onClearHighlightedSection?: () => void;
}

export const ExamSetupPanel: React.FC<ExamSetupPanelProps> = ({
  config,
  onChangeConfig,
  onGenerateExam,
  onGenerateEquivalent,
  onGenerateMatrixOnly,
  onError,
  isGenerating,
  highlightedSection,
  onClearHighlightedSection,
}) => {
  const [analyzingDoc, setAnalyzingDoc] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [fontNotice, setFontNotice] = useState<string | null>(null);
  const [newPreservedText, setNewPreservedText] = useState('');
  const [newPreservedType, setNewPreservedType] = useState<QuestionType>('multiple_choice');
  const [newPreservedScore, setNewPreservedScore] = useState<number>(0.5);
  const [newPreservedAnswer, setNewPreservedAnswer] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto scroll to highlighted section from QA or Error
  React.useEffect(() => {
    if (highlightedSection) {
      const el = document.getElementById(`setup-section-${highlightedSection}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedSection]);

  // Helper updates
  const update = (fields: Partial<ExamConfig>) => {
    onChangeConfig({ ...config, ...fields });
    // Clear field errors on change
    if (fields.topic && fieldErrors.topic) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.topic;
        return next;
      });
    }
    if (fields.levelsDistribution && fieldErrors.levelsDistribution) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.levelsDistribution;
        return next;
      });
    }
    if (fields.questionTypeCounts && fieldErrors.questionTypes) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.questionTypes;
        return next;
      });
    }
  };

  const handleLevelChange = (level: EducationLevel) => {
    const grades = GRADES_BY_LEVEL[level];
    const defaultGrade = level === 'thcs' ? '8' : grades[0];
    const subjects = SUBJECTS_BY_LEVEL[level];
    const defaultSubject = level === 'thcs' ? 'Khoa học tự nhiên' : (subjects[0]?.id || 'Toán');
    update({
      educationLevel: level,
      grade: defaultGrade,
      subject: defaultSubject,
    });
  };

  const totalQuestionCount =
    (config.questionTypeCounts.multipleChoice || 0) +
    (config.questionTypeCounts.trueFalse || 0) +
    (config.questionTypeCounts.matching || 0) +
    (config.questionTypeCounts.fillInBlank || 0) +
    (config.questionTypeCounts.shortAnswer || 0) +
    (config.questionTypeCounts.essay || 0);

  const totalPercent =
    Number(config.levelsDistribution.recognition) +
    Number(config.levelsDistribution.understanding) +
    Number(config.levelsDistribution.application) +
    Number(config.levelsDistribution.highApplication);

  const isPercentInvalid = config.distributionMode === 'percent' && totalPercent !== 100;

  // Auto balance 4 levels to exactly 100%
  const handleAutoBalanceLevels = () => {
    const current = config.levelsDistribution;
    const sum =
      Number(current.recognition) +
      Number(current.understanding) +
      Number(current.application) +
      Number(current.highApplication);
    if (sum <= 0) {
      update({
        levelsDistribution: {
          recognition: 40,
          understanding: 30,
          application: 20,
          highApplication: 10,
        },
      });
      return;
    }
    const rec = Math.round((current.recognition / sum) * 100);
    const und = Math.round((current.understanding / sum) * 100);
    const app = Math.round((current.application / sum) * 100);
    let high = 100 - (rec + und + app);
    if (high < 0) {
      high = 0;
    }
    update({
      levelsDistribution: {
        recognition: rec,
        understanding: und,
        application: app,
        highApplication: high,
      },
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.levelsDistribution;
      return next;
    });
    onClearHighlightedSection?.();
  };

  // Validation before generating exam
  const handleValidateAndProceed = (action: 'exam' | 'matrix' | 'equivalent') => {
    if (!config.topic?.trim() && !config.referenceMaterial?.trim()) {
      setFieldErrors((prev) => ({ ...prev, topic: 'Vui lòng nhập Tên bài học / Chủ đề kiểm tra!' }));
      const el = document.getElementById('setup-section-topic');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onError({
        title: 'Chưa nhập Chủ đề / Tên bài học',
        reason: 'Ô "Tên bài học / Chủ đề" đang để trống nên hệ thống AI chưa có dữ liệu để tạo ma trận hoặc câu hỏi.',
        solution: '1. Vui lòng nhập chủ đề vào ô đang được bôi đỏ bên dưới.\n2. Sau đó nhấn lại nút "✨ TẠO ĐỀ KIỂM TRA AI".',
        targetSection: 'topic',
      });
      return;
    }

    if (action !== 'matrix' && totalQuestionCount === 0) {
      setFieldErrors((prev) => ({ ...prev, questionTypes: 'Chưa chọn số lượng câu hỏi nào!' }));
      const el = document.getElementById('setup-section-questionTypes');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onError({
        title: 'Chưa chọn số lượng câu hỏi',
        reason: 'Tổng số câu hỏi trong các ô hiện tại đang bằng 0 câu.',
        solution: '1. Nhập số lượng câu hỏi cho ít nhất một hình thức trong khu vực được bôi đỏ bên dưới.\n2. Sau đó nhấn lại nút tạo đề.',
        targetSection: 'questionTypes',
      });
      return;
    }

    if (isPercentInvalid) {
      setFieldErrors((prev) => ({
        ...prev,
        levelsDistribution: `Tổng tỷ lệ hiện là ${totalPercent}% (chưa bằng 100%)`,
      }));
      const el = document.getElementById('setup-section-levelsDistribution');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onError({
        title: 'Ma trận mức độ nhận thức chưa tròn 100%',
        reason: `Hiện tại tổng 4 mức (Nhận biết + Thông hiểu + Vận dụng + Vận dụng cao) đang là ${totalPercent}%.`,
        solution: '1. Bấm nút "⚡ Tự động cân bằng tròn 100%" trong khu vực bôi đỏ bên dưới.\n2. Hoặc tự điều chỉnh lại số % cho đủ 100%.',
        targetSection: 'levelsDistribution',
      });
      return;
    }

    if (action === 'exam') onGenerateExam();
    else if (action === 'matrix') onGenerateMatrixOnly();
    else if (action === 'equivalent') onGenerateEquivalent();
  };

  // File reader for reference material (supports .docx, .txt, with automatic TCVN3/VNI to Unicode conversion)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReadingFile(true);
    setFontNotice(null);
    try {
      const { text, encodingDetected } = await readTextFromFile(file);
      if (!text || !text.trim()) {
        onError({
          title: 'Tệp tải lên không có văn bản',
          reason: `Hệ thống không thể trích xuất nội dung văn bản từ tệp "${file.name}".`,
          solution:
            '1. Đảm bảo tệp chứa văn bản có thể đọc được (không phải chỉ chứa hình ảnh scan).\n2. Nếu là văn bản Word, hãy lưu lại dưới định dạng .docx hoặc .txt (UTF-8).\n3. Bạn cũng có thể mở tệp trên máy tính, bôi đen copy (Ctrl+C) rồi dán trực tiếp vào ô bên dưới.',
        });
        return;
      }

      const updatedContent = config.referenceMaterial
        ? config.referenceMaterial + '\n\n' + text.trim()
        : text.trim();

      update({ referenceMaterial: updatedContent });

      if (encodingDetected && !encodingDetected.includes('UTF-8')) {
        setFontNotice(`Đã đọc tệp và tự động chuyển đổi mã thành công: ${encodingDetected} → Unicode chuẩn!`);
      } else {
        setFontNotice(`Đã đọc thành công tệp "${file.name}" (${text.length.toLocaleString('vi-VN')} ký tự).`);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      onError({
        title: 'Lỗi khi đọc tệp tải lên',
        reason: err?.message || 'Không thể giải mã hoặc đọc nội dung tệp tin này.',
        solution:
          '1. Hãy lưu tài liệu dưới định dạng .docx hoặc .txt (Unicode / UTF-8).\n2. Hoặc mở file trên Word, nhấn Ctrl+A, Ctrl+C và dán trực tiếp vào ô "TÀI LIỆU THAM CHIẾU".',
      });
    } finally {
      setReadingFile(false);
      e.target.value = '';
    }
  };

  // Auto-detect and convert TCVN3 or VNI when user pastes into reference material
  const handlePasteReference = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;

    const { convertedText, detectedEncoding } = autoConvertToUnicode(pastedData);
    if (detectedEncoding) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = config.referenceMaterial || '';
      const nextText = current.substring(0, start) + convertedText + current.substring(end);
      update({ referenceMaterial: nextText });
      setFontNotice(`Tự động phát hiện và sửa mã ${detectedEncoding} → Unicode chuẩn cho đoạn văn vừa dán!`);
    }
  };

  // Convert all input fields from legacy TCVN3/VNI to Unicode in 1 click
  const handleFixAllFonts = () => {
    let convertedCount = 0;
    const newUpdates: Partial<ExamConfig> = {};

    const fieldsToCheck: (keyof ExamConfig)[] = [
      'referenceMaterial',
      'topic',
      'chapter',
      'scope',
      'learningOutcomes',
      'specialNotes',
      'matrixInput',
      'customSubject',
      'customExamTitle',
      'schoolName',
      'departmentName',
    ];

    fieldsToCheck.forEach((key) => {
      const val = config[key];
      if (typeof val === 'string' && val.trim()) {
        const { convertedText, detectedEncoding } = autoConvertToUnicode(val);
        if (detectedEncoding) {
          (newUpdates as any)[key] = convertedText;
          convertedCount++;
        }
      }
    });

    if (convertedCount > 0) {
      update(newUpdates);
      setFontNotice(`Đã tự động sửa mã và chuẩn hóa font Unicode cho ${convertedCount} mục nhập liệu!`);
    } else {
      setFontNotice('Tất cả nội dung văn bản hiện tại đã là chuẩn Unicode Tiếng Việt, không có lỗi font TCVN3/VNI.');
    }
  };

  // AI document analyzer
  const handleAnalyzeDocument = async () => {
    if (!config.referenceMaterial?.trim()) {
      onError({
        title: 'Chưa có nội dung tài liệu để phân tích',
        reason: 'Ô "Tài liệu tham chiếu" đang trống nên hệ thống AI chưa có dữ liệu để trích xuất.',
        solution:
          '1. Nhập hoặc dán văn bản bài học/giáo án vào ô "📁 TÀI LIỆU THAM CHIẾU".\n2. Hoặc bấm nút "Tải file (TXT/Word)" để tải tài liệu lên từ máy tính.\n3. Sau đó nhấn lại nút "Phân tích tài liệu".',
      });
      return;
    }

    setAnalyzingDoc(true);
    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: config.referenceMaterial,
          subject: config.customSubject || config.subject,
          grade: config.grade,
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        const { topics, outcomes, suggestedMatrix } = data.analysis;
        update({
          topic: topics?.join(', ') || config.topic,
          learningOutcomes: outcomes?.join('\n• ') ? '• ' + outcomes.join('\n• ') : config.learningOutcomes,
          levelsDistribution: suggestedMatrix
            ? {
                recognition: suggestedMatrix.recognitionPercent || 40,
                understanding: suggestedMatrix.understandingPercent || 30,
                application: suggestedMatrix.applicationPercent || 20,
                highApplication: suggestedMatrix.highApplicationPercent || 10,
              }
            : config.levelsDistribution,
        });
      } else {
        onError(
          data.errorDetail || {
            title: 'Không thể phân tích tài liệu lúc này',
            reason: data.error || 'Máy chủ AI không thể xử lý đoạn văn bản được cung cấp.',
            solution:
              '1. Kiểm tra lại nội dung tài liệu (đảm bảo là văn bản thuần tuý, không bị lỗi font).\n2. Rút ngắn văn bản xuống dưới 5.000 từ nếu quá dài.\n3. Nhấn thử lại nút "Phân tích tài liệu".',
          }
        );
      }
    } catch (err: any) {
      console.error(err);
      onError({
        title: 'Lỗi kết nối khi phân tích tài liệu',
        reason: 'Đường truyền mạng bị gián đoạn: ' + (err.message || 'Lỗi mạng'),
        solution: '1. Kiểm tra kết nối mạng Internet.\n2. Tải lại trang web và thử lại.',
        technicalInfo: err.stack || err.message,
      });
    } finally {
      setAnalyzingDoc(false);
    }
  };

  // Apply matrix preset
  const applyPreset = (presetId: string) => {
    const preset = STANDARD_MATRIX_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    update({
      levelsDistribution: { ...preset.levels },
      questionTypeCounts: { ...preset.types },
      distributionMode: 'percent',
    });
  };

  // Add teacher preserved question
  const handleAddPreservedQuestion = () => {
    if (!newPreservedText.trim()) {
      onError({
        title: 'Chưa nhập nội dung câu hỏi muốn giữ nguyên',
        reason: 'Ô nhập nội dung câu hỏi giáo viên muốn giữ nguyên hiện đang để trống.',
        solution:
          '1. Nhập nội dung câu hỏi vào ô "Nhập nội dung câu hỏi muốn giữ nguyên...".\n2. Chọn dạng câu, điểm số và đáp án đúng.\n3. Bấm nút "+ Thêm" để đưa câu hỏi vào danh sách giữ nguyên của đề.',
      });
      return;
    }
    const newQ: Question = {
      id: `preserved_${Date.now()}`,
      number: (config.preservedQuestions?.length || 0) + 1,
      type: newPreservedType,
      level: 'application',
      questionText: newPreservedText.trim(),
      correctAnswer: newPreservedAnswer.trim() || 'Theo hướng dẫn giáo viên',
      explanation: 'Câu hỏi bắt buộc do giáo viên biên soạn sẵn.',
      score: newPreservedScore,
      isPreserved: true,
    };
    update({
      preservedQuestions: [...(config.preservedQuestions || []), newQ],
    });
    setNewPreservedText('');
    setNewPreservedAnswer('');
  };

  const handleRemovePreservedQuestion = (id: string) => {
    update({
      preservedQuestions: config.preservedQuestions.filter((q) => q.id !== id),
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Panel Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-base">Thiết Lập Đề Thi</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
          Bước 1 → 6
        </span>
      </div>

      <div className="p-5 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto">
        {/* BƯỚC 1: CHỌN CẤP HỌC (3 thẻ lớn) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Bước 1: Chọn Cấp Học
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleLevelChange('tieuhoc')}
              className={`p-3 rounded-xl border-2 text-center transition flex flex-col items-center justify-center gap-1.5 ${
                config.educationLevel === 'tieuhoc'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                🏫
              </div>
              <span className="font-bold text-xs sm:text-sm">Tiểu học</span>
              <span className="text-[10px] text-slate-500 font-medium">Lớp 1 - 5</span>
            </button>

            <button
              type="button"
              onClick={() => handleLevelChange('thcs')}
              className={`p-3 rounded-xl border-2 text-center transition flex flex-col items-center justify-center gap-1.5 ${
                config.educationLevel === 'thcs'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                🎓
              </div>
              <span className="font-bold text-xs sm:text-sm">THCS</span>
              <span className="text-[10px] text-slate-500 font-medium">Lớp 6 - 9</span>
            </button>

            <button
              type="button"
              onClick={() => handleLevelChange('thpt')}
              className={`p-3 rounded-xl border-2 text-center transition flex flex-col items-center justify-center gap-1.5 ${
                config.educationLevel === 'thpt'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                🏛️
              </div>
              <span className="font-bold text-xs sm:text-sm">THPT</span>
              <span className="text-[10px] text-slate-500 font-medium">Lớp 10 - 12</span>
            </button>
          </div>
        </div>

        {/* BƯỚC 2: CHỌN LỚP */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Bước 2: Chọn Lớp
          </label>
          <div className="flex flex-wrap gap-2">
            {GRADES_BY_LEVEL[config.educationLevel].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update({ grade: g })}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${
                  config.grade === g
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>
        </div>

        {/* BƯỚC 3: CHỌN MÔN HỌC & MÔN KHÁC */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Bước 3: Chọn Môn Học
          </label>
          <div className="grid grid-cols-1 gap-2">
            <select
              value={config.subject}
              onChange={(e) => update({ subject: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUBJECTS_BY_LEVEL[config.educationLevel].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Ô bắt buộc nhập môn học khác */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Hoặc môn/chuyên đề khác:
              </span>
              <input
                type="text"
                placeholder="VD: Tin học trẻ, Kỹ năng sống, STEM..."
                value={config.customSubject}
                onChange={(e) => update({ customSubject: e.target.value })}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* BƯỚC 4: THÔNG TIN TRƯỜNG, LOẠI ĐỀ, THỜI GIAN & ĐIỂM */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bước 4: Loại Đề, Thời Gian & Điểm
            </label>
            <span className="text-[11px] text-blue-600 font-semibold">Thang điểm: {config.totalScore}đ</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Loại đề thi</label>
              <select
                value={config.examType}
                onChange={(e) => update({ examType: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t.id} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Tên đề tùy biến</label>
              <input
                type="text"
                placeholder="VD: Kiểm tra định kỳ HK1"
                value={config.customExamTitle}
                onChange={(e) => update({ customExamTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Tên trường</label>
              <input
                type="text"
                placeholder="VD: Trường THCS Thái Hòa"
                value={config.schoolName}
                onChange={(e) => update({ schoolName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Sở/UBND Xã (Phường)</label>
              <input
                type="text"
                placeholder="VD: UBND Phường Thái Hòa"
                value={config.departmentName}
                onChange={(e) => update({ departmentName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Năm học</label>
              <input
                type="text"
                value={config.schoolYear}
                onChange={(e) => update({ schoolYear: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Thời gian làm bài</label>
              <div className="flex gap-1.5 items-center">
                <select
                  value={config.durationMinutes}
                  onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
                  className="w-2/3 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {STANDARD_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} phút
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">phút</span>
              </div>
            </div>

            <div
              id="setup-section-score"
              className={`transition-all rounded-lg ${
                highlightedSection === 'score'
                  ? 'border-2 border-red-500 bg-red-50 ring-4 ring-red-400 p-2'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-slate-600">Thang điểm toàn bài</label>
                {highlightedSection === 'score' && (
                  <span className="text-[10px] font-bold text-red-600 animate-pulse">🔴 Vùng cần chỉnh</span>
                )}
              </div>
              <div className="flex gap-1.5 items-center">
                <select
                  value={config.totalScore}
                  onChange={(e) => update({ totalScore: Number(e.target.value) })}
                  className="w-2/3 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-blue-700"
                >
                  <option value={10}>10 điểm (Chuẩn)</option>
                  <option value={20}>20 điểm</option>
                  <option value={100}>100 điểm</option>
                </select>
                <span className="text-xs text-slate-500">điểm</span>
              </div>
            </div>
          </div>
        </div>

        {/* BƯỚC 5: NỘI DUNG BÀI HỌC & KIẾN THỨC CẦN KIỂM TRA */}
        <div
          id="setup-section-topic"
          className={`border-t border-slate-200 pt-4 space-y-3 transition-all rounded-xl ${
            fieldErrors.topic || highlightedSection === 'topic'
              ? 'border-2 border-red-500 bg-red-50/70 ring-4 ring-red-400/40 p-3 shadow-md'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bước 5: Nội Dung Kiến Thức & Yêu Cầu Cần Đạt
            </label>
            {(fieldErrors.topic || highlightedSection === 'topic') && (
              <span className="text-[10px] font-extrabold text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded-full border border-red-300 animate-pulse">
                🔴 Vùng có lỗi cần sửa
              </span>
            )}
          </div>

          {(fieldErrors.topic || highlightedSection === 'topic') && (
            <div className="bg-red-600 text-white p-2.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-pulse">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>🔴 KHU VỰC BỊ LỖI: {fieldErrors.topic || 'Vui lòng nhập Tên bài học / Chủ đề kiểm tra!'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.topic;
                    return next;
                  });
                  onClearHighlightedSection?.();
                }}
                className="text-white hover:text-red-200 font-extrabold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Tên bài học / Chủ đề</label>
              <input
                type="text"
                placeholder="VD: Chuyển động biến đổi đều / Phân số / Văn học dân gian..."
                value={config.topic}
                onChange={(e) => update({ topic: e.target.value })}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:ring-2 ${
                  fieldErrors.topic || highlightedSection === 'topic'
                    ? 'border-red-500 ring-2 ring-red-300 text-red-900'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Chương / Phân môn</label>
                <input
                  type="text"
                  placeholder="VD: Chương 2 / Đại số / Hình học"
                  value={config.chapter}
                  onChange={(e) => update({ chapter: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Phạm vi kiểm tra</label>
                <input
                  type="text"
                  placeholder="VD: Từ tuần 1 đến tuần 8"
                  value={config.scope}
                  onChange={(e) => update({ scope: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Yêu cầu cần đạt (Chuẩn GDPT 2018)
              </label>
              <textarea
                rows={2}
                placeholder="VD: Nhận biết được định nghĩa, hiểu được tính chất, vận dụng giải bài toán thực tiễn..."
                value={config.learningOutcomes}
                onChange={(e) => update({ learningOutcomes: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* TÀI LIỆU THAM CHIẾU */}
        <div
          id="setup-section-referenceMaterial"
          className={`border-t border-slate-200 pt-4 space-y-2.5 -mx-5 px-5 py-4 border-b transition-all rounded-xl ${
            highlightedSection === 'referenceMaterial' || fieldErrors.referenceMaterial
              ? 'border-2 border-red-500 bg-red-50 ring-4 ring-red-400/40 p-3 shadow-md'
              : 'bg-blue-50/40'
          }`}
        >
          {(highlightedSection === 'referenceMaterial' || fieldErrors.referenceMaterial) && (
            <div className="bg-red-600 text-white p-2.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-pulse mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  🔴 KHU VỰC BỊ LỖI: {fieldErrors.referenceMaterial || 'Vui lòng cung cấp nội dung hoặc rút ngắn tài liệu tham chiếu!'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.referenceMaterial;
                    return next;
                  });
                  onClearHighlightedSection?.();
                }}
                className="text-white hover:text-red-200 font-extrabold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-700" />
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                📁 TÀI LIỆU THAM CHIẾU
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFixAllFonts}
                title="Tự động phát hiện và chuyển đổi bảng mã cũ (TCVN3 / ABC / .VnTime, VNI-Times) sang Unicode chuẩn"
                className="text-[11px] px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <RefreshCw className="w-3 h-3 text-amber-600" />
                <span>Sửa lỗi font (TCVN3/VNI)</span>
              </button>

              <label
                className={`cursor-pointer text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
                  readingFile
                    ? 'bg-blue-100 text-blue-700 border-blue-300 pointer-events-none'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                }`}
              >
                {readingFile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Đang đọc tệp...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tải tệp Word (.docx) / TXT</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={readingFile}
                  className="hidden"
                />
              </label>

              {config.referenceMaterial && (
                <button
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={analyzingDoc}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-blue-600 text-white font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50 shadow-2xs"
                >
                  <Wand2 className="w-3 h-3" />
                  {analyzingDoc ? 'Đang trích xuất...' : 'Phân tích tài liệu'}
                </button>
              )}
            </div>
          </div>

          {fontNotice && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fontNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFontNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            rows={4}
            placeholder="Dán nội dung bài học, văn bản đọc hiểu, bài tập mẫu hoặc giáo án tại đây (hệ thống tự động sửa lỗi font TCVN3/.VnTime và VNI khi dán). AI sẽ ƯU TIÊN TUYỆT ĐỐI dữ liệu này để ra đề..."
            value={config.referenceMaterial}
            onChange={(e) => update({ referenceMaterial: e.target.value })}
            onPaste={handlePasteReference}
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-slate-800 leading-relaxed"
          />

          {/* Tùy chọn nguồn kiến thức */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-700 block">Tùy chọn nguồn kiến thức:</span>
            <div className="space-y-1 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="refSourceMode"
                  checked={config.referenceSourceMode === 'only_upload'}
                  onChange={() => update({ referenceSourceMode: 'only_upload' })}
                  className="text-blue-600"
                />
                <span>Chỉ sử dụng tài liệu tải lên (Không tự bịa dữ kiện nếu thiếu thông tin)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="refSourceMode"
                  checked={config.referenceSourceMode === 'upload_and_gdpt'}
                  onChange={() => update({ referenceSourceMode: 'upload_and_gdpt' })}
                  className="text-blue-600"
                />
                <span>Tài liệu tải lên + kiến thức chuẩn chương trình phổ thông GDPT</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="refSourceMode"
                  checked={config.referenceSourceMode === 'teacher_input'}
                  onChange={() => update({ referenceSourceMode: 'teacher_input' })}
                  className="text-blue-600"
                />
                <span>Giáo viên tự nhập trọng tâm kiến thức</span>
              </label>
            </div>
          </div>
        </div>

        {/* BƯỚC 6: HÌNH THỨC CÂU HỎI & SỐ LƯỢNG */}
        <div
          id="setup-section-questionTypes"
          className={`space-y-3 transition-all rounded-xl ${
            totalQuestionCount === 0 || fieldErrors.questionTypes || highlightedSection === 'questionTypes'
              ? 'border-2 border-red-500 bg-red-50/70 ring-4 ring-red-400/40 p-3 shadow-md'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bước 6: Hình Thức Câu Hỏi
            </label>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                totalQuestionCount === 0
                  ? 'bg-red-100 text-red-700 border-red-300 animate-pulse font-extrabold'
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}
            >
              Tổng cộng: {totalQuestionCount} câu
            </span>
          </div>

          {(totalQuestionCount === 0 || fieldErrors.questionTypes || highlightedSection === 'questionTypes') && (
            <div className="bg-red-600 text-white p-2.5 rounded-lg text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-pulse">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  🔴 KHU VỰC BỊ LỖI: {fieldErrors.questionTypes || 'Tổng số câu hỏi hiện tại đang bằng 0 câu! Vui lòng chọn số lượng câu hỏi.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.questionTypes;
                    return next;
                  });
                  onClearHighlightedSection?.();
                }}
                className="text-white hover:text-red-200 font-extrabold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                TN 4 lựa chọn (A, B, C, D)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={config.questionTypeCounts.multipleChoice}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        multipleChoice: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                TN Đúng / Sai (Bộ GD)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={config.questionTypeCounts.trueFalse}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        trueFalse: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                Trả lời ngắn
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={config.questionTypeCounts.shortAnswer}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        shortAnswer: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                Tự luận
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={config.questionTypeCounts.essay}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        essay: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                Điền khuyết
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={config.questionTypeCounts.fillInBlank}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        fillInBlank: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700 block text-[11px] mb-1">
                Ghép nối (A - B)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={config.questionTypeCounts.matching}
                  onChange={(e) =>
                    update({
                      questionTypeCounts: {
                        ...config.questionTypeCounts,
                        matching: Math.max(0, parseInt(e.target.value) || 0),
                      },
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-center font-bold text-blue-700"
                />
                <span className="text-[11px] text-slate-500">câu</span>
              </div>
            </div>
          </div>
        </div>

        {/* THIẾT LẬP MỨC ĐỘ TƯ DUY */}
        <div
          id="setup-section-levelsDistribution"
          className={`border-t border-slate-200 pt-4 space-y-3 transition-all rounded-xl ${
            isPercentInvalid || fieldErrors.levelsDistribution || highlightedSection === 'levelsDistribution'
              ? 'border-2 border-red-500 bg-red-50/70 ring-4 ring-red-400/40 p-3 shadow-md'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thiết Lập 4 Mức Độ Nhận Thức
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Đơn vị:</span>
              <button
                type="button"
                onClick={() => update({ distributionMode: 'percent' })}
                className={`px-2 py-0.5 text-xs rounded font-bold cursor-pointer ${
                  config.distributionMode === 'percent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                Tỷ lệ %
              </button>
              <button
                type="button"
                onClick={() => update({ distributionMode: 'count' })}
                className={`px-2 py-0.5 text-xs rounded font-bold cursor-pointer ${
                  config.distributionMode === 'count'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                Số câu
              </button>
            </div>
          </div>

          {(isPercentInvalid || fieldErrors.levelsDistribution || highlightedSection === 'levelsDistribution') && (
            <div className="bg-red-600 text-white p-2.5 rounded-lg text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm animate-pulse">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                <span>
                  🔴 KHU VỰC BỊ LỖI: Tổng ma trận 4 mức hiện là {totalPercent}% (chưa bằng 100%).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoBalanceLevels}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-red-700 rounded text-xs font-black shadow-xs cursor-pointer"
                >
                  ⚡ Tự động cân bằng tròn 100%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.levelsDistribution;
                      return next;
                    });
                    onClearHighlightedSection?.();
                  }}
                  className="text-white hover:text-red-200 font-extrabold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Mẫu nhanh:</span>
            {STANDARD_MATRIX_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium whitespace-nowrap transition"
                title={p.description}
              >
                {p.title.split('(')[0]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 block">Nhận biết</span>
              <input
                type="number"
                value={config.levelsDistribution.recognition}
                onChange={(e) =>
                  update({
                    levelsDistribution: {
                      ...config.levelsDistribution,
                      recognition: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full mt-1 text-center font-bold text-sm bg-white border border-emerald-300 rounded py-0.5"
              />
              <span className="text-[10px] text-emerald-600 font-medium">
                {config.distributionMode === 'percent' ? '%' : 'câu'}
              </span>
            </div>

            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
              <span className="text-[11px] font-bold text-blue-800 block">Thông hiểu</span>
              <input
                type="number"
                value={config.levelsDistribution.understanding}
                onChange={(e) =>
                  update({
                    levelsDistribution: {
                      ...config.levelsDistribution,
                      understanding: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full mt-1 text-center font-bold text-sm bg-white border border-blue-300 rounded py-0.5"
              />
              <span className="text-[10px] text-blue-600 font-medium">
                {config.distributionMode === 'percent' ? '%' : 'câu'}
              </span>
            </div>

            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 block">Vận dụng</span>
              <input
                type="number"
                value={config.levelsDistribution.application}
                onChange={(e) =>
                  update({
                    levelsDistribution: {
                      ...config.levelsDistribution,
                      application: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full mt-1 text-center font-bold text-sm bg-white border border-amber-300 rounded py-0.5"
              />
              <span className="text-[10px] text-amber-600 font-medium">
                {config.distributionMode === 'percent' ? '%' : 'câu'}
              </span>
            </div>

            <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
              <span className="text-[11px] font-bold text-purple-800 block">Vận dụng cao</span>
              <input
                type="number"
                value={config.levelsDistribution.highApplication}
                onChange={(e) =>
                  update({
                    levelsDistribution: {
                      ...config.levelsDistribution,
                      highApplication: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full mt-1 text-center font-bold text-sm bg-white border border-purple-300 rounded py-0.5"
              />
              <span className="text-[10px] text-purple-600 font-medium">
                {config.distributionMode === 'percent' ? '%' : 'câu'}
              </span>
            </div>
          </div>

          {isPercentInvalid && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Cảnh báo: Tổng 4 mức hiện là <b>{totalPercent}%</b> (Phải bằng đúng <b>100%</b> để đảm bảo ma trận chuẩn).
              </span>
            </div>
          )}
        </div>

        {/* CẤU HÌNH NÂNG CAO (Mã đề, Giữ câu hỏi GV, Ma trận có sẵn) */}
        <div className="border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-700 py-1 hover:text-blue-600 transition"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Cài đặt nâng cao: Mã đề ({config.variantCount} mã) & Câu hỏi giữ nguyên</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              {/* Số mã đề */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  🔀 Tạo nhiều mã đề hoán vị:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => update({ variantCount: count })}
                      className={`flex-1 py-1.5 rounded-lg border font-bold text-xs ${
                        config.variantCount === count
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {count} mã {count > 1 ? `(101..10${count})` : ''}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tự động đảo câu hỏi, đảo phương án nhưng giữ nguyên cấu trúc ma trận và sinh bảng đáp án riêng.
                </p>
              </div>

              {/* Chế độ giữ câu hỏi giáo viên nhập */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Chế độ giữ câu hỏi GV nhập ({config.preservedQuestions?.length || 0} câu)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  AI sẽ tích hợp giữ nguyên các câu hỏi này vào đề, chỉ sinh thêm phần còn thiếu để đủ ma trận.
                </p>

                {config.preservedQuestions && config.preservedQuestions.length > 0 && (
                  <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                    {config.preservedQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="font-semibold text-slate-800 line-clamp-1 flex-1">
                          🔒 {q.questionText} ({q.score}đ)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePreservedQuestion(q.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nhập nội dung câu hỏi muốn giữ nguyên..."
                    value={newPreservedText}
                    onChange={(e) => setNewPreservedText(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newPreservedType}
                      onChange={(e) => setNewPreservedType(e.target.value as QuestionType)}
                      className="px-2 py-1 text-[11px] border border-slate-300 rounded"
                    >
                      <option value="multiple_choice">Trắc nghiệm</option>
                      <option value="essay">Tự luận</option>
                      <option value="short_answer">Trả lời ngắn</option>
                    </select>
                    <input
                      type="number"
                      step={0.25}
                      value={newPreservedScore}
                      onChange={(e) => setNewPreservedScore(parseFloat(e.target.value) || 0.5)}
                      className="w-14 px-1.5 py-1 text-[11px] border border-slate-300 rounded text-center"
                      title="Điểm câu này"
                    />
                    <input
                      type="text"
                      placeholder="Đáp án đúng"
                      value={newPreservedAnswer}
                      onChange={(e) => setNewPreservedAnswer(e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddPreservedQuestion}
                      className="px-2.5 py-1 rounded bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>
              </div>

              {/* Dán ma trận có sẵn */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  📋 Dán bảng ma trận có sẵn (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="Dán văn bản ma trận đề đã có... AI sẽ bám sát 100% tỷ lệ ma trận này."
                  value={config.matrixInput || ''}
                  onChange={(e) => update({ matrixInput: e.target.value })}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    const { convertedText, detectedEncoding } = autoConvertToUnicode(text);
                    if (detectedEncoding) {
                      e.preventDefault();
                      const textarea = e.currentTarget;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const current = config.matrixInput || '';
                      update({
                        matrixInput: current.substring(0, start) + convertedText + current.substring(end),
                      });
                      setFontNotice(`Tự động sửa mã ${detectedEncoding} → Unicode chuẩn cho ma trận vừa dán!`);
                    }
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-sans text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* NÚT THAO TÁC CHÍNH */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={() => handleValidateAndProceed('exam')}
            disabled={isGenerating}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>{isGenerating ? '⚡ ĐANG TẠO ĐỀ SIÊU TỐC...' : '✨ TẠO ĐỀ KIỂM TRA AI'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 py-1 px-2.5 rounded-lg border border-emerald-200">
            <span>⚡ Tốc độ tối ưu: 8 - 15 giây</span>
            <span>•</span>
            <span>Tự động tính ma trận & đặc tả chuẩn 100%</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleValidateAndProceed('matrix')}
              disabled={isGenerating}
              className="py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              📊 Tạo Ma Trận
            </button>
            <button
              type="button"
              onClick={() => handleValidateAndProceed('equivalent')}
              disabled={isGenerating}
              className="py-2 px-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              🧠 Tạo Đề Tương Đương
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
