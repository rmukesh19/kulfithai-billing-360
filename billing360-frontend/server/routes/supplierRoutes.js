import express from 'express';

const router = express.Router();

let staticSuppliers = [
  { id: 's1', name: 'Raw Materials Ltd', phone: '7777777777', balance: 12000, branchId: 'branch_01' },
  { id: 's2', name: 'Packaging Corp', phone: '6666666666', balance: 0, branchId: 'branch_01' }
];

router.get('/', (req, res) => {
  const { branchId } = req.query;
  const list = staticSuppliers.filter(s => s.branchId === branchId && !s.is_deleted);
  res.json({ success: true, data: list });
});

router.post('/', (req, res) => {
  const supplier = req.body;
  const newSupplier = { ...supplier, id: supplier.id || Math.random().toString(36).substr(2, 9) };
  staticSuppliers.push(newSupplier);
  res.status(201).json({ success: true, data: newSupplier });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const s = staticSuppliers.find(item => item.id === id);
  if (s) {
    s.is_deleted = 1;
    s.deleted_at = new Date().toISOString();
    console.log(`[SQL UPDATE] UPDATE suppliers SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: 'Supplier soft deleted successfully', data: s });
  }
  return res.status(404).json({ success: false, error: 'Supplier not found' });
});

export default router;
