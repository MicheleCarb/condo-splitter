## Progress

- React + Vite + Tailwind app scaffolded; localStorage-backed config with JSON import/export and reset to sample data.
- Parent-facing flow working: bill type/subtype selection, tolerant amount parsing, immediate table with euro formatting, PNG download + print.
- Admin overlay built with double-confirm on millesimal changes, rule editors (single, weighted, custom percent), preview mode, condo/table management.
- Distribution logic implemented as pure functions; Jest tests cover LUCE 20/20/60 and PULIZIE 25/75; `npm run build` passes.
- README updated with run/test/build/deploy instructions; sample-config.json provided.
