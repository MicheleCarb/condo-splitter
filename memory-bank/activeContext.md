## Active Context

- App scaffolded with React + Vite + Tailwind; client-side config store with localStorage, import/export JSON, and reset to sample config.
- Parent flow implemented: choose bill type/subtype, enter amount (., or ,), compute split via pure functions, view printable table, download PNG, optional print.
- Admin overlay: manage condomini, millesimal tables (double confirmation), bill-type rules (single table, weighted tables, custom percent), preview mode, export/import JSON.
- Sample data for 4 condomini and tables A3/B1/B2/C; distribution logic tested with Jest (LUCE 20/20/60, PULIZIE 25/75). README documents run/test/build/deploy.
