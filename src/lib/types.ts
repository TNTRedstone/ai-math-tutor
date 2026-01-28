export type ReasoningEffort =
  | "none"
  | "default"
  | "low"
  | "medium"
  | "high"
  | null
  | undefined;

export interface Message {
  sender: "model" | "user";
  contents: string;
}

export interface CheckDiagnostics {
  succeeds: boolean;
  notes?: string;
}