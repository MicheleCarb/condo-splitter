# Condo Splitter (React + Vite)

Mobile-first webapp to split condominium bills with configurable millesimal rules, printable/exportable tables, and a safe admin area.

## Quick start

```bash
npm install
npm run dev   # http://localhost:5173
npm test      # Jest unit tests on distribution logic
npm run build # production build
```

## Features
- Parent flow: scegli tipo (e sottotipo), inserisci importo (100,30 o 100.30), un tap per vedere la tabella e scaricare PNG/Stampare.
- Admin flow (⚙️): gestisci condomini, tabelle millesimali, pesi/regole per ogni tipo di bolletta; doppia conferma per modificare i valori millesimali; salva su localStorage; export/import JSON.
- Formattazione euro locale (`it-IT`) e parsing permissivo con `.` o `,`.
- PNG export con html-to-image, fedele all’aspetto della tabella.
- Unit test (Jest + ts-jest) per la logica di riparto (esempi LUCE e PULIZIE).

## Scripts
- `npm run dev` – avvio locale con HMR
- `npm test` – unit test Jest
- `npm run build` – build ottimizzata
- `npm run preview` – serve la build

## Configurazione & persistenza
- Default: `sample-config.json` e `src/config/sampleConfig.ts`.
- Persistenza: localStorage chiave `condo-splitter-config`.
- Export/Import: in Admin usa i pulsanti “Esporta JSON” / “Importa JSON”.
- Reset: bottone “Ripristina esempio” nel pannello risultati.

### Formato JSON (estratto)
```json
{
  "condomini": [{ "id": "c1", "name": "Rossi" }],
  "tables": [{
    "id": "A3",
    "name": "Tabella A3",
    "entries": [{ "condoId": "c1", "value": 210 }]
  }],
  "billTypes": [{
    "id": "luce",
    "name": "Luce",
    "requiresSubtype": false,
    "rule": {
      "kind": "weighted_tables",
      "tables": [{ "tableId": "A3", "weight": 0.2 }]
    }
  }]
}
```
- Regole supportate:
  - `single_table`: 100% su una tabella.
  - `weighted_tables`: pesi su più tabelle (normalizzati).
  - `custom_percent`: pesi per condominio (normalizzati).

## Deployment (statico)
- Build: `npm run build` genera `dist/`.
- GitHub Pages: crea repo, `npm install`, `npm run build`, pubblica `dist` (Pages “deploy from folder”).
- Vercel/Netlify: nuova app, framework Vite, comando build `npm run build`, output `dist`.
- Backend opzionale: non necessario. Se vuoi aggiungerlo, puoi esporre un endpoint per salvare/caricare il JSON di configurazione e agganciarlo al layer `lib/storage`.

## Test
- `src/lib/distribution.test.ts` copre gli esempi richiesti (LUCE 20/20/60, PULIZIE 25/75).
- Aggiungi altri casi creando config ad hoc e chiamando `calculateSplit`.

## UX note
- Mobile-first: layout a colonna, bottoni grandi, alto contrasto.
- Input importo tollera `.` e `,`; output sempre in euro con due decimali.
- Admin protetto da doppia conferma per i millesimi e da export/import per backup.

## File principali
- `src/App.tsx` – flusso principale genitori + overlay Admin.
- `src/components/BillForm.tsx` – form rapido per bollette.
- `src/components/ResultTable.tsx` – tabella stampabile + PNG.
- `src/components/AdminPanel.tsx` – gestione condomini, tabelle, regole, export/import, anteprima.
- `src/lib/distribution.ts` – funzioni pure di riparto (testate).
- `src/utils/number.ts` – parsing/formatting numerico (it-IT).
- `sample-config.json` – esempio pronto con 4 condomini e tabelle A3, B1, B2, C.
