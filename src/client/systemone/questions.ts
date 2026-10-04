import { InputError } from "../exceptions";
import type {
  ChoiceCriteria,
  ChoiceQuestion,
  EntryType,
  NoulQuestion,
  QuestionType,
  ScoreCriteria,
  ScoreQuestion,
  WireQuestion,
  WireQuestions,
} from "./types";

const QUESTION_TYPES: QuestionType[] = ["noul", "choice", "score"];
const CRITERIA_ALIAS: Record<string, string> = {
  choice: "options",
  score: "levels",
};
const NOUL_OUTCOME_ALIAS: Record<string, string> = {
  yes: "true",
  no: "false",
};
const COMMON_KEYS = new Set(["id", "type", "instructions", "criteria"]);
const MIN_CHOICE_OPTIONS = 2;
const MAX_CHOICE_OPTIONS = 128;
const MIN_SCORE_LEVELS = 2;
const MAX_SCORE_LEVELS = 10;

function specError(message: string, suggestion: string): InputError {
  return new InputError(message, "question_spec", suggestion);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function noul(
  instructions: EntryType = null,
  criteria?: NoulQuestion["criteria"]
): NoulQuestion {
  return { type: "noul", instructions, criteria };
}

export function choice<T extends ChoiceCriteria>(
  instructions: EntryType,
  criteria: T
): ChoiceQuestion<T>;
export function choice(
  instructions: EntryType,
  criteria: readonly string[]
): ChoiceQuestion<ChoiceCriteria>;
export function choice(
  instructions: EntryType,
  criteria: ChoiceCriteria | readonly string[]
): ChoiceQuestion<ChoiceCriteria> {
  if (Array.isArray(criteria)) {
    const mapped: ChoiceCriteria = {};
    for (const label of criteria) {
      mapped[label] = null;
    }
    return { type: "choice", instructions, criteria: mapped };
  }
  return { type: "choice", instructions, criteria: criteria as ChoiceCriteria };
}

export function score<T extends ScoreCriteria>(
  instructions: EntryType,
  criteria: T
): ScoreQuestion<T> {
  return { type: "score", instructions, criteria };
}

function normalizeChoiceCriteria(
  raw: unknown,
  where: string
): Record<string, unknown> {
  let criteria: Record<string, unknown> = {};
  if (isRecord(raw)) {
    criteria = { ...raw };
  } else if (Array.isArray(raw)) {
    raw.forEach((option, index) => {
      if (typeof option === "string") {
        criteria[option] = null;
      } else if (isRecord(option) && option.name !== undefined) {
        criteria[String(option.name)] = option.description ?? null;
      } else {
        throw specError(
          `${where}: option ${index} must be a label string or {"name": ..., "description": ...}`,
          'Write options as ["a", "b"] or [{"name": "a", "description": "..."}]'
        );
      }
    });
  } else {
    throw specError(
      `${where}: options must be a list of labels or a mapping of label to description`,
      'e.g. "options": ["billing", "technical", "sales"]'
    );
  }
  const count = Object.keys(criteria).length;
  if (count < MIN_CHOICE_OPTIONS || count > MAX_CHOICE_OPTIONS) {
    throw specError(
      `${where}: a choice needs ${MIN_CHOICE_OPTIONS}-${MAX_CHOICE_OPTIONS} options; got ${count}`,
      "Use a noul question for a yes/no decision."
    );
  }
  return criteria;
}

function normalizeScoreCriteria(raw: unknown, where: string): unknown[] {
  if (!Array.isArray(raw)) {
    throw specError(
      `${where}: levels must be an ordered list of level descriptions`,
      'e.g. "levels": ["Calm", "Frustrated", "Very angry"]'
    );
  }
  if (raw.length < MIN_SCORE_LEVELS || raw.length > MAX_SCORE_LEVELS) {
    throw specError(
      `${where}: a score needs ${MIN_SCORE_LEVELS}-${MAX_SCORE_LEVELS} levels; got ${raw.length}`,
      "Collapse adjacent levels, or use a choice question."
    );
  }
  return raw.slice();
}

function normalizeNoulCriteria(
  raw: unknown,
  where: string
): Record<string, unknown> {
  if (!isRecord(raw)) {
    throw specError(
      `${where}: criteria must be an object describing the true and false outcomes`,
      'e.g. "criteria": {"true": "Needs action today", "false": "Can wait"}'
    );
  }
  const criteria: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = NOUL_OUTCOME_ALIAS[key.toLowerCase()] ?? key.toLowerCase();
    if (name !== "true" && name !== "false") {
      throw specError(
        `${where}: unknown noul outcome ${JSON.stringify(key)}`,
        'A noul describes only "true"/"yes" and "false"/"no".'
      );
    }
    criteria[name] = value;
  }
  return criteria;
}

function isQuestionType(value: unknown): value is QuestionType {
  return value === "noul" || value === "choice" || value === "score";
}

function normalizeQuestion(raw: unknown, where: string): WireQuestion {
  if (!isRecord(raw)) {
    throw specError(`${where}: a question must be an object`, 'e.g. {"type": "noul"}');
  }
  const kind = raw.type;
  if (!isQuestionType(kind)) {
    throw specError(
      `${where}: type must be one of ${QUESTION_TYPES.join(", ")}; got ${JSON.stringify(kind)}`,
      "noul is yes/no, choice picks a label, score reads an ordered rubric."
    );
  }

  const alias = CRITERIA_ALIAS[kind];
  const allowed = new Set(COMMON_KEYS);
  if (alias) {
    allowed.add(alias);
  }
  const unknown = Object.keys(raw).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    const wrongAlias = unknown.filter((key) =>
      Object.values(CRITERIA_ALIAS).includes(key)
    );
    throw specError(
      `${where}: unknown key(s) ${unknown
        .slice()
        .sort()
        .map((key) => JSON.stringify(key))
        .join(", ")}`,
      wrongAlias.length > 0
        ? `A ${kind} question uses "${alias ?? "criteria"}".`
        : `Allowed keys: ${Array.from(allowed).sort().join(", ")}.`
    );
  }

  const question: WireQuestion = { type: kind };
  if (raw.instructions !== undefined && raw.instructions !== null) {
    question.instructions = raw.instructions as EntryType;
  }

  let criteria = raw.criteria;
  if (alias && raw[alias] !== undefined && raw[alias] !== null) {
    if (criteria !== undefined && criteria !== null) {
      throw specError(
        `${where}: set either "${alias}" or "criteria", not both`,
        `"${alias}" is the friendly spelling of "criteria".`
      );
    }
    criteria = raw[alias];
  }

  switch (kind) {
    case "choice":
      if (criteria === undefined || criteria === null) {
        throw specError(
          `${where}: a choice question needs options`,
          'e.g. "options": ["billing", "technical", "sales"]'
        );
      }
      question.criteria = normalizeChoiceCriteria(criteria, where);
      break;
    case "score":
      if (criteria === undefined || criteria === null) {
        throw specError(
          `${where}: a score question needs levels`,
          'e.g. "levels": ["Calm", "Frustrated", "Very angry"]'
        );
      }
      question.criteria = normalizeScoreCriteria(criteria, where);
      break;
    case "noul":
      if (criteria !== undefined && criteria !== null) {
        question.criteria = normalizeNoulCriteria(criteria, where);
      }
      break;
    default: {
      const _never: never = kind;
      throw specError(`${where}: unhandled question type`, String(_never));
    }
  }
  return question;
}

export function isForestryLike(
  value: unknown
): value is { kind: "forestry"; questions: unknown } {
  return isRecord(value) && value.kind === "forestry" && "questions" in value;
}

/**
 * Normalize either question dialect into the wire mapping.
 *
 * Accepts a list of questions each carrying an `id`, the wire mapping of id
 * to question, either wrapped in `{ questions }`, TypeSafe SDK question
 * objects, and a Forestry.
 */
export function normalizeQuestions(spec: unknown): WireQuestions {
  let current = spec;
  if (isForestryLike(current)) {
    current = current.questions;
  }
  if (isRecord(current) && Object.keys(current).length === 1 && "questions" in current) {
    current = current.questions;
  }

  const questions: WireQuestions = {};
  if (isRecord(current)) {
    for (const [name, raw] of Object.entries(current)) {
      const where = `questions.${name}`;
      let body: unknown = raw;
      if (isRecord(raw) && "id" in raw) {
        if (String(raw.id) !== String(name)) {
          throw specError(
            `${where}: "id" is ${JSON.stringify(raw.id)} but the key is ${JSON.stringify(name)}`,
            "In the mapping form the key is the id; drop the id field."
          );
        }
        const { id: _id, ...rest } = raw;
        body = rest;
      }
      questions[String(name)] = normalizeQuestion(body, where);
    }
  } else if (Array.isArray(current)) {
    current.forEach((raw, index) => {
      const where = `questions[${index}]`;
      if (!isRecord(raw) || !raw.id) {
        throw specError(
          `${where}: every question in a list needs an "id"`,
          "The id is the key its answer comes back under."
        );
      }
      const name = String(raw.id);
      if (name in questions) {
        throw specError(
          `${where}: duplicate question id ${JSON.stringify(name)}`,
          "Answers are keyed by id, so each must be unique."
        );
      }
      const { id: _id, ...body } = raw;
      questions[name] = normalizeQuestion(body, `${where} "${name}"`);
    });
  } else {
    throw specError(
      "questions must be a list of questions or a mapping of id to question",
      'e.g. [{"id": "is_urgent", "type": "noul"}]'
    );
  }

  if (Object.keys(questions).length === 0) {
    throw specError("no questions were given", "Ask at least one question.");
  }
  return questions;
}
