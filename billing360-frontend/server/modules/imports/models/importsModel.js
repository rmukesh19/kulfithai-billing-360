// In-Memory Database storage for Import Logs to allow History and Rollback
const importLogs = [
  {
    id: 'imp_001',
    importType: 'products',
    fileName: 'products_initial.xlsx',
    recordCount: 2,
    status: 'completed',
    importedIds: ['1', '2'],
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    branchId: 'branch_01'
  },
  {
    id: 'imp_002',
    importType: 'suppliers',
    fileName: 'initial_suppliers.csv',
    recordCount: 1,
    status: 'completed',
    importedIds: ['sup_001'],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    branchId: 'branch_01'
  }
];

export class ImportsModel {
  static async getLogs(branchId) {
    // Standard SELECT query simulation
    console.log(`[SQL SELECT] SELECT * FROM import_logs WHERE branch_id = '${branchId}' ORDER BY timestamp DESC`);
    return importLogs.filter(log => log.branchId === branchId);
  }

  static async findLogById(branchId, id) {
    console.log(`[SQL SELECT] SELECT * FROM import_logs WHERE id = '${id}' AND branch_id = '${branchId}'`);
    return importLogs.find(log => log.id === id && log.branchId === branchId);
  }

  static async addLog(branchId, logData) {
    const id = `imp_${Math.random().toString(36).substr(2, 9)}`;
    const newLog = {
      id,
      importType: logData.importType,
      fileName: logData.fileName || 'bulk_manual_entry.json',
      recordCount: logData.recordCount || 0,
      status: logData.status || 'completed',
      importedIds: logData.importedIds || [],
      timestamp: new Date().toISOString(),
      branchId
    };

    // Standard INSERT query simulation
    console.log(`[SQL INSERT] INSERT INTO import_logs (id, import_type, file_name, record_count, status, imported_ids, timestamp, branch_id) VALUES ('${id}', '${logData.importType}', '${newLog.fileName}', ${newLog.recordCount}, '${newLog.status}', '${JSON.stringify(newLog.importedIds)}', '${newLog.timestamp}', '${branchId}')`);
    
    importLogs.push(newLog);
    return newLog;
  }

  static async updateLogStatus(id, status) {
    console.log(`[SQL UPDATE] UPDATE import_logs SET status = '${status}' WHERE id = '${id}'`);
    const log = importLogs.find(l => l.id === id);
    if (log) {
      log.status = status;
    }
    return log;
  }

  static async deleteLog(id) {
    console.log(`[SQL DELETE] DELETE FROM import_logs WHERE id = '${id}'`);
    const idx = importLogs.findIndex(l => l.id === id);
    if (idx > -1) {
      importLogs.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Schema creation helper template for standard Enterprise MySQL deployment
  static getMySQLSchemas() {
    return {
      import_logs: `
        CREATE TABLE IF NOT EXISTS import_logs (
          id VARCHAR(50) PRIMARY KEY,
          import_type VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          record_count INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'completed',
          imported_ids TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          branch_id VARCHAR(50) NOT NULL,
          INDEX idx_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      products_schema: `
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE,
          barcode VARCHAR(100) UNIQUE,
          hsn VARCHAR(50),
          gst_percent DECIMAL(5,2) DEFAULT 0.00,
          purchase_price DECIMAL(15,2) DEFAULT 0.00,
          selling_price DECIMAL(15,2) DEFAULT 0.00,
          stock INT DEFAULT 0,
          unit VARCHAR(20) DEFAULT 'pcs',
          category VARCHAR(100),
          branch_id VARCHAR(50) NOT NULL,
          updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      customers_schema: `
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) UNIQUE,
          balance DECIMAL(15,2) DEFAULT 0.00,
          city VARCHAR(100),
          branch_id VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
      suppliers_schema: `
        CREATE TABLE IF NOT EXISTS suppliers (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          gstin VARCHAR(50) UNIQUE,
          address TEXT,
          branch_id VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `
    };
  }
}
