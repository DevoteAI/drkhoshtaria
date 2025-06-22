import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ResponsePDFData {
  patientName: string;
  patientEmail: string;
  question: string;
  response: string;
  timestamp: Date;
}

export async function generateResponsePDF(data: ResponsePDFData): Promise<void> {
  try {
    // Create HTML template for PDF
    const htmlTemplate = createPDFHTML(data);
    
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlTemplate;
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '-9999px';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '794px'; // A4 width in pixels at 96dpi
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    document.body.appendChild(tempDiv);

    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // High resolution
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: tempDiv.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    
    if (imgHeight <= pdfHeight) {
      // Single page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multiple pages
      let yOffset = 0;
      let remainingHeight = imgHeight;
      
      while (remainingHeight > 0) {
        const pageHeight = Math.min(pdfHeight, remainingHeight);
        const sourceY = (imgHeight - remainingHeight) * canvas.height / imgHeight;
        const sourceHeight = pageHeight * canvas.height / imgHeight;
        
        // Create canvas for this page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        pageCtx?.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png');
        
        if (yOffset > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageHeight);
        
        remainingHeight -= pageHeight;
        yOffset += pageHeight;
      }
    }

    // Generate filename
    const patientNameForFile = data.patientName 
      ? data.patientName.replace(/[^a-zA-Z0-9]/g, '_') 
      : 'Patient';
    const filename = `Medical_Response_${patientNameForFile}_${
      data.timestamp.toISOString().split('T')[0]
    }.pdf`;

    // Download the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

function createPDFHTML(data: ResponsePDFData): string {
  const dateStr = data.timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Convert markdown response to HTML
  const responseHTML = DOMPurify.sanitize(marked(data.response));

  return `
    <div style="
      width: 794px;
      padding: 40px;
      background: white;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    ">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #0891b2, #06b6d4);
        color: white;
        padding: 30px;
        margin: -40px -40px 30px -40px;
        text-align: center;
      ">
        <h1 style="
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
        ">Dr. Khoshtaria Medical Platform</h1>
        <p style="
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        ">Professional Medical Consultation Report</p>
        <div style="
          text-align: right;
          margin-top: 15px;
          font-size: 12px;
          opacity: 0.8;
        ">Generated: ${dateStr}</div>
      </div>

      <!-- Patient Information -->
      <div style="margin-bottom: 30px;">
        <div style="
          background: #f1f5f9;
          padding: 15px 20px;
          border-radius: 8px;
          border-left: 4px solid #0891b2;
          margin-bottom: 15px;
        ">
          <h3 style="
            margin: 0 0 15px 0;
            color: #0891b2;
            font-size: 18px;
            font-weight: 600;
          ">PATIENT INFORMATION</h3>
        </div>
        
        <div style="padding-left: 20px;">
          <div style="margin: 8px 0; display: flex;">
            <span style="font-weight: 600; color: #64748b; width: 120px;">Patient Name:</span>
            <span>${data.patientName || 'Not provided'}</span>
          </div>
          <div style="margin: 8px 0; display: flex;">
            <span style="font-weight: 600; color: #64748b; width: 120px;">Email Address:</span>
            <span>${data.patientEmail || 'Not provided'}</span>
          </div>
          <div style="margin: 8px 0; display: flex;">
            <span style="font-weight: 600; color: #64748b; width: 120px;">Report Date:</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>

      ${data.question && data.question.trim() ? `
      <!-- Patient Question -->
      <div style="margin-bottom: 30px;">
        <div style="
          background: #f1f5f9;
          padding: 15px 20px;
          border-radius: 8px;
          border-left: 4px solid #0891b2;
          margin-bottom: 15px;
        ">
          <h3 style="
            margin: 0;
            color: #0891b2;
            font-size: 18px;
            font-weight: 600;
          ">PATIENT INQUIRY</h3>
        </div>
        
        <div style="
          background: #fefefe;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-left: 20px;
          font-style: italic;
          color: #475569;
        ">${data.question}</div>
      </div>
      ` : ''}

      <!-- Medical Response -->
      <div style="margin-bottom: 30px;">
        <div style="
          background: #f1f5f9;
          padding: 15px 20px;
          border-radius: 8px;
          border-left: 4px solid #0891b2;
          margin-bottom: 15px;
        ">
          <h3 style="
            margin: 0;
            color: #0891b2;
            font-size: 18px;
            font-weight: 600;
          ">MEDICAL RESPONSE</h3>
        </div>
        
        <div style="
          background: #fefefe;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-left: 20px;
        ">
          <div style="
            line-height: 1.7;
            color: #333;
          ">
            ${responseHTML}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="
        background: linear-gradient(135deg, #0891b2, #06b6d4);
        color: white;
        padding: 20px 30px;
        margin: 30px -40px -40px -40px;
        text-align: center;
        font-size: 12px;
      ">
        <div style="font-weight: 600; margin-bottom: 5px;">Dr. Khoshtaria Medical Platform</div>
        <div style="opacity: 0.9;">Professional Healthcare Consultation Services</div>
      </div>
    </div>
  `;
}