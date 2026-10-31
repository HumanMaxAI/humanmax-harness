# `@humanmax/project-generator`

Template resolution, profile overlays, and safe writes. Owns generator.lock and file-ownership classes.

Filesystem writes stay here or in the CLI, never inside `@humanmax/core`.

Version 0.2.1 generates projects with exact npm versions of contracts, runtime and CLI, plus TypeScript and Node types. The project has build/typecheck scripts, an installed CLI command and an executable gateway eval. It requires Node 26 or later. Commit the npm-generated package lock for reproducible installation.

Generated Harness dependencies remain pinned to 0.2.0. Node 22 users must stay on the 0.1.x package line. Upgrade Node to 26 or later before installing 0.2.0.

The library's optional `dependencyMode: "local-file"` exists for repository fixtures that need to test unpublished workspace code. The create CLI always uses the default published mode; it adds no separate wizard or command flag. The packed distribution test uses default generation and real package installation, not local fixture links.

The generated workflow remains manual-only. Upgrade coverage for subsequently added files and Core's handling of user-owned edits remain Preview limitations; this dependency repair does not implement upgrade apply or production enforcement.

Version 0.2.1 includes a project-named `SECURITY.md` as a mergeable document. README explains the starter fixture, actual entry point, maintenance steps, and security boundaries. Generated AGENTS.md requires agents to update README and SECURITY.md when application behavior changes. The generator does not infer application features or automatically synchronize documentation after development.

The security reporting channel remains explicitly unconfigured until the project maintainer supplies it. Upgrade dry-run previews missing documents and preserves user content.
