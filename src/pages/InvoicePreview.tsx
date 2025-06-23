import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Download, Printer, Save, Edit, ArrowLeft, Pencil } from 'lucide-react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useTemplateStore } from '../stores/templateStore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { InvoiceFormData, InvoiceItem } from '../types';
import { toast } from 'react-hot-toast';

const InvoicePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchInvoice, createInvoice, updateInvoice } = useInvoiceStore();
  const { letterhead, defaultInfo } = useTemplateStore();
  
  const [invoice, setInvoice] = useState<InvoiceFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTemp, setIsTemp] = useState(false);
  const [editableTaxableAmounts, setEditableTaxableAmounts] = useState<{ [key: number]: boolean }>({});
  const [editableTotalTaxableAmount, setEditableTotalTaxableAmount] = useState(false);
  const [editedTaxableAmounts, setEditedTaxableAmounts] = useState<{ [key: number]: number }>({});
  const [editedTotalTaxableAmount, setEditedTotalTaxableAmount] = useState<number | null>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      
      try {
        if (id === 'temp') {
          const tempData = localStorage.getItem('invoicePreviewData');
          if (tempData) {
            const parsedData = JSON.parse(tempData) as InvoiceFormData;
            setInvoice(parsedData);
            setIsTemp(true);
            const initialEditedAmounts = parsedData.items.reduce((acc: { [key: number]: number }, item: InvoiceItem, index: number) => {
              acc[index] = item.taxableAmount;
              return acc;
            }, {} as { [key: number]: number });
            setEditedTaxableAmounts(initialEditedAmounts);
            setEditedTotalTaxableAmount(parsedData.items.reduce((sum: number, item: InvoiceItem) => sum + item.taxableAmount, 0));
          } else {
            toast.error('No preview data found');
            navigate('/generate-invoice');
          }
        } else {
          const data = await fetchInvoice(id as string);
          setInvoice(data);
          setIsTemp(false);
          const initialEditedAmounts = data.items.reduce((acc: { [key: number]: number }, item: InvoiceItem, index: number) => {
            acc[index] = item.taxableAmount;
            return acc;
          }, {} as { [key: number]: number });
          setEditedTaxableAmounts(initialEditedAmounts);
          setEditedTotalTaxableAmount(data.items.reduce((sum: number, item: InvoiceItem) => sum + item.taxableAmount, 0));
        }
      } catch (error) {
        console.error('Error loading invoice:', error);
        toast.error('Failed to load invoice');
        navigate('/invoice-library');
      } finally {
        setLoading(false);
      }
    };
    
    loadInvoice();
  }, [id, fetchInvoice, navigate]);
  
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice_${invoice?.invoiceNumber}`,
    removeAfterPrint: true,
    onBeforeGetContent: () => {
      if (invoiceRef.current) {
        invoiceRef.current.classList.add('print-mode');
      }
      return Promise.resolve();
    },
    onAfterPrint: () => {
      if (invoiceRef.current) {
        invoiceRef.current.classList.remove('print-mode');
      }
    }
  });
  
  const handleGeneratePDF = () => {
    if (!invoice) return;
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.setFont('helvetica');
      
      const margin = 15;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - (margin * 2);
      
      let yPos = 10;

      const logoBase64 = "";
      const logoWidth = 30;
      const logoHeight = 30;
      const logoX = margin - 3;
      const logoY = 3;

      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);

      const textWidth = contentWidth;
      const textStartX = margin;

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(13, 71, 161);
      const companyName = letterhead?.companyName || 'Venkateswara Marine Electrical Works';
      const companyNameWidth = pdf.getTextWidth(companyName);
      const companyNameX = (pageWidth - companyNameWidth) / 2;
      pdf.text(companyName, companyNameX, yPos + 5);

      yPos += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      pdf.setFont('helvetica', 'bold');
      const gstLabel = 'GST No: ';
      const gstValue = letterhead?.gstNo || '37AGIPP2674H2Z0';
      const gstText = `${gstLabel}${gstValue}`;
      const gstTextWidth = pdf.getTextWidth(gstText);
      const gstTextX = (pageWidth - gstTextWidth) / 2;

      pdf.text(gstLabel, gstTextX, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(gstValue, gstTextX + pdf.getTextWidth(gstLabel), yPos);
      yPos += 5;

      pdf.setFontSize(9);
      const addressLabel = 'Address: ';
      const addressValue = letterhead?.address || ' D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03';
      const addressText = `${addressLabel} ${addressValue}`;
      const addressLines = pdf.splitTextToSize(addressText, textWidth);
      const addressTextWidth = pdf.getTextWidth(addressLines[0]);
      const addressTextX = (pageWidth - addressTextWidth) / 2;

      pdf.setFont('helvetica', 'bold');
      pdf.text(addressLabel, addressTextX, yPos);

      pdf.setFont('helvetica', 'normal');
      const addressValueStartX = addressTextX + pdf.getTextWidth(addressLabel) + 1;
      const addressValueLines = pdf.splitTextToSize(addressValue, textWidth - pdf.getTextWidth(addressLabel) - 1);
      pdf.text(addressValueLines, addressValueStartX, yPos);
      yPos += addressValueLines.length * 4;

      const workshopLabel = 'Workshop: ';
      const workshopValue = letterhead?.workshop || ' Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11';
      const workshopText = `${workshopLabel} ${workshopValue}`;
      const workshopLines = pdf.splitTextToSize(workshopText, textWidth);
      const workshopTextWidth = pdf.getTextWidth(workshopLines[0]);
      const workshopTextX = (pageWidth - workshopTextWidth) / 2;

      pdf.setFont('helvetica', 'bold');
      pdf.text(workshopLabel, workshopTextX, yPos);

      pdf.setFont('helvetica', 'normal');
      const workshopValueStartX = workshopTextX + pdf.getTextWidth(workshopLabel) + 1;
      const workshopValueLines = pdf.splitTextToSize(workshopValue, textWidth - pdf.getTextWidth(workshopLabel) - 1);
      pdf.text(workshopValueLines, workshopValueStartX, yPos);
      yPos += workshopValueLines.length * 4;

      const emailLabel = 'Email:';
      const emailValue = letterhead?.email || 'vmew10n@gmail.com';
      const cellLabel = 'Cell:';
      const cellValue = letterhead?.cell || '9848523264';
      const separator = '  |  ';

      pdf.setFont('helvetica', 'bold');
      const emailLabelWidth = pdf.getTextWidth(emailLabel);
      const cellLabelWidth = pdf.getTextWidth(cellLabel);

      pdf.setFont('helvetica', 'normal');
      const emailValueWidth = pdf.getTextWidth(emailValue);
      const cellValueWidth = pdf.getTextWidth(cellValue);
      const separatorWidth = pdf.getTextWidth(separator);

      const totalWidth =
        emailLabelWidth +
        emailValueWidth +
        separatorWidth +
        cellLabelWidth +
        cellValueWidth;

      const startX = (pageWidth - totalWidth) / 2;

      let currentX = startX;

      pdf.setFont('helvetica', 'bold');
      pdf.text(emailLabel, currentX, yPos);
      currentX += emailLabelWidth;

      pdf.setFont('helvetica', 'normal');
      pdf.text(emailValue, currentX, yPos);
      currentX += emailValueWidth;

      pdf.text(separator, currentX, yPos);
      currentX += separatorWidth;

      pdf.setFont('helvetica', 'bold');
      pdf.text(cellLabel, currentX, yPos);
      currentX += cellLabelWidth;

      pdf.setFont('helvetica', 'normal');
      pdf.text(cellValue, currentX, yPos);

      yPos += 5;

      yPos = Math.max(yPos, logoY + logoHeight + 5);

      pdf.setLineWidth(0.5);
      pdf.setDrawColor(13, 71, 161);
      pdf.line(5, yPos, pageWidth - 5, yPos);
      yPos += 8;
      yPos = Math.min(yPos, 50);
      
      pdf.setLineWidth(0.2);
      pdf.setDrawColor(0, 0, 0); 
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, margin, yPos);
      pdf.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, margin, yPos + 5);
      
      pdf.text(`PAN No: ${defaultInfo?.panNo || 'AGIPP2674H'}`, pageWidth - margin, yPos, { align: 'right' });
      pdf.text(`MSME No: ${defaultInfo?.msmeNo || 'UDYAM-AP-10-000719'}`, pageWidth - margin, yPos + 5, { align: 'right' });
      
      yPos += 10;
      
      const buyerLines = [
        { label: "Name:", value: invoice.buyerName },
        ...invoice.buyerAddress.split('\n').map((line, i) => ({
          label: i === 0 ? "Address:" : "", value: line
        })),
        { label: "GST No:", value: invoice.buyerGst }
      ];

      const rightSideLines = [
        { label: "Vessel:", value: invoice.vessel || "" },
        { label: "E-way Bill No:", value: invoice.ewayBillNo || "" },
        { label: "P.O No:", value: invoice.poNumber || "" },
        { label: "DC No:", value: invoice.dcNumber || "" }
      ];

      const buyerBoxHeight = Math.max(
        buyerLines.length * 4 + 10,
        rightSideLines.length * 4 + 10,
        25
      );

      const leftBoxWidth = contentWidth * 0.55;
      const rightBoxWidth = contentWidth * 0.45;

      pdf.rect(margin, yPos, leftBoxWidth, buyerBoxHeight);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Buyer Details', margin + 2, yPos + 5);

      let buyerY = yPos + 10;
      pdf.setFontSize(9);

      buyerLines.forEach(({ label, value }) => {
        if (buyerY < yPos + buyerBoxHeight - 2) {
          const labelX = margin + 2;
          const valueX = labelX + pdf.getTextWidth(label) + 1;

          pdf.setFont('helvetica', 'bold');
          pdf.text(label, labelX, buyerY);

          pdf.setFont('helvetica', 'normal');
          pdf.text(value, valueX, buyerY);

          buyerY += 4;
        }
      });

      const rightBoxX = margin + leftBoxWidth;
      pdf.rect(rightBoxX, yPos, rightBoxWidth, buyerBoxHeight);

      let rightY = yPos + 8;
      rightSideLines.forEach(({ label, value }) => {
        if (rightY < yPos + buyerBoxHeight - 2) {
          const labelX = rightBoxX + 2;
          const valueX = labelX + pdf.getTextWidth(label) + 1;

          pdf.setFont('helvetica', 'bold');
          pdf.text(label, labelX, rightY);

          pdf.setFont('helvetica', 'normal');
          pdf.text(value, valueX, rightY);

          rightY += 4;
        }
      });
      
      yPos += buyerBoxHeight + 5;
      
      let tableHeaders: string[];
      
      if (invoice.taxType === 'igst') {
        tableHeaders = [
          'Sl.\nNo.',
          'Description of Goods',
          'HSN/SAC\nCode',
          'Qty',
          'Unit',
          'Rate',
          'Taxable\nAmount',
          'IGST\n%',
          'IGST\nAmt.'
        ];
      } else {
        tableHeaders = [
          'Sl.\nNo.',
          'Description of Goods',
          'HSN/SAC\nCode',
          'Qty',
          'Unit',
          'Rate',
          'Taxable\nAmount',
          'SGST\n%',
          'SGST\nAmt.',
          'CGST\n%',
          'CGST\nAmt.'
        ];
      }
      
      let tableData: string[][];
      
      if (invoice.taxType === 'igst') {
        tableData = invoice.items.map((item, index) => [
          (index + 1).toString(),
          item.description,
          item.hsnSacCode,
          item.quantity.toString(),
          item.unit,
          item.rate.toFixed(2),
          (editedTaxableAmounts[index] || item.taxableAmount).toFixed(2),
          `${item.igstPercentage}%`,
          item.igstAmount.toFixed(2)
        ]);
      } else {
        tableData = invoice.items.map((item, index) => [
          (index + 1).toString(),
          item.description,
          item.hsnSacCode,
          item.quantity.toString(),
          item.unit,
          item.rate.toFixed(2),
          (editedTaxableAmounts[index] || item.taxableAmount).toFixed(2),
          `${item.sgstPercentage}%`,
          item.sgstAmount.toFixed(2),
          `${item.cgstPercentage}%`,
          item.cgstAmount.toFixed(2)
        ]);
      }
      
      const totalTaxableAmount = invoice.items.reduce((sum: number, item: InvoiceItem, index: number) => sum + (editedTaxableAmounts[index] || item.taxableAmount), 0);
      const totalSgst = invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.sgstAmount, 0);
      const totalCgst = invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.cgstAmount, 0);
      const totalIgst = invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.igstAmount, 0);
      
      if (invoice.taxType === 'igst') {
        tableData.push([
          '', '', '', '', '', 'Total:', 
          totalTaxableAmount.toFixed(2), 
          '', 
          totalIgst.toFixed(2)
        ]);
      } else {
        tableData.push([
          '', '', '', '', '', 'Total:', 
          totalTaxableAmount.toFixed(2), 
          '', 
          totalSgst.toFixed(2), 
          '', 
          totalCgst.toFixed(2)
        ]);
      }
      
      let columnStyles: any;
      
      if (invoice.taxType === 'igst') {
        columnStyles = {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 75 },
          2: { halign: 'center', cellWidth: 17 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'right', cellWidth: 17 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'right', cellWidth: 17 }
        };
      } else {
        columnStyles = {
          0: { halign: 'center', cellWidth: 7 },
          1: { halign: 'left', cellWidth: 55 },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 9 },
          4: { halign: 'center', cellWidth: 9 },
          5: { halign: 'right', cellWidth: 17 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'right', cellWidth: 15 },
          9: { halign: 'center', cellWidth: 12 },
          10: { halign: 'right', cellWidth: 15 }
        };
      }
      
      (pdf as any).autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 9,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [70, 130, 180],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles,
        didParseCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        theme: 'grid'
      });
      
      const finalY = (pdf as any).lastAutoTable.finalY + 5;
      
      const totalsBoxWidth = 65;
      const totalsBoxX = pageWidth - margin - totalsBoxWidth;
      let totalsY = finalY;
      
      const totalsBoxHeight = invoice.taxType === 'igst' ? 20 : 25;
      
      pdf.setLineWidth(0.2);
      pdf.rect(totalsBoxX, totalsY, totalsBoxWidth, totalsBoxHeight);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      let lineY = totalsY + 5;
      const labelX = totalsBoxX + 3;
      const valueX = totalsBoxX + totalsBoxWidth - 3;

      pdf.text('Total Taxable Amount:', labelX, lineY);
      pdf.text(`${totalTaxableAmount.toFixed(2)}/-`, valueX, lineY, { align: 'right' });
      lineY += 4;
      
      if (invoice.taxType === 'igst') {
        pdf.text('Total IGST:', labelX, lineY);
        pdf.text(`${totalIgst.toFixed(2)}/-`, valueX, lineY, { align: 'right' });
        lineY += 4;
      } else {
        pdf.text('Total SGST:', labelX, lineY);
        pdf.text(`${totalSgst.toFixed(2)}/-`, valueX, lineY, { align: 'right' });
        lineY += 4;
        
        pdf.text('Total CGST:', labelX, lineY);
        pdf.text(`${totalCgst.toFixed(2)}/-`, valueX, lineY, { align: 'right' });
        lineY += 4;
      }
      
      const grandTotalY = lineY;
      const grandTotalHeight = 6;
      pdf.setFillColor(70, 130, 180);
      pdf.rect(totalsBoxX, grandTotalY - 1, totalsBoxWidth, grandTotalHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Grand Total:', labelX, grandTotalY + 3);
      pdf.text(`${invoice.grandTotal.toFixed(2)}/-`, valueX, grandTotalY + 3, { align: 'right' });
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      
      const amountWordsY = totalsY + totalsBoxHeight + 5;
      const amountWordsLabel = "Amount in Words:   ";
      const amountWordsValue = invoice.totalInWords;

      const fullText = `${amountWordsLabel}${amountWordsValue}`;
      const amountWordsLines = pdf.splitTextToSize(fullText, contentWidth - 6);

      const amountWordsBoxHeight = Math.max(6, amountWordsLines.length * 4 + 4);

      pdf.setLineWidth(0.2);
      pdf.rect(margin, amountWordsY, contentWidth, amountWordsBoxHeight);

      pdf.setFontSize(10);

      let wordsY = amountWordsY + 5;

      amountWordsLines.forEach((line: string, index: number) => {
        if (wordsY < amountWordsY + amountWordsBoxHeight - 2) {
          if (index === 0 && line.includes(amountWordsLabel)) {
            const labelWidth = pdf.getTextWidth(amountWordsLabel);
            const labelX = margin + 3;
            const valueX = labelX + labelWidth;

            pdf.setFont('helvetica', 'bold');
            pdf.text(amountWordsLabel, labelX, wordsY);

            pdf.setFont('helvetica', 'normal');
            pdf.text(line.substring(amountWordsLabel.length).trim(), valueX, wordsY);
          } else {
            pdf.setFont('helvetica', 'normal');
            pdf.text(line, margin + 3, wordsY);
          }

          wordsY += 4;
        }
      });
      
      const bottomY = amountWordsY + amountWordsBoxHeight + 5;
      
      const bankDetails = [
        { label: "Bank Name:", value: defaultInfo?.bankName || 'SBI' },
        { label: "A/C No:", value: defaultInfo?.accountNo || '30373757750' },
        { label: "IFSC Code:", value: defaultInfo?.ifscCode || 'SBIN0015580' },
        { label: "Branch:", value: defaultInfo?.branch || 'ASILMETTA' }
      ];
      
      const terms = defaultInfo?.terms || [
        'Goods once sold cannot be taken back.',
        'Interest @24% per annum will be charged on overdue accounts.',
        'Any dispute arising out of this transaction will be subject to Visakhapatnam jurisdiction.'
      ];
      
      const bankBoxHeight = bankDetails.length * 4 + 10;
      const termsBoxHeight = terms.length * 4 + 10;
      const maxBoxHeight = Math.max(bankBoxHeight, termsBoxHeight, 25);

      const leftBoxBottomWidth = contentWidth * 0.48;
      const rightBoxBottomWidth = contentWidth * 0.48;
      const boxGap = contentWidth * 0.04;
      
      pdf.setLineWidth(0.2);
      pdf.rect(margin, bottomY, leftBoxBottomWidth, maxBoxHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Bank Details', margin + 3, bottomY + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let bankY = bottomY + 11;
      bankDetails.forEach(({ label, value }) => {
        if (bankY < bottomY + maxBoxHeight - 2) {
          const labelX = margin + 3;
          const valueX = labelX + pdf.getTextWidth(label) + 1;

          pdf.setFont('helvetica', 'bold');
          pdf.text(label, labelX, bankY);

          pdf.setFont('helvetica', 'normal');
          pdf.text(value, valueX, bankY);

          bankY += 4;
        }
      });
      
      const rightBoxBottomX = margin + leftBoxBottomWidth + boxGap;
      pdf.rect(rightBoxBottomX, bottomY, rightBoxBottomWidth, maxBoxHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Terms & Conditions', rightBoxBottomX + 3, bottomY + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      let termY = bottomY + 11;
      terms.forEach((term, index) => {
        if (termY < bottomY + maxBoxHeight - 2) {
          const termText = `${index + 1}. ${term}`;
          const termLines = pdf.splitTextToSize(termText, rightBoxBottomWidth - 6);
          termLines.forEach((line: string) => {
            if (termY < bottomY + maxBoxHeight - 2) {
              pdf.text(line, rightBoxBottomX + 3, termY);
              termY += 3;
            }
          });
        }
      });
      
      const fileName = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '-')}.pdf`;
      pdf.save(fileName);
      toast.success('PDF generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };
  
  const handleSaveInvoice = async () => {
    if (!invoice) return;
    
    try {
      if (isTemp) {
        const result = await createInvoice({ ...invoice, items: invoice.items.map((item, index) => ({
          ...item,
          taxableAmount: editedTaxableAmounts[index] || item.taxableAmount
        })) });
        localStorage.removeItem('invoicePreviewData');
        toast.success('Invoice saved successfully');
        navigate(`/invoice-preview/${result._id}`);
      } else {
        await updateInvoice(id as string, { ...invoice, items: invoice.items.map((item, index) => ({
          ...item,
          taxableAmount: editedTaxableAmounts[index] || item.taxableAmount
        })) });
        toast.success('Invoice updated successfully');
      }
    } catch (error) {
      toast.error('Failed to save invoice');
    }
  };
  
  const handleEditInvoice = () => {
    if (isTemp) {
      navigate('/generate-invoice');
    } else {
      navigate(`/generate-invoice?edit=${id}`);
    }
  };
  
  const handleToggleEditTaxableAmount = (index: number) => {
    setEditableTaxableAmounts(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleChangeTaxableAmount = (index: number, value: number) => {
    const newEditedTaxableAmounts = { ...editedTaxableAmounts, [index]: value };
    setEditedTaxableAmounts(newEditedTaxableAmounts);

    const newTotalTaxableAmount = Object.keys(newEditedTaxableAmounts).reduce((sum: number, key) => {
      const idx = parseInt(key);
      return sum + (newEditedTaxableAmounts[idx] || invoice?.items[idx].taxableAmount || 0);
    }, 0);

    setEditedTotalTaxableAmount(newTotalTaxableAmount);

    if (invoice) {
      const newItems = invoice.items.map((item, i) => ({
        ...item,
        taxableAmount: newEditedTaxableAmounts[i] || item.taxableAmount,
        sgstAmount: (newEditedTaxableAmounts[i] || item.taxableAmount) * item.sgstPercentage / 100,
        cgstAmount: (newEditedTaxableAmounts[i] || item.taxableAmount) * item.cgstPercentage / 100,
        igstAmount: (newEditedTaxableAmounts[i] || item.taxableAmount) * item.igstPercentage / 100
      }));
      setInvoice(prev => prev ? { ...prev, items: newItems } : null);
    }
  };

  const handleToggleEditTotalTaxableAmount = () => {
    setEditableTotalTaxableAmount(prev => !prev);
  };

  const handleChangeTotalTaxableAmount = (value: number) => {
    setEditedTotalTaxableAmount(value);

    if (invoice && invoice.items.length > 0) {
      const itemCount = invoice.items.length;
      const baseTaxableAmount = value / itemCount;
      const newEditedTaxableAmounts = { ...editedTaxableAmounts };

      invoice.items.forEach((_, index) => {
        newEditedTaxableAmounts[index] = baseTaxableAmount;
      });

      setEditedTaxableAmounts(newEditedTaxableAmounts);

      const newItems = invoice.items.map((item, index) => ({
        ...item,
        taxableAmount: newEditedTaxableAmounts[index] || item.taxableAmount,
        sgstAmount: (newEditedTaxableAmounts[index] || item.taxableAmount) * item.sgstPercentage / 100,
        cgstAmount: (newEditedTaxableAmounts[index] || item.taxableAmount) * item.cgstPercentage / 100,
        igstAmount: (newEditedTaxableAmounts[index] || item.taxableAmount) * item.igstPercentage / 100
      }));
      setInvoice(prev => prev ? { ...prev, items: newItems } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Invoice Not Found</h2>
        <p className="text-slate-600 mb-4">The requested invoice could not be found.</p>
        <button
          onClick={() => navigate('/invoice-library')}
          className="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-md"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Library
        </button>
      </div>
    );
  }
  
  return (
    <div className="pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800">
            {isTemp ? 'Invoice Preview' : `Invoice #${invoice.invoiceNumber}`}
          </h1>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleEditInvoice}
            className="btn-secondary"
          >
            <Edit className="mr-2 h-5 w-5" /> Edit
          </button>
          
          {isTemp && (
            <button
              onClick={handleSaveInvoice}
              className="btn-success"
            >
              <Save className="mr-2 h-5 w-5" /> Save
            </button>
          )}
          
          <button
            onClick={handleGeneratePDF}
            className="btn-warning"
          >
            <Download className="mr-2 h-5 w-5" /> Download PDF
          </button>
          
          <button
            onClick={handlePrint}
            className="btn-primary"
          >
            <Printer className="mr-2 h-5 w-5" /> Print
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div 
          ref={invoiceRef} 
          className="p-6 bg-white transition-all duration-300"
        >
          <div className="letterhead mb-8 print:hidden">
            <div className="text-center border-b-2 border-blue-900 pb-4">
              <h1 className="text-3xl font-bold text-blue-900 mb-1">
                {letterhead?.companyName || 'Venkateswara Marine Electrical Works'}
              </h1>
              <p className="text-slate-600 mb-1">
                GST No: {letterhead?.gstNo || '37AGIPP2674H2Z0'}
              </p>
              <p className="text-slate-600 mb-1">
                {letterhead?.address || 'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03'}
              </p>
              <p className="text-slate-600 mb-1">
                Workshop: {letterhead?.workshop || 'Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11'}
              </p>
              <div className="flex justify-center space-x-4">
                <p className="text-slate-600">
                  Email: {letterhead?.email || 'vmew10n@gmail.com'}
                </p>
                <p className="text-slate-600">
                  Cell: {letterhead?.cell || '9848523264'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">TAX INVOICE</h2>
              <p className="text-sm">Invoice No: <span className="font-medium">{invoice.invoiceNumber}</span></p>
              <p className="text-sm">Date: <span className="font-medium">{new Date(invoice.date).toLocaleDateString('en-IN')}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm">PAN No: <span className="font-medium">{defaultInfo?.panNo || 'AGIPP2674H'}</span></p>
              <p className="text-sm">MSME No: <span className="font-medium">{defaultInfo?.msmeNo || 'UDYAM-AP-10-000719'}</span></p>
            </div>
          </div>
          
          <div className="mb-6 border border-slate-200 rounded-md p-4">
            <h3 className="font-bold border-b pb-2 mb-2">Buyer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Name:</p>
                <p className="mb-2">{invoice.buyerName}</p>
                
                <p className="text-sm font-medium">Address:</p>
                <p className="mb-2 whitespace-pre-wrap">{invoice.buyerAddress}</p>
                
                <p className="text-sm font-medium">GST No:</p>
                <p className="mb-2">{invoice.buyerGst}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Vessel:</p>
                <p className="mb-2">{invoice.vessel}</p>
                
                <p className="text-sm font-medium">E-way Bill No:</p>
                <p className="mb-2">{invoice.ewayBillNo}</p>
                
                <p className="text-sm font-medium">P.O. No:</p>
                <p className="mb-2">{invoice.poNumber}</p>
                
                <p className="text-sm font-medium">DC No:</p>
                <p>{invoice.dcNumber}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6 overflow-x-auto">
            <table className="min-w-full border border-slate-200">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    S. No.
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Description of Goods
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    HSN/SAC Code
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="py-2 px-3 border-b border-r border-slate-200 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Taxable Amount
                  </th>
                  {invoice.taxType === 'igst' ? (
                    <>
                      <th className="py-2 px-3 border-b border-r border-slate-200 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                        IGST %
                      </th>
                      <th className="py-2 px-3 border-b border-slate-200 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                        IGST Amount
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3 border-b border-r border-slate-200 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                        SGST %
                      </th>
                      <th className="py-2 px-3 border-b border-r border-slate-200 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                        SGST Amount
                      </th>
                      <th className="py-2 px-3 border-b border-r border-slate-200 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                        CGST %
                      </th>
                      <th className="py-2 px-3 border-b border-slate-200 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                        CGST Amount
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-slate-800">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-slate-800">
                      {item.description}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-slate-800">
                      {item.hsnSacCode}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-center text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-center text-slate-800">
                      {item.unit}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-right text-slate-800">
                      ₹{item.rate.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 border-b border-r border-slate-200 relative">
                      {editableTaxableAmounts[index] ? (
                        <input
                          type="number"
                          value={editedTaxableAmounts[index] || item.taxableAmount}
                          onChange={(e) => handleChangeTaxableAmount(index, parseFloat(e.target.value) || 0)}
                          onBlur={() => handleToggleEditTaxableAmount(index)}
                          autoFocus
                          className="w-full text-right pr-6 bg-transparent border-none focus:outline-none"
                        />
                      ) : (
                        <span className="text-sm text-right text-slate-800">
                          ₹{(editedTaxableAmounts[index] || item.taxableAmount).toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleEditTaxableAmount(index)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                    {invoice.taxType === 'igst' ? (
                      <>
                        <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-center text-slate-800">
                          {item.igstPercentage}%
                        </td>
                        <td className="py-2 px-3 border-b border-slate-200 text-sm text-right text-slate-800">
                          ₹{item.igstAmount.toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-center text-slate-800">
                          {item.sgstPercentage}%
                        </td>
                        <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-right text-slate-800">
                          ₹{item.sgstAmount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 border-b border-r border-slate-200 text-sm text-center text-slate-800">
                          {item.cgstPercentage}%
                        </td>
                        <td className="py-2 px-3 border-b border-slate-200 text-sm text-right text-slate-800">
                          ₹{item.cgstAmount.toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100">
                  <td colSpan={6} className="py-2 px-3 border-b border-r border-slate-200 text-right font-medium">
                    Total:
                  </td>
                  <td className="py-2 px-3 border-b border-r border-slate-200 relative">
                    {editableTotalTaxableAmount ? (
                      <input
                        type="number"
                        value={editedTotalTaxableAmount !== null ? editedTotalTaxableAmount : invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.taxableAmount, 0)}
                        onChange={(e) => handleChangeTotalTaxableAmount(parseFloat(e.target.value) || 0)}
                        onBlur={() => handleToggleEditTotalTaxableAmount()}
                        autoFocus
                        className="w-full text-right pr-6 bg-transparent border-none focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-right text-slate-800">
                        ₹{(editedTotalTaxableAmount !== null ? editedTotalTaxableAmount : invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.taxableAmount, 0)).toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={handleToggleEditTotalTaxableAmount}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                  {invoice.taxType === 'igst' ? (
                    <>
                      <td className="py-2 px-3 border-b border-r border-slate-200"></td>
                      <td className="py-2 px-3 border-b border-slate-200 text-right font-medium">
                        ₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.igstAmount, 0).toFixed(2)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3 border-b border-r border-slate-200"></td>
                      <td className="py-2 px-3 border-b border-r border-slate-200 text-right font-medium">
                        ₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.sgstAmount, 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 border-b border-r border-slate-200"></td>
                      <td className="py-2 px-3 border-b border-slate-200 text-right font-medium">
                        ₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.cgstAmount, 0).toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mb-6 flex justify-end">
            <div className="w-80 border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-50 p-3 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="font-medium">Total Taxable Amount:</span>
                  <span>₹{(editedTotalTaxableAmount !== null ? editedTotalTaxableAmount : invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.taxableAmount, 0)).toFixed(2)}</span>
                </div>
              </div>
              <div className="p-3 border-b border-slate-200">
                {invoice.taxType === 'igst' ? (
                  <div className="flex justify-between">
                    <span className="font-medium">Total IGST:</span>
                    <span>₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.igstAmount, 0).toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">Total SGST:</span>
                      <span>₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.sgstAmount, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Total CGST:</span>
                      <span>₹{invoice.items.reduce((sum: number, item: InvoiceItem) => sum + item.cgstAmount, 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="p-3 bg-blue-900 text-white">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold">₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6 p-3 border border-slate-200 rounded-md bg-slate-50">
            <p className="text-sm"><span className="font-medium">Amount in Words:</span> {invoice.totalInWords}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-200 rounded-md p-4">
              <h3 className="font-bold border-b pb-2 mb-2">Bank Details</h3>
              <p className="mb-1"><span className="font-medium">Bank Name:</span> {defaultInfo?.bankName || 'SBI'}</p>
              <p className="mb-1"><span className="font-medium">A/C No:</span> {defaultInfo?.accountNo || '30373757750'}</p>
              <p className="mb-1"><span className="font-medium">IFSC Code:</span> {defaultInfo?.ifscCode || 'SBIN0015580'}</p>
              <p><span className="font-medium">Branch:</span> {defaultInfo?.branch || 'ASILMETTA'}</p>
            </div>
            <div className="border border-slate-200 rounded-md p-4">
              <h3 className="font-bold border-b pb-2 mb-2">Terms & Conditions</h3>
              {defaultInfo?.terms.map((term, index) => (
                <p key={index} className="mb-1 text-sm">{index + 1}. {term}</p>
              )) || (
                <>
                  <p className="mb-1 text-sm">1. Goods once sold cannot be taken back.</p>
                  <p className="mb-1 text-sm">2. Interest @24% per annum will be charged on overdue accounts.</p>
                  <p className="text-sm">3. Any dispute arising out of this transaction will be subject to Visakhapatnam jurisdiction.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;