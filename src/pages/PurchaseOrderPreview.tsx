import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Edit, Check, Loader2 } from 'lucide-react';
import { usePOStore } from '../stores/poStore';
import { useTemplateStore } from '../stores/templateStore';
import jsPDF from 'jspdf';
import { PurchaseOrder } from '../types';
import { calculateDiscountedTaxes } from '../utils/taxCalculator';
import { toast } from 'react-hot-toast';
import LetterheadPreview from '../engines/previewComponents';
import { DocumentItemsTable, buildPOColumns } from '../engines/tableEngine';
import {
    loadImages,
    PDF_MARGIN,
    PDF_PAGE_WIDTH,
    PDF_PAGE_HEIGHT,
    drawDocTitle,
    drawDocMetaRow,
    drawTwoColumnDetails,
    drawItemsTable,
    drawTotalsBox,
    drawAmountInWords,
    drawPageNumbers,
} from '../engines/pdfEngine';

const PurchaseOrderPreview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { fetchPO: fetchPurchaseOrder } = usePOStore();
    const { letterhead, defaultInfo } = useTemplateStore();
    const [poData, setPoData] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTemp, setIsTemp] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (id === 'temp') {
                const tempData = localStorage.getItem('poPreviewData');
                if (tempData) {
                    setPoData(JSON.parse(tempData));
                    setIsTemp(true);
                } else {
                    toast.error('No preview data found');
                    navigate('/purchase-order');
                }
                setLoading(false);
                return;
            }
            if (id) {
                try {
                    const data = await fetchPurchaseOrder(id);
                    setPoData(data);
                } catch (error) {
                    toast.error('Failed to load Purchase Order');
                    navigate('/purchase-order');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [id, fetchPurchaseOrder, navigate]);

    const handleEditPO = () => {
        if (isTemp) {
            navigate('/purchase-order');
        } else {
            navigate(`/purchase-order/new?edit=${id}`);
        }
    };

    const handleDownloadPdf = async () => {
        if (!poData) return;
        try {
            const [img] = await loadImages(['/logo.png']);

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.setFont('helvetica');

            const isCompact = poData.items.length <= 10;
            const margin = isCompact ? 10 : PDF_MARGIN;
            const spacing = isCompact ? 3 : 5;
            const pageWidth = PDF_PAGE_WIDTH;
            const pageHeight = PDF_PAGE_HEIGHT;
            const contentWidth = pageWidth - margin * 2;

            let headerEndY = 0;

            const drawHeader = (currentY: number): number => {
                let y = drawDocTitle(pdf, pageWidth, letterhead, img, 'PURCHASE ORDER', currentY);

                const panValue = defaultInfo?.panNo || 'AGIPP2674H';
                const msmeValue = defaultInfo?.msmeNo || 'UDYAM-AP-10-000719';

                y = drawDocMetaRow(
                    pdf, margin, pageWidth, y,
                    'PO No: ', poData.poNumber,
                    new Date(poData.date).toLocaleDateString('en-GB'),
                    panValue, msmeValue
                );

                const supplierLines: { label: string; value: string; isAddressLine?: boolean }[] = [
                    { label: 'Name:', value: poData.supplierName },
                    ...poData.supplierAddress.split('\n').map((line, i) => ({
                        label: i === 0 ? 'Address:' : '', value: line, isAddressLine: i > 0,
                    })),
                    { label: 'GST No:', value: poData.supplierGst || '' },
                ];

                const rightSideLines: { label: string; value: string; wrap?: boolean }[] = [];
                if (poData.subject) rightSideLines.push({ label: 'Subject:', value: poData.subject, wrap: true });
                if (poData.reference) rightSideLines.push({ label: 'Ref:', value: poData.reference });

                y = drawTwoColumnDetails(
                    pdf, margin, contentWidth, y,
                    'To (Supplier Details)', supplierLines, rightSideLines, 15, 18
                );

                headerEndY = y;
                return y;
            };

            const yPos = drawHeader(10);

            const {
                subTotal,
                totalSgst,
                totalCgst,
                totalIgst,
                discountAmount,
                discountedItems
            } = calculateDiscountedTaxes(poData.items, poData.discountEnabled || false, poData.discountPercentage || 0, poData.taxType);

            const baseHeaders = ['Sl No', 'Description', 'HSN/SAC Code', 'Quantity', 'Unit', 'Rate', 'Taxable Amt'];
            const usedHeaders = poData.taxType === 'igst'
                ? [...baseHeaders, 'IGST %', 'IGST Amt']
                : [...baseHeaders, 'SGST %', 'SGST Amt', 'CGST %', 'CGST Amt'];

            let tableData: string[][];
            if (poData.taxType === 'igst') {
                tableData = discountedItems.map((item, index) => [
                    (index + 1).toString(), item.description, item.hsnSacCode || '',
                    item.quantity.toString(), item.unit,
                    item.rate.toFixed(2), (item.taxableAmount || 0).toFixed(2),
                    `${item.igstPercentage || 0}%`, (item.igstAmount || 0).toFixed(2),
                ]);
                tableData.push(['', '', '', '', '', 'Total:', subTotal.toFixed(2), '', totalIgst.toFixed(2)]);
            } else {
                tableData = discountedItems.map((item, index) => [
                    (index + 1).toString(), item.description, item.hsnSacCode || '',
                    item.quantity.toString(), item.unit,
                    item.rate.toFixed(2), (item.taxableAmount || 0).toFixed(2),
                    `${item.sgstPercentage || 0}%`, (item.sgstAmount || 0).toFixed(2),
                    `${item.cgstPercentage || 0}%`, (item.cgstAmount || 0).toFixed(2),
                ]);
                tableData.push(['', '', '', '', '', 'Total:', subTotal.toFixed(2), '', totalSgst.toFixed(2), '', totalCgst.toFixed(2)]);
            }

            // Column dimensions matched to Invoice PDF table
            let columnStyles: any;
            if (poData.taxType === 'igst') {
                columnStyles = {
                    0: { cellWidth: 9, halign: 'left' }, 1: { cellWidth: 84, halign: 'left' }, 2: { cellWidth: 16, halign: 'right' },
                    3: { cellWidth: 9, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' },
                    5: { cellWidth: 17, halign: 'right' }, 6: { cellWidth: 19, halign: 'right' },
                    7: { cellWidth: 9, halign: 'right' }, 8: { cellWidth: 15, halign: 'right' },
                };
            } else {
                columnStyles = {
                    0: { cellWidth: 9, halign: 'left' }, 1: { cellWidth: 49, halign: 'left' }, 2: { cellWidth: 16, halign: 'right' },
                    3: { cellWidth: 9, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' },
                    5: { cellWidth: 17, halign: 'right' }, 6: { cellWidth: 19, halign: 'right' },
                    7: { cellWidth: 10, halign: 'right' }, 8: { cellWidth: 16, halign: 'right' },
                    9: { cellWidth: 10, halign: 'right' }, 10: { cellWidth: 16, halign: 'right' },
                };
            }

            drawItemsTable(pdf, usedHeaders, tableData, columnStyles, yPos, margin, headerEndY, drawHeader, { cellPadding: isCompact ? 0.5 : 0.8 });

            let finalY = (pdf as any).lastAutoTable.finalY + spacing;

            const totalsBoxHeight = (poData.taxType === 'igst' ? 23 : 28) + (poData.discountEnabled ? 5 : 0);
            const amountWordsLines = pdf.splitTextToSize(
                `Amount in Words: ${poData.totalInWords || ''}`, contentWidth
            );
            const amountWordsHeight = amountWordsLines.length * 5 + 15;
            const notesHeight = poData.notes ? 15 : 0;
            const totalFooterHeight = totalsBoxHeight + amountWordsHeight + notesHeight;

            if (finalY + totalFooterHeight > pageHeight - 15) {
                pdf.addPage();
                drawHeader(10);
                finalY = headerEndY + 5;
            }

            const totalsEndY = drawTotalsBox(
                pdf, pageWidth, finalY,
                poData.taxType, subTotal, totalSgst, totalCgst, totalIgst,
                poData.grandTotal,
                poData.discountEnabled, poData.discountPercentage, discountAmount
            );

            const wordsEndY = drawAmountInWords(
                pdf, margin, pageWidth, contentWidth, totalsEndY, poData.totalInWords || ''
            );

            // PO-specific: Notes section
            let notesEndY = wordsEndY;
            if (poData.notes) {
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.2);
                pdf.line(margin, notesEndY, pageWidth - margin, notesEndY);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.setTextColor(30, 64, 175);
                pdf.text('Notes:', margin, notesEndY + 6);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(15, 23, 42);
                const noteLines = pdf.splitTextToSize(poData.notes, contentWidth);
                let noteY = notesEndY + 12;
                noteLines.forEach((line: string) => {
                    pdf.text(line, margin, noteY);
                    noteY += 5;
                });
                notesEndY = noteY + 3;
            }

            drawPageNumbers(pdf, pageWidth, pageHeight, margin);

            const fileName = `PO_${poData.poNumber.replace(/[/\\\\]/g, '-')}.pdf`;
            pdf.save(fileName);
            toast.success('PDF generated successfully!');

        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF. Please try again.');
        }
    };

    const executeDownload = async () => {
        setIsDownloading(true);
        await handleDownloadPdf();
        setIsDownloading(false);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
    };

    useEffect(() => {
        if (poData && !loading) {
            const searchParams = new URLSearchParams(location.search);
            if (searchParams.get('action') === 'download') {
                const timer = setTimeout(() => {
                    executeDownload();
                    navigate(location.pathname, { replace: true });
                }, 500);
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poData, loading, location.search, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    if (!poData) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-800">Purchase Order Not Found</h2>
                <button onClick={() => navigate('/purchase-order')} className="mt-4 px-4 py-2 bg-blue-900 text-white rounded">Back</button>
            </div>
        );
    }

    const {
        subTotal,
        totalSgst,
        totalCgst,
        totalIgst,
        discountAmount,
        discountedItems
    } = calculateDiscountedTaxes(poData.items, poData.discountEnabled || false, poData.discountPercentage || 0, poData.taxType);

    return (
        <div className="pb-12 max-w-7xl mx-auto">
            {/* ── Modern SaaS Toolbar ── */}
            <div className="relative flex items-center justify-between mb-8 bg-white p-3 rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                {/* Left Section */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                        title="Go Back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-5 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-800 font-bold text-[15px] tracking-wide">
                        {poData.poNumber}
                    </div>
                </div>

                {/* Center Section */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                    <span className="px-3.5 py-1.5 bg-teal-50/80 text-teal-700 border border-teal-100/80 rounded-xl text-xs font-semibold tracking-wide">
                        Purchase Order
                    </span>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleEditPO}
                        className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300 transition-colors shadow-sm"
                        title="Edit"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={executeDownload} 
                        className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all duration-300 ${
                            downloadSuccess 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' 
                                : isDownloading 
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        title="Download PDF"
                    >
                        {downloadSuccess ? (
                            <Check className="w-4 h-4" />
                        ) : isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div id="po-preview-container" className="p-6 bg-white transition-all duration-300">
                    <LetterheadPreview letterhead={letterhead} />

                    <div className="flex justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">PURCHASE ORDER</h2>
                            <p className="text-sm"><span className="font-semibold">PO No:</span> <span className="font-medium">{poData.poNumber}</span></p>
                            <p className="text-sm"><span className="font-semibold">Date:</span> <span className="font-medium">{new Date(poData.date).toLocaleDateString('en-IN')}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm"><span className="font-semibold">PAN No:</span> <span className="font-medium">{defaultInfo?.panNo || 'AGIPP2674H'}</span></p>
                            <p className="text-sm"><span className="font-semibold">MSME No:</span> <span className="font-medium">{defaultInfo?.msmeNo || 'UDYAM-AP-10-000719'}</span></p>
                        </div>
                    </div>

                    <div className="mb-6 border border-slate-200 rounded-md p-4">
                        <h3 className="font-bold border-b pb-2 mb-2">Supplier Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold">Name:</p>
                                <p className="mb-2">{poData.supplierName}</p>

                                <p className="text-sm font-semibold">Address:</p>
                                <p className="mb-2 whitespace-pre-wrap">{poData.supplierAddress}</p>

                                <p className="text-sm font-semibold">GST No:</p>
                                <p className="mb-2">{poData.supplierGst || 'N/A'}</p>
                            </div>
                            <div>
                                {poData.subject && (
                                    <>
                                        <p className="text-sm font-semibold">Subject:</p>
                                        <p className="mb-2">{poData.subject}</p>
                                    </>
                                )}
                                {poData.reference && (
                                    <>
                                        <p className="text-sm font-semibold">Reference:</p>
                                        <p className="mb-2">{poData.reference}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <DocumentItemsTable
                        items={discountedItems}
                        columns={buildPOColumns(poData.taxType)}
                        taxType={poData.taxType}
                    />





                    <div className="mb-6 flex justify-end">
                        <div className="w-80 border border-slate-200 rounded-md overflow-hidden">
                            <div className="bg-slate-50 p-3 border-b border-slate-200">
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-700">Subtotal:</span>
                                    <span>₹{subTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            {poData.discountEnabled && (
                                <div className="p-3 border-b border-slate-200 bg-red-50 text-red-700">
                                    <div className="flex justify-between">
                                        <span className="font-medium">Discount ({poData.discountPercentage || 0}%):</span>
                                        <span>-₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="p-3 border-b border-slate-200 text-slate-700">
                                {poData.taxType === 'igst' ? (
                                    <div className="flex justify-between">
                                        <span className="font-medium">Total IGST:</span>
                                        <span>₹{totalIgst.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium">Total SGST:</span>
                                            <span>₹{totalSgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">Total CGST:</span>
                                            <span>₹{totalCgst.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="p-3">
                                <div className="flex justify-between text-lg">
                                    <span className="font-bold">Grand Total:</span>
                                    <span className="font-bold">₹{poData.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 p-3 border border-slate-200 rounded-md bg-slate-50">
                        <p className="text-sm"><span className="font-medium">Amount in Words:</span> {poData.totalInWords}</p>
                    </div>

                    {poData.notes && (
                        <div className="mb-6 p-4 border border-slate-200 rounded-md bg-slate-50">
                            <h3 className="font-bold border-b pb-2 mb-2">Notes</h3>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{poData.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderPreview;
