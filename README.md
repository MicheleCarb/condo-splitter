# Condo Splitter

**Split bills, easily** - A mobile-first webapp for dividing condominium expenses with configurable millesimal tables, shareable results, and a comprehensive admin area.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)

## Quick Start

```bash
npm install
npm run dev   # http://localhost:5173
npm test      # Jest unit tests for distribution logic
npm run build # Production build
npm run preview # Preview local build
```

## Features

### User Flow (Main App)
- **Quick entry**: Select expense type (and subtype if needed), enter amount (accepts `100.30` or `100,30`), one tap to calculate
- **Instant table**: Formatted table display with split per condominium unit
- **Multiple expenses**: Combine multiple bills (e.g., Electricity + Cleaning) and view combined total
- **Simplified/detailed view**: Toggle to show/hide millesimal table details
- **Easy sharing**: "Share" button with Web Share API (mobile includes print on iOS)
- **PNG export**: Download table image with white background and generation date
- **Visual feedback**: Auto-scroll to table, temporary highlighting, and success toast notification
- **Auto-clear form**: Fields are automatically cleared after successful entry

### Admin Area (⚙️)
- **Condominium management**: Add, edit, and delete condominium units
- **Millesimal tables**: Create and edit tables (e.g., A3, B1, B2, C) with millesimal values per unit
  - **Inline editing**: Click table ID to edit (max 2 alphanumeric characters)
  - **Double confirmation**: Table modifications require double confirmation for safety
- **Distribution rules**: Configure how each bill type is distributed:
  - **Single table** (`single_table`): 100% on one millesimal table
  - **Weighted tables** (`weighted_tables`): Weighted distribution across multiple tables (e.g., 20% A3, 20% C, 60% B1)
    - **Live validation**: Real-time feedback showing sum must equal 100%
    - **Percentage inputs**: User-friendly percentage display (0-100%) with automatic conversion
  - **Custom percentages** (`custom_percent`): Custom percentages per condominium unit
    - **Live validation**: Real-time feedback ensuring percentages sum to 100%
- **Subtypes support**: For bill types requiring subtypes (e.g., Elevator - Ordinary/Extraordinary):
  - **Editable names**: Click to rename subtypes inline
  - **Add/delete**: Add new subtypes or remove existing ones
  - **Individual rules**: Each subtype can have its own distribution rule
  - **Truncation**: Long names truncate gracefully on mobile
- **Personalization**: Set owner name (optional) for personalized greeting in header
- **Export/Import JSON**: Complete configuration backup in JSON format
- **Preview**: Visualize how a distribution rule works with test amounts
- **Local persistence**: Everything is automatically saved to localStorage

### Formatting and Validation
- **Italian currency**: Automatic formatting in euros with `it-IT` locale
- **Tolerant input**: Accepts both `.` and `,` as decimal separator
- **Correct rounding**: Standard rounding (round half up) to 2 decimals
- **Total adjustment**: If rounding causes a slight difference, it's distributed to the largest contributors (for "cash fund")

### UI/UX
- **Mobile-first**: Layout optimized for smartphones with large buttons and high contrast
- **Responsive**: Works perfectly on desktop and mobile
- **Smart scrolling**: Horizontal scroll confined to table container (not the page)
- **Subtle animations**: Smooth transitions for visual feedback without distraction
- **Accessibility**: Focusable controls, high contrast, large touch targets

## Project Structure

### Main Components
- `src/App.tsx` - Main component, manages user flow and shared state
- `src/components/BillForm.tsx` - Form for bill entry with validation
- `src/components/ResultTable.tsx` - Results table with sharing/export options
- `src/components/AdminPanel.tsx` - Complete admin panel for configuration
- `src/components/Toast.tsx` - Non-intrusive toast notifications

### Business Logic
- `src/lib/distribution.ts` - Pure functions for distribution calculation (tested with Jest)
- `src/lib/storage.ts` - localStorage persistence and JSON import/export management
- `src/lib/combineBills.ts` - Logic for combining multiple bills

### Utilities
- `src/utils/number.ts` - Number/currency parsing and formatting (it-IT)
- `src/services/exportImage.ts` - PNG export with html-to-image

### Configuration
- `src/config/sampleConfig.ts` - Example configuration (4 units, tables A3/B1/B2/C)
- `src/types.ts` - TypeScript definitions for all data types
- `src/context/ConfigProvider.tsx` - React context for global configuration management

## Configuration and Persistence

### JSON Format
```json
{
  "condomini": [
    { "id": "c1", "name": "Rossi" },
    { "id": "c2", "name": "Bianchi" }
  ],
  "tables": [
    {
      "id": "A3",
      "name": "Tabella A3",
      "entries": [
        { "condoId": "c1", "value": 210 },
        { "condoId": "c2", "value": 240 }
      ]
    }
  ],
  "billTypes": [
    {
      "id": "luce",
      "name": "Luce",
      "requiresSubtype": false,
      "rule": {
        "kind": "weighted_tables",
        "description": "20% A3, 20% C, 60% B1",
        "tables": [
          { "tableId": "A3", "weight": 0.2 },
          { "tableId": "C", "weight": 0.2 },
          { "tableId": "B1", "weight": 0.6 }
        ]
      }
    },
    {
      "id": "ascensore",
      "name": "Ascensore",
      "requiresSubtype": true,
      "subtypes": [
        {
          "id": "ordinaria",
          "name": "Ordinaria",
          "rule": {
            "kind": "single_table",
            "tableId": "B2"
          }
        }
      ]
    },
    {
      "id": "acqua",
      "name": "Acqua",
      "requiresSubtype": false,
      "rule": {
        "kind": "custom_percent",
        "percents": [
          { "condoId": "c1", "weight": 30 },
          { "condoId": "c2", "weight": 20 }
        ]
      }
    }
  ],
  "ownerName": "Michele"
}
```

### Persistence
- **localStorage**: Configuration automatically saved with key `condo-splitter-config`
- **JSON Export**: Use "Export configuration" in admin for complete backup
- **JSON Import**: Use "Import configuration" in admin to restore configuration
- **No expiration**: Data remains until manual browser cache deletion

### Supported Distribution Rules

1. **Single Table** (`single_table`)
   - Distributes 100% of amount using a single millesimal table
   - Example: Ordinary elevator → Table B2

2. **Weighted Tables** (`weighted_tables`)
   - Distributes amount across multiple tables with configurable weights
   - Weights are automatically normalized if they don't sum to 1
   - Live validation ensures percentages sum to exactly 100%
   - Example: Electricity → 20% A3 + 20% C + 60% B1

3. **Custom Percentages** (`custom_percent`)
   - Percentages directly per condominium unit (not based on tables)
   - Percentages are automatically normalized if they don't sum to 100
   - Live validation ensures percentages sum to exactly 100%
   - Example: Water → 30% Rossi, 20% Bianchi, 25% Verdi, 25% Neri

## Testing

Unit tests cover distribution logic with real examples:
- `src/lib/distribution.test.ts` - Tests for ELECTRICITY (20/20/60) and CLEANING (25/75)
- Pure logic easily testable with Jest + ts-jest

To add new tests:
```typescript
import { calculateSplit } from './lib/distribution'
// Create ad-hoc config and test with calculateSplit
```

## Deployment

### Static Build
```bash
npm run build  # Generates dist/ folder
```

The `dist/` folder contains all static assets ready for deployment to any static hosting service.

### Deployment Options

**Static Hosting Services** (Vercel, Netlify, GitHub Pages, etc.)
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- No additional configuration required

For GitHub Pages with a custom base path:
```bash
BASE_PATH=/repo-name/ npm run build  # Replace 'repo-name' with your repo
# Publish the dist/ folder via GitHub Pages
```

**Self-hosting**
- Serve the `dist/` folder with any static web server (nginx, Apache, etc.)

### Optional Backend
Not required for basic functionality. If you want cloud synchronization:
- Expose REST endpoints to save/load JSON configuration
- Integrate with `src/lib/storage.ts` to replace localStorage

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first, mobile-first styling
- **html-to-image** - High-quality PNG export
- **Jest + ts-jest** - Unit testing
- **Intl API** - Italian locale formatting

## Technical Notes

- **Mobile-first**: Everything designed for smartphones, then scaled to desktop
- **PWA-ready**: Can be installed as an app on mobile (optional manifest)
- **Offline-first**: Works completely offline after first load
- **Pure functions**: Testable and deterministic calculation logic
- **Type-safe**: End-to-end TypeScript to prevent errors

## Icon

Custom minimal icon (wallet/coin/arrow) in `public/icon.svg` - appears as browser favicon and mobile icon when installed as PWA.

## Contributing

This is a personal project for private use. Contributions, suggestions, and feedback are welcome, but please note this is not actively maintained as an open-source project.

## License

Personal project for private use.

---

## Italian Version

# Condo Splitter

**Ripartizione bollette, facile** - Webapp mobile-first per dividere le bollette condominiali con tabelle millesimali configurabili, risultati condivisibili e area admin completa.

## Quick Start

```bash
npm install
npm run dev   # http://localhost:5173
npm test      # Test unitari Jest sulla logica di riparto
npm run build # Build per produzione
npm run preview # Anteprima build locale
```

## Caratteristiche Principali

### Flusso Utente (App Principale)
- **Inserimento rapido**: Scegli tipo di spesa (e sottotipo se necessario), inserisci importo (accetta `100,30` o `100.30`), un tap per calcolare
- **Tabella immediata**: Visualizzazione tabella formattata con riparto per condomino
- **Spese multiple**: Combina più bollette (es. Luce + Pulizie) e visualizza totale combinato
- **Vista semplificata/dettagliata**: Toggle per mostrare/nascondere i dettagli delle tabelle millesimali
- **Condivisione facile**: Pulsante "Condividi" con Web Share API (mobile include stampa su iOS)
- **Export PNG**: Download immagine della tabella con sfondo bianco e data di generazione
- **Feedback visivo**: Auto-scroll alla tabella, evidenziazione temporanea e notifica toast al successo
- **Form auto-pulizia**: I campi vengono svuotati automaticamente dopo l'inserimento riuscito

### Area Admin (⚙️)
- **Gestione condomini**: Aggiungi, modifica ed elimina condomini
- **Tabelle millesimali**: Crea e modifica tabelle (es. A3, B1, B2, C) con valori millesimali per condomino
  - **Modifica inline**: Clicca sul codice tabella per modificarlo (max 2 caratteri alfanumerici)
  - **Doppia conferma**: Modifiche alle tabelle richiedono doppia conferma per sicurezza
- **Regole di riparto**: Configura come ogni tipo di bolletta viene ripartita:
  - **Tabella singola** (`single_table`): 100% su una tabella millesimale
  - **Tabelle pesate** (`weighted_tables`): Pesatura su più tabelle (es. 20% A3, 20% C, 60% B1)
    - **Validazione live**: Feedback in tempo reale che mostra che la somma deve essere 100%
    - **Input percentuali**: Visualizzazione user-friendly in percentuale (0-100%) con conversione automatica
  - **Percentuali personalizzate** (`custom_percent`): Percentuali personalizzate per condomino
    - **Validazione live**: Feedback in tempo reale che assicura che le percentuali sommino a 100%
- **Supporto sottotipi**: Per tipi di bolletta che richiedono sottotipi (es. Ascensore - Ordinaria/Straordinaria):
  - **Nomi modificabili**: Clicca per rinominare i sottotipi inline
  - **Aggiungi/elimina**: Aggiungi nuovi sottotipi o rimuovi quelli esistenti
  - **Regole individuali**: Ogni sottotipo può avere la propria regola di riparto
  - **Troncamento**: I nomi lunghi si troncano elegantemente su mobile
- **Personalizzazione**: Imposta nome proprietario (opzionale) per un saluto personalizzato nell'header
- **Export/Import JSON**: Backup completo della configurazione in formato JSON
- **Anteprima**: Visualizza come una regola di riparto funziona con importi di test
- **Persistenza locale**: Tutto viene salvato automaticamente in localStorage

### Formattazione e Validazione
- **Moneta italiana**: Formattazione automatica in euro con locale `it-IT`
- **Input tollerante**: Accetta sia `.` che `,` come separatore decimale
- **Arrotondamento corretto**: Arrotondamento standard (round half up) a 2 decimali
- **Adeguamento totale**: Se l'arrotondamento causa una leggera differenza, viene distribuita ai maggiori contributori (per "fondo cassa")

### UI/UX
- **Mobile-first**: Layout ottimizzato per smartphone con bottoni grandi e alto contrasto
- **Responsive**: Funziona perfettamente su desktop e mobile
- **Scroll intelligente**: Scroll orizzontale confinato al contenitore tabella (non alla pagina)
- **Animazioni sottili**: Transizioni morbide per feedback visivo senza distrarre
- **Accessibilità**: Controlli focalizzabili, alto contrasto, target di tocco grandi

## Struttura del Progetto

### Componenti Principali
- `src/App.tsx` - Componente principale, gestisce flusso utente e stato condiviso
- `src/components/BillForm.tsx` - Form per inserimento bollette con validazione
- `src/components/ResultTable.tsx` - Tabella risultati con opzioni di condivisione/export
- `src/components/AdminPanel.tsx` - Pannello admin completo per configurazione
- `src/components/Toast.tsx` - Notifiche toast non intrusive

### Logica di Business
- `src/lib/distribution.ts` - Funzioni pure per calcolo riparto (testate con Jest)
- `src/lib/storage.ts` - Gestione persistenza localStorage e import/export JSON
- `src/lib/combineBills.ts` - Logica per combinare multiple bollette

### Utilità
- `src/utils/number.ts` - Parsing e formattazione numeri/moneta (it-IT)
- `src/services/exportImage.ts` - Export PNG con html-to-image

### Configurazione
- `src/config/sampleConfig.ts` - Configurazione di esempio (4 condomini, tabelle A3/B1/B2/C)
- `src/types.ts` - Definizioni TypeScript per tutti i tipi di dato
- `src/context/ConfigProvider.tsx` - Context React per gestione configurazione globale

## Configurazione e Persistenza

### Formato JSON
```json
{
  "condomini": [
    { "id": "c1", "name": "Rossi" },
    { "id": "c2", "name": "Bianchi" }
  ],
  "tables": [
    {
      "id": "A3",
      "name": "Tabella A3",
      "entries": [
        { "condoId": "c1", "value": 210 },
        { "condoId": "c2", "value": 240 }
      ]
    }
  ],
  "billTypes": [
    {
      "id": "luce",
      "name": "Luce",
      "requiresSubtype": false,
      "rule": {
        "kind": "weighted_tables",
        "description": "20% A3, 20% C, 60% B1",
        "tables": [
          { "tableId": "A3", "weight": 0.2 },
          { "tableId": "C", "weight": 0.2 },
          { "tableId": "B1", "weight": 0.6 }
        ]
      }
    },
    {
      "id": "ascensore",
      "name": "Ascensore",
      "requiresSubtype": true,
      "subtypes": [
        {
          "id": "ordinaria",
          "name": "Ordinaria",
          "rule": {
            "kind": "single_table",
            "tableId": "B2"
          }
        }
      ]
    },
    {
      "id": "acqua",
      "name": "Acqua",
      "requiresSubtype": false,
      "rule": {
        "kind": "custom_percent",
        "percents": [
          { "condoId": "c1", "weight": 30 },
          { "condoId": "c2", "weight": 20 }
        ]
      }
    }
  ],
  "ownerName": "Michele"
}
```

### Persistenza
- **localStorage**: Configurazione salvata automaticamente con chiave `condo-splitter-config`
- **Export JSON**: Usa "Esporta configurazione" nell'admin per backup completo
- **Import JSON**: Usa "Importa configurazione" nell'admin per ripristinare configurazione
- **Nessuna scadenza**: I dati rimangono fino alla cancellazione manuale del cache del browser

### Regole di Riparto Supportate

1. **Tabella Singola** (`single_table`)
   - Riparte 100% dell'importo usando una singola tabella millesimale
   - Esempio: Ascensore ordinaria → Tabella B2

2. **Tabelle Pesate** (`weighted_tables`)
   - Riparte l'importo su più tabelle con pesi configurabili
   - I pesi vengono normalizzati automaticamente se non sommano a 1
   - Validazione live assicura che le percentuali sommino esattamente a 100%
   - Esempio: Luce → 20% A3 + 20% C + 60% B1

3. **Percentuali Personalizzate** (`custom_percent`)
   - Percentuali direttamente per condomino (non basate su tabelle)
   - Le percentuali vengono normalizzate automaticamente se non sommano a 100
   - Validazione live assicura che le percentuali sommino esattamente a 100%
   - Esempio: Acqua → 30% Rossi, 20% Bianchi, 25% Verdi, 25% Neri

## Test

I test unitari coprono la logica di riparto con esempi reali:
- `src/lib/distribution.test.ts` - Test per LUCE (20/20/60) e PULIZIE (25/75)
- Logica pura facilmente testabile con Jest + ts-jest

Per aggiungere nuovi test:
```typescript
import { calculateSplit } from './lib/distribution'
// Crea config ad hoc e testa con calculateSplit
```

## Deployment

### Build Statico
```bash
npm run build  # Genera cartella dist/
```

La cartella `dist/` contiene tutti gli asset statici pronti per il deployment su qualsiasi servizio di hosting statico.

### Opzioni di Deployment

**Servizi di Hosting Statico** (Vercel, Netlify, GitHub Pages, ecc.)
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Nessuna configurazione aggiuntiva richiesta

Per GitHub Pages con base path personalizzato:
```bash
BASE_PATH=/nome-repo/ npm run build  # Sostituisci 'nome-repo' con il tuo repo
# Pubblica la cartella dist/ tramite GitHub Pages
```

**Self-hosting**
- Servi la cartella `dist/` con qualsiasi web server statico (nginx, Apache, ecc.)

### Backend Opzionale
Non necessario per il funzionamento base. Se desideri sincronizzazione cloud:
- Esponi endpoint REST per salvare/caricare JSON configurazione
- Integra con `src/lib/storage.ts` per sostituire localStorage

## Tecnologie

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool e dev server veloce
- **Tailwind CSS** - Styling utility-first, mobile-first
- **html-to-image** - Export PNG ad alta qualità
- **Jest + ts-jest** - Testing unitario
- **Intl API** - Formattazione locale italiana

## Note Tecniche

- **Mobile-first**: Tutto progettato per smartphone, poi scalato a desktop
- **PWA-ready**: Può essere installato come app su mobile (manifest opzionale)
- **Offline-first**: Funziona completamente offline dopo il primo caricamento
- **Pure functions**: Logica di calcolo testabile e deterministica
- **Type-safe**: TypeScript end-to-end per prevenire errori

## Icona

Icona personalizzata minimal (portafoglio/coin/freccia) in `public/icon.svg` - appare come favicon del browser e icona mobile quando installato come PWA.

## Contributi

Questo è un progetto personale per uso privato. Contributi, suggerimenti e feedback sono benvenuti, ma si prega di notare che questo non è mantenuto attivamente come progetto open-source.

## Licenza

Progetto personale per uso privato.
