import { expect } from "@std/expect";
import { outdent } from "@cspotcode/outdent";
import { DockerfileFormatter } from "../src/mod.ts";

Deno.test("DockerfileFormatter - smoke test", async () => {
  const formatter = new DockerfileFormatter();
  const input = `FROM ubuntu:20.04
RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm","start"]`;
  const output = await formatter.fmt(input);
  expect(output).toBe(outdent`
    FROM ubuntu:20.04
    RUN apt-get update && apt-get install -y curl
    WORKDIR /app
    COPY . .
    RUN npm install
    EXPOSE 3000
    CMD ["npm", "start"]

  `);
});
