// Generate local-only secrets. Refuses to overwrite an existing .dev.vars file.
import {randomBytes} from 'node:crypto';
import {writeFile, access} from 'node:fs/promises';

const filename = '.dev.vars';
try {
  await access(filename);
  console.log(filename + ' already exists — no changes made.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const token = randomBytes(32).toString('hex');
  const contents = 'ADMIN_TOKEN=' + token + '\nCHECKOUT_ENABLED=false\n';
  await writeFile(filename, contents, {flag:'wx',mode:0o600});
  console.log('Local-only secrets written to '+filename+'. Keep this file private.');
}
