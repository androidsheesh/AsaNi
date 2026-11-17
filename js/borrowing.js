/* =====================================================================
   Asa ni? — Borrow Requests (the borrowing logbook)
   ---------------------------------------------------------------------
   Request → Approved / Rejected → Borrowed → (Partially) Returned.
   Mirrors the paper logbook: Date, Time, Signature, Borrower's Name,
   Location, Qty, Item Description, Date Returned, Returned By,
   Signature, Remarks.
   ===================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* Shared helpers (also used by pages.js)                              */
/* ------------------------------------------------------------------ */
const NON_LENDABLE_CATEGORIES = ['Seeds', 'Fertilizers', 'Pesticides', 'Planting Materials'];

/** Items that are borrowed and returned (equipment, tools, chairs, scales…). */
function isLendable(item) {
  return !!item && item.status === 'Active' && (item.type === 'Equipment' || !NON_LENDABLE_CATEGORIES.includes(categoryName(item.categoryId)));
}
function nowHM() { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
/** "14:05" → "2:05 PM" */
function fmtTime(hm) {
  if (!hm) return '—';
  const [h, m] = String(hm).split(':').map(Number);
  if (isNaN(h)) return '—';
  return ((h % 12) || 12) + ':' + pad2(m || 0) + ' ' + (h < 12 ? 'AM' : 'PM');
}
/** Who has an equipment unit right now. */
function custodianName(e) { return e.borrowerName || (e.personnelId ? personName(e.personnelId) : ''); }
/** Where an equipment unit is right now (typed place or a saved location). */
function unitWhere(e) { return e.locationText || locLabel(e.locationId); }

/* ---------- Signature pad ---------- */
function sigPadHTML(id, label) {
  return '<div class="field span-2 sig-field" data-sig="' + id + '">' +
    '<label id="' + id + '-lbl">' + esc(label) + ' <span class="req" aria-hidden="true">*</span></label>' +
    '<div class="sig-wrap"><canvas id="' + id + '" class="sig-pad" width="600" height="150" role="img" aria-labelledby="' + id + '-lbl"></canvas>' +
    '<button type="button" class="btn btn-ghost btn-sm sig-clear">Clear</button></div>' +
    '<small class="hint">Sign with a mouse, finger or stylus.</small><small class="field-error" id="' + id + '-err" aria-live="polite"></small></div>';
}
function bindSigPad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, dirty = false, last = null;
  const pen = () => { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14202e'; ctx.fillStyle = '#14202e'; };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height }; };
  pen();
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    drawing = true; dirty = true; last = pos(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fill();
    const err = canvas.closest('.sig-field').querySelector('.field-error'); if (err) err.textContent = '';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', stop);
  const clear = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; pen(); };
  const btn = canvas.parentElement.querySelector('.sig-clear');
  if (btn) btn.addEventListener('click', clear);
  return { isEmpty: () => !dirty, data: () => (dirty ? canvas.toDataURL('image/png') : ''), clear };
}
/** Small signature image, or a dash. Only our own PNG data URLs are shown. */
function sigImg(data, alt) {
  if (!data || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)) return '<span class="muted">—</span>';
  return '<img class="sig-img" src="' + data + '" alt="' + esc(alt || 'Signature') + '">';
}

/* ------------------------------------------------------------------ */
/* Loans: data helpers and actions                                     */
/* ------------------------------------------------------------------ */
const LOAN_OUT = ['Borrowed', 'Partially Returned'];

const Loans = {
  lines: (loanId) => DB.loan_items.filter((l) => l.loanId === loanId),
  returnedQty: (line) => (line.returns || []).reduce((s, r) => s + r.qty, 0),
  outQty(line) { return (line.lentQty || 0) - this.returnedQty(line); },
  isOut: (loan) => LOAN_OUT.includes(loan.status),
  isOverdue(loan) { return this.isOut(loan) && !!loan.dueDate && loan.dueDate < todayISO(); },
  location: (loan) => loan.locationText || (loan.locationId ? locLabel(loan.locationId) : '—'),
  /** Status shown to people: Overdue replaces Borrowed when late. */
  displayStatus(loan) { return this.isOverdue(loan) ? 'Overdue' : loan.status; },
  summary(loan) {
    return this.lines(loan.id).map((l) => { const i = byId('items', l.itemId); return (i ? i.name : '?') + ' × ' + fmtNum(l.qty); }).join(', ');
  },
  refreshStatus(loan) {
    const lines = this.lines(loan.id);
    const out = lines.reduce((s, l) => s + this.outQty(l), 0);
    const back = lines.reduce((s, l) => s + this.returnedQty(l), 0);
    loan.status = out <= 0 ? 'Returned' : back > 0 ? 'Partially Returned' : 'Borrowed';
  },
  nextNo() {
    const year = new Date().getFullYear();
    const max = DB.loans.reduce((m, x) => { const mm = /^BRW-(\d{4})-(\d+)$/.exec(x.loanNo); return mm && Number(mm[1]) === year ? Math.max(m, Number(mm[2])) : m; }, 0);
    return 'BRW-' + year + '-' + String(max + 1).padStart(4, '0');
  },
  availableUnits: (itemId) => DB.equipment.filter((e) => e.itemId === itemId && e.status === 'Available' && e.condition !== 'Unserviceable'),
  available(item) { return item.type === 'Equipment' ? this.availableUnits(item.id).length : releasableQty(item.id); },

  /* ---------- buttons ---------- */
  approveButton(loan, sm) {
    const cls = 'btn btn-primary' + (sm ? ' btn-sm' : '');
    if (loan.recordedBy === currentUser().id) return tipWrap('<button type="button" class="' + cls + '" disabled>' + icon('check', 16) + 'Approve</button>', 'You recorded this request. Under separation of duties, another Administrator must approve it.');
    return '<button type="button" class="' + cls + '" data-loan="approve" data-id="' + loan.id + '">' + icon('check', 16) + 'Approve</button>';
  },
  rejectButton: (loan, sm) => '<button type="button" class="btn btn-danger-ghost' + (sm ? ' btn-sm' : '') + '" data-loan="reject" data-id="' + loan.id + '">' + icon('x', 16) + 'Reject</button>',
  lendButton: (loan, sm) => '<button type="button" class="btn btn-primary' + (sm ? ' btn-sm' : '') + '" data-loan="lend" data-id="' + loan.id + '">' + icon('arrow', 16) + 'Lend</button>',
  returnButton: (loan, sm) => '<button type="button" class="btn btn-ghost' + (sm ? ' btn-sm' : '') + '" data-loan="return" data-id="' + loan.id + '">' + icon('back', 16) + 'Return</button>',
  actionsHTML(loan, sm) {
    const admin = isAdmin();
    let h = '';
    if (admin && loan.status === 'Pending') h += this.approveButton(loan, sm) + this.rejectButton(loan, sm);
    if (!admin && loan.status === 'Approved') h += this.lendButton(loan, sm);
    if (this.isOut(loan)) h += this.returnButton(loan, sm);
    return h;
  },
  bind(container, done) {
    container.addEventListener('click', (e) => {
      const b = e.target.closest('[data-loan]');
      if (!b || b.disabled) return;
      const id = Number(b.dataset.id);
      if (b.dataset.loan === 'approve') this.approve(id, done);
      else if (b.dataset.loan === 'reject') this.reject(id, done);
      else if (b.dataset.loan === 'lend') this.openLend(id, done);
      else if (b.dataset.loan === 'return') this.openReturn(id, done);
    });
  },

  /* ---------- approve / reject (Administrator) ---------- */
  approve(id, done) {
    const loan = byId('loans', id);
    if (!isAdmin() || !loan || loan.status !== 'Pending') return;
    if (loan.recordedBy === currentUser().id) { toast('You cannot approve a request you recorded (separation of duties).', 'error'); return; }
    const rows = this.lines(loan.id).map((l) => { const it = byId('items', l.itemId); return '<tr><td>' + esc(it.name) + '</td><td class="num">' + fmtNum(l.qty) + ' ' + esc(it.unit) + '</td><td class="num">' + fmtNum(this.available(it)) + '</td></tr>'; }).join('');
    const modal = openModal({
      title: 'Approve ' + loan.loanNo, size: 'lg',
      body: '<p class="muted">Borrower: <strong>' + esc(loan.borrowerName) + '</strong> · ' + esc(this.location(loan)) + ' · return by ' + fmtDate(loan.dueDate) + '</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th class="num">Requested</th><th class="num">Available now</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="field"><label for="la-remarks">Remarks</label><textarea id="la-remarks" rows="2" placeholder="Optional"></textarea></div>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="la-ok">' + icon('check', 16) + 'Approve request</button>'
    });
    modal.querySelector('#la-ok').addEventListener('click', () => {
      loan.status = 'Approved'; loan.decidedBy = currentUser().id; loan.decidedAt = nowStamp(); loan.decisionRemarks = modal.querySelector('#la-remarks').value.trim();
      saveDB();
      logAction('Approve', 'Borrow Requests', loan.loanNo, { status: 'Pending' }, { status: 'Approved', remarks: loan.decisionRemarks || '—' });
      closeModal();
      toast(loan.loanNo + ' approved. Inventory Staff can now lend the items.', 'success');
      done && done();
    });
  },
  reject(id, done) {
    const loan = byId('loans', id);
    if (!isAdmin() || !loan || loan.status !== 'Pending') return;
    const modal = openModal({
      title: 'Reject ' + loan.loanNo, size: 'sm',
      body: '<p>Reject the borrow request of <strong>' + esc(loan.borrowerName) + '</strong>?</p><p class="muted">' + esc(this.summary(loan)) + '</p>' +
        '<div class="field"><label for="lr-remarks">Reason for rejection <span class="req" aria-hidden="true">*</span></label><textarea id="lr-remarks" rows="3" aria-required="true"></textarea><small class="field-error" id="lr-err"></small></div>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="lr-ok">Reject request</button>'
    });
    modal.querySelector('#lr-ok').addEventListener('click', () => {
      const remarks = modal.querySelector('#lr-remarks').value.trim();
      if (!remarks) { modal.querySelector('#lr-err').textContent = 'Please give a reason.'; modal.querySelector('#lr-remarks').focus(); return; }
      loan.status = 'Rejected'; loan.decidedBy = currentUser().id; loan.decidedAt = nowStamp(); loan.decisionRemarks = remarks;
      saveDB();
      logAction('Reject', 'Borrow Requests', loan.loanNo, { status: 'Pending' }, { status: 'Rejected', remarks });
      closeModal();
      toast(loan.loanNo + ' rejected.', 'info');
      done && done();
    });
  },

  /* ---------- lend (Inventory Staff) ---------- */
  openLend(id, done) {
    const loan = byId('loans', id);
    if (!loan || loan.status !== 'Approved') return;
    if (isAdmin()) { toast('Inventory Staff records the lending.', 'error'); return; }
    const lines = this.lines(loan.id);
    let ok = true;
    const plans = {};
    const lineHTML = lines.map((l) => {
      const it = byId('items', l.itemId);
      if (it.type === 'Equipment') {
        const units = this.availableUnits(it.id);
        const pre = new Set((l.unitIds || []).filter((u) => units.some((x) => x.id === u)));
        units.forEach((u) => { if (pre.size < l.qty && !pre.has(u.id)) pre.add(u.id); });
        if (units.length < l.qty) ok = false;
        return '<fieldset class="unit-pick" data-line="' + l.id + '"><legend><strong>' + esc(it.name) + '</strong> · choose ' + l.qty + ' unit' + (l.qty > 1 ? 's' : '') + '</legend>' +
          (units.length ? units.map((u) => '<label><input type="checkbox" value="' + u.id + '"' + (pre.has(u.id) ? ' checked' : '') + '> ' + esc(u.propertyNo) + ' <span class="muted">' + esc(u.serialNo) + ' · ' + esc(u.condition) + ' · ' + esc(locLabel(u.locationId)) + '</span></label>').join('') : '<p class="muted">No available units.</p>') +
          (units.length < l.qty ? '<p class="alert alert-error">' + icon('alert', 16) + 'Only ' + units.length + ' unit(s) available.</p>' : '') +
          '<small class="field-error"></small></fieldset>';
      }
      const p = fefoPlan(it.id, l.qty, {});
      plans[l.id] = p;
      if (p.shortage > 0) ok = false;
      return '<div class="unit-pick"><strong>' + esc(it.name) + ' · ' + fmtNum(l.qty) + ' ' + esc(it.unit) + '</strong>' +
        '<ul class="plain-list">' + p.plan.map((x) => '<li>Lot ' + esc(byId('batches', x.batchId).lotNo) + ' · ' + fmtNum(x.qty) + ' ' + esc(it.unit) + ' from ' + esc(locLabel(x.locationId)) + '</li>').join('') + '</ul>' +
        (p.shortage ? '<p class="alert alert-error">' + icon('alert', 16) + 'Short by ' + fmtNum(p.shortage) + ' ' + esc(it.unit) + '.</p>' : '') + '</div>';
    }).join('');
    const fields = [
      { name: 'dateBorrowed', label: 'Date borrowed', type: 'date', required: true, default: todayISO(), validate: (v) => (v > todayISO() ? 'Cannot be in the future.' : v > loan.dueDate ? 'Cannot be after the return date (' + fmtDate(loan.dueDate) + ').' : '') },
      { name: 'timeBorrowed', label: 'Time', type: 'time', required: true, default: nowHM() },
      { name: 'lendRemarks', label: 'Remarks', type: 'textarea', full: true, rows: 2 }
    ];
    const modal = openModal({
      title: 'Lend · ' + loan.loanNo, size: 'lg',
      body: '<p class="muted">Borrower: <strong>' + esc(loan.borrowerName) + '</strong> · ' + esc(this.location(loan)) + ' · return by <strong>' + fmtDate(loan.dueDate) + '</strong></p>' +
        '<form id="ld-form" novalidate>' + formHTML(fields) + '<div class="stack">' + lineHTML + '</div>' + '<div class="form-grid">' + sigPadHTML('ld-sig', 'Borrower’s signature') + '</div></form>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ld-ok"' + (ok ? '' : ' disabled') + '>' + icon('check', 16) + 'Confirm lending</button>'
    });
    const form = modal.querySelector('#ld-form');
    const pad = bindSigPad(modal.querySelector('#ld-sig'));
    modal.querySelector('#ld-ok').addEventListener('click', () => {
      const v = validateForm(form, fields);
      let good = !!v;
      const picks = {};
      lines.forEach((l) => {
        const fs = form.querySelector('fieldset[data-line="' + l.id + '"]');
        if (!fs) return;
        const ids = $$('input:checked', fs).map((c) => Number(c.value));
        const err = fs.querySelector('.field-error');
        err.textContent = ids.length === l.qty ? '' : 'Choose exactly ' + l.qty + ' unit' + (l.qty > 1 ? 's' : '') + '.';
        if (ids.length !== l.qty) good = false;
        picks[l.id] = ids;
      });
      if (pad.isEmpty()) { modal.querySelector('#ld-sig-err').textContent = 'The borrower must sign.'; good = false; }
      if (!good) return;
      const me = currentUser().id;
      const stamp = v.dateBorrowed + 'T' + v.timeBorrowed + ':00';
      const where = this.location(loan);
      lines.forEach((l) => {
        const it = byId('items', l.itemId);
        if (it.type === 'Equipment') {
          l.equipmentIds = picks[l.id];
          l.equipmentIds.forEach((uid) => {
            const e = byId('equipment', uid);
            const from = e.locationId;
            Object.assign(e, {
              status: 'Assigned', personnelId: loan.borrowerType === 'Personnel' ? loan.borrowerId : null, borrowerName: loan.borrowerName, loanId: loan.id,
              dateAssigned: v.dateBorrowed, timeAssigned: v.timeBorrowed, dueDate: loan.dueDate,
              locationId: loan.locationId || e.locationId, locationText: loan.locationId ? '' : loan.locationText
            });
            DB.custody_assignments.push({ id: nextId('custody_assignments'), equipmentId: e.id, personnelId: e.personnelId, borrowerName: loan.borrowerName, loanId: loan.id, locationId: e.locationId, locationText: e.locationText,
              dateAssigned: v.dateBorrowed, timeAssigned: v.timeBorrowed, dueDate: loan.dueDate, conditionOut: e.condition, dateReturned: null, timeReturned: '', returnedBy: '', conditionIn: '', remarks: loan.purpose, recordedBy: me });
            DB.stock_transactions.push({ id: nextId('stock_transactions'), date: stamp, type: 'Assign', itemId: e.itemId, batchId: e.batchId, equipmentId: e.id, locationId: from, toLocationId: loan.locationId || null, quantity: 1, userId: me, refNo: e.propertyNo, remarks: loan.loanNo + ' · lent to ' + loan.borrowerName + (loan.locationId ? '' : ' at ' + loan.locationText) });
          });
        } else {
          l.batchesUsed = [];
          plans[l.id].plan.forEach((p) => {
            byId('inventory_stock', p.stockId).quantity -= p.qty;
            l.batchesUsed.push({ batchId: p.batchId, locationId: p.locationId, qty: p.qty, returned: 0 });
            DB.stock_transactions.push({ id: nextId('stock_transactions'), date: stamp, type: 'Lend', itemId: it.id, batchId: p.batchId, equipmentId: null, locationId: p.locationId, toLocationId: null, quantity: p.qty, userId: me, refNo: loan.loanNo, remarks: 'Lent to ' + loan.borrowerName + ' · ' + where });
          });
        }
        l.lentQty = l.qty;
      });
      Object.assign(loan, { status: 'Borrowed', lentBy: me, lentAt: nowStamp(), dateBorrowed: v.dateBorrowed, timeBorrowed: v.timeBorrowed, borrowerSignature: pad.data(), lendRemarks: v.lendRemarks });
      syncAlerts(); saveDB();
      logAction('Release', 'Borrow Requests', loan.loanNo, { status: 'Approved' }, { status: 'Borrowed', borrower: loan.borrowerName, date: v.dateBorrowed + ' ' + v.timeBorrowed, items: this.summary(loan) });
      closeModal();
      toast(loan.loanNo + ' lent to ' + loan.borrowerName + '. Due back ' + fmtDate(loan.dueDate) + '.', 'success');
      done && done();
    });
  },

  /* ---------- return (any role) ---------- */
  openReturn(id, done, opts) {
    const loan = byId('loans', id);
    if (!loan || !this.isOut(loan)) return;
    const o = opts || {};
    const lines = this.lines(loan.id).filter((l) => this.outQty(l) > 0);
    const storage = activeOf('locations').filter((l) => l.type !== 'Field Site');
    const firstLine = lines[0];
    const defLoc = firstLine && firstLine.batchesUsed && firstLine.batchesUsed[0] ? firstLine.batchesUsed[0].locationId : 7;
    const fields = [
      { name: 'dateReturned', label: 'Date returned', type: 'date', required: true, default: todayISO(),
        validate: (v) => (v > todayISO() ? 'Cannot be in the future.' : loan.dateBorrowed && v < loan.dateBorrowed ? 'Cannot be before the date borrowed (' + fmtDate(loan.dateBorrowed) + ').' : '') },
      { name: 'timeReturned', label: 'Time', type: 'time', required: true, default: nowHM() },
      { name: 'returnedBy', label: 'Returned by', required: true, default: loan.borrowerName, hint: 'Change it if someone else brought the items back.' },
      { name: 'locationId', label: 'Return to (storage)', type: 'select', required: true, options: storage.map((l) => ({ value: l.id, label: locLabel(l) })) },
      { name: 'remarks', label: 'Remarks', type: 'textarea', full: true, rows: 2 }
    ];
    const lineHTML = lines.map((l) => {
      const it = byId('items', l.itemId);
      if (it.type === 'Equipment') {
        const out = l.equipmentIds.filter((u) => byId('equipment', u).status === 'Assigned' && byId('equipment', u).loanId === loan.id);
        return '<fieldset class="unit-pick" data-line="' + l.id + '"><legend><strong>' + esc(it.name) + '</strong> · units being returned</legend>' +
          out.map((uid) => { const e = byId('equipment', uid); return '<div class="unit-row"><label><input type="checkbox" value="' + uid + '"' + (!o.unitId || o.unitId === uid ? ' checked' : '') + '> ' + esc(e.propertyNo) + '</label>' +
            '<label class="sr-only" for="rc-' + uid + '">Condition of ' + esc(e.propertyNo) + '</label><select id="rc-' + uid + '" data-cond="' + uid + '">' + CONDITIONS.slice(1).map((c) => '<option' + (c === (e.condition === 'New' ? 'Good' : e.condition) ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>'; }).join('') + '</fieldset>';
      }
      const left = this.outQty(l);
      return '<div class="unit-pick" data-qline="' + l.id + '"><label for="rq-' + l.id + '"><strong>' + esc(it.name) + '</strong> · ' + fmtNum(left) + ' ' + esc(it.unit) + ' still out</label>' +
        '<input id="rq-' + l.id + '" class="input-sm" inputmode="numeric" value="' + left + '"> <span class="muted">' + esc(it.unit) + ' returned now</span><small class="field-error"></small></div>';
    }).join('');
    const modal = openModal({
      title: 'Return · ' + loan.loanNo, size: 'lg',
      body: '<p class="muted">Borrowed by <strong>' + esc(loan.borrowerName) + '</strong> on ' + fmtDate(loan.dateBorrowed) + ', ' + fmtTime(loan.timeBorrowed) + ' · due ' + fmtDate(loan.dueDate) + (this.isOverdue(loan) ? ' ' + badge('Overdue') : '') + '</p>' +
        '<form id="rt-form" novalidate>' + formHTML(fields, { locationId: defLoc }) + '<div class="stack">' + lineHTML + '</div><div class="form-grid">' + sigPadHTML('rt-sig', 'Signature of the person returning') + '</div></form>',
      footer: '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="rt-ok">' + icon('check', 16) + 'Record return</button>'
    });
    const form = modal.querySelector('#rt-form');
    const pad = bindSigPad(modal.querySelector('#rt-sig'));
    modal.querySelector('#rt-ok').addEventListener('click', () => {
      const v = validateForm(form, fields);
      let good = !!v, any = false;
      const plan = [];
      lines.forEach((l) => {
        const fs = form.querySelector('fieldset[data-line="' + l.id + '"]');
        if (fs) {
          const ids = $$('input:checked', fs).map((c) => Number(c.value));
          if (ids.length) { any = true; plan.push({ l, ids, conds: Object.fromEntries(ids.map((u) => [u, fs.querySelector('[data-cond="' + u + '"]').value])) }); }
          return;
        }
        const box = form.querySelector('[data-qline="' + l.id + '"]');
        const raw = box.querySelector('input').value.trim();
        const n = Number(raw), left = this.outQty(l);
        let msg = '';
        if (raw === '' || !Number.isInteger(n)) msg = 'Enter a whole number.';
        else if (n < 0) msg = 'Cannot be negative.';
        else if (n > left) msg = 'Only ' + fmtNum(left) + ' still out.';
        box.querySelector('.field-error').textContent = msg;
        if (msg) good = false; else if (n > 0) { any = true; plan.push({ l, qty: n }); }
      });
      if (pad.isEmpty()) { modal.querySelector('#rt-sig-err').textContent = 'The person returning must sign.'; good = false; }
      if (!good) return;
      if (!any) { toast('Choose at least one unit or quantity being returned.', 'error'); return; }
      const me = currentUser().id, sig = pad.data(), to = Number(v.locationId);
      const stamp = v.dateReturned + 'T' + v.timeReturned + ':00';
      plan.forEach((p) => {
        const it = byId('items', p.l.itemId);
        const rec = { date: v.dateReturned, time: v.timeReturned, returnedBy: v.returnedBy, signature: sig, locationId: to, remarks: v.remarks, recordedBy: me, recordedAt: nowStamp() };
        if (p.ids) {
          p.ids.forEach((uid) => {
            const e = byId('equipment', uid), from = e.locationId;
            const c = DB.custody_assignments.filter((x) => x.equipmentId === uid && !x.dateReturned).sort((a, b) => b.id - a.id)[0];
            if (c) Object.assign(c, { dateReturned: v.dateReturned, timeReturned: v.timeReturned, returnedBy: v.returnedBy, conditionIn: p.conds[uid], remarks: [c.remarks, v.remarks].filter(Boolean).join(' · ') });
            Object.assign(e, { status: 'Available', personnelId: null, borrowerName: '', loanId: null, dateAssigned: null, timeAssigned: '', dueDate: null, locationText: '', locationId: to, condition: p.conds[uid] });
            DB.stock_transactions.push({ id: nextId('stock_transactions'), date: stamp, type: 'Return', itemId: e.itemId, batchId: e.batchId, equipmentId: uid, locationId: from, toLocationId: to, quantity: 1, userId: me, refNo: e.propertyNo, remarks: loan.loanNo + ' · returned by ' + v.returnedBy + ', condition: ' + p.conds[uid] });
          });
          p.l.returns.push(Object.assign(rec, { qty: p.ids.length, equipmentIds: p.ids, conditions: p.conds }));
        } else {
          let left = p.qty;
          p.l.batchesUsed.forEach((bu) => {
            const take = Math.min(left, bu.qty - (bu.returned || 0));
            if (take <= 0) return;
            bu.returned = (bu.returned || 0) + take; left -= take;
            let s = DB.inventory_stock.find((r) => r.batchId === bu.batchId && r.locationId === to);
            if (!s) { s = { id: nextId('inventory_stock'), batchId: bu.batchId, locationId: to, quantity: 0 }; DB.inventory_stock.push(s); }
            s.quantity += take;
            DB.stock_transactions.push({ id: nextId('stock_transactions'), date: stamp, type: 'Lend Return', itemId: it.id, batchId: bu.batchId, equipmentId: null, locationId: null, toLocationId: to, quantity: take, userId: me, refNo: loan.loanNo, remarks: 'Returned by ' + v.returnedBy });
          });
          p.l.returns.push(Object.assign(rec, { qty: p.qty, equipmentIds: [] }));
        }
      });
      const old = loan.status;
      this.refreshStatus(loan);
      syncAlerts(); saveDB();
      logAction('Update', 'Borrow Requests', loan.loanNo, { status: old }, { status: loan.status, returnedBy: v.returnedBy, date: v.dateReturned + ' ' + v.timeReturned });
      closeModal();
      toast(loan.loanNo + ': return recorded. Status: ' + loan.status + '.', 'success');
      done && done();
    });
  },

  /* ---------- logbook rows (one per item line) ---------- */
  rows() {
    return DB.loan_items.map((l) => {
      const loan = byId('loans', l.loanId);
      const it = byId('items', l.itemId);
      if (!loan || !it) return null;
      const units = (l.equipmentIds && l.equipmentIds.length ? l.equipmentIds : l.unitIds || []).map((u) => { const e = byId('equipment', u); return e ? e.propertyNo : ''; }).filter(Boolean);
      return {
        id: l.id, line: l, loan, item: it, units,
        loanNo: loan.loanNo, status: this.displayStatus(loan),
        date: loan.dateBorrowed || (loan.recordedAt || '').slice(0, 10),
        time: loan.dateBorrowed ? loan.timeBorrowed : '',
        borrower: loan.borrowerName, location: this.location(loan), qty: l.qty,
        returnsText: (l.returns || []).map((r) => fmtDate(r.date) + ' ' + fmtTime(r.time) + (l.qty > 1 || r.qty !== l.qty ? ' (' + r.qty + ')' : '')).join('; '),
        returnedBy: Array.from(new Set((l.returns || []).map((r) => r.returnedBy))).join(', '),
        remarks: [loan.purpose, loan.lendRemarks].concat((l.returns || []).map((r) => r.remarks)).filter(Boolean).join(' · ')
      };
    }).filter(Boolean);
  },
  report(from, to) {
    const list = this.rows().filter((r) => r.date >= from && r.date <= to && r.loan.dateBorrowed).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const rows = list.map((r) => [fmtDate(r.date), fmtTime(r.time), r.borrower, r.location, r.qty, r.item.name + (r.units.length ? ' (' + r.units.join(', ') + ')' : ''), fmtDate(r.loan.dueDate), r.returnsText || '—', r.returnedBy || '—', r.remarks || '—', r.status]);
    return { headers: ['Date', 'Time', 'Borrower’s name', 'Location', 'Qty', 'Item description', 'Return due', 'Date returned', 'Returned by', 'Remarks', 'Status'], num: [4], rows,
      totals: [['Logbook lines', rows.length], ['Still out', list.filter((r) => Loans.isOut(r.loan) && Loans.outQty(r.line) > 0).length], ['Overdue', list.filter((r) => r.status === 'Overdue').length]] };
  }
};

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */
Pages.requests = (view, r) => {
  if (r.parts[1] === 'new') return renderNewLoan(view, r);
  if (r.parts[1]) return renderLoanDetail(view, Number(r.parts[1]));
  const tabsList = ['All', 'Pending', 'Approved', 'Borrowed', 'Overdue', 'Returned', 'Rejected'];
  let tab = tabsList.includes(r.query.tab) ? r.query.tab : 'All';
  const inTab = (loan, t) => (t === 'All' ? true : t === 'Overdue' ? Loans.isOverdue(loan) : t === 'Borrowed' ? Loans.isOut(loan) : loan.status === t);
  const counts = (t) => DB.loans.filter((l) => inTab(l, t)).length;
  const lendItems = DB.items.filter((i) => DB.loan_items.some((l) => l.itemId === i.id));
  view.innerHTML =
    pageHeader('Borrow Requests', 'The borrowing logbook: Requested → Approved → Borrowed → Returned.',
      '<button class="btn btn-ghost" id="lb-print">' + icon('printer', 16) + 'Print logbook</button><button class="btn btn-ghost" id="lb-csv">' + icon('download', 16) + 'Export CSV</button>' +
      '<a class="btn btn-primary" href="#/requests/new">' + icon('plus', 16) + 'New borrow request</a>') +
    '<section class="card">' + tabsHTML(tabsList.map((t) => ({ key: t, label: t, count: counts(t) })), tab, 'Borrow request status') +
      '<div class="toolbar"><div class="filter grow"><label for="lb-q">Search</label><input id="lb-q" type="search" placeholder="Borrower, item, property no., location, request no.…"></div>' +
      '<div class="filter"><label for="lb-item">Item</label><select id="lb-item"><option value="">All items</option>' + selectOptions(lendItems, 'id', (i) => i.name, r.query.item) + '</select></div></div>' +
      '<div id="lb-table" class="logbook" role="tabpanel"></div></section>' +
    '<div id="lb-printable" class="print-only"></div>';
  const muted = '<span class="muted">—</span>';
  const table = new DataTable($('#lb-table', view), {
    sortKey: 'date', sortDir: 'desc', pageSize: 25, emptyText: 'No borrow requests here.',
    rowClass: (x) => (x.status === 'Overdue' ? 'row-overdue' : x.status === 'Rejected' ? 'row-inactive' : ''),
    columns: [
      { key: 'loanNo', label: 'Request', render: (x) => '<a href="#/requests/' + x.loan.id + '"><strong>' + esc(x.loanNo) + '</strong></a><br>' + badge(x.status) },
      { key: 'date', label: 'Date', value: (x) => x.date + (x.time || ''), render: (x) => (x.loan.dateBorrowed ? fmtDate(x.date) : '<span class="muted" title="Date requested">' + fmtDate(x.date) + '</span>') },
      { key: 'time', label: 'Time', render: (x) => (x.time ? fmtTime(x.time) : muted) },
      { key: 'sig', label: 'Signature', sortable: false, render: (x) => sigImg(x.loan.borrowerSignature, 'Signature of ' + x.borrower) },
      { key: 'borrower', label: 'Borrower’s name', render: (x) => '<strong>' + esc(x.borrower) + '</strong>' },
      { key: 'location', label: 'Location', render: (x) => esc(x.location) },
      { key: 'qty', label: 'Qty', className: 'num' },
      { key: 'itemName', label: 'Item description', value: (x) => x.item.name, render: (x) => esc(x.item.name) + (x.units.length ? '<br><small class="muted">' + esc(x.units.join(', ')) + '</small>' : '') },
      { key: 'due', label: 'Return due', value: (x) => x.loan.dueDate, render: (x) => (Loans.isOut(x.loan) ? dueHTML(x.loan.dueDate) : fmtDate(x.loan.dueDate)) },
      { key: 'returned', label: 'Date returned', value: (x) => x.returnsText, render: (x) => ((x.line.returns || []).length ? x.line.returns.map((rt) => fmtDate(rt.date) + ' <small class="muted">' + fmtTime(rt.time) + (x.qty > 1 || rt.qty !== x.qty ? ' · ' + rt.qty : '') + '</small>').join('<br>') : muted) },
      { key: 'returnedBy', label: 'Returned by', render: (x) => (x.returnedBy ? esc(x.returnedBy) : muted) },
      { key: 'rsig', label: 'Signature', sortable: false, render: (x) => ((x.line.returns || []).length ? x.line.returns.map((rt) => sigImg(rt.signature, 'Signature of ' + rt.returnedBy)).join('<br>') : muted) },
      { key: 'remarks', label: 'Remarks', render: (x) => (x.remarks ? '<small>' + esc(x.remarks) + '</small>' : muted) },
      { key: 'actions', label: 'Actions', sortable: false, className: 'actions', render: (x) => Loans.actionsHTML(x.loan, true) }
    ]
  });
  let current = [];
  const apply = () => {
    const q = $('#lb-q', view).value.trim().toLowerCase(), it = $('#lb-item', view).value;
    current = Loans.rows().filter((x) => inTab(x.loan, tab) && (!it || x.item.id === Number(it)) &&
      (!q || [x.loanNo, x.borrower, x.location, x.item.name, x.units.join(' '), x.returnedBy, x.remarks, x.status].join(' ').toLowerCase().includes(q)));
    table.setRows(current);
  };
  const exportRows = () => current.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((x) => [
    x.loanNo, fmtDate(x.date), fmtTime(x.time), x.borrower, x.location, x.qty, x.item.name + (x.units.length ? ' (' + x.units.join(', ') + ')' : ''),
    fmtDate(x.loan.dueDate), x.returnsText || '', x.returnedBy || '', x.remarks || '', x.status]);
  const headers = ['Request no.', 'Date', 'Time', 'Borrower’s name', 'Location', 'Qty', 'Item description', 'Return due', 'Date returned', 'Returned by', 'Remarks', 'Status'];
  bindTabs(view, (t) => { tab = t; replaceQuery('/requests', { tab: t === 'All' ? '' : t }); apply(); });
  $('#lb-q', view).addEventListener('input', debounce(apply, 150));
  $('#lb-item', view).addEventListener('change', apply);
  $('#lb-csv', view).addEventListener('click', () => {
    downloadCSV('borrowing-logbook-' + todayISO() + '.csv', headers, exportRows());
    logAction('Export', 'Borrow Requests', 'Logbook', null, { format: 'CSV', rows: current.length, tab });
  });
  $('#lb-print', view).addEventListener('click', () => {
    const list = current.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const el = $('#lb-printable', view);
    el.innerHTML = '<div class="print-head"><strong>' + esc(settings().lguName) + ' · ' + esc(settings().officeName) + '</strong><h2>Borrowing Logbook</h2><small>' + esc(tab === 'All' ? 'All requests' : tab) + ' · printed ' + fmtDateTime(nowStamp()) + '</small></div>' +
      '<table class="table report-table logbook-print"><thead><tr><th>Date</th><th>Time</th><th>Signature</th><th>Borrower’s name</th><th>Location</th><th>Qty</th><th>Item description</th><th>Date returned</th><th>Returned by</th><th>Signature</th><th>Remarks</th></tr></thead><tbody>' +
      (list.length ? list.map((x) => '<tr><td>' + fmtDate(x.date) + '</td><td>' + fmtTime(x.time) + '</td><td>' + sigImg(x.loan.borrowerSignature, 'Signature') + '</td><td>' + esc(x.borrower) + '</td><td>' + esc(x.location) + '</td><td class="num">' + fmtNum(x.qty) + '</td><td>' + esc(x.item.name) + (x.units.length ? ' (' + esc(x.units.join(', ')) + ')' : '') + '</td><td>' + esc(x.returnsText || '') + '</td><td>' + esc(x.returnedBy || '') + '</td><td>' + (x.line.returns || []).map((rt) => sigImg(rt.signature, 'Signature')).join(' ') + '</td><td>' + esc(x.remarks || '') + '</td></tr>').join('') : '<tr><td colspan="11">No entries.</td></tr>') +
      '</tbody></table>';
    printElement(el);
  });
  Loans.bind(view, rerender);
  apply();
};

function renderNewLoan(view, r) {
  const locOpts = () => activeOf('locations').map((l) => ({ value: l.id, label: locLabel(l) + ' (' + l.barangay + ')' })).concat([{ value: 'other', label: 'Other place (type it below)' }]);
  const fields = [
    { name: 'borrowerType', label: 'Borrower is', type: 'select', required: true, placeholder: false, options: [{ value: 'Personnel', label: 'CAGRO personnel' }, { value: 'Beneficiary', label: 'Farmer or association' }, { value: 'Other', label: 'Other person (type the name)' }] },
    { name: 'personnelId', label: 'Personnel', type: 'select', required: true, showIf: (v) => v.borrowerType === 'Personnel', options: () => activeOf('personnel').map((p) => ({ value: p.id, label: p.fullName + ' · ' + p.position })) },
    { name: 'beneficiaryId', label: 'Farmer / association', type: 'select', required: true, showIf: (v) => v.borrowerType === 'Beneficiary', options: () => activeOf('beneficiaries').map((b) => ({ value: b.id, label: b.name + ' · ' + b.barangay })) },
    { name: 'borrowerName', label: 'Borrower’s name', required: true, showIf: (v) => v.borrowerType === 'Other', placeholder: 'Full name', hint: 'Add the office or group in Purpose if needed.' },
    { name: 'contactNo', label: 'Contact number', type: 'tel', placeholder: '09171234567' },
    { name: 'locationId', label: 'Where it will be used', type: 'select', required: true, options: locOpts },
    { name: 'locationText', label: 'Place', required: true, showIf: (v) => v.locationId === 'other', placeholder: 'e.g. Apokon Barangay Gym' },
    { name: 'purpose', label: 'Purpose', type: 'textarea', required: true, full: true, rows: 2 },
    { name: 'dateNeeded', label: 'Date needed', type: 'date', required: true, default: todayISO() },
    { name: 'dueDate', label: 'Expected return date', type: 'date', required: true, validate: (v, vals) => (vals.dateNeeded && v < vals.dateNeeded ? 'Cannot be before the date needed.' : '') }
  ];
  const lendable = DB.items.filter(isLendable);
  const preItem = byId('items', r.query.item);
  const preUnit = byId('equipment', r.query.unit);
  view.innerHTML =
    pageHeader('New borrow request', 'Like writing a line in the logbook. The Administrator approves it, then Inventory Staff lends the items and the borrower signs.', '', [{ label: 'Borrow Requests', href: '#/requests' }, { label: 'New' }]) +
    '<form id="ln-form" novalidate class="stack">' +
      '<section class="card"><header class="card-head"><h2>Borrower</h2></header>' + formHTML(fields, { borrowerType: 'Personnel' }) + '</section>' +
      '<section class="card"><header class="card-head"><h2>Items to borrow</h2><button type="button" class="btn btn-ghost btn-sm" id="add-line">' + icon('plus', 14) + 'Add item</button></header>' +
        (preUnit ? '<p class="hint-box">' + icon('tool', 16) + 'Unit <strong>' + esc(preUnit.propertyNo) + '</strong> will be pre-selected when the items are lent.</p>' : '') +
        '<div id="lines" class="lines"></div><small class="field-error" id="lines-err" aria-live="polite"></small></section>' +
      '<div class="form-actions"><a class="btn btn-ghost" href="#/requests">Cancel</a><button class="btn btn-primary" type="submit">' + icon('check', 16) + 'Submit request</button></div>' +
    '</form>';
  const form = $('#ln-form', view), linesEl = $('#lines', view);
  bindShowIf(form, fields);
  let seq = 0;
  const updateAvail = () => {
    $$('.line', linesEl).forEach((ln) => {
      const it = byId('items', ln.querySelector('.ln-item').value);
      ln.querySelector('.ln-avail').textContent = it ? 'Available: ' + fmtNum(Loans.available(it)) + ' ' + it.unit : '';
    });
    $$('.ln-remove', linesEl).forEach((b) => { b.disabled = $$('.line', linesEl).length === 1; });
  };
  const addLine = (itemId, qty) => {
    const n = ++seq;
    linesEl.insertAdjacentHTML('beforeend',
      '<div class="line" data-line="' + n + '">' +
        '<div class="field"><label for="ln-item-' + n + '">Item</label><select id="ln-item-' + n + '" class="ln-item"><option value="">Select item…</option>' + selectOptions(lendable, 'id', (i) => i.name + ' (' + i.unit + ')', itemId) + '</select></div>' +
        '<div class="field"><label for="ln-qty-' + n + '">Qty</label><input id="ln-qty-' + n + '" class="ln-qty" inputmode="numeric" placeholder="0" value="' + (qty || '') + '"></div>' +
        '<div class="ln-avail muted" aria-live="polite"></div>' +
        '<button type="button" class="icon-btn ln-remove" aria-label="Remove item">' + icon('x', 16) + '</button>' +
        '<small class="field-error ln-err"></small></div>');
    updateAvail();
  };
  $('#add-line', view).addEventListener('click', () => { addLine(''); linesEl.lastElementChild.querySelector('select').focus(); });
  linesEl.addEventListener('click', (e) => { const b = e.target.closest('.ln-remove'); if (b && !b.disabled) { b.closest('.line').remove(); updateAvail(); } });
  linesEl.addEventListener('change', updateAvail);
  addLine(preItem && isLendable(preItem) ? preItem.id : '', preItem ? 1 : '');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = validateForm(form, fields);
    let ok = true;
    const seen = new Set(), items = [];
    $$('.line', linesEl).forEach((ln) => {
      const it = byId('items', ln.querySelector('.ln-item').value);
      const raw = ln.querySelector('.ln-qty').value.trim(), qty = Number(raw);
      let msg = '';
      if (!it) msg = 'Choose an item.';
      else if (seen.has(it.id)) msg = 'This item is already on another line.';
      else if (raw === '' || !Number.isInteger(qty) || qty <= 0) msg = 'Enter a whole number above zero.';
      else if (qty > Loans.available(it)) msg = 'Only ' + fmtNum(Loans.available(it)) + ' ' + it.unit + ' available.';
      ln.querySelector('.ln-err').textContent = msg;
      ln.classList.toggle('has-error', !!msg);
      if (msg) ok = false; else { seen.add(it.id); items.push({ it, qty }); }
    });
    $('#lines-err', view).textContent = items.length || !ok ? '' : 'Add at least one item.';
    if (!v || !ok || !items.length) { toast('Please correct the highlighted fields.', 'error'); return; }
    let name = v.borrowerName, contact = v.contactNo, bid = null;
    if (v.borrowerType === 'Personnel') { const p = byId('personnel', v.personnelId); name = p.fullName; bid = p.id; contact = contact || p.contactNumber; }
    if (v.borrowerType === 'Beneficiary') { const b = byId('beneficiaries', v.beneficiaryId); name = b.name; bid = b.id; contact = contact || b.contactNumber; }
    const loan = {
      id: nextId('loans'), loanNo: Loans.nextNo(), borrowerType: v.borrowerType, borrowerId: bid, borrowerName: name, contactNo: contact,
      locationId: v.locationId === 'other' ? null : Number(v.locationId), locationText: v.locationId === 'other' ? v.locationText : '',
      purpose: v.purpose, dateNeeded: v.dateNeeded, dueDate: v.dueDate, status: 'Pending', recordedBy: currentUser().id, recordedAt: nowStamp(),
      decidedBy: null, decidedAt: null, decisionRemarks: '', lentBy: null, lentAt: null, dateBorrowed: null, timeBorrowed: '', borrowerSignature: '', lendRemarks: ''
    };
    DB.loans.push(loan);
    items.forEach((x) => DB.loan_items.push({ id: nextId('loan_items'), loanId: loan.id, itemId: x.it.id, qty: x.qty,
      unitIds: preUnit && preUnit.itemId === x.it.id ? [preUnit.id] : [], equipmentIds: [], batchesUsed: [], lentQty: 0, returns: [] }));
    saveDB();
    logAction('Create', 'Borrow Requests', loan.loanNo, null, { borrower: name, location: Loans.location(loan), due: v.dueDate, items: Loans.summary(loan) });
    toast(loan.loanNo + ' submitted and waiting for approval.', 'success');
    location.hash = '#/requests/' + loan.id;
  });
}

function renderLoanDetail(view, id) {
  const loan = byId('loans', id);
  if (!loan) return Pages.notFound(view);
  const lines = Loans.lines(loan.id);
  const itemRows = lines.map((l) => {
    const it = byId('items', l.itemId);
    const detail = it.type === 'Equipment'
      ? (l.equipmentIds.length ? l.equipmentIds : l.unitIds).map((u) => { const e = byId('equipment', u); return e ? '<a href="#/equipment/' + e.id + '">' + esc(e.propertyNo) + '</a>' : ''; }).join(', ') + (l.equipmentIds.length ? '' : l.unitIds.length ? ' <span class="muted">(preferred)</span>' : '')
      : (l.batchesUsed || []).map((b) => 'Lot ' + esc(byId('batches', b.batchId).lotNo) + ' · ' + fmtNum(b.qty) + ' from ' + esc(locLabel(b.locationId))).join('<br>');
    return '<tr><td><a href="#/items/' + it.id + '"><strong>' + esc(it.name) + '</strong></a></td><td class="num">' + fmtNum(l.qty) + ' ' + esc(it.unit) + '</td><td>' + (detail || '<span class="muted">—</span>') + '</td>' +
      '<td class="num">' + fmtNum(Loans.returnedQty(l)) + '</td><td class="num"><strong>' + fmtNum(Math.max(0, Loans.outQty(l))) + '</strong></td></tr>';
  }).join('');
  const returns = [];
  lines.forEach((l) => (l.returns || []).forEach((rt) => returns.push({ l, rt })));
  returns.sort((a, b) => (a.rt.date + a.rt.time).localeCompare(b.rt.date + b.rt.time));
  const returnRows = returns.map(({ l, rt }) => {
    const it = byId('items', l.itemId);
    const what = fmtNum(rt.qty) + ' ' + esc(it.unit) + ' ' + esc(it.name) + (rt.equipmentIds && rt.equipmentIds.length ? ' (' + rt.equipmentIds.map((u) => esc(byId('equipment', u).propertyNo) + (rt.conditions ? ': ' + esc(rt.conditions[u]) : '')).join(', ') + ')' : '');
    return '<tr><td>' + fmtDate(rt.date) + '<br><small class="muted">' + fmtTime(rt.time) + '</small></td><td>' + esc(rt.returnedBy) + '</td><td>' + what + '</td><td>' + esc(locLabel(rt.locationId)) + '</td><td>' + sigImg(rt.signature, 'Signature of ' + rt.returnedBy) + '</td><td>' + esc(userName(rt.recordedBy)) + '</td><td>' + esc(rt.remarks || '—') + '</td></tr>';
  }).join('');

  const step = (state, title, who, when, note) => '<li class="step step-' + state + '"><span class="step-dot" aria-hidden="true">' + (state === 'done' ? icon('check', 14) : state === 'rejected' ? icon('x', 14) : '') + '</span><div><strong>' + esc(title) + '</strong>' +
    (who ? '<p>' + esc(who) + (when ? ' · ' + when : '') + '</p>' : '') + (note ? '<p class="muted">' + esc(note) + '</p>' : '') + '</div></li>';
  const st = loan.status, lent = !!loan.dateBorrowed;
  const lastReturn = returns.length ? returns[returns.length - 1].rt : null;
  const timeline = '<ol class="steps">' +
    step('done', 'Requested', userName(loan.recordedBy), fmtDateTime(loan.recordedAt)) +
    (st === 'Rejected' ? step('rejected', 'Rejected', userName(loan.decidedBy), fmtDateTime(loan.decidedAt), loan.decisionRemarks)
      : loan.decidedBy ? step('done', 'Approved', userName(loan.decidedBy), fmtDateTime(loan.decidedAt), loan.decisionRemarks) : step('waiting', 'Approval', '', '', 'Waiting for the Administrator.')) +
    (st === 'Rejected' ? step('skipped', 'Borrowed', '', '', 'Not applicable.')
      : lent ? step('done', 'Borrowed', loan.borrowerName, fmtDate(loan.dateBorrowed) + ', ' + fmtTime(loan.timeBorrowed), 'Lent by ' + userName(loan.lentBy)) : step('waiting', 'Lend', '', '', st === 'Approved' ? 'Waiting for Inventory Staff to lend the items.' : 'After approval.')) +
    (st === 'Rejected' ? step('skipped', 'Returned', '', '', 'Not applicable.')
      : st === 'Returned' ? step('done', 'Returned', lastReturn.returnedBy, fmtDate(lastReturn.date) + ', ' + fmtTime(lastReturn.time))
        : st === 'Partially Returned' ? step('waiting', 'Partly returned', '', '', 'Some items are still out. Due ' + fmtDate(loan.dueDate) + '.')
          : step('waiting', 'Return', '', '', lent ? 'Due ' + fmtDate(loan.dueDate) + (Loans.isOverdue(loan) ? ' (overdue)' : '') + '.' : 'After lending.')) + '</ol>';
  const ownNote = isAdmin() && st === 'Pending' && loan.recordedBy === currentUser().id
    ? '<div class="alert alert-warn">' + icon('lock', 16) + '<span><strong>Separation of duties:</strong> you recorded this request, so another Administrator must approve it.</span></div>' : '';
  const adminNote = isAdmin() && st === 'Approved' ? '<div class="alert alert-info">' + icon('clock', 16) + '<span>Approved. Inventory Staff will lend the items and get the borrower’s signature.</span></div>' : '';
  const overdueNote = Loans.isOverdue(loan) ? '<div class="alert alert-error">' + icon('alert', 16) + '<span><strong>Overdue.</strong> It was due on ' + fmtDate(loan.dueDate) + ' (' + (-daysTo(loan.dueDate)) + ' days ago).</span></div>' : '';

  view.innerHTML =
    pageHeader(loan.loanNo, badge(Loans.displayStatus(loan)) + (Loans.isOverdue(loan) ? ' ' + badge(st) : '') + ' · ' + esc(loan.borrowerName), '<span class="page-actions">' + Loans.actionsHTML(loan) + '</span>',
      [{ label: 'Borrow Requests', href: '#/requests' }, { label: loan.loanNo }]) +
    overdueNote + ownNote + adminNote +
    '<div class="grid-2 align-start wide-left">' +
      '<div class="stack">' +
        '<section class="card"><header class="card-head"><h2>Borrower</h2></header>' + infoList([
          ['Borrower’s name', '<strong>' + esc(loan.borrowerName) + '</strong> <span class="muted">(' + esc(loan.borrowerType === 'Other' ? 'Other' : loan.borrowerType === 'Personnel' ? 'CAGRO personnel' : 'Farmer / association') + ')</span>'],
          ['Contact number', esc(loan.contactNo || '—')], ['Location', esc(Loans.location(loan))], ['Purpose', esc(loan.purpose)],
          ['Date needed', fmtDate(loan.dateNeeded)], ['Expected return', Loans.isOut(loan) ? dueHTML(loan.dueDate).replace('<br>', ' ') : fmtDate(loan.dueDate)],
          ['Date / time borrowed', lent ? fmtDate(loan.dateBorrowed) + ', ' + fmtTime(loan.timeBorrowed) : '—'],
          ['Borrower’s signature', lent ? sigImg(loan.borrowerSignature, 'Signature of ' + loan.borrowerName) : '—'],
          ['Lent by', lent ? esc(userName(loan.lentBy)) : '—'], ['Lending remarks', esc(loan.lendRemarks || '—')]]) + '</section>' +
        '<section class="card"><header class="card-head"><h2>Items</h2></header><div class="table-wrap"><table class="table"><thead><tr><th>Item description</th><th class="num">Qty</th><th>Units / batches</th><th class="num">Returned</th><th class="num">Still out</th></tr></thead><tbody>' + itemRows + '</tbody></table></div></section>' +
        '<section class="card"><header class="card-head"><h2>Returns</h2></header>' + (returnRows
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>Date returned</th><th>Returned by</th><th>Items</th><th>Put back at</th><th>Signature</th><th>Received by</th><th>Remarks</th></tr></thead><tbody>' + returnRows + '</tbody></table></div>'
          : emptyState('Nothing returned yet.')) + '</section>' +
      '</div>' +
      '<section class="card"><header class="card-head"><h2>Status timeline</h2></header>' + timeline + '</section>' +
    '</div>';
  Loans.bind(view, rerender);
}
