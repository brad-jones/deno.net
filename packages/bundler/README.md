# @brad-jones/deno-net-bundler

A unified bundling solution for JavaScript and CSS assets in Deno applications,
providing multiple bundling strategies with intelligent caching.

## Features

- **Multiple JavaScript Bundlers**: Support for both Rolldown and Deno's built-in bundler
- **CSS Processing**: Tailwind CSS compilation and Lightning CSS processing
- **Smart Caching**: File-system based caching with SHA-256 hashing for optimal performance
- **Flexible Input Sources**: Bundle from URLs, files, or raw source code
- **TypeScript Ready**: Full TypeScript support with proper type definitions
- **Dependency Injection**: Integration with the deno-net container system

## Installation

```bash
deno add jsr:@brad-jones/deno-net-bundler
```

## Quick Start

### JavaScript Bundling

```typescript
import { DenoBundler } from "@brad-jones/deno-net-bundler";

const denoBundler = new DenoBundler();
const bundle = await denoBundler.fromFile("./src/main.ts");
console.log(bundle.srcCode); // Bundled JavaScript
console.log(bundle.srcMap); // Source map (if generated)
```

### CSS Bundling

```typescript
import { LightningBundler, TailwindBundler } from "@brad-jones/deno-net-bundler";

// Tailwind CSS compilation
const tailwindBundler = new TailwindBundler({
  sources: [
    { base: "./src", pattern: "**/*.{html,js,ts,jsx,tsx}", negated: false },
  ],
});
const tailwindBundle = await tailwindBundler.fromSrc(`
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
`);

// Lightning CSS processing
const lightningBundler = new LightningBundler({
  targets: [">= 0.25%"], // Browser targets
});
const cssBundle = await lightningBundler.fromFile("./styles.css");
```

## API Reference

### Base Bundler Interface

All bundlers implement the `IBundler` interface:

```typescript
interface IBundler {
  fromUrl(url: string): Promise<Bundle>;
  fromFile(filePath: string): Promise<Bundle>;
  fromSrc(srcCode: string, filePath?: string): Promise<Bundle>;
}

interface Bundle {
  srcCode: string;
  srcMap?: string;
}
```

### JavaScript Bundlers

#### RolldownBundler

Uses Rolldown (Rust-based bundler) for fast, modern bundling:

```typescript
const bundler = new RolldownBundler({
  // Rolldown input options
  rolldownInputOverrides: {
    platform: "browser",
    external: ["react", "react-dom"],
  },

  // Rolldown output options
  rolldownOutputOverrides: {
    format: "esm",
    minify: true,
  },

  // Deno plugin options
  denoPluginOverrides: {
    importMapFile: "./import_map.json",
  },

  // Deno config overrides
  denoConfigOverrides: {
    compilerOptions: {
      target: "ES2022",
    },
  },
});
```

#### DenoBundler

Uses Deno's built-in bundler:

```typescript
const bundler = new DenoBundler({
  denoBundlerOverrides: {
    platform: "browser",
    minify: true,
    sourcemap: true,
  },
});
```

#### Function Bundling

JavaScript bundlers support bundling functions directly:

```typescript
const bundle = await bundler.fromFunction(() => {
  console.log("Hello from bundled function!");
});
```

### CSS Bundlers

#### TailwindBundler

Compiles Tailwind CSS with content scanning:

```typescript
const bundler = new TailwindBundler({
  // Content source patterns
  sources: [
    { base: "./src", pattern: "**/*.{html,js,ts,jsx,tsx}", negated: false },
    { base: "./components", pattern: "**/*.tsx", negated: false },
  ],

  // Tailwind version (optional)
  version: "4.1.15",

  // Enable LightningCSS optimizations
  optimize: true,

  // Browser targets for CSS optimization
  targets: [">= 0.25%", "not dead"],

  // Generate source maps
  buildSrcMap: true,
});
```

#### LightningBundler

Fast CSS processing with Lightning CSS:

```typescript
const bundler = new LightningBundler({
  // Browser targets
  targets: [">= 0.25%"],

  // CSS processing options
  minify: true,
  sourceMap: true,
});
```

## Caching

All bundlers include intelligent caching based on input content and configuration:

- **Cache Key**: SHA-256 hash of source code, file path, and bundler options
- **Cache Location**: OS-appropriate cache directory (`~/.cache/deno-net-bundler` on Linux/macOS)
- **Cache Invalidation**: Automatic when source or options change

Disable caching:

```typescript
const bundler = new RolldownBundler({
  disableCache: true,
});
```

## Dependency Injection

The bundler integrates with the deno-net container system:

```typescript
import { Container } from "@brad-jones/deno-net-container";
import { IJsBundler, RolldownBundler } from "@brad-jones/deno-net-bundler";

const container = new Container();
container.addSingleton(IJsBundler, { useClass: RolldownBundler });

// Use in your services
class AssetService {
  constructor(private bundler = inject(IJsBundler)) {}

  async buildAssets() {
    return await this.bundler.fromFile("./src/app.ts");
  }
}
```

## Examples

### Building a Complete Web Application

```typescript
import { RolldownBundler, TailwindBundler } from "@brad-jones/deno-net-bundler";

// Configure bundlers
const jsBundler = new RolldownBundler({
  rolldownOutputOverrides: { minify: true },
});

const cssBundler = new TailwindBundler({
  sources: [{ base: "./src", pattern: "**/*.tsx", negated: false }],
  optimize: true,
});

// Bundle JavaScript
const jsBundle = await jsBundler.fromFile("./src/main.tsx");
await Deno.writeTextFile("./dist/app.js", jsBundle.srcCode);

// Bundle CSS
const cssBundle = await cssBundler.fromSrc(`
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  .custom-component {
    @apply bg-blue-500 text-white p-4 rounded;
  }
`);
await Deno.writeTextFile("./dist/styles.css", cssBundle.srcCode);
```

### Dynamic Asset Processing

```typescript
import { LightningBundler } from "@brad-jones/deno-net-bundler";

const bundler = new LightningBundler();

// Process CSS from various sources
const urlBundle = await bundler.fromUrl("https://cdn.example.com/styles.css");
const fileBundle = await bundler.fromFile("./theme.css");
const inlineBundle = await bundler.fromSrc(`
  .dynamic-styles {
    color: var(--primary-color);
    font-size: 1.2rem;
  }
`);

// Combine and optimize
const combinedCss = [urlBundle, fileBundle, inlineBundle]
  .map((bundle) => bundle.srcCode)
  .join("\n");
```

---

Part of the [deno.net](https://github.com/brad-jones/deno.net) ecosystem.
