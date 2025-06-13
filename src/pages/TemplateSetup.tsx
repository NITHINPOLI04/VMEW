import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { useTemplateStore } from '../stores/templateStore';
import { toast } from 'react-hot-toast';

const TemplateSetup: React.FC = () => {
  const { letterhead, defaultInfo, updateLetterhead, updateDefaultInfo } = useTemplateStore();
  
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
    if (letterhead) {
      setLetterheadForm(letterhead);
    }
    
    if (defaultInfo) {
      setDefaultInfoForm(defaultInfo);
    }
  }, [letterhead, defaultInfo]);
  
  const handleLetterheadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLetterheadForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleDefaultInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDefaultInfoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleTermsChange = (index: number, value: string) => {
    const updatedTerms = [...defaultInfoForm.terms];
    updatedTerms[index] = value;
    
    setDefaultInfoForm(prev => ({
      ...prev,
      terms: updatedTerms
    }));
  };
  
  const handleSaveLetterhead = async () => {
    try {
      await updateLetterhead(letterheadForm);
      toast.success('Letterhead saved successfully');
    } catch (error) {
      toast.error('Failed to save letterhead');
    }
  };
  
  const handleSaveDefaultInfo = async () => {
    try {
      await updateDefaultInfo(defaultInfoForm);
      toast.success('Default information saved successfully');
    } catch (error) {
      toast.error('Failed to save default information');
    }
  };
  
  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Template Setup</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Letterhead Design */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Letterhead Design</h2>
            <p className="text-slate-500 text-sm mt-1">
              This information will be displayed on invoice previews (not included in printing)
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={letterheadForm.companyName}
                onChange={handleLetterheadChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="gstNo" className="block text-sm font-medium text-slate-700 mb-1">
                GST No.
              </label>
              <input
                type="text"
                id="gstNo"
                name="gstNo"
                value={letterheadForm.gstNo}
                onChange={handleLetterheadChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={letterheadForm.address}
                onChange={handleLetterheadChange}
                rows={2}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="workshop" className="block text-sm font-medium text-slate-700 mb-1">
                Workshop
              </label>
              <textarea
                id="workshop"
                name="workshop"
                value={letterheadForm.workshop}
                onChange={handleLetterheadChange}
                rows={2}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={letterheadForm.email}
                onChange={handleLetterheadChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="cell" className="block text-sm font-medium text-slate-700 mb-1">
                Cell
              </label>
              <input
                type="text"
                id="cell"
                name="cell"
                value={letterheadForm.cell}
                onChange={handleLetterheadChange}
                className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleSaveLetterhead}
                className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-medium transition-colors duration-200"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Letterhead
              </button>
            </div>
          </div>
          
          {/* Letterhead Preview */}
          <div className="p-6 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Preview</h3>
            <div className="border border-slate-300 rounded-lg p-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-blue-900">{letterheadForm.companyName}</h1>
                <p className="text-sm text-slate-600">GST No: {letterheadForm.gstNo}</p>
                <p className="text-sm text-slate-600">{letterheadForm.address}</p>
                <p className="text-sm text-slate-600">Workshop: {letterheadForm.workshop}</p>
                <div className="flex justify-center space-x-4 pt-2">
                  <p className="text-sm text-slate-600">Email: {letterheadForm.email}</p>
                  <p className="text-sm text-slate-600">Cell: {letterheadForm.cell}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Default Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Default Information</h2>
            <p className="text-slate-500 text-sm mt-1">
              This information will be pre-filled in all invoices
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <h3 className="font-medium text-slate-800">Bank Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={defaultInfoForm.bankName}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="accountNo" className="block text-sm font-medium text-slate-700 mb-1">
                  A/C No.
                </label>
                <input
                  type="text"
                  id="accountNo"
                  name="accountNo"
                  value={defaultInfoForm.accountNo}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="ifscCode" className="block text-sm font-medium text-slate-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  id="ifscCode"
                  name="ifscCode"
                  value={defaultInfoForm.ifscCode}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-slate-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  id="branch"
                  name="branch"
                  value={defaultInfoForm.branch}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <h3 className="font-medium text-slate-800 pt-2">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="panNo" className="block text-sm font-medium text-slate-700 mb-1">
                  PAN No.
                </label>
                <input
                  type="text"
                  id="panNo"
                  name="panNo"
                  value={defaultInfoForm.panNo}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="msmeNo" className="block text-sm font-medium text-slate-700 mb-1">
                  MSME No.
                </label>
                <input
                  type="text"
                  id="msmeNo"
                  name="msmeNo"
                  value={defaultInfoForm.msmeNo}
                  onChange={handleDefaultInfoChange}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <h3 className="font-medium text-slate-800 pt-2">Terms and Conditions</h3>
            
            {defaultInfoForm.terms.map((term, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Term {index + 1}
                </label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => handleTermsChange(index, e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
            
            <div className="pt-4">
              <button
                onClick={handleSaveDefaultInfo}
                className="inline-flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-medium transition-colors duration-200"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Default Information
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSetup;