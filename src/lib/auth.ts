import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Better Auth expects singular table names: "user", "session", "account", "verification"
// We created DB views that map those to the actual tables: "users", "sessions", "accounts", "verifications"
export const auth = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    user: {
        fields: {
            // Map Better Auth standard fields → actual DB column names (snake_case)
            name: "nama",
            emailVerified: "email_verified",
            createdAt: "created_at",
            updatedAt: "updated_at",
            image: "avatar_url",
        },
        additionalFields: {
            username: {
                type: "string",
                required: false,
                fieldName: "username",
            },
            nama: {
                type: "string",
                required: false,
                fieldName: "nama",
            },
            telepon: {
                type: "string",
                required: false,
                fieldName: "telepon",
            },
            roles: {
                type: "string[]",
                required: false,
                defaultValue: ["staff"],
                fieldName: "roles",
            },
            cabangId: {
                type: "string",
                required: false,
                fieldName: "cabang_id",
            },
            kodeUnik: {
                type: "string",
                required: false,
                fieldName: "kode_unik",
            },
            isActive: {
                type: "boolean",
                required: false,
                defaultValue: true,
                fieldName: "is_active",
            },
            posisi: {
                type: "string",
                required: false,
                fieldName: "posisi",
            },
            alamat: {
                type: "string",
                required: false,
                fieldName: "alamat",
            },
            provinsi: {
                type: "string",
                required: false,
                fieldName: "provinsi",
            },
            kota: {
                type: "string",
                required: false,
                fieldName: "kota",
            },
            kecamatan: {
                type: "string",
                required: false,
                fieldName: "kecamatan",
            },
            kelurahan: {
                type: "string",
                required: false,
                fieldName: "kelurahan",
            },
            kodePos: {
                type: "string",
                required: false,
                fieldName: "kode_pos",
            },
            isDemo: {
                type: "boolean",
                required: false,
                defaultValue: false,
                fieldName: "is_demo",
            },
            startDate: {
                type: "date",
                required: false,
                fieldName: "start_date",
            },
            endDate: {
                type: "date",
                required: false,
                fieldName: "end_date",
            },
        },
    },
    debug: true,
});
