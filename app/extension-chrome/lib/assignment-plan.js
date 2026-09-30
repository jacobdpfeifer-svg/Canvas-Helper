/**
 * Pure helpers for the side panel's assignment view. The "path" is an order
 * of attack built from the rubric — never an answer or a draft of the work.
 */
import { htmlToText } from "../shared/actions.js";

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text);

/** Checklist items: rubric criteria, else list items / sentences from the instructions. */
export function checklistItems(assignment) {
  if (assignment.rubric?.length) {
    return assignment.rubric.map((c) => ({
      id: String(c.id),
      text: htmlToText(c.description) || "Criterion",
      long: htmlToText(c.long_description),
      points: c.points ?? null,
    }));
  }
  const text = htmlToText(assignment.description || "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 280);
  return lines.slice(0, 8).map((line, i) => ({ id: `line-${i}`, text: line, long: "", points: null }));
}

/** Order of attack: biggest rubric criteria first, then a check against the rubric. */
export function honestPath(assignment) {
  const steps = ["Read the instructions once, start to finish."];
  const rubric = [...(assignment.rubric || [])].filter((c) => c.points != null).sort((a, b) => b.points - a.points);
  if (rubric.length) {
    const top = rubric.slice(0, 2).map((c) => `${clip(htmlToText(c.description) || "Criterion", 80)} (${c.points} pts)`);
    steps.push(`Start where the points are: ${top.join(", then ")}.`);
  } else {
    steps.push("Turn the instructions into the checklist above and do the first item.");
  }
  steps.push("Before you submit in Canvas, tick every item against your own work.");
  return steps;
}
