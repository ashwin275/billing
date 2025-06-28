import React from 'react';
import { Invoice } from '@/types/api';

interface InvoiceTemplateProps {
  invoice: Invoice;
  isPreview?: boolean;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, isPreview = false }) => {
  const calculateSubtotal = () => {
    return invoice.saleItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  };

  const calculateTotalTax = () => {
    return invoice.saleItems?.reduce((sum, item) => {
      const cgstAmount = (item.price * item.quantity * (item.product?.cgst || 0)) / 100;
      const sgstAmount = (item.price * item.quantity * (item.product?.sgst || 0)) / 100;
      return sum + cgstAmount + sgstAmount;
    }, 0) || 0;
  };

  const calculateTotalCGST = () => {
    return invoice.saleItems?.reduce((sum, item) => {
      const cgstAmount = (item.price * item.quantity * (item.product?.cgst || 0)) / 100;
      return sum + cgstAmount;
    }, 0) || 0;
  };

  const calculateTotalSGST = () => {
    return invoice.saleItems?.reduce((sum, item) => {
      const sgstAmount = (item.price * item.quantity * (item.product?.sgst || 0)) / 100;
      return sum + sgstAmount;
    }, 0) || 0;
  };

  const calculateTotalItemDiscounts = () => {
    return invoice.saleItems?.reduce((sum, item) => sum + (item.discount || 0), 0) || 0;
  };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const totalCGST = calculateTotalCGST();
  const totalSGST = calculateTotalSGST();
  const totalItemDiscounts = calculateTotalItemDiscounts();
  const grandTotal = invoice.totalAmount || 0;
  const balance = grandTotal - (invoice.amountPaid || 0);

  return (
    <div className={`invoice-template ${isPreview ? 'preview-mode' : 'print-mode'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .invoice-template {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          color: #000;
          line-height: 1.6;
        }

        .print-mode {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          box-shadow: none;
          color: #000000 !important;
          font-weight: 600 !important;
        }
        
        .print-mode * {
          color: #000000 !important;
          font-weight: 600 !important;
        }

        .preview-mode {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .invoice-header {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: #000000;
          padding: 50px 40px;
          position: relative;
          overflow: hidden;
          min-height: 140px;
        }

        .invoice-header::after {
          content: '';
          position: absolute;
          bottom: -30px;
          left: 0;
          width: 100%;
          height: 60px;
          background: white;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }

        .header-content {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .company-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .company-logo {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .company-details h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 5px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .print-mode .company-details h1 {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 38px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 2px !important;
          text-transform: uppercase !important;
          border: 4px solid #000000 !important;
          padding: 12px 18px !important;
          background: #ffffff !important;
          text-shadow: none !important;
        }

        .company-tagline {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
        }

        .invoice-meta {
          text-align: right;
        }

        .invoice-meta h2 {
          font-size: 36px;
          font-weight: 300;
          letter-spacing: 2px;
          margin: 0 0 10px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .print-mode .invoice-meta h2 {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 46px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 3px !important;
          border: 5px solid #000000 !important;
          padding: 16px 22px !important;
          background: #ffffff !important;
          text-transform: uppercase !important;
          text-shadow: none !important;
        }

        .invoice-number {
          font-size: 16px;
          font-weight: 600;
          margin: 5px 0;
        }

        .invoice-date {
          font-size: 14px;
          opacity: 0.9;
          margin: 5px 0;
        }

        .invoice-body {
          padding: 50px 40px 20px;
        }

        .billing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 40px;
        }

        .billing-block h3 {
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .print-mode .billing-block h3 {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 20px !important;
          border-bottom: 3px solid #000000 !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
          padding: 8px 0 !important;
        }

        .billing-block p {
          color: #4a5568;
          margin: 5px 0;
          font-size: 14px;
        }
        
        .print-mode .billing-block p {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 16px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
        }

        .customer-name {
          font-weight: 600;
          font-size: 16px;
          color: #2d3748;
        }
        
        .print-mode .customer-name {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 18px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          table-layout: fixed;
        }
        
        .items-table th:nth-child(1) { width: 30%; } /* Product */
        .items-table th:nth-child(2) { width: 10%; } /* HSN */
        .items-table th:nth-child(3) { width: 8%; }  /* Qty */
        .items-table th:nth-child(4) { width: 12%; } /* Rate */
        .items-table th:nth-child(5) { width: 12%; } /* Discount */
        .items-table th:nth-child(6) { width: 9%; }  /* CGST */
        .items-table th:nth-child(7) { width: 9%; }  /* SGST */
        .items-table th:nth-child(8) { width: 10%; } /* Total */

        .items-table thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .items-table th {
          color: white;
          font-weight: 800;
          padding: 15px 12px;
          text-align: left;
          font-size: 14px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .print-mode .items-table th {
          background: #000000 !important;
          color: #ffffff !important;
          font-weight: 900 !important;
          border: 4px solid #000000 !important;
          font-size: 18px !important;
          text-shadow: 2px 2px 4px #000000 !important;
          padding: 20px 15px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 1px !important;
        }

        .items-table th.text-right {
          text-align: right;
        }

        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #4a5568;
          font-size: 13px;
        }
        
        .print-mode .items-table td {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 16px !important;
          border: 3px solid #000000 !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          padding: 16px 14px !important;
        }

        .items-table td.text-right {
          text-align: right;
        }

        .items-table tbody tr:last-child td {
          border-bottom: none;
        }

        .product-name {
          font-weight: 600;
          color: #2d3748;
        }
        
        .print-mode .product-name {
          color: #000000 !important;
          font-weight: 800 !important;
          font-size: 15px !important;
        }

        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }

        .totals-table {
          min-width: 300px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #4a5568;
          font-size: 14px;
        }
        
        .print-mode .total-row {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 18px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          padding: 12px 0 !important;
          border-bottom: 2px solid #000000 !important;
        }

        .total-row.grand-total {
          border-top: 2px solid #e2e8f0;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
        }
        
        .print-mode .total-row.grand-total {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 24px !important;
          border: 5px solid #000000 !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
          padding: 18px 15px !important;
          background: #ffffff !important;
          margin: 15px 0 !important;
        }

        .total-row.balance {
          font-weight: 600;
          font-size: 16px;
        }

        .balance.positive {
          color: #e53e3e;
        }

        .balance.negative {
          color: #38a169;
        }

        .bottom-section {
          margin-top: 30px;
        }

        .terms-section {
          background: #f7fafc;
          padding: 25px;
          border-radius: 8px;
        }

        .terms-section h3 {
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        
        .print-mode .terms-section h3 {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 20px !important;
          font-family: 'Arial Black', Arial, sans-serif !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
          border-bottom: 3px solid #000000 !important;
          padding-bottom: 10px !important;
        }

        .terms-section p {
          color: #4a5568;
          font-size: 13px;
          margin: 8px 0;
          line-height: 1.5;
        }
        
        .print-mode .terms-section p {
          color: #000000 !important;
          font-weight: 800 !important;
          font-size: 15px !important;
          font-family: 'Arial', sans-serif !important;
        }

        .remarks-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }

        .remarks-section strong {
          color: #2d3748;
        }



        @media print {
          .invoice-template {
            margin: 0;
            box-shadow: none;
            border: none;
          }
          
          .preview-mode {
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
        }

        @page {
          margin: 0;
          size: A4;
        }
      `}} />

      {/* Header */}
      <div className="invoice-header">
        <div className="header-content">
          <div className="company-info">
            <div className="company-logo">
              {invoice.shop?.name?.charAt(0) || 'S'}
            </div>
            <div className="company-details">
              <h1>{invoice.shop?.name || 'Shop Name'}</h1>
              <p className="company-tagline">Quality Products & Services</p>
              {invoice.shop?.gstNo && <p style={{fontSize: '10px', marginTop: '3px'}}>GST: {invoice.shop.gstNo}</p>}
              {invoice.shop?.phone && <p style={{fontSize: '10px', marginTop: '2px'}}>📞 {invoice.shop.phone}</p>}
            </div>
          </div>
          <div className="invoice-meta">
            <h2>INVOICE</h2>
            {invoice.invoiceNo && (
              <div className="invoice-number">#{invoice.invoiceNo}</div>
            )}
            <div className="invoice-date">
              {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="invoice-body">
        {/* Billing Information */}
        <div className="billing-section">
          <div className="billing-block">
            <h3>Bill To</h3>
            <div className="customer-name">
              {invoice.customerName || 'Walk-in Customer'}
            </div>
            <p>Phone: {invoice.shop?.owner?.phone || 'N/A'}</p>
            <p>Location: {invoice.shop?.place || 'Shop Location'}</p>
          </div>
          <div className="billing-block">
            <h3>Payment Details</h3>
            <p><strong>Status:</strong> {invoice.paymentStatus}</p>
            <p><strong>Mode:</strong> {invoice.paymentMode}</p>
            {invoice.dueDate && (
              <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
            )}
            {invoice.transactionId && (
              <p><strong>Transaction ID:</strong> {invoice.transactionId}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'center' }}>HSN</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Discount</th>
              <th className="text-right">CGST</th>
              <th className="text-right">SGST</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.saleItems && invoice.saleItems.length > 0 ? (
              invoice.saleItems.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="product-name">{item.product?.name || 'Product'}</div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      {item.product?.description || ''}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.product?.hsn || 'N/A'}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">₹{item.price?.toFixed(2) || '0.00'}</td>
                  <td className="text-right">₹{item.discount?.toFixed(2) || '0.00'}</td>
                  <td className="text-right">₹{((item.price * item.quantity * (item.product?.cgst || 0)) / 100).toFixed(2)}</td>
                  <td className="text-right">₹{((item.price * item.quantity * (item.product?.sgst || 0)) / 100).toFixed(2)}</td>
                  <td className="text-right">₹{item.total?.toFixed(2) || '0.00'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals-section">
          <div className="totals-table">
            <div className="total-row">
              <span>Sub Total:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Total discount:</span>
              <span>- ₹{totalItemDiscounts.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Round off:</span>
              <span>- ₹{(invoice.discount || 0).toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>CGST:</span>
              <span>₹{totalCGST.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>SGST:</span>
              <span>₹{totalSGST.toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total Amount:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Amount Paid:</span>
              <span>₹{(invoice.amountPaid || 0).toFixed(2)}</span>
            </div>
            <div className={`total-row balance ${balance > 0 ? 'positive' : 'negative'}`}>
              <span>Balance:</span>
              <span>₹{balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bottom-section">
          <div className="terms-section">
            <h3>Terms & Conditions</h3>
            <p>1. Payment is due within 30 days of invoice date.</p>
            <p>2. Late payments may incur additional charges.</p>
            <p>3. Goods once sold cannot be returned without prior approval.</p>
            <p>4. Any disputes must be resolved within 7 days of delivery.</p>
            
            {invoice.remark && (
              <div className="remarks-section">
                <strong>Remarks:</strong><br />
                {invoice.remark}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;