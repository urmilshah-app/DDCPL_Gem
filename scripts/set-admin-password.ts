// ---------------------------------------------------------------------------
// Rotate the admin account password.
// Usage:  npm run admin:pass -- "NewStrongPassword123!"
//         npx tsx scripts/set-admin-password.ts "NewStrongPassword123!" [email]
// ---------------------------------------------------------------------------

import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const password = process.argv[2];
  const email = (process.argv[3] ?? 'admin@ddcpl.internal').toLowerCase();

  if (!password || password.length < 8) {
    console.error('Usage: npm run admin:pass -- "<password of at least 8 chars>" [email]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log(`Password updated for ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
