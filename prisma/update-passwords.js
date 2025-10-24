const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = '123456';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log('Updating all passwords to:', newPassword);
  console.log('Hashed password:', hashedPassword);

  // Update all doctors
  const doctors = await prisma.doctor.findMany();
  for (const doctor of doctors) {
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { password: hashedPassword }
    });
    console.log(`Updated doctor: ${doctor.email}`);
  }

  // Update all users (if they have passwords in the future)
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users (users don't have passwords in current schema)`);

  console.log('Password update completed!');
  console.log('All accounts now use password:', newPassword);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect()); 