import * as barcodeService from '../services/barcodeService.js';

export const generateBarcode = async (req, res) => {
  try {
    const { payload, format } = req.body;
    const result = await barcodeService.generateCode(payload, format);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getBarcodeTemplates = async (req, res) => {
  try {
    const templates = await barcodeService.fetchTemplates();
    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteBarcodeTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Barcode template ID is required'
      });
    }

    const deleted = await barcodeService.removeTemplate(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Template with ID '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Barcode template soft deleted successfully',
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
