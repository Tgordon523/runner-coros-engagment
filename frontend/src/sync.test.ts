import { describe, expect, it } from "vitest";
import { describeSync, formatAge } from "./sync";

const NOW = new Date("2026-08-03T12:00:00Z");

describe("formatAge", () => {
  it("buckets by minute, hour, day", () => {
    expect(formatAge("2026-08-03T11:59:40Z", NOW)).toBe("just now");
    expect(formatAge("2026-08-03T11:46:00Z", NOW)).toBe("14m ago");
    expect(formatAge("2026-08-03T09:00:00Z", NOW)).toBe("3h ago");
    expect(formatAge("2026-07-20T12:00:00Z", NOW)).toBe("14d ago");
  });

  it("treats a naive backend timestamp as UTC", () => {
    expect(formatAge("2026-08-03T11:00:00", NOW)).toBe("1h ago");
  });

  it("returns null for missing or unparseable input", () => {
    expect(formatAge(null, NOW)).toBeNull();
    expect(formatAge("not a date", NOW)).toBeNull();
  });
});

describe("describeSync", () => {
  it("a dead backend blames the API host, not COROS", () => {
    const note = describeSync(null, "no response from http://localhost:8000 (/api/sync)", NOW);
    expect(note.tone).toBe("error");
    expect(note.headline).toContain("Can't reach the app's API");
    expect(note.hint).toContain("make up");
  });

  it("a healthy sync stays quiet and reports its age", () => {
    const note = describeSync(
      { status: "ok", finished_at: "2026-08-03T11:55:00Z", new_runs: 1 },
      null,
      NOW,
    );
    expect(note.tone).toBe("ok");
    expect(note.headline).toBe("Synced 5m ago");
    expect(note.detail).toBe("1 new run");
    expect(note.stale).toBeUndefined();
  });

  it("a failed sync shows the server's reason and how stale the runs are", () => {
    const note = describeSync(
      {
        status: "error",
        finished_at: "2026-08-03T11:59:00Z",
        new_runs: 0,
        error: "COROS accepted the login but rejected the session token (code 1019).",
        last_ok_at: "2026-07-20T12:00:00Z",
      },
      null,
      NOW,
    );
    expect(note.tone).toBe("error");
    expect(note.headline).toContain("Sync failed");
    expect(note.detail).toContain("1019");
    expect(note.stale).toBe("last reached COROS 14d ago");
  });

  it("a partial sync warns that nothing came from the watch", () => {
    const note = describeSync(
      { status: "partial", new_runs: 2, error: "fetch failed: boom", last_ok_at: null },
      null,
      NOW,
    );
    expect(note.tone).toBe("warn");
    expect(note.stale).toBe("never reached COROS");
    expect(note.hint).toContain("2 file(s)");
  });

  it("never-run prompts the first sync", () => {
    expect(describeSync({ status: "never-run" }, null, NOW)).toMatchObject({
      tone: "warn",
      headline: "Never synced",
    });
  });

  it("a request error outranks a stale-but-ok status", () => {
    const note = describeSync({ status: "ok", finished_at: "2026-08-03T11:55:00Z" }, "boom", NOW);
    expect(note.tone).toBe("error");
    expect(note.detail).toBe("boom");
  });
});
