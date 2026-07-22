// Product Controller - Standard JavaScript
export const getProducts = (req, res) => {
  const branchId = req.query.branchId;
  
  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'branchId is required'
    });
  }

  // Mock data
  const products = [
    {
      id: '1',
      name: 'Product A',
      sku: 'PA-001',
      barcode: '123456789',
      hsn: '8517',
      gstPercent: 18,
      purchasePrice: 100,
      sellingPrice: 150,
      stock: 50,
      unit: 'pcs',
      category: 'Electronics',
      branchId,
      updatedAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: products
  });
};

export const createProduct = (req, res) => {
  const product = req.body;
  
  console.log('Creating product:', product);

  res.status(201).json({
    success: true,
    data: { ...product, id: Math.random().toString(36).substr(2, 9) }
  });
};

export const deleteProduct = (req, res) => {
  const { id } = req.params;
  console.log(`[SQL UPDATE] UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
  
  res.json({
    success: true,
    message: 'Product soft deleted successfully',
    data: { id, is_deleted: 1, deleted_at: new Date().toISOString() }
  });
};
