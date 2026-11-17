# Asa ni? Prototype: Step-by-Step Testing Checklist

Work through the sections in order. Each step lists **what to do** and, after the →, **what you should see**.
Tick each box as you go. The expected numbers assume fresh demo data (see step 0.3).

---

## 0. Setup

- [ ] **0.1** Open `index.html` by double-clicking it (Chrome or Edge recommended). → The login page appears.
- [ ] **0.2** Press **F12** and open the **Console** tab. Keep it open while you test. → No red errors should appear at any point.
- [ ] **0.3** Log in as `admin` / `admin123`, go to **Settings → Reset demo data → Reset everything**. → Toast "Demo data has been reset." You now have clean data.

---

## 1. Login (Page A)

- [ ] **1.1** Log out. Click **Sign in** with both fields empty. → "Please enter your username and password."
- [ ] **1.2** Enter `admin` / `wrongpass`. → "Incorrect username or password. Please try again." and the password field is cleared.
- [ ] **1.3** Enter `amendoza` / `staff123` (an inactive account). → "This account is deactivated. Please contact the CAGRO Administrator."
- [ ] **1.4** Type a password and click the **eye** icon. → The password becomes visible; click again to hide it.
- [ ] **1.5** Click the **Administrator** demo account button. → Username and password are filled in.
- [ ] **1.6** Tick **Remember me**, sign in, log out. → The username is pre-filled on the login page.
- [ ] **1.7** Check the branding. → "City Government of Tagum", "City Agriculture Office (CAGRO)" and the two demo accounts are shown.

---

## 2. Roles and access control

- [ ] **2.1** Log in as `admin`. → The sidebar has 4 sections, including **Administration** (Activity Log, User Management, Settings).
- [ ] **2.2** Log out, log in as `staff` / `staff123`. → The **Administration** section is gone.
- [ ] **2.3** As staff, type `#/settings` at the end of the address bar and press Enter. → **"Access denied"** page.
- [ ] **2.4** Repeat with `#/users` and `#/activity-log`. → "Access denied" each time.
- [ ] **2.5** Type `#/something-random`. → "Page not found".
- [ ] **2.6** Click a few pages, then press the browser **Back** button. → You return to the previous page.
- [ ] **2.7** Watch while changing pages. → A grey loading skeleton flashes briefly before each page.

---

## 3. Dashboard (Page B)

Log in as `admin`.

- [ ] **3.1** Check the summary cards. → Total items **15**, Total units **4,662**, Pending requests **3**, Low-stock items **4**, Near-expiry batches **3**, Expired batches **2**, Equipment assigned **6**.
- [ ] **3.2** Check the notification bell. → It shows **9**.
- [ ] **3.3** Check the **Stock by category** bar chart. → 6 bars; hover a bar to see its value.
- [ ] **3.4** Check the **Monthly releases** line chart. → 6 months, ending with the current month.
- [ ] **3.5** Check the alert lists. → Low Stock (4), Near Expiry (3), Expired (2). Click an item. → Its Item Details page opens.
- [ ] **3.6** Check **Recent transactions**. → The 5 latest transactions.
- [ ] **3.7** Check **Pending requests**. → Each has **Approve / Reject** buttons. On **REQ-2026-0102** the Approve button is disabled; hover it. → Tooltip explains separation of duties.
- [ ] **3.8** Click any summary card. → It opens the matching filtered page (e.g. Low-stock items → Items filtered to "Low or Out of Stock").
- [ ] **3.9** Log in as `staff`. → Pending requests have **no** Approve/Reject buttons, and a green banner says 1 approved request is waiting for release.

---

## 4. "Asa ni?" Search (Page C)

- [ ] **4.1** Type `tractor` in the **top-bar** search box and press Enter. → The Search page opens with 2 results: Four-wheel farm tractor and Hand tractor.
- [ ] **4.2** Check the tractor card. → "Four-wheel farm tractor (EQ-2026-014) at Visayan Village Field Site, Purok 3, beside the barangay hall. Custodian: Juan Dela Cruz, assigned since …". The word "tractor" is highlighted.
- [ ] **4.3** Search `RS-0925`. → Rice seeds with **two** location lines: 1,200 kg at CAGRO Main Warehouse, Room 1, Rack A, Shelf 2, and 150 kg at Mankilam Demo Farm (lot split across two places). Near Expiry badge.
- [ ] **4.4** Search `Juan Dela Cruz`. → Units he holds (tractor and a grass cutter).
- [ ] **4.5** Clear the box. Set **Barangay = Visayan Village**. → Only items located in Visayan Village.
- [ ] **4.6** Set **Location type = Field Site**. → Only field-site lines.
- [ ] **4.7** Set **Expiry = Already expired**. → Organic fertilizer (OF-0426) and Insecticide (CY-0126).
- [ ] **4.8** Set **Status = Out of Stock**. → Herbicide (Glyphosate), "No stock on hand at any location."
- [ ] **4.9** Search `zzzz`. → Empty state "No items found."
- [ ] **4.10** Click **Clear**, then click a result card. → The Item Details page opens.

---

## 5. Items / Inventory (Page D)

- [ ] **5.1** Open **Items / Inventory**. → Table with code, name, category, type, unit, total on hand, reorder level, status badge. Pagination shows "Showing 1–10 of 15".
- [ ] **5.2** Check the badges. → In Stock (green), Low Stock (orange), Out of Stock (dark), Near Expiry (amber), Expired (red).
- [ ] **5.3** Click the **Total on hand** column header twice. → Sorts ascending, then descending.
- [ ] **5.4** Go to page 2 with the pager. → The remaining 5 items.
- [ ] **5.5** Filters: Category = Pesticides → 2 items; Type = Equipment → 4 items; Status = Low or Out of Stock → 4 items; type "urea" in Search → 1 item.
- [ ] **5.6** Click **Add item**, click **Add item** in the modal without filling anything. → Red "This field is required." under each required field.
- [ ] **5.7** Enter code `SD-001`. → "This item code is already used."
- [ ] **5.8** Enter Reorder level `abc`. → "Please enter a valid number."
- [ ] **5.9** Fill valid data (e.g. `SD-003`, "Mungbean seeds", Seeds, kg, Consumable, 50) and save. → Toast; the item appears with **Out of Stock** and 0 on hand.
- [ ] **5.10** **Edit** Rice seeds and change Type to Equipment. → "Type cannot change once the item has stock records."
- [ ] **5.11** Edit the reorder level of any item and save. → Toast "… updated."
- [ ] **5.12** As admin, click **Deactivate** on your new item → confirmation dialog → confirm. → It disappears from the "Active" view. Set **Record = Inactive** → it is there; click **Reactivate**.
- [ ] **5.13** As staff, open Items. → **No** Deactivate buttons.
- [ ] **5.14** Click **Export CSV**. → A `.csv` file downloads and opens in Excel.

---

## 6. Item Details (Page E)

- [ ] **6.1** Open **Rice seeds (Inbred)**. → Info card, status Near Expiry, summary cards.
- [ ] **6.2** Check the **Batches** table. → RS-0925 (PhilRice, expires in 20 days, amber) showing 2 locations, and RS-1026. Columns: lot, supplier, DR no., date received, expiry, days to expiry, qty per location.
- [ ] **6.3** Check the **Locations** table. → Location, type, barangay, room/rack/shelf or landmark, quantity.
- [ ] **6.4** Check **Movement history**. → Timeline of Stock-In, Release and Transfer entries with user and date.
- [ ] **6.5** Open **Four-wheel farm tractor**. → An **Equipment units** table (property no., serial, condition, location, accountable person, date assigned). Click **▸** on EQ-2026-014. → Custody history (Ramon T. Bautista returned, then Juan Dela Cruz current).
- [ ] **6.6** Open **Organic fertilizer**. → Lot OF-0426 shows "10 days ago" in red and an **Expired** badge.

---

## 7. Stock-In (Page F)

Log in as `staff`.

- [ ] **7.1** Open **Stock-In**, click **Save Stock-In** with nothing filled. → Required-field errors and a red toast.
- [ ] **7.2** Pick *Hybrid corn seeds*. → The right panel shows On hand 180 kg, Low Stock.
- [ ] **7.3** Leave Expiry empty and save. → Expiry date "This field is required." (required for seeds, fertilizers, pesticides).
- [ ] **7.4** Set Date received to tomorrow. → "Date received cannot be in the future."
- [ ] **7.5** Set expiry before the date received. → "Expiry must be after the date received."
- [ ] **7.6** Enter a quantity of `abc`. → "Please enter a valid number."
- [ ] **7.7** Valid entry: DA Region XI, DR `DR-DA11-2026-1120`, lot `HC-1126`, 300, expiry next year, Main Warehouse Room 1 Rack B Shelf 1 → Save. → Green box "Balance: 180 → **480 kg** · Status: **In Stock**"; the Low-stock card on the Dashboard drops to 3.
- [ ] **7.8** Try lot `HC-1126` again for corn. → "This lot number already exists for this item."
- [ ] **7.9** Pick *Shovel* (Farm Tools) and leave expiry empty. → Allowed (expiry is optional for tools).
- [ ] **7.10** Pick *Water pump* (equipment). → A **Serial numbers** box appears. Enter quantity 2 and save. → New property numbers **EQ-2026-046, EQ-2026-047** are shown and appear in Equipment & Custody as Available.

---

## 8. Requests (Page G)

### 8a. List and new request (as `staff`)
- [ ] **8.1** Open **Requests**. → Tabs All (9), Pending (3), Approved (1), Rejected (1), Released (4). Click each tab. → The list filters.
- [ ] **8.2** **New request** → submit empty. → Errors, plus "Choose an item." on the item line.
- [ ] **8.3** Change Requested by to **Field personnel**. → The beneficiary dropdown switches to a personnel dropdown.
- [ ] **8.4** Set Type = **Transfer**. → **Target location** appears. Type = **Adjustment** → **Adjustment reason** appears and RIS becomes optional. Reason = **Recount** → **Recount result** appears.
- [ ] **8.5** Type = Release, item Rice seeds, quantity 99999. → "Only 2,150 kg available."
- [ ] **8.6** Add a second line with the same item. → "This item is already on another line."
- [ ] **8.7** Enter an RIS number already used, e.g. `RIS-2026-11-041`. → "Already used by REQ-2026-0101."
- [ ] **8.8** Valid release: RIS `RIS-2026-11-050`, beneficiary Eduardo M. Santos, purpose, Rice seeds **1,400** kg → Submit. → The request detail page opens, status **Pending**, timeline "Recorded ✓ → Approval (waiting) → Release".
- [ ] **8.9** As staff, check the detail page. → No Approve/Reject buttons.

### 8b. Approve / reject (as `admin`)
- [ ] **8.10** Open your new request → **Approve**. Change the quantity to 2000. → "Cannot exceed the requested 1,400." Set 1,400, add remarks → **Approve request**. → Status **Approved**; timeline shows who approved and when.
- [ ] **8.11** Open **REQ-2026-0102** (recorded by admin). → Approve is **disabled**, a yellow "Separation of duties" box is shown, and hovering the button shows the tooltip.
- [ ] **8.12** Click **Reject** on REQ-2026-0102 and confirm with empty remarks. → "Please give a reason." Add a reason → Rejected; timeline shows "Released: Not applicable".
- [ ] **8.13** As admin, open an Approved request. → No Release button; note says Inventory Staff will release it.

### 8c. Release with FEFO (as `staff`)
- [ ] **8.14** Open your approved rice request → **Release**. → FEFO plan: **RS-0925** 1,200 kg (Room 1, Rack A, Shelf 2) → **RS-0925** 150 kg (Mankilam Demo Farm) → **RS-1026** 50 kg. The nearest-expiry lot is used first.
- [ ] **8.15** Confirm. → Status **Released**; the items table shows "Batches used (FEFO)"; rice total drops from 2,150 to 750 kg; the RS-0925 near-expiry alert disappears from Notifications (auto-resolved).
- [ ] **8.16** Release **REQ-2026-0098** (corn 50 kg). → Taken from **HC-0726** (expires sooner), not your new HC-1126.

### 8d. Adjustment and transfer
- [ ] **8.17** As admin approve **REQ-2026-0099** (Organic fertilizer spoilage, 5 bags). As staff click **Post adjustment**. → The plan takes from expired lot **OF-0426** (adjustments may use expired stock; releases never do).
- [ ] **8.18** Create a **Transfer** of Urea fertilizer, 20 bags, target *Pagsabangan Field Site*. Approve as admin, then **Post transfer** as staff. → Item details for Urea now list Pagsabangan Field Site in Locations; the total on hand stays the same.

---

## 9. Equipment & Custody (Page H)

- [ ] **9.1** Open **Equipment & Custody**. → List with property no., item, condition, location, status, accountable person. Filter Status = Assigned → 6 units.
- [ ] **9.2** Click **▸** on a row. → Custody history.
- [ ] **9.3** Click **Assign** on **EQ-2026-022** → choose personnel, location *Canocotan Field Site*, condition Good → Assign. → Status **Assigned**, custodian shown.
- [ ] **9.4** Click **Return** on EQ-2026-022, set Date returned to a date before the assigned date. → "Cannot be before the date assigned …".
- [ ] **9.5** Return with today's date and condition *Needs Repair*. → Status **Available**, condition updated, history shows the return.
- [ ] **9.6** Open **EQ-2026-014** detail page. → "Asa ni? Current whereabouts" card shows Visayan Village and Juan Dela Cruz.
- [ ] **9.7** As admin, open an **Available** unit → **Dispose** → confirm. → Status Disposed; click **Restore** to undo. An Assigned unit has no Dispose button.
- [ ] **9.8** As staff, open an equipment page. → No Dispose/Restore button.

---

## 10. Master Data (Page I)

- [ ] **10.1** Open **Master Data**. → Tabs: Categories, Suppliers, Locations, Personnel, Beneficiaries. Use the arrow keys on the tabs. → They switch.
- [ ] **10.2** **Locations → Add location**, set Type = **Field Site**. → Room, Rack and Shelf fields **disappear**; Address/landmark becomes required. Switch to Warehouse → they reappear.
- [ ] **10.3** Add a field site in Barangay *Busaon*. → It appears in the table and in the Stock-In location dropdown.
- [ ] **10.4** As admin, **Deactivate** "CAGRO Main Warehouse" (any row with stock). → Error toast: still holds stock or equipment.
- [ ] **10.5** Deactivate the new Busaon site → confirm. → Status Inactive; click **Activate** to restore.
- [ ] **10.6** **Suppliers → Edit** a supplier, change the contact number to `abc`. → Phone format error.
- [ ] **10.7** **Beneficiaries → Add**, use RSBSA `11-23-15-023-000519`. → "This RSBSA number already exists."
- [ ] **10.8** Use the search box and Status filter on each tab. → The table filters.
- [ ] **10.9** As staff, open Master Data. → Can **Add** and **Edit**, but no Deactivate/Activate buttons.

---

## 11. Notifications (Page J)

- [ ] **11.1** Click the **bell**. → A dropdown with the 5 newest alerts and "Alerts are checked automatically every day."
- [ ] **11.2** Open **Notifications**. → The open alerts list and the "checked automatically every day" note.
- [ ] **11.3** Filter type **Expired**. → Only expired alerts.
- [ ] **11.4** Click **Mark as read** on one. → The "New" tag disappears; the bell count goes down by 1.
- [ ] **11.5** Click **Resolve**. → It moves out of the Open view; set Show = Resolved → it shows "Resolved by <your name>".
- [ ] **11.6** Click **Mark all as read**. → The bell count becomes 0 (the badge hides).
- [ ] **11.7** Click **Run check now**. → Toast "Alert check complete…".

---

## 12. Reports (Page K)

For each of the 6 report types:

- [ ] **12.1** Choose the type and click **Generate**. → A preview with the CAGRO header, title, date range, table, Totals box and "Prepared by: <your name>".
  - [ ] Current Inventory  - [ ] Stock Movement  - [ ] Distribution by Beneficiary / Barangay
  - [ ] Near-Expiry & Expired  - [ ] Low Stock  - [ ] Equipment Custody
- [ ] **12.2** Set Date from later than Date to. → "\"Date from\" must be on or before \"Date to\"."
- [ ] **12.3** Pick a range with no data (e.g. last year) for Stock Movement. → "No records found for this period."
- [ ] **12.4** Click **Print / Export PDF**. → The print dialog shows **only the report** (no sidebar). Choose "Save as PDF".
- [ ] **12.5** Click **Export Excel (CSV)**. → A `.csv` downloads with header, table and totals.
- [ ] **12.6** Check **Recently generated** at the bottom. → Your reports are listed.

---

## 13. Activity Log (Page L, admin)

- [ ] **13.1** Open **Activity Log**. → Newest entries first, including everything you did above (Login, Create, Approve, Reject, Release, Deactivate, Export, Logout).
- [ ] **13.2** Filter **Module = Requests**. → Only request entries (Create → Approve → Release for your rice request).
- [ ] **13.3** Filter by **User**, **Action** and a **date range**. → The table narrows each time. Click **Clear**.
- [ ] **13.4** Click **▸** on a row. → The full Old value and New value appear side by side.
- [ ] **13.5** Click **Export CSV**. → Downloads; a new "Export" entry is added.

---

## 14. User Management (Page M, admin)

- [ ] **14.1** Open **User Management**. → 4 users with name, username, email, role, status, last login. Your row has a "You" chip and no Deactivate button.
- [ ] **14.2** **Add user** with username `staff`. → "This username is taken." Password `abc` → "Use at least 8 characters." Bad email → "Please enter a valid email address."
- [ ] **14.3** Add a valid Inventory Staff user (password 8+ characters). Log out and log in as them. → Works.
- [ ] **14.4** Deactivate that user, then try to log in as them. → "This account is deactivated…".
- [ ] **14.5** **Reactivate** Angelica D. Mendoza, then log in as `amendoza` / `staff123`. → Works.

---

## 15. Settings (Page N, admin)

- [ ] **15.1** Change **Near-expiry threshold** from 30 to `10` → Save. → Dashboard "Near-expiry batches" drops (batches 12–25 days away are no longer "near"). Set it back to 30.
- [ ] **15.2** Enter `0` or `abc` for the threshold. → Validation error.
- [ ] **15.3** **Session timeout test:** set Session timeout to `2` → Save. Don't touch the mouse or keyboard. → After ~1 minute a "**Are you still there?**" countdown appears. Wait → you are logged out with the message "Session timed out…". Log in again, set the timeout back to 15.
- [ ] **15.4** Change the office address → Save → generate a report. → The new address appears in the report header.
- [ ] **15.5** **Reset demo data** → confirm. → All data is back to the starting values (Dashboard numbers from step 3.1).

---

## 16. My Profile (Page O)

- [ ] **16.1** Click your name in the top bar. → Profile with account details and "My recent activity".
- [ ] **16.2** Change password with a wrong current password. → "Current password is incorrect."
- [ ] **16.3** New and confirm passwords that differ. → "Passwords do not match."
- [ ] **16.4** Valid change (e.g. `staff123` → `staff2026`), log out, log in with the new password. → Works. (Reset demo data restores the original passwords.)

---

## 17. General checks

- [ ] **17.1 Persistence:** make a change (e.g. a stock-in), press **F5**. → The change is still there and you are still logged in.
- [ ] **17.2 No permanent deletes:** look for a "Delete" button anywhere. → There is none; only Deactivate/Reactivate (and Dispose/Restore for equipment).
- [ ] **17.3 Confirmation dialogs:** check deactivate, approve, reject and release. → Each asks for confirmation first.
- [ ] **17.4 Toasts:** successes show green toasts; errors show red toasts.
- [ ] **17.5 Responsive:** narrow the browser window (below ~1100 px wide). → The sidebar hides and a **☰ hamburger** button appears; clicking it slides the menu in.
- [ ] **17.6 Keyboard:** use **Tab** to move through a form, **Enter** on a sortable table header to sort, **Esc** to close a dialog.
- [ ] **17.7 Logout:** click **Logout** → confirm. → Back at the login page; a Logout entry is in the Activity Log.
- [ ] **17.8 Console:** check the F12 Console one last time. → No red errors.

---

### Tester notes

| Step | Problem found | Fixed? |
|------|---------------|--------|
|      |               |        |
