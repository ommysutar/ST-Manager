export function buildStudioSummaryPrompt(input: { name: string }): string {
  return [
    "You are writing concise marketing copy for a creative studio workspace product.",
    `Write a professional 2-4 sentence summary for a studio named "${input.name}".`,
    "Focus on collaboration, creativity, and productivity.",
    "Do not invent specific locations, people, or statistics.",
    "Return plain text only — no markdown headings or bullet lists.",
  ].join("\n");
}
