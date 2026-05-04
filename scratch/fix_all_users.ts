import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
dotenv.config({ path: '.env.local' });

async function fixAllUsers() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // 1. Get all users except admin
        const usersRes = await pool.query("SELECT id, email FROM \"users\" WHERE email != 'admin@skjaya.my.id'");
        const users = usersRes.rows;
        
        console.log(`Ditemukan ${users.length} user untuk disetel passwordnya.`);

        const hashedPassword = await hashPassword('password123');

        for (const user of users) {
            // Delete old credential if exists
            await pool.query('DELETE FROM "accounts" WHERE "userId" = $1 AND "providerId" = $2', [user.id, 'credential']);
            
            // Insert new credential
            await pool.query(`
                INSERT INTO "accounts" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [
                crypto.randomUUID(),
                user.id,
                user.email,
                'credential',
                hashedPassword
            ]);
            console.log(`Berhasil menyetel password untuk: ${user.email}`);
        }

        console.log("\nSelesai! Semua user sekarang bisa login dengan password: password123");
    } catch (e) {
        console.error("Gagal menyetel password massal:", e);
    } finally {
        await pool.end();
    }
}

fixAllUsers();
