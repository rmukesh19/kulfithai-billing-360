import { GstModel } from '../models/gstModel.js';

export const calculateGstr1 = async (branchId, year, month) => {
  const hsnList = await GstModel.getHsnRules();
  
  // Real GSTR-1 structures: B2B, B2CS, HSN summaries
  return {
    period: `${month}-${year}`,
    branchId,
    b2b: [
      {
        ctin: '29AAAAA1111A1Z1',
        inv: [
          { inum: 'INV-2026-001', idt: '2026-05-15', val: 1180.00, pos: '29', rchrg: 'N', inv_typ: 'R', itms: [{ num: 1, itm_det: { txval: 1000.00, rt: 18.0, iamt: 0.0, camt: 90.0, samt: 90.0, csamt: 0.0 } }] }
        ]
      }
    ],
    b2cs: [
      { sply_ty: 'INTRA', pos: '29', txval: 5000.00, rt: 18.0, camt: 450.00, samt: 450.00 }
    ],
    hsn: {
      data: [
        { num: 1, hsn_sc: '8517', desc: hsnList[0].description, uqc: 'NOS', qty: 1, val: 1180.00, txval: 1000.00, iamt: 0.0, camt: 90.0, samt: 90.0 }
      ]
    }
  };
};

export const calculateGstr3b = async (branchId, year, month) => {
  return {
    period: `${month}-${year}`,
    branchId,
    outwardSupplies: {
      taxableValue: 6000.00,
      igst: 0.00,
      cgst: 540.00,
      sgst: 540.00,
      cess: 0.00
    },
    itcEligible: {
      allOtherItc: {
        igst: 180.00,
        cgst: 0.00,
        sgst: 0.00,
        cess: 0.00
      }
    }
  };
};
