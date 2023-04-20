interface Replacement {
  value: string;
}

export interface Match {
  message: string;
  replacements: Replacement[];
  offset: number;
  length: number;
}

export interface GramrFixrResponse {
  matches: Match[];
}

export interface TextNodesWithPosition {
  text: string;
  from: number;
  to: number;
}

export interface GramrFixrOptions {
  apiUrl: string;
  automaticMode: boolean;
  documentId: string | number | undefined;
}

export interface Range {
  from: number;
  to: number;
}

export interface GramrFixrStorage {
  match?: Match | undefined | null;
  loading?: boolean;
  matchRange?: Range | undefined | null;
  active: boolean;
}
