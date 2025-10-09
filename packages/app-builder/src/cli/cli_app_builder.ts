import { AppBuilder } from "../app_builder.ts";

/**
 * A builder designed for CLI applications.
 *
 * The current implementation builds a Cliffy app.
 * @see https://cliffy.io/
 */
export class CliAppBuilder extends AppBuilder<unknown> {
  override build(): unknown {
    throw new Error("Method not implemented.");
  }
}
