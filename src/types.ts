export type Condo = {
  id: string;
  name: string;
  note?: string;
};

export type MillesimalEntry = {
  condoId: string;
  value: number;
};

export type MillesimalTable = {
  id: string;
  name: string;
  entries: MillesimalEntry[];
};

export type WeightedTable = {
  tableId: string;
  weight: number;
};

export type CustomPercent = {
  condoId: string;
  weight: number;
};

export type DistributionRule =
  | {
      kind: 'single_table';
      tableId: string;
      description?: string;
    }
  | {
      kind: 'weighted_tables';
      tables: WeightedTable[];
      description?: string;
    }
  | {
      kind: 'custom_percent';
      percents: CustomPercent[];
      description?: string;
    };

export type BillSubtype = {
  id: string;
  name: string;
  rule: DistributionRule;
};

export type BillType = {
  id: string;
  name: string;
  requiresSubtype?: boolean;
  subtypes?: BillSubtype[];
  rule?: DistributionRule;
  note?: string;
};

export type AppConfig = {
  condomini: Condo[];
  tables: MillesimalTable[];
  billTypes: BillType[];
  ownerName?: string;
};

export type BillInput = {
  billTypeId: string;
  subtypeId?: string;
  amount: number;
  memo?: string;
};

export type ResultColumn = {
  id: string;
  label: string;
};

export type ResultRow = {
  condoId: string;
  condoName: string;
  allocations: Record<string, number>;
  total: number;
};

export type SplitResult = {
  columns: ResultColumn[];
  rows: ResultRow[];
  total: number;
  ruleLabel: string;
  billLabel: string;
  amount: number;
};

export type SavedBill = {
  id: string;
  billTypeId: string;
  billLabel: string;
  subtypeId?: string;
  amount: number;
  memo?: string;
  timestamp: number;
};

export type CombinedResult = {
  bills: SavedBill[];
  columns: ResultColumn[];
  rows: ResultRow[];
  total: number;
};
