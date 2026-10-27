import { ExamData, ExamVariant } from '../types/exam';

export function printExam() {
  window.print();
}

export function copyExamToClipboard(exam: ExamData, variant?: ExamVariant): Promise<boolean> {
  const qList = variant ? variant.questions : exam.questions;
  const codeText = variant ? ` - MÃ ĐỀ: ${variant.code}` : '';

  let text = `${(exam.departmentName || 'UBND Phường Thái Hòa').toUpperCase()}\n`;
  text += `${(exam.schoolName || 'Trường THCS Thái Hòa').toUpperCase()}\n`;
  text += `------------------------------------\n`;
  text += `${exam.examTitle.toUpperCase()}${codeText}\n`;
  text += `Môn: ${exam.subject} - Lớp: ${exam.grade}\n`;
  text += `Thời gian làm bài: ${exam.durationMinutes} phút (Không kể thời gian phát đề)\n`;
  text += `Họ và tên thí sinh: .................................................... Lớp: .......... SBD: ...........\n\n`;

  if (exam.examInstructions) {
    text += `* Lời dặn: ${exam.examInstructions}\n\n`;
  }

  if (exam.readingPassage) {
    text += `NGỮ LIỆU ĐỌC HIỂU:\n${exam.readingPassage}\n\n`;
  }

  text += `NỘI DUNG ĐỀ THI:\n\n`;

  qList.forEach((q) => {
    text += `Câu ${q.number} (${q.score} điểm): [${q.level === 'recognition' ? 'Nhận biết' : q.level === 'understanding' ? 'Thông hiểu' : q.level === 'application' ? 'Vận dụng' : 'Vận dụng cao'}] ${q.questionText}\n`;
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        text += `   ${opt}\n`;
      });
    }
    if (q.subQuestions && q.subQuestions.length > 0) {
      q.subQuestions.forEach((sq) => {
        text += `   ${sq.label}) ${sq.statement}\n`;
      });
    }
    text += `\n`;
  });

  text += `----------------- HẾT -----------------\n\n`;

  text += `BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI:\n\n`;
  qList.forEach((q) => {
    text += `Câu ${q.number}: Đáp án [${q.correctAnswer}]\n`;
    text += `Lời giải: ${q.explanation}\n`;
    if (q.criteria && q.criteria.length > 0) {
      text += `Biểu điểm chấm:\n`;
      q.criteria.forEach((c) => {
        text += `  - ${c.step}: ${c.points} điểm\n`;
      });
    }
    text += `\n`;
  });

  text += `------------------------------------\n`;
  text += `Phần mềm RA ĐỀ KIỂM TRA AI – 3 CẤP\n`;
  text += `Tác giả: Thầy giáo Trần Minh Chiến - Trường THCS Thái Hòa, Nghệ An\n`;

  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  );
}

export function exportToWordDoc(exam: ExamData, variant?: ExamVariant) {
  const qList = variant ? variant.questions : exam.questions;
  const codeText = variant ? ` - MÃ ĐỀ: ${variant.code}` : '';

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${exam.examTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 15mm;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 13pt;
          line-height: 1.4;
          color: #000;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .header-table td {
          vertical-align: top;
          padding: 4px;
        }
        .exam-title {
          text-align: center;
          font-weight: bold;
          font-size: 15pt;
          margin-top: 10px;
          margin-bottom: 5px;
        }
        .exam-sub {
          text-align: center;
          font-style: italic;
          margin-bottom: 15px;
        }
        .student-box {
          border: 1px solid #000;
          padding: 8px;
          margin-bottom: 15px;
        }
        .question-block {
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        .question-title {
          font-weight: bold;
        }
        .options-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-left: 15px;
        }
        .options-table td {
          width: 50%;
          padding: 3px;
        }
        .rubric-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .rubric-table th, .rubric-table td {
          border: 1px solid #000;
          padding: 6px;
        }
        .rubric-table th {
          background-color: #f0f0f0;
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 45%; text-align: center;">
            <div style="text-transform: uppercase;">${exam.departmentName || 'UBND Phường Thái Hòa'}</div>
            <div style="font-weight: bold; text-transform: uppercase;">${exam.schoolName || 'TRƯỜNG THCS THÁI HÒA'}</div>
            <div>-------------------</div>
          </td>
          <td style="width: 55%; text-align: center;">
            <div style="font-weight: bold; text-transform: uppercase;">${exam.examTitle}${codeText}</div>
            <div>Môn: <b>${exam.subject}</b> - Lớp: <b>${exam.grade}</b></div>
            <div style="font-style: italic;">Thời gian: ${exam.durationMinutes} phút (không kể phát đề)</div>
          </td>
        </tr>
      </table>

      <div class="student-box">
        Họ và tên thí sinh: ................................................................ Lớp: ................. SBD: ................
      </div>

      ${exam.examInstructions ? `<p><b>Lời dặn:</b> <i>${exam.examInstructions}</i></p>` : ''}
      ${exam.readingPassage ? `<div style="border: 1px dashed #666; padding: 10px; margin-bottom: 15px; background: #fafafa;"><b>ĐỌC ĐOẠN TRÍCH SAU:</b><br/>${exam.readingPassage.replace(/\n/g, '<br/>')}</div>` : ''}

      <div style="font-weight: bold; font-size: 14pt; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 3px;">
        A. PHẦN ĐỀ BÀI
      </div>

      ${qList
        .map((q) => {
          let optsHtml = '';
          if (q.options && q.options.length > 0) {
            if (q.options.length === 4) {
              optsHtml = `
                <table class="options-table">
                  <tr>
                    <td><b>A.</b> ${q.options[0]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                    <td><b>B.</b> ${q.options[1]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                  </tr>
                  <tr>
                    <td><b>C.</b> ${q.options[2]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                    <td><b>D.</b> ${q.options[3]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                  </tr>
                </table>
              `;
            } else if (q.options.length === 2) {
              optsHtml = `
                <table class="options-table">
                  <tr>
                    <td><b>A.</b> ${q.options[0]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                    <td><b>B.</b> ${q.options[1]?.replace(/^[A-D][.:\s]\s*/, '') || ''}</td>
                  </tr>
                </table>
              `;
            } else {
              optsHtml = `
                <div style="margin-left: 20px; margin-top: 4px;">
                  ${q.options.map((opt, oIdx) => `<div><b>${String.fromCharCode(65 + oIdx)}.</b> ${opt.replace(/^[A-D][.:\s]\s*/, '')}</div>`).join('')}
                </div>
              `;
            }
          }

          let subHtml = '';
          if (q.subQuestions && q.subQuestions.length > 0) {
            subHtml = `<div style="margin-left: 20px; margin-top: 4px;">${q.subQuestions
              .map((sq) => `<div><b>${sq.label})</b> ${sq.statement}</div>`)
              .join('')}</div>`;
          }

          return `
            <div class="question-block">
              <div><span class="question-title">Câu ${q.number}</span> <i>(${q.score} điểm)</i>: ${q.questionText}</div>
              ${optsHtml}
              ${subHtml}
            </div>
          `;
        })
        .join('')}

      <div style="text-align: center; margin: 30px 0; font-weight: bold;">
        ----------------- HẾT -----------------<br/>
        <i>(Cán bộ coi thi không giải thích gì thêm)</i>
      </div>

      <div style="page-break-before: always;"></div>

      <div style="font-weight: bold; font-size: 14pt; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 3px;">
        B. ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT
      </div>

      <table class="rubric-table">
        <thead>
          <tr>
            <th style="width: 10%;">Câu</th>
            <th style="width: 20%;">Đáp án</th>
            <th style="width: 55%;">Hướng dẫn giải chi tiết</th>
            <th style="width: 15%;">Điểm</th>
          </tr>
        </thead>
        <tbody>
          ${qList
            .map(
              (q) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">Câu ${q.number}</td>
              <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${q.correctAnswer}</td>
              <td>
                <div>${q.explanation}</div>
                ${
                  q.criteria && q.criteria.length > 0
                    ? `<div style="margin-top: 5px; font-size: 11pt; color: #444;">
                        <b>Barem điểm:</b>
                        <ul>${q.criteria.map((c) => `<li>${c.step}: <b>${c.points}đ</b></li>`).join('')}</ul>
                       </div>`
                    : ''
                }
              </td>
              <td style="text-align: center; font-weight: bold;">${q.score}đ</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div style="margin-top: 35px; padding-top: 8px; border-top: 1px solid #aaa; font-size: 10pt; color: #555; text-align: right; font-style: italic;">
        Hệ thống RA ĐỀ KIỂM TRA AI – 3 CẤP (Tiểu học • THCS • THPT) | Tác giả: <b>GV. Trần Minh Chiến</b> - Trường THCS Thái Hòa, Nghệ An
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${exam.examTitle || 'De_Kiem_Tra'}_${exam.subject}_Lop_${exam.grade}${variant ? `_Ma_${variant.code}` : ''}.doc`;
  a.download = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
