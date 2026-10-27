export type EducationLevel = 'tieuhoc' | 'thcs' | 'thpt';

export type QuestionType =
  | 'multiple_choice' // Trắc nghiệm 4 lựa chọn (A, B, C, D)
  | 'true_false'       // Trắc nghiệm Đúng/Sai (4 ý a, b, c, d)
  | 'matching'         // Ghép nối (Cột 1 - Cột 2)
  | 'fill_in_blank'    // Điền khuyết
  | 'short_answer'     // Trả lời ngắn
  | 'essay';           // Tự luận (Giải thích, Trình bày, Tính toán...)

export type CognitiveLevel =
  | 'recognition'     // Nhận biết
  | 'understanding'   // Thông hiểu
  | 'application'     // Vận dụng
  | 'high_application';// Vận dụng cao

export interface SubQuestion {
  label: string; // 'a', 'b', 'c', 'd' hoặc '1', '2'
  statement: string;
  correctAnswer: string; // 'Đúng' | 'Sai' hoặc nối với đáp án
}

export interface ScoringCriterion {
  step: string;
  points: number;
}

export interface Question {
  id: string;
  number: number;
  part?: string; // 'Phần I: Trắc nghiệm 4 lựa chọn', 'Phần II: Đúng/Sai', 'Phần III: Trả lời ngắn', 'Phần IV: Tự luận'
  type: QuestionType;
  level: CognitiveLevel;
  topic?: string;
  subTopic?: string;
  questionText: string;
  options?: string[]; // A, B, C, D
  subQuestions?: SubQuestion[]; // cho dạng đúng/sai hoặc ghép nối
  correctAnswer: string;
  explanation: string;
  score: number;
  criteria?: ScoringCriterion[]; // Hướng dẫn chấm chi tiết
  needsTeacherReview?: boolean;
  reviewNote?: string;
  isPreserved?: boolean; // Giáo viên tự nhập giữ nguyên
}

export interface MatrixRow {
  topicName: string;
  recognitionCount: number;
  recognitionScore: number;
  understandingCount: number;
  understandingScore: number;
  applicationCount: number;
  applicationScore: number;
  highApplicationCount: number;
  highApplicationScore: number;
  totalCount: number;
  totalScore: number;
  percentage: number;
}

export interface MatrixSummary {
  recognitionCount: number;
  recognitionScore: number;
  recognitionPercent: number;
  understandingCount: number;
  understandingScore: number;
  understandingPercent: number;
  applicationCount: number;
  applicationScore: number;
  applicationPercent: number;
  highApplicationCount: number;
  highApplicationScore: number;
  highApplicationPercent: number;
  totalCount: number;
  totalScore: number;
}

export interface ExamMatrix {
  rows: MatrixRow[];
  summary: MatrixSummary;
}

export interface SpecificationItem {
  stt: number;
  topic: string;
  unit: string;
  outcome: string; // Yêu cầu cần đạt
  questionNumbers: string; // VD: "Câu 1, 2, 3"
  questionType: string;
  level: string;
  score: number;
}

export interface QualityReview {
  scoreMatch: boolean;
  countMatch: boolean;
  noDuplicates: boolean;
  mathAccurate: boolean;
  grammarAccurate: boolean;
  ageAppropriate: boolean;
  notes?: string;
}

export interface ExamData {
  id?: string;
  createdAt?: string;
  examTitle: string;
  schoolName: string;
  departmentName: string;
  grade: string;
  subject: string;
  educationLevel: EducationLevel;
  durationMinutes: number;
  totalScore: number;
  schoolYear: string;
  examInstructions: string;
  readingPassage?: string;
  questions: Question[];
  matrix: ExamMatrix;
  specification: SpecificationItem[];
  qualityReview?: QualityReview;
}

export interface ExamVariant {
  code: string; // '101', '102', '103', '104'
  questions: Question[];
  answerKey: { questionNumber: number; answer: string; score: number }[];
}

export interface ExamConfig {
  educationLevel: EducationLevel;
  grade: string;
  subject: string;
  customSubject: string;
  examType: string;
  customExamTitle: string;
  schoolName: string;
  departmentName: string;
  schoolYear: string;
  durationMinutes: number;
  totalScore: number;
  topic: string;
  chapter: string;
  scope: string;
  learningOutcomes: string;
  specialNotes: string;
  referenceMaterial: string;
  referenceSourceMode: 'only_upload' | 'upload_and_gdpt' | 'teacher_input';
  questionTypeCounts: {
    multipleChoice: number;
    trueFalse: number;
    matching: number;
    fillInBlank: number;
    shortAnswer: number;
    essay: number;
  };
  levelsDistribution: {
    recognition: number;
    understanding: number;
    application: number;
    highApplication: number;
  };
  distributionMode: 'percent' | 'count';
  matrixInput?: string;
  preservedQuestions: Question[];
  variantCount: number; // 1, 2, 3, 4
}
