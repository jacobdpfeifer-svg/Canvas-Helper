import "@testing-library/jest-dom/vitest";

declare module "*.md?raw" {
  const content: string;
  export default content;
}
