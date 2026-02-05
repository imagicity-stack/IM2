import jsPDF from 'jspdf';

export const generateInvoicePDF = (invoice, client, settings) => {
  try {
    console.log('Starting PDF generation...');
    console.log('Invoice:', invoice);
    console.log('Client:', client);
    console.log('Settings:', settings);
    
    const doc = new jsPDF();
    
    // Test if jsPDF is working
    if (!doc) {
      throw new Error('jsPDF initialization failed');
    }
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add logo at top
    const logoImg = new Image();
    logoImg.src = '/imagicity-logo.png';
    
    // Draw white background for logo area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Add logo (will be added when image loads, but we'll continue with text)
    try {
      doc.addImage(logoImg, 'PNG', 15, 10, 50, 15);
    } catch (e) {
      // If logo fails, add text fallback
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('IMAGICITY', 15, 20);
    }
    
    // Red line separator
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(2);
    doc.line(0, 35, pageWidth, 35);
    
    // Invoice type and number
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text((invoice?.invoice_type || 'INVOICE').toUpperCase(), 15, 45);
    
    // Invoice number on right
    doc.setFontSize(14);
    doc.text(invoice?.invoice_number || 'INV-0000', pageWidth - 15, 45, { align: 'right' });
    
    // Reset to black text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Company details
    let yPos = 55;
    doc.text('FROM:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.company_name || 'IMAGICITY', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`GSTIN: ${settings?.company_gstin || 'N/A'}`, 15, yPos);
    yPos += 6;
    doc.text(settings?.company_address || 'N/A', 15, yPos);
    
    // Client details on right
    let clientYPos = 55;
    doc.text('BILL TO:', pageWidth - 15, clientYPos, { align: 'right' });
    clientYPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(client?.business_name || client?.name || 'N/A', pageWidth - 15, clientYPos, { align: 'right' });
    clientYPos += 6;
    doc.setFont('helvetica', 'normal');
    if (client?.gstin) {
      doc.text(`GSTIN: ${client.gstin}`, pageWidth - 15, clientYPos, { align: 'right' });
      clientYPos += 6;
    }
    if (client?.email) {
      doc.text(client.email, pageWidth - 15, clientYPos, { align: 'right' });
      clientYPos += 6;
    }
    if (client?.phone) {
      doc.text(client.phone, pageWidth - 15, clientYPos, { align: 'right' });
      clientYPos += 6;
    }
    
    // Dates
    yPos += 20;
    doc.setFontSize(9);
    doc.text(`Invoice Date: ${invoice?.invoice_date || 'N/A'}`, 15, yPos);
    doc.text(`Due Date: ${invoice?.due_date || 'N/A'}`, pageWidth - 15, yPos, { align: 'right' });
    
    // Items table - draw manually since autoTable might not work
    yPos += 15;
    doc.setFillColor(245, 158, 11);
    doc.rect(15, yPos - 5, pageWidth - 30, 10, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 20, yPos);
    doc.text('QTY', 120, yPos);
    doc.text('RATE', 145, yPos);
    doc.text('AMOUNT', 175, yPos);
    
    // Items
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    const items = invoice?.items || [];
    items.forEach((item, index) => {
      doc.text(item.description || '', 20, yPos);
      doc.text((item.quantity || 0).toString(), 120, yPos);
      doc.text(`₹${(item.rate || 0).toFixed(2)}`, 145, yPos);
      doc.text(`₹${(item.amount || 0).toFixed(2)}`, 175, yPos);
      yPos += 8;
    });
    
    // Line
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;
    
    // Totals
    const rightX = pageWidth - 15;
    const labelX = rightX - 60;
    
    doc.text('Subtotal:', labelX, yPos);
    doc.text(`₹${(invoice?.subtotal || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;
    
    doc.text('IGST (18%):', labelX, yPos);
    doc.text(`₹${(invoice?.igst || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;
    
    // Total with background
    doc.setFillColor(245, 158, 11);
    doc.rect(labelX - 5, yPos - 5, 70, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', labelX, yPos);
    doc.text(`₹${(invoice?.total || 0).toFixed(2)}`, rightX, yPos, { align: 'right' });
    
    // Bank details
    yPos += 20;
    doc.setFontSize(10);
    doc.text('PAYMENT DETAILS', 15, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${settings?.bank_name || 'N/A'}`, 15, yPos);
    yPos += 6;
    doc.text(`Account: ${settings?.account_number || 'N/A'}`, 15, yPos);
    yPos += 6;
    doc.text(`IFSC: ${settings?.ifsc_code || 'N/A'}`, 15, yPos);
    yPos += 6;
    doc.text(`UPI: ${settings?.upi_id || 'N/A'}`, 15, yPos);
    
    // Notes
    if (invoice?.notes) {
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES:', 15, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.notes, 15, yPos, { maxWidth: pageWidth - 30 });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(settings?.company_name || 'IMAGICITY', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    console.log('PDF generation completed successfully');
    return doc;
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};
