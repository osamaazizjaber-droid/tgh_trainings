import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * Builds the certificate HTML string (used for both live preview and PDF export).
 * All images must be data URLs for html2canvas to work.
 */
export const buildCertHtml = (userName, trainingTitle, certCode, config, qrDataUrl) => {
  const {
    leftLogo    = null,
    rightLogo   = null,
    bodyText    = '',
    pmName      = '',
    pmTitle     = 'Project Manager',
    trainerName = '',
  } = config;

  const logoBox = (label) => `
    <div style="width:140px;height:64px;border:2px dashed #d1d5db;border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      color:#9ca3af;font-size:11px;font-family:Arial;">${label}</div>`;

  return `
    <div style="
      width:1056px;height:748px;background:#ffffff;position:relative;
      overflow:hidden;font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    ">
      <!-- Right dark-green decorative panel -->
      <div style="position:absolute;right:0;top:0;width:145px;height:100%;background:#1a3a2a;
        clip-path:polygon(35% 0,100% 0,100% 100%,0% 100%);"></div>

      <!-- Orange lower accent -->
      <div style="position:absolute;right:0;bottom:0;width:145px;height:42%;background:#f59e0b;
        clip-path:polygon(35% 0,100% 0,100% 100%,0% 100%);"></div>

      <!-- Main content -->
      <div style="position:absolute;left:0;top:0;right:100px;bottom:0;padding:30px 52px;
        display:flex;flex-direction:column;">

        <!-- Logos row -->
        <div style="display:flex;justify-content:space-between;align-items:center;height:80px;margin-bottom:12px;">
          ${leftLogo
            ? `<img src="${leftLogo}" style="max-height:70px;max-width:170px;object-fit:contain;" />`
            : logoBox('Left Logo')}
          ${rightLogo
            ? `<img src="${rightLogo}" style="max-height:70px;max-width:170px;object-fit:contain;" />`
            : logoBox('Right Logo')}
        </div>

        <!-- Title -->
        <div style="text-align:center;font-size:30px;font-weight:900;letter-spacing:0.1em;
          color:#111827;margin-bottom:10px;text-transform:uppercase;">
          Certificate of Participation
        </div>

        <!-- Subtitle -->
        <div style="text-align:center;font-size:17px;color:#374151;font-style:italic;margin-bottom:10px;">
          This is to certify that
        </div>

        <!-- Name -->
        <div style="text-align:center;font-size:34px;color:#d97706;font-style:italic;
          letter-spacing:0.02em;margin-bottom:6px;direction:auto;">
          ${userName}
        </div>

        <!-- Dotted underline -->
        <div style="border-bottom:2px dotted #9ca3af;margin:0 60px 14px;"></div>

        <!-- Body text -->
        <div style="font-size:14.5px;line-height:1.75;text-align:justify;color:#111827;
          font-weight:700;font-family:Arial,sans-serif;flex:1;direction:auto;overflow:hidden;">
          ${bodyText}
        </div>

        <!-- Signatures -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;
          padding-top:10px;margin-top:10px;">
          <div style="text-align:center;min-width:160px;">
            <div style="font-size:18px;color:#d97706;font-style:italic;direction:auto;">
              ${trainerName || '— — —'}
            </div>
            <div style="border-top:1px solid #d1d5db;padding-top:5px;margin-top:4px;
              font-size:13px;color:#374151;font-family:Arial,sans-serif;">Trainer</div>
          </div>
          <div style="text-align:center;min-width:160px;">
            <div style="font-size:16px;font-weight:700;font-family:Arial,sans-serif;direction:auto;">
              ${pmName || '— — —'}
            </div>
            <div style="border-top:1px solid #d1d5db;padding-top:5px;margin-top:4px;
              font-size:13px;color:#374151;font-family:Arial,sans-serif;">${pmTitle}</div>
          </div>
        </div>
      </div>

      <!-- QR on orange box -->
      ${qrDataUrl ? `
        <div style="position:absolute;right:6px;bottom:6px;width:115px;height:115px;
          background:#f59e0b;display:flex;flex-direction:column;align-items:center;
          justify-content:center;padding:6px;">
          <img src="${qrDataUrl}" style="width:88px;height:88px;" />
          <div style="font-size:9px;color:#1a1a1a;margin-top:2px;font-family:Arial;font-weight:700;">
            SCAN TO VERIFY
          </div>
        </div>` : ''}

      <!-- Cert code small text -->
      <div style="position:absolute;bottom:10px;left:52px;font-size:10px;
        color:#9ca3af;font-family:'Courier New',monospace;letter-spacing:0.06em;">
        ${certCode}
      </div>
    </div>`;
};

/**
 * Generates and downloads a PDF containing all issued certificates.
 * @param {Array} certificates
 * @param {Object} attendanceByUser
 * @param {Object} training
 * @param {string} baseUrl
 * @param {Object} config  - { leftLogo, rightLogo, bodyText, pmName, pmTitle, trainerName }
 */
export const generateCertificatesPdf = async (
  certificates, attendanceByUser, training, baseUrl, config = {}
) => {
  if (!certificates || certificates.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  for (let i = 0; i < certificates.length; i++) {
    const cert   = certificates[i];
    const record = attendanceByUser[cert.user_id];
    if (!record || !record.user) continue;

    const userName = [
      record.user.first_name, record.user.second_name,
      record.user.third_name, record.user.fourth_name,
    ].filter(Boolean).join(' ');

    const verifyUrl = `${baseUrl}/verify?code=${cert.certificate_code}`;
    let qrDataUrl   = null;
    try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 }); } catch (_) {}

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;';
    container.innerHTML = buildCertHtml(
      userName, training.title, cert.certificate_code, config, qrDataUrl
    );
    document.body.appendChild(container);

    try {
      const canvas  = await html2canvas(container.firstElementChild, {
        scale: 2, useCORS: true, logging: false, width: 1056, height: 748,
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
