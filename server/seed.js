// Vult de database met realistische testdata. Idempotent: wist alles eerst.
// Draaien:   npm run seed   (of: node seed.js)

const db = require('./db');
const bcrypt = require('bcrypt');
const { nowDutchISO } = require('./utils');

const BCRYPT_COST = 10;

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function currentDutchYear() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).format(new Date());
}

const seed = db.transaction(() => {
  // Wis in juiste volgorde. bons → CASCADE wist bon_items; users mag pas
  // weg als er geen bonnen meer naar verwijzen (FK RESTRICT).
  db.prepare('DELETE FROM bons').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM materials').run();
  db.prepare('DELETE FROM sets').run();
  db.prepare(
    "DELETE FROM sqlite_sequence WHERE name IN ('bons','bon_items','users','materials','sets')",
  ).run();

  const now = nowDutchISO();

  // ---- Users -------------------------------------------------------------
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, login_barcode, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const users = [
    { name: 'Admin',            email: 'admin@example.com', password: 'admin123', role: 'admin', barcode: 'USR-ADMIN' },
    { name: 'Jan Vrijwilliger', email: 'jan@example.com',   password: 'user123',  role: 'user',  barcode: 'USR-JAN'   },
  ];
  for (const u of users) {
    u.id = insertUser.run(
      u.name, u.email, bcrypt.hashSync(u.password, BCRYPT_COST), u.role, u.barcode, now,
    ).lastInsertRowid;
  }

  // ---- Materials ---------------------------------------------------------
  const insertMat = db.prepare(`
    INSERT INTO materials
      (name, category, stock, unit, type, location, notes, purchase_link, barcode, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);
  const materialDefs = [
    ['Voetbal',     'sport',       10, 'stuk', 'uniek', 'rek A1',  'MAT-VTB-001'],
    ['Pion',        'sport',       30, 'stuk', 'bulk',  'rek A2',  'MAT-PIO-001'],
    ['Springtouw',  'sport',       12, 'stuk', 'uniek', 'rek A3',  'MAT-SPT-001'],
    ['Verfdoos',    'knutsel',      5, 'doos', 'uniek', 'kast B1', 'MAT-VRF-001'],
    ['Lijmpistool', 'knutsel',      4, 'stuk', 'uniek', 'kast B2', 'MAT-LJM-001'],
    ['Tape',        'knutsel',     20, 'rol',  'bulk',  'kast B3', 'MAT-TAP-001'],
    ['Schaar',      'gereedschap', 12, 'stuk', 'uniek', 'lade C1', 'MAT-SCH-001'],
    ['Hamer',       'gereedschap',  3, 'stuk', 'uniek', 'lade C2', 'MAT-HAM-001'],
  ];
  const materials = materialDefs.map((row) => {
    const info = insertMat.run(...row, now, now);
    return { id: info.lastInsertRowid, name: row[0], category: row[1], stock: row[2] };
  });
  const matByName = Object.fromEntries(materials.map((m) => [m.name, m]));

  // ---- Sets --------------------------------------------------------------
  const insertSet = db.prepare(`
    INSERT INTO sets
      (name, category, stock, composition, location, notes, purchase_link, barcode, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
  `);
  const setDefs = [
    ['Speeltjeskist', 'sport',   2, '5x bal, 2x springtouw, 1x net',          'rek A4',  'SET-SPK-001'],
    ['Knutselbox',    'knutsel', 1, '10x verf, 20x kwast, 5x lijmpistool',    'kast B4', 'SET-KNB-001'],
  ];
  const sets = setDefs.map((row) => {
    const info = insertSet.run(...row, now, now);
    return { id: info.lastInsertRowid, name: row[0], stock: row[2] };
  });
  const setByName = Object.fromEntries(sets.map((s) => [s.name, s]));

  // ---- Bonnen ------------------------------------------------------------
  const insertBon = db.prepare(`
    INSERT INTO bons (bon_number, user_id, start_date, return_date, status, notes, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBonItem = db.prepare(`
    INSERT INTO bon_items (bon_id, material_id, set_id, quantity, returned, picked_up)
    VALUES (?, ?, ?, ?, 0, ?)
  `);

  const year = currentDutchYear();
  const jan = users.find((u) => u.email === 'jan@example.com');

  // Bon 1: reserved (start in 5 dagen, items nog niet opgehaald)
  const reservedId = insertBon.run(
    `BON-${year}-0001`, jan.id, addDaysISO(5), addDaysISO(10),
    'reserved', 'Voor sportles volgende week', now, null,
  ).lastInsertRowid;
  insertBonItem.run(reservedId, matByName['Voetbal'].id, null, 2, 0);
  insertBonItem.run(reservedId, null, setByName['Speeltjeskist'].id, 1, 0);

  // Bon 2: active (start 2 dagen geleden, items zijn opgehaald)
  const activeId = insertBon.run(
    `BON-${year}-0002`, jan.id, addDaysISO(-2), addDaysISO(5),
    'active', 'Lopende uitleen', now, null,
  ).lastInsertRowid;
  insertBonItem.run(activeId, matByName['Lijmpistool'].id, null, 1, 1);
  insertBonItem.run(activeId, matByName['Pion'].id,        null, 5, 1);

  return {
    users, materials, sets,
    bons: [
      { id: reservedId, bon_number: `BON-${year}-0001`, status: 'reserved' },
      { id: activeId,   bon_number: `BON-${year}-0002`, status: 'active'   },
    ],
  };
});

const result = seed();

console.log('Seed klaar.\n');
console.log('Gebruikers:');
for (const u of result.users) {
  console.log(`  [${u.id}] ${u.name.padEnd(18)} ${u.email.padEnd(22)} wachtwoord: ${u.password}`);
}
console.log(`\nMaterialen (${result.materials.length}):`);
for (const m of result.materials) {
  console.log(`  [${m.id}] ${m.name.padEnd(12)} ${m.category.padEnd(12)} stock: ${m.stock}`);
}
console.log(`\nSets (${result.sets.length}):`);
for (const s of result.sets) {
  console.log(`  [${s.id}] ${s.name.padEnd(14)} stock: ${s.stock}`);
}
console.log(`\nBonnen (${result.bons.length}):`);
for (const b of result.bons) {
  console.log(`  [${b.id}] ${b.bon_number} — status: ${b.status}`);
}
