import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportStudentTestPdf = (student, training, questions, answers, t) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  // Using basic ascii for the title if possible or let it handle unicode
  doc.text(`Test Results: ${training.title}`, 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Student: ${student.user_name}`, 14, 30);
  doc.text(`Phone: ${student.phone}`, 14, 38);
  
  const prePct = student.pre_max > 0 ? Math.round((student.pre_score / student.pre_max) * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  doc.text(`Pre-Test Score: ${student.pre_score}/${student.pre_max} (${prePct}%)`, 14, 46);
  doc.text(`Post-Test Score: ${student.post_score}/${student.post_max} (${postPct}%)`, 14, 54);

  const tableData = questions.map((q, idx) => {
    const ans = answers.find(a => a.question_id === q.id);
    let studentAnswerText = 'No Answer';
    let isCorrect = false;

    if (ans) {
      if (q.question_type === 'mcq' && ans.choices) {
        studentAnswerText = ans.choices.choice_text;
        isCorrect = ans.choices.is_correct;
      } else {
        studentAnswerText = ans.answer_text || 'No Answer';
        isCorrect = true; // For text, we assume it's collected
      }
    }

    return [
      `[${q.type.toUpperCase()}] ${q.question_text}`,
      studentAnswerText,
      q.question_type === 'mcq' ? (isCorrect ? 'Correct' : 'Incorrect') : 'N/A',
      `${q.question_type === 'mcq' ? (isCorrect ? q.points : 0) : '-'} / ${q.points}`
    ];
  });

  doc.autoTable({
    startY: 65,
    head: [['Question', 'Student Answer', 'Result', 'Points']],
    body: tableData,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [79, 70, 229] }, // var(--primary) equivalent
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 }
    }
  });

  doc.save(`Test_Results_${student.user_name.replace(/\s+/g, '_')}.pdf`);
};
