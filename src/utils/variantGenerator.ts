import { ExamVariant, Question } from '../types/exam';

// Seeded pseudorandom shuffle for reproducible code variants
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateExamVariants(
  baseQuestions: Question[] = [],
  variantCount: number = 4
): ExamVariant[] {
  const safeQuestions = baseQuestions || [];
  const codes = ['101', '102', '103', '104', '105', '106'].slice(0, Math.max(1, variantCount));
  const variants: ExamVariant[] = [];

  codes.forEach((code, codeIdx) => {
    if (codeIdx === 0) {
      // Code 101 is the original base order
      const answerKey = safeQuestions.map((q) => ({
        questionNumber: q.number,
        answer: q.correctAnswer || 'A',
        score: Number(q.score) || 0,
      }));

      variants.push({
        code,
        questions: safeQuestions.map((q, idx) => ({ ...q, number: idx + 1 })),
        answerKey,
      });
      return;
    }

    // For other codes: group by part, shuffle questions within each part, and shuffle options
    const partGroups = new Map<string, Question[]>();
    safeQuestions.forEach((q) => {
      const partKey = q.part || (q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm');
      if (!partGroups.has(partKey)) {
        partGroups.set(partKey, []);
      }
      partGroups.get(partKey)!.push(q);
    });

    const variantQuestions: Question[] = [];
    let currentNumber = 1;
    const seedBase = Number(code) * 7919 + codeIdx * 104729;

    partGroups.forEach((groupQuestions, _partKey) => {
      // Don't shuffle essay questions drastically, keep them logical, but can reorder or keep
      let shuffledGroup: Question[];
      if (groupQuestions.every((q) => q.type === 'essay')) {
        shuffledGroup = [...groupQuestions];
      } else {
        shuffledGroup = shuffleArray(groupQuestions, seedBase + currentNumber);
      }

      shuffledGroup.forEach((q) => {
        let newOptions = q.options ? [...q.options] : undefined;
        let newCorrectAnswer = q.correctAnswer || 'A';

        // If multiple choice with options A, B, C, D
        if (q.type === 'multiple_choice' && q.options && q.options.length === 4) {
          // Identify which original option index was correct
          const correctLetter = q.correctAnswer ? q.correctAnswer.trim().toUpperCase()[0] : 'A';
          const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
          const originalCorrectIndex = letterToIndex[correctLetter] ?? 0;

          // Strip prefixes "A. ", "B. ", etc. if present to cleanly permute
          const cleanTexts = q.options.map((opt) => (opt || '').replace(/^[A-D][.:\s]\s*/, ''));
          const correctText = cleanTexts[originalCorrectIndex] || cleanTexts[0] || '';

          const permutedIndices = shuffleArray([0, 1, 2, 3], seedBase + q.number * 31);
          const permutedTexts = permutedIndices.map((idx) => cleanTexts[idx] || '');

          // Re-attach A, B, C, D prefixes
          const letters = ['A', 'B', 'C', 'D'];
          newOptions = permutedTexts.map((text, idx) => `${letters[idx]}. ${text}`);

          // Find where original correctText ended up
          const newCorrectIndex = permutedTexts.indexOf(correctText);
          newCorrectAnswer = letters[newCorrectIndex >= 0 ? newCorrectIndex : 0];
        }

        variantQuestions.push({
          ...q,
          id: `${q.id}_code_${code}`,
          number: currentNumber++,
          options: newOptions,
          correctAnswer: newCorrectAnswer,
        });
      });
    });

    const answerKey = variantQuestions.map((q) => ({
      questionNumber: q.number,
      answer: q.correctAnswer || 'A',
      score: Number(q.score) || 0,
    }));

    variants.push({
      code,
      questions: variantQuestions,
      answerKey,
    });
  });

  return variants;
}
