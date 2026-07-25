import { DataSource } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

export async function seedRoles(dataSource: DataSource): Promise<{
  adminRole: Role;
  userRole: Role;
}> {
  const roleRepo = dataSource.getRepository(Role);

  let adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
  if (!adminRole) {
    adminRole = roleRepo.create({
      code: 'ADMIN',
      name: 'Quản trị viên',
    });
    await roleRepo.save(adminRole);
    console.log('✅ Seeded Role: ADMIN');
  }

  let userRole = await roleRepo.findOne({ where: { code: 'USER' } });
  if (!userRole) {
    userRole = roleRepo.create({
      code: 'USER',
      name: 'Người dùng',
    });
    await roleRepo.save(userRole);
    console.log('✅ Seeded Role: USER');
  }

  return { adminRole, userRole };
}
