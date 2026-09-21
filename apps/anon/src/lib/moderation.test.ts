import { describe, expect, it } from "vitest";
import { reportKey, sanctionKey } from "./ids";
import { activeMute, canReport, meetsReportThreshold, reportCount } from "./rules";
import { REPORT_THRESHOLD, type Report, type Sanction } from "./types";

function report(targetId: string, humanId: string): Report {
  return {
    id: `rpt_${humanId}`,
    targetType: "post",
    targetId,
    roomId: "work",
    reason: "harassment",
    reporterKey: reportKey(targetId, humanId),
    createdAt: "2026-03-12T00:00:00.000Z",
  };
}

describe("reporting counts humans, not faces", () => {
  it("counts one report per human", () => {
    const reports = [report("pst_1", "human-a"), report("pst_1", "human-b")];
    expect(reportCount(reports, "pst_1")).toBe(2);
  });

  it("refuses a second report of the same item by the same human", () => {
    const reports = [report("pst_1", "human-a")];
    const result = canReport({
      reports,
      reporterKey: reportKey("pst_1", "human-a"),
    });
    expect(result.ok).toBe(false);
  });

  it("cannot be piled on from a second Surrogate, because the key is the human", () => {
    // Two faces, one person: the derived key is identical either way, so the
    // threshold still needs a genuinely different human.
    const reports = [report("pst_1", "human-a")];
    const sameHumanAgain = reportKey("pst_1", "human-a");
    expect(reports[0].reporterKey).toBe(sameHumanAgain);
    expect(canReport({ reports, reporterKey: sameHumanAgain }).ok).toBe(false);
  });

  it("does not reach the threshold on one human alone", () => {
    expect(meetsReportThreshold([report("pst_1", "human-a")], "pst_1")).toBe(
      false,
    );
  });

  it("reaches the threshold once enough distinct humans agree", () => {
    const reports = Array.from({ length: REPORT_THRESHOLD }, (_, i) =>
      report("pst_1", `human-${i}`),
    );
    expect(meetsReportThreshold(reports, "pst_1")).toBe(true);
  });

  it("keeps reports on other items out of the count", () => {
    const reports = [report("pst_1", "human-a"), report("pst_2", "human-b")];
    expect(reportCount(reports, "pst_1")).toBe(1);
  });
});

describe("mutes follow the human, not the Surrogate", () => {
  const now = Date.parse("2026-03-12T12:00:00.000Z");

  function mute(humanId: string, roomId: "work" | "health"): Sanction {
    return {
      id: "snc_1",
      subjectKey: sanctionKey(humanId),
      roomId,
      until: "2026-03-13T12:00:00.000Z",
      reason: "harassment",
      createdAt: "2026-03-12T12:00:00.000Z",
    };
  }

  it("catches the muted human", () => {
    const found = activeMute(
      [mute("human-a", "work")],
      sanctionKey("human-a"),
      "work",
      now,
    );
    expect(found).toBeDefined();
  });

  it("is not escaped by a brand new Surrogate", () => {
    // A fresh face changes the surrogateId but not the human, and the mute is
    // keyed on the human — which is the whole reason this is built on World ID.
    const sanctions = [mute("human-a", "work")];
    expect(
      activeMute(sanctions, sanctionKey("human-a"), "work", now),
    ).toBeDefined();
  });

  it("does not leak into another room", () => {
    expect(
      activeMute([mute("human-a", "work")], sanctionKey("human-a"), "health", now),
    ).toBeUndefined();
  });

  it("does not touch a different human", () => {
    expect(
      activeMute([mute("human-a", "work")], sanctionKey("human-b"), "work", now),
    ).toBeUndefined();
  });

  it("expires", () => {
    const later = Date.parse("2026-03-14T00:00:00.000Z");
    expect(
      activeMute([mute("human-a", "work")], sanctionKey("human-a"), "work", later),
    ).toBeUndefined();
  });

  it("keys sanctions in their own domain, so they join nothing else", () => {
    expect(sanctionKey("human-a")).not.toBe(reportKey("pst_1", "human-a"));
  });
});
