# FastMCP Boilerplate

A boilerplate for [FastMCP](https://github.com/punkpeye/fastmcp).

This boilerplate is a good starting point for building an MCP server. It includes a basic setup for testing, linting, formatting, and publishing to NPM.

## Development

To get started, clone the repository and install the dependencies.

```bash
git clone https://github.com/punkpeye/fastmcp-boilerplate.git
cd fastmcp-boilerplate
npm install
npm run dev
```

> [!NOTE]
> If you are starting a new project, you may want to fork [fastmcp-boilerplate](https://github.com/punkpeye/fastmcp-boilerplate) and start from there.

### Start the server

If you simply want to start the server, you can use the `start` script.

```bash
npm run start
```

However, you can also interact with the server using the `dev` script.

```bash
npm run dev
```

This will start the server and allow you to interact with it using CLI.

### Testing

A good MCP server should have tests. However, you don't need to test the MCP server itself, but rather the tools you implement.

```bash
npm run test
```

In the case of this boilerplate, we only test the implementation of the `add` tool.

### Linting

Having a good linting setup reduces the friction for other developers to contribute to your project.

```bash
npm run lint
```

This boilerplate uses [Prettier](https://prettier.io/), [ESLint](https://eslint.org/) and [TypeScript ESLint](https://typescript-eslint.io/) to lint the code.

### Formatting

Use `npm run format` to format the code.

```bash
npm run format
```

### GitHub Actions

This repository has a GitHub Actions workflow that runs linting, formatting, tests, and publishes package updates to NPM using [semantic-release](https://semantic-release.gitbook.io/semantic-release/).

In order to use this workflow, you need to:

1. Add `NPM_TOKEN` to the repository secrets
   1. [Create a new automation token](https://www.npmjs.com/settings/punkpeye/tokens/new)
   2. Add token as `NPM_TOKEN` environment secret (Settings → Secrets and Variables → Actions → "Manage environment secrets" → "release" → Add environment secret)
1. Grant write access to the workflow (Settings → Actions → General → Workflow permissions → "Read and write permissions")
