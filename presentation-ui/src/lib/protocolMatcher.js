import { EDGE_CASE_PROTOCOLS } from "../data/edgeCaseProtocols.js";

export function matchProtocol(message) {
  const normalized = String(message || "").toLowerCase();
  if (!normalized.trim()) return null;

  return EDGE_CASE_PROTOCOLS.find((protocol) =>
    protocol.triggerKeywords.some((keyword) =>
      normalized.includes(String(keyword).toLowerCase())
    )
  ) ?? null;
}
