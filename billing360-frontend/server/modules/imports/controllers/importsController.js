import * as importsService from '../services/importsService.js';

export const importData = async (req, res) => {
  try {
    const { branchId, importType, data, existingRecords, fileName } = req.body;

    const result = await importsService.processBulkImport(
      branchId,
      importType,
      data,
      existingRecords || {},
      fileName || 'imported_file.csv'
    );

    return res.status(200).json({
      success: true,
      message: `${importType} batch audit completed successfully`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getImportLogs = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId query parameter is required'
      });
    }

    const logs = await importsService.fetchHistoryLogs(branchId);
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const rollbackImport = async (req, res) => {
  try {
    const { branchId, importId } = req.body;

    const result = await importsService.executeRollback(branchId, importId);
    return res.status(200).json({
      success: true,
      message: `Rollback completed for session ${importId}`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await importsService.deleteLogRecord(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Import log ${id} not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Import log ${id} deleted from audit history`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
