import { AppConfig } from '../types'

export const sampleConfig: AppConfig = {
  condomini: [
    { id: 'c1', name: 'Rossi' },
    { id: 'c2', name: 'Bianchi' },
    { id: 'c3', name: 'Verdi' },
    { id: 'c4', name: 'Neri' },
  ],
  tables: [
    {
      id: 'A3',
      name: 'Tabella A3',
      entries: [
        { condoId: 'c1', value: 210 },
        { condoId: 'c2', value: 240 },
        { condoId: 'c3', value: 180 },
        { condoId: 'c4', value: 370 },
      ],
    },
    {
      id: 'B1',
      name: 'Tabella B1',
      entries: [
        { condoId: 'c1', value: 150 },
        { condoId: 'c2', value: 260 },
        { condoId: 'c3', value: 210 },
        { condoId: 'c4', value: 380 },
      ],
    },
    {
      id: 'B2',
      name: 'Tabella B2',
      entries: [
        { condoId: 'c1', value: 120 },
        { condoId: 'c2', value: 280 },
        { condoId: 'c3', value: 220 },
        { condoId: 'c4', value: 380 },
      ],
    },
    {
      id: 'C',
      name: 'Tabella C',
      entries: [
        { condoId: 'c1', value: 180 },
        { condoId: 'c2', value: 260 },
        { condoId: 'c3', value: 220 },
        { condoId: 'c4', value: 340 },
      ],
    },
  ],
  billTypes: [
    {
      id: 'luce',
      name: 'Luce',
      requiresSubtype: false,
      rule: {
        kind: 'weighted_tables',
        description: '20% A3, 20% C, 60% B1 (modificabile in Admin)',
        tables: [
          { tableId: 'A3', weight: 0.2 },
          { tableId: 'C', weight: 0.2 },
          { tableId: 'B1', weight: 0.6 },
        ],
      },
    },
    {
      id: 'ascensore',
      name: 'Ascensore',
      requiresSubtype: true,
      subtypes: [
        {
          id: 'ordinaria',
          name: 'Ordinaria',
          rule: {
            kind: 'single_table',
            tableId: 'B2',
            description: 'Ascensore ordinaria → B2',
          },
        },
        {
          id: 'straordinaria',
          name: 'Straordinaria',
          rule: {
            kind: 'single_table',
            tableId: 'A3',
            description: 'Ascensore straordinaria → A3',
          },
        },
      ],
    },
    {
      id: 'pulizie',
      name: 'Pulizie',
      requiresSubtype: false,
      rule: {
        kind: 'weighted_tables',
        description: '25% A3, 75% B1 (modificabile)',
        tables: [
          { tableId: 'A3', weight: 0.25 },
          { tableId: 'B1', weight: 0.75 },
        ],
      },
    },
    {
      id: 'acqua',
      name: 'Acqua',
      requiresSubtype: false,
      rule: {
        kind: 'custom_percent',
        description: 'Percentuale personalizzata per condominio',
        percents: [
          { condoId: 'c1', weight: 30 },
          { condoId: 'c2', weight: 20 },
          { condoId: 'c3', weight: 25 },
          { condoId: 'c4', weight: 25 },
        ],
      },
    },
  ],
}
