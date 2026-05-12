import type { MechanismScores } from "@/lib/prism-data";

export type MechanismKey = "price" | "access" | "enforcement";

export type RankedMechanismScore = {
  description: string;
  key: MechanismKey;
  label: string;
  score: number;
};

export type LawScoreResult = {
  dominant: MechanismKey;
  model: string;
  ranked: RankedMechanismScore[];
  scores: MechanismScores;
  summary: string;
};

type ZeroShotOutput = {
  labels: string[];
  scores: number[];
};

type ZeroShotClassifier = (
  text: string,
  labels: string[],
  options: {
    hypothesis_template: string;
    multi_label: true;
  },
) => Promise<ZeroShotOutput>;

const MODEL_ID = "Xenova/mobilebert-uncased-mnli";
const HYPOTHESIS_TEMPLATE = "This law is about {}.";

const CANDIDATES: Array<{
  candidate: string;
  description: string;
  key: MechanismKey;
  label: string;
}> = [
  {
    key: "price",
    label: "Price",
    candidate:
      "alcohol taxes, excise taxes, per-gallon price, minimum price, or price floors",
    description: "taxes, excise rates, minimum pricing, fees, or discounts",
  },
  {
    key: "access",
    label: "Access",
    candidate:
      "Sunday sales, store hours, grocery store sales, outlet density, or delivery access",
    description:
      "Sunday sales, store hours, grocery access, outlet density, or delivery",
  },
  {
    key: "enforcement",
    label: "Enforcement",
    candidate:
      "penalties, compliance checks, ID checks, license suspension, or policing",
    description: "penalties, compliance checks, ID checks, or policing",
  },
];

let classifierPromise: Promise<ZeroShotClassifier> | null = null;

export function emptyLawScoreResult(text = ""): LawScoreResult {
  return {
    dominant: "price",
    model: MODEL_ID,
    ranked: CANDIDATES.map((candidate) => ({
      key: candidate.key,
      label: candidate.label,
      description: candidate.description,
      score: 0,
    })),
    scores: {
      price: 0,
      access: 0,
      enforcement: 0,
    },
    summary: text.trim()
      ? "Click Analyze Law to run the local model on this draft."
      : "Type a law draft and click Analyze Law.",
  };
}

export function buildLawScoreResult(
  text: string,
  raw: Array<{ label: string; score: number }>,
): LawScoreResult {
  const byLabel = new Map(raw.map((entry) => [entry.label, entry.score]));

  function lookupScore(candidate: (typeof CANDIDATES)[number]) {
    return Math.max(
      byLabel.get(candidate.candidate) ??
        byLabel.get(candidate.key) ??
        byLabel.get(candidate.label.toLowerCase()) ??
        0,
      0,
    );
  }

  const ranked = CANDIDATES.map((candidate) => ({
    key: candidate.key,
    label: candidate.label,
    description: candidate.description,
    score: Number(lookupScore(candidate).toFixed(4)),
  })).sort((left, right) => right.score - left.score);

  const scores = ranked.reduce(
    (accumulator, entry) => {
      accumulator[entry.key] = entry.score;
      return accumulator;
    },
    {
      price: 0,
      access: 0,
      enforcement: 0,
    } as MechanismScores,
  );

  const dominant = ranked[0]?.key ?? "price";
  const runnerUp = ranked[1];
  const summary =
    text.trim().length === 0
      ? "Type a law draft and click Analyze Law."
      : `The local model sees the strongest ${ranked[0]?.label.toLowerCase()} signal here, with ${runnerUp?.label.toLowerCase()} as the secondary mechanism.`;

  return {
    dominant,
    model: MODEL_ID,
    ranked,
    scores,
    summary,
  };
}

export async function classifyLawText(text: string): Promise<LawScoreResult> {
  const cleaned = text.trim();

  if (!cleaned) {
    return emptyLawScoreResult();
  }

  const classifier = await getClassifier();
  const result = await classifier(
    cleaned,
    CANDIDATES.map((candidate) => candidate.candidate),
    {
      hypothesis_template: HYPOTHESIS_TEMPLATE,
      multi_label: true,
    },
  );

  return buildLawScoreResult(
    cleaned,
    result.labels.map((label, index) => ({
      label,
      score: Number(result.scores[index] ?? 0),
    })),
  );
}

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = loadClassifier();
  }

  return classifierPromise;
}

async function loadClassifier(): Promise<ZeroShotClassifier> {
  const { pipeline } = await import("@huggingface/transformers");

  return (await pipeline("zero-shot-classification", MODEL_ID, {
    dtype: "q8",
  })) as ZeroShotClassifier;
}
