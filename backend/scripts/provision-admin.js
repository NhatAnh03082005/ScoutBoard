const bcrypt = require('bcryptjs');
const { Client } = require('pg');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function provisionAdmin() {
  const adminEmail = required('ADMIN_EMAIL').trim().toLowerCase();
  const adminPassword = required('ADMIN_PASSWORD');
  const adminFullName =
    process.env.ADMIN_FULL_NAME?.trim() || 'ScoutBoard System Admin';

  const client = new Client({
    host: required('POSTGRES_HOST'),
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
    database: required('POSTGRES_DB'),
    ssl:
      process.env.POSTGRES_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    const roleResult = await client.query(
      `INSERT INTO roles (code, name)
       VALUES ('ADMIN', 'Quản trị viên')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         status = 'ACTIVE',
         failed_login_attempts = 0,
         lockout_count = 0,
         locked_until = NULL,
         last_failed_login_at = NULL,
         updated_at = now()
       RETURNING id`,
      [adminEmail, passwordHash, adminFullName],
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userResult.rows[0].id, roleResult.rows[0].id],
    );
    await client.query('COMMIT');
    console.log(`[provision-admin] ADMIN account is ready: ${adminEmail}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

provisionAdmin().catch((error) => {
  console.error('[provision-admin] Failed:', error.message);
  process.exitCode = 1;
});
