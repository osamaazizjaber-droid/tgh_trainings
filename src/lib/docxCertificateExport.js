import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from './imageModulePatched.js';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/** Convert any URL or data URL to a Uint8Array for images */
const urlToUint8Array = async (url) => {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
};

/** Fetch a URL and return a plain ArrayBuffer (for docx template) */
const urlToArrayBuffer = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch { return null; }
};

/** A tiny 1x1 transparent PNG as Uint8Array */
const TRANSPARENT_PIXEL = (() => {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
})();

/**
 * Main function: generates certificates as a PDF using a .docx template.
 */
export const generateDocxCertificates = async (
  certificates,
  attendanceByUser,
  training,
  baseUrl,
  config = {},
  templatePath = '/templates/template.docx'
) => {
  if (!certificates || certificates.length === 0) return;

  // 1. Fetch template as ArrayBuffer (correct type for PizZip)
  const templateBuffer = await urlToArrayBuffer(templatePath);
  if (!templateBuffer) {
    throw new Error(`Could not load template at ${templatePath}`);
  }

  // 2. Pre-fetch logos as Uint8Array
  const ngoLogoBytes   = (await urlToUint8Array(config.rightLogo))  || TRANSPARENT_PIXEL;
  const donorLogoBytes = (await urlToUint8Array(config.leftLogo))   || TRANSPARENT_PIXEL;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1123px;';
  document.body.appendChild(container);

  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    const record = attendanceByUser[cert.user_id];
    if (!record || !record.user) continue;

    const userName = [
      record.user.first_name, record.user.second_name,
      record.user.third_name,  record.user.fourth_name,
    ].filter(Boolean).join(' ');

    // 3. QR Code as Uint8Array
    const verifyUrl = `${baseUrl}/verify?code=${cert.certificate_code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
    const qrBytes   = (await urlToUint8Array(qrDataUrl)) || TRANSPARENT_PIXEL;

    const data = {
      userName:      userName || '',
      trainingTitle: training.title || '',
      certCode:      cert.certificate_code || '',
      bodyText:      config.bodyText || '',
      trainerName:   config.trainerName || '',
      pmName:        config.pmName || '',
      pmTitle:       config.pmTitle || '',
      date:          new Date().toLocaleDateString('en-GB'),
      // Image placeholders — all variants
      qrCode:    qrBytes,
      logoDonor: donorLogoBytes,
      donorLogo: donorLogoBytes,
      logoNgo:   ngoLogoBytes,
      ngoLogo:   ngoLogoBytes,
      logoNGO:   ngoLogoBytes,
    };

    // 4. Build docxtemplater
    const zip = new PizZip(templateBuffer);  // No binary:true — ArrayBuffer is handled automatically

    const imageModule = new ImageModule({
      centered: false,
      getImage: (v) => v,
      getSize: (img, v, name) => {
        if (!v || v === TRANSPARENT_PIXEL) return [1, 1];
        return name === 'qrCode' ? [80, 80] : [140, 60];
      },
    });

    const docx = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    try {
      docx.render(data);
    } catch (error) {
      if (error.properties?.errors) {
        throw new Error(error.properties.errors.map(e => e.message).join(', '));
      }
      throw error;
    }

    const out = docx.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 5. Render to canvas → PDF page
    container.innerHTML = '';
    await renderAsync(out, container);
    await new Promise(r => setTimeout(r, 500));

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  }

  document.body.removeChild(container);

  const projName = training.activities?.projects?.name || 'GEN';
  pdf.save(`Certificates_${projName}_${training.title.replace(/\s+/g, '_')}.pdf`);
};
