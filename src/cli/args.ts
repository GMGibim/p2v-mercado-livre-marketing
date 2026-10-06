export function parseArgs(argv = process.argv.slice(2)) {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[a.slice(2)] = next;
      i++;
    } else {
      flags[a.slice(2)] = true;
    }
  }
  return { positional, flags };
}

// Prints errors as plain messages (no stack) so agents and people can read them.
export async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
