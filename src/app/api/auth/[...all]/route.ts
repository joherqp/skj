import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;
export const POST = async (req: Request) => {
    try {
        return await handler.POST(req);
    } catch (e) {
        console.error("BETTER_AUTH_ERROR:", e);
        throw e;
    }
};
