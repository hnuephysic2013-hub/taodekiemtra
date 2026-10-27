import React from 'react';
import { BookOpen, Sparkles, ShieldCheck, Database, History, RotateCcw, GraduationCap } from 'lucide-react';

interface HeaderProps {
  onOpenBank: () => void;
  onOpenHistory: () => void;
  onResetConfig: () => void;
  bankCount: number;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBank,
  onOpenHistory,
  onResetConfig,
  bankCount,
  historyCount,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Academic Safety Alert */}
      <div className="bg-blue-950/80 border-b border-blue-800/40 px-4 py-1.5 text-xs text-blue-200 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            <strong className="text-white">NGUYÊN TẮC AN TOÀN HỌC THUẬT:</strong> Đề được AI hỗ trợ tạo chuẩn chương trình GDPT. Giáo viên cần kiểm duyệt nội dung trước khi in ấn và sử dụng.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                RA ĐỀ KIỂM TRA AI – 3 CẤP
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wide">
                GDPT 2018
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Tiểu học • THCS • THPT – Tự động hóa Ma trận, Bản đặc tả, Đề thi & Đáp án
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-amber-300/90 font-medium flex-wrap">
              <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-200">
                👨‍🏫 Tác giả: <strong>Thầy Trần Minh Chiến</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">
                Trường THCS Thái Hòa - Nghệ An
              </span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBank}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Quản lý ngân hàng câu hỏi đã lưu"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Ngân hàng câu hỏi</span>
            {bankCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                {bankCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Lịch sử đề thi đã lưu"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>Đề đã lưu</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onResetConfig}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Khôi phục cấu hình mặc định"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
