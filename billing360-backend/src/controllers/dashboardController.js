import { Invoice } from '../models/Invoice.js';
import { Voucher } from '../models/Voucher.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';

export const getDashboardSummary = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';

  try {
    // 1. Core summary calculations
    const salesAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId } },
      { $group: { _id: null, total_sales: { $sum: '$total_amount' }, total_dues: { $sum: '$due_amount' } } }
    ]);
    const totalSales = salesAgg[0]?.total_sales || 0;
    const dueCustomers = salesAgg[0]?.total_dues || 0;

    const expenseAgg = await Voucher.aggregate([
      { $match: { branch_id: branchId, type: 'payment' } },
      { $group: { _id: null, total_exp: { $sum: '$total_amount' } } }
    ]);
    const totalExpenses = expenseAgg[0]?.total_exp || 0;

    const supplierAgg = await Supplier.aggregate([
      { $match: { branch_id: branchId } },
      { $group: { _id: null, due_sup: { $sum: '$due_amount' } } }
    ]);
    const dueSuppliers = supplierAgg[0]?.due_sup || 0;

    // 2. Fetch Top Products
    const topProductsAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId } },
      { $unwind: '$items' },
      { $group: { 
          _id: '$items.product_id', 
          name: { $first: '$items.name' },
          qty_sold: { $sum: '$items.quantity' }, 
          revenue: { $sum: '$items.total_amount' } 
      } },
      { $sort: { qty_sold: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: 1, qty_sold: 1, revenue: 1 } }
    ]);

    // 3. Fetch Top Customers
    const topCustomersAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId, customer_id: { $ne: null } } },
      { $group: {
          _id: '$customer_id',
          total_visits: { $sum: 1 },
          total_spent: { $sum: '$total_amount' }
      } },
      { $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
      } },
      { $unwind: '$customerDetails' },
      { $sort: { total_spent: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: '$customerDetails.name', total_visits: 1, total_spent: 1 } }
    ]);

    // 4. Low stock count alert trigger list
    const lowStockAlerts = await Product.find(
      { branch_id: branchId, $expr: { $lte: ['$stock_qty', '$low_stock_alert_level'] } },
      'name sku stock_qty low_stock_alert_level -_id'
    );

    return res.json({
      success: true,
      summary: {
        totalSales,
        dueCustomers,
        totalExpenses,
        dueSuppliers
      },
      topProducts: topProductsAgg,
      topCustomers: topCustomersAgg,
      lowStockAlerts
    });

  } catch (error) {
    console.error('[Dashboard summary retrieve failed]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to build analytics data.',
      error: error.message
    });
  }
};
