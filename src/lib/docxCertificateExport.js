import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Utility to generate certificates using a .docx template.
 */
export const generateDocxCertificates = async (
  certificates, 
  attendanceByUser, 
  training, 
  baseUrl, 
  config = {}, // Added config parameter
  templatePath = '/templates/template.docx'
) => {
  if (!certificates || certificates.length === 0) return;

  // Helper to convert dataURL/URL to ArrayBuffer for docxtemplater
  const getBuffer = async (url) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf); // Use Uint8Array for image module compatibility
    } catch {
      return null;
    }
  };

  // 1. Fetch the template
  const templateBuffer = await getBuffer(templatePath);
  if (!templateBuffer) {
    throw new Error(`Failed to load template at ${templatePath}. Please ensure the file exists.`);
  }

  // Pre-fetch logos from config if they exist
  const ngoLogoBuffer = await getBuffer(config.rightLogo); // NGO is usually on the right in your UI
  const donorLogoBuffer = await getBuffer(config.leftLogo); // Donor is usually on the left

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1123px;'; 
  document.body.appendChild(container);

  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    const record = attendanceByUser[cert.user_id];
    if (!record || !record.user) continue;

    const userName = [
      record.user.first_name, record.user.second_name,
      record.user.third_name, record.user.fourth_name,
    ].filter(Boolean).join(' ');

    // 2. Generate QR Code
    const verifyUrl = `${baseUrl}/verify?code=${cert.certificate_code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
    const qrBuffer = await getBuffer(qrDataUrl);
    
    const transparentPixel = await getBuffer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    // 3. Prepare Data for Template
    const data = {
      userName: userName || 'Unknown',
      trainingTitle: training.title || '',
      certCode: cert.certificate_code || '',
      bodyText: config.bodyText || '',
      trainerName: config.trainerName || '',
      pmName: config.pmName || '',
      pmTitle: config.pmTitle || '',
      date: new Date().toLocaleDateString('en-GB'),
      qrCode: qrBuffer || transparentPixel,
      logoNgo: ngoLogoBuffer || transparentPixel,
      logoDonor: donorLogoBuffer || transparentPixel
    };

    // 4. Setup Docxtemplater with Image Module
    const zip = new PizZip(templateBuffer, { binary: true });
    
    const opts = {
      centered: false,
      getImage: (tagValue) => tagValue,
      getSize: (img, tagValue, tagName) => {
        if (tagValue === transparentPixel) return [1, 1];
        if (tagName === 'qrCode') return [80, 80];
        return [140, 60]; // Default size for logos
      },
    };

    const docx = new Docxtemplater(zip, {
      modules: [new ImageModule(opts)],
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Render Template with Full Error Catching
    try {
      docx.render(data);
    } catch (error) {
      console.error('Docxtemplater Error:', error);
      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors.map(e => e.message).join(', ');
        throw new Error(`Template Error: ${errorMessages}`);
      }
      throw error;
    }

    const out = docx.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 5. Convert DOCX to HTML/Canvas for PDF
    container.innerHTML = '';
    await renderAsync(out, container);

    // Give a tiny timeout for fonts/images to settle in the preview
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    if (i > 0) doc.addPage();
    doc.addImage(imgData, 'PNG', 0, 0, 297, 210);
  }

  // Cleanup
  document.body.removeChild(container);

  // 6. Save PDF
  const projName = training.activities?.projects?.name || 'GEN';
  doc.save(`Certificates_${projName}_${training.title.replace(/\s+/g, '_')}.pdf`);
};
