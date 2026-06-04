import { describe, it, expect } from "vitest";
import { parseBriefForConsensus } from "./brief.js";

describe("parseBriefForConsensus", () => {
  it("handles single paragraph (question only)", () => {
    const result = parseBriefForConsensus("Is this ready for release?");
    expect(result.question).toBe("Is this ready for release?");
    expect(result.context).toBeUndefined();
  });

  it("handles question with context", () => {
    const brief = `Is gordo-roundtable ready for v1.0?

## Context
- 96 tests passing
- CLI cleaned up
- README rewritten`;

    const result = parseBriefForConsensus(brief);
    expect(result.question).toBe("Is gordo-roundtable ready for v1.0?");
    expect(result.context).toContain("96 tests passing");
    expect(result.context).toContain("## Context");
  });

  it("trims whitespace", () => {
    const brief = `

  What should we do?

  Some context here.

`;
    const result = parseBriefForConsensus(brief);
    expect(result.question).toBe("What should we do?");
    expect(result.context).toBe("Some context here.");
  });

  it("handles multi-line question (first paragraph)", () => {
    const brief = `Should we merge this PR given
the failing CI and the deadline?

The CI is failing on a flaky test.
Deadline is tomorrow.`;

    const result = parseBriefForConsensus(brief);
    expect(result.question).toContain("Should we merge");
    expect(result.question).toContain("the deadline?");
    expect(result.context).toContain("flaky test");
  });

  it("handles empty context (blank after question)", () => {
    const brief = `Is this good?

`;
    const result = parseBriefForConsensus(brief);
    expect(result.question).toBe("Is this good?");
    expect(result.context).toBeUndefined();
  });
});
