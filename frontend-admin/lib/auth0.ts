import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and
 * APP_BASE_URL are read from the environment by the SDK itself.
 * APP_BASE_URL is the origin only (no /admin): the SDK adds the base path.
 *
 * The audience is the backend API, so the access token in the session is one
 * `backend/src/auth/jwt.ts` accepts.
 */
export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});
