export const getInitialInvoice = (defaultInfo: any = null) => ({
    invoiceNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    buyerPan: defaultInfo?.panNo || '',
    buyerMsme: defaultInfo?.msmeNo || '',
    ewayBillNo: '',
    vessel: '',
    poNumber: '',
    dcNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    grandTotal: 0,
    totalInWords: '',
    paymentStatus: 'Unpaid'
});

export const getInitialDC = () => ({
    dcNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    poNumber: '',
    prqNumber: '',
    vehicleName: '',
    vehicleNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos'
    }]
});

export const getInitialQuotation = () => ({
    quotationNumber: '',
    date: new Date().toISOString(),
    buyerName: '',
    buyerAddress: '',
    buyerGst: '',
    refNumber: '',
    enqNumber: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        hsnSacCode: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    deliveryTerms: '',
    paymentTerms: '',
    guarantee: '',
    validity: '',
    grandTotal: 0,
    totalInWords: ''
});

export const getInitialPO = () => ({
    poNumber: '',
    date: new Date().toISOString(),
    supplierName: '',
    supplierAddress: '',
    supplierGst: '',
    subject: '',
    reference: '',
    items: [{
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        taxableAmount: 0,
        sgstPercentage: 9,
        sgstAmount: 0,
        cgstPercentage: 9,
        cgstAmount: 0,
        igstPercentage: 18,
        igstAmount: 0
    }],
    taxType: 'sgstcgst',
    grandTotal: 0,
    totalInWords: '',
    notes: 'With reference to the above subject we have pleasure in placing our confirmatory order to supply of the below in accordance with the terms given in the quotation.'
});
