const staticHsns = [
  { hsn: '8517', description: 'Telecom/Mobile/Devices', cgst: 9.0, sgst: 9.0, igst: 18.0 },
  { hsn: '8471', description: 'Computers & Automatic Data Processing', cgst: 9.0, sgst: 9.0, igst: 18.0 },
  { hsn: '8528', description: 'Monitors & Projectors', cgst: 14.0, sgst: 14.0, igst: 28.0 }
];

export class GstModel {
  static async getHsnRules() {
    return staticHsns;
  }

  static async findByHsn(hsn) {
    return staticHsns.find(item => item.hsn === hsn);
  }
}
