import {
  InputError,
  choice,
  forestry,
  isForestry,
  noul,
  resolveQuestionSpec,
  score,
} from "../../../../src";

describe("forestry", () => {
  const ticket = forestry("support-ticket", {
    urgent: noul("Is this time-sensitive?"),
    department: choice("Which team?", ["billing", "technical", "sales"]),
    severity: score("How severe?", [
      "minor",
      "normal",
      "major",
      "critical",
    ] as const),
  });

  it("is a named, reusable question forest", () => {
    expect(ticket.kind).toBe("forestry");
    expect(ticket.name).toBe("support-ticket");
    expect(isForestry(ticket)).toBe(true);
    expect(ticket.toWire().department).toEqual({
      type: "choice",
      instructions: "Which team?",
      criteria: { billing: null, technical: null, sales: null },
    });
  });

  it("compiles once and can be asked through resolveQuestionSpec", () => {
    expect(resolveQuestionSpec({ forestry: ticket }).urgent?.type).toBe("noul");
  });

  it("refuses a nameless forestry", () => {
    expect(() => forestry("  ", { a: noul() })).toThrow(InputError);
  });

  it("refuses forestry and questions together", () => {
    expect(() =>
      resolveQuestionSpec({
        forestry: ticket,
        questions: [{ id: "a", type: "noul" }],
      })
    ).toThrow(/not both/);
  });
});
