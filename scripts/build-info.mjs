// Build number = commits on main, so every push shows a higher one (CI checks out the full history for it).
import { execSync } from 'node:child_process';

const git = args => { try { return execSync('git ' + args, { encoding: 'utf8' }).trim(); } catch { return ''; } };
export const BUILD = { n: git('rev-list --count HEAD') || '?', sha: git('rev-parse --short HEAD'), date: git('log -1 --format=%cs') };
