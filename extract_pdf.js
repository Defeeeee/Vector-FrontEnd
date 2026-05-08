const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function extractBlankPage() {
  try {
    const existingPdfBytes = fs.readFileSync('Libro Digital.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Create a new document
    const newPdfDoc = await PDFDocument.create();
    
    // Copy the 5th page (index 4)
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [4]);
    newPdfDoc.addPage(copiedPage);
    
    const pdfBytes = await newPdfDoc.save();
    
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public');
    }
    
    fs.writeFileSync('public/blank_logbook.pdf', pdfBytes);
    console.log('Successfully extracted blank page to public/blank_logbook.pdf');
  } catch (error) {
    console.error('Error extracting PDF:', error);
  }
}

extractBlankPage();
