import { ProductsModel } from '../models/productsModel.js';

export const fetchProducts = async (branchId) => {
  return await ProductsModel.findByBranch(branchId);
};

export const createNewProduct = async (productData) => {
  // Enterprise rules: Margin checking, barcode fallback
  if (productData.purchasePrice > productData.sellingPrice) {
    console.warn('Encountered product where purchase price exceeds selling price.');
  }

  const enrichedProduct = {
    ...productData,
    barcode: productData.barcode || Math.floor(100000000000 + Math.random() * 900000000000).toString()
  };

  return await ProductsModel.insert(enrichedProduct);
};

export const removeProduct = async (id) => {
  return await ProductsModel.delete(id);
};
