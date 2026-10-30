export interface ReasonGuidance {
  topic: string;
  examples: string;
  keywords: string[];
}

export const REASON_GUIDANCE: Record<string, ReasonGuidance> = {
  Dermatology: {
    topic: "skin, hair, or nail concerns",
    examples: "acne, skin rash, hair loss, eczema, or a mole check",
    keywords: [
      "acne",
      "skin",
      "rash",
      "hair",
      "nail",
      "eczema",
      "dermatitis",
      "mole",
      "lesion",
      "psoriasis",
      "pigmentation",
      "dandruff",
    ],
  },
  Cardiology: {
    topic: "heart or blood pressure concerns",
    examples: "chest pain, high blood pressure, palpitations, or a cardiac review",
    keywords: [
      "heart",
      "cardiac",
      "chest pain",
      "blood pressure",
      "palpitation",
      "hypertension",
      "cholesterol",
      "ecg",
      "angina",
    ],
  },
  Paediatrics: {
    topic: "child health concerns",
    examples: "child fever, vaccination, growth review, or a child cough",
    keywords: ["child", "infant", "baby", "paediatric", "pediatric", "vaccination", "growth", "newborn", "toddler"],
  },
  Orthopaedics: {
    topic: "bone, joint, or muscle concerns",
    examples: "joint pain, back pain, a fracture, a sprain, or arthritis",
    keywords: ["bone", "joint", "muscle", "fracture", "sprain", "back pain", "knee", "shoulder", "arthritis", "ligament", "sports injury"],
  },
  "Ear Nose and Throat": {
    topic: "ear, nose, or throat concerns",
    examples: "sore throat, ear pain, sinus trouble, hearing loss, or tonsils",
    keywords: ["ear", "nose", "throat", "sinus", "hearing", "tonsil", "voice", "snoring", "vertigo", "nosebleed", "hoarseness"],
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(text: string, keywords: string[]) {
  if (keywords.length === 0) return false;
  const pattern = new RegExp(`\\b(?:${keywords.map(escapeRegExp).join("|")})(?:s|es)?\\b`);
  return pattern.test(text);
}

export function reasonGuidanceFor(departmentName: string | null | undefined): ReasonGuidance | null {
  if (!departmentName) return null;
  return REASON_GUIDANCE[departmentName] ?? null;
}

export function reasonMismatch(departmentName: string | null | undefined, reason: string): string | null {
  if (!departmentName) return null;
  const rule = REASON_GUIDANCE[departmentName];
  if (!rule || !reason.trim()) return null;

  const text = reason.toLowerCase();
  if (matches(text, rule.keywords)) return null;

  for (const [otherDepartment, otherRule] of Object.entries(REASON_GUIDANCE)) {
    if (otherDepartment === departmentName) continue;
    if (matches(text, otherRule.keywords)) {
      return (
        `This looks like a concern for ${otherDepartment} (${otherRule.topic}). ` +
        `${departmentName} handles ${rule.topic}. ` +
        `Please book ${otherDepartment} or describe a concern that fits ${departmentName}.`
      );
    }
  }
  return null;
}
