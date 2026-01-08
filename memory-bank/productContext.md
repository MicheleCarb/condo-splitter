## Product Context

- Users: Older parents need a one-tap, mobile-friendly flow to split condo bills; admin (you) configures data safely.
- Flows:
  - Admin: manage condomini list, millesimal tables, and bill-type distribution rules; export/import JSON; optional preview of rule splits.
  - Parents: select bill type (with subtype when needed), enter amount (accept `.` or `,`), submit, view formatted table, download PNG (and optional print).
- Output: table with condo names, per-table contributions, totals, header describing bill type/rule, euro formatting (it-IT locale) with two decimals; matches export PNG.
- Persistence: localStorage by default; simple JSON export/import; optional backend stub documented.
- Accessibility: large tap targets, high contrast, focusable controls, mobile-first single-column layout.
