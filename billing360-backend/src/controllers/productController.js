import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { auditLog } from '../middleware/logger.js';

// --- PRODUCTS ---

export const getProducts = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const products = await Product.find({ branch_id: branchId, status: { $ne: 'deleted' } }).sort({ created_at: -1 }).lean();
    const formatted = products.map(p => ({
      id: p._id,
      ...p,
      stock: p.stock_qty,
      price: p.selling_price,
      purchasePrice: p.purchase_price,
      gstPercent: p.gst_percent,
      lowStockAlert: p.low_stock_alert_level
    }));
    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addProduct = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { name, sku, barcode, category_id, hsn_code, gst_percent, purchase_price, selling_price, stock_qty, stock, price, unit } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Product name is required.' });
  }

  try {
    const newProduct = new Product({
      branch_id: branchId,
      name,
      sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      barcode: barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      category_id: category_id || null,
      hsn_code: hsn_code || '85171300',
      gst_percent: gst_percent !== undefined ? gst_percent : 18,
      purchase_price: purchase_price || 0,
      selling_price: selling_price || price || 0,
      stock_qty: stock_qty !== undefined ? stock_qty : (stock !== undefined ? stock : 0),
      unit: unit || 'pcs',
      status: 'active'
    });

    await newProduct.save();
    await auditLog(branchId, userId, 'PRODUCT_CREATED', 'products', `Product ${name} created`);

    return res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      data: { id: newProduct._id, ...newProduct.toObject(), stock: newProduct.stock_qty, price: newProduct.selling_price }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (updateData.stock !== undefined) updateData.stock_qty = updateData.stock;
    if (updateData.price !== undefined) updateData.selling_price = updateData.price;

    Object.assign(product, updateData);
    await product.save();

    return res.json({
      success: true,
      message: 'Product updated.',
      data: { id: product._id, ...product.toObject(), stock: product.stock_qty, price: product.selling_price }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (product) { product.status = 'deleted'; await product.save(); }
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- CATEGORIES ---

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: categories.map(c => ({ id: c._id, ...c })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addCategory = async (req, res) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
  try {
    const cat = new Category({ name, parent_id: parent_id || null, status: 'active' });
    await cat.save();
    return res.status(201).json({ success: true, data: { id: cat._id, ...cat.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await Category.findByIdAndUpdate(id, { status: 'deleted' });
    return res.json({ success: true, message: 'Category deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
