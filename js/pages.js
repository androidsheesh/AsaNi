/* =====================================================================
   Asa ni? — pages.js
   One render function per page. Each receives the <main> element and
   the parsed route ({ parts, query }). Helpers come from app.js.
   ===================================================================== */
'use strict';

const Pages = {};

/* ------------------------------------------------------------------ */
/* Shared page helpers                                                  */
/* ------------------------------------------------------------------ */
const WHOLE_UNITS = ['pc', 'unit', 'bag', 'pack', 'bottle', 'sack', 'box'];
const UNIT_OPTIONS = ['kg', 'bag', 'liter', 'pc', 'unit', 'pack', 'bottle', 'sack', 'box'];
const ITEM_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Near Expiry', 'Expired'];
const LOCATION_TYPES = ['Warehouse', 'Storage Room', 'Office', 'Field Site'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Unserviceable'];
const LOG_ACTIONS = ['Login', 'Logout', 'Create', 'Update', 'Approve', 'Reject', 'Release', 'Deactivate', 'Export'];
const LOG_MODULES = ['Authentication', 'Users', 'Master Data', 'Inventory', 'Stock-In', 'Requests', 'Equipment', 'Reports', 'Settings'];

const activeItems = () => DB.items.filter((i) => i.status === 'Active');
const activeOf = (table) => DB[table].filter((r) => r.status === 'Active');
const itemOpt = (i) => ({ value: i.id, label: i.code + ' — ' + i.name + ' (' + i.unit + ')' });
const isWhole = (item) => WHOLE_UNITS.includes(item.unit) || item.type === 'Equipment';
const firstName = (u) => u.fullName.split(' ')[0];

/** Accessible tab list. onChange(key) is called when a tab is chosen. */
function tabsHTML(tabs, active, label) {
  return '<div class="tabs" role="tablist" aria-label="' + esc(label || 'Tabs') + '">' + tabs.map((t) =>
    '<button type="button" role="tab" class="tab' + (t.key === active ? ' active' : '') + '" aria-selected="' + (t.key === active) + '" tabindex="' + (t.key === active ? 0 : -1) + '" data-tab="' + esc(t.key) + '">' +
    esc(t.label) + (t.count !== undefined ? ' <span class="tab-count">' + t.count + '</span>' : '') + '</button>').join('') + '</div>';
}
function bindTabs(root, onChange) {
  const list = root.querySelector('[role=tablist]');
  const select = (btn) => {
    $$('[role=tab]', list).forEach((b) => { const on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    btn.focus();
    onChange(btn.dataset.tab);
  };
  list.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b); });
  list.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('[role=tab]', list);
    let i = tabs.indexOf(document.activeElement);
    if (e.key === 'ArrowRight') i = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') i = 0; else i = tabs.length - 1;
    e.preventDefault();
    select(tabs[i]);
  });
}
/** Updates the URL query without re-rendering the page. */
function replaceQuery(path, params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)).toString();
  history.replaceState(null, '', '#' + path + (qs ? '?' + qs : ''));
}
/** Compact text for old/new values in the Activity Log. */
function fmtValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'object') return String(v);
  return Object.entries(v).map(([k, x]) => k + ': ' + (x === null || x === '' ? '—' : x)).join('; ');
}
function tipWrap(html, tip) {
  return '<span class="tip" tabindex="0" data-tip="' + esc(tip) + '">' + html + '<span class="sr-only">' + esc(tip) + '</span></span>';
}
function infoList(pairs) {
  return '<dl class="info-list">' + pairs.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + (v === '' || v === null || v === undefined ? '—' : v) + '</dd></div>').join('') + '</dl>';
}

/** One line of the movement history timeline. */
function txnHTML(t, showItem) {
  const item = byId('items', t.itemId);
  const b = byId('batches', t.batchId);
  const unit = item ? item.unit : '';
  const lot = b ? 'Lot ' + esc(b.lotNo) : '';
  const q = fmtNum(Math.abs(t.quantity));
  const prefix = showItem && item ? '<a href="#/items/' + item.id + '">' + esc(item.name) + '</a> · ' : '';
  let title = '', detail = '';
  switch (t.type) {
    case 'Stock-In': title = 'Stock-In · +' + q + ' ' + unit; detail = lot + ' received at ' + esc(locLabel(t.locationId)) + ' · ' + esc(t.refNo); break;
    case 'Release': title = 'Release · −' + q + ' ' + unit; detail = lot + ' from ' + esc(locLabel(t.locationId)) + ' · ' + esc(t.refNo) + (t.remarks ? ' · ' + esc(t.remarks) : ''); break;
    case 'Transfer': title = 'Transfer · ' + q + ' ' + unit; detail = lot + ': ' + esc(locLabel(t.locationId)) + ' → ' + esc(locLabel(t.toLocationId)) + ' · ' + esc(t.refNo); break;
    case 'Adjustment': title = 'Adjustment · ' + (t.quantity < 0 ? '−' : '+') + q + ' ' + unit; detail = lot + ' at ' + esc(locLabel(t.locationId)) + (t.remarks ? ' · ' + esc(t.remarks) : ''); break;
    case 'Assign': title = 'Assigned · ' + esc(t.refNo); detail = esc(t.remarks) + ' at ' + esc(locLabel(t.toLocationId)); break;
    case 'Return': title = 'Returned · ' + esc(t.refNo); detail = esc(t.remarks) + ' · now at ' + esc(locLabel(t.toLocationId)); break;
    default: title = esc(t.type);
  }
  return '<li class="tl-item tl-' + slug(t.type) + '"><span class="tl-dot" aria-hidden="true"></span><div><strong>' + prefix + title + '</strong><p>' + detail + '</p><small>' + esc(userName(t.userId)) + ' · ' + fmtDateTime(t.date) + '</small></div></li>';
}

/* ================================================================== */
/* A. LOGIN                                                             */
/* ================================================================== */
Pages.login = (root) => {
  let remembered = '', reason = '';
  try { remembered = localStorage.getItem(REMEMBER_KEY) || ''; } catch (e) { /* ignore */ }
  try { reason = sessionStorage.getItem('asani_logout_reason') || ''; sessionStorage.removeItem('asani_logout_reason'); } catch (e) { /* ignore */ }
  document.title = 'Sign in · Asa ni? · CAGRO Tagum';
  root.innerHTML =
    '<div class="login-page">' +
      '<section class="login-hero" aria-label="About the system">' +
        '<div class="hero-inner">' +
          '<div class="lgu-line"><span class="seal">' + icon('leaf', 26) + '</span><div><small>Republic of the Philippines</small><strong>City Government of Tagum</strong><small>Davao del Norte</small></div></div>' +
          '<h1 class="hero-title">Asa ni?</h1>' +
          '<p class="hero-sub">A Web-Based Agricultural Inventory Tracking and Monitoring System</p>' +
          '<p class="hero-office">City Agriculture Office (CAGRO)</p>' +
          '<ul class="hero-points">' +
            '<li>' + icon('search') + 'Find where every seed, fertilizer, tool and machine is stored</li>' +
            '<li>' + icon('alert') + 'Automatic low-stock, near-expiry and expired alerts</li>' +
            '<li>' + icon('clipboard') + 'Requests with approval, FEFO release and a full audit trail</li>' +
          '</ul>' +
          '<p class="hero-note">"Asa ni?" is Bisaya for <em>"Where is this?"</em></p>' +
        '</div>' +
      '</section>' +
      '<section class="login-panel">' +
        '<form class="login-card" id="login-form" novalidate>' +
          '<h2>Sign in</h2><p class="muted">Use your CAGRO account to continue.</p>' +
          (reason ? '<div class="alert alert-info" role="status">' + icon('clock') + '<span>' + esc(reason) + '. Please sign in again.</span></div>' : '') +
          '<div class="alert alert-error" id="login-error" role="alert" hidden></div>' +
          '<div class="field"><label for="lg-user">Username</label><input id="lg-user" name="username" autocomplete="username" value="' + esc(remembered) + '" required aria-required="true"></div>' +
          '<div class="field"><label for="lg-pass">Password</label><div class="pw-wrap"><input id="lg-pass" name="password" type="password" autocomplete="current-password" required aria-required="true">' +
            '<button type="button" class="icon-btn pw-toggle" id="pw-toggle" aria-label="Show password" aria-pressed="false">' + icon('eye') + '</button></div></div>' +
          '<label class="check"><input type="checkbox" id="lg-remember"' + (remembered ? ' checked' : '') + '> Remember me</label>' +
          '<button class="btn btn-primary btn-block" type="submit">' + icon('lock', 16) + 'Sign in</button>' +
          '<div class="demo-accounts"><p><strong>Demo accounts</strong> (click to fill)</p>' +
            '<button type="button" class="demo-acc" data-u="admin" data-p="admin123"><span>Administrator</span><code>admin / admin123</code></button>' +
            '<button type="button" class="demo-acc" data-u="staff" data-p="staff123"><span>Inventory Staff</span><code>staff / staff123</code></button>' +
          '</div>' +
        '</form>' +
        '<p class="login-foot">© ' + new Date().getFullYear() + ' City Agriculture Office, Tagum City · Prototype with mock data</p>' +
      '</section>' +
    '</div>';

  const form = $('#login-form'), err = $('#login-error'), pass = $('#lg-pass'), user = $('#lg-user');
  (remembered ? pass : user).focus();
  $('#pw-toggle').addEventListener('click', (e) => {
    const show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-pressed', show);
    e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    e.currentTarget.innerHTML = icon(show ? 'eyeoff' : 'eye');
  });
  $$('.demo-acc', form).forEach((b) => b.addEventListener('click', () => { user.value = b.dataset.u; pass.value = b.dataset.p; form.querySelector('[type=submit]').focus(); }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    if (!user.value.trim() || !pass.value) { err.textContent = 'Please enter your username and password.'; err.hidden = false; (user.value.trim() ? pass : user).focus(); return; }
    const msg = login(user.value, pass.value, $('#lg-remember').checked);
    if (msg) { err.textContent = msg; err.hidden = false; pass.value = ''; pass.focus(); return; }
    root.innerHTML = '';
    location.hash = '#/dashboard';
    toast('Welcome, ' + firstName(currentUser()) + '!', 'success');
  });
};

/* ================================================================== */
/* Access denied / not found                                            */
/* ================================================================== */
Pages.denied = (view) => {
  view.innerHTML = '<div class="state-page">' + '<span class="state-icon danger">' + icon('lock', 40) + '</span><h1>Access denied</h1>' +
    '<p>Your role (<strong>' + esc(currentUser().role) + '</strong>) cannot open this page. Only the Administrator can access User Management, Activity Log and Settings.</p>' +
    '<a class="btn btn-primary" href="#/dashboard">' + icon('back', 16) + 'Back to Dashboard</a></div>';
};
Pages.notFound = (view) => {
  view.innerHTML = '<div class="state-page"><span class="state-icon">' + icon('search', 40) + '</span><h1>Page not found</h1><p>Asa ni? We could not find that page.</p><a class="btn btn-primary" href="#/dashboard">Go to Dashboard</a></div>';
};

/* ================================================================== */
/* REQUEST ACTIONS (shared by Dashboard and Requests)                  */
/* ================================================================== */
const RequestActions = {
  lines: (reqId) => DB.request_items.filter((l) => l.requestId === reqId),
  summary(req) {
    return this.lines(req.id).map((l) => { const i = byId('items', l.itemId); return (i ? i.name : '?') + ' × ' + fmtNum(l.qtyApproved !== null && l.qtyApproved !== undefined ? l.qtyApproved : l.qtyRequested); }).join(', ');
  },
  requester(req) {
    if (req.requesterType === 'Personnel') { const p = byId('personnel', req.requesterId); return p ? p.fullName + ' (Field personnel)' : '—'; }
    const b = byId('beneficiaries', req.requesterId);
    return b ? b.name + ' (' + b.type + ', ' + b.barangay + ')' : '—';
  },
  /** Approve button, disabled with a tooltip when the admin recorded the request (separation of duties). */
  approveButton(req, sm) {
    const own = req.recordedBy === currentUser().id;
    const cls = 'btn btn-primary' + (sm ? ' btn-sm' : '');
    if (own) return tipWrap('<button type="button" class="' + cls + '" disabled>' + icon('check', 16) + 'Approve</button>', 'You recorded this request. Under separation of duties, another Administrator must approve it.');
    return '<button type="button" class="' + cls + '" data-act="approve" data-id="' + req.id + '">' + icon('check', 16) + 'Approve</button>';
  },
  rejectButton(req, sm) { return '<button type="button" class="btn btn-danger-ghost' + (sm ? ' btn-sm' : '') + '" data-act="reject" data-id="' + req.id + '">' + icon('x', 16) + 'Reject</button>'; },
  releaseLabel(req) { return req.type === 'Release' ? 'Release' : req.type === 'Transfer' ? 'Post transfer' : 'Post adjustment'; },
  releaseButton(req, sm) { return '<button type="button" class="btn btn-primary' + (sm ? ' btn-sm' : '') + '" data-act="release" data-id="' + req.id + '">' + icon('arrow', 16) + this.releaseLabel(req) + '</button>'; },

  /** Wires [data-act] buttons inside a container. */
  bind(container, done) {
    container.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const id = Number(b.dataset.id);
      if (b.dataset.act === 'approve') this.approve(id, done);
      else if (b.dataset.act === 'reject') this.reject(id, done);
      else if (b.dataset.act === 'release') this.release(id, done);
    });
  },

  approve(reqId, done) {
    const req = byId('stock_requests', reqId);
    if (!isAdmin() || req.status !== 'Pending') return;
    if (req.recordedBy === currentUser().id) { toast('You cannot approve a request you recorded (separation of duties).', 'error'); return; }
    const lines = this.lines(req.id);
    const rows = lines.map((l) => {
      const it = byId('items', l.itemId);
      const avail = req.type === 'Adjustment' ? itemTotal(it) : releasableQty(it.id);
      return '<tr><td>' + esc(it.name) + '</td><td class="num">' + fmtNum(l.qtyRequested) + ' ' + esc(it.unit) + '</td><td class="num">' + fmtNum(avail) + '</td>' +
        '<td><label class="sr-only" for="ap-' + l.id + '">Approved quantity for ' + esc(it.name) + '</label><input class="input-sm" id="ap-' + l.id + '" data-line="' + l.id + '" inputmode="decimal" value="' + l.qtyRequested + '"><small class="field-error" id="ap-' + l.id + '-err"></small></td></tr>';
    }).join('');
    const modal = openModal({
      title: 'Approve ' + req.requestNo, size: 'lg',
      body: '<p class="muted">' + esc(req.type) + ' · ' + esc(this.requester(req)) + (req.risNo ? ' · ' + esc(req.risNo) : '') + '</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th class="num">Requested</th><th class="num">Available now</th><th>Approved quantity</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="field"><label for="ap-remarks">Remarks</label><textarea id="ap-remarks" rows="2" placeholder="Optional, e.g. approved 50 kg only"></textarea></div>' +
        '<p class="confirm-note">' + icon('alert', 16) + 'Please confirm. Approving lets Inventory Staff release this request.</p>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ap-ok">' + icon('check', 16) + 'Approve request</button>'
    });
    modal.querySelector('#ap-ok').addEventListener('click', () => {
      let ok = true, any = false;
      const values = {};
      lines.forEach((l) => {
        const inp = modal.querySelector('#ap-' + l.id), err = modal.querySelector('#ap-' + l.id + '-err');
        const n = Number(String(inp.value).replace(/,/g, ''));
        const it = byId('items', l.itemId);
        let msg = '';
        if (inp.value.trim() === '' || !isFinite(n)) msg = 'Enter a number.';
        else if (n < 0) msg = 'Cannot be negative.';
        else if (n > l.qtyRequested) msg = 'Cannot exceed the requested ' + fmtNum(l.qtyRequested) + '.';
        else if (isWhole(it) && !Number.isInteger(n)) msg = 'Whole numbers only.';
        err.textContent = msg; inp.setAttribute('aria-invalid', !!msg);
        if (msg) ok = false; else { values[l.id] = n; if (n > 0) any = true; }
      });
      if (!ok) return;
      if (!any) { toast('Approve at least one item with a quantity above zero, or reject the request.', 'error'); return; }
      const oldV = { status: 'Pending' }, newV = { status: 'Approved' };
      lines.forEach((l) => { const nm = byId('items', l.itemId).name; oldV[nm] = l.qtyRequested; newV[nm] = values[l.id]; l.qtyApproved = values[l.id]; });
      req.status = 'Approved'; req.decidedBy = currentUser().id; req.decidedAt = nowStamp(); req.decisionRemarks = modal.querySelector('#ap-remarks').value.trim();
      if (req.decisionRemarks) newV.remarks = req.decisionRemarks;
      saveDB();
      logAction('Approve', 'Requests', req.requestNo, oldV, newV);
      closeModal();
      toast(req.requestNo + ' approved. Inventory Staff can now release it.', 'success');
      done && done();
    });
  },

  reject(reqId, done) {
    const req = byId('stock_requests', reqId);
    if (!isAdmin() || req.status !== 'Pending') return;
    const modal = openModal({
      title: 'Reject ' + req.requestNo, size: 'sm',
      body: '<div class="confirm-body"><span class="confirm-icon danger">' + icon('alert', 22) + '</span><div><p>Reject this ' + esc(req.type.toLowerCase()) + ' request from <strong>' + esc(this.requester(req)) + '</strong>?</p><p class="muted">' + esc(this.summary(req)) + '</p></div></div>' +
        '<div class="field"><label for="rj-remarks">Reason for rejection <span class="req" aria-hidden="true">*</span></label><textarea id="rj-remarks" rows="3" aria-required="true" aria-describedby="rj-err"></textarea><small class="field-error" id="rj-err"></small></div>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="rj-ok">Reject request</button>'
    });
    modal.querySelector('#rj-ok').addEventListener('click', () => {
      const remarks = modal.querySelector('#rj-remarks').value.trim();
      if (!remarks) { modal.querySelector('#rj-err').textContent = 'Please give a reason.'; modal.querySelector('#rj-remarks').focus(); return; }
      req.status = 'Rejected'; req.decidedBy = currentUser().id; req.decidedAt = nowStamp(); req.decisionRemarks = remarks;
      saveDB();
      logAction('Reject', 'Requests', req.requestNo, { status: 'Pending' }, { status: 'Rejected', remarks });
      closeModal();
      toast(req.requestNo + ' rejected.', 'info');
      done && done();
    });
  },

  /** Builds the FEFO plan for every line of an approved request. */
  plan(req) {
    let ok = true;
    const out = this.lines(req.id).map((l) => {
      const item = byId('items', l.itemId);
      const qty = Number(l.qtyApproved) || 0;
      if (qty <= 0) return { line: l, item, plan: [], shortage: 0, skip: true };
      if (req.type === 'Adjustment' && req.adjustmentDirection === 'Increase') {
        // Recount found more: add to the most recent batch at its main location.
        const b = itemBatches(item.id).sort((x, y) => y.dateReceived.localeCompare(x.dateReceived))[0];
        if (!b) { ok = false; return { line: l, item, plan: [], shortage: qty, noBatch: true }; }
        const rows = DB.inventory_stock.filter((s) => s.batchId === b.id).sort((x, y) => y.quantity - x.quantity);
        return { line: l, item, increase: true, plan: [{ batchId: b.id, locationId: rows[0] ? rows[0].locationId : 1, qty }], shortage: 0 };
      }
      const p = fefoPlan(item.id, qty, { includeExpired: req.type === 'Adjustment', excludeLocationId: req.type === 'Transfer' ? req.targetLocationId : undefined });
      if (p.shortage > 0) ok = false;
      return { line: l, item, plan: p.plan, shortage: p.shortage };
    });
    return { out, ok };
  },

  release(reqId, done) {
    const req = byId('stock_requests', reqId);
    if (isAdmin() || req.status !== 'Approved') return;
    const { out, ok } = this.plan(req);
    const body = out.map((x) => {
      if (x.skip) return '';
      const head = '<h3 class="plan-head">' + esc(x.item.name) + ' · ' + fmtNum(x.line.qtyApproved) + ' ' + esc(x.item.unit) + (x.increase ? ' (recount increase)' : '') + '</h3>';
      const rows = x.plan.map((p, i) => {
        const b = byId('batches', p.batchId);
        return '<tr><td>' + (x.increase ? '+' : (i + 1) + '.') + '</td><td><strong>Lot ' + esc(b.lotNo) + '</strong></td><td>' + fmtDate(b.expiryDate) + ' ' + daysBadge(b.expiryDate) + '</td><td>' + esc(locLabel(p.locationId)) +
          (req.type === 'Transfer' ? ' → <strong>' + esc(locLabel(req.targetLocationId)) + '</strong>' : '') + '</td><td class="num"><strong>' + fmtNum(p.qty) + '</strong></td></tr>';
      }).join('');
      return head + '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Batch</th><th>Expiry</th><th>' + (req.type === 'Transfer' ? 'From → To' : 'Location') + '</th><th class="num">Qty</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (x.shortage ? '<p class="alert alert-error">' + icon('alert', 16) + 'Short by ' + fmtNum(x.shortage) + ' ' + esc(x.item.unit) + (req.type === 'Adjustment' ? '.' : ' of non-expired stock.') + '</p>' : '');
    }).join('');
    const modal = openModal({
      title: this.releaseLabel(req) + ' · ' + req.requestNo, size: 'lg',
      body: '<p class="muted">' + esc(this.requester(req)) + (req.risNo ? ' · ' + esc(req.risNo) : '') + '</p>' +
        '<div class="fefo-note">' + icon('clock', 16) + '<span><strong>FEFO (First Expired, First Out):</strong> stock is taken from the batch nearest to expiry first. ' + (req.type === 'Adjustment' ? 'Adjustments may include expired batches.' : 'Expired batches are never released.') + '</span></div>' + body,
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="rl-ok"' + (ok ? '' : ' disabled') + '>' + icon('check', 16) + 'Confirm ' + this.releaseLabel(req).toLowerCase() + '</button>'
    });
    modal.querySelector('#rl-ok').addEventListener('click', () => {
      const ref = req.risNo || req.requestNo;
      const used = [];
      out.forEach((x) => {
        if (x.skip) return;
        x.line.batchesUsed = [];
        x.plan.forEach((p) => {
          const b = byId('batches', p.batchId);
          if (x.increase) {
            let s = DB.inventory_stock.find((r) => r.batchId === p.batchId && r.locationId === p.locationId);
            if (!s) { s = { id: nextId('inventory_stock'), batchId: p.batchId, locationId: p.locationId, quantity: 0 }; DB.inventory_stock.push(s); }
            s.quantity += p.qty;
          } else {
            const s = byId('inventory_stock', p.stockId);
            s.quantity -= p.qty;
            if (req.type === 'Transfer') {
              let t = DB.inventory_stock.find((r) => r.batchId === p.batchId && r.locationId === req.targetLocationId);
              if (!t) { t = { id: nextId('inventory_stock'), batchId: p.batchId, locationId: req.targetLocationId, quantity: 0 }; DB.inventory_stock.push(t); }
              t.quantity += p.qty;
            }
          }
          DB.stock_transactions.push({
            id: nextId('stock_transactions'), date: nowStamp(), type: req.type, itemId: x.item.id, batchId: p.batchId, equipmentId: null,
            locationId: p.locationId, toLocationId: req.type === 'Transfer' ? req.targetLocationId : null,
            quantity: req.type === 'Adjustment' ? (x.increase ? p.qty : -p.qty) : p.qty,
            userId: currentUser().id, refNo: ref,
            remarks: req.requestNo + (req.type === 'Adjustment' ? ' · ' + req.adjustmentReason : '')
          });
          x.line.batchesUsed.push({ batchId: p.batchId, locationId: p.locationId, qty: p.qty, toLocationId: req.type === 'Transfer' ? req.targetLocationId : undefined });
          used.push(b.lotNo + ' × ' + fmtNum(p.qty));
        });
      });
      req.status = 'Released'; req.releasedBy = currentUser().id; req.releasedAt = nowStamp();
      syncAlerts();
      saveDB();
      logAction('Release', 'Requests', req.requestNo, { status: 'Approved' }, { status: 'Released', batches: used.join('; ') });
      closeModal();
      toast(req.requestNo + ': stock updated (FEFO) — ' + used.join(', '), 'success');
      done && done();
    });
  }
};

/* ================================================================== */
/* B. DASHBOARD                                                          */
/* ================================================================== */
Pages.dashboard = (view) => {
  const u = currentUser(), admin = isAdmin();
  const items = activeItems();
  const rows = items.map((i) => ({ item: i, total: itemTotal(i), status: itemStatus(i) }));
  const totalUnits = rows.reduce((s, r) => s + r.total, 0);
  const low = rows.filter((r) => r.total <= r.item.reorderLevel).sort((a, b) => a.total - b.total);
  const stocked = DB.batches.filter((b) => batchQty(b.id) > 0 && (byId('items', b.itemId) || {}).status === 'Active');
  const near = stocked.filter((b) => batchExpiryStatus(b) === 'Near Expiry').sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const expired = stocked.filter((b) => batchExpiryStatus(b) === 'Expired').sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const pending = DB.stock_requests.filter((r) => r.status === 'Pending').sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const toRelease = DB.stock_requests.filter((r) => r.status === 'Approved');
  const assigned = DB.equipment.filter((e) => e.status === 'Assigned').length;

  const cards = [
    { label: 'Total items', value: fmtNum(items.length), icon: 'box', tone: 'green', href: '#/items' },
    { label: 'Total units in stock', value: fmtNum(totalUnits), icon: 'database', tone: 'green', href: '#/items', sub: 'all units of measure' },
    { label: 'Pending requests', value: pending.length, icon: 'clipboard', tone: 'blue', href: '#/requests?tab=Pending' },
    { label: 'Low-stock items', value: low.length, icon: 'alert', tone: 'orange', href: '#/items?status=low-any' },
    { label: 'Near-expiry batches', value: near.length, icon: 'clock', tone: 'amber', href: '#/notifications?type=Near%20Expiry', sub: 'within ' + settings().nearExpiryDays + ' days' },
    { label: 'Expired batches', value: expired.length, icon: 'x', tone: 'red', href: '#/notifications?type=Expired' },
    { label: 'Equipment assigned', value: assigned, icon: 'tool', tone: 'teal', href: '#/equipment?status=Assigned' }
  ];
  const cardHTML = cards.map((c) => '<a class="stat-card tone-' + c.tone + '" href="' + c.href + '"><span class="stat-icon">' + icon(c.icon, 20) + '</span><span class="stat-body"><span class="stat-label">' + esc(c.label) + '</span><strong class="stat-value">' + c.value + '</strong>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span></a>').join('');

  // Bar chart: stock by category. Line chart: monthly releases (last 6 months).
  const byCat = activeOf('categories').map((c) => ({ label: c.name, value: rows.filter((r) => r.item.categoryId === c.id).reduce((s, r) => s + r.total, 0) }));
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
    months.push({ label: MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2), value: DB.stock_transactions.filter((t) => t.type === 'Release' && t.date.slice(0, 7) === key).reduce((s, t) => s + t.quantity, 0) });
  }

  const alertList = (title, tone, list, render, more) => '<section class="card alert-card tone-' + tone + '"><header class="card-head"><h2>' + esc(title) + ' <span class="count-pill">' + list.length + '</span></h2><a href="' + more + '">View all</a></header>' +
    (list.length ? '<ul class="mini-list">' + list.slice(0, 5).map(render).join('') + '</ul>' : emptyState('Nothing to show.')) + '</section>';
  const batchLi = (b) => { const it = byId('items', b.itemId); return '<li><a href="#/items/' + it.id + '"><span><strong>' + esc(it.name) + '</strong><small>Lot ' + esc(b.lotNo) + ' · ' + fmtNum(batchQty(b.id)) + ' ' + esc(it.unit) + '</small></span><span class="mini-right">' + fmtDate(b.expiryDate) + '<br>' + daysBadge(b.expiryDate) + '</span></a></li>'; };

  const recent = DB.stock_transactions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 5);

  view.innerHTML =
    pageHeader('Dashboard', 'Maayong adlaw, <strong>' + esc(firstName(u)) + '</strong>! Here is the inventory picture for ' + fmtDate(todayISO()) + '.',
      '<a class="btn btn-ghost" href="#/search">' + icon('search', 16) + 'Asa ni? Search</a><a class="btn btn-primary" href="#/stock-in">' + icon('stockin', 16) + 'Record Stock-In</a>') +
    (!admin && toRelease.length ? '<div class="alert alert-success">' + icon('check', 16) + '<span><strong>' + toRelease.length + ' approved request' + (toRelease.length > 1 ? 's are' : ' is') + ' waiting for release.</strong> <a href="#/requests?tab=Approved">Open Requests</a></span></div>' : '') +
    '<div class="stat-grid">' + cardHTML + '</div>' +
    '<div class="grid-2">' +
      '<section class="card"><header class="card-head"><h2>Stock by category</h2><small class="muted">units on hand</small></header>' + barChartSVG(byCat, { label: 'Bar chart of stock on hand by category' }) + '</section>' +
      '<section class="card"><header class="card-head"><h2>Monthly releases</h2><small class="muted">last 6 months, units released</small></header>' + lineChartSVG(months, { label: 'Line chart of units released per month for the last 6 months' }) + '</section>' +
    '</div>' +
    '<div class="grid-3">' +
      alertList('Low Stock', 'orange', low, (r) => '<li><a href="#/items/' + r.item.id + '"><span><strong>' + esc(r.item.name) + '</strong><small>Reorder level: ' + fmtNum(r.item.reorderLevel) + ' ' + esc(r.item.unit) + '</small></span><span class="mini-right"><strong>' + fmtNum(r.total) + '</strong> ' + esc(r.item.unit) + '<br>' + badge(r.total === 0 ? 'Out of Stock' : 'Low Stock') + '</span></a></li>', '#/notifications?type=Low%20Stock') +
      alertList('Near Expiry (≤ ' + settings().nearExpiryDays + ' days)', 'amber', near, batchLi, '#/notifications?type=Near%20Expiry') +
      alertList('Expired', 'red', expired, batchLi, '#/notifications?type=Expired') +
    '</div>' +
    '<div class="grid-2">' +
      '<section class="card"><header class="card-head"><h2>Recent transactions</h2><a href="#/reports?type=movement">Movement report</a></header>' +
        (recent.length ? '<ul class="timeline compact">' + recent.map((t) => txnHTML(t, true)).join('') + '</ul>' : emptyState('No transactions yet.')) + '</section>' +
      '<section class="card" id="dash-pending"><header class="card-head"><h2>Pending requests <span class="count-pill">' + pending.length + '</span></h2><a href="#/requests?tab=Pending">View all</a></header>' +
        (pending.length ? '<ul class="mini-list req-list">' + pending.slice(0, 5).map((r) =>
          '<li><div class="req-row"><span><a href="#/requests/' + r.id + '"><strong>' + esc(r.requestNo) + '</strong></a> ' + badge(r.type) + '<small>' + esc(RequestActions.requester(r)) + '</small><small class="muted">' + esc(RequestActions.summary(r)) + ' · ' + fmtDateTime(r.recordedAt) + '</small></span>' +
          (admin ? '<span class="row-actions">' + RequestActions.approveButton(r, true) + RequestActions.rejectButton(r, true) + '</span>' : '') + '</div></li>').join('') + '</ul>'
          : emptyState('No pending requests.')) + '</section>' +
    '</div>';
  RequestActions.bind($('#dash-pending', view), rerender);
};

/* ================================================================== */
/* C. "ASA NI?" ITEM SEARCH                                              */
/* ================================================================== */
Pages.search = (view, r) => {
  const q0 = r.query.q || '';
  const opt = (list) => list.map((x) => '<option value="' + esc(x.value) + '">' + esc(x.label) + '</option>').join('');
  const usedBarangays = Array.from(new Set(activeOf('locations').map((l) => l.barangay))).sort();
  view.innerHTML =
    pageHeader('"Asa ni?" Item Search', 'Where is this? Find every place an item is stored or deployed.') +
    '<section class="card search-hero">' +
      '<form id="s-form" role="search"><label for="s-q" class="sr-only">Asa ni? Search an item</label><div class="search-big">' + icon('search', 24) +
        '<input id="s-q" type="search" value="' + esc(q0) + '" placeholder="Asa ni? Search an item…  (e.g. tractor, rice, RS-0925, Visayan Village)" autocomplete="off"><button class="btn btn-primary" type="submit">Search</button></div></form>' +
      '<div class="filter-bar">' +
        '<div class="filter"><label for="s-cat">Category</label><select id="s-cat"><option value="">All categories</option>' + opt(activeOf('categories').map((c) => ({ value: c.id, label: c.name }))) + '</select></div>' +
        '<div class="filter"><label for="s-loc">Location</label><select id="s-loc"><option value="">All locations</option>' + opt(activeOf('locations').map((l) => ({ value: l.id, label: locLabel(l) }))) + '</select></div>' +
        '<div class="filter"><label for="s-ltype">Location type</label><select id="s-ltype"><option value="">All types</option>' + opt(LOCATION_TYPES.map((t) => ({ value: t, label: t }))) + '</select></div>' +
        '<div class="filter"><label for="s-brgy">Barangay</label><select id="s-brgy"><option value="">All barangays</option>' + opt(usedBarangays.map((b) => ({ value: b, label: b }))) + '</select></div>' +
        '<div class="filter"><label for="s-status">Status</label><select id="s-status"><option value="">All statuses</option>' + opt(ITEM_STATUSES.map((s) => ({ value: s, label: s }))) + '</select></div>' +
        '<div class="filter"><label for="s-exp">Expiry</label><select id="s-exp"><option value="">Any expiry</option><option value="expired">Already expired</option><option value="near">Within ' + settings().nearExpiryDays + ' days</option><option value="90">Within 90 days</option><option value="none">No expiry date</option></select></div>' +
        '<button type="button" class="btn btn-ghost btn-sm filter-clear" id="s-clear">Clear</button>' +
      '</div>' +
    '</section>' +
    '<p id="s-count" class="result-count" aria-live="polite"></p><div id="s-results" class="results"></div>';

  const qEl = $('#s-q', view);
  const val = (id) => $('#' + id, view).value;
  const run = () => {
    const raw = qEl.value.trim();
    const q = raw.toLowerCase();
    const f = { cat: val('s-cat'), loc: val('s-loc'), ltype: val('s-ltype'), brgy: val('s-brgy'), status: val('s-status'), exp: val('s-exp') };
    const placeFilter = f.loc || f.ltype || f.brgy || f.exp;
    const expOk = (p) => {
      if (!f.exp) return true;
      const exp = p.kind === 'stock' ? p.batch.expiryDate : null;
      if (f.exp === 'none') return !exp;
      if (!exp) return false;
      const d = daysTo(exp);
      if (f.exp === 'expired') return d < 0;
      if (f.exp === 'near') return d >= 0 && d <= settings().nearExpiryDays;
      return d >= 0 && d <= 90;
    };
    const placeText = (p) => [locLabel(p.loc), p.loc.barangay, p.loc.type, p.batch ? p.batch.lotNo : '', p.batch ? p.batch.drNo : '',
      p.unit ? p.unit.propertyNo : '', p.unit ? p.unit.serialNo : '', p.unit && p.unit.personnelId ? personName(p.unit.personnelId) : ''].join(' ').toLowerCase();
    const results = [];
    activeItems().forEach((item) => {
      if (f.cat && item.categoryId !== Number(f.cat)) return;
      const status = itemStatus(item);
      if (f.status && status !== f.status) return;
      let places = itemPlaces(item).filter((p) => (!f.loc || p.loc.id === Number(f.loc)) && (!f.ltype || p.loc.type === f.ltype) && (!f.brgy || p.loc.barangay === f.brgy) && expOk(p));
      const itemMatch = !q || [item.name, item.code, categoryName(item.categoryId), item.type, item.description].join(' ').toLowerCase().includes(q);
      if (!itemMatch) places = places.filter((p) => placeText(p).includes(q));
      if (!itemMatch && !places.length) return;
      if (placeFilter && !places.length) return;
      results.push({ item, status, places });
    });
    $('#s-count', view).innerHTML = results.length + ' item' + (results.length === 1 ? '' : 's') + ' found' + (raw ? ' for “<strong>' + esc(raw) + '</strong>”' : '');
    $('#s-results', view).innerHTML = results.length ? results.map(({ item, status, places }) => {
      const lines = places.length ? places.sort((a, b) => (a.batch && b.batch && a.batch.expiryDate && b.batch.expiryDate ? a.batch.expiryDate.localeCompare(b.batch.expiryDate) : 0)).map((p) => {
        if (p.kind === 'unit') {
          const e = p.unit;
          return '<li>' + icon('pin', 16) + '<span><strong>' + highlight(item.name, raw) + ' (' + highlight(e.propertyNo, raw) + ')</strong> at ' + highlight(locLabel(p.loc), raw) + '. ' +
            (e.status === 'Assigned' ? 'Custodian: <strong>' + highlight(personName(e.personnelId), raw) + '</strong>, assigned since ' + fmtDate(e.dateAssigned) + '.' : 'Available, in storage.') +
            ' <span class="chip">' + esc(p.loc.barangay) + '</span> ' + badge(e.status) + '</span></li>';
        }
        const bs = batchExpiryStatus(p.batch);
        return '<li>' + icon('pin', 16) + '<span><strong>' + highlight(item.name, raw) + ', Lot ' + highlight(p.batch.lotNo, raw) + '</strong>: ' + fmtNum(p.qty) + ' ' + esc(item.unit) + ' at ' + highlight(locLabel(p.loc), raw) +
          ' <span class="chip">' + esc(p.loc.barangay) + '</span>' + (p.batch.expiryDate ? ' <span class="muted">exp. ' + fmtDate(p.batch.expiryDate) + '</span>' : '') + (bs ? ' ' + badge(bs) : '') + '</span></li>';
      }).join('') : '<li class="muted">' + icon('inbox', 16) + '<span>No stock on hand at any location.</span></li>';
      return '<a class="result-card" href="#/items/' + item.id + '"><header><div><h3>' + highlight(item.name, raw) + '</h3><p class="muted">' + highlight(item.code, raw) + ' · ' + esc(categoryName(item.categoryId)) + ' · ' + esc(item.type) + '</p></div>' +
        '<div class="result-qty"><strong>' + fmtNum(itemTotal(item)) + '</strong> ' + esc(item.unit) + '<br>' + badge(status) + '</div></header><ul class="places">' + lines + '</ul><span class="result-more">View item details ' + icon('arrow', 14) + '</span></a>';
    }).join('') : emptyState('No items found.', 'Try a different keyword, or clear the filters.');
  };
  const syncUrl = () => replaceQuery('/search', { q: qEl.value.trim() });
  $('#s-form', view).addEventListener('submit', (e) => { e.preventDefault(); syncUrl(); run(); });
  qEl.addEventListener('input', debounce(() => { syncUrl(); run(); }, 200));
  $$('.filter-bar select', view).forEach((s) => s.addEventListener('change', run));
  $('#s-clear', view).addEventListener('click', () => { $$('.filter-bar select', view).forEach((s) => { s.value = ''; }); qEl.value = ''; syncUrl(); run(); qEl.focus(); });
  const gs = $('#gs-input'); if (gs) gs.value = q0;
  run();
  qEl.focus();
};

/* ================================================================== */
/* D. ITEMS / INVENTORY  +  E. ITEM DETAILS                             */
/* ================================================================== */
function itemFields(existing) {
  const hasStock = existing && (itemBatches(existing.id).length > 0 || DB.equipment.some((e) => e.itemId === existing.id));
  return [
    { name: 'code', label: 'Item code', required: true, placeholder: 'e.g. SD-003', hint: 'Must be unique.',
      validate: (v) => (DB.items.some((i) => i.code.toLowerCase() === v.toLowerCase() && (!existing || i.id !== existing.id)) ? 'This item code is already used.' : (!/^[A-Za-z0-9-]{3,20}$/.test(v) ? 'Use 3–20 letters, numbers or dashes.' : '')) },
    { name: 'name', label: 'Item name', required: true },
    { name: 'categoryId', label: 'Category', type: 'select', required: true, options: () => activeOf('categories').map((c) => ({ value: c.id, label: c.name })) },
    { name: 'unit', label: 'Unit of measure', type: 'select', required: true, options: UNIT_OPTIONS },
    { name: 'type', label: 'Type', type: 'select', required: true, options: ['Consumable', 'Equipment'], hint: 'Equipment is tracked per unit with a custodian.',
      validate: (v) => (existing && hasStock && v !== existing.type ? 'Type cannot change once the item has stock records.' : '') },
    { name: 'reorderLevel', label: 'Reorder level', type: 'number', required: true, min: 0, hint: 'Low Stock alert when on-hand ≤ this quantity.' },
    { name: 'description', label: 'Description', type: 'textarea', full: true }
  ];
}

function openItemModal(existing, done) {
  const fields = itemFields(existing);
  const modal = openModal({
    title: existing ? 'Edit item · ' + existing.code : 'Add item', size: 'lg',
    body: '<form id="item-form" novalidate>' + formHTML(fields, existing || { type: 'Consumable', unit: 'kg', reorderLevel: 0 }) + '</form>',
    footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="item-save">' + icon('check', 16) + (existing ? 'Save changes' : 'Add item') + '</button>'
  });
  const form = modal.querySelector('#item-form');
  const save = () => {
    const v = validateForm(form, fields);
    if (!v) return;
    const rec = { code: v.code.toUpperCase(), name: v.name, categoryId: Number(v.categoryId), unit: v.unit, type: v.type, reorderLevel: Number(v.reorderLevel), description: v.description };
    if (existing) {
      const d = diff(existing, rec);
      if (!d.changed) { closeModal(); toast('No changes to save.', 'info'); return; }
      Object.assign(existing, rec);
      syncAlerts(); saveDB();
      logAction('Update', 'Inventory', existing.code, d.old, d.new);
      toast('Item ' + existing.code + ' updated.', 'success');
    } else {
      const item = Object.assign({ id: nextId('items'), status: 'Active' }, rec);
      DB.items.push(item);
      syncAlerts(); saveDB();
      logAction('Create', 'Inventory', item.code, null, { name: item.name, category: categoryName(item.categoryId), type: item.type, unit: item.unit, reorderLevel: item.reorderLevel });
      toast('Item ' + item.code + ' added. Record a Stock-In to add quantity.', 'success');
    }
    closeModal();
    done && done();
  };
  modal.querySelector('#item-save').addEventListener('click', save);
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
}

function toggleItemStatus(item, done) {
  if (!isAdmin()) return;
  const deact = item.status === 'Active';
  confirmDialog({
    title: (deact ? 'Deactivate ' : 'Reactivate ') + item.code, variant: deact ? 'danger' : 'primary',
    message: deact ? '<p>Deactivate <strong>' + esc(item.name) + '</strong>?</p><p class="muted">The record is kept (no permanent delete). It will be hidden from forms and alerts, and can be reactivated later.</p>'
      : '<p>Reactivate <strong>' + esc(item.name) + '</strong>? It will appear in forms and alerts again.</p>',
    confirmText: deact ? 'Deactivate' : 'Reactivate',
    onConfirm: () => {
      item.status = deact ? 'Inactive' : 'Active';
      syncAlerts(); saveDB();
      logAction(deact ? 'Deactivate' : 'Update', 'Inventory', item.code, { status: deact ? 'Active' : 'Inactive' }, { status: item.status });
      toast(item.code + (deact ? ' deactivated.' : ' reactivated.'), 'success');
      done && done();
    }
  });
}

Pages.items = (view, r) => {
  if (r.parts[1]) return renderItemDetail(view, Number(r.parts[1]));
  const admin = isAdmin();
  const opt = (list, sel) => list.map((x) => '<option value="' + esc(x.value) + '"' + (String(x.value) === String(sel || '') ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('');
  view.innerHTML =
    pageHeader('Items / Inventory', 'All agricultural items with their total on hand and computed status.',
      '<button class="btn btn-ghost" id="it-export">' + icon('download', 16) + 'Export CSV</button><button class="btn btn-primary" id="it-add">' + icon('plus', 16) + 'Add item</button>') +
    '<section class="card">' +
      '<div class="toolbar">' +
        '<div class="filter grow"><label for="it-q">Search</label><input id="it-q" type="search" placeholder="Code, name or description…" value="' + esc(r.query.q || '') + '"></div>' +
        '<div class="filter"><label for="it-cat">Category</label><select id="it-cat"><option value="">All</option>' + opt(DB.categories.map((c) => ({ value: c.id, label: c.name })), r.query.category) + '</select></div>' +
        '<div class="filter"><label for="it-type">Type</label><select id="it-type"><option value="">All</option>' + opt([{ value: 'Consumable', label: 'Consumable' }, { value: 'Equipment', label: 'Equipment' }]) + '</select></div>' +
        '<div class="filter"><label for="it-status">Status</label><select id="it-status"><option value="">All</option>' + opt([{ value: 'low-any', label: 'Low or Out of Stock' }].concat(ITEM_STATUSES.map((s) => ({ value: s, label: s }))), r.query.status) + '</select></div>' +
        '<div class="filter"><label for="it-rec">Record</label><select id="it-rec"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="">All</option></select></div>' +
      '</div>' +
      '<div id="it-table"></div>' +
    '</section>';

  const table = new DataTable($('#it-table', view), {
    sortKey: 'code', emptyText: 'No items match your filters.',
    rowClass: (x) => (x.status === 'Inactive' ? 'row-inactive' : ''),
    columns: [
      { key: 'code', label: 'Code', render: (x) => '<a href="#/items/' + x.id + '"><strong>' + esc(x.code) + '</strong></a>' },
      { key: 'name', label: 'Name', render: (x) => '<a href="#/items/' + x.id + '">' + esc(x.name) + '</a>' },
      { key: 'cat', label: 'Category', render: (x) => esc(x.cat) },
      { key: 'type', label: 'Type', render: (x) => badge(x.type) },
      { key: 'unit', label: 'Unit' },
      { key: 'total', label: 'Total on hand', className: 'num', render: (x) => '<strong>' + fmtNum(x.total) + '</strong>' },
      { key: 'reorderLevel', label: 'Reorder level', className: 'num', render: (x) => fmtNum(x.reorderLevel) },
      { key: 'stockStatus', label: 'Status', render: (x) => badge(x.stockStatus) + (x.status === 'Inactive' ? ' ' + badge('Inactive') : '') },
      { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (x) =>
        '<a class="btn btn-ghost btn-sm" href="#/items/' + x.id + '">View</a>' +
        '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + x.id + '" aria-label="Edit ' + esc(x.name) + '">' + icon('edit', 14) + 'Edit</button>' +
        (admin ? '<button class="btn btn-sm ' + (x.status === 'Active' ? 'btn-danger-ghost' : 'btn-ghost') + '" data-act="toggle" data-id="' + x.id + '">' + (x.status === 'Active' ? 'Deactivate' : 'Reactivate') + '</button>' : '') }
    ]
  });
  let current = [];
  const apply = () => {
    const q = $('#it-q', view).value.trim().toLowerCase();
    const cat = $('#it-cat', view).value, type = $('#it-type', view).value, st = $('#it-status', view).value, rec = $('#it-rec', view).value;
    current = DB.items.map((i) => Object.assign({}, i, { total: itemTotal(i), stockStatus: itemStatus(i), cat: categoryName(i.categoryId) }))
      .filter((x) => (!q || [x.code, x.name, x.description, x.cat].join(' ').toLowerCase().includes(q)) &&
        (!cat || x.categoryId === Number(cat)) && (!type || x.type === type) && (!rec || x.status === rec) &&
        (!st || (st === 'low-any' ? x.total <= x.reorderLevel : x.stockStatus === st)));
    table.setRows(current);
  };
  $('#it-q', view).addEventListener('input', debounce(apply, 150));
  $$('.toolbar select', view).forEach((s) => s.addEventListener('change', apply));
  $('#it-add', view).addEventListener('click', () => openItemModal(null, rerender));
  $('#it-export', view).addEventListener('click', () => {
    downloadCSV('asani-items-' + todayISO() + '.csv', ['Code', 'Name', 'Category', 'Type', 'Unit', 'Total on hand', 'Reorder level', 'Status', 'Record status'],
      current.map((x) => [x.code, x.name, x.cat, x.type, x.unit, x.total, x.reorderLevel, x.stockStatus, x.status]));
    logAction('Export', 'Inventory', 'ITEM-LIST', null, { format: 'Excel (CSV)', rows: current.length });
    toast('Item list exported to CSV.', 'success');
  });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const item = byId('items', b.dataset.id);
    if (b.dataset.act === 'edit') openItemModal(item, apply);
    if (b.dataset.act === 'toggle') toggleItemStatus(item, apply);
  });
  apply();
};

function renderItemDetail(view, id) {
  const item = byId('items', id);
  if (!item) return Pages.notFound(view);
  const admin = isAdmin();
  const total = itemTotal(item), status = itemStatus(item);
  const batches = itemBatches(item.id).sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
  const places = itemPlaces(item);
  const txns = DB.stock_transactions.filter((t) => t.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  // Locations table (aggregated per location)
  const locMap = new Map();
  places.forEach((p) => { locMap.set(p.loc.id, (locMap.get(p.loc.id) || 0) + p.qty); });
  const locRows = Array.from(locMap.entries()).map(([lid, qty]) => {
    const l = byId('locations', lid);
    const where = l.type === 'Field Site' ? esc(l.address || '—') : esc([l.room, l.rack, l.shelf].filter(Boolean).join(' / ') || '—');
    return '<tr><td><strong>' + esc(l.name) + '</strong></td><td>' + badge(l.type) + '</td><td>' + esc(l.barangay) + '</td><td>' + where + '</td><td class="num"><strong>' + fmtNum(qty) + '</strong> ' + esc(item.unit) + '</td></tr>';
  }).join('');

  let stockSection;
  if (item.type === 'Equipment') {
    stockSection = '<section class="card"><header class="card-head"><h2>Equipment units</h2><a href="#/equipment?item=' + item.id + '">Open in Equipment &amp; Custody</a></header><div id="units-table"></div></section>';
  } else {
    const bRows = batches.map((b) => {
      const qty = batchQty(b.id);
      const per = DB.inventory_stock.filter((s) => s.batchId === b.id && s.quantity > 0).map((s) => '<div class="per-loc">' + fmtNum(s.quantity) + ' ' + esc(item.unit) + ' · ' + esc(locLabel(s.locationId)) + '</div>').join('') || '<span class="muted">—</span>';
      const bs = qty > 0 ? batchExpiryStatus(b) : null;
      return '<tr class="' + (qty === 0 ? 'row-inactive' : '') + '"><td><strong>' + esc(b.lotNo) + '</strong></td><td>' + esc(supplierName(b.supplierId)) + '</td><td>' + esc(b.drNo) + '</td><td>' + fmtDate(b.dateReceived) + '</td><td>' + fmtDate(b.expiryDate) + '</td><td>' + daysBadge(b.expiryDate) + '</td><td>' + per + '</td><td class="num"><strong>' + fmtNum(qty) + '</strong></td><td>' + (qty === 0 ? badge('Consumed') : bs ? badge(bs) : badge('OK')) + '</td></tr>';
    }).join('');
    stockSection = '<section class="card"><header class="card-head"><h2>Batches</h2><small class="muted">sorted by expiry (FEFO order)</small></header>' +
      (batches.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Lot no.</th><th>Supplier</th><th>DR no.</th><th>Date received</th><th>Expiry date</th><th>Days to expiry</th><th>Quantity per location</th><th class="num">Batch qty</th><th>Status</th></tr></thead><tbody>' + bRows + '</tbody></table></div>' : emptyState('No batches yet.', 'Record a Stock-In to add this item to inventory.')) + '</section>';
  }

  view.innerHTML =
    pageHeader(item.name, esc(item.code) + ' · ' + esc(categoryName(item.categoryId)) + ' · ' + badge(item.type) + ' ' + badge(status) + (item.status === 'Inactive' ? ' ' + badge('Inactive') : ''),
      '<a class="btn btn-ghost" href="#/stock-in?item=' + item.id + '">' + icon('stockin', 16) + 'Stock-In</a>' +
      (item.type === 'Consumable' ? '<a class="btn btn-ghost" href="#/requests/new?item=' + item.id + '">' + icon('clipboard', 16) + 'New request</a>' : '') +
      '<button class="btn btn-ghost" id="d-edit">' + icon('edit', 16) + 'Edit</button>' +
      (admin ? '<button class="btn ' + (item.status === 'Active' ? 'btn-danger-ghost' : 'btn-ghost') + '" id="d-toggle">' + (item.status === 'Active' ? 'Deactivate' : 'Reactivate') + '</button>' : ''),
      [{ label: 'Items', href: '#/items' }, { label: item.code }]) +
    '<div class="stat-grid small">' +
      '<div class="stat-card tone-green"><span class="stat-body"><span class="stat-label">Total on hand</span><strong class="stat-value">' + fmtNum(total) + ' <small>' + esc(item.unit) + '</small></strong></span></div>' +
      '<div class="stat-card tone-orange"><span class="stat-body"><span class="stat-label">Reorder level</span><strong class="stat-value">' + fmtNum(item.reorderLevel) + ' <small>' + esc(item.unit) + '</small></strong></span></div>' +
      '<div class="stat-card tone-blue"><span class="stat-body"><span class="stat-label">' + (item.type === 'Equipment' ? 'Units assigned' : 'Batches with stock') + '</span><strong class="stat-value">' + (item.type === 'Equipment' ? places.filter((p) => p.unit.status === 'Assigned').length : batches.filter((b) => batchQty(b.id) > 0).length) + '</strong></span></div>' +
      '<div class="stat-card tone-teal"><span class="stat-body"><span class="stat-label">Locations</span><strong class="stat-value">' + locMap.size + '</strong></span></div>' +
    '</div>' +
    '<div class="grid-2 align-start">' +
      '<section class="card"><header class="card-head"><h2>Item information</h2></header>' + infoList([
        ['Item code', esc(item.code)], ['Category', esc(categoryName(item.categoryId))], ['Type', esc(item.type)], ['Unit of measure', esc(item.unit)],
        ['Reorder level', fmtNum(item.reorderLevel) + ' ' + esc(item.unit)], ['Stock status', badge(status)], ['Record status', badge(item.status)], ['Description', esc(item.description)]]) + '</section>' +
      '<section class="card"><header class="card-head"><h2>Locations</h2><small class="muted">"Asa ni?" — where it is</small></header>' +
        (locRows ? '<div class="table-wrap"><table class="table"><thead><tr><th>Location</th><th>Type</th><th>Barangay</th><th>Room / rack / shelf or landmark</th><th class="num">Quantity</th></tr></thead><tbody>' + locRows + '</tbody></table></div>' : emptyState('Not stored anywhere yet.')) + '</section>' +
    '</div>' +
    stockSection +
    '<section class="card"><header class="card-head"><h2>Movement history</h2><small class="muted">' + txns.length + ' transaction' + (txns.length === 1 ? '' : 's') + '</small></header>' +
      (txns.length ? '<ul class="timeline">' + txns.map((t) => txnHTML(t)).join('') + '</ul>' : emptyState('No movements recorded.')) + '</section>';

  if (item.type === 'Equipment') {
    const units = DB.equipment.filter((e) => e.itemId === item.id);
    const t = new DataTable($('#units-table', view), {
      sortKey: 'propertyNo', pageSize: 20, emptyText: 'No units recorded.',
      expand: (e) => custodyHistoryHTML(e.id),
      columns: [
        { key: 'propertyNo', label: 'Property no.', render: (e) => '<a href="#/equipment/' + e.id + '"><strong>' + esc(e.propertyNo) + '</strong></a>' },
        { key: 'serialNo', label: 'Serial no.' },
        { key: 'condition', label: 'Condition', render: (e) => badge(e.condition) },
        { key: 'loc', label: 'Current location', value: (e) => locLabel(e.locationId), render: (e) => esc(locLabel(e.locationId)) },
        { key: 'person', label: 'Accountable person', value: (e) => (e.personnelId ? personName(e.personnelId) : ''), render: (e) => (e.personnelId ? esc(personName(e.personnelId)) : '<span class="muted">—</span>') },
        { key: 'dateAssigned', label: 'Date assigned', render: (e) => fmtDate(e.dateAssigned) },
        { key: 'status', label: 'Status', render: (e) => badge(e.status) }
      ]
    });
    t.setRows(units);
  }
  const edit = $('#d-edit', view); if (edit) edit.addEventListener('click', () => openItemModal(item, rerender));
  const tog = $('#d-toggle', view); if (tog) tog.addEventListener('click', () => toggleItemStatus(item, rerender));
}

function custodyHistoryHTML(equipmentId) {
  const list = DB.custody_assignments.filter((c) => c.equipmentId === equipmentId).sort((a, b) => b.dateAssigned.localeCompare(a.dateAssigned));
  if (!list.length) return '<p class="muted">No custody history yet.</p>';
  return '<div class="table-wrap"><table class="table table-inner"><thead><tr><th>Accountable person</th><th>Location</th><th>Assigned</th><th>Condition out</th><th>Returned</th><th>Condition on return</th><th>Remarks</th></tr></thead><tbody>' +
    list.map((c) => '<tr><td><strong>' + esc(personName(c.personnelId)) + '</strong></td><td>' + esc(locLabel(c.locationId)) + '</td><td>' + fmtDate(c.dateAssigned) + '</td><td>' + esc(c.conditionOut || '—') + '</td><td>' + (c.dateReturned ? fmtDate(c.dateReturned) : badge('Still assigned')) + '</td><td>' + esc(c.conditionIn || '—') + '</td><td>' + esc(c.remarks || '—') + '</td></tr>').join('') +
    '</tbody></table></div>';
}

/* ================================================================== */
/* F. STOCK-IN                                                           */
/* ================================================================== */
function nextPropertyNo() {
  const year = new Date().getFullYear();
  const max = DB.equipment.reduce((m, e) => {
    const mm = /^EQ-(\d{4})-(\d+)$/.exec(e.propertyNo);
    return mm && Number(mm[1]) === year ? Math.max(m, Number(mm[2])) : m;
  }, 0);
  return (n) => 'EQ-' + year + '-' + String(max + n).padStart(3, '0');
}

Pages['stock-in'] = (view, r) => {
  const itemOf = (vals) => byId('items', vals.itemId);
  const needsExpiry = (vals) => { const it = itemOf(vals); return !!it && it.type === 'Consumable' && CONSUMABLE_EXPIRY_CATEGORIES.includes(categoryName(it.categoryId)); };
  const fields = [
    { name: 'itemId', label: 'Item', type: 'select', required: true, full: true, options: () => activeItems().map(itemOpt) },
    { name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: () => activeOf('suppliers').map((s) => ({ value: s.id, label: s.name + ' (' + s.type + ')' })) },
    { name: 'drNo', label: 'Delivery receipt (DR) number', required: true, placeholder: 'e.g. DR-DA11-2026-1120' },
    { name: 'lotNo', label: 'Lot / batch number', required: true, placeholder: 'e.g. RS-1126',
      validate: (v, vals) => (DB.batches.some((b) => b.itemId === Number(vals.itemId) && b.lotNo.toLowerCase() === v.toLowerCase()) ? 'This lot number already exists for this item.' : '') },
    { name: 'quantity', label: 'Quantity received', type: 'number', required: true, min: 0.01,
      validate: (v, vals) => { const it = itemOf(vals); if (!it) return ''; if (isWhole(it) && !Number.isInteger(Number(v))) return 'Whole numbers only for ' + it.unit + '.'; if (it.type === 'Equipment' && Number(v) > 50) return 'Record at most 50 equipment units at a time.'; return ''; } },
    { name: 'dateReceived', label: 'Date received', type: 'date', required: true, default: todayISO(), validate: (v) => (v > todayISO() ? 'Date received cannot be in the future.' : '') },
    { name: 'expiryDate', label: 'Expiry date', type: 'date', required: needsExpiry, hint: 'Required for seeds, fertilizers and pesticides. Optional for tools, equipment and planting materials.',
      validate: (v, vals) => (v && vals.dateReceived && v <= vals.dateReceived ? 'Expiry must be after the date received.' : '') },
    { name: 'locationId', label: 'Storage location', type: 'select', required: true, full: true, options: () => activeOf('locations').map((l) => ({ value: l.id, label: locLabel(l) + ' (' + l.type + ', ' + l.barangay + ')' })) },
    { name: 'serials', label: 'Serial numbers (optional)', type: 'textarea', full: true, rows: 2, placeholder: 'One per line or comma-separated, in the same order as the units', showIf: (vals) => { const it = itemOf(vals); return !!it && it.type === 'Equipment'; } },
    { name: 'remarks', label: 'Remarks', type: 'textarea', full: true, rows: 2 }
  ];
  const recent = DB.stock_transactions.filter((t) => t.type === 'Stock-In').sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 6);
  view.innerHTML =
    pageHeader('Stock-In', 'Record a delivery. The balance and status update automatically.', '', [{ label: 'Inventory', href: '#/items' }, { label: 'Stock-In' }]) +
    '<div class="grid-2 align-start wide-left">' +
      '<section class="card"><header class="card-head"><h2>Delivery details</h2></header><form id="si-form" novalidate>' + formHTML(fields, { itemId: r.query.item || '' }) +
        '<div class="form-actions"><button type="reset" class="btn btn-ghost">Clear</button><button type="submit" class="btn btn-primary">' + icon('check', 16) + 'Save Stock-In</button></div></form></section>' +
      '<aside class="stack">' +
        '<section class="card" id="si-info" aria-live="polite"></section>' +
        '<section class="card"><header class="card-head"><h2>Recent Stock-Ins</h2></header><ul class="timeline compact">' + recent.map((t) => txnHTML(t, true)).join('') + '</ul></section>' +
      '</aside>' +
    '</div>';
  const form = $('#si-form', view);
  bindShowIf(form, fields);
  const showInfo = () => {
    const it = byId('items', form.elements.itemId.value);
    $('#si-info', view).innerHTML = it ? '<header class="card-head"><h2>Current balance</h2></header>' + infoList([
      ['Item', '<a href="#/items/' + it.id + '">' + esc(it.name) + '</a>'], ['Category', esc(categoryName(it.categoryId))], ['Type', esc(it.type)],
      ['On hand', '<strong>' + fmtNum(itemTotal(it)) + '</strong> ' + esc(it.unit)], ['Reorder level', fmtNum(it.reorderLevel) + ' ' + esc(it.unit)], ['Status', badge(itemStatus(it))]]) +
      (it.type === 'Equipment' ? '<p class="hint-box">' + icon('tool', 16) + 'Equipment: each unit gets its own property number (e.g. ' + nextPropertyNo()(1) + ') and starts as <strong>Available</strong>.</p>' : '')
      : '<header class="card-head"><h2>Current balance</h2></header>' + emptyState('Choose an item to see its balance.');
  };
  form.elements.itemId.addEventListener('change', showInfo);
  form.addEventListener('reset', () => setTimeout(() => { $$('.field', form).forEach((w) => setFieldError(w, '')); form.elements.dateReceived.value = todayISO(); applyShowIf(form, fields); showInfo(); }, 0));
  showInfo();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateForm(form, fields);
    if (!v) { toast('Please correct the highlighted fields.', 'error'); return; }
    const it = byId('items', v.itemId);
    const qty = Number(v.quantity);
    const before = itemTotal(it);
    const batch = { id: nextId('batches'), itemId: it.id, lotNo: v.lotNo.toUpperCase(), supplierId: Number(v.supplierId), drNo: v.drNo, dateReceived: v.dateReceived, expiryDate: v.expiryDate || null, qtyReceived: qty, remarks: v.remarks };
    DB.batches.push(batch);
    const loc = Number(v.locationId);
    let created = [];
    if (it.type === 'Equipment') {
      const serials = v.serials.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const pn = nextPropertyNo();
      for (let i = 1; i <= qty; i++) {
        const unit = { id: nextId('equipment'), itemId: it.id, batchId: batch.id, propertyNo: pn(i), serialNo: serials[i - 1] || '—', condition: 'New', locationId: loc, status: 'Available', personnelId: null, dateAssigned: null };
        DB.equipment.push(unit);
        created.push(unit.propertyNo);
      }
    } else {
      DB.inventory_stock.push({ id: nextId('inventory_stock'), batchId: batch.id, locationId: loc, quantity: qty });
    }
    DB.stock_transactions.push({ id: nextId('stock_transactions'), date: nowStamp(), type: 'Stock-In', itemId: it.id, batchId: batch.id, equipmentId: null, locationId: loc, toLocationId: null, quantity: qty, userId: currentUser().id, refNo: v.drNo, remarks: v.remarks || 'Delivery received' });
    syncAlerts(); saveDB();
    const after = itemTotal(it);
    logAction('Create', 'Stock-In', batch.lotNo, { item: it.name, onHand: before }, { item: it.name, quantity: qty, onHand: after, location: locLabel(loc), dr: v.drNo, supplier: supplierName(batch.supplierId) });
    toast('Stock-In saved: ' + fmtNum(qty) + ' ' + it.unit + ' of ' + it.name + '.', 'success');
    form.reset();
    const prevAlert = view.querySelector('.card > .alert-success');
    if (prevAlert) prevAlert.remove();
    view.querySelector('.card').insertAdjacentHTML('afterbegin',
      '<div class="alert alert-success" role="status">' + icon('check', 18) + '<div><strong>Stock-In recorded.</strong> ' + esc(it.name) + ', Lot ' + esc(batch.lotNo) + ': ' + fmtNum(qty) + ' ' + esc(it.unit) + ' at ' + esc(locLabel(loc)) + '.<br>' +
      'Balance: ' + fmtNum(before) + ' → <strong>' + fmtNum(after) + ' ' + esc(it.unit) + '</strong> · Status: ' + badge(itemStatus(it)) +
      (created.length ? '<br>New property numbers: ' + created.map(esc).join(', ') : '') + '<br><a href="#/items/' + it.id + '">View item</a></div></div>');
    refreshChrome();
  });
};

/* ================================================================== */
/* G. REQUESTS                                                           */
/* ================================================================== */
Pages.requests = (view, r) => {
  if (r.parts[1] === 'new') return renderNewRequest(view, r);
  if (r.parts[1]) return renderRequestDetail(view, Number(r.parts[1]));
  const admin = isAdmin();
  const tabsList = ['All', 'Pending', 'Approved', 'Rejected', 'Released'];
  let tab = tabsList.includes(r.query.tab) ? r.query.tab : 'All';
  const counts = (t) => (t === 'All' ? DB.stock_requests.length : DB.stock_requests.filter((x) => x.status === t).length);
  view.innerHTML =
    pageHeader('Requests', 'Release, transfer and adjustment requests: Recorded → Approved / Rejected → Released.', '<a class="btn btn-primary" href="#/requests/new">' + icon('plus', 16) + 'New request</a>') +
    '<section class="card">' + tabsHTML(tabsList.map((t) => ({ key: t, label: t, count: counts(t) })), tab, 'Request status') +
      '<div class="toolbar"><div class="filter grow"><label for="rq-q">Search</label><input id="rq-q" type="search" placeholder="Request no., RIS no., requester or item…"></div>' +
      '<div class="filter"><label for="rq-type">Type</label><select id="rq-type"><option value="">All types</option><option>Release</option><option>Transfer</option><option>Adjustment</option></select></div></div>' +
      '<div id="rq-table" role="tabpanel"></div></section>';
  const table = new DataTable($('#rq-table', view), {
    sortKey: 'recordedAt', sortDir: 'desc', emptyText: 'No requests here.',
    columns: [
      { key: 'requestNo', label: 'Request no.', render: (x) => '<a href="#/requests/' + x.id + '"><strong>' + esc(x.requestNo) + '</strong></a>' },
      { key: 'recordedAt', label: 'Date recorded', render: (x) => fmtDateTime(x.recordedAt) },
      { key: 'type', label: 'Type', render: (x) => badge(x.type) },
      { key: 'risNo', label: 'RIS no.', render: (x) => esc(x.risNo || '—') },
      { key: 'who', label: 'Requested by', render: (x) => esc(x.who) },
      { key: 'items', label: 'Items', render: (x) => '<span class="muted">' + esc(x.items) + '</span>' },
      { key: 'status', label: 'Status', render: (x) => badge(x.status) },
      { key: 'recorder', label: 'Recorded by', render: (x) => esc(x.recorder) },
      { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (x) =>
        '<a class="btn btn-ghost btn-sm" href="#/requests/' + x.id + '">View</a>' +
        (admin && x.status === 'Pending' ? RequestActions.approveButton(x, true) + RequestActions.rejectButton(x, true) : '') +
        (!admin && x.status === 'Approved' ? RequestActions.releaseButton(x, true) : '') }
    ]
  });
  const apply = () => {
    const q = $('#rq-q', view).value.trim().toLowerCase(), type = $('#rq-type', view).value;
    table.setRows(DB.stock_requests.map((x) => Object.assign({}, x, { who: RequestActions.requester(x), items: RequestActions.summary(x), recorder: userName(x.recordedBy) }))
      .filter((x) => (tab === 'All' || x.status === tab) && (!type || x.type === type) && (!q || [x.requestNo, x.risNo, x.who, x.items, x.purpose].join(' ').toLowerCase().includes(q))));
  };
  bindTabs(view, (t) => { tab = t; replaceQuery('/requests', { tab: t === 'All' ? '' : t }); apply(); });
  $('#rq-q', view).addEventListener('input', debounce(apply, 150));
  $('#rq-type', view).addEventListener('change', apply);
  RequestActions.bind($('#rq-table', view), rerender);
  apply();
};

function renderRequestDetail(view, id) {
  const req = byId('stock_requests', id);
  if (!req) return Pages.notFound(view);
  const admin = isAdmin();
  const lines = RequestActions.lines(req.id);
  const lineRows = lines.map((l) => {
    const it = byId('items', l.itemId);
    const used = (l.batchesUsed || []).map((u) => {
      const b = byId('batches', u.batchId);
      return '<div class="per-loc">Lot <strong>' + esc(b ? b.lotNo : '?') + '</strong> · ' + fmtNum(u.qty) + ' ' + esc(it.unit) + ' from ' + esc(locLabel(u.locationId)) + (u.toLocationId ? ' → ' + esc(locLabel(u.toLocationId)) : '') + (b && b.expiryDate ? ' <span class="muted">(exp. ' + fmtDate(b.expiryDate) + ')</span>' : '') + '</div>';
    }).join('');
    const avail = req.type === 'Adjustment' ? itemTotal(it) : releasableQty(it.id);
    return '<tr><td><a href="#/items/' + it.id + '"><strong>' + esc(it.name) + '</strong></a><br><small class="muted">' + esc(it.code) + '</small></td><td class="num">' + fmtNum(l.qtyRequested) + ' ' + esc(it.unit) + '</td>' +
      '<td class="num">' + (l.qtyApproved === null || l.qtyApproved === undefined ? '<span class="muted">—</span>' : fmtNum(l.qtyApproved) + ' ' + esc(it.unit)) + '</td>' +
      '<td>' + (req.status === 'Released' ? (used || '<span class="muted">—</span>') : req.status === 'Rejected' ? '<span class="muted">Not released</span>' : '<span class="muted">Available now: ' + fmtNum(avail) + ' ' + esc(it.unit) + '</span>') + '</td></tr>';
  }).join('');

  const step = (state, title, who, when, note) => '<li class="step step-' + state + '"><span class="step-dot" aria-hidden="true">' + (state === 'done' ? icon('check', 14) : state === 'rejected' ? icon('x', 14) : '') + '</span><div><strong>' + esc(title) + '</strong>' +
    (who ? '<p>' + esc(who) + (when ? ' · ' + fmtDateTime(when) : '') + '</p>' : '') + (note ? '<p class="muted">' + esc(note) + '</p>' : '') + '</div></li>';
  const decided = req.status === 'Approved' || req.status === 'Released';
  const timeline = '<ol class="steps">' +
    step('done', 'Recorded', userName(req.recordedBy), req.recordedAt) +
    (req.status === 'Rejected' ? step('rejected', 'Rejected', userName(req.decidedBy), req.decidedAt, req.decisionRemarks)
      : decided ? step('done', 'Approved', userName(req.decidedBy), req.decidedAt, req.decisionRemarks) : step('waiting', 'Approval', '', '', 'Waiting for the Administrator to approve or reject.')) +
    (req.status === 'Rejected' ? step('skipped', 'Released', '', '', 'Not applicable: the request was rejected.')
      : req.status === 'Released' ? step('done', req.type === 'Release' ? 'Released' : 'Posted (' + req.type + ')', userName(req.releasedBy), req.releasedAt)
        : step('waiting', 'Release', '', '', req.status === 'Approved' ? 'Waiting for Inventory Staff to release.' : 'After approval.')) + '</ol>';

  let actions = '';
  if (admin && req.status === 'Pending') actions = RequestActions.approveButton(req) + RequestActions.rejectButton(req);
  if (!admin && req.status === 'Approved') actions = RequestActions.releaseButton(req);
  const ownNote = admin && req.status === 'Pending' && req.recordedBy === currentUser().id
    ? '<div class="alert alert-warn">' + icon('lock', 16) + '<span><strong>Separation of duties:</strong> you recorded this request, so you cannot approve it. Another Administrator must approve it.</span></div>' : '';
  const staffNote = admin && req.status === 'Approved' ? '<div class="alert alert-info">' + icon('clock', 16) + '<span>Approved. Inventory Staff will release it from the warehouse (FEFO).</span></div>' : '';

  view.innerHTML =
    pageHeader(req.requestNo, badge(req.type) + ' ' + badge(req.status) + (req.risNo ? ' · ' + esc(req.risNo) : ''), '<span id="rq-actions" class="page-actions">' + actions + '</span>',
      [{ label: 'Requests', href: '#/requests' }, { label: req.requestNo }]) +
    ownNote + staffNote +
    '<div class="grid-2 align-start wide-left">' +
      '<div class="stack">' +
        '<section class="card"><header class="card-head"><h2>Request information</h2></header>' + infoList([
          ['Request type', esc(req.type)], ['RIS number', esc(req.risNo || '—')], ['Requested by', esc(RequestActions.requester(req))],
          ['Purpose / reason', esc(req.purpose)],
          req.type === 'Transfer' ? ['Target location', esc(locLabel(req.targetLocationId))] : null,
          req.type === 'Adjustment' ? ['Adjustment reason', esc(req.adjustmentReason) + (req.adjustmentDirection ? ' (' + esc(req.adjustmentDirection.toLowerCase()) + ')' : '')] : null,
          ['Recorded by', esc(userName(req.recordedBy)) + ' · ' + fmtDateTime(req.recordedAt)]].filter(Boolean)) + '</section>' +
        '<section class="card"><header class="card-head"><h2>Request items</h2>' + (req.status === 'Released' ? '<small class="muted">batches used (FEFO)</small>' : '') + '</header>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th class="num">Requested</th><th class="num">Approved</th><th>' + (req.status === 'Released' ? 'Batches used (FEFO)' : 'Stock') + '</th></tr></thead><tbody>' + lineRows + '</tbody></table></div></section>' +
      '</div>' +
      '<section class="card"><header class="card-head"><h2>Status timeline</h2></header>' + timeline + '</section>' +
    '</div>';
  RequestActions.bind(view, rerender);
}

/** Quantity that can be requested for one line, by request type. */
function availableFor(itemId, type, direction, targetLocationId) {
  if (type === 'Adjustment') return direction === 'Increase' ? Infinity : itemTotal(byId('items', itemId));
  let q = releasableQty(itemId);
  if (type === 'Transfer' && targetLocationId) {
    q -= DB.inventory_stock.filter((s) => s.locationId === Number(targetLocationId)).reduce((s, x) => {
      const b = byId('batches', x.batchId);
      return b.itemId === itemId && batchExpiryStatus(b) !== 'Expired' ? s + x.quantity : s;
    }, 0);
  }
  return q;
}

function renderNewRequest(view, r) {
  const fields = [
    { name: 'type', label: 'Request type', type: 'select', required: true, placeholder: false, options: ['Release', 'Transfer', 'Adjustment'], default: 'Release' },
    { name: 'risNo', label: 'RIS number', placeholder: 'e.g. RIS-2026-11-050', hint: 'Requisition and Issue Slip. Optional for adjustments.', required: (v) => v.type !== 'Adjustment',
      validate: (v) => { if (!v) return ''; const dup = DB.stock_requests.find((x) => x.risNo && x.risNo.toLowerCase() === v.toLowerCase()); return dup ? 'Already used by ' + dup.requestNo + '.' : ''; } },
    { name: 'requesterType', label: 'Requested by', type: 'select', required: true, placeholder: false, options: [{ value: 'Beneficiary', label: 'Beneficiary or association' }, { value: 'Personnel', label: 'Field personnel' }] },
    { name: 'beneficiaryId', label: 'Beneficiary / association', type: 'select', required: true, showIf: (v) => v.requesterType === 'Beneficiary',
      options: () => activeOf('beneficiaries').map((b) => ({ value: b.id, label: b.name + ' · ' + b.type + ' · ' + b.barangay })) },
    { name: 'personnelId', label: 'Field personnel', type: 'select', required: true, showIf: (v) => v.requesterType === 'Personnel',
      options: () => activeOf('personnel').map((p) => ({ value: p.id, label: p.fullName + ' · ' + p.position })) },
    { name: 'targetLocationId', label: 'Target location', type: 'select', required: true, full: true, showIf: (v) => v.type === 'Transfer',
      options: () => activeOf('locations').map((l) => ({ value: l.id, label: locLabel(l) + ' (' + l.barangay + ')' })) },
    { name: 'adjustmentReason', label: 'Adjustment reason', type: 'select', required: true, showIf: (v) => v.type === 'Adjustment', options: ['Damage', 'Spoilage', 'Recount'] },
    { name: 'adjustmentDirection', label: 'Recount result', type: 'select', required: true, showIf: (v) => v.type === 'Adjustment' && v.adjustmentReason === 'Recount',
      options: [{ value: 'Decrease', label: 'Less than recorded (decrease)' }, { value: 'Increase', label: 'More than recorded (increase)' }] },
    { name: 'purpose', label: 'Purpose or reason', type: 'textarea', required: true, full: true, rows: 2 }
  ];
  const consumables = activeItems().filter((i) => i.type === 'Consumable');
  view.innerHTML =
    pageHeader('New request', 'Record a release, transfer or adjustment. The Administrator approves it, then Inventory Staff releases it.', '', [{ label: 'Requests', href: '#/requests' }, { label: 'New request' }]) +
    '<form id="rq-form" novalidate class="stack">' +
      '<section class="card"><header class="card-head"><h2>Request details</h2></header>' + formHTML(fields, { type: 'Release', requesterType: 'Beneficiary' }) + '</section>' +
      '<section class="card"><header class="card-head"><h2>Request items</h2><button type="button" class="btn btn-ghost btn-sm" id="add-line">' + icon('plus', 14) + 'Add item line</button></header>' +
        '<p class="hint-box">' + icon('tool', 16) + 'Farm equipment (tractors, pumps, cutters) is lent through <a href="#/equipment">Equipment &amp; Custody</a>, not through requests.</p>' +
        '<div id="lines" class="lines"></div><small class="field-error" id="lines-err" aria-live="polite"></small></section>' +
      '<div class="form-actions"><a class="btn btn-ghost" href="#/requests">Cancel</a><button class="btn btn-primary" type="submit">' + icon('check', 16) + 'Submit request</button></div>' +
    '</form>';
  const form = $('#rq-form', view), linesEl = $('#lines', view);
  bindShowIf(form, fields);
  let lineSeq = 0;
  const addLine = (itemId) => {
    const n = ++lineSeq;
    linesEl.insertAdjacentHTML('beforeend',
      '<div class="line" data-line="' + n + '">' +
        '<div class="field"><label for="ln-item-' + n + '">Item</label><select id="ln-item-' + n + '" class="ln-item"><option value="">Select item…</option>' + selectOptions(consumables, 'id', (i) => i.code + ' — ' + i.name + ' (' + i.unit + ')', itemId) + '</select></div>' +
        '<div class="field"><label for="ln-qty-' + n + '">Quantity</label><input id="ln-qty-' + n + '" class="ln-qty" inputmode="decimal" placeholder="0"></div>' +
        '<div class="ln-avail muted" aria-live="polite"></div>' +
        '<button type="button" class="icon-btn ln-remove" aria-label="Remove item line">' + icon('x', 16) + '</button>' +
        '<small class="field-error ln-err"></small></div>');
    updateAvail();
  };
  const vals = () => readForm(form, fields);
  const updateAvail = () => {
    const v = vals();
    $$('.line', linesEl).forEach((ln) => {
      const it = byId('items', ln.querySelector('.ln-item').value);
      const a = ln.querySelector('.ln-avail');
      if (!it) { a.textContent = ''; return; }
      const q = availableFor(it.id, v.type, v.adjustmentDirection, v.targetLocationId);
      a.textContent = q === Infinity ? 'Recount increase' : 'Available: ' + fmtNum(q) + ' ' + it.unit + (v.type === 'Adjustment' ? ' (incl. expired)' : ' (non-expired)');
    });
    $$('.ln-remove', linesEl).forEach((b) => { b.disabled = $$('.line', linesEl).length === 1; });
  };
  $('#add-line', view).addEventListener('click', () => { addLine(''); linesEl.lastElementChild.querySelector('select').focus(); });
  linesEl.addEventListener('click', (e) => { const b = e.target.closest('.ln-remove'); if (b && !b.disabled) { b.closest('.line').remove(); updateAvail(); } });
  linesEl.addEventListener('change', updateAvail);
  form.addEventListener('change', updateAvail);
  addLine(r.query.item || '');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateForm(form, fields);
    // Validate item lines
    let ok = true;
    const seen = new Set(), items = [];
    $$('.line', linesEl).forEach((ln) => {
      const err = ln.querySelector('.ln-err');
      const itemId = Number(ln.querySelector('.ln-item').value);
      const raw = ln.querySelector('.ln-qty').value.trim().replace(/,/g, '');
      const qty = Number(raw);
      const it = byId('items', itemId);
      let msg = '';
      if (!it) msg = 'Choose an item.';
      else if (seen.has(itemId)) msg = 'This item is already on another line.';
      else if (raw === '' || !isFinite(qty)) msg = 'Enter the quantity as a number.';
      else if (qty <= 0) msg = 'Quantity must be more than zero.';
      else if (isWhole(it) && !Number.isInteger(qty)) msg = 'Whole numbers only for ' + it.unit + '.';
      else if (v) { const a = availableFor(itemId, v.type, v.adjustmentDirection, v.targetLocationId); if (qty > a) msg = 'Only ' + fmtNum(a) + ' ' + it.unit + ' available.'; }
      err.textContent = msg;
      ln.classList.toggle('has-error', !!msg);
      if (msg) ok = false; else { seen.add(itemId); items.push({ itemId, qty }); }
    });
    $('#lines-err', view).textContent = items.length || !ok ? '' : 'Add at least one item.';
    if (!v || !ok || !items.length) { toast('Please correct the highlighted fields.', 'error'); return; }

    const year = new Date().getFullYear();
    const maxNo = DB.stock_requests.reduce((m, x) => { const mm = /^REQ-(\d{4})-(\d+)$/.exec(x.requestNo); return mm && Number(mm[1]) === year ? Math.max(m, Number(mm[2])) : m; }, 0);
    const req = {
      id: nextId('stock_requests'), requestNo: 'REQ-' + year + '-' + String(maxNo + 1).padStart(4, '0'), type: v.type, risNo: v.risNo,
      requesterType: v.requesterType, requesterId: Number(v.requesterType === 'Beneficiary' ? v.beneficiaryId : v.personnelId), purpose: v.purpose,
      targetLocationId: v.type === 'Transfer' ? Number(v.targetLocationId) : null,
      adjustmentReason: v.type === 'Adjustment' ? v.adjustmentReason : '', adjustmentDirection: v.type === 'Adjustment' ? (v.adjustmentReason === 'Recount' ? v.adjustmentDirection : 'Decrease') : '',
      status: 'Pending', recordedBy: currentUser().id, recordedAt: nowStamp(), decidedBy: null, decidedAt: null, decisionRemarks: '', releasedBy: null, releasedAt: null
    };
    DB.stock_requests.push(req);
    items.forEach((x) => DB.request_items.push({ id: nextId('request_items'), requestId: req.id, itemId: x.itemId, qtyRequested: x.qty, qtyApproved: null, batchesUsed: [] }));
    saveDB();
    logAction('Create', 'Requests', req.requestNo, null, { type: req.type, status: 'Pending', ris: req.risNo || '—', items: RequestActions.summary(req) });
    toast(req.requestNo + ' submitted and waiting for approval.', 'success');
    location.hash = '#/requests/' + req.id;
  });
}

/* ================================================================== */
/* H. EQUIPMENT & CUSTODY                                                */
/* ================================================================== */
function openAssignModal(preselectId, done) {
  const available = DB.equipment.filter((e) => e.status === 'Available');
  if (!available.length) { toast('No available equipment units to assign.', 'error'); return; }
  const fields = [
    { name: 'equipmentId', label: 'Equipment unit', type: 'select', required: true, full: true, options: available.map((e) => ({ value: e.id, label: e.propertyNo + ' — ' + byId('items', e.itemId).name + ' (' + e.condition + ')' })) },
    { name: 'personnelId', label: 'Accountable personnel', type: 'select', required: true, options: () => activeOf('personnel').map((p) => ({ value: p.id, label: p.fullName + ' · ' + p.position })) },
    { name: 'dateAssigned', label: 'Date assigned', type: 'date', required: true, default: todayISO(), validate: (v) => (v > todayISO() ? 'Cannot be in the future.' : '') },
    { name: 'locationId', label: 'Location (can be a barangay field site)', type: 'select', required: true, full: true, options: () => activeOf('locations').map((l) => ({ value: l.id, label: locLabel(l) + ' (' + l.type + ', ' + l.barangay + ')' })) },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: CONDITIONS.slice(0, 4) },
    { name: 'remarks', label: 'Remarks', type: 'textarea', full: true, rows: 2 }
  ];
  const pre = byId('equipment', preselectId);
  const modal = openModal({
    title: 'Assign equipment', size: 'lg',
    body: '<form id="as-form" novalidate>' + formHTML(fields, { equipmentId: pre && pre.status === 'Available' ? pre.id : '', condition: pre ? (pre.condition === 'New' ? 'New' : pre.condition) : 'Good' }) + '</form>',
    footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="as-ok">' + icon('check', 16) + 'Assign</button>'
  });
  const form = modal.querySelector('#as-form');
  modal.querySelector('#as-ok').addEventListener('click', () => {
    const v = validateForm(form, fields);
    if (!v) return;
    const e = byId('equipment', v.equipmentId);
    Object.assign(e, { status: 'Assigned', personnelId: Number(v.personnelId), locationId: Number(v.locationId), dateAssigned: v.dateAssigned, condition: v.condition });
    DB.custody_assignments.push({ id: nextId('custody_assignments'), equipmentId: e.id, personnelId: e.personnelId, locationId: e.locationId, dateAssigned: v.dateAssigned, conditionOut: v.condition, dateReturned: null, conditionIn: '', remarks: v.remarks, recordedBy: currentUser().id });
    DB.stock_transactions.push({ id: nextId('stock_transactions'), date: v.dateAssigned === todayISO() ? nowStamp() : v.dateAssigned + 'T09:00:00', type: 'Assign', itemId: e.itemId, batchId: e.batchId, equipmentId: e.id, locationId: 7, toLocationId: e.locationId, quantity: 1, userId: currentUser().id, refNo: e.propertyNo, remarks: 'Assigned to ' + personName(e.personnelId) });
    saveDB();
    logAction('Create', 'Equipment', e.propertyNo, { status: 'Available' }, { status: 'Assigned', custodian: personName(e.personnelId), location: locLabel(e.locationId), dateAssigned: v.dateAssigned, condition: v.condition });
    closeModal();
    toast(e.propertyNo + ' assigned to ' + personName(e.personnelId) + '.', 'success');
    done && done();
  });
}

function openReturnModal(equipmentId, done) {
  const e = byId('equipment', equipmentId);
  if (!e || e.status !== 'Assigned') return;
  const fields = [
    { name: 'dateReturned', label: 'Date returned', type: 'date', required: true, default: todayISO(),
      validate: (v) => (v < e.dateAssigned ? 'Cannot be before the date assigned (' + fmtDate(e.dateAssigned) + ').' : v > todayISO() ? 'Cannot be in the future.' : '') },
    { name: 'conditionIn', label: 'Condition on return', type: 'select', required: true, options: CONDITIONS.slice(1) },
    { name: 'locationId', label: 'Return to location', type: 'select', required: true, full: true, options: () => activeOf('locations').filter((l) => l.type !== 'Field Site').map((l) => ({ value: l.id, label: locLabel(l) })) },
    { name: 'remarks', label: 'Remarks', type: 'textarea', full: true, rows: 2 }
  ];
  const modal = openModal({
    title: 'Return ' + e.propertyNo, size: 'lg',
    body: '<p class="muted">' + esc(byId('items', e.itemId).name) + ' · custodian <strong>' + esc(personName(e.personnelId)) + '</strong> since ' + fmtDate(e.dateAssigned) + ' at ' + esc(locLabel(e.locationId)) + '</p>' +
      '<form id="rt-form" novalidate>' + formHTML(fields, { conditionIn: e.condition === 'New' ? 'Good' : e.condition, locationId: 7 }) + '</form>',
    footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="rt-ok">' + icon('check', 16) + 'Record return</button>'
  });
  const form = modal.querySelector('#rt-form');
  modal.querySelector('#rt-ok').addEventListener('click', () => {
    const v = validateForm(form, fields);
    if (!v) return;
    const c = DB.custody_assignments.filter((x) => x.equipmentId === e.id && !x.dateReturned).sort((a, b) => b.id - a.id)[0];
    const from = e.locationId, who = personName(e.personnelId);
    if (c) Object.assign(c, { dateReturned: v.dateReturned, conditionIn: v.conditionIn, remarks: [c.remarks, v.remarks].filter(Boolean).join(' · ') });
    Object.assign(e, { status: 'Available', personnelId: null, dateAssigned: null, locationId: Number(v.locationId), condition: v.conditionIn });
    DB.stock_transactions.push({ id: nextId('stock_transactions'), date: v.dateReturned === todayISO() ? nowStamp() : v.dateReturned + 'T15:00:00', type: 'Return', itemId: e.itemId, batchId: e.batchId, equipmentId: e.id, locationId: from, toLocationId: e.locationId, quantity: 1, userId: currentUser().id, refNo: e.propertyNo, remarks: 'Returned by ' + who + ', condition: ' + v.conditionIn });
    saveDB();
    logAction('Update', 'Equipment', e.propertyNo, { status: 'Assigned', custodian: who, location: locLabel(from) }, { status: 'Available', dateReturned: v.dateReturned, condition: v.conditionIn, location: locLabel(e.locationId) });
    closeModal();
    toast(e.propertyNo + ' returned. Condition: ' + v.conditionIn + '.', 'success');
    done && done();
  });
}

function toggleDispose(e, done) {
  if (!isAdmin()) return;
  const dispose = e.status !== 'Disposed';
  if (dispose && e.status === 'Assigned') { toast('Return the unit first before disposing it.', 'error'); return; }
  confirmDialog({
    title: (dispose ? 'Dispose ' : 'Restore ') + e.propertyNo, variant: dispose ? 'danger' : 'primary',
    message: dispose ? '<p>Mark <strong>' + esc(e.propertyNo) + '</strong> as <strong>Disposed</strong>?</p><p class="muted">The record and its custody history are kept. It can be restored later.</p>' : '<p>Restore <strong>' + esc(e.propertyNo) + '</strong> as Available?</p>',
    confirmText: dispose ? 'Dispose' : 'Restore',
    onConfirm: () => {
      const old = e.status;
      e.status = dispose ? 'Disposed' : 'Available';
      if (dispose) e.condition = 'Unserviceable';
      syncAlerts(); saveDB();
      logAction(dispose ? 'Deactivate' : 'Update', 'Equipment', e.propertyNo, { status: old }, { status: e.status });
      toast(e.propertyNo + (dispose ? ' marked as disposed.' : ' restored.'), 'success');
      done && done();
    }
  });
}

Pages.equipment = (view, r) => {
  if (r.parts[1]) return renderEquipmentDetail(view, Number(r.parts[1]));
  const eqItems = DB.items.filter((i) => i.type === 'Equipment');
  view.innerHTML =
    pageHeader('Equipment & Custody', 'Every equipment unit, where it is, and who is accountable for it.', '<button class="btn btn-primary" id="eq-assign">' + icon('plus', 16) + 'Assign equipment</button>') +
    '<section class="card"><div class="toolbar">' +
      '<div class="filter grow"><label for="eq-q">Search</label><input id="eq-q" type="search" placeholder="Property no., serial, custodian or location…"></div>' +
      '<div class="filter"><label for="eq-item">Item</label><select id="eq-item"><option value="">All items</option>' + selectOptions(eqItems, 'id', (i) => i.name, r.query.item) + '</select></div>' +
      '<div class="filter"><label for="eq-status">Status</label><select id="eq-status"><option value="">All</option>' + ['Available', 'Assigned', 'Disposed'].map((s) => '<option' + (r.query.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
    '</div><div id="eq-table"></div></section>';
  const table = new DataTable($('#eq-table', view), {
    sortKey: 'propertyNo', emptyText: 'No equipment units match.',
    expand: (e) => '<h4 class="expand-title">Custody history · ' + esc(e.propertyNo) + '</h4>' + custodyHistoryHTML(e.id),
    rowClass: (e) => (e.status === 'Disposed' ? 'row-inactive' : ''),
    columns: [
      { key: 'propertyNo', label: 'Property no.', render: (e) => '<a href="#/equipment/' + e.id + '"><strong>' + esc(e.propertyNo) + '</strong></a>' },
      { key: 'item', label: 'Item', render: (e) => esc(e.item) },
      { key: 'condition', label: 'Condition', render: (e) => badge(e.condition) },
      { key: 'loc', label: 'Current location', render: (e) => esc(e.loc) + '<br><small class="muted">' + esc(e.brgy) + '</small>' },
      { key: 'status', label: 'Status', render: (e) => badge(e.status) },
      { key: 'person', label: 'Accountable person', render: (e) => (e.person ? esc(e.person) + '<br><small class="muted">since ' + fmtDate(e.dateAssigned) + '</small>' : '<span class="muted">—</span>') },
      { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (e) =>
        '<a class="btn btn-ghost btn-sm" href="#/equipment/' + e.id + '">View</a>' +
        (e.status === 'Available' ? '<button class="btn btn-primary btn-sm" data-act="assign" data-id="' + e.id + '">Assign</button>' : '') +
        (e.status === 'Assigned' ? '<button class="btn btn-ghost btn-sm" data-act="return" data-id="' + e.id + '">Return</button>' : '') }
    ]
  });
  const apply = () => {
    const q = $('#eq-q', view).value.trim().toLowerCase(), it = $('#eq-item', view).value, st = $('#eq-status', view).value;
    table.setRows(DB.equipment.map((e) => { const l = byId('locations', e.locationId); return Object.assign({}, e, { item: byId('items', e.itemId).name, loc: locLabel(l), brgy: l.barangay, person: e.personnelId ? personName(e.personnelId) : '' }); })
      .filter((e) => (!it || e.itemId === Number(it)) && (!st || e.status === st) && (!q || [e.propertyNo, e.serialNo, e.item, e.loc, e.brgy, e.person].join(' ').toLowerCase().includes(q))));
  };
  $('#eq-q', view).addEventListener('input', debounce(apply, 150));
  $$('.toolbar select', view).forEach((s) => s.addEventListener('change', apply));
  $('#eq-assign', view).addEventListener('click', () => openAssignModal(null, apply));
  view.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'assign') openAssignModal(Number(b.dataset.id), apply);
    if (b.dataset.act === 'return') openReturnModal(Number(b.dataset.id), apply);
  });
  apply();
};

function renderEquipmentDetail(view, id) {
  const e = byId('equipment', id);
  if (!e) return Pages.notFound(view);
  const item = byId('items', e.itemId), loc = byId('locations', e.locationId), batch = byId('batches', e.batchId);
  const txns = DB.stock_transactions.filter((t) => t.equipmentId === e.id || (t.type === 'Stock-In' && t.batchId === e.batchId)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  view.innerHTML =
    pageHeader(e.propertyNo, esc(item.name) + ' · ' + badge(e.status) + ' ' + badge(e.condition),
      (e.status === 'Available' ? '<button class="btn btn-primary" data-act="assign">' + icon('plus', 16) + 'Assign</button>' : '') +
      (e.status === 'Assigned' ? '<button class="btn btn-primary" data-act="return">' + icon('back', 16) + 'Return</button>' : '') +
      (isAdmin() && e.status !== 'Assigned' ? '<button class="btn ' + (e.status === 'Disposed' ? 'btn-ghost' : 'btn-danger-ghost') + '" data-act="dispose">' + (e.status === 'Disposed' ? 'Restore' : 'Dispose') + '</button>' : ''),
      [{ label: 'Equipment', href: '#/equipment' }, { label: e.propertyNo }]) +
    '<div class="grid-2 align-start">' +
      '<section class="card"><header class="card-head"><h2>Unit information</h2></header>' + infoList([
        ['Property number', '<strong>' + esc(e.propertyNo) + '</strong>'], ['Item', '<a href="#/items/' + item.id + '">' + esc(item.name) + '</a>'], ['Serial number', esc(e.serialNo)],
        ['Condition', badge(e.condition)], ['Status', badge(e.status)], ['Delivery', batch ? 'Lot ' + esc(batch.lotNo) + ' · ' + esc(batch.drNo) + ' · ' + fmtDate(batch.dateReceived) : '—'], ['Supplier', batch ? esc(supplierName(batch.supplierId)) : '—']]) + '</section>' +
      '<section class="card where-card"><header class="card-head"><h2>Asa ni? Current whereabouts</h2></header>' +
        '<div class="where">' + icon('pin', 28) + '<div><strong>' + esc(locLabel(loc)) + '</strong><p>Barangay ' + esc(loc.barangay) + ' · ' + esc(loc.type) + '</p>' +
        (e.status === 'Assigned' ? '<p>Custodian: <strong>' + esc(personName(e.personnelId)) + '</strong>, assigned since ' + fmtDate(e.dateAssigned) + '</p>' : '<p class="muted">' + (e.status === 'Disposed' ? 'Disposed — no longer in service.' : 'Available — in storage, no custodian.') + '</p>') + '</div></div></section>' +
    '</div>' +
    '<section class="card"><header class="card-head"><h2>Custody history</h2></header>' + custodyHistoryHTML(e.id) + '</section>' +
    '<section class="card"><header class="card-head"><h2>Movement history</h2></header>' + (txns.length ? '<ul class="timeline">' + txns.map((t) => txnHTML(t)).join('') + '</ul>' : emptyState('No movements.')) + '</section>';
  view.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'assign') openAssignModal(e.id, rerender);
    if (b.dataset.act === 'return') openReturnModal(e.id, rerender);
    if (b.dataset.act === 'dispose') toggleDispose(e, rerender);
  });
}

/* ================================================================== */
/* I. MASTER DATA                                                        */
/* ================================================================== */
const uniqueIn = (table, key, label) => (existing) => (v) => (DB[table].some((r) => String(r[key]).toLowerCase() === v.toLowerCase() && (!existing || r.id !== existing.id)) ? label + ' already exists.' : '');
const MASTER_TABS = {
  categories: {
    label: 'Categories', table: 'categories', prefix: 'CAT', noun: 'category',
    fields: (ex) => [{ name: 'name', label: 'Category name', required: true, validate: uniqueIn('categories', 'name', 'This category')(ex) }, { name: 'description', label: 'Description', type: 'textarea', full: true }],
    columns: [
      { key: 'name', label: 'Name', render: (x) => '<strong>' + esc(x.name) + '</strong>' },
      { key: 'description', label: 'Description' },
      { key: 'count', label: 'Items', className: 'num', value: (x) => DB.items.filter((i) => i.categoryId === x.id).length, render: (x) => DB.items.filter((i) => i.categoryId === x.id).length }
    ],
    text: (x) => [x.name, x.description],
    inUse: (x) => (DB.items.some((i) => i.categoryId === x.id && i.status === 'Active') ? 'It still has active items.' : '')
  },
  suppliers: {
    label: 'Suppliers', table: 'suppliers', prefix: 'SUP', noun: 'supplier',
    fields: (ex) => [
      { name: 'name', label: 'Supplier name', required: true, full: true, validate: uniqueIn('suppliers', 'name', 'This supplier')(ex) },
      { name: 'type', label: 'Type', type: 'select', required: true, options: ['DA', 'Procurement', 'Donor'] },
      { name: 'contactPerson', label: 'Contact person' },
      { name: 'contactNumber', label: 'Contact number', type: 'tel', placeholder: '09171234567' },
      { name: 'address', label: 'Address', type: 'textarea', full: true, rows: 2 }],
    columns: [
      { key: 'name', label: 'Name', render: (x) => '<strong>' + esc(x.name) + '</strong>' },
      { key: 'type', label: 'Type', render: (x) => badge(x.type) },
      { key: 'contactPerson', label: 'Contact person' }, { key: 'contactNumber', label: 'Contact number' }, { key: 'address', label: 'Address' }],
    text: (x) => [x.name, x.type, x.contactPerson, x.contactNumber, x.address]
  },
  locations: {
    label: 'Locations', table: 'locations', prefix: 'LOC', noun: 'location',
    fields: () => [
      { name: 'name', label: 'Location name', required: true, full: true, placeholder: 'e.g. CAGRO Main Warehouse or Busaon Field Site' },
      { name: 'type', label: 'Location type', type: 'select', required: true, options: LOCATION_TYPES },
      { name: 'barangay', label: 'Barangay', type: 'select', required: true, options: TAGUM_BARANGAYS },
      { name: 'address', label: 'Address or landmark', full: true, required: (v) => v.type === 'Field Site', placeholder: 'e.g. Purok 3, beside the barangay hall', hint: 'Required for field sites. No maps or GPS — describe it in words.' },
      { name: 'room', label: 'Room', showIf: (v) => v.type !== 'Field Site', placeholder: 'Optional' },
      { name: 'rack', label: 'Rack', showIf: (v) => v.type !== 'Field Site', placeholder: 'Optional' },
      { name: 'shelf', label: 'Shelf', showIf: (v) => v.type !== 'Field Site', placeholder: 'Optional' }],
    columns: [
      { key: 'name', label: 'Location', render: (x) => '<strong>' + esc(x.name) + '</strong>' },
      { key: 'type', label: 'Type', render: (x) => badge(x.type) },
      { key: 'barangay', label: 'Barangay' },
      { key: 'detail', label: 'Room / rack / shelf or landmark', value: (x) => (x.type === 'Field Site' ? x.address : [x.room, x.rack, x.shelf].join(' ')), render: (x) => esc(x.type === 'Field Site' ? x.address : [x.room, x.rack, x.shelf].filter(Boolean).join(' / ') || '—') },
      { key: 'stock', label: 'Stock records', className: 'num', sortable: false, render: (x) => DB.inventory_stock.filter((s) => s.locationId === x.id && s.quantity > 0).length + DB.equipment.filter((e) => e.locationId === x.id && e.status !== 'Disposed').length }],
    text: (x) => [x.name, x.type, x.barangay, x.address, x.room, x.rack, x.shelf],
    clean: (rec) => { if (rec.type === 'Field Site') { rec.room = ''; rec.rack = ''; rec.shelf = ''; } return rec; },
    inUse: (x) => (DB.inventory_stock.some((s) => s.locationId === x.id && s.quantity > 0) || DB.equipment.some((e) => e.locationId === x.id && e.status !== 'Disposed') ? 'It still holds stock or equipment. Transfer them first.' : '')
  },
  personnel: {
    label: 'Personnel', table: 'personnel', prefix: 'PER', noun: 'personnel record',
    fields: () => [
      { name: 'fullName', label: 'Full name', required: true },
      { name: 'position', label: 'Position', required: true },
      { name: 'division', label: 'Division', required: true },
      { name: 'contactNumber', label: 'Contact number', type: 'tel', placeholder: '09171234567' }],
    columns: [
      { key: 'fullName', label: 'Full name', render: (x) => '<strong>' + esc(x.fullName) + '</strong>' },
      { key: 'position', label: 'Position' }, { key: 'division', label: 'Division' }, { key: 'contactNumber', label: 'Contact number' },
      { key: 'eq', label: 'Equipment held', className: 'num', value: (x) => DB.equipment.filter((e) => e.personnelId === x.id && e.status === 'Assigned').length, render: (x) => DB.equipment.filter((e) => e.personnelId === x.id && e.status === 'Assigned').length }],
    text: (x) => [x.fullName, x.position, x.division, x.contactNumber],
    inUse: (x) => (DB.equipment.some((e) => e.personnelId === x.id && e.status === 'Assigned') ? 'This person is still accountable for equipment. Record the return first.' : '')
  },
  beneficiaries: {
    label: 'Beneficiaries', table: 'beneficiaries', prefix: 'BEN', noun: 'beneficiary',
    fields: (ex) => [
      { name: 'type', label: 'Type', type: 'select', required: true, options: ['Farmer', 'Association'] },
      { name: 'name', label: 'Name', required: true },
      { name: 'rsbsaNo', label: 'RSBSA number', required: true, placeholder: 'e.g. 11-23-15-023-000519', hint: 'Entered manually (no RSBSA integration).', validate: uniqueIn('beneficiaries', 'rsbsaNo', 'This RSBSA number')(ex) },
      { name: 'barangay', label: 'Barangay', type: 'select', required: true, options: TAGUM_BARANGAYS },
      { name: 'contactNumber', label: 'Contact number', type: 'tel', placeholder: '09171234567' }],
    columns: [
      { key: 'type', label: 'Type', render: (x) => badge(x.type) },
      { key: 'name', label: 'Name', render: (x) => '<strong>' + esc(x.name) + '</strong>' },
      { key: 'rsbsaNo', label: 'RSBSA no.' }, { key: 'barangay', label: 'Barangay' }, { key: 'contactNumber', label: 'Contact number' }],
    text: (x) => [x.type, x.name, x.rsbsaNo, x.barangay, x.contactNumber]
  }
};

Pages.master = (view, r) => {
  const admin = isAdmin();
  let tab = MASTER_TABS[r.parts[1]] ? r.parts[1] : 'categories';
  view.innerHTML =
    pageHeader('Master Data', 'Reference records used across the system. Records are deactivated, never deleted.', '') +
    '<section class="card">' + tabsHTML(Object.keys(MASTER_TABS).map((k) => ({ key: k, label: MASTER_TABS[k].label, count: DB[MASTER_TABS[k].table].length })), tab, 'Master data') +
      '<div class="toolbar"><div class="filter grow"><label for="md-q">Search</label><input id="md-q" type="search" placeholder="Search…"></div>' +
      '<div class="filter"><label for="md-status">Status</label><select id="md-status"><option value="">All</option><option>Active</option><option>Inactive</option></select></div>' +
      '<div class="toolbar-end"><button class="btn btn-primary" id="md-add">' + icon('plus', 16) + '<span id="md-add-label"></span></button></div></div>' +
      '<div id="md-table" role="tabpanel"></div></section>';
  let table;
  const build = () => {
    const cfg = MASTER_TABS[tab];
    $('#md-add-label', view).textContent = 'Add ' + cfg.noun;
    table = new DataTable($('#md-table', view).cloneNode(false), {
      sortKey: cfg.columns[0].key, emptyText: 'No ' + cfg.label.toLowerCase() + ' found.',
      rowClass: (x) => (x.status === 'Inactive' ? 'row-inactive' : ''),
      columns: cfg.columns.concat([
        { key: 'status', label: 'Status', render: (x) => badge(x.status) },
        { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (x) =>
          '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + x.id + '">' + icon('edit', 14) + 'Edit</button>' +
          (admin ? '<button class="btn btn-sm ' + (x.status === 'Active' ? 'btn-danger-ghost' : 'btn-ghost') + '" data-act="toggle" data-id="' + x.id + '">' + (x.status === 'Active' ? 'Deactivate' : 'Activate') + '</button>' : '') }
      ])
    });
    $('#md-table', view).replaceWith(table.el);
    table.el.id = 'md-table';
    table.el.setAttribute('role', 'tabpanel');
    apply();
  };
  const apply = () => {
    const cfg = MASTER_TABS[tab];
    const q = $('#md-q', view).value.trim().toLowerCase(), st = $('#md-status', view).value;
    table.setRows(DB[cfg.table].filter((x) => (!st || x.status === st) && (!q || cfg.text(x).join(' ').toLowerCase().includes(q))));
  };
  const openForm = (existing) => {
    const cfg = MASTER_TABS[tab];
    const fields = cfg.fields(existing);
    const modal = openModal({
      title: (existing ? 'Edit ' : 'Add ') + cfg.noun, size: 'lg',
      body: '<form id="md-form" novalidate>' + formHTML(fields, existing || (tab === 'locations' ? { type: 'Warehouse' } : {})) + '</form>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="md-save">' + icon('check', 16) + 'Save</button>'
    });
    const form = modal.querySelector('#md-form');
    bindShowIf(form, fields);
    const save = () => {
      const v = validateForm(form, fields);
      if (!v) return;
      const rec = cfg.clean ? cfg.clean(Object.assign({}, v)) : v;
      if (existing) {
        const d = diff(existing, rec, Object.keys(rec));
        if (!d.changed) { closeModal(); toast('No changes to save.', 'info'); return; }
        Object.assign(existing, rec);
        saveDB();
        logAction('Update', 'Master Data', recId(cfg.prefix, existing.id), d.old, d.new, cfg.label);
        toast(cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1) + ' updated.', 'success');
      } else {
        const row = Object.assign({ id: nextId(cfg.table) }, rec, { status: 'Active' });
        DB[cfg.table].push(row);
        saveDB();
        logAction('Create', 'Master Data', recId(cfg.prefix, row.id), null, rec, cfg.label);
        toast(cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1) + ' added.', 'success');
      }
      closeModal();
      apply();
    };
    modal.querySelector('#md-save').addEventListener('click', save);
    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  };
  const toggle = (x) => {
    const cfg = MASTER_TABS[tab];
    const deact = x.status === 'Active';
    const label = x.name || x.fullName;
    if (deact && cfg.inUse) { const why = cfg.inUse(x); if (why) { toast('Cannot deactivate ' + label + ': ' + why, 'error'); return; } }
    confirmDialog({
      title: (deact ? 'Deactivate ' : 'Activate ') + cfg.noun, variant: deact ? 'danger' : 'primary', confirmText: deact ? 'Deactivate' : 'Activate',
      message: '<p>' + (deact ? 'Deactivate' : 'Activate') + ' <strong>' + esc(label) + '</strong>?</p>' + (deact ? '<p class="muted">It will be hidden from forms but kept for history. You can activate it again.</p>' : ''),
      onConfirm: () => {
        x.status = deact ? 'Inactive' : 'Active';
        saveDB();
        logAction(deact ? 'Deactivate' : 'Update', 'Master Data', recId(cfg.prefix, x.id), { status: deact ? 'Active' : 'Inactive' }, { status: x.status }, cfg.label + ': ' + label);
        toast(label + (deact ? ' deactivated.' : ' activated.'), 'success');
        apply();
      }
    });
  };
  bindTabs(view, (t) => { tab = t; history.replaceState(null, '', '#/master/' + t); $('#md-q', view).value = ''; build(); });
  $('#md-q', view).addEventListener('input', debounce(apply, 150));
  $('#md-status', view).addEventListener('change', apply);
  $('#md-add', view).addEventListener('click', () => openForm(null));
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const x = byId(MASTER_TABS[tab].table, b.dataset.id);
    if (b.dataset.act === 'edit') openForm(x);
    if (b.dataset.act === 'toggle') toggle(x);
  });
  build();
};

/* ================================================================== */
/* J. NOTIFICATIONS / ALERTS                                             */
/* ================================================================== */
Pages.notifications = (view, r) => {
  view.innerHTML =
    pageHeader('Notifications & Alerts', 'Low stock, near-expiry and expired alerts. <strong>Alerts are checked automatically every day.</strong>',
      '<button class="btn btn-ghost" id="nt-check">' + icon('clock', 16) + 'Run check now</button><button class="btn btn-ghost" id="nt-readall">' + icon('check', 16) + 'Mark all as read</button>') +
    '<p class="muted small-note">Last automatic check: ' + fmtDateTime(settings().lastAlertCheck) + ' · Near-expiry threshold: ' + settings().nearExpiryDays + ' days' + (settings().emailNotifications ? ' · Email notifications: on (simulated)' : '') + '</p>' +
    '<section class="card"><div class="toolbar">' +
      '<div class="filter"><label for="nt-type">Alert type</label><select id="nt-type"><option value="">All types</option>' + ['Low Stock', 'Near Expiry', 'Expired'].map((t) => '<option' + (r.query.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
      '<div class="filter"><label for="nt-status">Show</label><select id="nt-status"><option value="open">Open (unresolved)</option><option value="unread">Unread</option><option value="resolved">Resolved</option><option value="">All</option></select></div>' +
    '</div><ul class="notif-list" id="nt-list"></ul></section>';
  const render = () => {
    const type = $('#nt-type', view).value, st = $('#nt-status', view).value;
    const list = DB.notifications.filter((n) => (!type || n.type === type) &&
      (st === 'open' ? !n.resolved : st === 'unread' ? !n.read && !n.resolved : st === 'resolved' ? n.resolved : true))
      .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    $('#nt-list', view).innerHTML = list.length ? list.map((n) =>
      '<li class="notif ' + (n.read ? '' : 'unread ') + (n.resolved ? 'resolved ' : '') + 'tone-' + slug(n.type) + '">' +
        '<span class="notif-icon">' + icon(n.type === 'Low Stock' ? 'alert' : n.type === 'Expired' ? 'x' : 'clock', 18) + '</span>' +
        '<div class="notif-body">' + badge(n.type) + (n.read ? '' : ' <span class="new-dot">New</span>') + '<p>' + esc(n.message) + '</p>' +
          '<small class="muted">' + fmtDateTime(n.createdAt) + (n.resolved ? ' · Resolved ' + (n.autoResolved ? 'automatically (condition cleared)' : 'by ' + esc(n.resolvedBy)) + ' on ' + fmtDateTime(n.resolvedAt) : '') + '</small></div>' +
        '<div class="notif-actions"><a class="btn btn-ghost btn-sm" href="#/items/' + n.itemId + '">View item</a>' +
          (!n.read && !n.resolved ? '<button class="btn btn-ghost btn-sm" data-act="read" data-id="' + n.id + '">Mark as read</button>' : '') +
          (!n.resolved ? '<button class="btn btn-primary btn-sm" data-act="resolve" data-id="' + n.id + '">Resolve</button>' : '') + '</div></li>').join('')
      : '<li>' + emptyState('No alerts here.', 'Good news — nothing needs attention for this filter.') + '</li>';
    refreshChrome();
  };
  $$('.toolbar select', view).forEach((s) => s.addEventListener('change', render));
  $('#nt-readall', view).addEventListener('click', () => {
    let n = 0;
    DB.notifications.forEach((x) => { if (!x.read && !x.resolved) { x.read = true; n++; } });
    saveDB(); render(); toast(n ? n + ' alert' + (n > 1 ? 's' : '') + ' marked as read.' : 'No unread alerts.', 'info');
  });
  $('#nt-check', view).addEventListener('click', () => { const before = DB.notifications.length; syncAlerts(); saveDB(); render(); toast('Alert check complete. ' + (DB.notifications.length - before) + ' new alert(s).', 'info'); });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const n = byId('notifications', b.dataset.id);
    if (b.dataset.act === 'read') { n.read = true; saveDB(); render(); }
    if (b.dataset.act === 'resolve') {
      n.read = true; n.resolved = true; n.autoResolved = false; n.resolvedAt = nowStamp(); n.resolvedBy = currentUser().fullName;
      saveDB();
      logAction('Update', 'Inventory', 'ALERT-' + n.id, { alert: n.type, status: 'Open' }, { alert: n.type, status: 'Resolved' }, n.message);
      render(); toast('Alert resolved.', 'success');
    }
  });
  render();
};

/* ================================================================== */
/* K. REPORTS                                                            */
/* ================================================================== */
const REPORT_TYPES = {
  inventory: 'Current Inventory',
  movement: 'Stock Movement',
  distribution: 'Distribution by Beneficiary / Barangay',
  expiry: 'Near-Expiry & Expired',
  lowstock: 'Low Stock',
  custody: 'Equipment Custody'
};
const SNAPSHOT_REPORTS = ['inventory', 'expiry', 'lowstock'];

/** Each builder returns { headers, rows (plain values), num (right-aligned column indexes), totals: [[label, value]] }. */
const ReportBuilders = {
  inventory() {
    const rows = activeItems().map((i) => [i.code, i.name, categoryName(i.categoryId), i.type, i.unit, itemTotal(i), i.reorderLevel, itemStatus(i), new Set(itemPlaces(i).map((p) => p.loc.id)).size]);
    return { headers: ['Code', 'Item', 'Category', 'Type', 'Unit', 'On hand', 'Reorder level', 'Status', 'Locations'], num: [5, 6, 8], rows,
      totals: [['Items', rows.length], ['Total units on hand', fmtNum(rows.reduce((s, r) => s + r[5], 0))], ['Low / out of stock', rows.filter((r) => r[7] === 'Low Stock' || r[7] === 'Out of Stock').length], ['With expired stock', rows.filter((r) => r[7] === 'Expired').length]] };
  },
  movement(from, to) {
    const list = DB.stock_transactions.filter((t) => t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to).sort((a, b) => a.date.localeCompare(b.date));
    const rows = list.map((t) => { const it = byId('items', t.itemId), b = byId('batches', t.batchId); return [fmtDate(t.date), t.type, it.name, b ? b.lotNo : '', locLabel(t.locationId), t.toLocationId ? locLabel(t.toLocationId) : '', t.quantity, it.unit, t.refNo, userName(t.userId)]; });
    const by = {};
    list.forEach((t) => { by[t.type] = (by[t.type] || 0) + 1; });
    return { headers: ['Date', 'Type', 'Item', 'Lot', 'From / at', 'To', 'Qty', 'Unit', 'Reference', 'User'], num: [6], rows,
      totals: [['Transactions', rows.length]].concat(Object.keys(by).sort().map((k) => [k, by[k]])) };
  },
  distribution(from, to) {
    const rows = [];
    const brgy = {};
    DB.stock_requests.filter((q) => q.type === 'Release' && q.status === 'Released' && q.requesterType === 'Beneficiary' && q.releasedAt.slice(0, 10) >= from && q.releasedAt.slice(0, 10) <= to)
      .sort((a, b) => a.releasedAt.localeCompare(b.releasedAt))
      .forEach((q) => {
        const b = byId('beneficiaries', q.requesterId);
        RequestActions.lines(q.id).forEach((l) => {
          const it = byId('items', l.itemId);
          rows.push([fmtDate(q.releasedAt), q.risNo, b.name, b.type, b.barangay, it.name, l.qtyApproved, it.unit]);
          brgy[b.barangay] = (brgy[b.barangay] || 0) + 1;
        });
      });
    return { headers: ['Date released', 'RIS no.', 'Beneficiary', 'Type', 'Barangay', 'Item', 'Qty', 'Unit'], num: [6], rows,
      totals: [['Distribution lines', rows.length], ['Beneficiaries served', new Set(rows.map((r) => r[2])).size]].concat(Object.keys(brgy).sort().map((k) => ['Barangay ' + k, brgy[k] + ' line(s)'])) };
  },
  expiry() {
    const list = DB.batches.filter((b) => batchQty(b.id) > 0 && batchExpiryStatus(b)).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const rows = list.map((b) => { const it = byId('items', b.itemId); return [b.lotNo, it.name, supplierName(b.supplierId), fmtDate(b.expiryDate), daysTo(b.expiryDate), batchQty(b.id), it.unit, DB.inventory_stock.filter((s) => s.batchId === b.id && s.quantity > 0).map((s) => locLabel(s.locationId)).join('; '), batchExpiryStatus(b)]; });
    return { headers: ['Lot no.', 'Item', 'Supplier', 'Expiry date', 'Days to expiry', 'Qty', 'Unit', 'Location(s)', 'Status'], num: [4, 5], rows,
      totals: [['Expired batches', rows.filter((r) => r[8] === 'Expired').length], ['Near-expiry batches (≤ ' + settings().nearExpiryDays + ' days)', rows.filter((r) => r[8] === 'Near Expiry').length]] };
  },
  lowstock() {
    const rows = activeItems().filter((i) => itemTotal(i) <= i.reorderLevel).map((i) => { const t = itemTotal(i); return [i.code, i.name, categoryName(i.categoryId), t, i.reorderLevel, Math.max(0, i.reorderLevel * 2 - t), i.unit, t === 0 ? 'Out of Stock' : 'Low Stock']; });
    return { headers: ['Code', 'Item', 'Category', 'On hand', 'Reorder level', 'Suggested order', 'Unit', 'Status'], num: [3, 4, 5], rows,
      totals: [['Items at or below reorder level', rows.length], ['Out of stock', rows.filter((r) => r[7] === 'Out of Stock').length]] };
  },
  custody(from, to) {
    const list = DB.custody_assignments.filter((c) => c.dateAssigned <= to && (!c.dateReturned || c.dateReturned >= from)).sort((a, b) => a.dateAssigned.localeCompare(b.dateAssigned));
    const rows = list.map((c) => { const e = byId('equipment', c.equipmentId); return [e.propertyNo, byId('items', e.itemId).name, personName(c.personnelId), locLabel(c.locationId), fmtDate(c.dateAssigned), c.dateReturned ? fmtDate(c.dateReturned) : 'Still assigned', c.conditionOut || '—', c.conditionIn || '—']; });
    return { headers: ['Property no.', 'Equipment', 'Accountable person', 'Location', 'Date assigned', 'Date returned', 'Condition out', 'Condition in'], num: [], rows,
      totals: [['Custody records', rows.length], ['Still assigned', rows.filter((r) => r[5] === 'Still assigned').length], ['Returned in period', rows.filter((r) => r[5] !== 'Still assigned').length]] };
  }
};

Pages.reports = (view, r) => {
  const t = new Date();
  const defFrom = isoDate(new Date(t.getFullYear(), t.getMonth() - 5, 1));
  const preType = REPORT_TYPES[r.query.type] ? r.query.type : 'inventory';
  const recentReports = DB.report_log.slice().sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 5);
  view.innerHTML =
    pageHeader('Reports', 'Generate a formatted report, then print it, save it as PDF, or export it to Excel (CSV).') +
    '<section class="card no-print"><form id="rp-form" class="toolbar" novalidate>' +
      '<div class="filter grow"><label for="rp-type">Report type</label><select id="rp-type">' + Object.keys(REPORT_TYPES).map((k) => '<option value="' + k + '"' + (k === preType ? ' selected' : '') + '>' + esc(REPORT_TYPES[k]) + '</option>').join('') + '</select></div>' +
      '<div class="filter"><label for="rp-from">Date from</label><input type="date" id="rp-from" value="' + defFrom + '"></div>' +
      '<div class="filter"><label for="rp-to">Date to</label><input type="date" id="rp-to" value="' + todayISO() + '"></div>' +
      '<div class="toolbar-end"><button class="btn btn-primary" type="submit">' + icon('report', 16) + 'Generate</button></div>' +
    '</form><small class="field-error" id="rp-err" aria-live="polite"></small><p class="muted small-note" id="rp-note"></p></section>' +
    '<div id="rp-out">' + emptyState('Choose a report type and date range, then click Generate.') + '</div>' +
    '<section class="card no-print"><header class="card-head"><h2>Recently generated</h2></header>' +
      (recentReports.length ? '<ul class="mini-list">' + recentReports.map((x) => '<li><span><strong>' + esc(x.reportType) + '</strong><small>' + fmtDate(x.dateFrom) + ' – ' + fmtDate(x.dateTo) + ' · ' + esc(x.format) + '</small></span><span class="mini-right"><small>' + esc(userName(x.userId)) + '<br>' + fmtDateTime(x.ts) + '</small></span></li>').join('') + '</ul>' : emptyState('No reports yet.')) + '</section>';

  const note = () => { $('#rp-note', view).textContent = SNAPSHOT_REPORTS.includes($('#rp-type', view).value) ? 'This report is a snapshot of stock as of today; the date range is shown for reference.' : 'Only records within the date range are included.'; };
  $('#rp-type', view).addEventListener('change', note);
  note();
  let last = null;
  $('#rp-form', view).addEventListener('submit', (e) => {
    e.preventDefault();
    const type = $('#rp-type', view).value, from = $('#rp-from', view).value, to = $('#rp-to', view).value;
    const err = $('#rp-err', view);
    if (!from || !to) { err.textContent = 'Please choose both dates.'; return; }
    if (from > to) { err.textContent = '"Date from" must be on or before "Date to".'; $('#rp-from', view).focus(); return; }
    err.textContent = '';
    const data = ReportBuilders[type](from, to);
    const u = currentUser(), s = settings();
    last = { type, from, to, data, title: REPORT_TYPES[type] + ' Report', ts: nowStamp() };
    DB.report_log.push({ id: nextId('report_log'), ts: last.ts, userId: u.id, reportType: REPORT_TYPES[type], dateFrom: from, dateTo: to, format: 'Preview' });
    saveDB();
    $('#rp-out', view).innerHTML =
      '<div class="report-actions no-print"><span class="muted">Preview</span><button class="btn btn-ghost" id="rp-csv">' + icon('download', 16) + 'Export Excel (CSV)</button><button class="btn btn-primary" id="rp-pdf">' + icon('printer', 16) + 'Print / Export PDF</button></div>' +
      '<article class="report-paper" id="report-paper">' +
        '<header class="report-head"><span class="report-seal">' + icon('leaf', 30) + '</span><div><p>Republic of the Philippines</p><p><strong>' + esc(s.lguName) + '</strong></p><p>Province of Davao del Norte</p><p class="office">' + esc(s.officeName.toUpperCase()) + '</p><small>' + esc(s.officeAddress) + ' · ' + esc(s.contactNumber) + ' · ' + esc(s.officeEmail) + '</small></div></header>' +
        '<h2 class="report-title">' + esc(last.title) + '</h2>' +
        '<p class="report-range">' + (SNAPSHOT_REPORTS.includes(type) ? 'As of ' + fmtDate(todayISO()) + ' · Period: ' : 'Period: ') + fmtDate(from) + ' to ' + fmtDate(to) + ' · Generated ' + fmtDateTime(last.ts) + '</p>' +
        (data.rows.length ? '<table class="report-table"><thead><tr>' + data.headers.map((h, i) => '<th class="' + (data.num.includes(i) ? 'num' : '') + '">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
          data.rows.map((row) => '<tr>' + row.map((c, i) => '<td class="' + (data.num.includes(i) ? 'num' : '') + '">' + esc(typeof c === 'number' ? fmtNum(c) : c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
          : '<p class="report-empty">No records found for this period.</p>') +
        '<div class="report-totals"><h3>Totals</h3><dl>' + data.totals.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></div>' +
        '<div class="signatures"><div><small>Prepared by:</small><div class="sig-line">' + esc(u.fullName.toUpperCase()) + '</div><small>' + esc(u.role) + ', CAGRO</small></div>' +
          '<div><small>Noted by:</small><div class="sig-line">&nbsp;</div><small>' + esc(s.officeHead) + '</small></div></div>' +
        '<p class="report-foot">Generated by Asa ni? Agricultural Inventory Tracking and Monitoring System</p>' +
      '</article>';
    const logExport = (format) => {
      DB.report_log.push({ id: nextId('report_log'), ts: nowStamp(), userId: u.id, reportType: REPORT_TYPES[type], dateFrom: from, dateTo: to, format });
      logAction('Export', 'Reports', recId('RPT', DB.report_log.length), null, { report: REPORT_TYPES[type], period: fmtDate(from) + ' – ' + fmtDate(to), format, rows: data.rows.length });
    };
    $('#rp-pdf', view).addEventListener('click', () => { logExport('PDF'); printElement($('#report-paper', view)); });
    $('#rp-csv', view).addEventListener('click', () => {
      const rows = [[s.lguName + ' – ' + s.officeName], [last.title], ['Period', fmtDate(from) + ' to ' + fmtDate(to)], []].concat([data.headers], data.rows, [[]], data.totals, [[], ['Prepared by', u.fullName, u.role]]);
      downloadCSV('asani-' + slug(REPORT_TYPES[type]) + '-' + to + '.csv', rows[0], rows.slice(1));
      logExport('Excel (CSV)');
      toast('Report exported to CSV.', 'success');
    });
    $('#report-paper', view).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (r.query.type) $('#rp-form', view).requestSubmit();
};

/* ================================================================== */
/* L. ACTIVITY LOG (Administrator only)                                  */
/* ================================================================== */
Pages['activity-log'] = (view, r) => {
  view.innerHTML =
    pageHeader('Activity Log', 'Every login, logout, create, update, approval, rejection, release, deactivation and export.', '<button class="btn btn-ghost" id="al-export">' + icon('download', 16) + 'Export CSV</button>') +
    '<section class="card"><div class="toolbar">' +
      '<div class="filter"><label for="al-user">User</label><select id="al-user"><option value="">All users</option>' + selectOptions(DB.users, 'id', (u) => u.fullName) + '</select></div>' +
      '<div class="filter"><label for="al-from">From</label><input type="date" id="al-from"></div>' +
      '<div class="filter"><label for="al-to">To</label><input type="date" id="al-to"></div>' +
      '<div class="filter"><label for="al-action">Action</label><select id="al-action"><option value="">All actions</option>' + LOG_ACTIONS.map((a) => '<option>' + a + '</option>').join('') + '</select></div>' +
      '<div class="filter"><label for="al-module">Module</label><select id="al-module"><option value="">All modules</option>' + LOG_MODULES.map((m) => '<option' + (r.query.module === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>' +
      '<button type="button" class="btn btn-ghost btn-sm filter-clear" id="al-clear">Clear</button>' +
    '</div><div id="al-table"></div></section>';
  const pre = (v) => '<pre class="json">' + esc(v ? JSON.stringify(v, null, 2) : '—') + '</pre>';
  const table = new DataTable($('#al-table', view), {
    sortKey: 'ts', sortDir: 'desc', pageSize: 15, emptyText: 'No log entries match your filters.',
    expand: (x) => '<div class="grid-2 diff"><div><h4>Old value</h4>' + pre(x.oldValue) + '</div><div><h4>New value</h4>' + pre(x.newValue) + '</div></div>' + (x.details ? '<p class="muted">Details: ' + esc(x.details) + '</p>' : ''),
    columns: [
      { key: 'ts', label: 'Date & time', render: (x) => fmtDateTime(x.ts) },
      { key: 'userName', label: 'User' },
      { key: 'action', label: 'Action', render: (x) => badge(x.action, 'badge-action') },
      { key: 'module', label: 'Module' },
      { key: 'recordId', label: 'Record ID', render: (x) => '<code>' + esc(x.recordId || '—') + '</code>' },
      { key: 'change', label: 'Old → New', sortable: false, render: (x) => '<span class="change"><span class="old">' + esc(fmtValue(x.oldValue)) + '</span> → <span class="new">' + esc(fmtValue(x.newValue)) + '</span></span>' }
    ]
  });
  let current = [];
  const apply = () => {
    const u = $('#al-user', view).value, f = $('#al-from', view).value, t = $('#al-to', view).value, a = $('#al-action', view).value, m = $('#al-module', view).value;
    current = DB.activity_log.filter((x) => (!u || x.userId === Number(u)) && (!f || x.ts.slice(0, 10) >= f) && (!t || x.ts.slice(0, 10) <= t) && (!a || x.action === a) && (!m || x.module === m));
    table.setRows(current);
  };
  $$('.toolbar select, .toolbar input', view).forEach((el) => el.addEventListener('change', apply));
  $('#al-clear', view).addEventListener('click', () => { $$('.toolbar select, .toolbar input', view).forEach((el) => { el.value = ''; }); apply(); });
  $('#al-export', view).addEventListener('click', () => {
    downloadCSV('asani-activity-log-' + todayISO() + '.csv', ['Date & time', 'User', 'Action', 'Module', 'Record ID', 'Old value', 'New value', 'Details'],
      current.slice().sort((a, b) => b.ts.localeCompare(a.ts)).map((x) => [x.ts.replace('T', ' '), x.userName, x.action, x.module, x.recordId, fmtValue(x.oldValue), fmtValue(x.newValue), x.details]));
    logAction('Export', 'Reports', 'ACTIVITY-LOG', null, { report: 'Activity Log', format: 'Excel (CSV)', rows: current.length });
    toast('Activity log exported to CSV.', 'success');
  });
  apply();
};

/* ================================================================== */
/* M. USER MANAGEMENT (Administrator only)                              */
/* ================================================================== */
Pages.users = (view) => {
  view.innerHTML =
    pageHeader('User Management', 'Accounts and roles. Users are deactivated, never deleted.', '<button class="btn btn-primary" id="us-add">' + icon('plus', 16) + 'Add user</button>') +
    '<section class="card"><div class="toolbar"><div class="filter grow"><label for="us-q">Search</label><input id="us-q" type="search" placeholder="Name, username or email…"></div>' +
    '<div class="filter"><label for="us-role">Role</label><select id="us-role"><option value="">All roles</option><option>Administrator</option><option>Inventory Staff</option></select></div></div>' +
    '<div id="us-table"></div></section>';
  const me = currentUser();
  const table = new DataTable($('#us-table', view), {
    sortKey: 'fullName',
    rowClass: (x) => (x.status === 'Inactive' ? 'row-inactive' : ''),
    columns: [
      { key: 'fullName', label: 'Full name', render: (x) => '<strong>' + esc(x.fullName) + '</strong>' + (x.id === me.id ? ' <span class="chip">You</span>' : '') },
      { key: 'username', label: 'Username', render: (x) => '<code>' + esc(x.username) + '</code>' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', render: (x) => badge(x.role) },
      { key: 'status', label: 'Status', render: (x) => badge(x.status) },
      { key: 'lastLogin', label: 'Last login', render: (x) => fmtDateTime(x.lastLogin) },
      { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (x) =>
        '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + x.id + '">' + icon('edit', 14) + 'Edit</button>' +
        (x.id === me.id ? '' : '<button class="btn btn-sm ' + (x.status === 'Active' ? 'btn-danger-ghost' : 'btn-ghost') + '" data-act="toggle" data-id="' + x.id + '">' + (x.status === 'Active' ? 'Deactivate' : 'Reactivate') + '</button>') }
    ]
  });
  const apply = () => {
    const q = $('#us-q', view).value.trim().toLowerCase(), role = $('#us-role', view).value;
    table.setRows(DB.users.filter((u) => (!role || u.role === role) && (!q || [u.fullName, u.username, u.email].join(' ').toLowerCase().includes(q))));
  };
  const openForm = (existing) => {
    const fields = [
      { name: 'fullName', label: 'Full name', required: true },
      { name: 'username', label: 'Username', required: true, hint: 'Letters, numbers, dot, dash or underscore.',
        validate: (v) => (!/^[a-z0-9._-]{3,30}$/i.test(v) ? 'Use 3–30 letters, numbers, dot, dash or underscore.' : DB.users.some((u) => u.username.toLowerCase() === v.toLowerCase() && (!existing || u.id !== existing.id)) ? 'This username is taken.' : '') },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'role', label: 'Role', type: 'select', required: true, options: [ROLES.ADMIN, ROLES.STAFF],
        validate: (v) => (existing && existing.id === me.id && v !== ROLES.ADMIN ? 'You cannot remove your own Administrator role.' : '') },
      { name: 'password', label: existing ? 'New temporary password' : 'Temporary password', type: 'password', required: !existing, autocomplete: 'new-password',
        hint: existing ? 'Leave blank to keep the current password.' : 'The user should change it after the first login.', validate: (v) => (v && v.length < 8 ? 'Use at least 8 characters.' : '') }
    ];
    const modal = openModal({
      title: existing ? 'Edit user · ' + existing.username : 'Add user', size: 'lg',
      body: '<form id="us-form" novalidate>' + formHTML(fields, existing ? Object.assign({}, existing, { password: '' }) : { role: ROLES.STAFF }) + '</form>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="us-save">' + icon('check', 16) + 'Save</button>'
    });
    const form = modal.querySelector('#us-form');
    const save = () => {
      const v = validateForm(form, fields);
      if (!v) return;
      const rec = { fullName: v.fullName, username: v.username, email: v.email, role: v.role };
      if (existing) {
        const d = diff(existing, rec);
        if (v.password) { d.old.password = '••••'; d.new.password = '(reset)'; d.changed = true; }
        if (!d.changed) { closeModal(); toast('No changes to save.', 'info'); return; }
        Object.assign(existing, rec);
        if (v.password) existing.password = v.password;
        saveDB();
        logAction('Update', 'Users', existing.username, d.old, d.new);
        toast('User ' + existing.username + ' updated.', 'success');
      } else {
        const u = Object.assign({ id: nextId('users'), password: v.password, status: 'Active', lastLogin: null }, rec);
        DB.users.push(u);
        saveDB();
        logAction('Create', 'Users', u.username, null, rec);
        toast('User ' + u.username + ' created with a temporary password.', 'success');
      }
      closeModal();
      apply();
    };
    modal.querySelector('#us-save').addEventListener('click', save);
    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  };
  const toggle = (u) => {
    const deact = u.status === 'Active';
    if (deact && u.role === ROLES.ADMIN && DB.users.filter((x) => x.role === ROLES.ADMIN && x.status === 'Active').length <= 1) { toast('At least one active Administrator is required.', 'error'); return; }
    confirmDialog({
      title: (deact ? 'Deactivate ' : 'Reactivate ') + u.username, variant: deact ? 'danger' : 'primary', confirmText: deact ? 'Deactivate' : 'Reactivate',
      message: '<p>' + (deact ? 'Deactivate' : 'Reactivate') + ' <strong>' + esc(u.fullName) + '</strong>?</p>' + (deact ? '<p class="muted">The user will no longer be able to sign in. Their records and log entries are kept.</p>' : ''),
      onConfirm: () => {
        u.status = deact ? 'Inactive' : 'Active';
        saveDB();
        logAction(deact ? 'Deactivate' : 'Update', 'Users', u.username, { status: deact ? 'Active' : 'Inactive' }, { status: u.status });
        toast(u.username + (deact ? ' deactivated.' : ' reactivated.'), 'success');
        apply();
      }
    });
  };
  $('#us-q', view).addEventListener('input', debounce(apply, 150));
  $('#us-role', view).addEventListener('change', apply);
  $('#us-add', view).addEventListener('click', () => openForm(null));
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const u = byId('users', b.dataset.id);
    if (b.dataset.act === 'edit') openForm(u);
    if (b.dataset.act === 'toggle') toggle(u);
  });
  apply();
};

/* ================================================================== */
/* N. SETTINGS (Administrator only)                                      */
/* ================================================================== */
Pages.settings = (view) => {
  const s = settings();
  const fields = [
    { name: 'nearExpiryDays', label: 'Near-expiry alert threshold (days)', type: 'number', required: true, min: 1, integer: true, hint: 'Default is 30 days.' },
    { name: 'emailNotifications', label: 'Email notifications', type: 'select', required: true, placeholder: false, options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], hint: 'Simulated in this prototype.' },
    { name: 'sessionTimeout', label: 'Session timeout (minutes)', type: 'number', required: true, min: 2, integer: true, hint: 'Users get a warning 1 minute before automatic logout.', validate: (v) => (Number(v) > 120 ? 'Maximum is 120 minutes.' : '') },
    { name: 'officeName', label: 'Office name', required: true },
    { name: 'lguName', label: 'LGU name', required: true },
    { name: 'officeHead', label: 'Office head / "Noted by" title', required: true },
    { name: 'contactNumber', label: 'Contact number', type: 'tel' },
    { name: 'officeEmail', label: 'Office email', type: 'email' },
    { name: 'officeAddress', label: 'Office address', type: 'textarea', full: true, rows: 2, required: true }
  ];
  view.innerHTML =
    pageHeader('Settings', 'System settings and office details used on reports.') +
    '<div class="grid-2 align-start wide-left">' +
      '<section class="card"><header class="card-head"><h2>System settings</h2></header><form id="st-form" novalidate>' +
        formHTML(fields, Object.assign({}, s, { emailNotifications: s.emailNotifications ? 'on' : 'off' })) +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">' + icon('check', 16) + 'Save settings</button></div></form></section>' +
      '<aside class="stack">' +
        '<section class="card"><header class="card-head"><h2>About this prototype</h2></header>' + infoList([
          ['Data storage', 'Browser localStorage (no server)'], ['Last alert check', fmtDateTime(s.lastAlertCheck)],
          ['Records', fmtNum(DB.items.length) + ' items · ' + fmtNum(DB.batches.length) + ' batches · ' + fmtNum(DB.stock_transactions.length) + ' transactions'],
          ['Log entries', fmtNum(DB.activity_log.length)]]) + '</section>' +
        '<section class="card danger-zone"><header class="card-head"><h2>Reset demo data</h2></header><p>Restore the original mock data. All changes made during the demo (stock-ins, requests, users, settings) will be lost.</p>' +
          '<button class="btn btn-danger" id="st-reset">' + icon('alert', 16) + 'Reset demo data</button></section>' +
      '</aside></div>';
  const form = $('#st-form', view);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateForm(form, fields);
    if (!v) return;
    const rec = Object.assign({}, v, { nearExpiryDays: Number(v.nearExpiryDays), sessionTimeout: Number(v.sessionTimeout), emailNotifications: v.emailNotifications === 'on' });
    const d = diff(s, rec);
    if (!d.changed) { toast('No changes to save.', 'info'); return; }
    Object.assign(s, rec);
    syncAlerts(); saveDB();
    logAction('Update', 'Settings', 'SYSTEM', d.old, d.new);
    toast('Settings saved.', 'success');
    refreshChrome();
  });
  $('#st-reset', view).addEventListener('click', () => confirmDialog({
    title: 'Reset demo data', variant: 'danger', confirmText: 'Reset everything',
    message: '<p>Reset <strong>all</strong> data to the original mock data?</p><p class="muted">This cannot be undone. You will stay signed in.</p>',
    onConfirm: () => {
      const keep = getSession();
      resetDB();
      if (keep) { const s2 = Object.assign({}, keep, { userId: byId('users', keep.userId) ? keep.userId : 1 }); setSession(s2, keep.remember); }
      logAction('Update', 'Settings', 'SYSTEM', null, { action: 'Reset demo data' });
      $('#app').innerHTML = '';
      toast('Demo data has been reset.', 'success');
      location.hash = '#/dashboard';
      router();
    }
  }));
};

/* ================================================================== */
/* O. MY PROFILE                                                         */
/* ================================================================== */
Pages.profile = (view) => {
  const u = currentUser();
  const mine = DB.activity_log.filter((x) => x.userId === u.id).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 6);
  const fields = [
    { name: 'current', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password', validate: (v) => (v !== u.password ? 'Current password is incorrect.' : '') },
    { name: 'next', label: 'New password', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 8 characters, different from the current one.',
      validate: (v, vals) => (v.length < 8 ? 'Use at least 8 characters.' : v === vals.current ? 'Must be different from the current password.' : '') },
    { name: 'confirm', label: 'Confirm new password', type: 'password', required: true, autocomplete: 'new-password', validate: (v, vals) => (v !== vals.next ? 'Passwords do not match.' : '') }
  ];
  const initials = u.fullName.split(' ').filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
  view.innerHTML =
    pageHeader('My Profile', 'Your account details.') +
    '<div class="grid-2 align-start">' +
      '<div class="stack"><section class="card profile-card"><div class="profile-top"><span class="avatar lg">' + esc(initials) + '</span><div><h2>' + esc(u.fullName) + '</h2>' + badge(u.role) + ' ' + badge(u.status) + '</div></div>' +
        infoList([['Username', '<code>' + esc(u.username) + '</code>'], ['Email', esc(u.email)], ['Role', esc(u.role)], ['Last login', fmtDateTime(u.lastLogin)],
          ['Access', u.role === ROLES.ADMIN ? 'All pages, including User Management, Activity Log and Settings' : 'All pages except User Management, Activity Log and Settings']]) + '</section>' +
        '<section class="card"><header class="card-head"><h2>My recent activity</h2></header>' + (mine.length ? '<ul class="mini-list">' + mine.map((x) => '<li><span>' + badge(x.action, 'badge-action') + ' <strong>' + esc(x.module) + '</strong> <code>' + esc(x.recordId) + '</code></span><span class="mini-right"><small>' + fmtDateTime(x.ts) + '</small></span></li>').join('') + '</ul>' : emptyState('No activity yet.')) + '</section></div>' +
      '<section class="card"><header class="card-head"><h2>Change password</h2></header><form id="pw-form" novalidate>' + formHTML(fields) +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">' + icon('lock', 16) + 'Change password</button></div></form>' +
        '<p class="muted small-note">Mock only: the password is stored in this browser for the demo.</p></section>' +
    '</div>';
  const form = $('#pw-form', view);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateForm(form, fields);
    if (!v) return;
    u.password = v.next;
    saveDB();
    logAction('Update', 'Users', u.username, { password: '••••' }, { password: '(changed by user)' });
    form.reset();
    toast('Your password has been changed.', 'success');
  });
};
