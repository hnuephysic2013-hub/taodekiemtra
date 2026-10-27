import React from 'react';
import { ExamData } from '../types/exam';
import { X, Calendar, FileText, Download, Trash2, ArrowRight } from 'lucide-react';
import { exportToWordDoc } from '../utils/exportHelper';

interface SavedExamsModalProps {
  savedExams: ExamData[];
  onLoadExam: (exam: ExamData) => void;
  onDeleteExam: (id: string) => void;
  onClose: () => void;
}

export const SavedExamsModal: React.FC<SavedExamsModalProps> = ({
  savedExams,
  onLoadExam,
  onDeleteExam,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Danh Sách Đề Thi Đã Lưu</h3>
              <p className="text-xs text-slate-400">Lưu trữ cục bộ an toàn trên trình duyệt của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
          {savedExams.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="font-semibold">Chưa có đề thi nào được lưu</p>
              <p className="text-xs text-slate-500 mt-1">
                Nhấn nút "💾 Lưu đề" trên thanh công cụ xem trước để lưu lại đề thi hiện tại.
              </p>
            </div>
          ) : (
            savedExams.map((exam) => (
              <div
                key={exam.id || Math.random()}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/50 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      Lớp {exam.grade} • {exam.subject}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {exam.durationMinutes} phút | {exam.questions?.length || 0} câu | {exam.totalScore}đ
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{exam.examTitle}</h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lưu lúc: {exam.createdAt ? new Date(exam.createdAt).toLocaleString('vi-VN') : 'Gần đây'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onLoadExam(exam);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <span>Mở đề</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => exportToWordDoc(exam)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200"
                    title="Tải file Word (.doc)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => exam.id && onDeleteExam(exam.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200"
                    title="Xóa đề này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
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
