import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserOrmEntity } from '../../../modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { UserRoleOrmEntity } from '../../../modules/users/infrastructure/persistence/typeorm/entities/user-role.orm-entity';
import { RoleOrmEntity } from '../../../modules/users/infrastructure/persistence/typeorm/entities/role.orm-entity';

export async function seedAdminUser(
  dataSource: DataSource,
  adminRole: RoleOrmEntity,
): Promise<UserOrmEntity> {
  const userRepo = dataSource.getRepository(UserOrmEntity);
  const userRoleRepo = dataSource.getRepository(UserRoleOrmEntity);

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
