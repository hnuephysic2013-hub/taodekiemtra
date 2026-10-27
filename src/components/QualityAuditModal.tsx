import React from 'react';
import { QAReport } from '../utils/qaChecker';
import { Question } from '../types/exam';
import { X, CheckCircle2, AlertTriangle, XCircle, Sparkles, Scale, Eye, AlertOctagon } from 'lucide-react';

interface QualityAuditModalProps {
  report: QAReport;
  questions?: Question[];
  onClose: () => void;
  onAutoRebalancePoints?: () => void;
  onHighlightQuestion?: (questionId: string, reason: string, allIds?: string[]) => void;
  onHighlightAllErrors?: () => void;
  onHighlightSection?: (sectionKey: string) => void;
}

export const QualityAuditModal: React.FC<QualityAuditModalProps> = ({
  report,
  questions = [],
  onClose,
  onAutoRebalancePoints,
  onHighlightQuestion,
  onHighlightAllErrors,
  onHighlightSection,
}) => {
  const flaggedCount = Object.keys(report.allFlaggedQuestionIds || {}).length;

  const getQuestionLabel = (qId: string) => {
    const found = questions.find((q) => q.id === qId);
    return found ? `Câu ${found.number}` : 'Câu hỏi';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-base">Hệ Thống Kiểm Tra Chất Lượng Tự Động (QA)</h3>
              <p className="text-xs text-slate-400">Rà soát 12 tiêu chí chuẩn khảo thí Bộ GD&ĐT & Bôi đỏ vùng lỗi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Summary Score Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              report.overallStatus === 'passed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : report.overallStatus === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {report.overallStatus === 'passed' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : report.overallStatus === 'warning' ? (
                <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-base">
                  {report.overallStatus === 'passed'
                    ? 'Đề thi đạt tiêu chuẩn chất lượng cao!'
                    : report.overallStatus === 'warning'
                    ? 'Đề thi đạt chuẩn nhưng có lưu ý cần xem xét'
                    : 'Phát hiện tiêu chí chưa đồng bộ, cần kiểm tra lại'}
                </h4>
                <p className="text-xs opacity-90">
                  Thời gian kiểm tra: {report.checkedAt}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-3xl font-extrabold">{report.score}%</span>
              <span className="block text-[11px] font-semibold opacity-80">Đạt yêu cầu</span>
            </div>
          </div>

          {/* Quick Highlight All Errors Banner */}
          {flaggedCount > 0 && onHighlightAllErrors && (
            <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-red-900">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold text-red-800">
                    Phát hiện {flaggedCount} câu hỏi / vị trí có lưu ý trong đề thi!
                  </span>
                  <p className="text-[11px] text-red-700">
                    Bạn có thể bôi đỏ trực tiếp các câu hỏi này trên đề thi để dễ dàng rà soát và chỉnh sửa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onHighlightAllErrors();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-lg bg-red-600 text-white font-extrabold text-xs hover:bg-red-700 whitespace-nowrap shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔴 Bôi đỏ tất cả vùng lỗi</span>
              </button>
            </div>
          )}

          {/* Quick Actions for Point Rebalancing */}
          {onAutoRebalancePoints && report.criteria.some((c) => c.id === 2 && c.status !== 'passed') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-blue-900">
                <Scale className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Tổng điểm câu hỏi đang lệch so với thang điểm đề ra. Bạn có muốn tự động cân bằng lại điểm?
                </span>
              </div>
              <button
                type="button"
                onClick={onAutoRebalancePoints}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 whitespace-nowrap shadow-xs cursor-pointer"
              >
                Cân bằng điểm ngay
              </button>
            </div>
          )}

          {/* 12 Criteria List */}
          <div className="space-y-2.5">
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Danh Sách 12 Tiêu Chí Đánh Giá
            </h5>
            <div className="space-y-2">
              {report.criteria.map((item) => {
                const hasQuestionTargets = item.targetQuestionIds && item.targetQuestionIds.length > 0;
                const hasSectionTarget = Boolean(item.targetSection);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                      item.status === 'passed'
                        ? 'bg-slate-50 border-slate-200'
                        : item.status === 'warning'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-red-50/80 border-2 border-red-400'
                    }`}
                  >
                    <div className="mt-0.5">
                      {item.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : item.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 text-xs">
                          Tiêu chí {item.id}: {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {item.status === 'passed' ? 'ĐẠT' : item.status === 'warning' ? 'LƯU Ý' : 'CHƯA ĐẠT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{item.message}</p>
                      
                      {item.actionable && (
                        <p className="text-[11px] text-blue-700 font-semibold">
                          💡 Hướng xử lý: {item.actionable}
                        </p>
                      )}

                      {/* Red Highlight Action Buttons for Specific Questions or Section */}
                      {item.status !== 'passed' && (hasQuestionTargets || hasSectionTarget) && (
                        <div className="pt-1.5 flex flex-wrap items-center gap-2">
                          {hasQuestionTargets && onHighlightQuestion && (
                            <button
                              type="button"
                              onClick={() => {
                                onHighlightQuestion(
                                  item.targetQuestionIds![0],
                                  item.message,
                                  item.targetQuestionIds
                                );
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>
                                🔴 Bôi đỏ & xem {item.targetQuestionIds!.length} câu hỏi bị lỗi (
                                {item.targetQuestionIds!.map(getQuestionLabel).join(', ')})
                              </span>
                            </button>
                          )}

                          {hasSectionTarget && onHighlightSection && (
                            <button
                              type="button"
                              onClick={() => {
                                onHighlightSection(item.targetSection!);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <span>
                                🔴 Bôi đỏ khu vực thiết lập (
                                {item.targetSection === 'levelsDistribution'
                                  ? 'Ma trận mức độ nhận thức'
                                  : item.targetSection === 'questionTypes'
                                  ? 'Số lượng dạng câu hỏi'
                                  : item.targetSection === 'score'
                                  ? 'Thang điểm tổng'
                                  : 'Cấu hình đề'}
                                )
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng bảng kiểm tra
          </button>
        </div>
      </div>
    </div>
  );
};

