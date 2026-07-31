import { User } from '../entities/user';
import { Role } from '../entities/role';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserQueryOptions {
  search?: string;
  status?: string;
  role?: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<User>;
  save(user: User): Promise<User>;
  findAllAdmin(query: UserQueryOptions): Promise<User[]>;
  updateRoles(userId: string, roleCodes: string[]): Promise<User>;
  findRoleByCode(code: string): Promise<Role | null>;
}
