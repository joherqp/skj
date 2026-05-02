import fs from "fs";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

const envLocal = fs.readFileSync(".env.local", "utf-8");
const dbUrlMatch = envLocal.match(/DATABASE_URL=([^\n]+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : process.env.DATABASE_URL;

async function main() {
    const pool = new pg.Pool({ connectionString: dbUrl });
    
    const email = "admin@skjaya.my.id";
    const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (res.rows.length === 0) {
        console.log("User not found in users table.");
        process.exit(1);
    }
    const user = res.rows[0];
    console.log("User found:", user.id, user.email);

    // Create the hash using better-auth's own function
    const hash = await hashPassword("rahasia123");
    console.log("Generated hash using better-auth:", hash);

    const accRes = await pool.query("SELECT * FROM accounts WHERE \"userId\" = $1 AND \"providerId\" = 'credential'", [user.id]);
    if (accRes.rows.length > 0) {
        console.log("Credential account already exists. Updating password...");
        await pool.query("UPDATE accounts SET password = $1, \"updatedAt\" = NOW() WHERE \"userId\" = $2 AND \"providerId\" = 'credential'", [hash, user.id]);
        console.log("Password updated successfully!");
        process.exit(0);
    }

    console.log("Creating new credential account...");
    await pool.query(`
        INSERT INTO accounts 
        (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt") 
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [crypto.randomUUID(), user.id, email, "credential", hash]);

    console.log("Credential account created successfully. You can now login with password 'rahasia123'.");
    process.exit(0);
}
main();
