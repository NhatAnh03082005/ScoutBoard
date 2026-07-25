import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../roles/entities/user-role.entity';
import { Role } from '../../roles/entities/role.entity';

export async function seedAdminUser(
  dataSource: DataSource,
  adminRole: Role,
): Promise<User> {
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const adminEmail = 'admin@scoutboard.com';
  let adminUser = await userRepo.findOne({ where: { email: adminEmail } });

  if (!adminUser) {
    const passwordHash = await bcrypt.hash('Admin@123456', 10);
    adminUser = userRepo.create({
      email: adminEmail,
      passwordHash,
      fullName: 'ScoutBoard System Admin',
      status: 'ACTIVE',
    });
    await userRepo.save(adminUser);
    console.log(`✅ Seeded User: ${adminEmail} (Password: Admin@123456)`);
  }

  const existingUserRole = await userRoleRepo.findOne({
    where: { userId: adminUser.id, roleId: adminRole.id },
  });

  if (!existingUserRole) {
    const userRole = userRoleRepo.create({
      userId: adminUser.id,
      roleId: adminRole.id,
    });
    await userRoleRepo.save(userRole);
    console.log(`✅ Assigned ADMIN role to ${adminEmail}`);
  }

  return adminUser;
}
