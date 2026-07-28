import { Purchase } from '../models/Purchase.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { v4 as uuidv4 } from 'uuid';

export const getPurchases = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  const limit = parseInt(req.query.limit) || 500;
  try {
    const purchases = await Purchase.find({ branch_id: branchId, status: { $ne: 'deleted' } })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
    const formatted = purchases.map(p => ({
      id: p._id,
      ...p,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      purchaseNumber: p.purchase_number,
      totalAmount: p.total_amount,
      paymentMode: p.payment_mode,
      paidAmount: p.paid_amount,
      dueAmount: p.due_amount,
      orderStatus: p.order_status,
      createdAt: p.created_at
    }));
    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addPurchase = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const {
    supplierId, supplierName, items, totalAmount, total_amount,
    paymentMode, payment_mode, paidAmount, paid_amount,
    purchaseNumber, notes, purchaseDate
  } = req.body;

  try {
    const id = uuidv4();

    // Generate purchase number if not provided
    const count = await Purchase.countDocuments({ branch_id: branchId });
    const autoNumber = purchaseNumber || `PUR-${String(count + 1).padStart(5, '0')}`;

    const finalTotal = totalAmount || total_amount || 0;
    const finalPaid = paidAmount || paid_amount || finalTotal;
    const finalPayment = paymentMode || payment_mode || 'cash';

    const purchase = new Purchase({
      _id: id,
      branch_id: branchId,
      supplier_id: supplierId || null,
      supplier_name: supplierName || '',
      purchase_number: autoNumber,
      items: (items || []).map(item => ({
        product_id: item.productId || item.id || item.product_id,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity || 0,
        purchase_price: item.purchasePrice || item.purchase_price || item.price || 0,
        total: (item.quantity || 0) * (item.purchasePrice || item.purchase_price || item.price || 0)
      })),
      subtotal: finalTotal,
      total_amount: finalTotal,
      payment_mode: finalPayment,
      paid_amount: finalPaid,
      due_amount: finalPayment === 'credit' ? finalTotal - finalPaid : 0,
      order_status: req.body.orderStatus || 'received',
      notes: notes || '',
      purchase_date: purchaseDate || new Date(),
      status: 'active'
    });

    await purchase.save();

    // Update stock quantities for each item
    for (const item of items || []) {
      const productId = item.productId || item.id || item.product_id;
      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock_qty: item.quantity || 0 },
          updated_at: new Date()
        });
      }
    }

    // Update supplier balance if credit purchase
    if (finalPayment === 'credit' && supplierId) {
      await Supplier.findByIdAndUpdate(supplierId, {
        $inc: { current_balance: finalTotal, due_amount: finalTotal },
        updated_at: new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Purchase recorded successfully.',
      data: {
        id: purchase._id,
        ...purchase.toObject(),
        purchaseNumber: purchase.purchase_number,
        totalAmount: purchase.total_amount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePurchase = async (req, res) => {
  const { id } = req.params;
  const { orderStatus, order_status } = req.body;
  try {
    const purchase = await Purchase.findById(id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });

    if (orderStatus || order_status) {
      purchase.order_status = orderStatus || order_status;
    }
    purchase.updated_at = new Date();
    await purchase.save();

    return res.json({ success: true, message: 'Purchase updated.', data: { id: purchase._id, ...purchase.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchase = async (req, res) => {
  const { id } = req.params;
  try {
    const purchase = await Purchase.findById(id);
    if (purchase) {
      purchase.status = 'deleted';
      await purchase.save();
    }
    return res.json({ success: true, message: 'Purchase deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
