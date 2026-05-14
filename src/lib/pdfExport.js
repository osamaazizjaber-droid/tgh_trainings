import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Professional Assessment Export (Fixed for Size and Reliability)
 * - Uses JPEG for 10x smaller file size (avoiding 22MB)
 * - Improved rendering reliability to fix the "blank page" issue
 * - One-page continuous layout (Continuous Paper)
 */
export const exportStudentTestPdf = async (student, training, questions, answers) => {
  const prePct = student.pre_max > 0 ? Math.round((student.pre_score / student.pre_max) * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  const C = {
    primary: '#ea580c',
    accent:  '#0f172a',
    surface: '#fafaf9',
    border:  '#e7e5e4',
    text:    '#1c1917',
    muted:   '#78716c',
  };

  const fontStack = "'Open Sans', 'Segoe UI', Roboto, Arial, sans-serif";
  const serifStack = "'Playfair Display', 'Amiri', serif";

  const rows = questions.map((q, i) => {
    const ans = answers?.find(a => a.question_id === q.id);
    const isMCQ = q.question_type === 'mcq' || !!q.choices?.length;
    const isCorrect = isMCQ ? (ans && !!ans.choices?.is_correct) : (ans && ans.manual_score === q.points);
    const statusColor = isCorrect ? '#059669' : (ans ? '#e11d48' : '#64748b');
    const statusBg    = isCorrect ? '#ecfdf5' : (ans ? '#fff1f2' : '#f8fafc');
    const statusIcon  = isCorrect ? '✓' : (ans ? '✕' : '—');

    let choiceFeedback = '';
    if (isMCQ && q.choices) {
      choiceFeedback = `<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">` +
        q.choices.map(c => {
          const isStudentPick = ans?.choice_id === c.id;
          const isRightChoice = c.is_correct;
          let border = C.border;
          let bg = '#fff';
          if (isRightChoice) { border = '#6ee7b7'; bg = '#ecfdf5'; }
          else if (isStudentPick) { border = '#fda4af'; bg = '#fff1f2'; }

          return `
            <div style="display:flex; flex-direction:column; padding:8px 12px; border-radius:8px;
                        border:1.5px solid ${border}; background:${bg}; font-family:${fontStack};">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11.5px; font-weight:${(isRightChoice || isStudentPick) ? '700' : '400'}; color:${C.text};">${c.choice_text}</span>
                ${isStudentPick ? `<span style="margin-left:auto; font-size:8px; font-weight:800; opacity:.6;">YOUR ANSWER</span>` : ''}
              </div>
              ${c.choice_text_ar ? `<div style="font-size:12px; font-weight:600; text-align:right; margin-top:2px;" dir="rtl">${c.choice_text_ar}</div>` : ''}
            </div>`;
        }).join('') + `</div>`;
    }

    return `
      <div style="background:#fff; border:1px solid ${C.border}; border-radius:12px; margin-bottom:16px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
          <div style="flex:1;" dir="auto">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="background:${C.primary}; color:#fff; font-size:8px; font-weight:900; padding:2px 8px; border-radius:4px;">${isMCQ ? 'MCQ' : 'OPEN'}</span>
              <span style="color:${C.muted}; font-size:10px; font-weight:700;">QUESTION ${i + 1}</span>
            </div>
            <div style="font-size:14px; font-weight:800; color:${C.text}; line-height:1.4;">${q.question_text}</div>
            ${q.question_text_ar ? `<div style="font-size:16px; font-weight:700; color:${C.text}; text-align:right; margin-top:8px;" dir="rtl">${q.question_text_ar}</div>` : ''}
            ${choiceFeedback}
            ${!isMCQ && ans ? `
              <div style="margin-top:12px; padding:10px; background:#f8f7f6; border-radius:8px; border:1px solid ${C.border};">
                <div style="font-size:8px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:4px;">Response</div>
                <div style="font-size:12px; font-weight:600; color:${C.text}; line-height:1.4;">${ans.answer_text}</div>
              </div>` : ''}
          </div>
          <div style="width:100px; display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div style="width:36px; height:36px; border-radius:50%; background:${statusBg}; border:2px solid ${statusColor}; color:${statusColor}; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900;">
              ${statusIcon}
            </div>
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:900; color:${C.accent};">${ans ? (isMCQ ? (isCorrect ? q.points : 0) : (ans.manual_score || 0)) : 0}</div>
              <div style="font-size:8px; color:${C.muted}; font-weight:700;">OF ${q.points} PTS</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const scoreBadge = (label, score, max, pct) => {
    const color = pct >= 70 ? '#059669' : pct >= 40 ? C.primary : '#e11d48';
    return `
      <div style="flex:1; background:#fff; border:1px solid ${C.border}; border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center;">
        <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:4px;">${label}</div>
        <div style="font-size:20px; font-weight:900; color:${color};">${score} <span style="font-size:12px; color:${C.muted}; opacity:.5;">/ ${max}</span></div>
        <div style="font-size:11px; font-weight:800; color:${color};">${pct}%</div>
      </div>
    `;
  };

  const container = document.createElement('div');
  // Use opacity 0 and absolute positioning to keep it in rendering flow but invisible
  container.style.cssText = `
    position:absolute; top:0; left:0; width:850px; background:#fff;
    padding:50px; color:${C.text}; box-sizing:border-box;
    font-family:${fontStack}; z-index:-1; opacity:0; pointer-events:none;
  `;

  const leftLogo  = training?.cert_config?.leftLogo  || null;
  const rightLogo = training?.cert_config?.rightLogo || '/logo.png';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Playfair+Display:wght@700&family=Open+Sans:wght@400;600;700;800&display=swap');
    </style>

    <div style="position:relative;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${C.primary}; padding-bottom:15px; margin-bottom:30px;">
        <div style="display:flex; align-items:center; gap:20px;">
          ${leftLogo ? `<img src="${leftLogo}" style="max-height:55px; max-width:130px; object-fit:contain;" />` : ''}
          <div>
            <div style="font-size:10px; font-weight:800; color:${C.primary}; text-transform:uppercase; letter-spacing:.1em; margin-bottom:2px;">TGH Trainings Center</div>
            <h1 style="margin:0; font-size:28px; color:${C.accent}; font-family:${serifStack}; font-weight:700;">Assessment Results</h1>
            <div style="margin-top:4px; font-size:14px; font-weight:700; color:${C.muted};" dir="auto">${training.title}</div>
          </div>
        </div>
        ${rightLogo ? `<img src="${rightLogo}" style="max-height:55px; max-width:130px; object-fit:contain;" />` : ''}
      </div>

      <div style="display:flex; gap:12px; margin-bottom:30px;">
        <div style="flex:2; background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:18px 22px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div>
              <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:4px;">Student Name</div>
              <div style="font-size:16px; font-weight:800; color:${C.text};" dir="auto">${student.user_name}</div>
            </div>
            <div>
              <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:4px;">Phone</div>
              <div style="font-size:16px; font-weight:700; color:${C.muted};">${student.phone}</div>
            </div>
          </div>
        </div>
        ${scoreBadge('Pre-Test',  student.pre_score,  student.pre_max,  prePct)}
        ${scoreBadge('Post-Test', student.post_score, student.post_max, postPct)}
      </div>

      <div>${rows}</div>

      <div style="margin-top:40px; padding-top:15px; border-top:1px solid ${C.border}; display:flex; justify-content:space-between; font-size:10px; color:${C.muted};">
        <span>Generated by <strong style="color:${C.primary};">TGH Trainings Platform</strong></span>
        <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for fonts and images to load
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 800));

    // toJpeg is significantly smaller than toPng (often 10x smaller)
    const imgData = await htmlToImage.toJpeg(container, {
      quality: 0.85,
      pixelRatio: 2, // 2 is perfect balance for quality vs size
      backgroundColor: '#ffffff'
    });

    const rect = container.getBoundingClientRect();
    const pdfW = 210;
    const pdfH = (rect.height * pdfW) / rect.width;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pdfW, pdfH]
    });

    // 'FAST' compression and JPEG format keep file size tiny
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    pdf.save(`Results_${(student.user_name || 'student').replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('PDF Export Error:', err);
    alert('PDF Generation failed. Please try again.');
  } finally {
    document.body.removeChild(container);
  }
};