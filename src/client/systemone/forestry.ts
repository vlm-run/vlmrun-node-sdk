import { InputError } from "../exceptions";
import { normalizeQuestions } from "./questions";
import type { Questions, WireQuestions } from "./types";

/**
 * A named, typed question forest.
 *
 * Forestries are the reusable unit of System One work: a set of atomic
 * questions compiled once, then asked over HTTP or a websocket session.
 */
export interface Forestry<Q extends Questions = Questions> {
  readonly kind: "forestry";
  readonly name: string;
  readonly questions: Q;
  toWire(): WireQuestions;
}

export function forestry<const Q extends Questions>(
  name: string,
  questions: Q
): Forestry<Q> {
  if (!name.trim()) {
    throw new InputError(
      "a forestry needs a name",
      "question_spec",
      'e.g. forestry("support-ticket", { urgent: noul("Is this time-sensitive?") })'
    );
  }
  const wire = normalizeQuestions(questions);
  return {
    kind: "forestry",
    name,
    questions,
    toWire: () => ({ ...wire }),
  };
}

export function isForestry<Q extends Questions>(
  value: unknown
): value is Forestry<Q> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Forestry).kind === "forestry" &&
    typeof (value as Forestry).name === "string" &&
    typeof (value as Forestry).toWire === "function"
  );
}

export function resolveQuestionSpec(input: {
  questions?: unknown;
  forestry?: Forestry | unknown;
}): WireQuestions {
  if (input.forestry !== undefined && input.questions !== undefined) {
    throw new InputError(
      "set either forestry or questions, not both",
      "question_spec",
      "A forestry already carries its question spec."
    );
  }
  if (input.forestry !== undefined) {
    if (isForestry(input.forestry)) {
      return input.forestry.toWire();
    }
    return normalizeQuestions(input.forestry);
  }
  if (input.questions === undefined) {
    throw new InputError(
      "decide needs questions or a forestry",
      "question_spec",
      "Pass a Forestry from forestry(), or a list / map of questions."
    );
  }
  return normalizeQuestions(input.questions);
}
