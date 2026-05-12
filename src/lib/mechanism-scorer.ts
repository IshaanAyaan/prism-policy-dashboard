export type MechanismKey = "price" | "access" | "enforcement";

export type MechanismScore = {
  key: MechanismKey;
  label: string;
  score: number;
  evidence: string[];
};

export type LawScoreResult = {
  scores: Record<MechanismKey, number>;
  dominant: MechanismKey;
  evidence: Record<MechanismKey, string[]>;
  summary: string;
};

const LEXICON: Record<MechanismKey, Array<{ pattern: RegExp; label: string; weight: number }>> = {
  price: [
    { pattern: /\b(excise|beer|wine|spirits?)\s+tax(?:es)?\b/i, label: "alcohol tax", weight: 1.8 },
    { pattern: /\btax(?:es|ed|ing)?\b/i, label: "tax", weight: 1.2 },
    { pattern: /\b(price|pricing|minimum price|price floor)\b/i, label: "price floor", weight: 1.4 },
    { pattern: /\b(gallon|barrel|wholesale|surcharge|fee)\b/i, label: "unit fee", weight: 0.9 },
    { pattern: /\bdiscount|happy hour|coupon|promotion\b/i, label: "price promotion", weight: 1.0 },
  ],
  access: [
    { pattern: /\bsunday sales?\b/i, label: "Sunday sales", weight: 1.7 },
    { pattern: /\b(hours?|closing time|last call|late[-\s]?night)\b/i, label: "sales hours", weight: 1.3 },
    { pattern: /\b(outlet density|retail outlet|license quota|store density)\b/i, label: "outlet density", weight: 1.6 },
    { pattern: /\b(grocery|convenience|liquor store|off[-\s]?premise|on[-\s]?premise)\b/i, label: "retail access", weight: 1.1 },
    { pattern: /\b(delivery|takeout|to[-\s]?go|online order|direct shipment)\b/i, label: "remote access", weight: 1.2 },
  ],
  enforcement: [
    { pattern: /\b(underage|minor|fake id|identification|carding)\b/i, label: "underage purchase", weight: 1.8 },
    { pattern: /\b(penalty|fine|violation|civil sanction|criminal sanction)\b/i, label: "penalty", weight: 1.4 },
    { pattern: /\b(compliance check|sting|inspection|audit)\b/i, label: "compliance check", weight: 1.5 },
    { pattern: /\b(suspend|suspension|revoke|revocation|license action)\b/i, label: "license consequence", weight: 1.5 },
    { pattern: /\b(dui|dwi|bac|ignition interlock|sobriety checkpoint)\b/i, label: "driving enforcement", weight: 1.3 },
  ],
};

const FALLBACK: Record<MechanismKey, string> = {
  price: "pricing language",
  access: "availability language",
  enforcement: "compliance language",
};

function normalize(raw: number) {
  if (raw <= 0) {
    return 0;
  }

  return Number((1 - Math.exp(-raw / 3.5)).toFixed(3));
}

export function scoreLawText(text: string): LawScoreResult {
  const cleaned = text.trim();
  const raw: Record<MechanismKey, number> = {
    price: 0,
    access: 0,
    enforcement: 0,
  };
  const evidence: Record<MechanismKey, string[]> = {
    price: [],
    access: [],
    enforcement: [],
  };

  for (const key of Object.keys(LEXICON) as MechanismKey[]) {
    for (const term of LEXICON[key]) {
      if (term.pattern.test(cleaned)) {
        raw[key] += term.weight;
        if (!evidence[key].includes(term.label)) {
          evidence[key].push(term.label);
        }
      }
    }
  }

  const scores = {
    price: normalize(raw.price),
    access: normalize(raw.access),
    enforcement: normalize(raw.enforcement),
  };

  const ranked = (Object.keys(scores) as MechanismKey[]).sort(
    (a, b) => scores[b] - scores[a],
  );
  const dominant = ranked[0];
  const topEvidence = evidence[dominant][0] ?? FALLBACK[dominant];
  const article = dominant === "access" || dominant === "enforcement" ? "an" : "a";
  const summary =
    cleaned.length === 0
      ? "Type a law draft to classify it into price, access, and enforcement mechanisms."
      : `This draft reads most like ${article} ${dominant} change because it mentions ${topEvidence}.`;

  return {
    scores,
    dominant,
    evidence,
    summary,
  };
}
