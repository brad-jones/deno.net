import { ApiAppBuilder } from "../api/api_app_builder.ts";
import { PageRouteBuilder } from "./page_route_builder.ts";

/**
 * A builder designed for fullstack Web Apps.
 */
export class WebAppBuilder extends ApiAppBuilder {
  readonly pages: Omit<PageRouteBuilder, "build"> = new PageRouteBuilder(this.services, this.middleware, this.routes);

  override async build(): Promise<Deno.ServeDefaultExport> {
    await this.initLogging({ reset: true });
    await (this.pages as PageRouteBuilder).build();
    return this.buildHonoApp();
  }
}
