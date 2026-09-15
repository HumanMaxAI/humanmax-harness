# `@humanmax/project-generator`

Template resolution, profile overlays, and safe writes. Owns generator.lock and file-ownership classes.

Filesystem writes stay here or in the CLI, never inside `@humanmax/core`.

Version 0.1.1 generates projects with exact npm versions of contracts, runtime and CLI, plus TypeScript and Node types. The project has build/typecheck scripts, an installed CLI command and an executable gateway eval. It requires Node 22.18 or later. Commit the npm-generated package lock for reproducible installation.

The library's optional `dependencyMode: "local-file"` exists for repository fixtures that need to test unpublished workspace code. The create CLI always uses the default published mode; it adds no separate wizard or command flag. The packed distribution test uses default generation and real package installation, not local fixture links.

The generated workflow remains manual-only. Upgrade coverage for subsequently added files and Core's handling of user-owned edits remain Preview limitations; this dependency repair does not implement upgrade apply or production enforcement.
