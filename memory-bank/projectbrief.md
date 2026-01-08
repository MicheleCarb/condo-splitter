## Project Brief

Condo Splitter is a mobile-first React webapp that lets non-technical users enter condominium bills and instantly generate a printable, downloadable table showing cost splits per condominium according to configurable rules. The goal is to keep the parent-facing flow single-step (choose bill type → amount → submit → download PNG) while keeping admin configuration safe and persistent.

Key capabilities:
- Admin sets up condomini, millesimal tables, and bill-type distribution rules; can export/import JSON.
- Parents input bills (with tolerant decimal parsing) and immediately get formatted euro totals per condo.
- Printable/PNG-exportable results, matching on-screen formatting.
- Pure client-side by default with an optional backend stub documented.
