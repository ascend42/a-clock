import type { PuzzleDifficulty } from "../types";

export interface MathProblem {
  id: string;
  prompt: string;
  answer: number;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem(difficulty: PuzzleDifficulty): MathProblem {
  let prompt: string;
  let answer: number;

  if (difficulty === "easy") {
    const a = rand(1, 20);
    const b = rand(1, 20);
    if (Math.random() < 0.5) {
      prompt = `${a} + ${b}`;
      answer = a + b;
    } else {
      const [hi, lo] = a >= b ? [a, b] : [b, a];
      prompt = `${hi} − ${lo}`;
      answer = hi - lo;
    }
  } else if (difficulty === "medium") {
    const r = Math.random();
    if (r < 0.4) {
      const a = rand(2, 12);
      const b = rand(2, 12);
      prompt = `${a} × ${b}`;
      answer = a * b;
    } else if (r < 0.7) {
      const a = rand(10, 50);
      const b = rand(10, 50);
      prompt = `${a} + ${b}`;
      answer = a + b;
    } else {
      const a = rand(20, 80);
      const b = rand(1, 20);
      prompt = `${a} − ${b}`;
      answer = a - b;
    }
  } else {
    // hard
    if (Math.random() < 0.5) {
      const a = rand(3, 12);
      const b = rand(3, 12);
      const c = rand(1, 20);
      prompt = `${a} × ${b} + ${c}`;
      answer = a * b + c;
    } else {
      const a = rand(6, 12);
      const b = rand(6, 12);
      prompt = `${a} × ${b}`;
      answer = a * b;
    }
  }

  return { id: crypto.randomUUID(), prompt, answer };
}

/** Generate a fresh set of `count` math problems at the given difficulty. */
export function generateProblems(
  count: number,
  difficulty: PuzzleDifficulty,
): MathProblem[] {
  return Array.from({ length: count }, () => makeProblem(difficulty));
}
