import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * Renders one certificate as an HTML page, captures it with html2canvas,
 * and adds it as a full-page image — fully supports Arabic text.
 *
 * Template: place your image at /public/certificate-template.png
 * The template is used as a background; text/QR are overlaid on top.
 *
 * ── Adjust the CSS positions below to match your template layout ──
 */
const POSITIONS = {
  // Name block — distance from top of the certificate card
  nameTop:    '47%',   // ← move up/down
  nameLeft:   '50%',   // ← keep centred or shift left/right

  // Training title
  titleTop:   '58%',
  titleLeft:  '50%',

  // Certificate code
  codeTop:    '67%',
  codeLeft:   '50%',

  // QR code
  qrBottom:   '6%',
  qrRight:    '5%',
  qrSize:     '100px',
};

const buildCertHtml = (userName, trainingTitle, certCode, projectName, qrDataUrl, templateUrl) => `
  <div style="
    position: relative;
    width: 1123px; height: 794px;
    font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
    overflow: hidden;
  ">
    <!-- Background template -->
    ${templateUrl
      ? `<img src="${templateUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />`
      : `<div style="position:absolute;inset:0;background:#fff;border:8px solid #4f46e5;"></div>
         <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
           <div style="text-align:center;color:#4f46e5;font-size:48px;font-weight:900;opacity:0.04;transform:rotate(-25deg);user-select:none;">
             CERTIFICATE
           </div>
         </div>`
    }

    <!-- Name -->
    <div style="
      position: absolute;
      top: ${POSITIONS.nameTop};
      left: ${POSITIONS.nameLeft};
      transform: translate(-50%, -50%);
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      color: #1e1b4b;
      letter-spacing: 0.02em;
      white-space: nowrap;
      direction: auto;
    ">${userName}</div>

    <!-- Training title -->
    <div style="
      position: absolute;
      top: ${POSITIONS.titleTop};
      left: ${POSITIONS.titleLeft};
      transform: translate(-50%, -50%);
      text-align: center;
      font-size: 18px;
      font-weight: 500;
      color: #374151;
      max-width: 700px;
      direction: auto;
    ">${trainingTitle}</div>

    <!-- Certificate code -->
    <div style="
      position: absolute;
      top: ${POSITIONS.codeTop};
      left: ${POSITIONS.codeLeft};
      transform: translate(-50%, -50%);
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.08em;
    ">${certCode} &nbsp;|&nbsp; ${projectName}</div>

    <!-- QR code -->
    ${qrDataUrl ? `
    <div style="
      position: absolute;
      bottom: ${POSITIONS.qrBottom};
      right:  ${POSITIONS.qrRight};
      text-align: center;
    ">
      <img src="${qrDataUrl}" style="width:${POSITIONS.qrSize};height:${POSITIONS.qrSize};" />
      <div style="font-size:10px;color:#6b7280;margin-top:2px;">Scan to Verify</div>
    </div>` : ''}
  </div>
`;

export const generateCertificatesPdf = async (certificates, attendanceByUser, training, baseUrl) => {
  if (!certificates || certificates.length === 0) return;

  // Pre-check template image
  const templateUrl = await new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve('/certificate-template.png');
    img.onerror = () => resolve(null);
    img.src = '/certificate-template.png';
  });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); // 297×210mm

  for (let i = 0; i < certificates.length; i++) {
    const cert   = certificates[i];
    const record = attendanceByUser[cert.user_id];
    if (!record || !record.user) continue;

    const userName    = [record.user.first_name, record.user.second_name, record.user.third_name, record.user.fourth_name].filter(Boolean).join(' ');
    const projectName = training.activities?.projects?.name || 'TGH';
    const verifyUrl   = `${baseUrl}/verify?code=${cert.certificate_code}`;

    // Generate QR
    let qrDataUrl = null;
    try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 }); } catch (_) {}

    // Render certificate HTML → canvas → image
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;';
    container.innerHTML = buildCertHtml(userName, training.title, cert.certificate_code, projectName, qrDataUrl, templateUrl);
    document.body.appendChild(container);

    try {
      const canvas  = await html2canvas(container.firstElementChild, {
        scale: 2, useCORS: true, logging: false,
        width: 1123, height: 794,
      });
      const imgData = canvas.toDataURL('image/png');

      if (i > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', 0, 0, 297, 210);
    } finally {
      document.body.removeChild(container);
    }
  }

  const projName = training.activities?.projects?.name || 'GEN';
  doc.save(`Certificates_${projName}_${training.title.replace(/\s+/g, '_')}.pdf`);
};
