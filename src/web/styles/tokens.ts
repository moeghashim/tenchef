export const DEFAULT_ACCENT = "#2F4FE0";

export const ACCENT_OPTIONS = ["#2F4FE0", "#E0562F", "#1F8A5B", "#7A3FF0"] as const;

export const colors = {
  ink: "#18181B",
  text: "#3A3A36",
  muted: "#8A8A85",
  soft: "#A8A8A2",
  page: "#F7F6F3",
  line: "#ECEBE6",
  lineStrong: "#E2E1DC",
  white: "#fff",
  success: "#1F8A5B"
};

export const fonts = {
  sans: "'Instrument Sans', system-ui, sans-serif",
  serif: "'Instrument Serif', serif"
};

export function tint(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel * alpha + 255 * (1 - alpha));
  return `rgb(${mix(red)},${mix(green)},${mix(blue)})`;
}
