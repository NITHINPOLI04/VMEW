import React from 'react';
import { Letterhead } from '../types';

interface LetterheadPreviewProps {
  letterhead: Letterhead | null | undefined;
}

/**
 * Shared HTML letterhead block rendered identically across all document preview pages.
 * Replaces the duplicated ~20-line JSX block in InvoicePreview, QuotationPreview,
 * DCPreview, and PurchaseOrderPreview.
 */
const LetterheadPreview: React.FC<LetterheadPreviewProps> = ({ letterhead }) => (
  <div className="letterhead mb-8 print:hidden">
    <div className="text-center border-b-2 border-blue-900 pb-4">
      <h1 className="text-3xl font-bold text-blue-900 mb-1">
        {letterhead?.companyName || 'Venkateswara Marine Electrical Works'}
      </h1>
      <p className="text-slate-600 mb-1">
        GST No: {letterhead?.gstNo || '37AGIPP2674H2Z0'}
      </p>
      <p className="text-slate-600 mb-1">
        {letterhead?.address ||
          'D.No.9-23-3/6, CBM Compound, Flat No. 203, Kamal Enclaves, Visakhapatnam - 03'}
      </p>
      <p className="text-slate-600 mb-1">
        Workshop:{' '}
        {letterhead?.workshop ||
          'Plot No.2E, Industrial Cluster, Pudi, Rambilli (M), Visakhapatnam - 11'}
      </p>
      <div className="flex justify-center space-x-4">
        <p className="text-slate-600">Email: {letterhead?.email || 'vmew10n@gmail.com'}</p>
        <p className="text-slate-600">Cell: {letterhead?.cell || '9848523264'}</p>
      </div>
    </div>
  </div>
);

export default LetterheadPreview;
