import { describe, expect, it } from "vitest";
import {
  buildCloseArgs,
  buildCreateArgs,
  buildDependencyArgs,
  buildListArgs,
  buildReopenArgs,
  normalizeList,
  parseCreatedId
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
    expect(buildCloseArgs("TEN-1")).toEqual(["close", "TEN-1", "--force"]);
    expect(buildReopenArgs("TEN-1")).toEqual(["update", "TEN-1", "--status", "open"]);
    expect(buildListArgs()).toEqual(["list", "--json", "--all", "--label", "tenchef", "--limit", "0"]);
  });

  it("normalizes bd list JSON into reducer tasks", () => {
    const tasks = normalizeList(
      JSON.stringify([
        { id: "TEN-1", title: "Set up repo", status: "open", labels: ["tenchef", "foundation"] },
        { id: "TEN-2", title: "Search", status: "closed", labels: ["tenchef", "core"] },
        { id: "OTHER-1", title: "Ignore", status: "open", labels: ["other"] }
      ])
    );

    expect(tasks).toEqual([
      { id: "bd-0", label: "Set up repo", group: "Foundation", done: false, beadsId: "TEN-1" },
      { id: "bd-1", label: "Search", group: "Core features", done: true, beadsId: "TEN-2" }
    ]);
  });
});

describe("parseCreatedId", () => {
  it("parses the bd >= 1.0 human-readable create output", () => {
    expect(parseCreatedId("✓ Created issue: myproj-d8k — Test task\n  Priority: P2\n")).toBe("myproj-d8k");
  });

  it("parses a bare ID", () => {
    expect(parseCreatedId("TEN-1\n")).toBe("TEN-1");
  });

  it("parses JSON output", () => {
    expect(parseCreatedId("{\"id\":\"TEN-9\"}")).toBe("TEN-9");
  });
});
