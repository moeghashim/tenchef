import type { BuildTask, PlanComment, ProductPlan, TaskGroup } from "./types";

export const TASK_GROUPS: TaskGroup[] = ["Foundation", "Core features", "Launch"];

export function buildPrdMarkdown(params: {
  plan: ProductPlan;
  tasks: BuildTask[];
  comments: PlanComment[];
  date: Date;
}): string {
  const { plan, tasks, comments, date } = params;
  const lines: string[] = [];
  lines.push(`# ${plan.productName} PRD`);
  lines.push("");
  lines.push(`Date: ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`);
  lines.push(`For: ${plan.audienceLabel}`);
  lines.push(`Platforms: ${plan.platformsLabel}`);
  lines.push(`Target: ${plan.timelineLabel}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(plan.summary);
  lines.push("");
  if (!plan.problem) {
    lines.push("This v1 keeps scope intentionally tight: ship the smallest set of features that proves the core value, instrument the headline metric, and iterate from real usage.");
    lines.push("");
  }
  lines.push("## Goals");
  lines.push("");
  plan.goals.forEach((goal) => lines.push(`- ${goal}`));
  lines.push("");
  lines.push("## Build checklist");
  lines.push("");
  TASK_GROUPS.forEach((group) => {
    const grouped = tasks.filter((task) => task.group === group);
    if (!grouped.length) return;
    lines.push(`### ${group}`);
    lines.push("");
    grouped.forEach((task) => {
      const marker = task.done ? "x" : " ";
      const id = task.beadsId ? ` <!-- beads:${task.beadsId} -->` : "";
      lines.push(`- [${marker}] ${task.label}${id}`);
    });
    lines.push("");
  });
  if (comments.length) {
    lines.push("## Feedback to address");
    lines.push("");
    comments.forEach((comment) => {
      const marker = comment.resolved ? "x" : " ";
      lines.push(`- [${marker}] [${comment.target}] ${comment.text}`);
    });
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}
