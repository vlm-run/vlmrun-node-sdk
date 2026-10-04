import {
  InputError,
  choice,
  noul,
  normalizeQuestions,
  score,
} from "../../../../src";

describe("normalizeQuestions", () => {
  it("accepts the list dialect with friendly option spellings", () => {
    expect(
      normalizeQuestions([
        {
          id: "is_urgent",
          type: "noul",
          instructions: "Is this time-sensitive?",
        },
        {
          id: "department",
          type: "choice",
          options: ["billing", "technical", "sales"],
        },
        {
          id: "severity",
          type: "score",
          levels: ["Calm", "Frustrated", "Very angry"],
        },
      ])
    ).toEqual({
      is_urgent: { type: "noul", instructions: "Is this time-sensitive?" },
      department: {
        type: "choice",
        criteria: { billing: null, technical: null, sales: null },
      },
      severity: {
        type: "score",
        criteria: ["Calm", "Frustrated", "Very angry"],
      },
    });
  });

  it("accepts the wire mapping and TypeSafe builders", () => {
    const questions = normalizeQuestions({
      urgent: noul("Needs a human now?"),
      queue: choice("Which queue?", { billing: "Charges", technical: "Bugs" }),
      mood: score("How angry?", ["Calm", "Concerned", "Furious"] as const),
    });
    expect(questions.urgent).toEqual({
      type: "noul",
      instructions: "Needs a human now?",
    });
    expect(questions.queue).toEqual({
      type: "choice",
      instructions: "Which queue?",
      criteria: { billing: "Charges", technical: "Bugs" },
    });
    expect(questions.mood?.type).toBe("score");
  });

  it("accepts yes/no as noul outcome aliases", () => {
    expect(
      normalizeQuestions({
        urgent: { type: "noul", criteria: { yes: "today", no: "later" } },
      })
    ).toEqual({
      urgent: { type: "noul", criteria: { true: "today", false: "later" } },
    });
  });

  it("rejects a choice that uses levels", () => {
    expect(() =>
      normalizeQuestions([{ id: "a", type: "choice", levels: ["x", "y"] }])
    ).toThrow(InputError);
  });

  it("rejects an empty spec", () => {
    expect(() => normalizeQuestions([])).toThrow(/no questions/);
  });

  it("rejects a list item without an id", () => {
    expect(() => normalizeQuestions([{ type: "noul" }])).toThrow(
      /needs an "id"/
    );
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      normalizeQuestions([
        { id: "a", type: "noul" },
        { id: "a", type: "noul" },
      ])
    ).toThrow(/duplicate question id/);
  });
});
