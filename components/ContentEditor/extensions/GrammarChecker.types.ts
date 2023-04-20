interface Replacement {
  value: string;
}

interface Rule {
  id: string;
  description: string;
  issueType: string;
}

export interface Match {
  message: string;
  replacements: Replacement[];
  offset: number;
  length: number;
  rule: Rule;
}

export interface LanguageToolResponse {
  matches: Match[];
}

export interface TextNodesWithPosition {
  text: string;
  from: number;
  to: number;
}

export interface LanguageToolOptions {
  language: string;
  apiUrl: string;
  automaticMode: boolean;
  documentId: string | number | undefined;
}

export interface Range {
  from: number;
  to: number;
}

export interface LanguageToolStorage {
  match?: Match | undefined | null;
  loading?: boolean;
  matchRange?: Range | undefined | null;
  active: boolean;
}
