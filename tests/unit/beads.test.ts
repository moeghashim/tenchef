import { describe, expect, it } from "vitest";
import {
  buildCloseArgs,
  buildCreateArgs,
  buildDependencyArgs,
  buildListArgs,
  buildReopenArgs,
  normalizeList,
  parseCreatedId,
  validateBuildTaskLabel
} from "../../src/server/beads";

describe("beads wrapper", () => {
  it("builds create argv with required labels", () => {
    expect(
      buildCreateArgs({
        id: "t0",
        label: "Search",
        group: "Core features",
        done: false
      })
    ).toEqual(["create", "Search", "--type", "task", "--label", "tenchef", "--label", "core"]);
  });

  it("builds dependency, close, reopen, and list argv", () => {
    expect(buildDependencyArgs("TEN-2", "TEN-1")).toEqual(["dep", "add", "TEN-2", "TEN-1"]);
    // --force: a checkbox tick must win over tenchef's own dependency edges.
    expect(buildCloseArgs("TEN-1")).toEqual(["close", "TEN-1", "--force"]);
    expect(buildReopenArgs("TEN-1")).toEqual(["update", "TEN-1", "--status", "open"]);
    // --all: closed issues drop out of the default listing on reload.
    expect(buildListArgs()).toEqual(["list", "--json", "--all", "--label", "tenchef", "--limit", "0"]);
  });

  it("normalizes bd list JSON into reducer tasks keyed by beadsId", () => {
    const tasks = normalizeList(
      JSON.stringify([
        { id: "TEN-1", title: "Set up repo", status: "open", labels: ["tenchef", "foundation"] },
        { id: "TEN-2", title: "Search", status: "closed", labels: ["tenchef", "core"] },
        { id: "OTHER-1", title: "Ignore", status: "open", labels: ["other"] }
      ])
    );

    expect(tasks).toEqual([
      { id: "TEN-1", label: "Set up repo", group: "Foundation", done: false, beadsId: "TEN-1" },
      { id: "TEN-2", label: "Search", group: "Core features", done: true, beadsId: "TEN-2" }
    ]);
  });

  it("keeps task ids stable across list reordering", () => {
    const items = [
      { id: "TEN-1", title: "Set up repo", status: "open", labels: ["tenchef", "foundation"] },
      { id: "TEN-2", title: "Search", status: "closed", labels: ["tenchef", "core"] }
    ];
    const forward = normalizeList(JSON.stringify(items));
    const reversed = normalizeList(JSON.stringify([...items].reverse()));
    // Same set of ids, no `bd-${index}` drift.
    expect([...forward.map((t) => t.id)].sort()).toEqual([...reversed.map((t) => t.id)].sort());
    // A given beadsId always maps to the same id.
    for (const task of forward) {
      const match = reversed.find((other) => other.beadsId === task.beadsId);
      expect(match?.id).toBe(task.id);
    }
  });

  describe("validateBuildTaskLabel", () => {
    it("accepts a normal label", () => {
      expect(validateBuildTaskLabel("Add search")).toBeNull();
    });

    it("rejects non-string labels", () => {
      expect(validateBuildTaskLabel(undefined)).toMatch(/string/i);
      expect(validateBuildTaskLabel(42)).toMatch(/string/i);
    });

    it("rejects empty and whitespace-only labels", () => {
      expect(validateBuildTaskLabel("")).toMatch(/empty/i);
      expect(validateBuildTaskLabel("   ")).toMatch(/empty/i);
    });

    it("rejects labels starting with '-' (would be parsed as a bd flag)", () => {
      expect(validateBuildTaskLabel("-rm-rf /")).toMatch(/-/);
    });

    it("rejects labels longer than 200 characters", () => {
      expect(validateBuildTaskLabel("x".repeat(201))).toMatch(/200/);
    });
  });

  describe("parseCreatedId", () => {
    it("parses a bare PREFIX-N id", () => {
      expect(parseCreatedId("TEN-42")).toBe("TEN-42");
      expect(parseCreatedId("Created issue TEN-42 successfully.\n")).toBe("TEN-42");
    });

    it("parses the bd >= 1.0 human-readable output with non-numeric suffixes", () => {
      expect(parseCreatedId("✓ Created issue: myproj-d8k — Test task\n  Priority: P2\n")).toBe("myproj-d8k");
    });

    it("parses a JSON id envelope", () => {
      expect(parseCreatedId(JSON.stringify({ id: "TEN-9" }))).toBe("TEN-9");
      expect(parseCreatedId(JSON.stringify({ issue: { id: "TEN-9" } }))).toBe("TEN-9");
    });

    it("returns undefined on empty output", () => {
      expect(parseCreatedId("")).toBeUndefined();
      expect(parseCreatedId("   ")).toBeUndefined();
    });

    it("returns undefined on an error message with no id (no first-word fallback)", () => {
      expect(parseCreatedId("Error: bd could not create the issue")).toBeUndefined();
      expect(parseCreatedId("permission denied")).toBeUndefined();
    });
  });
});
