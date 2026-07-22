import * as productsService from '../services/productsService.js';

export const getProducts = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required'
      });
    }

    const products = await productsService.fetchProducts(branchId);
    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const createdProduct = await productsService.createNewProduct(productData);
    return res.status(201).json({
      success: true,
      data: createdProduct
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required for deletion'
      });
    }

    const deleted = await productsService.removeProduct(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Product '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product soft deleted successfully',
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
