import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportStudentTestPdf = (student, training, questions, answers, t) => {
  const doc = new jsPDF();

  // ── Header ──────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Test Results: ${training.title}`, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Student: ${student.user_name}`, 14, 32);
  doc.text(`Phone: ${student.phone}`, 14, 39);

  const prePct  = student.pre_max  > 0 ? Math.round((student.pre_score  / student.pre_max)  * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  doc.text(`Pre-Test Score:  ${student.pre_score}/${student.pre_max} (${prePct}%)`,   14, 48);
  doc.text(`Post-Test Score: ${student.post_score}/${student.post_max} (${postPct}%)`, 14, 55);

  // ── Question table ────────────────────────────────────────────
  const tableData = questions.map((q) => {
    const ans = answers.find(a => a.question_id === q.id);

    const isMCQ = q.question_type === 'mcq';

    let studentAnswerText = 'No Answer';
    let result = '-';
    let earnedPoints = '-';
    const maxPoints = q.points;

    if (ans) {
      if (isMCQ) {
        studentAnswerText = ans.choices?.choice_text || 'No Answer';
        const isCorrect   = !!ans.choices?.is_correct;
        result            = isCorrect ? 'Correct' : 'Incorrect';
        earnedPoints      = isCorrect ? maxPoints : 0;
      } else {
        studentAnswerText = ans.answer_text || 'No Answer';
        result            = '-';
        earnedPoints      = (ans.manual_score !== null && ans.manual_score !== undefined)
          ? ans.manual_score
          : 'Ungraded';
      }
    }

    return [
      `[${isMCQ ? 'MCQ' : 'OPEN'}] ${q.question_text}`,
      studentAnswerText,
      result,
      `${earnedPoints} / ${maxPoints}`,
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [['Question', 'Student Answer', 'Result', 'Points']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 68 },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
    },
  });

  doc.save(`Test_Results_${student.user_name.replace(/\s+/g, '_')}.pdf`);
};
