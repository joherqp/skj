import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hashPassword } from 'better-auth/crypto';
dotenv.config({ path: '.env.local' });

async function fixSafei() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // 1. Get Safei ID
        const userRes = await pool.query("SELECT id FROM \"users\" WHERE email = 'safei@skjaya.id'");
        const userId = userRes.rows[0]?.id;
        if (!userId) throw new Error("User safei not found");

        // 2. Hash the password 'password123'
        const hashedPassword = await hashPassword('password123');

        // 3. Insert or Update into accounts table
        // Better Auth uses 'account' table (singular in our view, plural 'accounts' in DB)
        // Let's check the actual table name. Better Auth default is 'account'.
        // In your system, it seems to be 'accounts' (mapped to view 'account').
        
        await pool.query('DELETE FROM "accounts" WHERE "userId" = $1 AND "providerId" = $2', [userId, 'credential']);
        
        await pool.query(`
            INSERT INTO "accounts" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [
            crypto.randomUUID(),
            userId,
            'safei@skjaya.id',
            'credential',
            hashedPassword
        ]);

        console.log("Password Safei berhasil disetel ke: password123");
    } catch (e) {
        console.error("Gagal menyetel password:", e);
    } finally {
        await pool.end();
    }
}

fixSafei();
