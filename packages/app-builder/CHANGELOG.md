# Changelog
All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -
## app-builder-v0.7.8 - 2025-10-30
#### Bug Fixes
- (**open-api-client**) same fix as last but for headers, path params & query string (quote property keys) - (ceeb165) - *brad-jones*
#### Miscellaneous Chores
- (**version**) open-api-client-v0.1.5 - (decd495) - github-actions[bot]

- - -

## app-builder-v0.7.7 - 2025-10-30
#### Bug Fixes
- (**open-api-client**) quote property keys - (51fe91a) - *brad-jones*
#### Miscellaneous Chores
- (**version**) open-api-client-v0.1.4 - (bd16197) - github-actions[bot]

- - -

## app-builder-v0.7.6 - 2025-10-30
#### Bug Fixes
- (**formatter**) forgot to await Deno.readFile in downloadWasmFormatter - (7540ce2) - *brad-jones*
#### Miscellaneous Chores
- (**version**) open-api-client-v0.1.3 - (8e1f56d) - github-actions[bot]
- (**version**) formatter-v0.1.3 - (18c2ef1) - github-actions[bot]

- - -

## app-builder-v0.7.5 - 2025-10-30
#### Bug Fixes
- (**formatter**) need to download the wasm module - (78f9e54) - *brad-jones*
#### Miscellaneous Chores
- (**version**) open-api-client-v0.1.2 - (5064622) - github-actions[bot]
- (**version**) formatter-v0.1.2 - (44172da) - github-actions[bot]

- - -

## app-builder-v0.7.4 - 2025-10-30
#### Bug Fixes
- (**open-api-client**) hard code default import specifiers - (ea9919d) - *brad-jones*
#### Miscellaneous Chores
- (**version**) open-api-client-v0.1.1 - (2994981) - github-actions[bot]

- - -

## app-builder-v0.7.3 - 2025-10-30
#### Miscellaneous Chores
- playing around with hmr - (14820bc) - brad-jones

- - -

## app-builder-v0.7.2 - 2025-10-29
#### Bug Fixes
- (**app-builder**) added writeOpenApiArtifacts method & deferred the route module loading - (b2d0f1e) - *brad-jones*

- - -

## app-builder-v0.7.1 - 2025-10-29
#### Miscellaneous Chores
- added another TODO comment about the wip HMR feature - (8166023) - brad-jones

- - -

## app-builder-v0.7.0 - 2025-10-29
#### Features
- (**app-builder**) started working on the web app builder implementation - (c9fc5cd) - *brad-jones*
- (**app-builder**) added the environment builder - (182881a) - *brad-jones*
- (**app-builder**) added open api client generation - (44eaecc) - *brad-jones*
#### Bug Fixes
- (**middleware**) overload order is important to help typescript infer the correct method signature - (fdd9131) - *brad-jones*
#### Miscellaneous Chores
- (**version**) middleware-v0.3.1 - (6f3e81f) - github-actions[bot]

- - -

## app-builder-v0.6.0 - 2025-10-17
#### Miscellaneous Chores
- **(version)** middleware-v0.3.0 - (56b59c3) - github-actions[bot]

- - -

## logging-v0.2.1 - 2025-10-17
#### Features
- **(logging)** added some actual logging to the http middleware - (81bfd69) - *brad-jones*
#### Miscellaneous Chores
- **(logging)** default to showing properties when using pretty formatter - (d81371f) - *brad-jones*
- **(version)** logging-v0.2.1 - (fe9197b) - github-actions[bot]
#### Refactoring
- **(app-builder)** openapi logic is now much more contained & decoupled from the main api builder. - (6b77925) - *brad-jones*

- - -

## app-builder-v0.5.0 - 2025-10-17
#### Miscellaneous Chores
- **(version)** middleware-v0.2.0 - (019f79a) - github-actions[bot]

- - -

## logging-v0.2.0 - 2025-10-17
#### Miscellaneous Chores
- **(version)** logging-v0.2.0 - (0b2c8e7) - github-actions[bot]

- - -

## http-context-v0.2.0 - 2025-10-17
#### Miscellaneous Chores
- **(version)** http-context-v0.2.0 - (fdcda7f) - github-actions[bot]

- - -

## configuration-v0.3.0 - 2025-10-17
#### Miscellaneous Chores
- **(version)** configuration-v0.3.0 - (022dd51) - github-actions[bot]

- - -

## container-v0.4.0 - 2025-10-17
#### Features
- **(container)** now tracks disposable objects and is now disposable it's self - (c77a42f) - *brad-jones*
#### Miscellaneous Chores
- **(version)** container-v0.4.0 - (cb367bb) - github-actions[bot]

- - -

## app-builder-v0.4.0 - 2025-10-16
#### Miscellaneous Chores
- **(version)** middleware-v0.1.3 - (4978dca) - github-actions[bot]

- - -

## logging-v0.1.4 - 2025-10-16
#### Miscellaneous Chores
- **(version)** logging-v0.1.4 - (6aa8a6c) - github-actions[bot]

- - -

## http-context-v0.1.3 - 2025-10-16
#### Miscellaneous Chores
- **(version)** http-context-v0.1.3 - (a1b37b8) - github-actions[bot]

- - -

## problem-details-v0.1.3 - 2025-10-16
#### Miscellaneous Chores
- **(version)** problem-details-v0.1.3 - (70f8061) - github-actions[bot]

- - -

## configuration-v0.2.0 - 2025-10-16
#### Miscellaneous Chores
- **(version)** configuration-v0.2.0 - (fae3f1b) - github-actions[bot]

- - -

## container-v0.3.2 - 2025-10-16
#### Continuous Integration
- **(cog)** should now release packages when dependencies change - (8488401) - *brad-jones*
#### Features
- **(configuration)** added fromFile & fromObject - (102df57) - *brad-jones*
#### Miscellaneous Chores
- **(version)** container-v0.3.2 - (a0fd9c7) - github-actions[bot]

- - -

## app-builder-v0.3.1 - 2025-10-16
#### Continuous Integration
- force a release of all packages - (1e75ef6) - brad-jones

- - -

## app-builder-v0.3.0 - 2025-10-16
#### Features
- **(configuration)** initial commit - (ed158f9) - *brad-jones*

- - -

## app-builder-v0.2.1 - 2025-10-15
#### Bug Fixes
- use jsr-dynamic-imports packageto workaround https://github.com/denoland/deno/discussions/26266 - (b651f5a) - brad-jones

- - -

## app-builder-v0.2.0 - 2025-10-14
#### Bug Fixes
- various linting issues from deno publish - (f391209) - brad-jones
#### Build system
- **(publish)** publish deno first to avoid creating tags and releases when we fail to actually publish - (e74da64) - *brad-jones*
#### Features
- **(app-builder)** added logging, middleware & openapi support - (55a8d0d) - *brad-jones*

- - -

## app-builder-v0.1.1 - 2025-10-09
#### Bug Fixes
- **(app-builder)** add types to resolve slow types warning - (889fcf1) - *brad-jones*
#### Build system
- move the dry run to a explicit lint task - (61986c1) - brad-jones
- dry run needs to allow for a dirty git repo - (b3bf4f9) - brad-jones
- run a dry run publish at the packaging stage - (64fa349) - brad-jones

- - -

## app-builder-v0.1.0 - 2025-10-09
#### Build system
- use the correct tag when publishing github releases - (1259037) - brad-jones
#### Features
- **(app-builder)** use a random free port by default - (2c8c1da) - *brad-jones*
- **(app-builder)** initial commit - (57c70e5) - *brad-jones*

- - -

Changelog generated by [cocogitto](https://github.com/cocogitto/cocogitto).