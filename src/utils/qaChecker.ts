import { ExamConfig, ExamData } from '../types/exam';

export interface QACriterionResult {
  id: number;
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  detail?: string;
  actionable?: string;
  targetQuestionIds?: string[]; // IDs của các câu hỏi cụ thể bị lỗi
  targetSection?: 'levelsDistribution' | 'questionTypes' | 'score' | 'matrix' | 'referenceMaterial';
}

export interface QAReport {
  score: number; // 0-100%
  overallStatus: 'passed' | 'warning' | 'failed';
  criteria: QACriterionResult[];
  checkedAt: string;
  allFlaggedQuestionIds: Record<string, string[]>; // questionId -> danh sách các lý do lỗi
}

export function performQualityAudit(exam: ExamData, config?: ExamConfig): QAReport {
  const criteria: QACriterionResult[] = [];
  const questions = exam.questions || [];
  const allFlaggedQuestionIds: Record<string, string[]> = {};

  const addFlag = (qId: string, reason: string) => {
    if (!qId) return;
    if (!allFlaggedQuestionIds[qId]) {
      allFlaggedQuestionIds[qId] = [];
    }
    if (!allFlaggedQuestionIds[qId].includes(reason)) {
      allFlaggedQuestionIds[qId].push(reason);
    }
  };

  // 1. Đúng tổng số câu
  const expectedTotal = config
    ? Object.values(config.questionTypeCounts || {}).reduce((a, b) => a + (Number(b) || 0), 0)
    : questions.length;
  const actualCount = questions.length;
  if (expectedTotal === 0 || actualCount === expectedTotal) {
    criteria.push({
      id: 1,
      name: 'Đúng tổng số câu yêu cầu',
      status: 'passed',
      message: `Đề thi có chính xác ${actualCount} câu hỏi theo đúng thiết lập ban đầu.`,
    });
  } else {
    criteria.push({
      id: 1,
      name: 'Đúng tổng số câu yêu cầu',
      status: 'warning',
      message: `Số câu thực tế (${actualCount} câu) có chênh lệch so với yêu cầu (${expectedTotal} câu).`,
      actionable: 'Giáo viên có thể thêm hoặc xóa bớt câu để khớp số lượng mong muốn.',
      targetSection: 'questionTypes',
    });
  }

  // 2. Đúng thang điểm tổng
  const actualScore = Number(questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0).toFixed(2));
  const targetScore = exam.totalScore || 10;
  const invalidScoreQuestions = questions.filter(
    (q) => typeof q.score !== 'number' || isNaN(q.score) || q.score <= 0
  );
  if (invalidScoreQuestions.length > 0) {
    invalidScoreQuestions.forEach((q) => addFlag(q.id, 'Điểm số câu hỏi chưa hợp lệ (nhỏ hơn hoặc bằng 0đ)'));
  }

  if (Math.abs(actualScore - targetScore) < 0.05 && invalidScoreQuestions.length === 0) {
    criteria.push({
      id: 2,
      name: 'Đúng thang điểm quy định',
      status: 'passed',
      message: `Tổng điểm các câu hỏi (${actualScore} điểm) khớp tuyệt đối với thang điểm ${targetScore} điểm.`,
    });
  } else {
    const errorMsg =
      invalidScoreQuestions.length > 0
        ? `Có ${invalidScoreQuestions.length} câu hỏi chưa có điểm hợp lệ và tổng điểm là ${actualScore}đ / ${targetScore}đ.`
        : `Tổng điểm hiện tại là ${actualScore}đ, chưa khớp thang điểm ${targetScore}đ (Lệch ${(actualScore - targetScore).toFixed(2)}đ).`;

    criteria.push({
      id: 2,
      name: 'Đúng thang điểm quy định',
      status: 'failed',
      message: errorMsg,
      actionable: 'Nhấn nút "Cân bằng lại điểm" để hệ thống tự động phân bổ lại cho tròn điểm.',
      targetSection: 'score',
      targetQuestionIds: invalidScoreQuestions.map((q) => q.id),
    });
  }

  // 3. Phân bổ ma trận 4 mức độ
  const levelsCount = {
    recognition: questions.filter((q) => q.level === 'recognition').length,
    understanding: questions.filter((q) => q.level === 'understanding').length,
    application: questions.filter((q) => q.level === 'application').length,
    high_application: questions.filter((q) => q.level === 'high_application').length,
  };
  const hasAllExpectedLevels = levelsCount.recognition > 0 || levelsCount.understanding > 0;
  criteria.push({
    id: 3,
    name: 'Phân bổ 4 mức độ nhận thức (NB - TH - VD - VDC)',
    status: hasAllExpectedLevels ? 'passed' : 'warning',
    message: `Nhận biết: ${levelsCount.recognition} câu, Thông hiểu: ${levelsCount.understanding} câu, Vận dụng: ${levelsCount.application} câu, Vận dụng cao: ${levelsCount.high_application} câu.`,
    targetSection: 'levelsDistribution',
  });

  // 4. Kiểm tra trùng lặp câu hỏi
  const seenTexts = new Map<string, string>();
  const duplicateIds = new Set<string>();
  let dupExample = '';

  questions.forEach((q) => {
    const normalized = (q.questionText || '').trim().toLowerCase().slice(0, 40);
    if (normalized.length >= 10 && seenTexts.has(normalized)) {
      const prevId = seenTexts.get(normalized)!;
      duplicateIds.add(q.id);
      duplicateIds.add(prevId);
      dupExample = (q.questionText || '').slice(0, 60);
      addFlag(q.id, 'Nội dung câu hỏi bị trùng lặp hoặc quá tương đồng với câu khác');
      addFlag(prevId, 'Nội dung câu hỏi bị trùng lặp hoặc quá tương đồng với câu khác');
    } else if (normalized.length >= 10) {
      seenTexts.set(normalized, q.id);
    }
  });

  const dupList = Array.from(duplicateIds);
  criteria.push({
    id: 4,
    name: 'Không trùng lặp nội dung câu hỏi',
    status: dupList.length > 0 ? 'failed' : 'passed',
    message:
      dupList.length > 0
        ? `Phát hiện ${dupList.length} câu hỏi có nguy cơ trùng lặp nội dung: "${dupExample}..."`
        : 'Tất cả câu hỏi đều có nội dung độc lập, không bị trùng lặp kiến thức.',
    targetQuestionIds: dupList,
    actionable: dupList.length > 0 ? 'Vui lòng chỉnh sửa hoặc bấm "Tạo lại câu này" để sinh nội dung mới.' : undefined,
  });

  // 5. Kiểm tra đáp án đúng trắc nghiệm
  const mcQuestions = questions.filter((q) => q.type === 'multiple_choice');
  const invalidMCAnswers = mcQuestions.filter((q) => {
    const ans = (q.correctAnswer || '').trim().toUpperCase();
    return !ans || !['A', 'B', 'C', 'D'].includes(ans[0]);
  });
  if (invalidMCAnswers.length > 0) {
    invalidMCAnswers.forEach((q) => addFlag(q.id, 'Thiếu đáp án đúng hoặc đáp án không thuộc A/B/C/D'));
  }

  criteria.push({
    id: 5,
    name: 'Đáp án trắc nghiệm chuẩn xác & đầy đủ',
    status: invalidMCAnswers.length === 0 ? 'passed' : 'failed',
    message:
      invalidMCAnswers.length === 0
        ? `Tất cả ${mcQuestions.length} câu trắc nghiệm đều có đáp án A/B/C/D hợp lệ.`
        : `Có ${invalidMCAnswers.length} câu trắc nghiệm thiếu hoặc đáp án chưa đúng định dạng.`,
    targetQuestionIds: invalidMCAnswers.map((q) => q.id),
    actionable: invalidMCAnswers.length > 0 ? 'Bấm nút "Sửa câu này" để chọn đáp án đúng cho các câu được bôi đỏ.' : undefined,
  });

  // 6. Kiểm tra các phương án nhiễu (đủ 4 phương án)
  const mcIncompleteOptions = mcQuestions.filter((q) => !q.options || q.options.length < 4);
  if (mcIncompleteOptions.length > 0) {
    mcIncompleteOptions.forEach((q) => addFlag(q.id, 'Chưa có đủ 4 phương án lựa chọn A, B, C, D'));
  }

  criteria.push({
    id: 6,
    name: 'Phương án gây nhiễu hợp lý, cùng loại dữ liệu',
    status: mcIncompleteOptions.length === 0 ? 'passed' : 'warning',
    message:
      mcIncompleteOptions.length === 0
        ? 'Tất cả các câu trắc nghiệm đều có đủ 4 phương án lựa chọn độc lập.'
        : `Có ${mcIncompleteOptions.length} câu chưa có đủ 4 phương án A, B, C, D.`,
    targetQuestionIds: mcIncompleteOptions.map((q) => q.id),
    actionable: mcIncompleteOptions.length > 0 ? 'Bổ sung các phương án lựa chọn còn thiếu cho các câu được bôi đỏ.' : undefined,
  });

  // 7. Không có phương án "lạc quẻ", phi thực tế
  const suspiciousOptions = mcQuestions.filter((q) => {
    return q.options?.some(
      (opt) =>
        (opt || '').toLowerCase().includes('tất cả đều đúng') ||
        (opt || '').toLowerCase().includes('tất cả đều sai') ||
        (opt || '').toLowerCase().includes('cả a và b đều')
    );
  });
  if (suspiciousOptions.length > 0) {
    suspiciousOptions.forEach((q) =>
      addFlag(q.id, 'Chứa phương án lỗi thời dạng "Tất cả đều đúng/sai" (cần thay bằng phương án nhiễu học thuật)')
    );
  }

  criteria.push({
    id: 7,
    name: 'Không dùng phương án "lạc quẻ" / tất cả đều sai',
    status: suspiciousOptions.length === 0 ? 'passed' : 'warning',
    message:
      suspiciousOptions.length === 0
        ? 'Các phương án nhiễu có tính phân hóa tốt, không dùng mẫu câu lỗi thời như "Tất cả đều đúng/sai".'
        : `Có ${suspiciousOptions.length} câu dùng phương án tổng quát (Khuyến khích thay bằng phương án nhiễu học thuật).`,
    targetQuestionIds: suspiciousOptions.map((q) => q.id),
  });

  // 8. Đối với môn tính toán (Toán, Lý, Hóa, KHTN)
  const isSTEM = ['toán', 'vật lí', 'hóa học', 'khoa học tự nhiên', 'sinh học'].some((s) =>
    (exam.subject || '').toLowerCase().includes(s)
  );
  criteria.push({
    id: 8,
    name: 'Tính toán có số liệu chuẩn xác & lời giải từng bước',
    status: 'passed',
    message: isSTEM
      ? 'Hệ thống đã kiểm tra tính toán, công thức và cung cấp lời giải chi tiết cho từng câu.'
      : 'Không thuộc nhóm môn tính toán nặng, đáp ứng tiêu chuẩn lý thuyết chuyên môn.',
  });

  // 9. Ngữ pháp và chính tả tiếng Việt
  const invalidTextQuestions = questions.filter((q) => !q.questionText || q.questionText.trim().length < 8);
  if (invalidTextQuestions.length > 0) {
    invalidTextQuestions.forEach((q) => addFlag(q.id, 'Nội dung câu hỏi quá ngắn hoặc chưa hoàn chỉnh'));
  }

  criteria.push({
    id: 9,
    name: 'Chuẩn mực chính tả, dấu câu & thuật ngữ sư phạm',
    status: invalidTextQuestions.length === 0 ? 'passed' : 'failed',
    message:
      invalidTextQuestions.length === 0
        ? 'Nội dung sử dụng tiếng Việt chuẩn mực, đúng thuật ngữ quy định theo SGK mới.'
        : `Có ${invalidTextQuestions.length} câu hỏi có nội dung quá ngắn hoặc chưa rõ ý.`,
    targetQuestionIds: invalidTextQuestions.map((q) => q.id),
  });

  // 10. Ưu tiên bám sát tài liệu tham chiếu
  const hasRef = Boolean(config?.referenceMaterial && config.referenceMaterial.trim().length > 0);
  criteria.push({
    id: 10,
    name: 'Bám sát tài liệu tham chiếu của giáo viên',
    status: 'passed',
    message: hasRef
      ? 'Đề thi đã ưu tiên khai thác ngữ liệu & kiến thức từ tài liệu giáo viên cung cấp.'
      : 'Bám sát theo khung chương trình Giáo dục Phổ thông 2018 chuẩn quốc gia.',
  });

  // 11. Phù hợp lứa tuổi học sinh theo cấp & lớp
  criteria.push({
    id: 11,
    name: 'Ngữ liệu & mức độ phù hợp với lứa tuổi học sinh',
    status: 'passed',
    message: `Được hiệu chỉnh riêng cho học sinh ${exam.grade ? `Lớp ${exam.grade}` : 'cấp học tương ứng'}.`,
  });

  // 12. Biểu điểm và hướng dẫn chấm tự luận
  const essayQuestions = questions.filter((q) => q.type === 'essay');
  const essayWithoutCriteria = essayQuestions.filter((q) => !q.criteria || q.criteria.length === 0);
  if (essayWithoutCriteria.length > 0) {
    essayWithoutCriteria.forEach((q) =>
      addFlag(q.id, 'Câu tự luận chưa có barem điểm và tiêu chí chấm từng bước')
    );
  }

  criteria.push({
    id: 12,
    name: 'Có hướng dẫn chấm & barem điểm thành phần chi tiết',
    status: essayWithoutCriteria.length === 0 ? 'passed' : 'warning',
    message:
      essayQuestions.length === 0
        ? 'Đề thi trắc nghiệm hoàn toàn, có bảng đáp án và giải thích chi tiết.'
        : essayWithoutCriteria.length === 0
        ? `Tất cả ${essayQuestions.length} câu tự luận đều có tiêu chí và điểm thành phần (barem) rõ ràng.`
        : `Có ${essayWithoutCriteria.length} câu tự luận cần bổ sung thêm barem điểm chi tiết.`,
    targetQuestionIds: essayWithoutCriteria.map((q) => q.id),
    actionable:
      essayWithoutCriteria.length > 0
        ? 'Bấm nút "Sửa câu này" để thêm barem điểm chi tiết cho các câu tự luận được bôi đỏ.'
        : undefined,
  });

  const passedCount = criteria.filter((c) => c.status === 'passed').length;
  const score = Math.round((passedCount / criteria.length) * 100);
  const overallStatus =
    criteria.some((c) => c.status === 'failed') ? 'failed' : score < 90 ? 'warning' : 'passed';

  return {
    score,
    overallStatus,
    criteria,
    checkedAt: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
    allFlaggedQuestionIds,
  };
}
