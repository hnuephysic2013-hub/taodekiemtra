import React, { useState } from 'react';
import { Question, CognitiveLevel, QuestionType, ScoringCriterion } from '../types/exam';
import { X, Plus, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { autoConvertToUnicode } from '../utils/vietnameseFontConverter';

interface EditQuestionModalProps {
  question: Question;
  onSave: (updated: Question) => void;
  onClose: () => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  question,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Question>({
    ...question,
    options: question.options ? [...question.options] : ['', '', '', ''],
    criteria: question.criteria ? [...question.criteria] : [],
  });
  const [fontNotice, setFontNotice] = useState<string | null>(null);

  const handleFixFont = () => {
    const fixedQText = autoConvertToUnicode(formData.questionText).convertedText;
    const fixedExplanation = autoConvertToUnicode(formData.explanation || '').convertedText;
    const fixedAnswer = autoConvertToUnicode(formData.correctAnswer).convertedText;
    const fixedOptions = formData.options?.map((opt) => autoConvertToUnicode(opt).convertedText) || [];
    setFormData({
      ...formData,
      questionText: fixedQText,
      explanation: fixedExplanation,
      correctAnswer: fixedAnswer,
      options: fixedOptions,
    });
    setFontNotice('Đã sửa và chuẩn hóa font Unicode cho toàn bộ câu hỏi này!');
  };

  const handleOptionChange = (idx: number, val: string) => {
    const opts = formData.options ? [...formData.options] : ['', '', '', ''];
    opts[idx] = val;
    setFormData({ ...formData, options: opts });
  };

  const handleAddCriterion = () => {
    const c = formData.criteria ? [...formData.criteria] : [];
    c.push({ step: '', points: 0.25 });
    setFormData({ ...formData, criteria: c });
  };

  const handleUpdateCriterion = (idx: number, step: string, points: number) => {
    const c = formData.criteria ? [...formData.criteria] : [];
    c[idx] = { step, points };
    setFormData({ ...formData, criteria: c });
  };

  const handleRemoveCriterion = (idx: number) => {
    const c = (formData.criteria || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, criteria: c });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-base flex items-center gap-2">
              ✏️ Chỉnh Sửa Câu {question.number}
            </h3>
            <button
              type="button"
              onClick={handleFixFont}
              title="Tự động phát hiện và chuyển đổi bảng mã cũ (TCVN3 / VNI) sang Unicode chuẩn"
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Sửa lỗi font</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {fontNotice && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{fontNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFontNotice(null)}
              className="text-emerald-700 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Metadata */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Mức độ nhận thức</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as CognitiveLevel })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="recognition">Nhận biết</option>
                <option value="understanding">Thông hiểu</option>
                <option value="application">Vận dụng</option>
                <option value="high_application">Vận dụng cao</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Dạng câu hỏi</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                <option value="true_false">Đúng / Sai</option>
                <option value="short_answer">Trả lời ngắn</option>
                <option value="essay">Tự luận</option>
                <option value="matching">Ghép nối</option>
                <option value="fill_in_blank">Điền khuyết</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Điểm số</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-blue-700"
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung câu hỏi</label>
            <textarea
              rows={4}
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                const { convertedText, detectedEncoding } = autoConvertToUnicode(text);
                if (detectedEncoding) {
                  e.preventDefault();
                  const textarea = e.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const current = formData.questionText || '';
                  setFormData({
                    ...formData,
                    questionText: current.substring(0, start) + convertedText + current.substring(end),
                  });
                  setFontNotice(`Tự động sửa mã ${detectedEncoding} → Unicode chuẩn!`);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-sans"
              required
            />
          </div>

          {/* Options for Multiple Choice */}
          {formData.type === 'multiple_choice' && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700">4 Phương Án Lựa Chọn (A, B, C, D)</label>
              {['A', 'B', 'C', 'D'].map((letter, idx) => (
                <div key={letter} className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 w-5">{letter}.</span>
                  <input
                    type="text"
                    value={formData.options?.[idx] || ''}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  />
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={formData.correctAnswer.trim().toUpperCase().startsWith(letter)}
                      onChange={() => setFormData({ ...formData, correctAnswer: letter })}
                    />
                    <span className="text-[11px] font-semibold text-emerald-700">Đúng</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Correct Answer & Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Đáp án đúng</label>
              <input
                type="text"
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-blue-700 bg-white"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Chủ đề / Đơn vị bài học</label>
              <input
                type="text"
                value={formData.topic || ''}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Hướng dẫn giải chi tiết</label>
            <textarea
              rows={3}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Criteria for essay */}
          {formData.type === 'essay' && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Biểu điểm thành phần (Barem chấm)</label>
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm ý
                </button>
              </div>

              {formData.criteria?.map((crit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ý chấm (VD: Nêu đúng công thức...)"
                    value={crit.step}
                    onChange={(e) => handleUpdateCriterion(idx, e.target.value, crit.points)}
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    value={crit.points}
                    onChange={(e) => handleUpdateCriterion(idx, crit.step, parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center font-bold"
                  />
                  <span className="text-xs text-slate-500">đ</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
