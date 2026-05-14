import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export function solveSetCover(
  queues: string[],
  fumens: string[],
  queueToFumens: Map<string, string[]>,
  timeLimit?: number
): { selected: string[] | null; status: string } {
  const fumenToIdx = new Map(fumens.map((f, i) => [f, i]));
  const idxToFumen = new Map(fumens.map((f, i) => [i, f]));

  let lp = "Minimize\n obj: ";
  lp += fumens.map((_, i) => `x${i}`).join(" + ");
  lp += "\nSubject To\n";

  let cIdx = 0;
  for (const q of queues) {
    const covering = queueToFumens.get(q) || [];
    if (covering.length === 0) continue;
    lp += ` c${cIdx++}: ${covering.map((f) => `x${fumenToIdx.get(f)}`).join(" + ")} >= 1\n`;
  }

  lp += "Binary\n" + fumens.map((_, i) => ` x${i}`).join("\n") + "\nEnd\n";

  const timestamp = Date.now();
  const lpFile = join(tmpdir(), `setcover_${timestamp}.lp`);
  const solFile = join(tmpdir(), `setcover_${timestamp}.sol`);

  writeFileSync(lpFile, lp);

  try {
    const args = [lpFile, "--solution_file", solFile];
    if (timeLimit !== undefined) {
      args.push("--time_limit", String(timeLimit));
    }

    execFileSync("highs", args, {
      stdio: "pipe",
      maxBuffer: 100 * 1024 * 1024,
    });

    if (!existsSync(solFile)) {
      return { selected: null, status: "No solution file" };
    }

    const sol = readFileSync(solFile, "utf-8");
    const selected: string[] = [];

    for (const line of sol.split("\n")) {
      const match = line.match(/^x(\d+)\s+([\d.e+-]+)/);
      if (match && parseFloat(match[2]) > 0.5) {
        selected.push(idxToFumen.get(parseInt(match[1]))!);
      }
    }

    return { selected, status: "Optimal" };
  } catch (err: any) {
    console.error("HiGHS error:", err.stderr?.toString() || err.message);
    return { selected: null, status: "Error" };
  } finally {
    try { unlinkSync(lpFile); } catch {}
    try { unlinkSync(solFile); } catch {}
  }
}


