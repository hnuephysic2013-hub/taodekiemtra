import React, { useState } from 'react';
import {
  ExamData,
  ExamVariant,
  Question,
  QuestionType,
  CognitiveLevel,
} from '../types/exam';
import {
  Printer,
  Copy,
  Download,
  Save,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Edit3,
  Trash2,
  BookmarkPlus,
  ArrowUp,
  ArrowDown,
  Plus,
  AlertTriangle,
  FileText,
  Table,
  CheckSquare,
  Award,
  Layers,
  ChevronRight,
  Info,
  AlertOctagon,
  AlertCircle,
} from 'lucide-react';
import { printExam, copyExamToClipboard, exportToWordDoc } from '../utils/exportHelper';

interface ExamPreviewProps {
  exam: ExamData;
  variants: ExamVariant[];
  selectedVariantCode: string;
  onSelectVariant: (code: string) => void;
  onUpdateQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onAddQuestion: (insertIndex: number) => void;
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void;
  onRegenerateSingleQuestion: (question: Question) => void;
  onSaveQuestionToBank: (question: Question) => void;
  onOpenEditModal: (question: Question) => void;
  onOpenQAModal: () => void;
  onSaveExam: () => void;
  onRegenerateAll: () => void;
  onGenerateEquivalent: () => void;
  isRegeneratingQuestionId?: string | null;
  flaggedQuestions?: Record<string, string[]>;
  focusedQuestionId?: string | null;
  onClearFlaggedQuestions?: () => void;
  onSelectFocusedQuestion?: (id: string | null) => void;
}

export const ExamPreview: React.FC<ExamPreviewProps> = ({
  exam,
  variants,
  selectedVariantCode,
  onSelectVariant,
  onDeleteQuestion,
  onAddQuestion,
  onMoveQuestion,
  onRegenerateSingleQuestion,
  onSaveQuestionToBank,
  onOpenEditModal,
  onOpenQAModal,
  onSaveExam,
  onRegenerateAll,
  onGenerateEquivalent,
  isRegeneratingQuestionId,
  flaggedQuestions,
  focusedQuestionId,
  onClearFlaggedQuestions,
  onSelectFocusedQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'exam' | 'answers' | 'rubric' | 'matrix' | 'spec' | 'multi_code'>('exam');
  const [copied, setCopied] = useState(false);

  // Current active variant or base
  const currentVariant = variants.find((v) => v.code === selectedVariantCode);
  const activeQuestions = currentVariant ? currentVariant.questions : exam.questions;

  // Total current score calculation
  const currentTotalScore = Number(
    activeQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0).toFixed(2)
  );
  const isScoreMismatched = Math.abs(currentTotalScore - exam.totalScore) > 0.05;
  const flaggedCount = flaggedQuestions ? Object.keys(flaggedQuestions).length : 0;

  const handleJumpToNextError = () => {
    if (!flaggedQuestions) return;
    const errorIds = Object.keys(flaggedQuestions);
    if (errorIds.length === 0) return;

    let nextIndex = 0;
    if (focusedQuestionId) {
      const currIdx = errorIds.indexOf(focusedQuestionId);
      if (currIdx !== -1) {
        nextIndex = (currIdx + 1) % errorIds.length;
      }
    }
    const targetId = errorIds[nextIndex];
    onSelectFocusedQuestion?.(targetId);
    setActiveTab('exam');
    setTimeout(() => {
      const el = document.getElementById(`question-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleCopy = async () => {
    const success = await copyExamToClipboard(exam, currentVariant);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Red Highlight Mode Ribbon */}
      {flaggedCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md border-b border-red-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="font-extrabold uppercase tracking-wide">
              🔴 ĐANG BÔI ĐỎ {flaggedCount} CÂU HỎI / KHU VỰC CẦN SỬA ĐỔI THEO BÁO CÁO KIỂM ĐỊNH
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToNextError}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 text-red-700 rounded-md font-extrabold flex items-center gap-1 transition shadow-xs cursor-pointer"
            >
              <span>Chuyển tới câu lỗi tiếp theo ❯</span>
            </button>
            {onClearFlaggedQuestions && (
              <button
                onClick={onClearFlaggedQuestions}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded-md font-bold transition cursor-pointer"
              >
                ✕ Tắt bôi đỏ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-slate-900 text-white p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-medium">Mã đề:</span>
            {variants.length > 0 ? (
              <div className="flex gap-1">
                {variants.map((v) => (
                  <button
                    key={v.code}
                    onClick={() => onSelectVariant(v.code)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                      selectedVariantCode === v.code
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {v.code}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-bold text-white">Gốc</span>
            )}
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              isScoreMismatched
                ? 'bg-red-500/30 text-red-200 border border-red-500/50 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
            title="Tổng điểm hiện tại của các câu hỏi"
          >
            <span>Tổng điểm: {currentTotalScore} / {exam.totalScore}đ</span>
            {isScoreMismatched && <AlertTriangle className="w-3.5 h-3.5 text-red-300" />}
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onOpenQAModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            title="Kiểm tra chất lượng đề 12 tiêu chí"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>✅ Kiểm tra đề</span>
          </button>

          <button
            onClick={onSaveExam}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
            title="Lưu vào danh sách đề đã tạo"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span>💾 Lưu</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
            title="Sao chép định dạng text chuẩn dán Word"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>{copied ? 'Đã sao chép!' : '📋 Sao chép'}</span>
          </button>

          <button
            onClick={() => exportToWordDoc(exam, currentVariant)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            title="Tải về file Microsoft Word (.doc)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>⬇ Xuất Word</span>
          </button>

          <button
            onClick={printExam}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            title="In đề thi chuẩn khổ A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>🖨 In đề</span>
          </button>
        </div>
      </div>

      {/* 5 Tabs Navigation */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center justify-between gap-1 overflow-x-auto text-xs sm:text-sm font-bold">
        <div className="flex gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('exam')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'exam'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Tab 1: Đề kiểm tra</span>
          </button>

          <button
            onClick={() => setActiveTab('answers')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'answers'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Tab 2: Đáp án</span>
          </button>

          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rubric'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600" />
            <span>Tab 3: Hướng dẫn chấm</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Table className="w-4 h-4 text-indigo-600" />
            <span>Tab 4: Ma trận đề</span>
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'spec'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Tab 5: Bản đặc tả</span>
          </button>

          {variants.length > 1 && (
            <button
              onClick={() => setActiveTab('multi_code')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'multi_code'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-cyan-600" />
              <span>Đối chiếu {variants.length} mã đề</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRegenerateAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold flex items-center gap-1 transition"
            title="Tạo lại toàn bộ câu hỏi đề này"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo lại</span>
          </button>
          <button
            onClick={onGenerateEquivalent}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1 transition"
            title="Tạo đề tương đương giữ nguyên cấu trúc ma trận"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Đề tương đương</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Display */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-175px)]">
        {/* ================= TAB 1: ĐỀ KIỂM TRA ================= */}
        {activeTab === 'exam' && (
          <div className="space-y-6 max-w-4xl mx-auto print:p-0 print:m-0">
            {/* Vietnamese Standard Official Exam Header */}
            <div className="border border-slate-800 p-4 sm:p-6 rounded-xl bg-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-300 pb-4 gap-4 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="text-xs uppercase font-semibold text-slate-700 tracking-wide">
                    {exam.departmentName || 'UBND Phường Thái Hòa'}
                  </div>
                  <div className="text-xs sm:text-sm uppercase font-extrabold text-slate-900">
                    {exam.schoolName || 'Trường THCS Thái Hòa'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Năm học: {exam.schoolYear || '2026 - 2027'}
                  </div>
                </div>

                <div className="text-center space-y-1 sm:text-right">
                  <div className="text-sm sm:text-base uppercase font-extrabold text-blue-900">
                    {exam.examTitle}
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Môn: <span className="text-blue-700">{exam.subject}</span> – Lớp {exam.grade}
                  </div>
                  <div className="text-xs text-slate-600 italic">
                    Thời gian làm bài: <b>{exam.durationMinutes} phút</b> (không kể thời gian giao đề)
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white text-xs font-bold mt-1">
                    Mã đề: {selectedVariantCode}
                  </div>
                </div>
              </div>

              {/* Student info box */}
              <div className="border border-dashed border-slate-400 p-2.5 rounded-lg text-xs text-slate-700 flex flex-wrap justify-between gap-2">
                <div>Họ và tên thí sinh: ............................................................................</div>
                <div>Lớp: .........................</div>
                <div>Số báo danh: ........................</div>
              </div>

              {exam.examInstructions && (
                <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
                  <b>* Lời dặn cán bộ coi thi & thí sinh:</b> {exam.examInstructions}
                </div>
              )}
            </div>

            {/* Reading Passage if available */}
            {exam.readingPassage && (
              <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold uppercase text-amber-900 block tracking-wide">
                  📖 NGỮ LIỆU ĐỌC HIỂU:
                </span>
                <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-serif bg-white p-3 rounded-lg border border-amber-100 shadow-xs">
                  {exam.readingPassage}
                </div>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 uppercase tracking-wide border-l-4 border-blue-600 pl-2">
                  Nội Dung Đề Thi
                </h3>
                <button
                  type="button"
                  onClick={() => onAddQuestion(activeQuestions.length)}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                </button>
              </div>

              {activeQuestions.map((q, index) => {
                const isRegenerating = isRegeneratingQuestionId === q.id;
                const isFlagged = Boolean(flaggedQuestions && flaggedQuestions[q.id]?.length > 0) || focusedQuestionId === q.id;
                const errorReasons = (flaggedQuestions && flaggedQuestions[q.id]) || [];

                return (
                  <div
                    key={q.id || index}
                    id={`question-card-${q.id}`}
                    className={`p-4 rounded-xl transition-all group space-y-3 relative scroll-mt-24 ${
                      isFlagged
                        ? 'border-2 border-red-500 bg-red-50/70 ring-4 ring-red-400/40 shadow-lg shadow-red-200/80'
                        : 'border border-slate-200 bg-white hover:border-blue-300 shadow-xs'
                    }`}
                  >
                    {/* Red Alert Banner for Flagged Question */}
                    {isFlagged && (
                      <div className="bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm animate-pulse">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
                          <div>
                            <span className="uppercase tracking-wide font-black text-amber-200 mr-1.5">
                              [KHU VỰC CẦN SỬA]:
                            </span>
                            <span>{errorReasons.join(' • ') || 'Câu hỏi này cần được rà soát hoặc biên tập lại'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenEditModal(q)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-red-700 rounded text-xs font-black shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            ✏️ Sửa câu này
                          </button>
                          <button
                            onClick={() => onRegenerateSingleQuestion(q)}
                            className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded text-xs font-bold shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            🔄 Tạo lại
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Top row of question card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-blue-900 text-sm sm:text-base">
                          Câu {q.number}:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFlagged && errorReasons.some((r) => r.includes('Điểm số'))
                              ? 'bg-red-600 text-white ring-2 ring-red-400'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {q.score} điểm
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.level === 'recognition'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.level === 'understanding'
                              ? 'bg-blue-100 text-blue-800'
                              : q.level === 'application'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {q.level === 'recognition'
                            ? 'Nhận biết'
                            : q.level === 'understanding'
                            ? 'Thông hiểu'
                            : q.level === 'application'
                            ? 'Vận dụng'
                            : 'Vận dụng cao'}
                        </span>
                        {q.topic && (
                          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                            [{q.topic}]
                          </span>
                        )}
                        {q.needsTeacherReview && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1">
                            ⚠ Cần GV kiểm tra
                          </span>
                        )}
                      </div>

                      {/* Question Actions Toolbar (Prompt item 19) */}
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onRegenerateSingleQuestion(q)}
                          disabled={isRegenerating}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 cursor-pointer"
                          title="🔄 Tạo lại câu này (giữ nguyên ma trận)"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-600' : ''}`} />
                        </button>

                        <button
                          onClick={() => onOpenEditModal(q)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 cursor-pointer"
                          title="✏️ Sửa câu này"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSaveQuestionToBank(q)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 cursor-pointer"
                          title="💾 Lưu vào Ngân hàng câu hỏi"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onMoveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onMoveQuestion(index, 'down')}
                          disabled={index === activeQuestions.length - 1}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 cursor-pointer"
                          title="🗑 Xóa câu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div
                      className={`text-xs sm:text-sm font-medium leading-relaxed pl-1 whitespace-pre-line rounded-lg transition-all ${
                        isFlagged && errorReasons.some((r) => r.includes('trùng lặp') || r.includes('quá ngắn'))
                          ? 'bg-red-100/70 p-2 text-red-950 border border-red-300'
                          : 'text-slate-900'
                      }`}
                    >
                      {q.questionText}
                    </div>

                    {/* Multiple choice 4 options (A, B, C, D) */}
                    {q.options && q.options.length > 0 && (
                      <div
                        className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2 rounded-lg transition-all ${
                          isFlagged && errorReasons.some((r) => r.includes('phương án') || r.includes('lạc quẻ'))
                            ? 'border-2 border-red-400 bg-red-100/60 p-2'
                            : ''
                        }`}
                      >
                        {q.options.map((opt, i) => {
                          const isSuspicious =
                            isFlagged &&
                            errorReasons.some((r) => r.includes('lạc quẻ')) &&
                            (opt.toLowerCase().includes('tất cả đều') || opt.toLowerCase().includes('cả a và b'));

                          return (
                            <div
                              key={i}
                              className={`p-2 rounded-lg text-xs transition-all ${
                                isSuspicious
                                  ? 'bg-red-200 border-2 border-red-500 text-red-950 font-bold'
                                  : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                              }`}
                            >
                              <span className="font-bold text-blue-900 mr-1.5">
                                {opt.slice(0, 2)}
                              </span>
                              <span>{opt.slice(2)}</span>
                              {isSuspicious && (
                                <span className="ml-1 text-[10px] text-red-700 font-extrabold uppercase">
                                  (Lỗi phương án lạc quẻ)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Missing options warning banner if < 4 options */}
                    {q.type === 'multiple_choice' && (!q.options || q.options.length < 4) && (
                      <div className="p-2 bg-red-100 border border-red-400 rounded-lg text-xs text-red-900 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Khu vực phương án: Câu này mới có {q.options?.length || 0} phương án (Cần đủ 4 phương án A, B, C, D).</span>
                      </div>
                    )}

                    {/* Invalid Answer Warning for Multiple Choice */}
                    {isFlagged && errorReasons.some((r) => r.includes('đáp án')) && (
                      <div className="p-2 bg-red-100 border border-red-400 rounded-lg text-xs text-red-900 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Khu vực đáp án: Đáp án hiện tại là "{q.correctAnswer || '(Chưa có)'}" - Chưa chuẩn định dạng A/B/C/D.</span>
                      </div>
                    )}

                    {/* Missing Essay Rubric Criteria Warning */}
                    {q.type === 'essay' && isFlagged && errorReasons.some((r) => r.includes('barem')) && (
                      <div className="p-2 bg-red-100 border border-red-400 rounded-lg text-xs text-red-900 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Khu vực barem: Chưa có hướng dẫn chấm và barem điểm chi tiết cho câu tự luận này.</span>
                      </div>
                    )}

                    {/* True/False Subquestions (a, b, c, d) */}
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="space-y-1.5 pt-1 pl-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        {q.subQuestions.map((sq, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-slate-800 gap-2">
                            <span>
                              <b>{sq.label})</b> {sq.statement}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300">
                              [Đúng / Sai]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Add separator button */}
                    <div className="flex justify-center -mb-5 pt-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => onAddQuestion(index + 1)}
                        className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-md hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Chèn thêm câu vào đây
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center py-6 font-bold text-xs text-slate-500 border-t border-slate-300 space-y-1">
              <div>----------------- HẾT -----------------</div>
              <div className="italic font-normal">(Cán bộ coi thi không giải thích gì thêm)</div>
              <div className="text-[10px] text-slate-400 mt-2 font-normal">
                Hệ thống Ra đề kiểm tra AI – Phát triển bởi GV. Trần Minh Chiến (Trường THCS Thái Hòa - Nghệ An)
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ĐÁP ÁN ================= */}
        {activeTab === 'answers' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Quick Answer Key Matrix for Multiple Choice */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-700" />
                  BẢNG ĐÁP ÁN NHANH (MÃ ĐỀ: {selectedVariantCode})
                </h4>
                <span className="text-xs text-blue-700 font-medium">Tiện lợi đối chiếu chấm bài</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-xs">
                {activeQuestions.map((q) => (
                  <div key={q.id} className="bg-white p-2 rounded-lg border border-blue-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-semibold">C.{q.number}</div>
                    <div className="font-extrabold text-sm text-blue-700">{q.correctAnswer}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed answers & explanations */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                Lời Giải & Giải Thích Chi Tiết Từng Câu
              </h4>

              {activeQuestions.map((q) => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      Câu {q.number}: Đáp án đúng: <b className="text-blue-700 text-base">[{q.correctAnswer}]</b>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{q.score} điểm</span>
                  </div>

                  <p className="text-xs text-slate-600 italic">Đề: {q.questionText}</p>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    <div className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      Hướng dẫn giải chi tiết:
                    </div>
                    <div className="whitespace-pre-line">{q.explanation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: HƯỚNG DẪN CHẤM & BAREM ================= */}
        {activeTab === 'rubric' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  HƯỚNG DẪN CHẤM & BIỂU ĐIỂM CHI TIẾT
                </h4>
                <p className="text-xs text-slate-500">
                  Barem điểm thành phần (0.25đ / 0.5đ) phục vụ chấm thi thống nhất, khách quan
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                Thang điểm {exam.totalScore}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-16 text-center">Câu</th>
                    <th className="p-3 w-40">Nội dung / Yêu cầu đạt</th>
                    <th className="p-3">Nội dung đáp án & Barem điểm thành phần</th>
                    <th className="p-3 w-20 text-center">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-center align-top text-blue-900">
                        Câu {q.number}
                      </td>
                      <td className="p-3 align-top font-medium text-slate-700">
                        <div>{q.topic || 'Kiến thức trọng tâm'}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          [{q.level === 'recognition' ? 'Nhận biết' : q.level === 'understanding' ? 'Thông hiểu' : q.level === 'application' ? 'Vận dụng' : 'Vận dụng cao'}]
                        </div>
                      </td>
                      <td className="p-3 align-top space-y-1.5 text-slate-800">
                        <div>
                          Đáp án đúng: <b className="text-blue-700">{q.correctAnswer}</b>
                        </div>
                        <div className="text-slate-600">{q.explanation}</div>

                        {q.criteria && q.criteria.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 bg-blue-50/40 p-2 rounded">
                            <span className="font-bold text-[11px] text-blue-900 block">
                              Barem điểm chi tiết:
                            </span>
                            {q.criteria.map((c, i) => (
                              <div key={i} className="flex justify-between items-center text-[11px]">
                                <span>• {c.step}</span>
                                <span className="font-bold text-blue-800">{c.points}đ</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center align-top font-bold text-slate-900">
                        {q.score}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: MA TRẬN ĐỀ ================= */}
        {activeTab === 'matrix' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base uppercase">
                  MA TRẬN ĐỀ KIỂM TRA CHUẨN BỘ GIÁO DỤC VÀ ĐÀO TẠO
                </h4>
                <p className="text-xs text-slate-500">
                  Số câu, số điểm và tỷ lệ % phân hóa 4 mức độ nhận thức khớp 100% với nội dung đề thi
                </p>
              </div>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-300 text-left w-48">
                      Chủ đề / Đơn vị kiến thức
                    </th>
                    <th colSpan={2} className="p-2 border-r border-slate-300 bg-emerald-50 text-emerald-900">
                      Mức 1: Nhận biết
                    </th>
                    <th colSpan={2} className="p-2 border-r border-slate-300 bg-blue-50 text-blue-900">
                      Mức 2: Thông hiểu
                    </th>
                    <th colSpan={2} className="p-2 border-r border-slate-300 bg-amber-50 text-amber-900">
                      Mức 3: Vận dụng
                    </th>
                    <th colSpan={2} className="p-2 border-r border-slate-300 bg-purple-50 text-purple-900">
                      Mức 4: Vận dụng cao
                    </th>
                    <th colSpan={3} className="p-2 bg-slate-200 text-slate-900">
                      Tổng cộng
                    </th>
                  </tr>
                  <tr className="border-t border-slate-300 text-[11px]">
                    <th className="p-1.5 border-r border-slate-300 bg-emerald-50">Số câu</th>
                    <th className="p-1.5 border-r border-slate-300 bg-emerald-50">Điểm</th>
                    <th className="p-1.5 border-r border-slate-300 bg-blue-50">Số câu</th>
                    <th className="p-1.5 border-r border-slate-300 bg-blue-50">Điểm</th>
                    <th className="p-1.5 border-r border-slate-300 bg-amber-50">Số câu</th>
                    <th className="p-1.5 border-r border-slate-300 bg-amber-50">Điểm</th>
                    <th className="p-1.5 border-r border-slate-300 bg-purple-50">Số câu</th>
                    <th className="p-1.5 border-r border-slate-300 bg-purple-50">Điểm</th>
                    <th className="p-1.5 border-r border-slate-300 bg-slate-200">Số câu</th>
                    <th className="p-1.5 border-r border-slate-300 bg-slate-200">Điểm</th>
                    <th className="p-1.5 bg-slate-200">Tỷ lệ %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {exam.matrix?.rows?.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-left border-r border-slate-200 text-slate-900">
                        {row.topicName}
                      </td>
                      <td className="p-2 border-r border-slate-200">{row.recognitionCount || '-'}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">{row.recognitionScore ? `${row.recognitionScore}đ` : '-'}</td>
                      <td className="p-2 border-r border-slate-200">{row.understandingCount || '-'}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">{row.understandingScore ? `${row.understandingScore}đ` : '-'}</td>
                      <td className="p-2 border-r border-slate-200">{row.applicationCount || '-'}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">{row.applicationScore ? `${row.applicationScore}đ` : '-'}</td>
                      <td className="p-2 border-r border-slate-200">{row.highApplicationCount || '-'}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">{row.highApplicationScore ? `${row.highApplicationScore}đ` : '-'}</td>
                      <td className="p-2 border-r border-slate-200 font-extrabold text-slate-900 bg-slate-50">{row.totalCount}</td>
                      <td className="p-2 border-r border-slate-200 font-extrabold text-blue-700 bg-slate-50">{row.totalScore}đ</td>
                      <td className="p-2 font-bold bg-slate-50">{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-400 text-slate-900">
                  <tr>
                    <td className="p-2.5 text-left border-r border-slate-300 uppercase">
                      Tổng số điểm & tỷ lệ %
                    </td>
                    <td className="p-2 border-r border-slate-300">{exam.matrix?.summary?.recognitionCount}</td>
                    <td className="p-2 border-r border-slate-300 text-blue-700">{exam.matrix?.summary?.recognitionScore}đ</td>
                    <td className="p-2 border-r border-slate-300">{exam.matrix?.summary?.understandingCount}</td>
                    <td className="p-2 border-r border-slate-300 text-blue-700">{exam.matrix?.summary?.understandingScore}đ</td>
                    <td className="p-2 border-r border-slate-300">{exam.matrix?.summary?.applicationCount}</td>
                    <td className="p-2 border-r border-slate-300 text-blue-700">{exam.matrix?.summary?.applicationScore}đ</td>
                    <td className="p-2 border-r border-slate-300">{exam.matrix?.summary?.highApplicationCount}</td>
                    <td className="p-2 border-r border-slate-300 text-blue-700">{exam.matrix?.summary?.highApplicationScore}đ</td>
                    <td className="p-2 border-r border-slate-300 text-slate-900">{exam.matrix?.summary?.totalCount} câu</td>
                    <td className="p-2 border-r border-slate-300 text-blue-700">{exam.matrix?.summary?.totalScore}đ</td>
                    <td className="p-2 text-blue-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: BẢN ĐẶC TẢ ================= */}
        {activeTab === 'spec' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base uppercase">
                  BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ
                </h4>
                <p className="text-xs text-slate-500">
                  Chi tiết từng đơn vị kiến thức, yêu cầu cần đạt (chuẩn GDPT 2018) và phân bổ số câu, điểm
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3 w-40">Chủ đề</th>
                    <th className="p-3 w-44">Đơn vị kiến thức</th>
                    <th className="p-3">Yêu cầu cần đạt chuẩn GDPT 2018</th>
                    <th className="p-3 w-28 text-center">Câu số</th>
                    <th className="p-3 w-28">Mức độ</th>
                    <th className="p-3 w-20 text-center">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {exam.specification?.map((item) => (
                    <tr key={item.stt} className="hover:bg-slate-50/70">
                      <td className="p-3 text-center font-bold text-slate-900">{item.stt}</td>
                      <td className="p-3 font-semibold text-slate-900">{item.topic}</td>
                      <td className="p-3 text-slate-800">{item.unit}</td>
                      <td className="p-3 text-slate-600 leading-relaxed">{item.outcome}</td>
                      <td className="p-3 text-center font-bold text-blue-700">{item.questionNumbers}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {item.level}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900">{item.score}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: ĐỐI CHIẾU NHIỀU MÃ ĐỀ ================= */}
        {activeTab === 'multi_code' && variants.length > 1 && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div>
              <h4 className="font-bold text-slate-900 text-base uppercase flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                BẢNG ĐỐI CHIẾU ĐÁP ÁN {variants.length} MÃ ĐỀ THI
              </h4>
              <p className="text-xs text-slate-500">
                Tự động hoán vị thứ tự câu hỏi và phương án trả lời. Giúp giáo viên đối chiếu chấm thi nhanh chóng.
              </p>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2.5 border-r border-slate-800 w-16">Câu</th>
                    {variants.map((v) => (
                      <th key={v.code} className="p-2.5 border-r border-slate-800">
                        MÃ ĐỀ {v.code}
                      </th>
                    ))}
                    <th className="p-2.5 w-20">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {variants[0].questions.map((_baseQ, qIdx) => (
                    <tr key={qIdx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold border-r border-slate-200 bg-slate-50">
                        Câu {qIdx + 1}
                      </td>
                      {variants.map((v) => {
                        const qItem = v.questions[qIdx];
                        return (
                          <td key={v.code} className="p-2 border-r border-slate-200 font-extrabold text-blue-700">
                            {qItem?.correctAnswer || '-'}
                          </td>
                        );
                      })}
                      <td className="p-2 font-semibold text-slate-600">
                        {variants[0].questions[qIdx]?.score}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
