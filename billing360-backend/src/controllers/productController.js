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
  const {
    name, sku, barcode, category_id, category, hsn_code, hsn,
    gst_percent, gstPercent,
    purchase_price, purchasePrice,
    selling_price, sellingPrice, price, mrp,
    stock_qty, stock, openingStock,
    low_stock_alert_level, lowStockAlert,
    unit, brand, size, color, batchNumber, expiryDate, image,
    wholesalePrice, wholesale_price
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Product name is required.' });
  }

  try {
    const newProduct = new Product({
      branch_id: branchId,
      name,
      sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      barcode: barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      category_id: category_id || category || null,
      hsn_code: hsn_code || hsn || '85171300',
      gst_percent: gst_percent !== undefined ? gst_percent : (gstPercent !== undefined ? gstPercent : 18),
      purchase_price: purchasePrice !== undefined ? purchasePrice : (purchase_price !== undefined ? purchase_price : 0),
      selling_price: sellingPrice !== undefined ? sellingPrice : (selling_price !== undefined ? selling_price : (price !== undefined ? price : 0)),
      stock_qty: openingStock !== undefined ? openingStock : (stock_qty !== undefined ? stock_qty : (stock !== undefined ? stock : 0)),
      low_stock_alert_level: lowStockAlert !== undefined ? lowStockAlert : (low_stock_alert_level !== undefined ? low_stock_alert_level : 5),
      unit: unit || 'pcs',
      status: 'active'
    });

    await newProduct.save();
    await auditLog(branchId, userId, 'PRODUCT_CREATED', 'products', `Product ${name} created`);

    return res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      data: {
        id: newProduct._id,
        ...newProduct.toObject(),
        stock: newProduct.stock_qty,
        price: newProduct.selling_price,
        purchasePrice: newProduct.purchase_price,
        gstPercent: newProduct.gst_percent,
        lowStockAlert: newProduct.low_stock_alert_level
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    // Handle both camelCase (from frontend) and snake_case (internal) field names
    if (body.stock !== undefined) product.stock_qty = body.stock;
    if (body.stock_qty !== undefined) product.stock_qty = body.stock_qty;
    if (body.openingStock !== undefined) product.stock_qty = body.openingStock;
    if (body.price !== undefined) product.selling_price = body.price;
    if (body.selling_price !== undefined) product.selling_price = body.selling_price;
    if (body.sellingPrice !== undefined) product.selling_price = body.sellingPrice;
    if (body.purchase_price !== undefined) product.purchase_price = body.purchase_price;
    if (body.purchasePrice !== undefined) product.purchase_price = body.purchasePrice;
    if (body.gst_percent !== undefined) product.gst_percent = body.gst_percent;
    if (body.gstPercent !== undefined) product.gst_percent = body.gstPercent;
    if (body.low_stock_alert_level !== undefined) product.low_stock_alert_level = body.low_stock_alert_level;
    if (body.lowStockAlert !== undefined) product.low_stock_alert_level = body.lowStockAlert;
    if (body.name !== undefined) product.name = body.name;
    if (body.sku !== undefined) product.sku = body.sku;
    if (body.barcode !== undefined) product.barcode = body.barcode;
    if (body.unit !== undefined) product.unit = body.unit;
    if (body.hsn !== undefined) product.hsn_code = body.hsn;
    if (body.hsn_code !== undefined) product.hsn_code = body.hsn_code;
    if (body.category !== undefined) product.category_id = body.category;
    if (body.category_id !== undefined) product.category_id = body.category_id;
    if (body.mrp !== undefined) product.mrp = body.mrp;
    if (body.wholesalePrice !== undefined) product.wholesale_price = body.wholesalePrice;
    if (body.status !== undefined) product.status = body.status;

    product.updated_at = new Date();
    await product.save();

    return res.json({
      success: true,
      message: 'Product updated.',
      data: {
        id: product._id,
        ...product.toObject(),
        stock: product.stock_qty,
        price: product.selling_price,
        purchasePrice: product.purchase_price,
        gstPercent: product.gst_percent,
        lowStockAlert: product.low_stock_alert_level
      }
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
