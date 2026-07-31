export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Tài khoản người dùng '${identifier}' không tồn tại`);
    this.name = 'UserNotFoundError';
  }
}

export class CannotDisableSelfError extends Error {
  constructor() {
    super('ADMIN không thể tự vô hiệu hóa hoặc khóa chính tài khoản của mình');
    this.name = 'CannotDisableSelfError';
  }
}

export class UserEmailConflictError extends Error {
  constructor(email: string) {
    super(`Email '${email}' đã được sử dụng`);
    this.name = 'UserEmailConflictError';
  }
}

export class InvalidRoleError extends Error {
  constructor() {
    super('Một hoặc nhiều vai trò không hợp lệ');
    this.name = 'InvalidRoleError';
  }
}
