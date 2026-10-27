import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, X, Lightbulb, HelpCircle, ArrowDownCircle } from 'lucide-react';

export interface ErrorModalData {
  title: string;
  reason: string;
  solution: string;
  technicalInfo?: string;
  targetSection?: string;
  onRetry?: () => void;
  onJumpToSection?: (section: string) => void;
}

interface ErrorNotificationModalProps {
  error: ErrorModalData | null;
  onClose: () => void;
}

export const ErrorNotificationModal: React.FC<ErrorNotificationModalProps> = ({ error, onClose }) => {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!error) return null;

  const solutions = error.solution
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleJump = () => {
    if (error.targetSection) {
      if (error.onJumpToSection) {
        error.onJumpToSection(error.targetSection);
      } else {
        const el = document.getElementById(`setup-section-${error.targetSection}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-rose-200 my-8">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                {error.title}
              </h3>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Hệ thống thông báo sự cố & Hướng dẫn tự khắc phục
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition shrink-0 cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Section 1: Nguyên nhân sự cố */}
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wide">
              <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Nguyên nhân cụ thể:</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium pl-5">
              {error.reason}
            </p>
          </div>

          {/* Section 2: Hướng dẫn khắc phục */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Thầy/Cô có thể tự khắc phục theo các bước sau:</span>
            </div>

            <div className="space-y-1.5 pl-1">
              {solutions.map((sol, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <span className="font-medium">{sol}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Chi tiết kỹ thuật (Collapsible) */}
          {error.technicalInfo && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="w-full px-3.5 py-2 bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-semibold border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex items-center gap-1.5 hover:text-blue-600 transition cursor-pointer"
                >
                  <span>Chi tiết kỹ thuật & Log máy chủ</span>
                  {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `[Lỗi ra đề thi]\nTiêu đề: ${error.title}\nNguyên nhân: ${error.reason}\nKỹ thuật: ${error.technicalInfo || ''}`
                    );
                    alert('Đã sao chép mã lỗi vào bộ nhớ tạm.');
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                >
                  Sao chép log
                </button>
              </div>

              {showTechnical && (
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-40 select-all">
                  {error.technicalInfo}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {error.targetSection ? (
            <button
              type="button"
              onClick={handleJump}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>👉 Chuyển đến vùng bị lỗi (đã bôi đỏ)</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {error.onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  error.onRetry?.();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại ngay</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
