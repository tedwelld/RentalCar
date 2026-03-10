import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fleetCarBranding } from './branding';
import { PrintableDocument } from './models';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  exportTable(options: {
    dataset: string;
    officeLabel: string;
    headers: string[];
    rows: Array<Array<string | number>>;
    generatedBy?: string;
  }) {
    const doc = this.buildTablePdf(options);
    doc.save(`${options.dataset.toLowerCase().replaceAll(' ', '-')}-report.pdf`);
  }

  previewTable(options: {
    dataset: string;
    officeLabel: string;
    headers: string[];
    rows: Array<Array<string | number>>;
    generatedBy?: string;
  }) {
    return this.createObjectUrl(this.buildTablePdf(options));
  }

  previewDocument(document: PrintableDocument) {
    return this.createObjectUrl(this.buildDocumentPdf(document));
  }

  printDocument(document: PrintableDocument) {
    const url = this.previewDocument(document);
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) {
      popup.addEventListener('load', () => popup.print(), { once: true });
    }
    return url;
  }

  private buildTablePdf(options: {
    dataset: string;
    officeLabel: string;
    headers: string[];
    rows: Array<Array<string | number>>;
    generatedBy?: string;
  }) {
    const landscape = options.headers.length > 5;
    const doc = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    this.drawHeader(doc, `${options.dataset} Report`, options.officeLabel, options.generatedBy);

    autoTable(doc, {
      startY: 142,
      margin: { top: 142, right: 40, bottom: 78, left: 40 },
      head: [options.headers],
      body: options.rows.map((row) => row.map((value) => String(value ?? ''))),
      styles: {
        fontSize: 9,
        cellPadding: 8,
        textColor: [20, 32, 51],
        lineColor: [222, 230, 241],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [31, 111, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [247, 250, 255]
      },
      didDrawPage: ({ pageNumber }) => this.drawFooter(doc, pageNumber)
    });
    return doc;
  }

  private buildDocumentPdf(document: PrintableDocument) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    this.drawHeader(doc, document.documentType, document.officeName, document.generatedByUsername);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 32, 51);
    doc.text(`${document.documentType} No: ${document.documentNumber}`, 40, 162);
    doc.text(`Customer: ${document.customerName}`, 40, 182);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(97, 112, 134);
    doc.text(`${document.customerEmail} | ${document.customerPhone}`, 40, 198);
    doc.text(`Country: ${document.customerCountry}`, 40, 214);
    doc.text(`Issued: ${new Date(document.issuedAtUtc).toLocaleString()}`, 350, 162);
    doc.text(`Currency: ${document.currency}`, 350, 178);

    autoTable(doc, {
      startY: 236,
      margin: { top: 236, right: 40, bottom: 120, left: 40 },
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: document.lines.map((line) => [
        line.description,
        line.quantity,
        `${document.currency} ${line.unitPrice.toFixed(2)}`,
        `${document.currency} ${line.amount.toFixed(2)}`
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 8,
        textColor: [20, 32, 51],
        lineColor: [222, 230, 241],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [31, 111, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [247, 250, 255]
      },
      didDrawPage: ({ pageNumber }) => this.drawFooter(doc, pageNumber)
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 420;
    const summaryX = 340;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 32, 51);
    doc.text('Summary', summaryX, finalY + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: ${document.currency} ${document.subtotal.toFixed(2)}`, summaryX, finalY + 48);
    doc.text(`Tax: ${document.currency} ${document.taxAmount.toFixed(2)}`, summaryX, finalY + 66);
    doc.text(`VAT: ${document.currency} ${document.vatAmount.toFixed(2)}`, summaryX, finalY + 84);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${document.currency} ${document.totalAmount.toFixed(2)}`, summaryX, finalY + 106);

    if (document.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(97, 112, 134);
      doc.text(`Notes: ${document.notes}`, 40, finalY + 48, { maxWidth: 260 });
    }

    return doc;
  }

  private drawHeader(doc: jsPDF, dataset: string, officeLabel: string, generatedBy?: string) {
    doc.setFillColor(31, 111, 255);
    doc.roundedRect(40, 30, 62, 40, 14, 14, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(3);
    doc.line(54, 56, 92, 56);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2);
    doc.roundedRect(54, 42, 28, 12, 4, 4);
    doc.circle(62, 58, 5, 'S');
    doc.circle(88, 58, 5, 'S');
    doc.line(72, 42, 84, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(20, 32, 51);
    doc.text('FleetCar', 116, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(97, 112, 134);
    doc.text(fleetCarBranding.address, 116, 64);
    doc.text(`${fleetCarBranding.phone}  |  ${fleetCarBranding.email}`, 116, 78);

    doc.setDrawColor(226, 232, 240);
    doc.line(40, 92, doc.internal.pageSize.getWidth() - 40, 92);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 32, 51);
    doc.text(dataset, 40, 118);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(97, 112, 134);
    doc.text(`Office scope: ${officeLabel}`, 40, 134);
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - 220, 134);
    if (generatedBy) {
      doc.text(`Generated by: ${generatedBy}`, doc.internal.pageSize.getWidth() - 220, 148);
    }
  }

  private drawFooter(doc: jsPDF, pageNumber: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(226, 232, 240);
    doc.line(40, pageHeight - 52, pageWidth - 40, pageHeight - 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(97, 112, 134);
    doc.text(fleetCarBranding.address, 40, pageHeight - 32);
    doc.text(fleetCarBranding.phone, 220, pageHeight - 32);
    doc.text(fleetCarBranding.email, 350, pageHeight - 32);
    doc.text(`Page ${pageNumber}`, pageWidth - 72, pageHeight - 32);
  }

  private createObjectUrl(doc: jsPDF) {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }
}
