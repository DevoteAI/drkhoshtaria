import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Question } from '../../types/admin';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface PDFGeneratorProps {
  question: Question;
  onGenerateStart?: () => void;
  onGenerateComplete?: () => void;
  onError?: (error: string) => void;
}

export async function generatePDF({ 
  question,
  onGenerateStart,
  onGenerateComplete,
  onError 
}: PDFGeneratorProps) {
  try {
    onGenerateStart?.();

    // Create a temporary div to render the content
    const container = document.createElement('div');
    container.style.width = '595px'; // A4 width in pixels at 72 DPI
    container.style.padding = '40px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#000';
    container.style.backgroundColor = '#fff';
    
    // Add content to the container
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 24px; color: #152f61; margin-bottom: 10px;">Dr. Khoshtaria Medical Response</h1>
        <p style="font-size: 14px; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #152f61; margin-bottom: 10px;">Patient Information</h2>
        <p><strong>Name:</strong> ${question.name}</p>
        <p><strong>Email:</strong> ${question.email}</p>
        ${question.phone ? `<p><strong>Phone:</strong> ${question.phone}</p>` : ''}
        <p><strong>Date:</strong> ${new Date(question.created_at).toLocaleString()}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #152f61; margin-bottom: 10px;">Patient Question</h2>
        <p style="white-space: pre-wrap;">${question.question}</p>
      </div>

      <div>
        <h2 style="font-size: 18px; color: #152f61; margin-bottom: 10px;">Doctor's Response</h2>
        ${question.response ? DOMPurify.sanitize(marked(question.response)) : 'No response provided yet.'}
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>This is an official medical response document from Dr. Khoshtaria's office.</p>
        <p>For any questions, please contact: mamuka_khoshtaria@yahoo.com</p>
      </div>
    `;

    // Add the container to the document temporarily
    document.body.appendChild(container);

    // Generate PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      useCORS: true
    });

    // Remove the temporary container
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(
      imgData, 
      'JPEG', 
      imgX, 
      imgY, 
      imgWidth * ratio, 
      imgHeight * ratio, 
      undefined, 
      'FAST'
    );

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `DoctorResponse_${question.id}_${date}.pdf`;

    // Download the PDF
    pdf.save(filename);
    onGenerateComplete?.();
  } catch (error) {
    console.error('Error generating PDF:', error);
    onError?.(error instanceof Error ? error.message : 'Failed to generate PDF');
  }
}