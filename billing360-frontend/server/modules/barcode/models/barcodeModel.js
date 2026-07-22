const staticTemplates = [
  { id: 't1', name: 'Standard 2x1 Inch Sticker', width: 220, height: 110, columns: 2, isDefault: true },
  { id: 't2', name: 'Compact Jewelry Tag', width: 150, height: 60, columns: 3, isDefault: false },
  { id: 't3', name: 'A4 Multi Sticker Sheet (48-up)', width: 300, height: 150, columns: 4, isDefault: false }
];

export class BarcodeModel {
  static async getTemplates() {
    return staticTemplates.filter(t => !t.is_deleted);
  }

  static async findTemplateById(id) {
    return staticTemplates.find(t => t.id === id && !t.is_deleted);
  }

  static async delete(id) {
    console.log(`[SQL UPDATE] UPDATE barcode_templates SET is_deleted = 1, deleted_at = NOW() WHERE id = '${id}'`);
    const temp = staticTemplates.find(t => t.id === id);
    if (temp) {
      temp.is_deleted = 1;
      temp.deleted_at = new Date().toISOString();
      return temp;
    }
    return null;
  }
}
