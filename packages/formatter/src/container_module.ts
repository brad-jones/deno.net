import { ContainerModule } from "@brad-jones/deno-net-container";
import { HtmlFormatter, IHtmlFormatter } from "./html/html_formatter.ts";

export const dprintFormatting: ContainerModule = (c) => {
  c.addSingleton(IHtmlFormatter, HtmlFormatter);
};
