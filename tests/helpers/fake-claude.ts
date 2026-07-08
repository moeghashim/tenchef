import { writeFile } from "node:fs/promises";
import path from "node:path";
import { makeTempDir } from "./fake-bd";

// A stand-in for the Claude Code CLI: answers --version, and in -p mode reads
// the prompt from stdin and prints a canned plan-revision JSON.
export async function makeFakeClaude(): Promise<string> {
  const dir = await makeTempDir("tenchef-fake-claude-");
  const file = path.join(dir, "claude");
  await writeFile(
    file,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('9.9.9 (fake claude)');
  process.exit(0);
}
if (args.includes('-p')) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    console.log(JSON.stringify({
      productName: 'Pulse',
      summary: 'Fake revision for: ' + input.slice(0, 20),
      goals: ['One', 'Two', 'Three'],
      platforms: ['Web'],
      features: ['Search'],
      milestones: [{ phase: 'Foundation', items: ['Scaffold'] }],
      changeSummary: 'Fake change.'
    }));
    process.exit(0);
  });
} else {
  console.error('unknown fake claude args ' + args.join(' '));
  process.exit(1);
}
`,
    { mode: 0o755 }
  );
  return dir;
}
