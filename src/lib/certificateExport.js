import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

/**
 * Builds the certificate HTML string.
 * Design matches the provided template: right-side dark green diagonal panel,
 * gold stripe, black stripe. Uses Playfair Display + Open Sans fonts.
 *
 * @param {string} userName
 * @param {string} trainingTitle
 * @param {string} certCode
 * @param {Object} config  - { leftLogo, rightLogo, bodyText, pmName, pmTitle, trainerName }
 * @param {string|null} qrDataUrl  - data URL for QR code image
 */
export const buildCertHtml = (userName, trainingTitle, certCode, config, qrDataUrl) => {
  const {
    leftLogo    = null,
    rightLogo   = null,
    bodyText    = '',
    pmName      = '',
    pmTitle     = '',
    trainerName = '',
    language    = 'en'
  } = config;

  const isAr = language === 'ar';

  const defaultPmTitle = isAr ? 'مدير المشروع' : 'Project Manager';
  const finalPmTitle = pmTitle || defaultPmTitle;

  const textTitle = isAr ? 'شهادة مشاركة' : 'CERTIFICATE OF PARTICIPATION';
  const textSubtitle = isAr ? 'تُمنح هذه الشهادة إلى' : 'This is to certify that';
  const textTrainer = isAr ? 'المدرب' : 'TRAINER';
  const textScan = isAr ? 'امسح للتحقق' : 'SCAN TO VERIFY';

  const logoImg = (src, alt) =>
    `<img src="${src}" alt="${alt}" style="max-height:64px;max-width:150px;object-fit:contain;" />`;

  const logoBox = (label) =>
    `<div style="height:48px;border:2px dashed #d1d5db;border-radius:6px;padding:0 14px;
      display:flex;align-items:center;justify-content:center;
      color:#9ca3af;font-size:12px;font-family:'Open Sans',sans-serif;">${label}</div>`;

  return `
    <div style="
      width:1123px;height:794px;background:#ffffff;position:relative;
      overflow:hidden;box-sizing:border-box;
      box-shadow:0 10px 25px rgba(0,0,0,0.1);
      direction: ${isAr ? 'rtl' : 'ltr'};
    ">
      <!-- Google Fonts -->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Dancing+Script:wght@700&family=Playfair+Display:ital,wght@0,700;1,400&family=Open+Sans:wght@400;600;700&display=swap');
      </style>

      <!-- Geometric background -->
      <div aria-hidden="true" style="position:absolute;top:0;${isAr ? 'left:0;' : 'right:0;'}bottom:0;width:38%;z-index:1;overflow:hidden;pointer-events:none;">
        <!-- Black diagonal shape -->
        <div style="position:absolute;top:-100px;${isAr ? 'left:200px;' : 'right:200px;'}width:150px;height:150%;
          background:#111827;transform:rotate(${isAr ? '-20deg' : '20deg'});"></div>
        <!-- Gold stripe -->
        <div style="position:absolute;top:-50px;${isAr ? 'left:180px;' : 'right:180px;'}width:30px;height:120%;
          background:#f59e0b;transform:rotate(${isAr ? '-20deg' : '20deg'});box-shadow:${isAr ? '2px' : '-2px'} 0 5px rgba(0,0,0,0.2);"></div>
        <!-- Main shape (changed from green to black) -->
        <div style="position:absolute;top:0;${isAr ? 'left:-100px;' : 'right:-100px;'}width:450px;height:150%;
          background:#000000;
          transform:rotate(${isAr ? '-20deg' : '20deg'}) translateY(-20%);box-shadow:${isAr ? '10px' : '-10px'} 0 20px rgba(0,0,0,0.3);"></div>
      </div>

      <!-- Main content -->
      <div style="position:relative;z-index:10;width:100%;height:100%;padding:40px;
        display:flex;flex-direction:column;box-sizing:border-box;">

        <!-- Top Logos -->
        <div style="display:flex;justify-content:space-between;width:68%;margin-bottom:32px;">
          <div>${leftLogo  ? logoImg(leftLogo,  'Donor Logo') : logoBox('Donor Logo')}</div>
          <div>${rightLogo ? logoImg(rightLogo, 'NGO Logo')   : logoBox('NGO Logo')}</div>
        </div>

        <!-- Title + Name Block -->
        <div style="width:72%;text-align:center;margin-bottom:20px;">
          <h1 style="font-family:'Playfair Display', 'Aref Ruqaa', serif;font-style:${isAr ? 'normal' : 'italic'};font-size:${isAr ? '52px' : '40px'};
            font-weight:700;letter-spacing:0.05em;color:#111;margin:0 0 20px 0;line-height:1.2;">
            ${textTitle}
          </h1>
          <p style="font-family:'Open Sans', 'Aref Ruqaa', sans-serif;font-size:${isAr ? '26px' : '22px'};font-weight:700;
            color:#222;margin:0 0 24px 0;">
            ${textSubtitle}
          </p>

          <!-- Participant Name -->
          <div style="display:inline-block;width:65%;border-bottom:2px dashed #d1d5db;
            padding-bottom:8px;margin-bottom:20px;text-align:center;">
            <span style="font-family:'Playfair Display', 'Aref Ruqaa', serif;font-size:${isAr ? '52px' : '42px'};font-weight:700;
              color:#f97316;font-style:${isAr ? 'normal' : 'italic'};direction:auto;">
              ${userName}
            </span>
          </div>
        </div>

        <!-- Body Text -->
        <div style="width:60%;margin-bottom:auto;">
          <span style="font-family:'Open Sans', 'Aref Ruqaa', sans-serif;font-size:${isAr ? '20px' : '17px'};font-weight:700;
            color:#222;line-height:1.7;direction:auto;">
            ${bodyText}
          </span>
        </div>

        <!-- Signatures + QR Row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;
          width:100%;margin-top:auto;padding-bottom:8px;">

          <!-- Trainer Signature -->
          <div style="width:180px;text-align:center;${isAr ? 'margin-right:60px;' : 'margin-left:60px;'}">
            <div style="border-bottom:2px solid #d1d5db;height:52px;margin-bottom:8px;"></div>
            <span style="font-family:'Playfair Display', 'Aref Ruqaa', serif;font-size:${isAr ? '22px' : '18px'};font-style:${isAr ? 'normal' : 'italic'};
              font-weight:700;color:#222;direction:auto;">
              ${trainerName || '— — —'}
            </span>
            <div style="font-family:'Open Sans', 'Aref Ruqaa', sans-serif;font-size:${isAr ? '14px' : '12px'};color:#6b7280;
              margin-top:4px;letter-spacing:0.05em;">${textTrainer}</div>
          </div>

          <!-- PM Signature -->
          <div style="width:180px;text-align:center;${isAr ? 'margin-right:180px;margin-left:auto;' : 'margin-left:180px;margin-right:auto;'}">
            <div style="border-bottom:2px solid #d1d5db;height:52px;margin-bottom:8px;"></div>
            <span style="font-family:'Playfair Display', 'Aref Ruqaa', serif;font-size:${isAr ? '22px' : '18px'};font-style:${isAr ? 'normal' : 'italic'};
              font-weight:700;color:#222;direction:auto;">
              ${pmName || '— — —'}
            </span>
            <div style="font-family:'Open Sans', 'Aref Ruqaa', sans-serif;font-size:${isAr ? '14px' : '12px'};color:#6b7280;
              margin-top:4px;letter-spacing:0.05em;">${finalPmTitle.toUpperCase()}</div>
          </div>

          <!-- QR Code (floats over the black section) -->
          <div style="${isAr ? 'margin-left:60px;' : 'margin-right:60px;'}margin-bottom:20px;z-index:20;text-align:center;">
            ${qrDataUrl ? `
              <img src="${qrDataUrl}" style="width:90px;height:90px;display:block;" />
              <div style="font-family:'Open Sans', 'Aref Ruqaa', sans-serif;font-size:9px;color:#fff;
                margin-top:4px;letter-spacing:0.05em;">${textScan}</div>
              <div style="font-family:'Courier New',monospace;font-size:8px;color:#d1d5db;margin-top:2px;">
                ${certCode}
              </div>
            ` : `
              <div style="font-family:'Courier New',monospace;font-size:9px;color:#9ca3af;">
                ${certCode}
              </div>
            `}
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

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

    // Wait for fonts to load
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    try {
      const canvas = await html2canvas(container.firstElementChild, {
        scale: 2, useCORS: true, logging: false,
        width: 1123, height: 794,
      });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
    } finally {
      document.body.removeChild(container);
    }
  }

  const projName = training.activities?.projects?.name || 'GEN';
  pdf.save(`Certificates_${projName}_${training.title.replace(/\s+/g, '_')}.pdf`);
};
