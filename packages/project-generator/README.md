# `@humanmax/project-generator`

Template resolution, profile overlays, and safe writes. Owns generator.lock and file-ownership classes.

Filesystem writes stay here or in the CLI, never inside `@humanmax/core`.

Version 0.2.0 generates projects with exact npm versions of contracts, runtime and CLI, plus TypeScript and Node types. The project has build/typecheck scripts, an installed CLI command and an executable gateway eval. It requires Node 26 or later. Commit the npm-generated package lock for reproducible installation.

Version 0.2.0 pins all generated Harness dependencies to 0.2.0. Node 22 users must stay on the 0.1.x package line. Upgrade Node to 26 or later before installing 0.2.0.

The library's optional `dependencyMode: "local-file"` exists for repository fixtures that need to test unpublished workspace code. The create CLI always uses the default published mode; it adds no separate wizard or command flag. The packed distribution test uses default generation and real package installation, not local fixture links.

The generated workflow remains manual-only. Upgrade coverage for subsequently added files and Core's handling of user-owned edits remain Preview limitations; this dependency repair does not implement upgrade apply or production enforcement.
