import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { Ledger } from '../models/Ledger.js';
import { auditLog } from '../middleware/logger.js';
import { v4 as uuidv4 } from 'uuid';

// We'll use a simple in-memory collection name for purchases stored in Ledger ref
// Since no separate Purchase model exists, create one dynamically using existing infrastructure

let purchaseStore = [];

// Use a simple JSON-based approach with Ledger for purchases
// Better: Create a Purchase document in MongoDB using a dynamic collection

const getPurchaseModel = () => {
  if (mongoose.models.Purchase) return mongoose.models.Purchase;
  const schema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    branch_id: { type: String, required: true },
    supplier_id: { type: String },
    supplier_name: { type: String },
    purchase_number: { type: String },
    items: [{ type: mongoose.Schema.Types.Mixed }],
    subtotal: { type: Number, default: 0 },
    cgst_amount: { type: Number, default: 0 },
    sgst_amount: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    due_amount: { type: Number, default: 0 },
    payment_mode: { type: String, default: 'cash' },
    status: { type: String, enum: ['paid', 'pending', 'partial'], default: 'paid' },
    order_status: { type: String, default: 'received' },
    purchase_date: { type: Date, default: Date.now },
    notes: { type: String }
  }, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
  return mongoose.model('Purchase', schema);
};

export const createPurchase = async (req, res) => {
  const Purchase = getPurchaseModel();
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { supplierId, supplierName, items, paymentMode, paidAmount, purchaseDate, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Purchase items are required.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const year = new Date().getFullYear();
    const count = await Purchase.countDocuments({ branch_id: branchId });
    const purchaseNumber = `PUR-${year}-${String(count + 1).padStart(5, '0')}`;

    let subtotal = 0, cgst = 0, sgst = 0;
    const validatedItems = [];

    for (const item of items) {
      const itemSubtotal = Number(item.price || item.purchasePrice || 0) * Number(item.quantity || 1);
      const itemCgst = itemSubtotal * ((Number(item.cgstPercent || item.cgst_percent || 0)) / 100);
      const itemSgst = itemSubtotal * ((Number(item.sgstPercent || item.sgst_percent || 0)) / 100);
      subtotal += itemSubtotal;
      cgst += itemCgst;
      sgst += itemSgst;
      validatedItems.push({ ...item, subtotal: itemSubtotal, cgst_amount: itemCgst, sgst_amount: itemSgst, total: itemSubtotal + itemCgst + itemSgst });

      // Update product stock
      if (item.id || item.productId) {
        const productId = item.id || item.productId;
        await Product.findByIdAndUpdate(productId, { $inc: { stock_qty: Number(item.quantity || 1) } }, { session });
        const stockTx = new StockTransaction({
          branch_id: branchId, product_id: productId,
          type: 'purchase_addition', quantity: Number(item.quantity || 1),
          ref_id: purchaseNumber, notes: 'Purchase stock-in'
        });
        await stockTx.save({ session });
      }
    }

    const total = subtotal + cgst + sgst;
    const paid = paymentMode === 'credit' ? 0 : Number(paidAmount || total);
    const due = total - paid;

    const purchase = new Purchase({
      branch_id: branchId,
      supplier_id: supplierId || null,
      supplier_name: supplierName || 'Unknown Supplier',
      purchase_number: purchaseNumber,
      items: validatedItems,
      subtotal, cgst_amount: cgst, sgst_amount: sgst,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      payment_mode: paymentMode || 'cash',
      status: due <= 0 ? 'paid' : 'pending',
      purchase_date: purchaseDate || new Date(),
      notes: notes || ''
    });
    await purchase.save({ session });

    // Update supplier balance if credit
    if (supplierId && paymentMode === 'credit') {
      await Supplier.findByIdAndUpdate(supplierId, { $inc: { current_balance: due, due_amount: due } }, { session });
    }

    // Ledger entry
    const ledgerEntry = new Ledger({
      branch_id: branchId,
      party_id: supplierId || userId,
      party_type: supplierId ? 'supplier' : 'general',
      ref_id: purchase._id,
      ref_type: 'payment_voucher',
      debit: total,
      credit: paid,
      narration: `Purchase ${purchaseNumber} from ${supplierName || 'supplier'}`,
      entry_date: purchaseDate || new Date()
    });
    await ledgerEntry.save({ session });

    await session.commitTransaction();
    session.endSession();

    await auditLog(branchId, userId, 'PURCHASE_CREATED', 'purchases', `Purchase ${purchaseNumber} of ₹${total}`);

    return res.status(201).json({
      success: true, message: 'Purchase created successfully.',
      purchaseId: purchase._id, purchaseNumber, totalAmount: total, dueAmount: due
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchases = async (req, res) => {
  const Purchase = getPurchaseModel();
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const purchases = await Purchase.find({ branch_id: branchId }).sort({ created_at: -1 }).lean();
    return res.json({ success: true, data: purchases.map(p => ({ id: p._id, ...p })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchase = async (req, res) => {
  const Purchase = getPurchaseModel();
  const { id } = req.params;
  try {
    await Purchase.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Purchase deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const Purchase = getPurchaseModel();
  const { id } = req.params;
  const { orderStatus } = req.body;
  try {
    const p = await Purchase.findByIdAndUpdate(id, { order_status: orderStatus }, { new: true });
    return res.json({ success: true, data: { id: p._id, ...p.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
