import { Product } from '../models/Product.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { auditLog } from '../middleware/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const getStockList = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';
  const { barcode, sku, lowStockOnly } = req.query;

  try {
    let query = { branch_id: branchId, status: 'active' };

    if (barcode) query.barcode = barcode;
    else if (sku) query.sku = sku;

    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$stock_qty', '$low_stock_alert_level'] };
    }

    const items = await Product.find(query);
    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStockQty = async (req, res) => {
  const { productId, adjustmentQty, reason } = req.body;
  const branchId = req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';

  if (!productId || adjustmentQty === undefined) {
    return res.status(400).json({ success: false, message: 'ProductId and adjustmentQty are mandatory.' });
  }

  try {
    const item = await Product.findOne({ _id: productId, branch_id: branchId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Product profile not found.' });
    }

    const originalStock = Number(item.stock_qty);
    const configuredStock = originalStock + Number(adjustmentQty);

    if (configuredStock < 0) {
      return res.status(400).json({ success: false, message: `Update is invalid. Stock cannot drop below zero.` });
    }

    item.stock_qty = configuredStock;
    await item.save();

    const stockTx = new StockTransaction({
      branch_id: branchId,
      product_id: productId,
      type: 'adjustment',
      quantity: Number(adjustmentQty),
      notes: reason || 'manual adjustment'
    });
    await stockTx.save();

    await auditLog(branchId, userId, 'STOCK_MANUAL_ADJUSTED', 'products', `Stock for ${item.name} configured from ${originalStock} to ${configuredStock}`);

    return res.json({
      success: true,
      message: 'Stock updated successfully.',
      originalStock,
      newStock: configuredStock
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const transferStock = async (req, res) => {
  const { productId, targetBranchId, transferQty } = req.body;
  const sourceBranchId = req.user?.branch_id || 'b360-branch-head';

  if (!productId || !targetBranchId || !transferQty) {
    return res.status(400).json({ success: false, message: 'ProductId, targetBranchId, and transferQty are mandatory parameters.' });
  }

  try {
    if (sourceBranchId === targetBranchId) {
      return res.status(400).json({ success: false, message: 'Source branch and target branch must be unique.' });
    }

    const product = await Product.findOne({ _id: productId, branch_id: sourceBranchId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product profile does not exist at source branch.' });
    }

    if (Number(product.stock_qty) < Number(transferQty)) {
      return res.status(400).json({ success: false, message: `Insufficient stock. Requested: ${transferQty}, Available: ${product.stock_qty}` });
    }

    product.stock_qty -= Number(transferQty);
    await product.save();

    const targetProd = await Product.findOne({ sku: product.sku, branch_id: targetBranchId });
    if (targetProd) {
      targetProd.stock_qty += Number(transferQty);
      await targetProd.save();
    } else {
      const newTargetProd = new Product({
        branch_id: targetBranchId,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsn_code: product.hsn_code,
        gst_percent: product.gst_percent,
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        stock_qty: Number(transferQty),
        unit: product.unit
      });
      await newTargetProd.save();
    }

    const stockTx = new StockTransaction({
      branch_id: sourceBranchId,
      product_id: productId,
      type: 'stock_transfer',
      quantity: Number(transferQty),
      source_branch_id: sourceBranchId,
      target_branch_id: targetBranchId,
      notes: `Stock transfer to branch: ${targetBranchId}`
    });
    await stockTx.save();

    return res.json({
      success: true,
      message: `Stock successfully transferred. SKU: ${product.sku} - Quantity: ${transferQty}`
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
