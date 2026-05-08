import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * Builds the certificate HTML — A4 landscape (1122 × 794 px @ 96dpi).
 * Matches the Word template design: logos top, orange name, body text, signatures, QR.
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

  const logoPlaceholder = (label) =>
    `<div style="width:130px;height:60px;border:2px dashed #ccc;border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      color:#aaa;font-size:11px;font-family:Arial;">${label}</div>`;

  return `
    <div style="
      width:1122px;height:794px;background:#ffffff;position:relative;
      overflow:hidden;box-sizing:border-box;
      font-family:'Segoe UI',Arial,sans-serif;
    ">
      <!-- Top gold border bar -->
      <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,#c8962e,#f0c040,#c8962e);"></div>
      <!-- Bottom gold border bar -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:8px;background:linear-gradient(90deg,#c8962e,#f0c040,#c8962e);"></div>
      <!-- Left gold border bar -->
      <div style="position:absolute;top:0;left:0;bottom:0;width:8px;background:linear-gradient(180deg,#c8962e,#f0c040,#c8962e);"></div>
      <!-- Right gold border bar -->
      <div style="position:absolute;top:0;right:0;bottom:0;width:8px;background:linear-gradient(180deg,#c8962e,#f0c040,#c8962e);"></div>

      <!-- Inner content padding -->
      <div style="position:absolute;top:18px;left:18px;right:18px;bottom:18px;
        display:flex;flex-direction:column;padding:20px 36px;">

        <!-- Row 1: Logos -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="display:flex;align-items:center;height:70px;">
            ${leftLogo
              ? `<img src="${leftLogo}" style="max-height:66px;max-width:160px;object-fit:contain;" />`
              : logoPlaceholder('Donor Logo')}
          </div>
          <div style="display:flex;align-items:center;height:70px;">
            ${rightLogo
              ? `<img src="${rightLogo}" style="max-height:66px;max-width:160px;object-fit:contain;" />`
              : logoPlaceholder('NGO Logo')}
          </div>
        </div>

        <!-- Thin gold divider -->
        <div style="height:2px;background:linear-gradient(90deg,transparent,#d4a017,transparent);margin-bottom:14px;"></div>

        <!-- Title -->
        <div style="text-align:center;font-size:28px;font-weight:900;letter-spacing:0.12em;
          color:#1a1a2e;text-transform:uppercase;margin-bottom:8px;font-family:Georgia,serif;">
          Certificate of Participation
        </div>

        <!-- Subtitle -->
        <div style="text-align:center;font-size:15px;color:#555;font-style:italic;margin-bottom:10px;">
          This is to certify that
        </div>

        <!-- Participant Name -->
        <div style="text-align:center;font-size:32px;color:#c8962e;font-style:italic;
          letter-spacing:0.03em;margin-bottom:4px;font-family:Georgia,serif;direction:auto;">
          ${userName}
        </div>

        <!-- Dotted underline under name -->
        <div style="border-bottom:2px dotted #bbb;margin:0 80px 12px;"></div>

        <!-- Body text -->
        <div style="font-size:14px;line-height:1.8;text-align:justify;color:#222;
          font-weight:600;font-family:Arial,sans-serif;flex:1;direction:auto;overflow:hidden;padding:0 4px;">
          ${bodyText}
        </div>

        <!-- Signatures row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;">
          <!-- Trainer -->
          <div style="text-align:center;min-width:170px;">
            <div style="font-size:16px;color:#c8962e;font-style:italic;direction:auto;margin-bottom:6px;">
              ${trainerName || '— — —'}
            </div>
            <div style="border-top:1.5px solid #ccc;padding-top:5px;
              font-size:12px;color:#555;font-family:Arial;letter-spacing:0.05em;">
              TRAINER
            </div>
          </div>

          <!-- QR code center -->
          ${qrDataUrl ? `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <img src="${qrDataUrl}" style="width:72px;height:72px;" />
            <div style="font-size:8px;color:#888;margin-top:3px;font-family:Arial;letter-spacing:0.05em;">SCAN TO VERIFY</div>
            <div style="font-size:8px;color:#aaa;font-family:'Courier New',monospace;">${certCode}</div>
          </div>` : `
          <div style="font-size:9px;color:#bbb;font-family:'Courier New',monospace;">${certCode}</div>`}

          <!-- PM / Director -->
          <div style="text-align:center;min-width:170px;">
            <div style="font-size:16px;font-weight:700;direction:auto;margin-bottom:6px;color:#1a1a2e;">
              ${pmName || '— — —'}
            </div>
            <div style="border-top:1.5px solid #ccc;padding-top:5px;
              font-size:12px;color:#555;font-family:Arial;letter-spacing:0.05em;">
              ${(pmTitle || 'Project Manager').toUpperCase()}
            </div>
          </div>
        </div>

      </div>
    </div>`;
};

/**
 * Generates and downloads a multi-page PDF of all issued certificates.
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
      record.user.third_name,  record.user.fourth_name,
    ].filter(Boolean).join(' ');

    const verifyUrl = `${baseUrl}/verify?code=${cert.certificate_code}`;
    let qrDataUrl = null;
    try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 }); } catch (_) {}

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;';
    container.innerHTML = buildCertHtml(
      userName, training.title, cert.certificate_code, config, qrDataUrl
    );
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container.firstElementChild, {
        scale: 2, useCORS: true, logging: false, width: 1122, height: 794,
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
