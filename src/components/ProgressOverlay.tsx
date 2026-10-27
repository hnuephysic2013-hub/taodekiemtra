import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Loader2, Zap, Clock } from 'lucide-react';

interface ProgressOverlayProps {
  isOpen: boolean;
}

const STEPS = [
  'Bước 1: Tiếp nhận thiết lập (Cấp, Lớp, Môn, Thời gian & Thang điểm)',
  'Bước 2: Xử lý tài liệu tham chiếu & bám sát chuẩn GDPT 2018',
  'Bước 3: Biên soạn hệ thống câu hỏi đa dạng theo 4 mức độ nhận thức',
  'Bước 4: Tạo các phương án gây nhiễu học thuật & tránh bẫy mẹo',
  'Bước 5: Xây dựng đáp án chính xác, lời giải chi tiết từng bước',
  'Bước 6: Thiết lập biểu điểm barem chấm thi tự luận & trắc nghiệm',
  'Bước 7: Tự động tính toán ma trận 2 chiều & xuất bản đặc tả tức thì',
];

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ isOpen }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      return;
    }

    // Timer counter
    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Step progression
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1400);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stepInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-blue-100 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <Sparkles className="w-7 h-7 text-amber-300 animate-spin" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">
            AI Đang Khởi Tạo Đề Thi Siêu Tốc
          </h3>
          <div className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              Đã tối ưu tốc độ ra đề (8 - 15 giây)
            </span>
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {elapsedSeconds}s
            </span>
          </div>
        </div>

        {/* Step List */}
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold scale-[1.01] shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 font-medium'
                    : 'bg-slate-50/50 border-slate-100 text-slate-400'
                }`}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300" />
                  )}
                </div>
                <span className="text-xs leading-tight">{step}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-center">
          <p className="text-[11px] text-slate-500 italic">
            * Ma trận và bản đặc tả được hệ thống tính toán tức thì, đảm bảo 100% khớp điểm số và không bị quá hạn.
          </p>
        </div>
      </div>
    </div>
  );
};
