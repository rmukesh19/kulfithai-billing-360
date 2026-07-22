import express from 'express';

const router = express.Router();

let staticReports = [
  { id: 'r1', name: 'Z-Report', date: new Date().toISOString(), type: 'daily', branchId: 'branch_01' },
  { id: 'r2', name: 'GST Summary', date: new Date().toISOString(), type: 'tax', branchId: 'branch_01' }
];

router.get('/', (req, res) => {
  const { branchId } = req.query;
  const list = staticReports.filter(r => r.branchId === branchId && !r.is_deleted);
  res.json({ success: true, data: list });
});

router.post('/', (req, res) => {
  const report = req.body;
  const newReport = { ...report, id: report.id || Math.random().toString(36).substr(2, 9) };
  staticReports.push(newReport);
  res.status(201).json({ success: true, data: newReport });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const r = staticReports.find(item => item.id === id);
  if (r) {
    r.is_deleted = 1;
    r.deleted_at = new Date().toISOString();
    console.log(`[SQL UPDATE] UPDATE reports SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    return res.json({ success: true, message: 'Report deleted successfully', data: r });
  }
  return res.status(404).json({ success: false, error: 'Report not found' });
});

export default router;
