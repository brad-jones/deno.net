# TODO List

- don't bundle imports
  - ie: translate the local import urls into ones that hit the server and then we bundle each file individually.
  - This will likely be a pre-req to be able to do HMR properly.

- hot module reloading
  - https://docs.deno.com/runtime/getting_started/command_line_interface/#hot-module-replacement-mode
  - https://github.com/denoland/deno/issues/31053
  - https://github.com/denoland/deno/issues/25600
  - https://github.com/denoland/deno/issues/30293
  - https://bjornlu.com/blog/hot-module-replacement-is-easy
  - https://vite.dev/guide/api-hmr
  - https://www.npmjs.com/package/esm-hmr
  - https://github.com/olefjaerestad/hmr
  - https://www.youtube.com/watch?v=xKzG5rB94W0
  - https://github.com/vitejs/vite/blob/main/packages/vite/src/shared/hmr.ts

  addEventListener("hmr", (e) => {
  console.log("HMR triggered", e.detail.path);
  });

  - ok so HMR seems a bit out of reach right now. I thought there might have
    been some off the shelf standalone solutions. But all the HMR stuff is bundled,
    in the bundlers. eg: Vite & friends.

  - The server side file watching bit is done, easy as, see above.
  - we would need:
    - websocket client/server to proxy the hmr events to the client - not hard just need time to build
    - then we need the equivalent of the "import.meta.hot" api for modules to implement & we need to inject that into our pages.
    - I think this is where I would like to make that a standalone library and not nessarily tie it to deno.net

- figure out how to incorporate shadcn, (tailwind plus maybe?) and any other decent tailwind components libs

- other CSS in JS frameworks
  - https://panda-css.com/
  - https://stitches.dev/
  - others?

- need to figure out how to best support multiple different JSX rendering engines
  - Hono
  - Preact
  - React
  - others?

- consider if we can offer support for other tech not based on JSX
  - Vue
  - Svelte
  - others?

- The patterns that we will be able to support:
  - Traditional 100% SSR :done:
  - Hydrated SSR Islands :done:
  - Client Only Islands :done:
  - Full Page SPAs :need an example, but yeah done:
  - htmx & friends????
    - more of curiosity than anything else - I think JSX is the way to go

- databases???
  - What does the data access layer look like in the JS/TS world?
