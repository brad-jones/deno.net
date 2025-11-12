import { $ } from "@david/dax";
import { expandGlob } from "@std/fs";
import { ClassicalClientGenerator, FunctionalClientGenerator } from "../src/mod.ts";

const generatorFactory = (clientType: "functional" | "classical") => {
  switch (clientType) {
    case "functional":
      return new FunctionalClientGenerator({
        validateRequests: true,
        validateResponses: true,
      });
    case "classical":
      return new ClassicalClientGenerator({
        validateRequests: true,
        validateResponses: true,
      });
  }
};

for await (
  const entry of expandGlob(`${import.meta.dirname}/**/*.ts`, {
    includeDirs: false,
  })
) {
  if (entry.path !== import.meta.filename) {
    await Deno.remove(entry.path);
  }
}

for await (
  const entry of expandGlob(`${import.meta.dirname}/**/*.{json,yaml}`, {
    includeDirs: false,
  })
) {
  for (const clientType of ["functional", "classical"] as const) {
    const generator = generatorFactory(clientType);

    const outputPath = entry.path.replace(
      /\.json|\.yaml/,
      `.${clientType}.ts`,
    );

    try {
      await generator.generateFromFile(entry.path, outputPath);
    } catch (e) {
      console.error(e);
      console.error("generateFromFile", entry.path, outputPath);
    }

    await $`deno check ${outputPath}`;
  }
}
