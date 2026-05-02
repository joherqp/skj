import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);
    const isAuthPage = request.nextUrl.pathname === "/login";
    const isApiRoute = request.nextUrl.pathname.startsWith("/api/auth");

    if (isAuthPage || isApiRoute) {
        return NextResponse.next();
    }

    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export default proxy;

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|icons|images|sw.js).*)"],
};
