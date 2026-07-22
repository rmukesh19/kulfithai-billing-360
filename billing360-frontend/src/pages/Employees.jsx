import { useState, useEffect } from 'react';
import { Mail, Phone, Shield, Clock, X, Eye, Edit2, Trash2, Search, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeService, BranchService, SettingsService } from '../services/dataService';
import { useAuth } from '../lib/AuthContext';
import { useDeleteToast } from '../lib/DeleteToastContext';
import { translations } from '../lib/translations';

export default function Employees() {
  const { userProfile } = useAuth();
  const { showConfirm } = useDeleteToast();
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [config, setConfig] = useState(null);

  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    role: 'Billing',
    email: '',
    phone: '',
    status: 'present',
    salary: 15000,
    username: '',
    password: '',
    loginTimeFrom: '09:00',
    loginTimeTo: '21:00',
    permissions: ['can_bill'],
    branchId: ''
  });

  const generateNextEmployeeId = () => {
    const prefix = 'EMP';
    const existingIds = employees
      .map(e => e.id || '')
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, '')))
      .filter(num => !isNaN(num));
    
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const PERMISSIONS = [
    { id: 'can_bill', label: 'POS Billing' },
    { id: 'can_manage_inventory', label: 'Inventory & Stock' },
    { id: 'can_view_reports', label: 'View Reports' },
    { id: 'can_manage_employees', label: 'Manage Staff' },
    { id: 'can_manage_accounts', label: 'Accounting & Vouchers' },
    { id: 'can_manage_branches', label: 'Branch Management' },
  ];

  const handlePermissionToggle = (permissionId, isEditing) => {
    if (isEditing && editingEmployee) {
      const current = editingEmployee.permissions || [];
      const updated = current.includes(permissionId) 
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId];
      setEditingEmployee({ ...editingEmployee, permissions: updated });
    } else {
      const current = newEmployee.permissions || [];
      const updated = current.includes(permissionId)
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId];
      setNewEmployee({ ...newEmployee, permissions: updated });
    }
  };

  const handleRoleChange = (role, isEditing) => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || [];
    if (isEditing && editingEmployee) {
      setEditingEmployee({ ...editingEmployee, role: role, permissions: defaultPerms });
    } else {
      setNewEmployee({ ...newEmployee, role: role, permissions: defaultPerms });
    }
  };

  const ROLE_DEFAULT_PERMISSIONS = {
    'Billing': ['can_bill'],
    'Manager': ['can_bill', 'can_manage_inventory', 'can_view_reports', 'can_manage_employees'],
    'Store Keeper': ['can_manage_inventory'],
    'Accountant': ['can_view_reports', 'can_manage_accounts'],
    'Auditor': ['can_view_reports', 'can_manage_accounts'],
    'Super Admin': ['can_bill', 'can_manage_inventory', 'can_view_reports', 'can_manage_employees', 'can_manage_accounts', 'can_manage_branches']
  };

  useEffect(() => {
    if (userProfile?.branchId) {
      SettingsService.getConfig(userProfile.branchId, setConfig);
      const unsub = EmployeeService.getEmployees(userProfile.branchId, setEmployees);
      const unsubBranches = BranchService.getBranches(setBranches);
      setNewEmployee(prev => ({ ...prev, branchId: userProfile.branchId }));
      return () => {
        unsub();
        unsubBranches();
      };
    }
  }, [userProfile?.branchId]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId) return;
    setIsSubmitting(true);
    try {
      const finalEmployee = { ...newEmployee };
      if (!finalEmployee.id) {
        finalEmployee.id = generateNextEmployeeId();
      }

      await EmployeeService.addEmployee(userProfile.branchId, {
        ...finalEmployee,
        branchId: userProfile.branchId
      });
      setShowAddModal(false);
      setNewEmployee({
        id: '',
        name: '',
        role: 'Billing',
        email: '',
        phone: '',
        status: 'present',
        salary: 15000,
        username: '',
        password: '',
        loginTimeFrom: '09:00',
        loginTimeTo: '21:00',
        permissions: ['can_bill'],
        branchId: userProfile.branchId
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (emp) => {
    if (!userProfile?.branchId || !emp.id) return;
    await EmployeeService.updateEmployee(userProfile.branchId, emp.id, {
      status: emp.status === 'present' ? 'absent' : 'present'
    });
  };

  const [editingEmployee, setEditingEmployee] = useState(null);

  const t = translations[config?.language || 'English'] || translations.English;

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!userProfile?.branchId || !editingEmployee || !editingEmployee.id) return;
    setIsSubmitting(true);
    try {
      const { id, ...data } = editingEmployee;
      await EmployeeService.updateEmployee(userProfile.branchId, id, data);
      setEditingEmployee(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = (id) => {
    if (!userProfile?.branchId || !id) return;
    showConfirm('Employee', 'Are you sure you want to delete this employee? Their profile will be soft-deleted.', async () => {
      await EmployeeService.deleteEmployee(userProfile.branchId, id);
    });
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.employees}</h2>
          <p className="text-slate-500">{t.settings}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest cursor-pointer"
        >
          <Plus size={18} />
          {t.add_employee} (Alt+N)
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {['all', 'attendance', 'salary'].map((tab, idx) => (
              <button 
                key={`${tab}-${idx}`}
                onClick={() => setActiveTab(tab)} 
                className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-all capitalize cursor-pointer", activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                {t[tab] || tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'all' && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id || `emp-all-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={12} />
                        {emp.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={12} />
                        {emp.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        emp.role === 'Super Admin' ? "bg-purple-50 text-purple-600" :
                        emp.role === 'Auditor' ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        <Shield size={10} />
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(emp)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                          emp.status === 'present' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                      >
                        {emp.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button 
                          onClick={() => {
                            setViewingEmployee(emp);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingEmployee(emp)}
                          className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          
          {activeTab === 'salary' && (
             <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">Allowance</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id || `emp-salary-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">{emp.name}</td>
                    <td className="px-6 py-4 text-sm">₹{emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">₹0</td>
                    <td className="px-6 py-4 text-sm text-red-500">₹0</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">₹{emp.salary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'attendance' && (
            <div className="p-20 text-center text-slate-400 italic">
              Attendance tracking module is being synchronized.
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-xl font-bold text-slate-900">Add New Employee</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                      <span>Employee ID</span>
                      <button 
                        type="button" 
                        onClick={() => setNewEmployee({...newEmployee, id: generateNextEmployeeId()})}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Auto
                      </button>
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. EMP001"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.id} 
                      onChange={e => setNewEmployee({...newEmployee, id: e.target.value})} 
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.name} 
                      onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.role}
                      onChange={e => handleRoleChange(e.target.value, false)}
                    >
                      <option value="Billing">Billing</option>
                      <option value="Manager">Manager</option>
                      <option value="Store Keeper">Store Keeper</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Auditor">Auditor</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Salary</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.salary} 
                      onChange={e => setNewEmployee({...newEmployee, salary: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Login username"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.username || ''} 
                      onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input 
                      required
                      type="password" 
                      placeholder="Login password"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.password || ''} 
                      onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Time (From)</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.loginTimeFrom || '09:00'} 
                      onChange={e => setNewEmployee({...newEmployee, loginTimeFrom: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Time (To)</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.loginTimeTo || '21:00'} 
                      onChange={e => setNewEmployee({...newEmployee, loginTimeTo: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                    <input 
                      required
                      type="tel" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.phone} 
                      onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={newEmployee.email} 
                      onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Branch</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                      value={newEmployee.branchId}
                      onChange={e => setNewEmployee({...newEmployee, branchId: e.target.value})}
                    >
                      {branches.map((b, idx) => (
                        <option key={b.id || `branch-add-${idx}`} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Permissions</label>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {PERMISSIONS.map(p => (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={newEmployee.permissions?.includes(p.id)}
                            onChange={() => handlePermissionToggle(p.id, false)}
                          />
                          <div className={cn(
                            "w-5 h-5 border-2 rounded-md transition-all",
                            newEmployee.permissions?.includes(p.id) 
                              ? "bg-blue-600 border-blue-600" 
                              : "border-slate-300 bg-white group-hover:border-blue-400"
                          )}></div>
                          {newEmployee.permissions?.includes(p.id) && (
                            <div className="absolute text-white font-bold text-[10px]">✓</div>
                          )}
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-105 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-xl font-bold text-slate-900">Edit Employee</h3>
                <button onClick={() => setEditingEmployee(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>

              <form onSubmit={handleEditEmployee} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.name} 
                      onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.role}
                      onChange={e => handleRoleChange(e.target.value, true)}
                    >
                      <option value="Billing">Billing</option>
                      <option value="Manager">Manager</option>
                      <option value="Store Keeper">Store Keeper</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Auditor">Auditor</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Salary</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.salary} 
                      onChange={e => setEditingEmployee({...editingEmployee, salary: parseInt(e.target.value) || 0})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.username || ''} 
                      onChange={e => setEditingEmployee({...editingEmployee, username: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <input 
                      required
                      type="password" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.password || ''} 
                      onChange={e => setEditingEmployee({...editingEmployee, password: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Time (From)</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.loginTimeFrom || '09:00'} 
                      onChange={e => setEditingEmployee({...editingEmployee, loginTimeFrom: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Login Time (To)</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.loginTimeTo || '21:00'} 
                      onChange={e => setEditingEmployee({...editingEmployee, loginTimeTo: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                    <input 
                      required
                      type="tel" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.phone} 
                      onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingEmployee.email} 
                      onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Branch</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
                      value={editingEmployee.branchId}
                      onChange={e => setEditingEmployee({...editingEmployee, branchId: e.target.value})}
                    >
                      {branches.map((b, idx) => (
                        <option key={b.id || `branch-edit-${idx}`} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Permissions</label>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {PERMISSIONS.map(p => (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            className="peer sr-only"
                            checked={editingEmployee.permissions?.includes(p.id)}
                            onChange={() => handlePermissionToggle(p.id, true)}
                          />
                          <div className={cn(
                            "w-5 h-5 border-2 rounded-md transition-all",
                            editingEmployee.permissions?.includes(p.id) 
                              ? "bg-blue-600 border-blue-600" 
                              : "border-slate-300 bg-white group-hover:border-blue-400"
                          )}></div>
                          {editingEmployee.permissions?.includes(p.id) && (
                            <div className="absolute text-white font-bold text-[10px]">✓</div>
                          )}
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingEmployee(null)} 
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-100 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Employee Modal */}
      <AnimatePresence>
        {showViewModal && viewingEmployee && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-xl font-bold text-slate-900">Employee Profile</h3>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                  x
                </button>
              </div>
              <div className="p-8 space-y-6 bg-white">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-black italic">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 italic tracking-tight">{viewingEmployee.name}</h4>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic",
                      viewingEmployee.role === 'Super Admin' ? "bg-purple-50 text-purple-600" :
                      viewingEmployee.role === 'Auditor' ? "bg-amber-50 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      <Shield size={10} />
                      {viewingEmployee.role}
                    </span>
                    <p className="text-slate-500 font-mono text-[10px] mt-2 uppercase tracking-widest">ID: {viewingEmployee.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Salary</p>
                    <p className="text-lg font-black text-slate-900 italic">₹{viewingEmployee.salary.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Status Today</p>
                    <span className={cn(
                      "inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic",
                      viewingEmployee.status === 'present' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {viewingEmployee.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail size={18} className="text-slate-400" />
                    <span className="text-sm font-bold">{viewingEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone size={18} className="text-slate-400" />
                    <span className="text-sm font-bold">{viewingEmployee.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock size={18} className="text-slate-400" />
                    <span className="text-sm font-bold">Shift: {viewingEmployee.loginTimeFrom} - {viewingEmployee.loginTimeTo}</span>
                  </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Permissions</p>
                   <div className="flex flex-wrap gap-2">
                     {viewingEmployee.permissions?.map((pid, idx) => {
                       const perm = PERMISSIONS.find(p => p.id === pid);
                       return (
                        <span key={`${pid}-${idx}`} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                          {perm?.label || pid}
                        </span>
                       );
                     })}
                   </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                 <button 
                  onClick={() => {
                    setShowViewModal(false);
                    setEditingEmployee(viewingEmployee);
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-black py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-100 transition-all italic shadow-sm cursor-pointer"
                 >
                   Edit Profile
                 </button>
                 <button 
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-blue-600 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all italic shadow-lg shadow-blue-100 cursor-pointer"
                 >
                   Close
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
