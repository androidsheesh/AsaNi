/* =====================================================================
   Asa ni? — app.js
   Router, layout (sidebar + top bar), login / roles, session timeout,
   localStorage persistence, computed inventory rules and shared UI
   helpers (modals, toasts, forms, tables, charts, CSV export).
   Page render functions live in pages.js (object `Pages`).
   ===================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* 1. Persistence (localStorage)                                       */
/* ------------------------------------------------------------------ */
const STORE_KEY = 'asani_db_v1';
const SESSION_KEY = 'asani_session_v1';
const REMEMBER_KEY = 'asani_remember_user';

/** The in-memory database. Every table from data.js lives here. */
let DB = null;

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    DB = raw ? JSON.parse(raw) : null;
  } catch (e) { DB = null; }
  if (!DB || !DB.items) {
    DB = buildSeedData();
    syncAlerts();
    saveDB();
  }
}

function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) { /* storage blocked: demo still works in memory */ }
}

/** Restores the original mock data (Settings → Reset demo data). */
function resetDB() {
  DB = buildSeedData();
  syncAlerts();
  saveDB();
}

/** Next numeric primary key for a table. */
function nextId(table) {
  return DB[table].reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

/** Finds a row by id (ids may arrive as strings from the URL or a <select>). */
function byId(table, id) {
  if (id === null || id === undefined || id === '') return null;
  return DB[table].find((r) => r.id === Number(id)) || null;
}

/* ------------------------------------------------------------------ */
/* 2. General utilities                                                */
/* ------------------------------------------------------------------ */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');

/** Escapes text for safe insertion into HTML. */
function esc(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtNum(n) { return Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 }); }
function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayISO() { return isoDate(new Date()); }
function nowStamp() {
  const d = new Date();
  return isoDate(d) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
/** "03 Sep 2026" */
function fmtDate(s) {
  const d = parseDate(s);
  return d ? pad2(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '—';
}
/** "03 Sep 2026, 2:05 PM" */
function fmtDateTime(s) {
  if (!s) return '—';
  const [h, m] = String(s).slice(11, 16).split(':').map(Number);
  if (isNaN(h)) return fmtDate(s);
  return fmtDate(s) + ', ' + ((h % 12) || 12) + ':' + pad2(m) + ' ' + (h < 12 ? 'AM' : 'PM');
}
/** Expiry date minus today, in days (negative = expired). */
function daysTo(s) {
  if (!s) return null;
  return Math.round((parseDate(s) - parseDate(todayISO())) / 86400000);
}
function addDays(iso, n) { const d = parseDate(iso); d.setDate(d.getDate() + n); return isoDate(d); }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function recId(prefix, id) { return prefix + '-' + String(id).padStart(4, '0'); }
function settings() { return DB.system_settings; }

/** Wraps matches of `q` in <mark> (input is raw text, output is safe HTML). */
function highlight(text, q) {
  const s = String(text === null || text === undefined ? '' : text);
  if (!q) return esc(s);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return s.split(re).map((part, i) => (i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part))).join('');
}

/* ------------------------------------------------------------------ */
/* 3. Icons (inline SVG, no icon library)                              */
/* ------------------------------------------------------------------ */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  stockin: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  pin: '<path d="M12 21s-7-6.1-7-12a7 7 0 0 1 14 0c0 5.9-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>'
};
function icon(name, size) {
  const s = size || 18;
  return '<svg class="icon" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
}

/* ------------------------------------------------------------------ */
/* 4. Domain rules (computed, never stored)                            */
/* ------------------------------------------------------------------ */
const CONSUMABLE_EXPIRY_CATEGORIES = ['Seeds', 'Fertilizers', 'Pesticides'];

function categoryName(id) { const c = byId('categories', id); return c ? c.name : '—'; }
function supplierName(id) { const s = byId('suppliers', id); return s ? s.name : '—'; }
function personName(id) { const p = byId('personnel', id); return p ? p.fullName : '—'; }
function userName(id) { const u = byId('users', id); return u ? u.fullName : '—'; }

/** Full human label of a location, e.g. "CAGRO Main Warehouse, Room 1, Rack A, Shelf 2". */
function locLabel(locOrId) {
  const l = typeof locOrId === 'object' ? locOrId : byId('locations', locOrId);
  if (!l) return '—';
  if (l.type === 'Field Site') return l.name + (l.address ? ', ' + l.address : '');
  return [l.name, l.room, l.rack, l.shelf].filter(Boolean).join(', ');
}

/** Quantity of a batch across all its locations. */
function batchQty(batchId) {
  return DB.inventory_stock.reduce((s, r) => (r.batchId === batchId ? s + r.quantity : s), 0);
}
function itemBatches(itemId) { return DB.batches.filter((b) => b.itemId === itemId); }

/** Total on hand: sum of every batch/location (equipment: number of non-disposed units). */
function itemTotal(item) {
  if (item.type === 'Equipment') return DB.equipment.filter((e) => e.itemId === item.id && e.status !== 'Disposed').length;
  const ids = new Set(itemBatches(item.id).map((b) => b.id));
  return DB.inventory_stock.reduce((s, r) => (ids.has(r.batchId) ? s + r.quantity : s), 0);
}

/** Expiry status of a single batch: 'Expired', 'Near Expiry' or null. */
function batchExpiryStatus(batch) {
  if (!batch.expiryDate) return null;
  const d = daysTo(batch.expiryDate);
  if (d < 0) return 'Expired';
  if (d <= settings().nearExpiryDays) return 'Near Expiry';
  return null;
}

/**
 * Item status, in the order given by the specification:
 * Out of Stock (qty 0) → Low Stock (qty ≤ reorder) → Expired → Near Expiry → In Stock.
 */
function itemStatus(item) {
  const total = itemTotal(item);
  if (total === 0) return 'Out of Stock';
  if (total <= item.reorderLevel) return 'Low Stock';
  const stocked = itemBatches(item.id).filter((b) => batchQty(b.id) > 0);
  if (stocked.some((b) => batchExpiryStatus(b) === 'Expired')) return 'Expired';
  if (stocked.some((b) => batchExpiryStatus(b) === 'Near Expiry')) return 'Near Expiry';
  return 'In Stock';
}

/** Quantity that can still be released (excludes expired batches). */
function releasableQty(itemId) {
  return DB.inventory_stock.reduce((s, r) => {
    const b = byId('batches', r.batchId);
    return b.itemId === itemId && batchExpiryStatus(b) !== 'Expired' ? s + r.quantity : s;
  }, 0);
}

/**
 * FEFO plan: takes stock from the batch nearest to expiry first
 * (batches without expiry last, then oldest delivery first).
 * Returns { plan: [{stockId, batchId, locationId, qty}], shortage }.
 */
function fefoPlan(itemId, qty, opts) {
  const o = opts || {};
  const rows = DB.inventory_stock
    .filter((s) => s.quantity > 0 && s.locationId !== o.excludeLocationId)
    .map((s) => ({ s, b: byId('batches', s.batchId) }))
    .filter((x) => x.b.itemId === itemId && (o.includeExpired || batchExpiryStatus(x.b) !== 'Expired'));
  const key = (b) => (b.expiryDate ? parseDate(b.expiryDate).getTime() : Infinity);
  rows.sort((a, c) => {
    const ka = key(a.b), kc = key(c.b);
    if (ka !== kc) return ka < kc ? -1 : 1;
    const r = a.b.dateReceived.localeCompare(c.b.dateReceived);
    return r || c.s.quantity - a.s.quantity;
  });
  let remaining = qty;
  const plan = [];
  for (const x of rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, x.s.quantity);
    plan.push({ stockId: x.s.id, batchId: x.b.id, locationId: x.s.locationId, qty: take });
    remaining -= take;
  }
  return { plan, shortage: Math.max(0, remaining) };
}

/** Every place an item is located (stock rows, or equipment units). */
function itemPlaces(item) {
  if (item.type === 'Equipment') {
    return DB.equipment.filter((e) => e.itemId === item.id && e.status !== 'Disposed').map((e) => ({
      kind: 'unit', unit: e, loc: byId('locations', e.locationId), qty: 1, batch: byId('batches', e.batchId)
    }));
  }
  return DB.inventory_stock.filter((s) => s.quantity > 0).map((s) => ({ s, b: byId('batches', s.batchId) }))
    .filter((x) => x.b.itemId === item.id)
    .map((x) => ({ kind: 'stock', stock: x.s, batch: x.b, loc: byId('locations', x.s.locationId), qty: x.s.quantity }));
}

/* ------------------------------------------------------------------ */
/* 5. Alerts / notifications ("checked automatically every day")       */
/* ------------------------------------------------------------------ */
function computeAlerts() {
  const out = [];
  DB.items.filter((i) => i.status === 'Active').forEach((item) => {
    const total = itemTotal(item);
    if (total <= item.reorderLevel) {
      out.push({
        key: 'LOW-' + item.id, type: 'Low Stock', itemId: item.id, batchId: null,
        message: total === 0
          ? item.name + ' is out of stock (reorder level: ' + fmtNum(item.reorderLevel) + ' ' + item.unit + ').'
          : item.name + ' is low: ' + fmtNum(total) + ' ' + item.unit + ' left (reorder level: ' + fmtNum(item.reorderLevel) + ').'
      });
    }
  });
  DB.batches.forEach((b) => {
    const item = byId('items', b.itemId);
    const qty = batchQty(b.id);
    if (!item || item.status !== 'Active' || qty <= 0) return;
    const st = batchExpiryStatus(b);
    const d = daysTo(b.expiryDate);
    if (st === 'Expired') {
      out.push({ key: 'EXP-' + b.id, type: 'Expired', itemId: item.id, batchId: b.id, message: item.name + ', Lot ' + b.lotNo + ' (' + fmtNum(qty) + ' ' + item.unit + ') expired on ' + fmtDate(b.expiryDate) + ' (' + Math.abs(d) + ' days ago).' });
    } else if (st === 'Near Expiry') {
      out.push({ key: 'NEAR-' + b.id, type: 'Near Expiry', itemId: item.id, batchId: b.id, message: item.name + ', Lot ' + b.lotNo + ' (' + fmtNum(qty) + ' ' + item.unit + ') expires on ' + fmtDate(b.expiryDate) + ' (in ' + d + ' days).' });
    }
  });
  return out;
}

/**
 * Compares current alerts with stored notifications:
 * new alert → new notification; alert no longer true → auto-resolved.
 * A notification a user resolved manually is not re-created while the
 * condition still holds.
 */
function syncAlerts() {
  const alerts = computeAlerts();
  const keys = new Set(alerts.map((a) => a.key));
  alerts.forEach((a) => {
    const existing = DB.notifications.filter((n) => n.key === a.key).sort((x, y) => y.id - x.id)[0];
    if (existing && !(existing.resolved && existing.autoResolved)) {
      if (!existing.resolved) existing.message = a.message;
      return;
    }
    DB.notifications.push(Object.assign({ id: nextId('notifications'), createdAt: nowStamp(), read: false, resolved: false, autoResolved: false, resolvedAt: null, resolvedBy: null }, a));
  });
  DB.notifications.forEach((n) => {
    if (!n.resolved && !keys.has(n.key)) {
      n.resolved = true; n.autoResolved = true; n.resolvedAt = nowStamp(); n.resolvedBy = 'System';
    }
  });
  DB.system_settings.lastAlertCheck = nowStamp();
}

/** Daily check: runs the alert check when the last one was not today. */
function dailyAlertCheck() {
  const last = DB.system_settings.lastAlertCheck;
  if (!last || last.slice(0, 10) !== todayISO()) { syncAlerts(); saveDB(); }
}

function openNotifications() { return DB.notifications.filter((n) => !n.resolved); }

/* ------------------------------------------------------------------ */
/* 6. Activity log                                                     */
/* ------------------------------------------------------------------ */
/**
 * Adds an entry to the Activity Log.
 * action: Login | Logout | Create | Update | Approve | Reject | Release | Deactivate | Export
 * module: Authentication | Users | Master Data | Inventory | Stock-In | Requests | Equipment | Reports | Settings
 */
function logAction(action, module, recordId, oldValue, newValue, details, userOverride) {
  const u = userOverride || currentUser();
  DB.activity_log.push({
    id: nextId('activity_log'), ts: nowStamp(), userId: u ? u.id : null, userName: u ? u.fullName : 'System',
    action, module, recordId: recordId === null || recordId === undefined ? '' : String(recordId),
    oldValue: oldValue || null, newValue: newValue || null, details: details || ''
  });
  saveDB();
}

/** Returns only the changed keys of two objects: {old, new}. */
function diff(oldObj, newObj, keys) {
  const o = {}, n = {};
  (keys || Object.keys(newObj)).forEach((k) => {
    if (String(oldObj[k] === null || oldObj[k] === undefined ? '' : oldObj[k]) !== String(newObj[k] === null || newObj[k] === undefined ? '' : newObj[k])) {
      o[k] = oldObj[k]; n[k] = newObj[k];
    }
  });
  return { old: o, new: n, changed: Object.keys(n).length > 0 };
}

/* ------------------------------------------------------------------ */
/* 7. Authentication, roles and session timeout                        */
/* ------------------------------------------------------------------ */
const ROLES = { ADMIN: 'Administrator', STAFF: 'Inventory Staff' };
const ADMIN_ONLY_PAGES = ['activity-log', 'users', 'settings'];

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
function setSession(s, remember) {
  try {
    const str = JSON.stringify(s);
    if (remember) localStorage.setItem(SESSION_KEY, str); else sessionStorage.setItem(SESSION_KEY, str);
  } catch (e) { /* ignore */ }
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}
function currentUser() {
  const s = getSession();
  if (!s) return null;
  const u = byId('users', s.userId);
  return u && u.status === 'Active' ? u : null;
}
function isAdmin() { const u = currentUser(); return !!u && u.role === ROLES.ADMIN; }
function canAccess(page) { return !ADMIN_ONLY_PAGES.includes(page) || isAdmin(); }

/** Attempts a login. Returns an error message, or '' on success. */
function login(username, password, remember) {
  const u = DB.users.find((x) => x.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!u || u.password !== password) return 'Incorrect username or password. Please try again.';
  if (u.status !== 'Active') return 'This account is deactivated. Please contact the CAGRO Administrator.';
  u.lastLogin = nowStamp();
  setSession({ userId: u.id, loginAt: nowStamp(), lastActivity: Date.now(), remember: !!remember }, remember);
  try { if (remember) localStorage.setItem(REMEMBER_KEY, u.username); else localStorage.removeItem(REMEMBER_KEY); } catch (e) { /* ignore */ }
  lastActivity = Date.now();
  logAction('Login', 'Authentication', u.username, null, null, 'Signed in', u);
  return '';
}

function logout(reason) {
  const u = currentUser();
  if (u) logAction('Logout', 'Authentication', u.username, null, null, reason || 'Signed out', u);
  clearSession();
  hideIdleWarning();
  closeModal();
  $('#app').innerHTML = '';
  if (reason && reason !== 'Signed out') sessionStorage.setItem('asani_logout_reason', reason);
  location.hash = '#/login';
  if (location.hash === '#/login') router();
}

/* Idle timeout: warning 1 minute before automatic logout. */
let lastActivity = Date.now();
let idleWarningOpen = false;
function touchActivity() {
  if (idleWarningOpen) return; // only "Stay signed in" closes the warning
  lastActivity = Date.now();
}
function persistActivity() {
  const s = getSession();
  if (s) { s.lastActivity = lastActivity; setSession(s, s.remember); }
}
function idleTick() {
  if (!currentUser()) return;
  const limit = Math.max(2, Number(settings().sessionTimeout) || 15) * 60000;
  const idle = Date.now() - lastActivity;
  if (idle >= limit) {
    logout('Session timed out after ' + settings().sessionTimeout + ' minutes of inactivity');
  } else if (idle >= limit - 60000) {
    showIdleWarning(Math.ceil((limit - idle) / 1000));
  }
}
function showIdleWarning(secondsLeft) {
  const root = $('#idle-root');
  if (!idleWarningOpen) {
    idleWarningOpen = true;
    root.innerHTML = '<div class="modal-backdrop idle"><div class="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-desc">' +
      '<header class="modal-header"><h2 id="idle-title">' + icon('clock') + ' Are you still there?</h2></header>' +
      '<div class="modal-body"><p id="idle-desc">For security, you will be signed out in <strong id="idle-count"></strong> seconds because of inactivity.</p></div>' +
      '<footer class="modal-footer"><button class="btn btn-ghost" id="idle-logout">Sign out now</button><button class="btn btn-primary" id="idle-stay">Stay signed in</button></footer></div></div>';
    $('#idle-stay').addEventListener('click', () => { hideIdleWarning(); lastActivity = Date.now(); persistActivity(); toast('Your session has been extended.', 'success'); });
    $('#idle-logout').addEventListener('click', () => logout('Signed out'));
    $('#idle-stay').focus();
  }
  const c = $('#idle-count');
  if (c) c.textContent = secondsLeft;
}
function hideIdleWarning() { idleWarningOpen = false; const r = $('#idle-root'); if (r) r.innerHTML = ''; }

/* ------------------------------------------------------------------ */
/* 8. Toasts, modals and confirmation dialogs                          */
/* ------------------------------------------------------------------ */
function toast(message, type) {
  const t = type || 'success';
  const el = document.createElement('div');
  el.className = 'toast toast-' + t;
  el.setAttribute('role', t === 'error' ? 'alert' : 'status');
  el.innerHTML = icon(t === 'error' ? 'alert' : t === 'info' ? 'bell' : 'check') + '<span>' + esc(message) + '</span><button class="toast-close" aria-label="Dismiss">' + icon('x', 14) + '</button>';
  $('#toast-root').appendChild(el);
  const remove = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); };
  el.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, t === 'error' ? 6000 : 4000);
}

let modalReturnFocus = null;
/**
 * Opens a modal. `body` and `footer` are HTML strings.
 * Elements with [data-close] close the modal. Returns the modal element.
 */
function openModal(opts) {
  const root = $('#modal-root');
  modalReturnFocus = document.activeElement;
  root.innerHTML = '<div class="modal-backdrop"><div class="modal ' + (opts.size ? 'modal-' + opts.size : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
    '<header class="modal-header"><h2 id="modal-title">' + esc(opts.title) + '</h2><button class="icon-btn" data-close aria-label="Close dialog">' + icon('x') + '</button></header>' +
    '<div class="modal-body">' + opts.body + '</div>' +
    (opts.footer !== undefined ? '<footer class="modal-footer">' + opts.footer + '</footer>' : '') + '</div></div>';
  const backdrop = root.firstElementChild;
  const modal = backdrop.firstElementChild;
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeModal(); });
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.key === 'Tab') { // simple focus trap
      const f = $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  const first = modal.querySelector('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea') || modal.querySelector('.modal-footer .btn-primary, .modal-footer .btn-danger') || modal.querySelector('[data-close]');
  setTimeout(() => first && first.focus(), 30);
  return modal;
}
function closeModal() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
  if (modalReturnFocus && document.body.contains(modalReturnFocus)) modalReturnFocus.focus();
  modalReturnFocus = null;
}

/** Confirmation modal used before deactivate, approve, reject and release. */
function confirmDialog(o) {
  const modal = openModal({
    title: o.title, size: o.size || 'sm',
    body: '<div class="confirm-body">' + (o.variant === 'danger' ? '<span class="confirm-icon danger">' + icon('alert', 22) + '</span>' : '<span class="confirm-icon">' + icon('check', 22) + '</span>') + '<div>' + o.message + '</div></div>',
    footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn ' + (o.variant === 'danger' ? 'btn-danger' : 'btn-primary') + '" id="confirm-ok">' + esc(o.confirmText || 'Confirm') + '</button>'
  });
  modal.querySelector('#confirm-ok').addEventListener('click', () => { closeModal(); o.onConfirm(); });
  return modal;
}

/* ------------------------------------------------------------------ */
/* 9. Form builder (labels, hints, validation, conditional fields)     */
/* ------------------------------------------------------------------ */
/**
 * Field definition:
 * { name, label, type: text|email|password|number|date|tel|select|textarea,
 *   options (array or function), required (bool or fn(values)), min, integer,
 *   hint, placeholder, full (span 2 cols), showIf(values), validate(v, values) }
 */
function fieldHTML(f, value) {
  const id = 'fld-' + f.name;
  const v = value === null || value === undefined ? (f.default === undefined ? '' : f.default) : value;
  const describedBy = (f.hint ? id + '-hint ' : '') + id + '-err';
  const req = f.required === true ? ' aria-required="true"' : '';
  let ctl;
  if (f.type === 'select') {
    const opts = (typeof f.options === 'function' ? f.options() : f.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    ctl = '<select id="' + id + '" name="' + f.name + '" aria-describedby="' + describedBy + '"' + req + (f.disabled ? ' disabled' : '') + '>' +
      (f.placeholder === false ? '' : '<option value="">' + esc(f.placeholder || 'Select…') + '</option>') +
      opts.map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
  } else if (f.type === 'textarea') {
    ctl = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '" aria-describedby="' + describedBy + '"' + req + ' placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>';
  } else {
    const t = f.type === 'number' ? 'text' : (f.type || 'text'); // text + inputmode gives better validation messages
    ctl = '<input id="' + id + '" name="' + f.name + '" type="' + t + '"' + (f.type === 'number' ? ' inputmode="decimal"' : '') +
      ' value="' + esc(v) + '" aria-describedby="' + describedBy + '"' + req + (f.readonly ? ' readonly' : '') +
      (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + (f.max ? ' max="' + f.max + '"' : '') +
      ' placeholder="' + esc(f.placeholder || '') + '">';
  }
  return '<div class="field' + (f.full ? ' span-2' : '') + '" data-field="' + f.name + '">' +
    '<label for="' + id + '">' + esc(f.label) + (f.required === true ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' + ctl +
    (f.hint ? '<small class="hint" id="' + id + '-hint">' + esc(f.hint) + '</small>' : '') +
    '<small class="field-error" id="' + id + '-err" aria-live="polite"></small></div>';
}
function formHTML(fields, values) {
  return '<div class="form-grid">' + fields.map((f) => fieldHTML(f, values ? values[f.name] : undefined)).join('') + '</div>';
}
function readForm(form, fields) {
  const out = {};
  fields.forEach((f) => { const el = form.elements[f.name]; out[f.name] = el ? String(el.value).trim() : ''; });
  return out;
}
function setFieldError(wrap, msg) {
  if (!wrap) return;
  const err = wrap.querySelector('.field-error');
  const ctl = wrap.querySelector('input, select, textarea');
  if (err) err.textContent = msg || '';
  wrap.classList.toggle('has-error', !!msg);
  if (ctl) ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
/** Hides/shows fields with `showIf`. */
function applyShowIf(form, fields) {
  const vals = readForm(form, fields);
  fields.forEach((f) => {
    if (!f.showIf) return;
    const wrap = form.querySelector('[data-field="' + f.name + '"]');
    if (wrap) wrap.hidden = !f.showIf(vals);
  });
}
function bindShowIf(form, fields) {
  applyShowIf(form, fields);
  form.addEventListener('change', () => applyShowIf(form, fields));
}
/** Validates visible fields. Returns the values, or null if invalid (focuses the first error). */
function validateForm(form, fields) {
  const vals = readForm(form, fields);
  let first = null;
  fields.forEach((f) => {
    const wrap = form.querySelector('[data-field="' + f.name + '"]');
    if (!wrap || wrap.hidden) return;
    const v = vals[f.name];
    const required = typeof f.required === 'function' ? f.required(vals) : f.required;
    let msg = '';
    if (required && v === '') msg = 'This field is required.';
    else if (v !== '' && f.type === 'number') {
      const n = Number(v.replace(/,/g, ''));
      if (!isFinite(n)) msg = 'Please enter a valid number.';
      else if (f.min !== undefined && n < f.min) msg = 'Must be at least ' + f.min + '.';
      else if (f.integer && !Number.isInteger(n)) msg = 'Must be a whole number.';
      else vals[f.name] = String(n);
    } else if (v !== '' && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
    else if (v !== '' && f.type === 'tel' && !/^[0-9+()\-\s]{7,16}$/.test(v)) msg = 'Use digits only, e.g. 09171234567 or (084) 655-9000.';
    if (!msg && f.validate) msg = f.validate(v, vals) || '';
    setFieldError(wrap, msg);
    if (msg && !first) first = wrap;
  });
  if (first) { const c = first.querySelector('input, select, textarea'); if (c) c.focus(); return null; }
  return vals;
}

/* ------------------------------------------------------------------ */
/* 10. DataTable (search is done by pages; this sorts + paginates)     */
/* ------------------------------------------------------------------ */
class DataTable {
  /**
   * @param {HTMLElement} el container
   * @param {object} o { columns:[{key,label,render(row),value(row),sortable,className}],
   *                     pageSize, emptyText, rowId(row), expand(row) → html, sortKey, sortDir }
   */
  constructor(el, o) {
    this.el = el;
    this.o = Object.assign({ pageSize: 10, emptyText: 'No records found.', rowId: (r) => r.id }, o);
    this.rows = [];
    this.page = 1;
    this.sortKey = o.sortKey || null;
    this.sortDir = o.sortDir || 'asc';
    this.expanded = new Set();
    el.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) return this.toggleSort(th.dataset.sort);
      const pg = e.target.closest('[data-page]');
      if (pg && !pg.disabled) { this.page = Number(pg.dataset.page); this.render(); return; }
      const ex = e.target.closest('[data-expand]');
      if (ex) {
        const id = ex.dataset.expand;
        if (this.expanded.has(id)) this.expanded.delete(id); else this.expanded.add(id);
        this.render();
        const btn = this.el.querySelector('[data-expand="' + id + '"]');
        if (btn) btn.focus();
      }
    });
    el.addEventListener('keydown', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.toggleSort(th.dataset.sort); }
    });
  }
  toggleSort(key) {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
    this.render();
    const th = this.el.querySelector('th[data-sort="' + key + '"]');
    if (th) th.focus();
  }
  setRows(rows) { this.rows = rows; this.page = 1; this.render(); }
  sorted() {
    if (!this.sortKey) return this.rows.slice();
    const col = this.o.columns.find((c) => c.key === this.sortKey);
    const val = col.value || ((r) => r[col.key]);
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return this.rows.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x === null || x === undefined ? '' : x).localeCompare(String(y === null || y === undefined ? '' : y), undefined, { numeric: true }) * dir;
    });
  }
  render() {
    const o = this.o;
    const rows = this.sorted();
    const pages = Math.max(1, Math.ceil(rows.length / o.pageSize));
    if (this.page > pages) this.page = pages;
    const start = (this.page - 1) * o.pageSize;
    const pageRows = rows.slice(start, start + o.pageSize);
    const colCount = o.columns.length + (o.expand ? 1 : 0);
    const head = (o.expand ? '<th class="col-expand"><span class="sr-only">Details</span></th>' : '') + o.columns.map((c) => {
      if (c.sortable === false) return '<th scope="col" class="' + (c.className || '') + '">' + esc(c.label) + '</th>';
      const active = this.sortKey === c.key;
      const aria = active ? (this.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" class="sortable ' + (c.className || '') + '" data-sort="' + c.key + '" tabindex="0" aria-sort="' + aria + '">' + esc(c.label) + '<span class="sort-ind" aria-hidden="true">' + (active ? (this.sortDir === 'asc' ? '▲' : '▼') : '↕') + '</span></th>';
    }).join('');
    let body;
    if (!pageRows.length) {
      body = '<tr><td colspan="' + colCount + '">' + emptyState(o.emptyText) + '</td></tr>';
    } else {
      body = pageRows.map((r) => {
        const id = String(o.rowId(r));
        const open = this.expanded.has(id);
        let tr = '<tr class="' + (o.rowClass ? o.rowClass(r) : '') + '">' +
          (o.expand ? '<td class="col-expand"><button class="icon-btn sm" data-expand="' + esc(id) + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Hide' : 'Show') + ' details">' + (open ? '▾' : '▸') + '</button></td>' : '') +
          o.columns.map((c) => '<td class="' + (c.className || '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>';
        if (o.expand && open) tr += '<tr class="expand-row"><td colspan="' + colCount + '">' + o.expand(r) + '</td></tr>';
        return tr;
      }).join('');
    }
    let pager = '';
    if (rows.length > o.pageSize) {
      const btns = [];
      for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || Math.abs(p - this.page) <= 1) btns.push('<button class="pg-btn' + (p === this.page ? ' active' : '') + '" data-page="' + p + '" aria-label="Page ' + p + '"' + (p === this.page ? ' aria-current="page"' : '') + '>' + p + '</button>');
        else if (btns[btns.length - 1] !== '<span class="pg-gap">…</span>') btns.push('<span class="pg-gap">…</span>');
      }
      pager = '<nav class="pager" aria-label="Pagination"><span class="pg-info">Showing ' + (start + 1) + '–' + Math.min(start + o.pageSize, rows.length) + ' of ' + rows.length + '</span><div class="pg-btns">' +
        '<button class="pg-btn" data-page="' + (this.page - 1) + '"' + (this.page === 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button>' + btns.join('') +
        '<button class="pg-btn" data-page="' + (this.page + 1) + '"' + (this.page === pages ? ' disabled' : '') + ' aria-label="Next page">›</button></div></nav>';
    } else if (rows.length) {
      pager = '<div class="pager"><span class="pg-info">' + rows.length + ' record' + (rows.length === 1 ? '' : 's') + '</span></div>';
    }
    this.el.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + pager;
  }
}

/* ------------------------------------------------------------------ */
/* 11. Small render helpers                                            */
/* ------------------------------------------------------------------ */
function badge(text, extra) {
  return '<span class="badge badge-' + slug(text) + (extra ? ' ' + extra : '') + '">' + esc(text) + '</span>';
}
function emptyState(text, sub) {
  return '<div class="empty-state">' + icon('inbox', 36) + '<p>' + esc(text) + '</p>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
}
function pageHeader(title, subtitle, actions, crumbs) {
  return '<div class="page-header">' +
    '<div>' + (crumbs ? '<nav class="crumbs" aria-label="Breadcrumb">' + crumbs.map((c) => (c.href ? '<a href="' + c.href + '">' + esc(c.label) + '</a>' : '<span aria-current="page">' + esc(c.label) + '</span>')).join('<span aria-hidden="true">/</span>') + '</nav>' : '') +
    '<h1>' + esc(title) + '</h1>' + (subtitle ? '<p class="subtitle">' + subtitle + '</p>' : '') + '</div>' +
    (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
}
function daysBadge(expiry) {
  if (!expiry) return '<span class="muted">No expiry</span>';
  const d = daysTo(expiry);
  const cls = d < 0 ? 'expired' : d <= settings().nearExpiryDays ? 'near-expiry' : 'ok';
  return '<span class="days days-' + cls + '">' + (d < 0 ? Math.abs(d) + ' days ago' : d === 0 ? 'Today' : d + ' days') + '</span>';
}
function selectOptions(list, valueKey, labelFn, selected) {
  return list.map((r) => '<option value="' + esc(r[valueKey]) + '"' + (String(r[valueKey]) === String(selected) ? ' selected' : '') + '>' + esc(labelFn(r)) + '</option>').join('');
}

/* ------------------------------------------------------------------ */
/* 12. Charts drawn by hand with inline SVG                            */
/* ------------------------------------------------------------------ */
function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
/** Vertical bar chart. data: [{label, value}] */
function barChartSVG(data, opts) {
  const o = Object.assign({ height: 260, unit: 'units' }, opts);
  const W = 560, H = o.height, padL = 52, padR = 12, padT = 18, padB = 54;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const cw = (W - padL - padR) / data.length;
  const bw = Math.min(46, cw * 0.6);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, yy = y(v);
    g += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy + '" y2="' + yy + '" class="grid"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" class="axis" text-anchor="end">' + fmtNum(v) + '</text>';
  }
  const bars = data.map((d, i) => {
    const x = padL + cw * i + (cw - bw) / 2, yy = y(d.value), h = H - padB - yy;
    const words = d.label.split(' ');
    return '<g class="bar"><title>' + esc(d.label) + ': ' + fmtNum(d.value) + ' ' + o.unit + '</title>' +
      '<rect x="' + x + '" y="' + yy + '" width="' + bw + '" height="' + Math.max(h, 0) + '" rx="4"/>' +
      '<text x="' + (x + bw / 2) + '" y="' + (yy - 6) + '" class="val" text-anchor="middle">' + fmtNum(d.value) + '</text>' +
      words.map((w, wi) => '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 18 + wi * 13) + '" class="axis" text-anchor="middle">' + esc(w) + '</text>').join('') + '</g>';
  }).join('');
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Bar chart') + '">' + g + bars + '</svg>';
}
/** Line chart. data: [{label, value}] */
function lineChartSVG(data, opts) {
  const o = Object.assign({ height: 260, unit: 'units' }, opts);
  const W = 560, H = o.height, padL = 52, padR = 20, padT = 22, padB = 36;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const step = (W - padL - padR) / Math.max(1, data.length - 1);
  const x = (i) => padL + step * i;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i, yy = y(v);
    g += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy + '" y2="' + yy + '" class="grid"/><text x="' + (padL - 8) + '" y="' + (yy + 4) + '" class="axis" text-anchor="end">' + fmtNum(v) + '</text>';
  }
  const pts = data.map((d, i) => x(i) + ',' + y(d.value)).join(' ');
  const area = 'M' + x(0) + ',' + y(0) + ' L' + pts.split(' ').join(' L') + ' L' + x(data.length - 1) + ',' + y(0) + ' Z';
  const dots = data.map((d, i) => '<g class="pt"><title>' + esc(d.label) + ': ' + fmtNum(d.value) + ' ' + o.unit + '</title><circle cx="' + x(i) + '" cy="' + y(d.value) + '" r="4.5"/>' +
    '<text x="' + x(i) + '" y="' + (y(d.value) - 10) + '" class="val" text-anchor="middle">' + fmtNum(d.value) + '</text>' +
    '<text x="' + x(i) + '" y="' + (H - padB + 20) + '" class="axis" text-anchor="middle">' + esc(d.label) + '</text></g>').join('');
  return '<svg class="chart chart-line" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Line chart') + '">' + g +
    '<path d="' + area + '" class="area"/><polyline points="' + pts + '" class="trend"/>' + dots + '</svg>';
}

/* ------------------------------------------------------------------ */
/* 13. Export helpers                                                   */
/* ------------------------------------------------------------------ */
/** Downloads rows as a .csv file that opens in Excel (UTF-8 BOM). */
function downloadCSV(filename, headers, rows) {
  const cell = (v) => {
    const s = String(v === null || v === undefined ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '﻿' + [headers].concat(rows).map((r) => r.map(cell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
/** Prints only the given element (print-friendly view → "Save as PDF"). */
function printElement(el) {
  el.classList.add('print-target');
  document.body.classList.add('printing');
  const done = () => { el.classList.remove('print-target'); document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

/* ------------------------------------------------------------------ */
/* 14. Layout: sidebar + top bar                                        */
/* ------------------------------------------------------------------ */
const NAV = [
  { section: 'Overview', items: [
    { page: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { page: 'search', label: '"Asa ni?" Search', icon: 'search' },
    { page: 'notifications', label: 'Notifications', icon: 'bell' }
  ] },
  { section: 'Inventory', items: [
    { page: 'items', label: 'Items / Inventory', icon: 'box' },
    { page: 'stock-in', label: 'Stock-In', icon: 'stockin' },
    { page: 'requests', label: 'Requests', icon: 'clipboard' },
    { page: 'equipment', label: 'Equipment & Custody', icon: 'tool' }
  ] },
  { section: 'Records', items: [
    { page: 'master', label: 'Master Data', icon: 'database' },
    { page: 'reports', label: 'Reports', icon: 'report' }
  ] },
  { section: 'Administration', items: [
    { page: 'activity-log', label: 'Activity Log', icon: 'activity' },
    { page: 'users', label: 'User Management', icon: 'users' },
    { page: 'settings', label: 'Settings', icon: 'settings' }
  ] }
];

function ensureShell() {
  if ($('#app .app-shell')) return;
  const u = currentUser();
  const nav = NAV.map((sec) => {
    const items = sec.items.filter((i) => canAccess(i.page)); // role-based menu
    if (!items.length) return '';
    return '<div class="nav-section"><p class="nav-title">' + esc(sec.section) + '</p><ul>' + items.map((i) =>
      '<li><a href="#/' + i.page + '" data-nav="' + i.page + '">' + icon(i.icon) + '<span>' + esc(i.label) + '</span>' +
      (i.page === 'notifications' ? '<span class="nav-count" id="nav-notif-count"></span>' : '') +
      (i.page === 'requests' ? '<span class="nav-count" id="nav-req-count"></span>' : '') + '</a></li>').join('') + '</ul></div>';
  }).join('');
  const initials = u.fullName.split(' ').filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
  $('#app').innerHTML =
    '<div class="app-shell">' +
    '<aside class="sidebar" id="sidebar" aria-label="Main navigation">' +
      '<a class="brand" href="#/dashboard"><span class="brand-logo">' + icon('leaf', 22) + '</span><span><strong>Asa ni?</strong><small>CAGRO · Tagum City</small></span></a>' +
      '<nav>' + nav + '</nav>' +
      '<div class="sidebar-foot"><small>Agricultural Inventory Tracking &amp; Monitoring System</small><small class="muted">Prototype · mock data</small></div>' +
    '</aside>' +
    '<div class="sidebar-backdrop" id="sidebar-backdrop"></div>' +
    '<div class="main-col">' +
      '<header class="topbar">' +
        '<button class="icon-btn hamburger" id="menu-toggle" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">' + icon('menu', 22) + '</button>' +
        '<form class="global-search" id="global-search" role="search"><label for="gs-input" class="sr-only">Asa ni? Search an item</label>' + icon('search') +
          '<input id="gs-input" type="search" placeholder="Asa ni? Search an item, lot, property no. or location…" autocomplete="off"></form>' +
        '<div class="topbar-right">' +
          '<div class="bell-wrap"><button class="icon-btn bell" id="bell-btn" aria-haspopup="true" aria-expanded="false" aria-controls="bell-menu" aria-label="Notifications">' + icon('bell', 20) + '<span class="bell-count" id="bell-count" hidden></span></button>' +
            '<div class="dropdown" id="bell-menu" hidden></div></div>' +
          '<a class="user-chip" href="#/profile" title="My Profile"><span class="avatar">' + esc(initials) + '</span><span class="user-meta"><strong>' + esc(u.fullName) + '</strong><small>' + esc(u.role) + '</small></span></a>' +
          '<button class="btn btn-ghost btn-sm" id="logout-btn">' + icon('logout', 16) + '<span class="hide-sm">Logout</span></button>' +
        '</div>' +
      '</header>' +
      '<main id="view" class="view" tabindex="-1"></main>' +
    '</div></div>';

  // Sidebar toggle (tablets and small laptops)
  const toggle = (open) => {
    document.body.classList.toggle('sidebar-open', open);
    $('#menu-toggle').setAttribute('aria-expanded', open);
  };
  $('#menu-toggle').addEventListener('click', () => toggle(!document.body.classList.contains('sidebar-open')));
  $('#sidebar-backdrop').addEventListener('click', () => toggle(false));
  $('#sidebar').addEventListener('click', (e) => { if (e.target.closest('a')) toggle(false); });

  // Global "Asa ni?" search → search page
  $('#global-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#gs-input').value.trim();
    location.hash = '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  // Notification bell dropdown
  const bellBtn = $('#bell-btn'), menu = $('#bell-menu');
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    if (open) renderBellMenu();
    menu.hidden = !open;
    bellBtn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('.bell-wrap')) { menu.hidden = true; bellBtn.setAttribute('aria-expanded', 'false'); }
  });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu.hidden = true; bellBtn.focus(); } });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.hidden = true; bellBtn.setAttribute('aria-expanded', 'false'); } });

  $('#logout-btn').addEventListener('click', () => confirmDialog({
    title: 'Log out', message: '<p>Do you want to sign out of <strong>Asa ni?</strong>?</p>', confirmText: 'Log out', onConfirm: () => logout('Signed out')
  }));
  refreshChrome();
}

function renderBellMenu() {
  const list = openNotifications().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).slice(0, 5);
  $('#bell-menu').innerHTML = '<div class="dropdown-head"><strong>Alerts</strong><a href="#/notifications">View all</a></div>' +
    (list.length ? '<ul class="bell-list">' + list.map((n) =>
      '<li class="' + (n.read ? '' : 'unread') + '"><a href="#/items/' + n.itemId + '">' + badge(n.type) + '<span>' + esc(n.message) + '</span><small>' + fmtDateTime(n.createdAt) + '</small></a></li>').join('') + '</ul>'
      : '<div class="dropdown-empty">No active alerts.</div>') +
    '<div class="dropdown-foot">Alerts are checked automatically every day.</div>';
}

/** Updates the counts in the bell and sidebar after any data change. */
function refreshChrome() {
  if (!$('#bell-count')) return;
  const unread = openNotifications().filter((n) => !n.read).length;
  const bc = $('#bell-count');
  bc.hidden = unread === 0;
  bc.textContent = unread > 99 ? '99+' : unread;
  $('#bell-btn').setAttribute('aria-label', 'Notifications, ' + unread + ' unread');
  const nc = $('#nav-notif-count');
  if (nc) { nc.textContent = unread || ''; nc.hidden = !unread; }
  const pending = DB.stock_requests.filter((r) => r.status === (isAdmin() ? 'Pending' : 'Approved')).length;
  const rc = $('#nav-req-count');
  if (rc) { rc.textContent = pending || ''; rc.hidden = !pending; rc.title = isAdmin() ? 'Pending approval' : 'Approved, waiting for release'; }
}

/* ------------------------------------------------------------------ */
/* 15. Hash router                                                      */
/* ------------------------------------------------------------------ */
function parseRoute() {
  const h = location.hash.replace(/^#/, '') || '/dashboard';
  const [path, qs] = h.split('?');
  const query = {};
  new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
  return { path, parts: path.split('/').filter(Boolean), query };
}

let routeToken = 0;
function router() {
  const r = parseRoute();
  const user = currentUser();
  closeModal();
  if (!user) {
    if ($('#app .app-shell')) $('#app').innerHTML = '';
    if (r.parts[0] !== 'login') { location.hash = '#/login'; return; }
    Pages.login($('#app'));
    return;
  }
  if (r.parts[0] === 'login' || !r.parts.length) { location.hash = '#/dashboard'; return; }
  ensureShell();
  const page = r.parts[0];

  // Highlight the current menu item.
  $$('#sidebar [data-nav]').forEach((a) => {
    const active = a.dataset.nav === page;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const gs = $('#gs-input');
  if (gs && page !== 'search') gs.value = '';

  // A fresh <main> each time removes listeners from the previous page.
  const old = $('#view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  view.innerHTML = skeletonHTML();
  const token = ++routeToken;
  setTimeout(() => {
    if (token !== routeToken) return;
    if (!Pages[page] || page === 'login') Pages.notFound(view, r);
    else if (!canAccess(page)) Pages.denied(view, r);
    else Pages[page](view, r);
    const title = view.querySelector('h1');
    document.title = (title ? title.textContent + ' · ' : '') + 'Asa ni? · CAGRO Tagum';
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    refreshChrome();
  }, 180);
}

/** Re-renders the current page (after a data change) without the skeleton. */
function rerender() {
  const r = parseRoute();
  const page = r.parts[0];
  const old = $('#view');
  if (!old || !Pages[page]) return router();
  const view = old.cloneNode(false);
  old.replaceWith(view);
  if (!canAccess(page)) Pages.denied(view, r); else Pages[page](view, r);
  refreshChrome();
}

function skeletonHTML() {
  return '<div class="skeleton-page" aria-busy="true" aria-label="Loading"><div class="sk sk-title"></div><div class="sk sk-sub"></div>' +
    '<div class="sk-grid"><div class="sk sk-card"></div><div class="sk sk-card"></div><div class="sk sk-card"></div><div class="sk sk-card"></div></div>' +
    '<div class="sk sk-block"></div></div>';
}

/* ------------------------------------------------------------------ */
/* 16. Boot                                                             */
/* ------------------------------------------------------------------ */
function boot() {
  loadDB();
  dailyAlertCheck();
  // Restore the activity clock; expire a remembered session that has been idle too long.
  const s = getSession();
  if (s) {
    lastActivity = s.lastActivity || Date.now();
    if (Date.now() - lastActivity >= (Number(settings().sessionTimeout) || 15) * 60000) {
      const u = currentUser();
      if (u) logAction('Logout', 'Authentication', u.username, null, null, 'Session expired while away', u);
      clearSession();
    }
  }
  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, touchActivity, { passive: true }));
  setInterval(idleTick, 1000);
  setInterval(persistActivity, 15000);
  setInterval(dailyAlertCheck, 60 * 60 * 1000); // re-check hourly; runs once per day
  window.addEventListener('beforeunload', persistActivity);
  window.addEventListener('hashchange', router);
  router();
}
document.addEventListener('DOMContentLoaded', boot);
