import { describe, expect, it } from "vitest";
import {
  buildCloseArgs,
  buildCreateArgs,
  buildDependencyArgs,
  buildReopenArgs,
  normalizeList
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

  it("builds dependency, close, and reopen argv", () => {
    expect(buildDependencyArgs("TEN-2", "TEN-1")).toEqual(["dep", "add", "TEN-2", "TEN-1"]);
    expect(buildCloseArgs("TEN-1")).toEqual(["close", "TEN-1"]);
    expect(buildReopenArgs("TEN-1")).toEqual(["update", "TEN-1", "--status", "open"]);
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
