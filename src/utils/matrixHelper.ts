import { ExamMatrix, MatrixRow, Question, SpecificationItem } from '../types/exam';

export function calculateMatrixFromQuestions(questions: Question[] = [], totalExamScore: number = 10): ExamMatrix {
  const safeQuestions = questions || [];
  const topicsMap = new Map<string, Question[]>();

  safeQuestions.forEach((q) => {
    const topicKey = q?.topic?.trim() || 'Nội dung kiến thức trọng tâm';
    if (!topicsMap.has(topicKey)) {
      topicsMap.set(topicKey, []);
    }
    topicsMap.get(topicKey)!.push(q);
  });

  const rows: MatrixRow[] = [];

  topicsMap.forEach((qList, topicName) => {
    let recCount = 0;
    let recScore = 0;
    let undCount = 0;
    let undScore = 0;
    let appCount = 0;
    let appScore = 0;
    let highCount = 0;
    let highScore = 0;

    qList.forEach((q) => {
      const score = Number(q.score) || 0;
      switch (q.level) {
        case 'recognition':
          recCount += 1;
          recScore += score;
          break;
        case 'understanding':
          undCount += 1;
          undScore += score;
          break;
        case 'application':
          appCount += 1;
          appScore += score;
          break;
        case 'high_application':
          highCount += 1;
          highScore += score;
          break;
        default:
          recCount += 1;
          recScore += score;
          break;
      }
    });

    const rowTotalCount = recCount + undCount + appCount + highCount;
    const rowTotalScore = Number((recScore + undScore + appScore + highScore).toFixed(2));
    const safeTotalScore = totalExamScore > 0 ? totalExamScore : 10;
    const percentage = Number(((rowTotalScore / safeTotalScore) * 100).toFixed(1));

    rows.push({
      topicName,
      recognitionCount: recCount,
      recognitionScore: Number(recScore.toFixed(2)),
      understandingCount: undCount,
      understandingScore: Number(undScore.toFixed(2)),
      applicationCount: appCount,
      applicationScore: Number(appScore.toFixed(2)),
      highApplicationCount: highCount,
      highApplicationScore: Number(highScore.toFixed(2)),
      totalCount: rowTotalCount,
      totalScore: rowTotalScore,
      percentage: isNaN(percentage) ? 0 : percentage,
    });
  });

  // Calculate summary
  let sumRecCount = 0, sumRecScore = 0;
  let sumUndCount = 0, sumUndScore = 0;
  let sumAppCount = 0, sumAppScore = 0;
  let sumHighCount = 0, sumHighScore = 0;

  rows.forEach((r) => {
    sumRecCount += r.recognitionCount;
    sumRecScore += r.recognitionScore;
    sumUndCount += r.understandingCount;
    sumUndScore += r.understandingScore;
    sumAppCount += r.applicationCount;
    sumAppScore += r.applicationScore;
    sumHighCount += r.highApplicationCount;
    sumHighScore += r.highApplicationScore;
  });

  const totalCount = sumRecCount + sumUndCount + sumAppCount + sumHighCount;
  const totalScore = Number((sumRecScore + sumUndScore + sumAppScore + sumHighScore).toFixed(2));
  const safeDivisor = totalScore > 0 ? totalScore : 10;

  const summary = {
    recognitionCount: sumRecCount,
    recognitionScore: Number(sumRecScore.toFixed(2)),
    recognitionPercent: Number(((sumRecScore / safeDivisor) * 100).toFixed(1)),
    understandingCount: sumUndCount,
    understandingScore: Number(sumUndScore.toFixed(2)),
    understandingPercent: Number(((sumUndScore / safeDivisor) * 100).toFixed(1)),
    applicationCount: sumAppCount,
    applicationScore: Number(sumAppScore.toFixed(2)),
    applicationPercent: Number(((sumAppScore / safeDivisor) * 100).toFixed(1)),
    highApplicationCount: sumHighCount,
    highApplicationScore: Number(sumHighScore.toFixed(2)),
    highApplicationPercent: Number(((sumHighScore / safeDivisor) * 100).toFixed(1)),
    totalCount,
    totalScore,
  };

  return { rows, summary };
}

export function generateSpecificationFromQuestions(questions: Question[] = []): SpecificationItem[] {
  const safeQuestions = questions || [];
  const specs: SpecificationItem[] = [];

  const grouped = new Map<string, Question[]>();
  safeQuestions.forEach((q) => {
    const key = `${q?.topic || 'Chủ đề chính'}___${q?.level || 'recognition'}___${q?.type || 'multiple_choice'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(q);
  });

  let index = 1;
  grouped.forEach((qList) => {
    const first = qList[0];
    const questionNumbers = qList.map((q) => `Câu ${q.number}`).join(', ');
    const totalScore = Number(qList.reduce((sum, q) => sum + (Number(q.score) || 0), 0).toFixed(2));

    const typeLabel =
      first.type === 'multiple_choice'
        ? 'Trắc nghiệm 4 lựa chọn'
        : first.type === 'true_false'
        ? 'Trắc nghiệm Đúng/Sai'
        : first.type === 'matching'
        ? 'Ghép nối'
        : first.type === 'fill_in_blank'
        ? 'Điền khuyết'
        : first.type === 'short_answer'
        ? 'Trả lời ngắn'
        : 'Tự luận';

    const levelLabel =
      first.level === 'recognition'
        ? 'Nhận biết'
        : first.level === 'understanding'
        ? 'Thông hiểu'
        : first.level === 'application'
        ? 'Vận dụng'
        : 'Vận dụng cao';

    specs.push({
      stt: index++,
      topic: first.topic || 'Nội dung kiến thức trọng tâm',
      unit: first.subTopic || 'Bài học',
      outcome: `Đạt chuẩn kiến thức kỹ năng mức ${levelLabel} của môn học`,
      questionNumbers,
      questionType: typeLabel,
      level: levelLabel,
      score: totalScore,
    });
  });

  return specs;
}
