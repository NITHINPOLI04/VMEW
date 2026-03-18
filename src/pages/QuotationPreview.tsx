import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Download, Edit, Check, Loader2 } from 'lucide-react';
import { useQuotationStore } from '../stores/quotationStore';
import { useTemplateStore } from '../stores/templateStore';
import { Quotation } from '../types';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';
import LetterheadPreview from '../engines/previewComponents';
import {
    loadImages,
    PDF_MARGIN,
    PDF_PAGE_WIDTH,
    PDF_PAGE_HEIGHT,
    PDF_CONTENT_WIDTH,
    drawDocTitle,
    drawDocMetaRow,
    drawTwoColumnDetails,
    drawItemsTable,
    drawTotalsBox,
    drawAmountInWords,
    calcBankTermsHeight,
    drawBankAndTerms,
    drawPageNumbers,
    buildBankDetails,
} from '../engines/pdfEngine';
import { calculateDiscountedTaxes } from '../utils/taxCalculator';
import { DocumentItemsTable, buildInvoiceColumns } from '../engines/tableEngine';

const QuotationPreview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchQuotation } = useQuotationStore();
    const { defaultInfo, letterhead } = useTemplateStore();
    const [quotationData, setQuotationData] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTemp, setIsTemp] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (id === 'temp') {
                const tempData = localStorage.getItem('quotationPreviewData');
                if (tempData) {
                    setQuotationData(JSON.parse(tempData));
                    setIsTemp(true);
                } else {
                    toast.error('No preview data found');
                    navigate('/generate-bills?type=quotation');
                }
                setLoading(false);
                return;
            }
            if (id) {
                try {
                    const data = await fetchQuotation(id);
                    setQuotationData(data);
                } catch (error) {
                    toast.error('Failed to load Quotation');
                    navigate('/generate-bills?type=quotation');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [id, fetchQuotation, navigate]);

    const handleEditQuotation = () => {
        if (isTemp) {
            navigate('/generate-bills?type=quotation');
        } else {
            navigate(`/generate-bills?type=quotation&edit=${id}`);
        }
    };

    const handleDownloadPdf = async () => {
        if (!quotationData) return;
        try {
            const [img, qrImg] = await loadImages(['/logo.png', '/Payment_QR.png']);

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.setFont('helvetica');

            const margin = PDF_MARGIN;
            const pageWidth = PDF_PAGE_WIDTH;
            const pageHeight = PDF_PAGE_HEIGHT;
            const contentWidth = PDF_CONTENT_WIDTH;

            let headerEndY = 0;

            const drawHeader = (currentY: number): number => {
                let y = drawDocTitle(pdf, pageWidth, letterhead, img, 'QUOTATION', currentY);

                const panValue = defaultInfo?.panNo || 'AGIPP2674H';
                const msmeValue = defaultInfo?.msmeNo || 'UDYAM-AP-10-000719';

                y = drawDocMetaRow(
                    pdf, margin, pageWidth, y,
                    'Quotation No: ', quotationData.quotationNumber,
                    new Date(quotationData.date).toLocaleDateString('en-GB'),
                    panValue, msmeValue
                );

                const buyerLines: { label: string; value: string; isAddressLine?: boolean }[] = [
                    { label: 'Name:', value: quotationData.buyerName },
                    ...quotationData.buyerAddress.split('\n').map((line, i) => ({
                        label: i === 0 ? 'Address:' : '', value: line, isAddressLine: i > 0,
                    })),
                    { label: 'GST No:', value: quotationData.buyerGst || '' },
                ];

                const rightSideLines: { label: string; value: string }[] = [];
                if (quotationData.refNumber) rightSideLines.push({ label: 'Ref No:', value: quotationData.refNumber });
                if (quotationData.enqNumber) rightSideLines.push({ label: 'Enq No:', value: quotationData.enqNumber });

                y = drawTwoColumnDetails(
                    pdf, margin, contentWidth, y,
                    'Buyer Details', buyerLines, rightSideLines, 15, 15
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
            } = calculateDiscountedTaxes(quotationData.items, quotationData.discountEnabled || false, quotationData.discountPercentage || 0);

            const tableHeaders = quotationData.taxType === 'igst'
                ? ['Sl No', 'Description of Goods', 'HSN/SAC Code', 'Qty', 'Unit', 'Rate', 'Taxable Amount', 'IGST %', 'IGST Amt']
                : ['Sl No', 'Description of Goods', 'HSN/SAC Code', 'Qty', 'Unit', 'Rate', 'Taxable Amount', 'SGST %', 'SGST Amt', 'CGST %', 'CGST Amt'];

            const tableData = discountedItems.map((item, index) => {
                const row = [
                    (index + 1).toString(),
                    item.description,
                    item.hsnSacCode || '',
                    item.quantity.toString(),
                    item.unit,
                    item.rate.toFixed(2),
                    item.taxableAmount.toFixed(2),
                ];

                if (quotationData.taxType === 'igst') {
                    row.push(`${item.igstPercentage}%`, (item.igstAmount || 0).toFixed(2));
                } else {
                    row.push(`${item.sgstPercentage}%`, (item.sgstAmount || 0).toFixed(2), `${item.cgstPercentage}%`, (item.cgstAmount || 0).toFixed(2));
                }
                return row;
            });

            if (quotationData.taxType === 'igst') {
                tableData.push(['', '', '', '', '', 'Total:', subTotal.toFixed(2), '', totalIgst.toFixed(2)]);
            } else {
                tableData.push(['', '', '', '', '', 'Total:', subTotal.toFixed(2), '', totalSgst.toFixed(2), '', totalCgst.toFixed(2)]);
            }

            let columnStyles: any;
            if (quotationData.taxType === 'igst') {
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

            drawItemsTable(pdf, tableHeaders, tableData, columnStyles, yPos, margin, headerEndY, drawHeader);

            let finalY = (pdf as any).lastAutoTable.finalY + 5;

            // Build quotation terms
            const quotationTerms: string[] = [];
            if (quotationData.deliveryTerms) quotationTerms.push(`Delivery : ${quotationData.deliveryTerms}`);
            if (quotationData.paymentTerms) quotationTerms.push(`Payment : ${quotationData.paymentTerms}`);
            if (quotationData.guarantee) quotationTerms.push(`Guarantee : ${quotationData.guarantee}`);
            if (quotationData.validity) quotationTerms.push(`Validity : ${quotationData.validity}`);

            const bankDetails = buildBankDetails(defaultInfo);
            const totalsBoxHeight = (quotationData.taxType === 'igst' ? 23 : 28) + (quotationData.discountEnabled ? 5 : 0);
            const amountWordsLines = pdf.splitTextToSize(
                `Amount in Words: ${quotationData.totalInWords || ''}`, contentWidth
            );
            const amountWordsHeight = amountWordsLines.length * 5 + 15;
            const maxBoxHeight = calcBankTermsHeight(pdf, bankDetails, quotationTerms, contentWidth);
            const totalFooterHeight = totalsBoxHeight + amountWordsHeight + maxBoxHeight + 5;

            if (finalY + totalFooterHeight > pageHeight - 15) {
                pdf.addPage();
                drawHeader(10);
                finalY = headerEndY + 5;
            }

            const totalsEndY = drawTotalsBox(
                pdf, pageWidth, finalY,
                quotationData.taxType, subTotal, totalSgst, totalCgst, totalIgst,
                quotationData.grandTotal,
                quotationData.discountEnabled, quotationData.discountPercentage, discountAmount
            );

            const bottomY = drawAmountInWords(
                pdf, margin, pageWidth, contentWidth, totalsEndY, quotationData.totalInWords || ''
            );

            drawBankAndTerms(pdf, margin, contentWidth, bottomY, maxBoxHeight, bankDetails, quotationTerms, qrImg);

            drawPageNumbers(pdf, pageWidth, pageHeight, margin);

            const fileName = `Q_${quotationData.quotationNumber.replace(/[/\\\\]/g, '-')}.pdf`;
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
        if (quotationData && !loading) {
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
    }, [quotationData, loading, location.search, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    if (!quotationData) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Quotation Not Found</h2>
                <p className="text-slate-600 mb-4">The requested quotation could not be found.</p>
                <button
                    onClick={() => navigate('/generate-bills?type=quotation')}
                    className="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-md"
                >
                    <ChevronLeft className="mr-2 h-5 w-5" /> Back to Quotation Generation
                </button>
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
    } = calculateDiscountedTaxes(quotationData.items, quotationData.discountEnabled || false, quotationData.discountPercentage || 0);

    const terms: string[] = [];
    if (quotationData.deliveryTerms) terms.push(`Delivery : ${quotationData.deliveryTerms}`);
    if (quotationData.paymentTerms) terms.push(`Payment : ${quotationData.paymentTerms}`);
    if (quotationData.guarantee) terms.push(`Guarantee : ${quotationData.guarantee}`);
    if (quotationData.validity) terms.push(`Validity : ${quotationData.validity}`);

    return (
        <div className="pb-12 max-w-7xl mx-auto">
            {/* ── Modern SaaS Toolbar ── */}
            <div className="relative flex items-center justify-between mb-8 bg-white p-3 rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                {/* Left Section */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/generate-bills?type=quotation')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                        title="Go Back"
                        aria-label="Go Back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-5 py-2 bg-slate-50 border border-slate-200 rounded-full text-slate-800 font-bold text-[15px] tracking-wide">
                        {quotationData.quotationNumber}
                    </div>
                </div>

                {/* Center Section */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                    <span className="px-3.5 py-1.5 bg-emerald-50/80 text-emerald-700 border border-emerald-100/80 rounded-xl text-xs font-semibold tracking-wide">
                        Quotation
                    </span>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleEditQuotation}
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
                        aria-label="Download PDF"
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

            <div className="bg-white rounded-lg shadow" id="quotation-preview-container">
                <div className="p-6 bg-white transition-all duration-300">
                    <LetterheadPreview letterhead={letterhead} />

                    <div className="flex justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">QUOTATION</h2>
                            <p className="text-sm">Quotation No: <span className="font-medium">{quotationData.quotationNumber}</span></p>
                            <p className="text-sm">Date: <span className="font-medium">{new Date(quotationData.date).toLocaleDateString('en-IN')}</span></p>
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
                                <p className="mb-2">{quotationData.buyerName}</p>
                                <p className="text-sm font-medium">Address:</p>
                                <p className="mb-2 whitespace-pre-wrap">{quotationData.buyerAddress}</p>
                                <p className="text-sm font-medium">GST No:</p>
                                <p className="mb-2">{quotationData.buyerGst || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Ref No:</p>
                                <p className="mb-2">{quotationData.refNumber || 'N/A'}</p>
                                <p className="text-sm font-medium">Enq No:</p>
                                <p className="mb-2">{quotationData.enqNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <DocumentItemsTable
                        items={discountedItems}
                        columns={buildInvoiceColumns(quotationData.taxType)}
                        taxType={quotationData.taxType}
                    />




                    <div className="mb-6 flex justify-end">
                        <div className="w-80 border border-slate-200 rounded-md overflow-hidden">
                            <div className="bg-slate-50 p-3 border-b border-slate-200">
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-700">Subtotal:</span>
                                    <span>₹{subTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            {quotationData.discountEnabled && (
                                <div className="p-3 border-b border-slate-200 bg-red-50 text-red-700">
                                    <div className="flex justify-between">
                                        <span className="font-medium">Discount ({quotationData.discountPercentage || 0}%):</span>
                                        <span>-₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="p-3 border-b border-slate-200 text-slate-700">
                                {quotationData.taxType === 'igst' ? (
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
                                    <span className="font-bold">₹{quotationData.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 p-3 border border-slate-200 rounded-md bg-slate-50">
                        <p className="text-sm"><span className="font-medium text-slate-700">Amount in Words:</span> {quotationData.totalInWords}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="flex border border-slate-200 rounded-md p-4 bg-slate-50 items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">Bank Details</h4>
                                <div className="grid grid-cols-1 gap-1 text-sm">
                                    <p><span className="font-medium">Bank Name:</span> {defaultInfo?.bankName || 'SBI'}</p>
                                    <p><span className="font-medium">A/C No:</span> {defaultInfo?.accountNo || '30379757750'}</p>
                                    <p><span className="font-medium">IFSC Code:</span> {defaultInfo?.ifscCode || 'SBIN0015580'}</p>
                                    <p><span className="font-medium">Branch:</span> {defaultInfo?.branch || 'ASILMETTA'}</p>
                                </div>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex items-center justify-center">
                                <img
                                    src="/Payment_QR.png"
                                    alt="Payment QR"
                                    className="w-20 h-20 object-contain mix-blend-multiply"
                                />
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                            <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">Terms &amp; Conditions</h4>
                            {terms.length > 0 ? (
                                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                                    {terms.map((term: string, index: number) => (
                                        <li key={index}>{term}</li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No terms specified</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-end mt-12 pt-8 border-t border-slate-200">
                        <div></div>
                        <div className="text-right">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationPreview;
