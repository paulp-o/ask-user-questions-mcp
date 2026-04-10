all:
	bun install
	bun run build
	bun link
	bun link auq-mcp-server
