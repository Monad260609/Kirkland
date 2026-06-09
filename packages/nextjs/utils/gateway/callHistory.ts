export interface CallEntry {
  id: string;
  query: string;
  intent: string;
  data: Record<string, unknown>;
  cached: boolean;
  cost: string;
  txHash?: string;
  explorerUrl?: string;
  source: string;
  agentId?: string;
  agentVerified?: boolean;
  timestamp: number;
}

const STORAGE_KEY = "x402_call_history";
const MAX_ENTRIES = 50;

export function getCallHistory(): CallEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCallEntry(entry: CallEntry): void {
  if (typeof window === "undefined") return;
  const history = getCallHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event("x402_history_update"));
}
