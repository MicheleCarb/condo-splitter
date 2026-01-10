# Condo Splitter

**Ripartizione bollette, facile** - Mobile-first webapp per dividere le bollette condominiali con regole millesimali configurabili, tabelle condivisibili e area admin sicura.

## Quick Start

```bash
npm install
npm run dev   # http://localhost:5173
npm test      # Jest unit tests sulla logica di riparto
npm run build # Build per produzione
npm run preview # Anteprima build locale
```

## Caratteristiche Principali

### Flusso Utente (Genitori)
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
  - **Doppia conferma**: Modifiche alle tabelle richiedono doppia conferma per sicurezza
- **Regole di riparto**: Configura come ogni tipo di bolletta viene ripartita:
  - **Tabella singola** (`single_table`): 100% su una tabella millesimale
  - **Tabelle pesate** (`weighted_tables`): Pesatura su più tabelle (es. 20% A3, 20% C, 60% B1)
  - **Percentuali personalizzate** (`custom_percent`): Percentuali personalizzate per condomino
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
- **Export JSON**: Usa "Esporta JSON" nell'admin per backup completo
- **Import JSON**: Usa "Importa JSON" nell'admin per ripristinare configurazione
- **Nessuna scadenza**: I dati rimangono fino alla cancellazione manuale del cache del browser

### Regole di Riparto Supportate

1. **Tabella Singola** (`single_table`)
   - Riparte 100% dell'importo usando una singola tabella millesimale
   - Esempio: Ascensore ordinaria → Tabella B2

2. **Tabelle Pesate** (`weighted_tables`)
   - Riparte l'importo su più tabelle con pesi configurabili
   - I pesi vengono normalizzati automaticamente se non sommano a 1
   - Esempio: Luce → 20% A3 + 20% C + 60% B1

3. **Percentuali Personalizzate** (`custom_percent`)
   - Percentuali direttamente per condomino (non basate su tabelle)
   - Le percentuali vengono normalizzate automaticamente se non sommano a 100
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

### Piattaforme Consigliate

**Vercel / Netlify** (Consigliato)
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Zero configurazione aggiuntiva

**GitHub Pages**
```bash
npm install
npm run build
# Pubblica la cartella dist/ con GitHub Pages
```

**Self-hosting**
- Serve la cartella `dist/` con qualsiasi web server statico (nginx, Apache, etc.)

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

## Licenza

Progetto personale per uso privato.
