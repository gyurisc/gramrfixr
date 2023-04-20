interface Replacement {
  value: string;
}

export interface Match {
  message: string;
  replacements: Replacement[];
  offset: number;
  length: number;
}

export interface TextNodesWithPosition {
  text: string;
  from: number;
  to: number;
}

export interface GrammarCheckerOptions {
  documentId: string | number | undefined;
}

export interface Range {
  from: number;
  to: number;
}

export interface GrammarCheckerStorage {
  match?: Match | undefined | null;
  loading?: boolean;
  matchRange?: Range | undefined | null;
  active: boolean;
}
