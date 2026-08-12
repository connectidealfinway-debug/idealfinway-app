# IdealFinway Performance Dashboard — source of truth

This repo is kept in sync with the **live production app** after every change. Anyone building the Firebase version should pull from here — it always reflects exactly what's live, no drift.

- **Live app:** https://connect.idealfinway.com/
- **Frontend:** `index.html` — single-file app (HTML+CSS+JS, no build step). This is the entire UI: every page, every business rule, every form.
- **Backend:** `Code.gs` — Google Apps Script. This is the entire API/data layer: every Google Sheet's column schema (see the `HEADERS` object near the top), every read/write action (see the `doGet`/`doPost` dispatch chains), all business logic (commission calcs, reminders, backups, etc).
- **Data store (current):** Google Sheet, ID `1DQeZ5Oj4on0HU2s7QFk8UsaiabjRhe5VSDUWYI9axS4`. Each key in `HEADERS` = one sheet/tab = one entity. For the Firebase rebuild, each of these should become a Firestore collection with the exact same field names (the field names are used as-is throughout the frontend, so renaming them means updating both sides).
- **Live API endpoint (Apps Script Web App):** `https://script.google.com/macros/s/AKfycbwzCV6-slD3xxZGDrGCa80GAOfEX-JTpcjqAinWXHBuHTvb4sFTFkSSAK6RY6-UHFI/exec`

## How to read this codebase

1. Start with `Code.gs` → the `HEADERS` object. This is the authoritative schema for every sheet/entity in the app (Employee, Accounts, Watchlist, IPO_Applications, SelfIPO, TeamTasks, etc.) — the exact field list per entity.
2. Then look at the `doGet`/`doPost` `if (action === '...')` chains in `Code.gs` — this is every operation the frontend can perform (add/edit/delete per entity, plus custom ones like `addTeamTask`, `addSelfIPO`, `editRow`, `deleteRow` which are generic and reused across many entities by passing the sheet name).
3. Then cross-reference `index.html` — search for `postData({action:'...'` to find where each backend action is called from, and what UI triggers it.
4. The top-of-file comment block in `Code.gs` (`// v9: ...`, `// v8: ...` etc.) is a running changelog maintained across sessions — useful for understanding *why* fields exist, not just what they are.

## Non-obvious rules worth knowing before rebuilding in Firebase

- **IPO page** (`page-ipo`) has two tabs, not two pages: **Self Application** (personal IPO tracker, every employee sees only their own entries except admin who sees all) and **Application Buy** (the business/office IPO module, gated by `canIPOAccess()` — admin or employees with `IPO_Access==='Yes'`; non-access users see an inline "ask admin" message instead of the page being hidden).
- **My Team → Team Tasks**: a team leader (anyone who has employees reporting to them via the `Parent ID` field) can assign tasks to their team members. Assignee gets a persistent banner notification (not just buried in the reminders modal) until they mark it Done with remarks.
- **Reminders** (`computeReminders()` in `index.html`) has several time-boxed alert categories: Holding Price Alert (expires after 1 day), new Watchlist stock admin alert (visible until 12pm the next day, then auto-expires, has a "Checked" dismiss), Starred Watchlist (2-day expiry), RK Comments (has its own "Checked" dismiss, tracked separately per row).
- **Optimistic UI pattern**: almost every write does `patchRowLocal()` (updates the in-memory `allData` + re-renders instantly) *before* the network call resolves, then reconciles with a background `loadAll()` a moment later. Any Firebase rebuild should replicate this for perceived speed — real-time listeners would achieve the same effect more naturally.
- **`_rowNum`**: every record has a synthetic `_rowNum` (its row number in the Google Sheet) used as its unique ID throughout the frontend for edit/delete calls. In Firestore this maps naturally to the document ID — just make sure the frontend's `_rowNum` references become Firestore doc IDs consistently.

Ping in this GitHub repo's issues, or ask directly, if anything above is unclear before building — better to check than to end up with two apps that drift apart.
