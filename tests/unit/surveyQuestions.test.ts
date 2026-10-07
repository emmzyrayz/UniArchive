import { describe, expect, it } from "vitest";
import {
  LIMITS,
  answerText,
  cleanAnswers,
  cleanQuestions,
  cleanRespondent,
  cleanRespondentConfig,
  lockedChanges,
  parseQuestionImport,
  type SurveyQuestion,
} from "@/lib/survey/questions";

const choice = (id: string, extra: Partial<SurveyQuestion> = {}): SurveyQuestion => ({
  id,
  type: "single_choice",
  label: "Pick one",
  required: true,
  options: [
    { id: "opt001", label: "A" },
    { id: "opt002", label: "B" },
  ],
  ...extra,
});

describe("cleanQuestions", () => {
  it("keeps valid questions and their ids", () => {
    const { questions, problems } = cleanQuestions([
      { id: "q00001", type: "short_text", label: "  Your   name ", required: true },
      { id: "q00002", type: "single_choice", label: "Pick", options: [{ id: "opt001", label: "A" }, { label: "B" }], allowOther: true },
    ]);
    expect(problems).toEqual([]);
    expect(questions[0]).toEqual({ id: "q00001", type: "short_text", label: "Your name", required: true });
    expect(questions[1].options?.[0]).toEqual({ id: "opt001", label: "A" });
    expect(questions[1].options?.[1].id).toMatch(/^[a-z0-9]{12}$/);
    expect(questions[1].allowOther).toBe(true);
  });

  it("reports what stops a survey opening", () => {
    expect(cleanQuestions([]).problems).toContain("Add at least one question.");
    const { problems } = cleanQuestions([
      { type: "short_text", label: "" },
      { type: "dropdown", label: "One option", options: [{ label: "Only" }] },
      { type: "scale", label: "S", min: 3, max: 3 },
      { type: "number", label: "N", min: 10, max: 1 },
    ]);
    expect(problems).toEqual([
      "Question 1 needs a question.",
      "Question 2 needs at least two options.",
      "Question 3: the scale must go from 0 or more up to 10 at most.",
      "Question 4: the smallest number is above the largest.",
    ]);
  });

  it("falls back to short text for unknown types and makes duplicate ids unique", () => {
    const { questions } = cleanQuestions([
      { id: "same01", type: "essay", label: "A" },
      { id: "same01", type: "long_text", label: "B" },
    ]);
    expect(questions[0].type).toBe("short_text");
    expect(questions[0].id).toBe("same01");
    expect(questions[1].id).not.toBe("same01");
  });

  it("never offers 'Other' on a dropdown, and clamps scales to 0-10", () => {
    const { questions } = cleanQuestions([
      { type: "dropdown", label: "D", options: [{ label: "a" }, { label: "b" }], allowOther: true },
      { type: "scale", label: "S", min: -4, max: 20 },
    ]);
    expect(questions[0].allowOther).toBeUndefined();
    expect([questions[1].min, questions[1].max]).toEqual([0, 10]);
  });

  it("caps the number of questions", () => {
    const many = Array.from({ length: LIMITS.questions + 5 }, (_, i) => ({ type: "short_text", label: `Q${i}` }));
    expect(cleanQuestions(many).questions).toHaveLength(LIMITS.questions);
  });
});

describe("parseQuestionImport", () => {
  it("reads ```json blocks from an AI answer, joining several", () => {
    const text = 'Here you go:\n```json\n[{"type":"yes_no","label":"Q1"}]\n```\nand\n```json\n{"questions":[{"type":"rating","label":"Q2"}]}\n```';
    const { questions, error } = parseQuestionImport(text);
    expect(error).toBeUndefined();
    expect(questions.map((q) => q.label)).toEqual(["Q1", "Q2"]);
  });

  it("drops pasted ids and accepts options as plain strings", () => {
    const { questions } = parseQuestionImport('[{"id":"abcdef","type":"single_choice","label":"Q","options":["Yes","No"]}]');
    expect(questions[0].id).not.toBe("abcdef");
    expect(questions[0].options?.map((o) => o.label)).toEqual(["Yes", "No"]);
  });

  it("explains bad input", () => {
    expect(parseQuestionImport("not json").error).toMatch(/valid JSON/);
    expect(parseQuestionImport('{"nope":1}').error).toMatch(/Expected a list/);
    expect(parseQuestionImport("[]").error).toBe("No questions found.");
    const tooMany = JSON.stringify(Array.from({ length: LIMITS.questions + 1 }, () => ({ type: "yes_no", label: "x" })));
    expect(parseQuestionImport(tooMany).error).toMatch(/at most/);
    expect(parseQuestionImport('[{"type":"weird","label":"x"}]').problems[0]).toMatch(/1 question\(s\) had an unknown type/);
  });
});

describe("cleanAnswers", () => {
  const questions: SurveyQuestion[] = [
    { id: "short1", type: "short_text", label: "Name", required: true },
    choice("single"),
    { ...choice("multi1", { type: "multi_choice", required: false }), allowOther: true },
    { id: "yesno1", type: "yes_no", label: "Y/N", required: false },
    { id: "rate01", type: "rating", label: "Rate", required: false },
    { id: "scale1", type: "scale", label: "Scale", required: false, min: 0, max: 10 },
    { id: "numb01", type: "number", label: "Age", required: false, min: 10, max: 99 },
  ];

  it("accepts good answers and drops unknown questions", () => {
    const { answers, errors } = cleanAnswers(questions, {
      short1: "  Ada   Obi ",
      single: { choice: "opt002" },
      multi1: { choices: ["opt001", "opt001", "bogus"], other: "  C  " },
      yesno1: false,
      rate01: 5,
      scale1: "7",
      numb01: 21,
      stranger: "x",
    });
    expect(errors).toEqual({});
    expect(answers).toEqual({
      short1: "Ada Obi",
      single: { choice: "opt002" },
      multi1: { choices: ["opt001"], other: "C" },
      yesno1: false,
      rate01: 5,
      scale1: 7,
      numb01: 21,
    });
  });

  it("flags required, out-of-range and wrong-shaped answers", () => {
    const { answers, errors } = cleanAnswers(questions, {
      single: { choice: "nope" },
      yesno1: "yes",
      rate01: 6,
      scale1: 2.5,
      numb01: 5,
    });
    expect(answers).toEqual({});
    expect(errors).toEqual({
      short1: "This question needs an answer.",
      single: "Pick one of the options.",
      yesno1: "Answer yes or no.",
      rate01: "Enter a number from 1 to 5.",
      scale1: "Enter a number.",
      numb01: "Enter a number from 10 to 99.",
    });
  });

  it("allows 'Other' only where the question offers it", () => {
    expect(cleanAnswers([choice("single")], { single: { other: "Mine" } }).errors.single).toBeDefined();
    expect(cleanAnswers([choice("single", { allowOther: true })], { single: { other: "Mine" } }).answers.single).toEqual({ other: "Mine" });
  });

  it("limits text length", () => {
    const { errors } = cleanAnswers(questions, { short1: "x".repeat(LIMITS.shortText + 1) });
    expect(errors.short1).toMatch(/under 300/);
  });

  it("answerText reads answers back, surviving removed options", () => {
    expect(answerText(questions[2], { choices: ["opt001", "gone"], other: "C" })).toBe("A; (removed option); Other: C");
    expect(answerText(questions[3], true)).toBe("Yes");
  });
});

describe("respondent ('About you') fields", () => {
  const config = cleanRespondentConfig({ name: "required", email: "optional", level: "off", bogus: "required" });

  it("cleans the config, keeping defaults for what's missing", () => {
    expect(config).toEqual({ name: "required", email: "optional", school: "required", level: "off", role: "required" });
  });

  it("accepts a catalog school and needs the parts below a typed one", () => {
    const uni = "a".repeat(24);
    const ok = cleanRespondent(config, { name: "Ada", universityId: uni, role: "student", email: "ADA@x.com" });
    expect(ok.errors).toEqual({});
    expect(ok.respondent).toMatchObject({ name: "Ada", universityId: uni, email: "ada@x.com", role: "student" });

    const typed = cleanRespondent(config, { name: "Ada", schoolUnlisted: true, universityName: "New Poly", role: "student" });
    expect(typed.errors.school).toMatch(/faculty and department/);

    const bad = cleanRespondent(config, { name: "Ada", schoolUnlisted: true, universityName: "<b>", facultyName: "F", departmentName: "D", role: "x" });
    expect(bad.errors.school).toMatch(/characters that aren't allowed/);
    expect(bad.errors.role).toBe("Tell us who you are.");
  });

  it("rejects a malformed email but allows leaving it empty", () => {
    expect(cleanRespondent(config, { name: "A", email: "nope", universityId: "a".repeat(24), role: "other" }).errors.email).toBeDefined();
    expect(cleanRespondent(config, { name: "A", universityId: "a".repeat(24), role: "other" }).errors).toEqual({});
  });
});

describe("lockedChanges (a survey with answers)", () => {
  const prev: SurveyQuestion[] = [choice("q00001"), { id: "q00002", type: "scale", label: "S", required: false, min: 0, max: 10 }];

  it("allows rewording, new options and new optional questions", () => {
    const next = [
      { ...prev[0], label: "Pick one, please", options: [...prev[0].options!, { id: "opt003", label: "C" }] },
      prev[1],
      { id: "q00003", type: "yes_no" as const, label: "New", required: false },
    ];
    expect(lockedChanges(prev, next)).toEqual([]);
  });

  it("refuses removals, type and scale changes and new required questions", () => {
    const next: SurveyQuestion[] = [
      { ...prev[0], type: "dropdown", options: [prev[0].options![0]] },
      { id: "q00003", type: "yes_no", label: "New", required: true },
    ];
    expect(lockedChanges(prev, next)).toEqual([
      '"Pick one" already has answers; its type can\'t change.',
      '"Pick one" already has answers; options can be renamed or added, not removed.',
      '"S" already has answers and can\'t be removed.',
      'New question "New" must be optional (people already answered without it).',
    ]);
    expect(lockedChanges([prev[1]], [{ ...prev[1], max: 5 }])[0]).toMatch(/scale can't change/);
  });
});
