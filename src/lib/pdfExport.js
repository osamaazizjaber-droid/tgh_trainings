import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export const exportStudentTestPdf = async (student, training, questions, answers) => {
  const prePct = student.pre_max > 0 ? Math.round((student.pre_score / student.pre_max) * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  // ─── Design Tokens ───────────────────────────────────────────────────
  const C = {
    primary: '#ea580c',   // rich orange
    primaryLight: '#fff7ed',   // warm orange tint
    primaryMid: '#fed7aa',   // soft orange
    accent: '#0f172a',   // near-black navy
    correct: '#059669',   // emerald green
    correctBg: '#ecfdf5',
    correctBorder: '#6ee7b7',
    wrong: '#e11d48',   // rose red
    wrongBg: '#fff1f2',
    wrongBorder: '#fda4af',
    unanswered: '#64748b',   // slate
    surface: '#fafaf9',   // warm off-white
    border: '#e7e5e4',   // warm gray
    muted: '#78716c',   // warm medium gray
    subtle: '#a8a29e',   // light warm gray
    text: '#1c1917',   // warm near-black
    textLight: '#57534e',   // medium text
    rowEven: '#fafaf9',
    rowOdd: '#ffffff',
  };

  const fontStack = "'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // ─── Build question rows ──────────────────────────────────────────────
  const rows = questions.map((q, i) => {
    const ans = answers?.find(a => a.question_id === q.id);
    const isMCQ = q.question_type === 'mcq' || !!q.choices?.length;
    const isCorrect = isMCQ
      ? (ans && !!ans.choices?.is_correct)
      : (ans && ans.manual_score === q.points);

    const statusColor = isCorrect ? C.correct : (ans ? C.wrong : C.unanswered);
    const statusBg = isCorrect ? C.correctBg : (ans ? C.wrongBg : '#f8fafc');
    const statusBorder = isCorrect ? C.correctBorder : (ans ? C.wrongBorder : '#cbd5e1');
    const statusLabel = isCorrect ? 'CORRECT' : (ans ? 'INCORRECT' : 'UNANSWERED');
    const statusIcon = isCorrect ? '✓' : (ans ? '✕' : '—');
    const rowBg = i % 2 === 0 ? C.rowEven : C.rowOdd;

    let choiceFeedback = '';
    if (isMCQ && q.choices) {
      choiceFeedback = `<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">` +
        q.choices.map(c => {
          const isStudentPick = ans?.choice_id === c.id;
          const isRightChoice = c.is_correct;

          let border = C.border;
          let bg = '#fff';
          let icon = '○';
          let color = C.textLight;
          let weight = '500';

          if (isRightChoice) {
            border = C.correctBorder;
            bg = C.correctBg;
            icon = '●';
            color = C.correct;
            weight = '700';
          } else if (isStudentPick) {
            border = C.wrongBorder;
            bg = C.wrongBg;
            icon = '●';
            color = C.wrong;
            weight = '700';
          }

          return `
            <div style="display:flex; flex-direction:column; gap:2px; padding:7px 11px; border-radius:8px;
                        border:1.5px solid ${border}; background:${bg}; color:${color}; font-family:${fontStack};">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px; line-height:1;">${icon}</span>
                <span style="font-size:11px; font-weight:${weight};">${c.choice_text}</span>
                ${isStudentPick ? `<span style="margin-left:auto; font-size:8px; font-weight:800;
                  text-transform:uppercase; letter-spacing:.05em; opacity:.6;">(Your Answer)</span>` : ''}
              </div>
              ${c.choice_text_ar
                ? `<div style="font-size:12px; font-weight:600; text-align:right; margin-top:2px;" dir="rtl">${c.choice_text_ar}</div>`
                : ''}
            </div>`;
        }).join('') + `</div>`;
    }

    return `
      <tr style="background:${rowBg}; border-bottom:1px solid ${C.border};">
        <td style="padding:12px 14px; vertical-align:top; width:55%;" dir="auto">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <span style="background:${C.primary}; color:#fff; font-size:8px; font-weight:900;
              padding:2px 7px; border-radius:4px; text-transform:uppercase;
              letter-spacing:.05em; font-family:${fontStack};">
              ${isMCQ ? 'MCQ' : 'OPEN'}
            </span>
            <span style="color:${C.muted}; font-size:10px; font-weight:600;
              font-family:${fontStack}; letter-spacing:.04em;">
              Q${i + 1}
            </span>
          </div>

          <div style="font-size:13px; font-weight:700; color:${C.text}; line-height:1.4;
            margin-bottom:3px; font-family:${fontStack};">
            ${q.question_text}
          </div>
          ${q.question_text_ar
            ? `<div style="font-size:14px; font-weight:700; color:${C.text}; line-height:1.4;
                margin-bottom:8px; text-align:right; direction:rtl;">${q.question_text_ar}</div>`
            : ''}

          ${choiceFeedback}

          ${!isMCQ && ans
            ? `<div style="margin-top:10px; padding:8px 12px; background:#f8f7f6;
                border-radius:8px; border:1px solid ${C.border};">
                <div style="font-size:8px; font-weight:800; color:${C.subtle};
                  text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px;
                  font-family:${fontStack};">Response</div>
                <div style="font-size:11px; font-weight:600; color:${C.text};
                  font-family:${fontStack}; line-height:1.4;">${ans.answer_text}</div>
              </div>`
            : ''}
        </td>

        <td style="padding:12px 10px; vertical-align:top; text-align:center; width:20%;">
          <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px; margin-top:4px;">
            <div style="width:32px; height:32px; border-radius:50%;
              background:${statusBg}; border:2px solid ${statusBorder};
              color:${statusColor}; display:flex; align-items:center; justify-content:center;
              font-size:16px; font-weight:800;">
              ${statusIcon}
            </div>
            <div style="font-size:8.5px; font-weight:900; color:${statusColor};
              letter-spacing:.05em; font-family:${fontStack};">
              ${statusLabel}
            </div>
          </div>
        </td>

        <td style="padding:12px 14px; vertical-align:top; text-align:right; width:25%;">
          <div style="margin-top:4px;">
            <div style="font-size:22px; font-weight:900; color:${C.accent};
              font-family:${fontStack}; line-height:1;">
              ${ans ? (isMCQ ? (isCorrect ? q.points : 0) : (ans.manual_score || 0)) : 0}
            </div>
            <div style="font-size:8px; color:${C.subtle}; font-weight:700;
              text-transform:uppercase; letter-spacing:.05em; margin-top:2px;
              font-family:${fontStack};">
              Points
            </div>
            <div style="font-size:9px; color:${C.muted}; font-weight:600;
              margin-top:2px; font-family:${fontStack};">
              of <strong style="color:${C.primary};">${q.points}</strong>
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');

  const scoreBadge = (score, max, pct) => {
    const hue = pct >= 70 ? C.correct : pct >= 40 ? C.primary : C.wrong;
    return `
      <div style="font-size:18px; font-weight:900; color:${hue};
        font-family:${fontStack}; line-height:1;">
        ${score} <span style="font-size:11px; color:${C.muted}; font-weight:600;">/ ${max}</span>
      </div>
      <div style="font-size:10px; font-weight:700; color:${C.subtle};
        font-family:${fontStack}; margin-top:1px;">${pct}%</div>`;
  };

  const container = document.createElement('div');
  container.style.cssText = `
    position:fixed; left:-9999px; top:0;
    width:794px; background:#fff;
    font-family:${fontStack};
    padding:36px; color:${C.text}; box-sizing:border-box;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  `;

  const leftLogo  = training?.cert_config?.leftLogo  || null;
  const rightLogo = training?.cert_config?.rightLogo || '/logo.png';

  container.innerHTML = `
    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:center;
      border-bottom:2px solid ${C.primary}; padding-bottom:12px; margin-bottom:18px;">
      <div style="display:flex; align-items:center; gap:16px;">
        ${leftLogo ? `<img src="${leftLogo}" style="max-height:50px; max-width:120px; object-fit:contain;" />` : ''}
        <div>
          <div style="font-size:9px; font-weight:700; color:${C.subtle};
            text-transform:uppercase; letter-spacing:.1em; margin-bottom:2px;
            font-family:${fontStack};">
            TGH Trainings Center
          </div>
          <h1 style="margin:0; font-size:20px; color:${C.primary};
            font-family:serif; font-weight:700; letter-spacing:-.3px;">
            Assessment Results
          </h1>
          <h2 style="margin:2px 0 0; font-size:12px; color:${C.accent}; font-weight:600;
            font-family:${fontStack};" dir="auto">
            ${training.title}
          </h2>
        </div>
      </div>
      ${rightLogo ? `<img src="${rightLogo}" style="max-height:50px; max-width:120px; object-fit:contain;" />` : ''}
    </div>

    <!-- STUDENT INFO -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;
      background:${C.surface}; border:1px solid ${C.border}; border-radius:12px;
      padding:14px 20px; margin-bottom:18px;">
      <div>
        <div style="font-size:8.5px; font-weight:800; color:${C.subtle};
          text-transform:uppercase; letter-spacing:.08em; margin-bottom:2px;
          font-family:${fontStack};">Student Name</div>
        <div style="font-size:13px; font-weight:700; color:${C.text};
          font-family:${fontStack};" dir="auto">${student.user_name}</div>
      </div>
      <div>
        <div style="font-size:8.5px; font-weight:800; color:${C.subtle};
          text-transform:uppercase; letter-spacing:.08em; margin-bottom:2px;
          font-family:${fontStack};">Phone</div>
        <div style="font-size:13px; font-weight:600; color:${C.textLight};
          font-family:${fontStack};">${student.phone}</div>
      </div>
      <div>
        <div style="font-size:8.5px; font-weight:800; color:${C.subtle};
          text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px;
          font-family:${fontStack};">Pre-Test</div>
        ${scoreBadge(student.pre_score, student.pre_max, prePct)}
      </div>
      <div>
        <div style="font-size:8.5px; font-weight:800; color:${C.subtle};
          text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px;
          font-family:${fontStack};">Post-Test</div>
        ${scoreBadge(student.post_score, student.post_max, postPct)}
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse;
      border:1px solid ${C.border}; border-radius:14px; overflow:hidden; table-layout:fixed;">
      <thead>
        <tr style="background:${C.accent}; color:#fff; border-bottom:2px solid ${C.primary};">
          <th style="padding:10px 14px; text-align:left; font-size:10px; width:55%;
            text-transform:uppercase; letter-spacing:.08em; font-weight:800;
            font-family:${fontStack};">Question &amp; Feedback</th>
          <th style="padding:10px 10px; text-align:center; font-size:10px; width:20%;
            text-transform:uppercase; letter-spacing:.08em; font-weight:800;
            font-family:${fontStack};">Status</th>
          <th style="padding:10px 14px; text-align:right; font-size:10px; width:25%;
            text-transform:uppercase; letter-spacing:.08em; font-weight:800;
            font-family:${fontStack};">Score</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:20px; padding-top:12px; border-top:1px solid ${C.border};
      display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:9px; color:${C.subtle}; font-family:${fontStack};
        font-weight:500;">
        Generated by <strong style="color:${C.muted};">TGH Trainings Center</strong>
      </div>
      <div style="font-size:9px; color:${C.subtle}; font-family:${fontStack};
        font-weight:500;">
        ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Wait for images and fonts
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 450));

  try {
    const imgData = await htmlToImage.toPng(container, {
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    
    // Create image object to measure height
    const canvasImg = new Image();
    canvasImg.src = imgData;
    await new Promise(r => canvasImg.onload = r);
    
    const imgW = pageW;
    const imgH = (canvasImg.height * pageW) / canvasImg.width;

    // If it exceeds one page, we shrink it to fit exactly on one page
    let finalImgH = imgH;
    let finalImgW = imgW;
    let xOffset = 0;

    if (imgH > pageH) {
      finalImgH = pageH;
      finalImgW = (canvasImg.width * pageH) / canvasImg.height;
      xOffset = (pageW - finalImgW) / 2;
    }

    pdf.addImage(imgData, 'PNG', xOffset, 0, finalImgW, finalImgH);
    pdf.save(`Test_Results_${(student.user_name || 'student').replace(/\s+/g, '_')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};