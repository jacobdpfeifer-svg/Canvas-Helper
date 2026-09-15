/**
 * Load short course notes for solver context.
 */
import fs from "node:fs";
import path from "node:path";
import { COURSES_DIR, ROOT } from "../canvas-session.mjs";

export function loadCourseNotes(courseCode) {
  const file = path.join(COURSES_DIR, `${courseCode || ""}.md`);
  let course = "";
  if (courseCode && fs.existsSync(file)) {
    course = fs.readFileSync(file, "utf8");
    // Prefer Class notes + Theme
    const parts = [];
    const theme = course.match(/## Theme\n+([\s\S]*?)(?=\n## |\n$)/);
    if (theme) parts.push(theme[1].trim().slice(0, 800));
    const notes = course.match(/## Class notes\n+([\s\S]*?)(?=\n## |\n$)/);
    if (notes) parts.push(notes[1].trim().slice(0, 2500));
    course = parts.join("\n\n") || course.slice(0, 1500);
  }

  let voice = "";
  const voicePath = path.join(ROOT, ".jacob", "writing-voice.md");
  if (fs.existsSync(voicePath)) {
    voice = fs.readFileSync(voicePath, "utf8").slice(0, 1200);
  }

  return { courseNotes: course, writingVoice: voice };
}
