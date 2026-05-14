import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Professional Assessment Export
 * Features:
 * - TGH Certificate-style branding (diagonal accents)
 * - Vector-quality rendering via high-ratio html-to-image
 * - Continuous single-page layout (One Paper)
 * - Optimized for Arabic/English bilingual content
 */
export const exportStudentTestPdf = async (student, training, questions, answers) => {
  const prePct = student.pre_max > 0 ? Math.round((student.pre_score / student.pre_max) * 100) : 0;
  const postPct = student.post_max > 0 ? Math.round((student.post_score / student.post_max) * 100) : 0;

  // ─── Design System ───────────────────────────────────────────────────
  const C = {
    primary: '#ea580c',   // TGH Orange
    accent:  '#0f172a',   // Dark Navy
    gold:    '#f59e0b',   // Gold stripe
    black:   '#000000',   // Black accents
    correct: '#059669',
    wrong:   '#e11d48',
    surface: '#fafaf9',
    border:  '#e7e5e4',
    text:    '#1c1917',
    muted:   '#78716c',
  };

  const fontStack = "'Open Sans', 'Segoe UI', Roboto, Arial, sans-serif";
  const serifStack = "'Playfair Display', 'Amiri', serif";

  // ─── Component: Question Row ─────────────────────────────────────────
  const rows = questions.map((q, i) => {
    const ans = answers?.find(a => a.question_id === q.id);
    const isMCQ = q.question_type === 'mcq' || !!q.choices?.length;
    const isCorrect = isMCQ
      ? (ans && !!ans.choices?.is_correct)
      : (ans && ans.manual_score === q.points);

    const statusColor = isCorrect ? C.correct : (ans ? C.wrong : '#64748b');
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
          let icon = '○';
          let weight = '400';

          if (isRightChoice) {
            border = '#6ee7b7'; bg = '#ecfdf5'; icon = '●'; weight = '700';
          } else if (isStudentPick) {
            border = '#fda4af'; bg = '#fff1f2'; icon = '●'; weight = '700';
          }

          return `
            <div style="display:flex; flex-direction:column; padding:8px 12px; border-radius:8px;
                        border:1.5px solid ${border}; background:${bg}; font-family:${fontStack};">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px;">${icon}</span>
                <span style="font-size:11.5px; font-weight:${weight}; color:${C.text};">${c.choice_text}</span>
                ${isStudentPick ? `<span style="margin-left:auto; font-size:8px; font-weight:800; opacity:.6; text-transform:uppercase;">Your Answer</span>` : ''}
              </div>
              ${c.choice_text_ar ? `<div style="font-size:12px; font-weight:600; text-align:right; margin-top:2px;" dir="rtl">${c.choice_text_ar}</div>` : ''}
            </div>`;
        }).join('') + `</div>`;
    }

    return `
      <div style="background:#fff; border:1px solid ${C.border}; border-radius:12px; margin-bottom:16px; padding:18px; position:relative; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
          <div style="flex:1;" dir="auto">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="background:${C.primary}; color:#fff; font-size:8px; font-weight:900; padding:2px 8px; border-radius:4px;">${isMCQ ? 'MCQ' : 'OPEN'}</span>
              <span style="color:${C.muted}; font-size:10px; font-weight:700;">QUESTION ${i + 1}</span>
            </div>
            <div style="font-size:14px; font-weight:800; color:${C.text}; line-height:1.4; margin-bottom:4px;">${q.question_text}</div>
            ${q.question_text_ar ? `<div style="font-size:16px; font-weight:700; color:${C.text}; text-align:right; margin-top:8px;" dir="rtl">${q.question_text_ar}</div>` : ''}
            ${choiceFeedback}
            ${!isMCQ && ans ? `
              <div style="margin-top:12px; padding:10px; background:#f8f7f6; border-radius:8px; border:1px solid ${C.border};">
                <div style="font-size:8px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:4px;">Participant Response</div>
                <div style="font-size:12px; font-weight:600; color:${C.text}; line-height:1.4;">${ans.answer_text}</div>
              </div>` : ''}
          </div>
          
          <div style="width:100px; display:flex; flex-direction:column; align-items:center; gap:10px;">
            <div style="width:40px; height:40px; border-radius:50%; background:${statusBg}; border:2px solid ${statusColor}; color:${statusColor}; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900;">
              ${statusIcon}
            </div>
            <div style="text-align:center;">
              <div style="font-size:20px; font-weight:900; color:${C.accent}; line-height:1;">
                ${ans ? (isMCQ ? (isCorrect ? q.points : 0) : (ans.manual_score || 0)) : 0}
              </div>
              <div style="font-size:9px; color:${C.muted}; font-weight:700; margin-top:2px;">OF ${q.points} PTS</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // ─── Score Badge ─────────────────────────────────────────────────────
  const scoreBadge = (label, score, max, pct) => {
    const color = pct >= 70 ? C.correct : pct >= 40 ? C.primary : C.wrong;
    return `
      <div style="flex:1; background:#fff; border:1px solid ${C.border}; border-radius:12px; padding:15px; display:flex; flex-direction:column; align-items:center; gap:5px;">
        <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; letter-spacing:.05em;">${label}</div>
        <div style="font-size:22px; font-weight:900; color:${color}; line-height:1;">${score} <span style="font-size:14px; color:${C.muted}; opacity:.5;">/ ${max}</span></div>
        <div style="font-size:12px; font-weight:800; color:${color}; opacity:.8;">${pct}%</div>
      </div>
    `;
  };

  // ─── Build Container ─────────────────────────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = `
    position:fixed; left:-9999px; top:0;
    width:850px; background:#fff;
    padding:60px; color:${C.text}; box-sizing:border-box;
    font-family:${fontStack};
    -webkit-font-smoothing: antialiased;
  `;

  const leftLogo  = training?.cert_config?.leftLogo  || null;
  const rightLogo = training?.cert_config?.rightLogo || '/logo.png';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Playfair+Display:wght@700&family=Open+Sans:wght@400;600;700;800&display=swap');
    </style>

    <!-- Certificate-style Accent Stripes -->
    <div style="position:absolute; top:0; right:0; width:150px; height:100%; z-index:0; pointer-events:none; overflow:hidden;">
      <div style="position:absolute; top:-10%; right:-80px; width:100px; height:120%; background:${C.accent}; transform:rotate(15deg); opacity:.03;"></div>
      <div style="position:absolute; top:-10%; right:20px; width:4px; height:120%; background:${C.primary}; transform:rotate(15deg); opacity:.1;"></div>
    </div>

    <div style="position:relative; z-index:1;">
      <!-- HEADER -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
        <div style="display:flex; align-items:center; gap:25px;">
          ${leftLogo ? `<img src="${leftLogo}" style="max-height:65px; max-width:150px; object-fit:contain;" />` : ''}
          <div>
            <div style="font-size:11px; font-weight:800; color:${C.primary}; text-transform:uppercase; letter-spacing:.12em; margin-bottom:4px;">TGH Trainings Center</div>
            <h1 style="margin:0; font-size:32px; color:${C.accent}; font-family:${serifStack}; font-weight:700; letter-spacing:-.5px;">Assessment Results</h1>
            <div style="margin-top:6px; font-size:16px; font-weight:700; color:${C.muted};" dir="auto">${training.title}</div>
          </div>
        </div>
        ${rightLogo ? `<img src="${rightLogo}" style="max-height:65px; max-width:150px; object-fit:contain;" />` : ''}
      </div>

      <!-- STUDENT INFO GRID -->
      <div style="display:flex; gap:15px; margin-bottom:35px;">
        <div style="flex:2; background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:20px 25px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
              <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:5px;">Student Name</div>
              <div style="font-size:18px; font-weight:800; color:${C.text};" dir="auto">${student.user_name}</div>
            </div>
            <div>
              <div style="font-size:9px; font-weight:800; color:${C.muted}; text-transform:uppercase; margin-bottom:5px;">Phone Number</div>
              <div style="font-size:18px; font-weight:700; color:${C.muted};">${student.phone}</div>
            </div>
          </div>
        </div>
        ${scoreBadge('Pre-Test',  student.pre_score,  student.pre_max,  prePct)}
        ${scoreBadge('Post-Test', student.post_score, student.post_max, postPct)}
      </div>

      <!-- QUESTIONS SECTION -->
      <div style="margin-bottom:30px;">
        <div style="font-size:12px; font-weight:800; color:${C.accent}; text-transform:uppercase; letter-spacing:.1em; margin-bottom:20px; padding-bottom:8px; border-bottom:2px solid ${C.primary}; width:fit-content;">
          Detailed Performance Analysis
        </div>
        ${rows}
      </div>

      <!-- FOOTER -->
      <div style="margin-top:50px; padding-top:20px; border-top:1px solid ${C.border}; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:11px; color:${C.muted}; font-weight:700;">
          Generated by <span style="color:${C.primary};">TGH Trainings Platform</span>
        </div>
        <div style="font-size:11px; color:${C.muted}; font-weight:600;">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // ─── Render & PDF Generation ─────────────────────────────────────────
  try {
    // Wait for fonts and high-res images to settle
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 600));

    // High Pixel Ratio for Vector-like sharpness
    const imgData = await htmlToImage.toPng(container, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      quality: 1,
    });

    // Measure the actual rendered container size
    const rect = container.getBoundingClientRect();
    const finalW_mm = 210; // Standard A4 Width
    const finalH_mm = (rect.height * finalW_mm) / rect.width;

    // Create PDF with Dynamic Height (Continuous Page)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [finalW_mm, finalH_mm]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, finalW_mm, finalH_mm);
    pdf.save(`Assessment_Results_${(student.user_name || 'student').replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('PDF Export Failed:', err);
  } finally {
    document.body.removeChild(container);
  }
};