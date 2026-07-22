const staticProducts = [
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
    branchId: 'branch_01',
    updatedAt: new Date().toISOString()
  }
];

export class ProductsModel {
  static async findByBranch(branchId) {
    return staticProducts.filter(prod => prod.branchId === branchId && !prod.is_deleted);
  }

  static async insert(product) {
    const newProduct = {
      ...product,
      id: product.id || Math.random().toString(36).substr(2, 9),
      updatedAt: new Date().toISOString()
    };
    staticProducts.push(newProduct);
    return newProduct;
  }

  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const prod = staticProducts.find(p => p.id === id);
    if (prod) {
      prod.is_deleted = 1;
      prod.deleted_at = new Date().toISOString();
      return prod;
    }
    return null;
  }
}
