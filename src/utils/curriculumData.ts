import { EducationLevel } from '../types/exam';

export interface SubjectOption {
  id: string;
  name: string;
  popular?: boolean;
}

export const SUBJECTS_BY_LEVEL: Record<EducationLevel, SubjectOption[]> = {
  tieuhoc: [
    { id: 'Toán', name: 'Toán', popular: true },
    { id: 'Tiếng Việt', name: 'Tiếng Việt', popular: true },
    { id: 'Tiếng Anh', name: 'Tiếng Anh', popular: true },
    { id: 'Tự nhiên và Xã hội', name: 'Tự nhiên và Xã hội (Lớp 1-3)', popular: true },
    { id: 'Khoa học', name: 'Khoa học (Lớp 4-5)', popular: true },
    { id: 'Lịch sử và Địa lí', name: 'Lịch sử và Địa lí (Lớp 4-5)', popular: true },
    { id: 'Tin học & Công nghệ', name: 'Tin học & Công nghệ', popular: true },
    { id: 'Đạo đức', name: 'Đạo đức' },
    { id: 'Hoạt động trải nghiệm', name: 'Hoạt động trải nghiệm' },
    { id: 'Âm nhạc', name: 'Âm nhạc' },
    { id: 'Mĩ thuật', name: 'Mĩ thuật' },
  ],
  thcs: [
    { id: 'Toán', name: 'Toán', popular: true },
    { id: 'Ngữ văn', name: 'Ngữ văn', popular: true },
    { id: 'Tiếng Anh', name: 'Tiếng Anh', popular: true },
    { id: 'Khoa học tự nhiên', name: 'Khoa học tự nhiên (Lý - Hóa - Sinh)', popular: true },
    { id: 'Lịch sử và Địa lí', name: 'Lịch sử và Địa lí', popular: true },
    { id: 'Giáo dục công dân', name: 'Giáo dục công dân (GDCD)', popular: true },
    { id: 'Tin học', name: 'Tin học', popular: true },
    { id: 'Công nghệ', name: 'Công nghệ' },
    { id: 'Hoạt động trải nghiệm', name: 'Hoạt động trải nghiệm, hướng nghiệp' },
    { id: 'Giáo dục thể chất', name: 'Giáo dục thể chất' },
  ],
  thpt: [
    { id: 'Toán', name: 'Toán', popular: true },
    { id: 'Ngữ văn', name: 'Ngữ văn', popular: true },
    { id: 'Tiếng Anh', name: 'Tiếng Anh', popular: true },
    { id: 'Vật lí', name: 'Vật lí', popular: true },
    { id: 'Hóa học', name: 'Hóa học', popular: true },
    { id: 'Sinh học', name: 'Sinh học', popular: true },
    { id: 'Lịch sử', name: 'Lịch sử', popular: true },
    { id: 'Địa lí', name: 'Địa lí', popular: true },
    { id: 'Giáo dục KT & PL', name: 'Giáo dục kinh tế và pháp luật', popular: true },
    { id: 'Tin học', name: 'Tin học', popular: true },
    { id: 'Công nghệ', name: 'Công nghệ' },
  ],
};

export const GRADES_BY_LEVEL: Record<EducationLevel, string[]> = {
  tieuhoc: ['1', '2', '3', '4', '5'],
  thcs: ['6', '7', '8', '9'],
  thpt: ['10', '11', '12'],
};

export const EXAM_TYPES = [
  { id: '15_phut', label: 'Kiểm tra 15 phút (Đánh giá thường xuyên)' },
  { id: 'giua_ky_1', label: 'Kiểm tra định kỳ Giữa Học kỳ I' },
  { id: 'cuoi_ky_1', label: 'Kiểm tra định kỳ Cuối Học kỳ I' },
  { id: 'giua_ky_2', label: 'Kiểm tra định kỳ Giữa Học kỳ II' },
  { id: 'cuoi_ky_2', label: 'Kiểm tra định kỳ Cuối Học kỳ II' },
  { id: 'on_tap', label: 'Đề ôn tập củng cố kiến thức' },
  { id: 'luyen_tap', label: 'Đề luyện tập chuyên đề' },
  { id: 'khao_sat', label: 'Khảo sát chất lượng đầu năm / giữa năm' },
  { id: 'hsg', label: 'Bồi dưỡng học sinh giỏi' },
  { id: 'khac', label: 'Khác (Tự nhập tên đề)' },
];

export const STANDARD_DURATIONS = [10, 15, 30, 45, 60, 90, 120];

export const STANDARD_MATRIX_PRESETS = [
  {
    id: 'standard_70_30',
    title: 'Chuẩn 70% Trắc nghiệm + 30% Tự luận (Phổ biến)',
    description: '40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao',
    levels: { recognition: 40, understanding: 30, application: 20, highApplication: 10 },
    types: { multipleChoice: 28, trueFalse: 0, matching: 0, fillInBlank: 0, shortAnswer: 0, essay: 2 },
  },
  {
    id: 'format_bo_2025',
    title: 'Cấu trúc định dạng mới Bộ GD&ĐT (TN Nhiều PA + Đúng/Sai + Trả lời ngắn)',
    description: 'Phần 1: 12 câu TN 4 lựa chọn (3đ) | Phần 2: 4 câu Đúng/Sai (4đ) | Phần 3: 6 câu Trả lời ngắn (3đ)',
    levels: { recognition: 30, understanding: 40, application: 20, highApplication: 10 },
    types: { multipleChoice: 12, trueFalse: 4, matching: 0, fillInBlank: 0, shortAnswer: 6, essay: 0 },
  },
  {
    id: 'standard_100_tn',
    title: '100% Trắc nghiệm khách quan (Đề 40 câu)',
    description: '16 câu Nhận biết (40%), 12 câu Thông hiểu (30%), 8 câu Vận dụng (20%), 4 câu VDC (10%)',
    levels: { recognition: 40, understanding: 30, application: 20, highApplication: 10 },
    types: { multipleChoice: 40, trueFalse: 0, matching: 0, fillInBlank: 0, shortAnswer: 0, essay: 0 },
  },
  {
    id: 'standard_50_50',
    title: '50% Trắc nghiệm + 50% Tự luận (Toán / KHTN THCS)',
    description: 'Phù hợp kiểm tra 45 phút - Giữa kỳ',
    levels: { recognition: 35, understanding: 35, application: 20, highApplication: 10 },
    types: { multipleChoice: 15, trueFalse: 0, matching: 0, fillInBlank: 2, shortAnswer: 0, essay: 3 },
  },
  {
    id: 'tieuhoc_tt27',
    title: 'Chuẩn Tiểu học (Thông tư 27 - 3 mức độ)',
    description: 'Mức 1 (Nhận biết): 50%, Mức 2 (Kết nối/Thông hiểu): 30%, Mức 3 (Vận dụng): 20%',
    levels: { recognition: 50, understanding: 30, application: 15, highApplication: 5 },
    types: { multipleChoice: 6, trueFalse: 0, matching: 1, fillInBlank: 1, shortAnswer: 0, essay: 2 },
  },
];
