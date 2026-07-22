import express from 'express';

const router = express.Router();

let staticCustomers = [
  { id: 'c1', name: 'Alok Nath', phone: '9999999999', balance: 500, branchId: 'branch_01' },
  { id: 'c2', name: 'Rita Devi', phone: '8888888888', balance: -200, branchId: 'branch_01' }
];

router.get('/', (req, res) => {
  const { branchId } = req.query;
  const list = staticCustomers.filter(c => c.branchId === branchId && !c.is_deleted);
  res.json({ success: true, data: list });
});

router.post('/', (req, res) => {
  const customer = req.body;
  const newCustomer = { ...customer, id: customer.id || Math.random().toString(36).substr(2, 9) };
  staticCustomers.push(newCustomer);
  res.status(201).json({ success: true, data: newCustomer });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const c = staticCustomers.find(item => item.id === id);
  if (c) {
    c.is_deleted = 1;
    c.deleted_at = new Date().toISOString();
    console.log(`[SQL UPDATE] UPDATE customers SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: 'Customer soft deleted successfully', data: c });
  }
  return res.status(404).json({ success: false, error: 'Customer not found' });
});

export default router;
