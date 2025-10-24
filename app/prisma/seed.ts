// @ts-ignore
import { PrismaClient } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('TomasTeaserLLC7', 10);

  const doctor = await prisma.doctor.upsert({
    where: { email: 'doctor@healthx.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'doctor@healthx.com',
      password,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@healthx.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'user@healthx.com',
    },
  });

  console.log({ doctor, user });
}

main().catch(e => {
  // @ts-ignore
  console.error(e);
  // @ts-ignore
  process.exit(1);
}).finally(() => prisma.$disconnect()); 