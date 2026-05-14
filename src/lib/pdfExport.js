import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportStudentTestPdf = async (student, training, questions, answers) => {
  const prePct  = student.pre_max  > 0 ? Math.round((student.pre_score  / student.pre_max)  * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  // Build table rows
    const isCorrect = isMCQ ? (ans && !!ans.choices?.is_correct) : (ans && ans.manual_score === q.points);
    const statusColor = isCorrect ? '#16a34a' : (ans ? '#dc2626' : '#9ca3af');
    const statusLabel = isCorrect ? 'CORRECT' : (ans ? 'INCORRECT' : 'UNANSWERED');
    const statusIcon  = isCorrect ? '✓' : (ans ? '✕' : '—');

    let choiceFeedback = '';
    if (isMCQ && q.choices) {
      choiceFeedback = `<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">` + 
        q.choices.map(c => {
          const isStudentPick = ans?.choice_id === c.id;
          const isRightChoice = c.is_correct;
          let border = '#e5e7eb';
          let bg = '#fff';
          let icon = '○';
          let color = '#374151';

          if (isRightChoice) {
            border = '#16a34a';
            bg = '#f0fdf4';
            icon = '●';
            color = '#166534';
          } else if (isStudentPick) {
            border = '#dc2626';
            bg = '#fef2f2';
            icon = '●';
            color = '#991b1b';
          }

          return `
            <div style="display:flex; flex-direction:column; gap:2px; padding:8px 12px; border-radius:8px; border:1px solid ${border}; background:${bg}; color:${color};">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:14px;">${icon}</span>
                <span style="font-size:12px; font-weight:600;">${c.choice_text}</span>
                ${isStudentPick ? '<span style="margin-left:auto; font-size:9px; font-weight:800; text-transform:uppercase; opacity:0.7;">(Student Answer)</span>' : ''}
              </div>
              ${c.choice_text_ar ? `<div style="font-size:13px; font-weight:600; text-align:right;" dir="rtl">${c.choice_text_ar}</div>` : ''}
            </div>`;
        }).join('') + `</div>`;
    }

    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:20px 16px; vertical-align:top; width:55%;" dir="auto">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="background:#f97316; color:white; font-size:9px; font-weight:800; padding:3px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:0.05em;">${isMCQ ? 'MCQ' : 'OPEN'}</span>
            <span style="color:#6b7280; font-size:12px; font-weight:700;">Question #${i + 1}</span>
          </div>
          <div style="font-size:15px; font-weight:700; color:#000; line-height:1.4; margin-bottom:4px;">${q.question_text}</div>
          ${q.question_text_ar ? `<div style="font-size:17px; font-weight:700; color:#000; line-height:1.4; margin-bottom:12px; text-align:right;" dir="rtl">${q.question_text_ar}</div>` : ''}
          
          ${choiceFeedback}
          
          ${!isMCQ && ans ? `<div style="margin-top:12px; padding:12px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb; font-size:12px; color:#111827;">
              <div style="font-size:10px; font-weight:800; color:#9ca3af; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.05em;">Participant Response:</div>
              <div style="font-weight:600;">${ans.answer_text}</div>
            </div>` : ''}
        </td>
        <td style="padding:20px 12px; vertical-align:top; text-align:center; width:22%;">
          <div style="display:inline-flex; flex-direction:column; align-items:center; gap:6px; margin-top:8px;">
            <div style="width:36px; height:36px; border-radius:50%; background:${statusColor}; color:white; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              ${statusIcon}
            </div>
            <div style="font-size:10px; font-weight:900; color:${statusColor}; letter-spacing:0.05em;">${statusLabel}</div>
          </div>
        </td>
        <td style="padding:20px 16px; vertical-align:top; text-align:right; width:23%;">
          <div style="margin-top:8px;">
            <div style="font-size:20px; font-weight:900; color:#111827;">${ans ? (isMCQ ? (isCorrect ? q.points : 0) : (ans.manual_score || 0)) : 0}</div>
            <div style="font-size:10px; color:#9ca3af; font-weight:700; text-transform:uppercase;">Points Earned</div>
            <div style="font-size:9px; color:#6b7280; font-weight:600; margin-top:2px;">Out of ${q.points}</div>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Build the full HTML page
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; background: white;
    font-family: 'Segoe UI', 'Tahoma', Arial, sans-serif;
    padding: 40px; color: #111827; box-sizing: border-box;
  `;

  const leftLogo = training?.cert_config?.leftLogo || null;
  const rightLogo = training?.cert_config?.rightLogo || '/logo.png';

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #f97316; padding-bottom:18px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; gap:20px;">
        ${leftLogo ? `<img src="${leftLogo}" style="max-height:60px; max-width:140px; object-fit:contain;" />` : ''}
        <div>
          <div style="font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">TGH Trainings Center</div>
          <h1 style="margin:0; font-size:22px; color:#f97316;">Assessment Results</h1>
          <h2 style="margin:4px 0 0; font-size:15px; color:#1f2937;" dir="auto">${training.title}</h2>
        </div>
      </div>
      ${rightLogo ? `<img src="${rightLogo}" style="max-height:60px; max-width:140px; object-fit:contain;" />` : ''}
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f3f4f6; border-radius:10px; padding:18px; margin-bottom:24px;">
      <div>
        <div style="font-size:10px; color:#9ca3af; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Student Name</div>
        <div style="font-size:14px; font-weight:600;" dir="auto">${student.user_name}</div>
      </div>
      <div>
        <div style="font-size:10px; color:#9ca3af; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Phone</div>
        <div style="font-size:14px;">${student.phone}</div>
      </div>
      <div>
        <div style="font-size:10px; color:#9ca3af; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Pre-Test Score</div>
        <div style="font-size:16px; font-weight:700; color:#f97316;">${student.pre_score} / ${student.pre_max} <span style="font-size:12px; color:#6b7280;">(${prePct}%)</span></div>
      </div>
      <div>
        <div style="font-size:10px; color:#9ca3af; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em;">Post-Test Score</div>
        <div style="font-size:16px; font-weight:700; color:#f97316;">${student.post_score} / ${student.post_max} <span style="font-size:12px; color:#6b7280;">(${postPct}%)</span></div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; table-layout:fixed;">
      <thead>
        <tr style="background:#1f2937; color:white; border-bottom:3px solid #f97316;">
          <th style="padding:14px 12px; text-align:left;  font-size:11px; width:50%; text-transform:uppercase; letter-spacing:0.05em;">Question & Feedback</th>
          <th style="padding:14px 12px; text-align:center;font-size:11px; width:25%; text-transform:uppercase; letter-spacing:0.05em;">Status</th>
          <th style="padding:14px 12px; text-align:right; font-size:11px; width:25%; text-transform:uppercase; letter-spacing:0.05em;">Score</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:20px; font-size:10px; color:#9ca3af; text-align:center;">
      Generated by TGH Trainings Center · ${new Date().toLocaleDateString()}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');

    const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW    = pdf.internal.pageSize.getWidth();
    const pageH    = pdf.internal.pageSize.getHeight();
    const imgH     = (canvas.height * pageW) / canvas.width;

    let yLeft = imgH;
    let yPos  = 0;
    pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH);
    yLeft -= pageH;

    while (yLeft > 0) {
      yPos = yLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH);
      yLeft -= pageH;
    }

    pdf.save(`Test_Results_${(student.user_name || 'student').replace(/\s+/g, '_')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
