## ADDED Requirements

### Requirement: Bun Runtime Environment

The development environment SHALL use Bun 1.1+ as the primary runtime and package manager.

#### Scenario: Package installation

- **WHEN** a developer clones the repository
- **THEN** they SHALL run `bun install` to install dependencies
- **AND** a `bun.lock` file SHALL be generated (text format)

#### Scenario: Development server

- **WHEN** a developer runs `bun run dev`
- **THEN** the FastMCP development server SHALL start with web inspector

#### Scenario: TypeScript execution

- **WHEN** a developer runs `bun run start`
- **THEN** Bun SHALL execute TypeScript files directly without prior compilation

#### Scenario: Test execution

- **WHEN** a developer runs `bun test`
- **THEN** Vitest SHALL execute all test files

### Requirement: Production Build

The project SHALL use TypeScript compiler (tsc) for production builds to ensure compatibility with npm package consumers.

#### Scenario: Build process

- **WHEN** `bun run build` is executed
- **THEN** tsc SHALL compile TypeScript to JavaScript in the `dist/` directory
- **AND** the output SHALL be compatible with Node.js runtime

#### Scenario: Pre-publish hook

- **WHEN** the package is being published
- **THEN** the `prepublishOnly` script SHALL run `bun run build`

### Requirement: Package Manager Compatibility

The published package SHALL be installable via any npm-compatible package manager.

#### Scenario: npm installation

- **WHEN** a user runs `npm install -g auq-mcp-server`
- **THEN** the package SHALL install and function correctly

#### Scenario: Bun installation

- **WHEN** a user runs `bun add -g auq-mcp-server`
- **THEN** the package SHALL install and function correctly

#### Scenario: pnpm installation

- **WHEN** a user runs `pnpm add -g auq-mcp-server`
- **THEN** the package SHALL install and function correctly

### Requirement: CI/CD Environment

The CI/CD pipeline SHALL use Bun for all automated tasks.

#### Scenario: GitHub Actions setup

- **WHEN** a CI workflow runs
- **THEN** it SHALL use `oven-sh/setup-bun` action to install Bun
- **AND** it SHALL cache Bun dependencies for faster subsequent runs

#### Scenario: CI test execution

- **WHEN** CI runs tests
- **THEN** it SHALL use `bun test` command

#### Scenario: CI build execution

- **WHEN** CI builds the project
- **THEN** it SHALL use `bun run build` command

### Requirement: Postinstall Detection

The postinstall script SHALL detect the package manager used for installation and provide appropriate instructions.

#### Scenario: Bun global install detection

- **WHEN** the package is installed globally via Bun
- **THEN** the postinstall script SHALL detect Bun installation
- **AND** provide Bun-specific shell configuration instructions

#### Scenario: npm global install detection

- **WHEN** the package is installed globally via npm
- **THEN** the postinstall script SHALL detect npm installation
- **AND** provide npm-specific shell configuration instructions

#### Scenario: Local install

- **WHEN** the package is installed locally (not globally)
- **THEN** the postinstall script SHALL skip shell configuration prompts
