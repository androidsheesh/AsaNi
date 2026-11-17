/* =====================================================================
   Asa ni? — Mock data (seed)
   ---------------------------------------------------------------------
   Every array below mirrors a database table of the real system.
   Dates are generated RELATIVE TO TODAY so that the near-expiry,
   expired and low-stock alerts always appear, whenever the demo runs.
   The seed is copied to localStorage on first load (see app.js).
   Computed values (status, days to expiry, total on hand) are NOT
   stored here — app.js calculates them.
   ===================================================================== */
'use strict';

/** Returns a local ISO date (YYYY-MM-DD) offset by `offset` days from today. */
function seedDate(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Returns a local timestamp (YYYY-MM-DDTHH:MM:SS) offset by `offset` days. */
function seedDateTime(offset, time) {
  return seedDate(offset) + 'T' + (time || '09:00') + ':00';
}

/** The 23 barangays of Tagum City (used by Locations and Beneficiaries). */
const TAGUM_BARANGAYS = [
  'Apokon', 'Bincungan', 'Busaon', 'Canocotan', 'Cuambogan', 'La Filipina', 'Liboganon',
  'Madaum', 'Magdum', 'Magugpo East', 'Magugpo North', 'Magugpo Poblacion', 'Magugpo South',
  'Magugpo West', 'Mankilam', 'New Balamban', 'Nueva Fuerza', 'Pagsabangan', 'Pandapan',
  'San Agustin', 'San Isidro', 'San Miguel (Camp 4)', 'Visayan Village'
];

/** Builds a fresh copy of the whole mock database. */
function buildSeedData() {
  const D = seedDate;
  const DT = seedDateTime;

  /* ---------------- users ---------------- */
  const users = [
    { id: 1, fullName: 'Jul-Mar P. Liong', username: 'admin', email: 'jpliong@tagumcity.gov.ph', role: 'Administrator', password: 'admin123', status: 'Active', lastLogin: DT(0, '08:05') },
    { id: 2, fullName: 'Maria Theresa S. Ramos', username: 'staff', email: 'mtramos@tagumcity.gov.ph', role: 'Inventory Staff', password: 'staff123', status: 'Active', lastLogin: DT(-1, '10:20') },
    { id: 3, fullName: 'Roberto C. Villanueva', username: 'rvillanueva', email: 'rcvillanueva@tagumcity.gov.ph', role: 'Inventory Staff', password: 'staff123', status: 'Active', lastLogin: DT(-2, '07:58') },
    { id: 4, fullName: 'Angelica D. Mendoza', username: 'amendoza', email: 'admendoza@tagumcity.gov.ph', role: 'Inventory Staff', password: 'staff123', status: 'Inactive', lastLogin: DT(-24, '16:41') }
  ];

  /* ---------------- categories ---------------- */
  const categories = [
    { id: 1, name: 'Seeds', description: 'Rice, corn and vegetable seeds for distribution', status: 'Active' },
    { id: 2, name: 'Fertilizers', description: 'Inorganic and organic fertilizers', status: 'Active' },
    { id: 3, name: 'Pesticides', description: 'Insecticides, herbicides and fungicides', status: 'Active' },
    { id: 4, name: 'Farm Tools', description: 'Hand tools distributed to farmers', status: 'Active' },
    { id: 5, name: 'Farm Equipment', description: 'Machinery tracked per unit with a custodian', status: 'Active' },
    { id: 6, name: 'Planting Materials', description: 'Seedlings, suckers and cuttings', status: 'Active' }
  ];

  /* ---------------- items ---------------- */
  const items = [
    { id: 1, code: 'SD-001', name: 'Rice seeds (Inbred)', categoryId: 1, unit: 'kg', type: 'Consumable', reorderLevel: 500, description: 'NSIC Rc 222 certified inbred rice seeds, 20 kg bags', status: 'Active' },
    { id: 2, code: 'SD-002', name: 'Hybrid corn seeds', categoryId: 1, unit: 'kg', type: 'Consumable', reorderLevel: 200, description: 'Yellow hybrid corn seeds, 18 kg bags', status: 'Active' },
    { id: 3, code: 'FT-001', name: 'Urea fertilizer 46-0-0', categoryId: 2, unit: 'bag', type: 'Consumable', reorderLevel: 100, description: '50 kg bag, prilled urea', status: 'Active' },
    { id: 4, code: 'FT-002', name: 'Complete fertilizer 14-14-14', categoryId: 2, unit: 'bag', type: 'Consumable', reorderLevel: 80, description: '50 kg bag, NPK complete', status: 'Active' },
    { id: 5, code: 'FT-003', name: 'Organic fertilizer', categoryId: 2, unit: 'bag', type: 'Consumable', reorderLevel: 100, description: '50 kg bag, vermicompost-based', status: 'Active' },
    { id: 6, code: 'PS-001', name: 'Insecticide (Cypermethrin)', categoryId: 3, unit: 'liter', type: 'Consumable', reorderLevel: 40, description: 'Cypermethrin 5% EC, 1 L bottle', status: 'Active' },
    { id: 7, code: 'PS-002', name: 'Herbicide (Glyphosate)', categoryId: 3, unit: 'liter', type: 'Consumable', reorderLevel: 40, description: 'Glyphosate 480 SL, 1 L bottle', status: 'Active' },
    { id: 8, code: 'TL-001', name: 'Knapsack sprayer', categoryId: 4, unit: 'unit', type: 'Consumable', reorderLevel: 10, description: '16 L manual knapsack sprayer', status: 'Active' },
    { id: 9, code: 'TL-002', name: 'Shovel', categoryId: 4, unit: 'pc', type: 'Consumable', reorderLevel: 20, description: 'Round-point shovel with wooden handle', status: 'Active' },
    { id: 10, code: 'TL-003', name: 'Bolo', categoryId: 4, unit: 'pc', type: 'Consumable', reorderLevel: 20, description: 'Carbon-steel farm bolo with sheath', status: 'Active' },
    { id: 11, code: 'EQ-001', name: 'Four-wheel farm tractor', categoryId: 5, unit: 'unit', type: 'Equipment', reorderLevel: 0, description: '4WD 50 hp farm tractor with rotavator', status: 'Active' },
    { id: 12, code: 'EQ-002', name: 'Hand tractor', categoryId: 5, unit: 'unit', type: 'Equipment', reorderLevel: 1, description: '8.5 hp hand tractor with trailer', status: 'Active' },
    { id: 13, code: 'EQ-003', name: 'Water pump', categoryId: 5, unit: 'unit', type: 'Equipment', reorderLevel: 1, description: '3-inch gasoline water pump', status: 'Active' },
    { id: 14, code: 'EQ-004', name: 'Grass cutter', categoryId: 5, unit: 'unit', type: 'Equipment', reorderLevel: 2, description: 'Backpack-type brush/grass cutter', status: 'Active' },
    { id: 15, code: 'PM-001', name: 'Coconut seedlings', categoryId: 6, unit: 'pc', type: 'Consumable', reorderLevel: 300, description: 'Tall x Dwarf hybrid coconut seedlings', status: 'Active' }
  ];

  /* ---------------- suppliers ---------------- */
  const suppliers = [
    { id: 1, name: 'Department of Agriculture – Region XI', type: 'DA', contactPerson: 'Regional Field Office Supply Unit', contactNumber: '(082) 293-0109', address: 'Lanang, Davao City', status: 'Active' },
    { id: 2, name: 'Mindanao Agri-Supply Trading (City Procurement Supplier)', type: 'Procurement', contactPerson: 'Rogelio T. Abad', contactNumber: '09181234567', address: 'Rizal St., Magugpo Poblacion, Tagum City', status: 'Active' },
    { id: 3, name: 'Philippine Rice Research Institute (PhilRice)', type: 'DA', contactPerson: 'Seed Distribution Office', contactNumber: '(084) 655-0212', address: 'PhilRice Midsayap, North Cotabato', status: 'Active' },
    { id: 4, name: 'Tagum Agri-Development Foundation', type: 'Donor', contactPerson: 'Corazon B. Lim', contactNumber: '09175550142', address: 'Apokon Road, Tagum City', status: 'Active' },
    { id: 5, name: 'Philippine Coconut Authority – Davao del Norte', type: 'DA', contactPerson: 'Provincial Coconut Development Manager', contactNumber: '(084) 216-3301', address: 'Mankilam, Tagum City', status: 'Active' }
  ];

  /* ---------------- locations ----------------
     Warehouse / storage rows carry room, rack and shelf.
     Field Sites carry a barangay + landmark only (no maps / GPS). */
  const locations = [
    { id: 1, name: 'CAGRO Main Warehouse', type: 'Warehouse', barangay: 'Apokon', address: 'Government Center, Apokon', room: 'Room 1', rack: 'Rack A', shelf: 'Shelf 1', status: 'Active' },
    { id: 2, name: 'CAGRO Main Warehouse', type: 'Warehouse', barangay: 'Apokon', address: 'Government Center, Apokon', room: 'Room 1', rack: 'Rack A', shelf: 'Shelf 2', status: 'Active' },
    { id: 3, name: 'CAGRO Main Warehouse', type: 'Warehouse', barangay: 'Apokon', address: 'Government Center, Apokon', room: 'Room 1', rack: 'Rack B', shelf: 'Shelf 1', status: 'Active' },
    { id: 4, name: 'CAGRO Main Warehouse', type: 'Warehouse', barangay: 'Apokon', address: 'Government Center, Apokon', room: 'Room 2', rack: 'Rack A', shelf: 'Floor pallet 1', status: 'Active' },
    { id: 5, name: 'CAGRO Main Warehouse', type: 'Warehouse', barangay: 'Apokon', address: 'Government Center, Apokon', room: 'Room 2', rack: 'Rack B', shelf: 'Floor pallet 3', status: 'Active' },
    { id: 6, name: 'CAGRO Main Warehouse', type: 'Storage Room', barangay: 'Apokon', address: 'Government Center, Apokon (chemical storage)', room: 'Room 3', rack: 'Rack A', shelf: 'Shelf 1', status: 'Active' },
    { id: 7, name: 'CAGRO Office – Equipment Room', type: 'Storage Room', barangay: 'Apokon', address: 'City Hall Annex, Ground Floor', room: 'Ground Floor', rack: 'Bay 1', shelf: '', status: 'Active' },
    { id: 8, name: 'CAGRO Office – Supply Cabinet', type: 'Office', barangay: 'Apokon', address: 'City Hall Annex, 2nd Floor', room: 'Admin Section', rack: 'Cabinet 2', shelf: '', status: 'Active' },
    { id: 9, name: 'Visayan Village Field Site', type: 'Field Site', barangay: 'Visayan Village', address: 'Purok 3, beside the barangay hall', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 10, name: 'Apokon Field Site', type: 'Field Site', barangay: 'Apokon', address: 'Purok 5, corn demo area near the multi-purpose hall', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 11, name: 'Mankilam Demo Farm', type: 'Field Site', barangay: 'Mankilam', address: 'Purok 2, communal rice techno-demo farm', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 12, name: 'Magugpo East Field Site', type: 'Field Site', barangay: 'Magugpo East', address: 'Barangay covered court storage', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 13, name: 'La Filipina Coconut Nursery', type: 'Field Site', barangay: 'La Filipina', address: 'Seedling nursery along the national highway', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 14, name: 'Pagsabangan Field Site', type: 'Field Site', barangay: 'Pagsabangan', address: 'Purok 1, farmers’ association warehouse', room: '', rack: '', shelf: '', status: 'Active' },
    { id: 15, name: 'Canocotan Field Site', type: 'Field Site', barangay: 'Canocotan', address: 'Purok 4, near the irrigation canal gate', room: '', rack: '', shelf: '', status: 'Active' }
  ];

  /* ---------------- batches ----------------
     Includes: near-expiry (RS-0925, CF-0626, CY-0926), expired (OF-0426, CY-0126),
     low-stock items (corn, complete fertilizer, knapsack sprayer) and an
     out-of-stock item (herbicide). */
  const batches = [
    { id: 1, itemId: 1, lotNo: 'RS-0925', supplierId: 3, drNo: 'DR-PR-2026-0912', dateReceived: D(-70), expiryDate: D(20), qtyReceived: 1500, remarks: 'Certified seeds, 75 bags' },
    { id: 2, itemId: 1, lotNo: 'RS-1026', supplierId: 1, drNo: 'DR-DA11-2026-1103', dateReceived: D(-14), expiryDate: D(165), qtyReceived: 800, remarks: '' },
    { id: 3, itemId: 2, lotNo: 'HC-0726', supplierId: 1, drNo: 'DR-DA11-2026-0718', dateReceived: D(-120), expiryDate: D(95), qtyReceived: 400, remarks: '' },
    { id: 4, itemId: 3, lotNo: 'UR-0826', supplierId: 2, drNo: 'DR-MAS-2026-0821', dateReceived: D(-88), expiryDate: D(560), qtyReceived: 500, remarks: '' },
    { id: 5, itemId: 4, lotNo: 'CF-0626', supplierId: 2, drNo: 'DR-MAS-2026-0610', dateReceived: D(-160), expiryDate: D(12), qtyReceived: 200, remarks: '' },
    { id: 6, itemId: 5, lotNo: 'OF-0426', supplierId: 4, drNo: 'DR-TADF-2026-0415', dateReceived: D(-215), expiryDate: D(-10), qtyReceived: 150, remarks: 'Donation' },
    { id: 7, itemId: 5, lotNo: 'OF-1026', supplierId: 1, drNo: 'DR-DA11-2026-1020', dateReceived: D(-28), expiryDate: D(300), qtyReceived: 250, remarks: '' },
    { id: 8, itemId: 6, lotNo: 'CY-0126', supplierId: 1, drNo: 'DR-DA11-2026-0130', dateReceived: D(-290), expiryDate: D(-25), qtyReceived: 60, remarks: '' },
    { id: 9, itemId: 6, lotNo: 'CY-0926', supplierId: 1, drNo: 'DR-DA11-2026-0915', dateReceived: D(-62), expiryDate: D(25), qtyReceived: 50, remarks: '' },
    { id: 10, itemId: 7, lotNo: 'GL-0526', supplierId: 2, drNo: 'DR-MAS-2026-0520', dateReceived: D(-180), expiryDate: D(400), qtyReceived: 80, remarks: '' },
    { id: 11, itemId: 8, lotNo: 'KS-0326', supplierId: 2, drNo: 'DR-MAS-2026-0318', dateReceived: D(-240), expiryDate: null, qtyReceived: 40, remarks: '' },
    { id: 12, itemId: 9, lotNo: 'SH-0226', supplierId: 2, drNo: 'DR-MAS-2026-0222', dateReceived: D(-268), expiryDate: null, qtyReceived: 100, remarks: '' },
    { id: 13, itemId: 10, lotNo: 'BL-0226', supplierId: 2, drNo: 'DR-MAS-2026-0222', dateReceived: D(-268), expiryDate: null, qtyReceived: 100, remarks: '' },
    { id: 14, itemId: 15, lotNo: 'CS-0926', supplierId: 5, drNo: 'DR-PCA-2026-0925', dateReceived: D(-53), expiryDate: null, qtyReceived: 2000, remarks: 'Planting season 2026' },
    { id: 15, itemId: 11, lotNo: 'TR-0726', supplierId: 1, drNo: 'DR-DA11-2026-0702', dateReceived: D(-138), expiryDate: null, qtyReceived: 1, remarks: 'Farm mechanization program' },
    { id: 16, itemId: 12, lotNo: 'HT-0526', supplierId: 1, drNo: 'DR-DA11-2026-0511', dateReceived: D(-185), expiryDate: null, qtyReceived: 3, remarks: '' },
    { id: 17, itemId: 13, lotNo: 'WP-0626', supplierId: 2, drNo: 'DR-MAS-2026-0619', dateReceived: D(-150), expiryDate: null, qtyReceived: 4, remarks: '' },
    { id: 18, itemId: 14, lotNo: 'GC-0826', supplierId: 4, drNo: 'DR-TADF-2026-0814', dateReceived: D(-95), expiryDate: null, qtyReceived: 5, remarks: 'Donation' }
  ];

  /* ---------------- inventory_stock (quantity per batch per location) ----------------
     Lot RS-0925 is split across two locations (warehouse + Mankilam demo farm). */
  const inventory_stock = [
    { id: 1, batchId: 1, locationId: 2, quantity: 1200 },
    { id: 2, batchId: 1, locationId: 11, quantity: 150 },
    { id: 3, batchId: 2, locationId: 1, quantity: 800 },
    { id: 4, batchId: 3, locationId: 3, quantity: 180 },
    { id: 5, batchId: 4, locationId: 4, quantity: 300 },
    { id: 6, batchId: 4, locationId: 12, quantity: 40 },
    { id: 7, batchId: 5, locationId: 4, quantity: 60 },
    { id: 8, batchId: 6, locationId: 5, quantity: 45 },
    { id: 9, batchId: 7, locationId: 5, quantity: 220 },
    { id: 10, batchId: 8, locationId: 6, quantity: 12 },
    { id: 11, batchId: 9, locationId: 6, quantity: 30 },
    { id: 12, batchId: 10, locationId: 6, quantity: 0 },
    { id: 13, batchId: 11, locationId: 7, quantity: 8 },
    { id: 14, batchId: 12, locationId: 8, quantity: 45 },
    { id: 15, batchId: 13, locationId: 8, quantity: 60 },
    { id: 16, batchId: 14, locationId: 13, quantity: 1500 }
  ];

  /* ---------------- personnel (field technicians) ---------------- */
  const personnel = [
    { id: 1, fullName: 'Juan Dela Cruz', position: 'Agricultural Technologist', division: 'Crop Production Division', contactNumber: '09171112233', status: 'Active' },
    { id: 2, fullName: 'Ma. Cristina L. Labrador', position: 'Agricultural Technologist', division: 'Crop Production Division', contactNumber: '09182223344', status: 'Active' },
    { id: 3, fullName: 'Ramon T. Bautista', position: 'Farm Machinery Operator', division: 'Agricultural Engineering Division', contactNumber: '09193334455', status: 'Active' },
    { id: 4, fullName: 'Elena G. Sarmiento', position: 'Agricultural Extension Worker', division: 'Extension Services Division', contactNumber: '09204445566', status: 'Active' },
    { id: 5, fullName: 'Pedro A. Gonzaga', position: 'Agricultural Technician', division: 'Agricultural Engineering Division', contactNumber: '09215556677', status: 'Active' },
    { id: 6, fullName: 'Liza M. Ocampo', position: 'Senior Agriculturist', division: 'Extension Services Division', contactNumber: '09226667788', status: 'Active' }
  ];

  /* ---------------- equipment units ----------------
     The four-wheel tractor EQ-2026-014 is deployed at the Visayan Village Field Site. */
  const equipment = [
    { id: 1, itemId: 11, batchId: 15, propertyNo: 'EQ-2026-014', serialNo: 'KBT-4WD-558213', condition: 'Good', locationId: 9, status: 'Assigned', personnelId: 1, dateAssigned: D(-75) },
    { id: 2, itemId: 12, batchId: 16, propertyNo: 'EQ-2026-021', serialNo: 'HT-KM-77102', condition: 'Good', locationId: 10, status: 'Assigned', personnelId: 2, dateAssigned: D(-40) },
    { id: 3, itemId: 12, batchId: 16, propertyNo: 'EQ-2026-022', serialNo: 'HT-KM-77103', condition: 'Good', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null },
    { id: 4, itemId: 12, batchId: 16, propertyNo: 'EQ-2026-023', serialNo: 'HT-KM-77109', condition: 'Fair', locationId: 14, status: 'Assigned', personnelId: 3, dateAssigned: D(-21) },
    { id: 5, itemId: 13, batchId: 17, propertyNo: 'EQ-2026-031', serialNo: 'WP-HN-30881', condition: 'Good', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null },
    { id: 6, itemId: 13, batchId: 17, propertyNo: 'EQ-2026-032', serialNo: 'WP-HN-30882', condition: 'Good', locationId: 11, status: 'Assigned', personnelId: 4, dateAssigned: D(-33) },
    { id: 7, itemId: 13, batchId: 17, propertyNo: 'EQ-2026-033', serialNo: 'WP-HN-30890', condition: 'Needs Repair', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null },
    { id: 8, itemId: 13, batchId: 17, propertyNo: 'EQ-2026-034', serialNo: 'WP-HN-30891', condition: 'Unserviceable', locationId: 7, status: 'Disposed', personnelId: null, dateAssigned: null },
    { id: 9, itemId: 14, batchId: 18, propertyNo: 'EQ-2026-041', serialNo: 'GC-ST-11520', condition: 'Good', locationId: 15, status: 'Assigned', personnelId: 5, dateAssigned: D(-12) },
    { id: 10, itemId: 14, batchId: 18, propertyNo: 'EQ-2026-042', serialNo: 'GC-ST-11521', condition: 'Good', locationId: 9, status: 'Assigned', personnelId: 1, dateAssigned: D(-60) },
    { id: 11, itemId: 14, batchId: 18, propertyNo: 'EQ-2026-043', serialNo: 'GC-ST-11522', condition: 'Good', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null },
    { id: 12, itemId: 14, batchId: 18, propertyNo: 'EQ-2026-044', serialNo: 'GC-ST-11523', condition: 'Good', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null },
    { id: 13, itemId: 14, batchId: 18, propertyNo: 'EQ-2026-045', serialNo: 'GC-ST-11524', condition: 'Fair', locationId: 7, status: 'Available', personnelId: null, dateAssigned: null }
  ];

  /* ---------------- custody_assignments (history + current) ---------------- */
  const custody_assignments = [
    { id: 1, equipmentId: 1, personnelId: 3, locationId: 11, dateAssigned: D(-130), conditionOut: 'New', dateReturned: D(-80), conditionIn: 'Good', remarks: 'Land preparation, Mankilam wet season', recordedBy: 2 },
    { id: 2, equipmentId: 1, personnelId: 1, locationId: 9, dateAssigned: D(-75), conditionOut: 'Good', dateReturned: null, conditionIn: '', remarks: 'Deployed for Visayan Village rice cluster', recordedBy: 2 },
    { id: 3, equipmentId: 2, personnelId: 2, locationId: 10, dateAssigned: D(-40), conditionOut: 'Good', dateReturned: null, conditionIn: '', remarks: '', recordedBy: 3 },
    { id: 4, equipmentId: 3, personnelId: 4, locationId: 15, dateAssigned: D(-100), conditionOut: 'Good', dateReturned: D(-50), conditionIn: 'Good', remarks: '', recordedBy: 2 },
    { id: 5, equipmentId: 4, personnelId: 3, locationId: 14, dateAssigned: D(-21), conditionOut: 'Fair', dateReturned: null, conditionIn: '', remarks: '', recordedBy: 2 },
    { id: 6, equipmentId: 6, personnelId: 4, locationId: 11, dateAssigned: D(-33), conditionOut: 'Good', dateReturned: null, conditionIn: '', remarks: 'Irrigation support, dry spell', recordedBy: 3 },
    { id: 7, equipmentId: 7, personnelId: 2, locationId: 10, dateAssigned: D(-90), conditionOut: 'Good', dateReturned: D(-30), conditionIn: 'Needs Repair', remarks: 'Impeller damaged; for repair', recordedBy: 2 },
    { id: 8, equipmentId: 9, personnelId: 5, locationId: 15, dateAssigned: D(-12), conditionOut: 'Good', dateReturned: null, conditionIn: '', remarks: '', recordedBy: 3 },
    { id: 9, equipmentId: 10, personnelId: 1, locationId: 9, dateAssigned: D(-60), conditionOut: 'Good', dateReturned: null, conditionIn: '', remarks: '', recordedBy: 2 }
  ];

  /* ---------------- beneficiaries (farmers and associations) ---------------- */
  const beneficiaries = [
    { id: 1, type: 'Association', name: 'Visayan Village Rice Farmers Association', rsbsaNo: '11-23-15-023-A00012', barangay: 'Visayan Village', contactNumber: '09171239876', status: 'Active' },
    { id: 2, type: 'Association', name: 'Apokon Corn Growers Association', rsbsaNo: '11-23-15-001-A00007', barangay: 'Apokon', contactNumber: '09185553210', status: 'Active' },
    { id: 3, type: 'Association', name: 'Mankilam Irrigators’ Association', rsbsaNo: '11-23-15-015-A00004', barangay: 'Mankilam', contactNumber: '09209871234', status: 'Active' },
    { id: 4, type: 'Association', name: 'La Filipina Coconut Farmers Cooperative', rsbsaNo: '11-23-15-006-A00002', barangay: 'La Filipina', contactNumber: '09173214455', status: 'Active' },
    { id: 5, type: 'Farmer', name: 'Eduardo M. Santos', rsbsaNo: '11-23-15-004-000145', barangay: 'Canocotan', contactNumber: '09121234567', status: 'Active' },
    { id: 6, type: 'Farmer', name: 'Lorna P. Cabahug', rsbsaNo: '11-23-15-018-000233', barangay: 'Pagsabangan', contactNumber: '09337654321', status: 'Active' },
    { id: 7, type: 'Farmer', name: 'Rodel B. Ampong', rsbsaNo: '11-23-15-010-000087', barangay: 'Magugpo East', contactNumber: '09455551234', status: 'Active' },
    { id: 8, type: 'Farmer', name: 'Nenita S. Gumapac', rsbsaNo: '11-23-15-001-000312', barangay: 'Apokon', contactNumber: '09561237788', status: 'Active' },
    { id: 9, type: 'Farmer', name: 'Arnel C. Tumulak', rsbsaNo: '11-23-15-023-000519', barangay: 'Visayan Village', contactNumber: '09774561230', status: 'Active' }
  ];

  /* ---------------- stock_requests (every status) ----------------
     decidedBy/decidedAt = approval or rejection step. */
  const R = (o) => Object.assign({
    risNo: '', requesterType: 'Beneficiary', requesterId: null, purpose: '', targetLocationId: null,
    adjustmentReason: '', adjustmentDirection: '', status: 'Pending', recordedBy: 2, recordedAt: '',
    decidedBy: null, decidedAt: null, decisionRemarks: '', releasedBy: null, releasedAt: null
  }, o);
  const stock_requests = [
    R({ id: 1, requestNo: 'REQ-2026-0080', type: 'Release', risNo: 'RIS-2026-09-077', requesterId: 4, purpose: 'Coconut replanting program, 25 member farmers', status: 'Released', recordedBy: 2, recordedAt: DT(-46, '09:12'), decidedBy: 1, decidedAt: DT(-45, '10:30'), decisionRemarks: 'Approved per replanting plan', releasedBy: 2, releasedAt: DT(-45, '14:05') }),
    R({ id: 2, requestNo: 'REQ-2026-0084', type: 'Release', risNo: 'RIS-2026-10-090', requesterId: 9, purpose: 'Pest control for 1.5 ha rice farm', status: 'Released', recordedBy: 3, recordedAt: DT(-36, '08:44'), decidedBy: 1, decidedAt: DT(-36, '11:02'), releasedBy: 3, releasedAt: DT(-35, '09:20') }),
    R({ id: 3, requestNo: 'REQ-2026-0086', type: 'Transfer', risNo: 'RIS-2026-10-102', requesterType: 'Personnel', requesterId: 4, purpose: 'Pre-position urea for Magugpo East farmers', targetLocationId: 12, status: 'Released', recordedBy: 2, recordedAt: DT(-41, '13:15'), decidedBy: 1, decidedAt: DT(-41, '15:40'), releasedBy: 2, releasedAt: DT(-40, '08:30') }),
    R({ id: 4, requestNo: 'REQ-2026-0090', type: 'Transfer', risNo: 'RIS-2026-10-118', requesterType: 'Personnel', requesterId: 2, purpose: 'Stock rice seeds at Mankilam demo farm for techno-demo planting', targetLocationId: 11, status: 'Released', recordedBy: 2, recordedAt: DT(-30, '08:40'), decidedBy: 1, decidedAt: DT(-29, '10:05'), releasedBy: 2, releasedAt: DT(-28, '09:30') }),
    R({ id: 5, requestNo: 'REQ-2026-0095', type: 'Release', risNo: 'RIS-2026-11-030', requesterId: 7, purpose: 'Land clearing tools for new farm area', status: 'Rejected', recordedBy: 2, recordedAt: DT(-6, '09:11'), decidedBy: 1, decidedAt: DT(-5, '11:45'), decisionRemarks: 'Bolos are reserved for association-based distribution. Please file through your association.' }),
    R({ id: 6, requestNo: 'REQ-2026-0098', type: 'Release', risNo: 'RIS-2026-11-035', requesterId: 2, purpose: 'Corn production program – dry season planting', status: 'Approved', recordedBy: 3, recordedAt: DT(-3, '14:02'), decidedBy: 1, decidedAt: DT(-2, '09:10'), decisionRemarks: 'Approved 50 kg; balance reserved for Canocotan.' }),
    R({ id: 7, requestNo: 'REQ-2026-0099', type: 'Adjustment', risNo: '', requesterType: 'Personnel', requesterId: 6, purpose: 'Bags torn and soaked during heavy rains; contents caked and unusable', adjustmentReason: 'Spoilage', adjustmentDirection: 'Decrease', status: 'Pending', recordedBy: 3, recordedAt: DT(-2, '16:30') }),
    R({ id: 8, requestNo: 'REQ-2026-0101', type: 'Release', risNo: 'RIS-2026-11-041', requesterId: 1, purpose: 'Wet season rice planting, 20 member farmers', status: 'Pending', recordedBy: 2, recordedAt: DT(-1, '10:24') }),
    R({ id: 9, requestNo: 'REQ-2026-0102', type: 'Release', risNo: 'RIS-2026-11-043', requesterId: 3, purpose: 'Fertilizer support for irrigated rice area', status: 'Pending', recordedBy: 1, recordedAt: DT(0, '08:15') })
  ];

  /* ---------------- request_items (lines) ---------------- */
  const request_items = [
    { id: 1, requestId: 1, itemId: 15, qtyRequested: 500, qtyApproved: 500, batchesUsed: [{ batchId: 14, locationId: 13, qty: 500 }] },
    { id: 2, requestId: 2, itemId: 8, qtyRequested: 2, qtyApproved: 2, batchesUsed: [{ batchId: 11, locationId: 7, qty: 2 }] },
    { id: 3, requestId: 3, itemId: 3, qtyRequested: 40, qtyApproved: 40, batchesUsed: [{ batchId: 4, locationId: 4, qty: 40, toLocationId: 12 }] },
    { id: 4, requestId: 4, itemId: 1, qtyRequested: 150, qtyApproved: 150, batchesUsed: [{ batchId: 1, locationId: 2, qty: 150, toLocationId: 11 }] },
    { id: 5, requestId: 5, itemId: 10, qtyRequested: 10, qtyApproved: null, batchesUsed: [] },
    { id: 6, requestId: 6, itemId: 2, qtyRequested: 60, qtyApproved: 50, batchesUsed: [] },
    { id: 7, requestId: 7, itemId: 5, qtyRequested: 5, qtyApproved: null, batchesUsed: [] },
    { id: 8, requestId: 8, itemId: 1, qtyRequested: 400, qtyApproved: null, batchesUsed: [] },
    { id: 9, requestId: 9, itemId: 3, qtyRequested: 50, qtyApproved: null, batchesUsed: [] }
  ];

  /* ---------------- stock_transactions (last ~6 months) ---------------- */
  const stock_transactions = [];
  const T = (o) => stock_transactions.push(Object.assign({
    id: stock_transactions.length + 1, toLocationId: null, equipmentId: null, refNo: '', remarks: ''
  }, o));
  // Stock-in of every batch, at its first storage location.
  const firstLoc = { 1: 2, 2: 1, 3: 3, 4: 4, 5: 4, 6: 5, 7: 5, 8: 6, 9: 6, 10: 6, 11: 7, 12: 8, 13: 8, 14: 13, 15: 7, 16: 7, 17: 7, 18: 7 };
  const stockInUser = { 1: 2, 2: 3, 3: 2, 4: 2, 5: 3, 6: 2, 7: 3, 8: 2, 9: 2, 10: 3, 11: 2, 12: 3, 13: 3, 14: 2, 15: 2, 16: 3, 17: 2, 18: 3 };
  batches.forEach((b) => T({
    date: b.dateReceived + 'T08:30:00', type: 'Stock-In', itemId: b.itemId, batchId: b.id,
    locationId: firstLoc[b.id], quantity: b.qtyReceived, userId: stockInUser[b.id], refNo: b.drNo, remarks: 'Delivery received'
  }));
  // Releases, transfers (consistent with the current balances above).
  const rel = (off, time, itemId, batchId, loc, qty, ref, user, remarks) => T({ date: DT(off, time), type: 'Release', itemId, batchId, locationId: loc, quantity: qty, userId: user, refNo: ref, remarks: remarks || '' });
  rel(-165, '10:10', 6, 8, 6, 20, 'RIS-2026-06-021', 2, 'Released to Canocotan rice farmers');
  rel(-160, '14:00', 7, 10, 6, 30, 'RIS-2026-06-028', 3, 'Released to Pagsabangan farmers');
  rel(-150, '09:45', 4, 5, 4, 40, 'RIS-2026-06-040', 2);
  rel(-140, '11:20', 9, 12, 8, 30, 'RIS-2026-07-006', 3);
  rel(-135, '15:05', 10, 13, 8, 25, 'RIS-2026-07-011', 2);
  rel(-130, '09:30', 8, 11, 7, 30, 'RIS-2026-07-015', 2, 'Sprayers for Visayan Village RFA');
  rel(-125, '13:40', 7, 10, 6, 25, 'RIS-2026-07-023', 3);
  rel(-118, '08:55', 2, 3, 3, 120, 'RIS-2026-07-031', 2, 'Apokon corn cluster');
  rel(-110, '10:15', 6, 8, 6, 28, 'RIS-2026-08-004', 3);
  rel(-100, '14:25', 4, 5, 4, 50, 'RIS-2026-08-019', 2);
  rel(-95, '09:05', 9, 12, 8, 25, 'RIS-2026-08-027', 3);
  rel(-88, '11:50', 2, 3, 3, 100, 'RIS-2026-08-035', 2);
  rel(-80, '10:40', 3, 4, 4, 90, 'RIS-2026-09-002', 3);
  rel(-75, '13:10', 5, 6, 5, 105, 'RIS-2026-09-010', 2);
  rel(-70, '15:30', 4, 5, 4, 50, 'RIS-2026-09-014', 3);
  rel(-62, '09:20', 7, 10, 6, 25, 'RIS-2026-09-031', 2);
  rel(-60, '10:00', 1, 1, 2, 150, 'RIS-2026-09-036', 2, 'Canocotan rice farmers');
  rel(-50, '14:45', 10, 13, 8, 15, 'RIS-2026-09-058', 3);
  rel(-45, '14:05', 15, 14, 13, 500, 'RIS-2026-09-077', 2, 'REQ-2026-0080');
  T({ date: DT(-40, '08:30'), type: 'Transfer', itemId: 3, batchId: 4, locationId: 4, toLocationId: 12, quantity: 40, userId: 2, refNo: 'RIS-2026-10-102', remarks: 'REQ-2026-0086' });
  rel(-35, '09:20', 8, 11, 7, 2, 'RIS-2026-10-090', 3, 'REQ-2026-0084');
  T({ date: DT(-28, '09:30'), type: 'Transfer', itemId: 1, batchId: 1, locationId: 2, toLocationId: 11, quantity: 150, userId: 2, refNo: 'RIS-2026-10-118', remarks: 'REQ-2026-0090' });
  rel(-20, '10:35', 3, 4, 4, 70, 'RIS-2026-10-131', 3);
  rel(-15, '13:15', 6, 9, 6, 20, 'RIS-2026-11-008', 2);
  rel(-10, '09:50', 5, 7, 5, 30, 'RIS-2026-11-019', 3);
  // Equipment custody movements (assign / return) from the custody history.
  custody_assignments.forEach((c) => {
    const eq = equipment.find((e) => e.id === c.equipmentId);
    T({ date: c.dateAssigned + 'T10:00:00', type: 'Assign', itemId: eq.itemId, batchId: eq.batchId, equipmentId: eq.id, locationId: 7, toLocationId: c.locationId, quantity: 1, userId: c.recordedBy, refNo: eq.propertyNo, remarks: 'Assigned to ' + personnel.find((p) => p.id === c.personnelId).fullName });
    if (c.dateReturned) {
      T({ date: c.dateReturned + 'T15:00:00', type: 'Return', itemId: eq.itemId, batchId: eq.batchId, equipmentId: eq.id, locationId: c.locationId, toLocationId: 7, quantity: 1, userId: c.recordedBy, refNo: eq.propertyNo, remarks: 'Returned, condition: ' + c.conditionIn });
    }
  });
  stock_transactions.sort((a, b) => a.date.localeCompare(b.date)).forEach((t, i) => { t.id = i + 1; });

  /* ---------------- activity_log ---------------- */
  const L = [];
  const log = (ts, userId, action, module, recordId, oldValue, newValue, details) => L.push({
    id: L.length + 1, ts, userId, userName: users.find((u) => u.id === userId).fullName,
    action, module, recordId, oldValue, newValue, details: details || ''
  });
  log(DT(-46, '09:12'), 2, 'Create', 'Requests', 'REQ-2026-0080', null, { type: 'Release', status: 'Pending', items: 'Coconut seedlings × 500' });
  log(DT(-45, '10:30'), 1, 'Approve', 'Requests', 'REQ-2026-0080', { status: 'Pending' }, { status: 'Approved', 'Coconut seedlings': 500 });
  log(DT(-45, '14:05'), 2, 'Release', 'Requests', 'REQ-2026-0080', { status: 'Approved' }, { status: 'Released', batches: 'CS-0926 × 500' });
  log(DT(-30, '08:02'), 2, 'Login', 'Authentication', 'staff', null, null, 'Signed in');
  log(DT(-30, '08:40'), 2, 'Create', 'Requests', 'REQ-2026-0090', null, { type: 'Transfer', status: 'Pending', items: 'Rice seeds (Inbred) × 150' });
  log(DT(-29, '10:05'), 1, 'Approve', 'Requests', 'REQ-2026-0090', { status: 'Pending' }, { status: 'Approved', 'Rice seeds (Inbred)': 150 });
  log(DT(-28, '09:30'), 2, 'Release', 'Requests', 'REQ-2026-0090', { status: 'Approved' }, { status: 'Released', batches: 'RS-0925 × 150 → Mankilam Demo Farm' });
  log(DT(-24, '16:45'), 1, 'Deactivate', 'Users', 'amendoza', { status: 'Active' }, { status: 'Inactive' }, 'On extended leave');
  log(DT(-14, '13:20'), 3, 'Create', 'Stock-In', 'RS-1026', null, { item: 'Rice seeds (Inbred)', quantity: 800, location: 'CAGRO Main Warehouse, Room 1, Rack A, Shelf 1', dr: 'DR-DA11-2026-1103' });
  log(DT(-10, '15:12'), 1, 'Update', 'Master Data', 'SUP-0002', { contactNumber: '09170001122' }, { contactNumber: '09181234567' }, 'Supplier contact updated');
  log(DT(-6, '09:11'), 2, 'Create', 'Requests', 'REQ-2026-0095', null, { type: 'Release', status: 'Pending', items: 'Bolo × 10' });
  log(DT(-5, '11:45'), 1, 'Reject', 'Requests', 'REQ-2026-0095', { status: 'Pending' }, { status: 'Rejected', remarks: 'Bolos are reserved for association-based distribution.' });
  log(DT(-3, '14:02'), 3, 'Create', 'Requests', 'REQ-2026-0098', null, { type: 'Release', status: 'Pending', items: 'Hybrid corn seeds × 60' });
  log(DT(-2, '09:10'), 1, 'Approve', 'Requests', 'REQ-2026-0098', { status: 'Pending', 'Hybrid corn seeds': 60 }, { status: 'Approved', 'Hybrid corn seeds': 50 });
  log(DT(-2, '16:30'), 3, 'Create', 'Requests', 'REQ-2026-0099', null, { type: 'Adjustment', reason: 'Spoilage', items: 'Organic fertilizer × 5' });
  log(DT(-1, '10:20'), 2, 'Login', 'Authentication', 'staff', null, null, 'Signed in');
  log(DT(-1, '10:24'), 2, 'Create', 'Requests', 'REQ-2026-0101', null, { type: 'Release', status: 'Pending', items: 'Rice seeds (Inbred) × 400' });
  log(DT(-1, '16:05'), 1, 'Export', 'Reports', 'RPT-0003', null, { report: 'Current Inventory', format: 'PDF' });
  log(DT(-1, '17:00'), 1, 'Logout', 'Authentication', 'admin', null, null, 'Signed out');
  log(DT(0, '08:05'), 1, 'Login', 'Authentication', 'admin', null, null, 'Signed in');
  log(DT(0, '08:15'), 1, 'Create', 'Requests', 'REQ-2026-0102', null, { type: 'Release', status: 'Pending', items: 'Urea fertilizer 46-0-0 × 50' });

  /* ---------------- report_log ---------------- */
  const report_log = [
    { id: 1, ts: DT(-20, '15:00'), userId: 2, reportType: 'Stock Movement', dateFrom: D(-50), dateTo: D(-20), format: 'Excel (CSV)' },
    { id: 2, ts: DT(-8, '10:15'), userId: 3, reportType: 'Near-Expiry & Expired', dateFrom: D(-38), dateTo: D(-8), format: 'Preview' },
    { id: 3, ts: DT(-1, '16:05'), userId: 1, reportType: 'Current Inventory', dateFrom: D(-31), dateTo: D(-1), format: 'PDF' }
  ];

  /* ---------------- system_settings ---------------- */
  const system_settings = {
    nearExpiryDays: 30,
    emailNotifications: true,
    sessionTimeout: 15,
    officeName: 'City Agriculture Office (CAGRO)',
    lguName: 'City Government of Tagum',
    officeAddress: 'City Hall Annex, Government Center, Apokon, Tagum City, Davao del Norte 8100',
    officeHead: 'City Agriculturist',
    contactNumber: '(084) 655-9000',
    officeEmail: 'cagro@tagumcity.gov.ph',
    lastAlertCheck: null
  };

  return {
    users, categories, items, suppliers, locations, batches, inventory_stock, equipment,
    custody_assignments, personnel, beneficiaries, stock_requests, request_items,
    stock_transactions, notifications: [], activity_log: L, report_log, system_settings
  };
}
