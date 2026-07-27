import express from 'express';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, markAttendance } from '../controllers/employeeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', getEmployees);
router.post('/', addEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
router.post('/:id/attendance', markAttendance);

export default router;
