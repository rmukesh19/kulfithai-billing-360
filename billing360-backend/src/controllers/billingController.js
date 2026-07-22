import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Ledger } from '../models/Ledger.js';
import { Branch } from '../models/Branch.js';
import { auditLog } from '../middleware/logger.js';
import { v4 as uuidv4 } from 'uuid';

// 1. Create invoice with GST calculations, Auto numbering, and Stock deduction
export const createInvoice = async (req, res) => {
  const {
    customerId,
    items,          // Array of { productId, quantity, price, cgstPercent, sgstPercent, igstPercent }
    paymentMode,    // 'cash' | 'card' | 'upi' | 'credit'
    paidAmount,
    billingDate
  } = req.body;

  const branchId = req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Checkout error: Invoice items are required.'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // A. Generate Unique Invoice Number (INV-YYYY-BRANCH-0001 format)
    const year = new Date(billingDate || new Date()).getFullYear();
    const count = await Invoice.countDocuments({ 
      branch_id: branchId, 
      billing_date: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) } 
    }).session(session);
    const sequence = String(count + 1).padStart(5, '0');
    const invoiceNumber = `INV-${year}-${branchId.substring(0, 4).toUpperCase()}-${sequence}`;

    // B. Calculate Totals, GST values, and deduct stock quantities
    let invoiceSubtotal = 0;
    let invoiceCgst = 0;
    let invoiceSgst = 0;
    let invoiceIgst = 0;
    let invoiceTotal = 0;

    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, branch_id: branchId }).session(session);

      if (!product) {
        throw new Error(`Product with ID ${item.productId} was not found on this branch.`);
      }

      // Verify stock availability
      if (Number(product.stock_qty) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for product: ${product.name}. Remaining: ${product.stock_qty}, Checked out: ${item.quantity}`);
      }

      const itemSubtotal = Number(item.price) * Number(item.quantity);
      const isCgst = Number(item.cgstPercent || 0) > 0 ? (itemSubtotal * (Number(item.cgstPercent) / 100)) : 0;
      const isSgst = Number(item.sgstPercent || 0) > 0 ? (itemSubtotal * (Number(item.sgstPercent) / 100)) : 0;
      const isIgst = Number(item.igstPercent || 0) > 0 ? (itemSubtotal * (Number(item.igstPercent) / 100)) : 0;
      const itemTotal = itemSubtotal + isCgst + isSgst + isIgst;

      invoiceSubtotal += itemSubtotal;
      invoiceCgst += isCgst;
      invoiceSgst += isSgst;
      invoiceIgst += isIgst;
      invoiceTotal += itemTotal;

      validatedItems.push({
        product_id: item.productId,
        sku: product.sku,
        name: product.name,
        hsn_code: product.hsn_code,
        price: item.price,
        quantity: item.quantity,
        cgst_percent: item.cgstPercent || 0,
        sgst_percent: item.sgstPercent || 0,
        igst_percent: item.igstPercent || 0,
        cgst_amount: isCgst,
        sgst_amount: isSgst,
        igst_amount: isIgst,
        total_amount: itemTotal
      });

      // Update Stock count
      product.stock_qty -= Number(item.quantity);
      await product.save({ session });

      // Create Stock transaction
      const stockTx = new StockTransaction({
        branch_id: branchId,
        product_id: item.productId,
        type: 'sale_deduction',
        quantity: Number(item.quantity),
        ref_id: invoiceNumber,
        notes: `POS sales check-out`
      });
      await stockTx.save({ session });
    }

    // Determine due & status
    const actualPaid = paymentMode === 'credit' ? 0 : Number(paidAmount || invoiceTotal);
    const dueAmount = invoiceTotal - actualPaid;
    const paymentStatus = dueAmount <= 0 ? 'paid' : 'pending';

    // C. Insert Invoice Document
    const newInvoice = new Invoice({
      branch_id: branchId,
      user_id: userId,
      customer_id: customerId || null,
      invoice_number: invoiceNumber,
      subtotal: invoiceSubtotal,
      discount_amount: 0,
      cgst_amount: invoiceCgst,
      sgst_amount: invoiceSgst,
      igst_amount: invoiceIgst,
      total_amount: invoiceTotal,
      paid_amount: actualPaid,
      due_amount: dueAmount,
      payment_mode: paymentMode || 'upi',
      status: paymentStatus,
      billing_date: billingDate || new Date(),
      items: validatedItems
    });
    
    await newInvoice.save({ session });
    const invoiceId = newInvoice._id;

    // E. Double-Entry ledger posting
    if (customerId) {
      const ledgerDebit = new Ledger({
        branch_id: branchId,
        party_id: customerId,
        party_type: 'customer',
        ref_id: invoiceId,
        ref_type: 'invoice',
        debit: invoiceTotal,
        credit: 0,
        narration: `Debit entry against invoice: ${invoiceNumber}`,
        entry_date: billingDate || new Date()
      });
      await ledgerDebit.save({ session });

      if (actualPaid > 0) {
        const ledgerCredit = new Ledger({
          branch_id: branchId,
          party_id: customerId,
          party_type: 'customer',
          ref_id: invoiceId,
          ref_type: 'receipt_voucher',
          debit: 0,
          credit: actualPaid,
          narration: `Part-payment credit against invoice: ${invoiceNumber}`,
          entry_date: billingDate || new Date()
        });
        await ledgerCredit.save({ session });
      }

      // Update customer due & balances
      const customer = await Customer.findById(customerId).session(session);
      if (customer) {
        customer.current_balance += (invoiceTotal - actualPaid);
        customer.due_amount += dueAmount;
        await customer.save({ session });
      }
    }

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();
    
    await auditLog(branchId, userId, 'INVOICE_CREATED', 'invoices', `Invoice ${invoiceNumber} created. Total: ₹${invoiceTotal}`, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully in database.',
      invoiceId,
      invoiceNumber,
      totalAmount: invoiceTotal,
      dueAmount,
      status: paymentStatus
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Billing Controller Create Error]', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Database Transaction aborted.'
    });
  }
};

// 2. Fetch Invoices list with search, pagination, and filters
export const getInvoices = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const search = req.query.search || '';
  const status = req.query.status || '';
  
  const skip = (page - 1) * limit;

  try {
    let query = { branch_id: branchId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      const customers = await Customer.find({ name: { $regex: search, $options: 'i' } }, '_id');
      const customerIds = customers.map(c => c._id);
      
      query.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { customer_id: { $in: customerIds } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('customer_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    // Reformat for the frontend (customer_name)
    const formattedInvoices = invoices.map(i => ({
      ...i,
      customer_name: i.customer_id ? i.customer_id.name : null
    }));

    const total = await Invoice.countDocuments(query);

    return res.json({
      success: true,
      data: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Generate HTML/PDF Invoice representation
export const generatePdfInvoice = async (req, res) => {
  const { id } = req.params;
  const branchId = req.user?.branch_id || 'b360-branch-head';

  try {
    const invoice = await Invoice.findOne({ _id: id, branch_id: branchId })
      .populate('branch_id')
      .populate('customer_id')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const items = invoice.items || [];

    // Format billing as HTML (easily converted to PDF streams in printing environments)
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #336; padding-bottom: 20px; }
            .details { margin-top: 20px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { margin-top: 30px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${invoice.branch_id?.name || 'Branch'}</h2>
              <p>${invoice.branch_id?.address || ''}</p>
              <p>GSTIN: ${invoice.branch_id?.gstin || 'N/A'}</p>
            </div>
            <div style="text-align: right;">
              <h2>TAX INVOICE</h2>
              <p><b>Invoice No:</b> ${invoice.invoice_number}</p>
              <p><b>Date:</b> ${new Date(invoice.billing_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="details">
            <div>
              <h4>Billed To:</h4>
              <p><b>${invoice.customer_id?.name || 'Walkin Customer'}</b></p>
              <p>${invoice.customer_id?.phone || ''}</p>
              <p>GSTIN: ${invoice.customer_id?.gstin || 'N/A'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>HSN</th>
                <th>Price (₹)</th>
                <th>Qty</th>
                <th>GST %</th>
                <th>GST Amt</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.hsn_code}</td>
                  <td>${item.price}</td>
                  <td>${item.quantity}</td>
                  <td>${Number(item.cgst_percent) + Number(item.sgst_percent)}%</td>
                  <td>₹${(Number(item.cgst_amount) + Number(item.sgst_amount)).toFixed(2)}</td>
                  <td>₹${Number(item.total_amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: ₹${Number(invoice.subtotal).toFixed(2)}</p>
            <p>CGST: ₹${Number(invoice.cgst_amount).toFixed(2)}</p>
            <p>SGST: ₹${Number(invoice.sgst_amount).toFixed(2)}</p>
            <h4>Grand Total: ₹${Number(invoice.total_amount).toFixed(2)}</h4>
            <p style="font-size: 11px; margin-top: 50px; text-align: center;">Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
