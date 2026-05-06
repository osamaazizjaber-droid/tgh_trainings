import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export const generateCertificatesPdf = async (certificates, attendanceByUser, training, baseUrl) => {
  if (!certificates || certificates.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4' // 297 x 210 mm
  });

  // Since we assume they have 'certificate-template.png' in public
  const imgData = '/certificate-template.png';
  let imageLoaded = false;
  let logoLoaded = false;
  
  try {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { imageLoaded = true; resolve(); };
      img.onerror = () => { imageLoaded = false; resolve(); };
      img.src = imgData;
    });
    await new Promise((resolve) => {
      const logo = new Image();
      logo.onload = () => { logoLoaded = true; resolve(); };
      logo.onerror = () => { logoLoaded = false; resolve(); };
      logo.src = '/logo.png';
    });
  } catch (e) {}

  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    const record = attendanceByUser[cert.user_id];
    if (!record || !record.user) continue;

    if (i > 0) {
      doc.addPage();
    }

    if (imageLoaded) {
      try {
        doc.addImage(imgData, 'PNG', 0, 0, 297, 210);
      } catch (e) {
        console.warn('Could not add template image', e);
      }
    } else {
      // Fallback simple layout if image not found
      doc.setLineWidth(2);
      doc.setDrawColor(79, 70, 229); // Primary color
      doc.rect(10, 10, 277, 190);
      doc.setFontSize(36);
      doc.setTextColor(79, 70, 229);
      doc.text('CERTIFICATE OF COMPLETION', 148.5, 40, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text('This is to certify that', 148.5, 80, { align: 'center' });
      
      if (logoLoaded) {
        doc.addImage('/logo.png', 'PNG', 128.5, 50, 40, 40);
      }
    }

    const userName = [record.user.first_name, record.user.second_name, record.user.third_name, record.user.fourth_name].filter(Boolean).join(' ');

    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    // Adjusted Y coordinate assuming the user will tweak this depending on their template
    doc.text(userName, 148.5, 115, { align: 'center' }); 

    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(training.title, 148.5, 135, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Certificate Code: ${cert.certificate_code}`, 148.5, 145, { align: 'center' });
    doc.text(`Project: ${training.activities?.projects?.name || 'N/A'}`, 148.5, 152, { align: 'center' });

    // Generate QR Code data URL
    const verifyUrl = `${baseUrl}/verify?code=${cert.certificate_code}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
      // Place QR code in the bottom right corner (adjust as needed for template)
      doc.addImage(qrDataUrl, 'PNG', 230, 150, 40, 40);
      
      // Instruction to scan
      doc.setFontSize(8);
      doc.text('Scan to Verify', 250, 195, { align: 'center' });
    } catch (err) {
      console.error('Error generating QR', err);
    }
  }

  const projName = training.activities?.projects?.name || 'GEN';
  doc.save(`Certificates_${projName}_${training.title.replace(/\s+/g, '_')}.pdf`);
};
