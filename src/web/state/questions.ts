import type { ChoiceOption, Question } from "./types";

export const AUDIENCE: ChoiceOption[] = [
  { id: "consumers", label: "Consumers", desc: "Everyday individuals" },
  { id: "business", label: "Businesses", desc: "Teams & companies" },
  { id: "internal", label: "Internal teams", desc: "People inside your org" },
  { id: "developers", label: "Developers", desc: "Technical builders & APIs" }
];

export const PLATFORMS: ChoiceOption[] = [
  { id: "web", label: "Web" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
  { id: "desktop", label: "Desktop" },
  { id: "api", label: "API / headless" }
];

export const FEATURES: ChoiceOption[] = [
  { id: "auth", label: "Accounts & auth" },
  { id: "realtime", label: "Realtime sync" },
  { id: "notifs", label: "Notifications" },
  { id: "search", label: "Search" },
  { id: "analytics", label: "Analytics dashboard" },
  { id: "integrations", label: "Integrations" },
  { id: "offline", label: "Offline mode" },
  { id: "collab", label: "Collaboration" }
];

export const METRIC: ChoiceOption[] = [
  { id: "activation", label: "Activation", desc: "New users reach the aha moment" },
  { id: "retention", label: "Retention", desc: "People keep coming back" },
  { id: "revenue", label: "Revenue", desc: "Conversion & paid growth" },
  { id: "engagement", label: "Daily engagement", desc: "Frequent, sticky usage" }
];

export const TIMELINE: ChoiceOption[] = [
  { id: "asap", label: "Under a month", desc: "Ship a tight v1 fast" },
  { id: "quarter", label: "This quarter", desc: "~3 months of runway" },
  { id: "half", label: "Within 6 months", desc: "Room for a fuller scope" },
  { id: "open", label: "No fixed date", desc: "Quality over deadline" }
];

export const DIRECTION: Record<string, string> = {
  minimal: "Minimal",
  editorial: "Editorial",
  vivid: "Vivid",
  utility: "Utilitarian"
};

export const QUESTIONS: Question[] = [
  {
    id: "name",
    type: "text",
    kind: "Short answer",
    title: "What are you building?",
    subtitle: "A working name and one line is enough \u2014 you can refine it later.",
    placeholder: "e.g. Pulse \u2014 async team check-ins",
    rows: 2
  },
  {
    id: "audience",
    type: "single",
    kind: "Single select",
    title: "Who is it primarily for?",
    subtitle: "Pick the one audience that matters most for v1.",
    options: AUDIENCE
  },
  {
    id: "problem",
    type: "text",
    kind: "Short answer",
    title: "What problem does it solve?",
    subtitle: "One or two sentences on the pain you are removing.",
    placeholder: "Teams lose context between standups and...",
    rows: 4
  },
  {
    id: "platforms",
    type: "multi",
    kind: "Multi select",
    title: "Where should it run?",
    subtitle: "Select every surface you need at launch.",
    options: PLATFORMS
  },
  {
    id: "direction",
    type: "visual",
    kind: "Pick a look",
    title: "Which visual direction fits?",
    subtitle: "A starting aesthetic for the product."
  },
  {
    id: "features",
    type: "multi",
    kind: "Multi select",
    title: "What are the must-have features for v1?",
    subtitle: "Be ruthless \u2014 these become your build checklist.",
    options: FEATURES
  },
  {
    id: "metric",
    type: "single",
    kind: "Single select",
    title: "What does success look like?",
    subtitle: "The one number you will watch.",
    options: METRIC
  },
  {
    id: "timeline",
    type: "single",
    kind: "Single select",
    title: "What is your target for v1?",
    subtitle: "Sets the milestone pacing in your plan.",
    options: TIMELINE
  }
];
