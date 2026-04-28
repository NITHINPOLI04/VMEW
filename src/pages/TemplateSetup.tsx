import React, { useState, useEffect, useRef } from 'react';
import { Building2, FileText, Save, Download, Loader2, FileCheck, File as FileIcon } from 'lucide-react';
import { useTemplateStore } from '../stores/templateStore';
import { generateLetterheadPDF, generateLetterheadPDFBlob } from '../engines/generateLetterheadPDF';
import { generateLetterheadDOCX } from '../engines/generateLetterheadDOCX';
import { toast } from 'react-hot-toast';

const TemplateSetup: React.FC = () => {
  const { letterhead, defaultInfo, updateLetterhead, updateDefaultInfo } = useTemplateStore();
  const hasInitialized = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);

  const [letterheadForm, setLetterheadForm] = useState({
    companyName: 'Venkateswara Marine Electrical Works',
    gstNo: '37AGIPP2674H2Z0',
    address: 'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03',
    workshop: 'Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11',
    email: 'vmew10n@gmail.com',
    cell: '9848523264'
  });

  const [defaultInfoForm, setDefaultInfoForm] = useState({
    bankName: 'SBI',
    accountNo: '30373757750',
    ifscCode: 'SBIN0015580',
    branch: 'ASILMETTA',
    panNo: 'AGIPP2674H',
    msmeNo: 'UDYAM-AP-10-000719',
    terms: [
      'Goods once sold cannot be taken back.',
      'Interest @24% per annum will be charged on over due accounts.',
      'Any dispute arising out of this transaction will be subject to Visakhapatnam jurisdiction.'
    ]
  });

  useEffect(() => {
    if ((letterhead || defaultInfo) && !hasInitialized.current) {
      if (letterhead) setLetterheadForm(letterhead);
      if (defaultInfo) setDefaultInfoForm(defaultInfo);
      hasInitialized.current = true;
    }
  }, [letterhead, defaultInfo]);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const generatePreview = async () => {
      try {
        const url = await generateLetterheadPDFBlob(letterheadForm);
        if (isMounted) {
          setPdfPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to generate PDF preview', err);
      }
    };

    const timeoutId = setTimeout(generatePreview, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [letterheadForm]);

  useEffect(() => {
    return () => {
      setPdfPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLetterheadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name: prefixedName, value } = e.target;
    const name = prefixedName.replace('field_v_', '');
    setLetterheadForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDefaultInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name: prefixedName, value } = e.target;
    const name = prefixedName.replace('field_v_', '');
    setDefaultInfoForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTermsChange = (index: number, value: string) => {
    const updatedTerms = [...defaultInfoForm.terms];
    updatedTerms[index] = value;
    setDefaultInfoForm(prev => ({ ...prev, terms: updatedTerms }));
  };

  const handleSaveLetterhead = async () => {
    try {
      await updateLetterhead(letterheadForm);
      toast.success('Letterhead saved successfully');
    } catch {
      toast.error('Failed to save letterhead');
    }
  };

  const handleSaveDefaultInfo = async () => {
    try {
      await updateDefaultInfo(defaultInfoForm);
      toast.success('Default information saved successfully');
    } catch {
      toast.error('Failed to save default information');
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadLetterhead = async () => {
    try {
      setDownloading(true);
      setDownloadMenuOpen(false);
      await generateLetterheadPDF(letterheadForm);
      toast.success('Letterhead PDF downloaded');
    } catch {
      toast.error('Failed to generate letterhead PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      setDownloadingWord(true);
      setDownloadMenuOpen(false);
      await generateLetterheadDOCX(letterheadForm);
      toast.success('Letterhead Word doc downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate letterhead Word document');
    } finally {
      setDownloadingWord(false);
    }
  };

  const sectionClass = 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300';
  const sectionHeaderClass = 'px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50';
  const getIconBoxClass = (colorClass: string) => `w-8 h-8 rounded-lg flex items-center justify-center border ${colorClass}`;
  const sectionBodyClass = 'p-5';
  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400';
  const labelClass = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5';

  return (
    <div className="space-y-4 pb-12 bg-slate-50/80 min-h-[calc(100vh-theme(spacing.16))]">
      {/* ── Page Header Matches GenerateBills but with right aligned toolbar ── */}
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Template Settings</h1>
        </div>
      </div>

      {/* ── Main Workspace: Layout matching GenerateBills ── */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Left Column: Form Sections (60%) ── */}
          <div className="w-full lg:w-[60%] space-y-6">

            {/* Section 1: Company Identity */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div className="flex items-center gap-3">
                  <div className={getIconBoxClass('bg-blue-100/50 text-blue-600 border-blue-200/50')}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Company Identity</h2>
                </div>
                <button
                  onClick={handleSaveLetterhead}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[8px] text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
              <div className={sectionBodyClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                    <label htmlFor="companyName" className={labelClass}>Company Name</label>
                    <input type="text" id="companyName" name="field_v_companyName" value={letterheadForm.companyName} onChange={handleLetterheadChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="gstNo" className={labelClass}>GSTIN</label>
                    <input type="text" id="gstNo" name="field_v_gstNo" value={letterheadForm.gstNo} onChange={handleLetterheadChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="panNo" className={labelClass}>PAN Number</label>
                    <input type="text" id="panNo" name="field_v_panNo" value={defaultInfoForm.panNo} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="msmeNo" className={labelClass}>MSME Number</label>
                    <input type="text" id="msmeNo" name="field_v_msmeNo" value={defaultInfoForm.msmeNo} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div className="flex items-center gap-3">
                  <div className={getIconBoxClass('bg-emerald-100/50 text-emerald-600 border-emerald-200/50')}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Contact Information</h2>
                </div>
                <button
                  onClick={handleSaveLetterhead}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[8px] text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
              <div className={sectionBodyClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label htmlFor="email" className={labelClass}>Email Address</label>
                    <input type="email" id="email" name="field_v_email" value={letterheadForm.email} onChange={handleLetterheadChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="cell" className={labelClass}>Phone Number</label>
                    <input type="tel" id="cell" name="field_v_cell" value={letterheadForm.cell} onChange={handleLetterheadChange} autoComplete="off" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Locations */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div className="flex items-center gap-3">
                  <div className={getIconBoxClass('bg-teal-100/50 text-teal-600 border-teal-200/50')}>
                    <svg xmlns="http://www.w3.org/0000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Addresses</h2>
                </div>
                <button
                  onClick={handleSaveLetterhead}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[8px] text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
              <div className={sectionBodyClass}>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="address" className={labelClass}>Registered Office Address</label>
                    <textarea id="address" name="field_v_address" value={letterheadForm.address} onChange={handleLetterheadChange} rows={3} autoComplete="off" className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label htmlFor="workshop" className={labelClass}>Workshop / Operational Address</label>
                    <textarea id="workshop" name="field_v_workshop" value={letterheadForm.workshop} onChange={handleLetterheadChange} rows={3} autoComplete="off" className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Bank Details */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div className="flex items-center gap-3">
                  <div className={getIconBoxClass('bg-amber-100/50 text-amber-600 border-amber-200/50')}>
                    <svg xmlns="http://www.w3.org/0000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Bank Details</h2>
                </div>
                <button
                  onClick={handleSaveDefaultInfo}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[8px] text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
              <div className={sectionBodyClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label htmlFor="bankName" className={labelClass}>Bank Name</label>
                    <input type="text" id="bankName" name="field_v_bankName" value={defaultInfoForm.bankName} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="branch" className={labelClass}>Branch</label>
                    <input type="text" id="branch" name="field_v_branch" value={defaultInfoForm.branch} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="accountNo" className={labelClass}>Account Number</label>
                    <input type="text" id="accountNo" name="field_v_accountNo" value={defaultInfoForm.accountNo} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="ifscCode" className={labelClass}>IFSC Code</label>
                    <input type="text" id="ifscCode" name="field_v_ifscCode" value={defaultInfoForm.ifscCode} onChange={handleDefaultInfoChange} autoComplete="off" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Terms & Conditions */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <div className="flex items-center gap-3">
                  <div className={getIconBoxClass('bg-rose-100/50 text-rose-600 border-rose-200/50')}>
                    <svg xmlns="http://www.w3.org/0000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 12l2 2-2-2-2-2Z" /><path d="m14 16-2 2-2-2" /></svg>
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Terms & Conditions</h2>
                </div>
                <button
                  onClick={handleSaveDefaultInfo}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-[8px] text-[12px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
              <div className={sectionBodyClass}>
                <div className="grid grid-cols-1 gap-4">
                  {defaultInfoForm.terms.map((term, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[12px] font-bold mt-0.5 border border-slate-200">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <label htmlFor={`term_${index}`} className="sr-only">Term {index + 1}</label>
                        <input
                          id={`term_${index}`}
                          type="text"
                          value={term}
                          autoComplete="off"
                          name={`field_v_term_${index}`}
                          onChange={(e) => handleTermsChange(index, e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ── Right Column: Floating Live Preview Panel (40%) ── */}
          <div className="w-full lg:w-[40%] lg:sticky lg:top-24 h-[calc(100vh-96px-32px)]">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-700 overflow-hidden flex flex-col h-full">
                <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-lg font-bold">Live Output</h3>
                    <p className="text-slate-400 text-xs mt-1">Snapshot of your letterhead</p>
                  </div>
                  {/* Download Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                      disabled={downloading || downloadingWord}
                      className="flex items-center justify-center w-10 h-10 bg-slate-800 border border-slate-700 text-slate-200 rounded-full hover:bg-slate-700 hover:border-slate-600 transition-all shadow-sm"
                      title="Download Options"
                    >
                      {downloading || downloadingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>

                    {downloadMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden transform origin-top-right transition-all">
                        <div className="py-1">
                          <button
                            onClick={handleDownloadLetterhead}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          >
                            <FileIcon className="w-4 h-4" />
                            <div className="flex flex-col text-left">
                              <span className="font-semibold">Download PDF</span>
                              <span className="text-[10px] text-slate-500">Standard format</span>
                            </div>
                          </button>
                          <div className="h-px bg-slate-100 mx-3"></div>
                          <button
                            onClick={handleDownloadWord}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <div className="flex flex-col text-left">
                              <span className="font-semibold">Download Word</span>
                              <span className="text-[10px] text-slate-500">Editable format</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actual PDF Output */}
                <div className="bg-slate-50 flex-grow relative min-h-0">
                  {pdfPreviewUrl ? (
                    <iframe
                      src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="absolute inset-0 w-full h-full border-0"
                      title="Letterhead Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3 h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                      <span className="text-sm font-medium">Rendering PDF...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

export default TemplateSetup;