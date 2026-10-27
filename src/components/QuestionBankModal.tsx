import React, { useState } from 'react';
import { Question, CognitiveLevel, QuestionType } from '../types/exam';
import { X, Search, Plus, Trash2, Database, BookOpen, Check } from 'lucide-react';

interface QuestionBankModalProps {
  bank: (Question & { savedSubject?: string; savedGrade?: string; savedAt?: string })[];
  onInsertToExam: (q: Question) => void;
  onDeleteFromBank: (id: string) => void;
  onClearBank: () => void;
  onClose: () => void;
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  bank,
  onInsertToExam,
  onDeleteFromBank,
  onClearBank,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [insertedIds, setInsertedIds] = useState<Set<string>>(new Set());

  const filtered = bank.filter((q) => {
    const matchSearch =
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchLevel = filterLevel === 'all' || q.level === filterLevel;
    const matchType = filterType === 'all' || q.type === filterType;
    return matchSearch && matchLevel && matchType;
  });

  const handleInsert = (q: Question) => {
    onInsertToExam(q);
    setInsertedIds((prev) => new Set(prev).add(q.id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Ngân Hàng Câu Hỏi Riêng Của Giáo Viên</h3>
              <p className="text-xs text-slate-400">
                Lưu trữ và tái sử dụng câu hỏi chất lượng cao ({bank.length} câu đã lưu)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, chủ đề câu hỏi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="all">Mọi mức độ</option>
            <option value="recognition">Nhận biết</option>
            <option value="understanding">Thông hiểu</option>
            <option value="application">Vận dụng</option>
            <option value="high_application">Vận dụng cao</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="all">Mọi dạng câu</option>
            <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
            <option value="true_false">Đúng / Sai</option>
            <option value="short_answer">Trả lời ngắn</option>
            <option value="essay">Tự luận</option>
          </select>

          {bank.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xóa tất cả câu hỏi trong ngân hàng?')) {
                  onClearBank();
                }
              }}
              className="text-xs text-red-600 hover:underline px-2 py-1 font-medium"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 text-xs sm:text-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="font-semibold">Chưa có câu hỏi nào phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">
                Khi xem đề thi, nhấn nút "Lưu vào ngân hàng" tại mỗi câu để tích lũy kho câu hỏi của riêng bạn.
              </p>
            </div>
          ) : (
            filtered.map((q) => {
              const isInserted = insertedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {q.type === 'multiple_choice'
                          ? 'Trắc nghiệm'
                          : q.type === 'true_false'
                          ? 'Đúng/Sai'
                          : q.type === 'short_answer'
                          ? 'Trả lời ngắn'
                          : 'Tự luận'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {q.level === 'recognition'
                          ? 'Nhận biết'
                          : q.level === 'understanding'
                          ? 'Thông hiểu'
                          : q.level === 'application'
                          ? 'Vận dụng'
                          : 'Vận dụng cao'}
                      </span>
                      {q.topic && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • {q.topic}
                        </span>
                      )}
                      <span className="text-[11px] text-blue-700 font-bold">
                        ({q.score}đ)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleInsert(q)}
                        disabled={isInserted}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isInserted
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isInserted ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Đã thêm vào đề
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Thêm vào đề hiện tại
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteFromBank(q.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                        title="Xóa khỏi ngân hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="font-semibold text-slate-800 text-xs sm:text-sm">{q.questionText}</p>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-600 pt-1">
                      {q.options.map((opt, i) => (
                        <div key={i} className="px-2 py-0.5 rounded bg-slate-50">
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs pt-1 border-t border-slate-100 flex items-center justify-between text-slate-500">
                    <span>
                      Đáp án đúng: <b className="text-blue-700">{q.correctAnswer}</b>
                    </span>
                    {q.savedAt && <span>Lưu ngày: {q.savedAt}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
