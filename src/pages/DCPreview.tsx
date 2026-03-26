import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Download, Edit, Check, Loader2 } from 'lucide-react';
import { useDCStore } from '../stores/dcStore';
import { useTemplateStore } from '../stores/templateStore';
import { DeliveryChallan } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import LetterheadPreview from '../engines/previewComponents';
import { DocumentItemsTable, buildDCColumns } from '../engines/tableEngine';
import {
    loadImages,
    PDF_MARGIN,
    PDF_PAGE_WIDTH,
    PDF_PAGE_HEIGHT,
    PDF_CONTENT_WIDTH,
    drawDocTitle,
    drawDocMetaRow,
    drawTwoColumnDetails,
    drawSignatoryBox,
} from '../engines/pdfEngine';

const DCPreview: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchDC } = useDCStore();
    const { defaultInfo, letterhead } = useTemplateStore();
    const [dcData, setDcData] = useState<DeliveryChallan | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTemp, setIsTemp] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (id === 'temp') {
                const tempData = localStorage.getItem('dcPreviewData');
                if (tempData) {
                    setDcData(JSON.parse(tempData));
                    setIsTemp(true);
                } else {
                    toast.error('No preview data found');
                    navigate('/generate-bills?type=dc');
                }
                setLoading(false);
                return;
            }
            if (id) {
                try {
                    const data = await fetchDC(id);
                    setDcData(data);
                } catch (error) {
                    toast.error('Failed to load Delivery Challan');
                    navigate('/generate-bills?type=dc');
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [id, fetchDC, navigate]);

    const handleEditDC = () => {
        if (isTemp) {
            navigate('/generate-bills?type=dc');
        } else {
            navigate(`/generate-bills?type=dc&edit=${id}`);
        }
    };

    const handleDownloadPdf = async () => {
        if (!dcData) return;
        try {
            const [img] = await loadImages(['/logo.png']);

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            pdf.setFont('helvetica', 'normal');
            (pdf as any).setCharSpace(0);

            const margin = PDF_MARGIN;
            const pageWidth = PDF_PAGE_WIDTH;
            const pageHeight = PDF_PAGE_HEIGHT;
            const contentWidth = PDF_CONTENT_WIDTH;

            let headerEndY = 0;

            const drawHeader = (currentY: number): number => {
                let y = drawDocTitle(pdf, pageWidth, letterhead, img, 'DELIVERY CHALLAN', currentY);

                const panValue = defaultInfo?.panNo || 'AGIPP2674H';
                const msmeValue = defaultInfo?.msmeNo || 'UDYAM-AP-10-000719';

                y = drawDocMetaRow(
                    pdf, margin, pageWidth, y,
                    'DC No: ', dcData.dcNumber,
                    new Date(dcData.date).toLocaleDateString('en-GB'),
                    panValue, msmeValue
                );

                const buyerLines: { label: string; value: string; isAddressLine?: boolean }[] = [
                    { label: 'Name:', value: dcData.buyerName },
                    ...dcData.buyerAddress.split('\n').map((line, i) => ({
                        label: i === 0 ? 'Address:' : '', value: line, isAddressLine: i > 0,
                    })),
                    { label: 'GST No:', value: dcData.buyerGst || '' },
                ];

                const rightSideLines = [
                    { label: 'P.O No:', value: dcData.poNumber || '' },
                    { label: 'Vehicle Name:', value: dcData.vehicleName || '' },
                    { label: 'Vehicle No:', value: dcData.vehicleNumber || '' },
                    { label: 'PRQ No:', value: dcData.prqNumber || '' },
                ];

                y = drawTwoColumnDetails(
                    pdf, margin, contentWidth, y,
                    'Buyer Details', buyerLines, rightSideLines, 15, 22
                );

                headerEndY = y;
                return y;
            };

            const yPos = drawHeader(10);

            // DC table: simple 5-column table, no tax
            const tableHeaders = ['Sl No', 'Description of Goods', 'HSN/SAC Code', 'Qty', 'Unit'];
            const tableData = dcData.items.map((item, index) => [
                (index + 1).toString(),
                item.description,
                item.hsnSacCode || '',
                item.quantity.toString(),
                item.unit,
            ]);

            autoTable(pdf, {
                head: [tableHeaders],
                body: tableData,
                startY: yPos,
                margin: { top: headerEndY, left: margin, right: margin, bottom: 20 },
                didDrawPage: (data: any) => {
                    if (data.pageNumber > 1) {
                        drawHeader(10);
                        data.settings.margin.top = headerEndY;
                    }
                },
                tableWidth: 'auto',
                styles: {
                    fontSize: 8,
                    cellPadding: 0.8,
                    overflow: 'linebreak',
                    halign: 'left',
                    lineWidth: 0.1,
                    lineColor: [220, 220, 220],
                },
                headStyles: {
                    fillColor: [69, 130, 181],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.1,
                    lineColor: [220, 220, 220],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'left' },
                    1: { cellWidth: 120, halign: 'left' },
                    2: { cellWidth: 21, halign: 'right' },
                    3: { cellWidth: 12, halign: 'right' },
                    4: { cellWidth: 15, halign: 'right' },
                },
                theme: 'grid',
                didParseCell: (data: any) => {
                    if (data.section === 'head') {
                        if (data.column.index === 3) data.cell.styles.halign = 'right';
                        if (data.column.index === 4) data.cell.styles.halign = 'left';
                    }
                },
            });

            let finalY = (pdf as any).lastAutoTable.finalY + 5;

            // DC-specific footer: Receiver Details + Signatory boxes
            const leftBoxBottomWidth = contentWidth * 0.48;
            const rightBoxBottomWidth = contentWidth * 0.48;
            const boxGap = contentWidth * 0.04;
            const maxBoxHeight = 30;

            if (finalY + maxBoxHeight > pageHeight - 15) {
                pdf.addPage();
                drawHeader(10);
                finalY = headerEndY + 5;
            }

            // Receiver Details box
            pdf.setDrawColor(200, 200, 200);
            pdf.setFillColor(250, 250, 250);
            pdf.roundedRect(margin, finalY, leftBoxBottomWidth, maxBoxHeight, 3, 3, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(30, 64, 175);
            pdf.text('Receiver Details', margin + 4, finalY + 6);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(15, 23, 42);
            pdf.text('Received the goods in good condition', margin + 4, finalY + 11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Signature:', margin + 4, finalY + 22);
            pdf.text('Date:', margin + 4, finalY + 27);

            const signatoryBoxWidth = rightBoxBottomWidth;
            const signatoryBoxHeight = maxBoxHeight;
            const signatoryBoxX = margin + leftBoxBottomWidth + boxGap;
            drawSignatoryBox(
                pdf,
                signatoryBoxX,
                finalY,
                signatoryBoxWidth,
                signatoryBoxHeight,
                letterhead?.companyName || 'Venkateswara Marine Electrical Works'
            );

            // Footer with separator line
            const totalPages = (pdf as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(148, 163, 184);
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.5);
                pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
                pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            const fileName = `DC_${dcData.dcNumber.replace(/[/\\\\]/g, '-')}.pdf`;
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
        if (dcData && !loading) {
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
    }, [dcData, loading, location.search, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    if (!dcData) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-800">Delivery Challan Not Found</h2>
                <button onClick={() => navigate('/generate-bills?type=dc')} className="mt-4 px-4 py-2 bg-blue-900 text-white rounded">Back</button>
            </div>
        );
    }

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
                        {dcData.dcNumber}
                    </div>
                </div>

                {/* Center Section */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                    <span className="px-3.5 py-1.5 bg-amber-50/80 text-amber-700 border border-amber-100/80 rounded-xl text-xs font-semibold tracking-wide">
                        Delivery Challan
                    </span>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleEditDC}
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
                <div id="dc-preview-container" className="p-6 bg-white transition-all duration-300">

                    <LetterheadPreview letterhead={letterhead} />

                    <div className="flex justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">DELIVERY CHALLAN</h2>
                            <p className="text-sm"><span className="font-semibold">DC No:</span> <span className="font-medium">{dcData.dcNumber}</span></p>
                            <p className="text-sm"><span className="font-semibold">Date:</span> <span className="font-medium">{new Date(dcData.date).toLocaleDateString('en-IN')}</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm"><span className="font-semibold">PAN No:</span> <span className="font-medium">{defaultInfo?.panNo || 'AGIPP2674H'}</span></p>
                            <p className="text-sm"><span className="font-semibold">MSME No:</span> <span className="font-medium">{defaultInfo?.msmeNo || 'UDYAM-AP-10-000719'}</span></p>
                        </div>
                    </div>

                    <div className="mb-6 border border-slate-200 rounded-md p-4">
                        <h3 className="font-bold border-b pb-2 mb-2">Buyer Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold">Name:</p>
                                <p className="mb-2">{dcData.buyerName}</p>

                                <p className="text-sm font-semibold">Address:</p>
                                <p className="mb-2 whitespace-pre-wrap">{dcData.buyerAddress}</p>

                                <p className="text-sm font-semibold">GST No:</p>
                                <p className="mb-2">{dcData.buyerGst}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Vehicle Name:</p>
                                <p className="mb-2">{dcData.vehicleName || 'N/A'}</p>

                                <p className="text-sm font-semibold">Vehicle No:</p>
                                <p className="mb-2">{dcData.vehicleNumber || 'N/A'}</p>

                                <p className="text-sm font-semibold">P.O. No:</p>
                                <p className="mb-2">{dcData.poNumber || 'N/A'}</p>

                                <p className="text-sm font-semibold">PRQ No:</p>
                                <p className="mb-2">{dcData.prqNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <DocumentItemsTable
                        items={dcData.items}
                        columns={buildDCColumns()}
                    />




            <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                    <h3 className="font-bold border-b pb-2 mb-2">Declaration</h3>
                    <p className="text-sm">We declare that this Delivery Challan shows the actual price of the goods described and that all particulars are true and correct.</p>
                </div>
            </div>

            <div className="flex justify-between items-end mt-16 pt-8 border-t border-slate-200">
                <div className="text-center w-48">
                    <div className="border-b border-slate-400 h-10 mb-2"></div>
                    <p className="font-medium text-sm">Receiver's Signature</p>
                </div>
                <div className="text-center w-64">
                    <p className="font-bold mb-10">For {letterhead?.companyName || 'Venkateswara Marine Electrical Works'}</p>
                    <p className="font-medium text-sm">Authorized Signatory</p>
                </div>
            </div>
        </div>
            </div >
        </div >
    );
};

export default DCPreview;
