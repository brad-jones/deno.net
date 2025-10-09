import { ApiAppBuilder } from "../api/api_app_builder.ts";

/**
 * A builder designed for fullstack Web Apps.
 *
 * The current implementation builds a Hono app (for the backend).
 * @see https://hono.dev/
 *
 * And uses Vite to bundle a frontend SPA.
 * @see https://vite.dev/
 */
export class WebAppBuilder extends ApiAppBuilder {}
