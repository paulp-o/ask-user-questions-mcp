### Test FastMCP Server with CLI

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

These bash commands show how to clone the FastMCP repository, install dependencies, build the project, and then run a FastMCP server example using the CLI for development or inspection.

```Bash
git clone https://github.com/punkpeye/fastmcp.git
cd fastmcp

pnpm install
pnpm build

# Test the addition server example using CLI:
npx fastmcp dev src/examples/addition.ts
# Test the addition server example using MCP Inspector:
npx fastmcp inspect src/examples/addition.ts
```

---

### Create and Start FastMCP Server (TypeScript)

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

This TypeScript code demonstrates how to create a new FastMCP server instance, add a tool for addition, and start the server using stdio transport. It utilizes Zod for parameter validation.

```TypeScript
import { FastMCP } from "fastmcp";
import { z } from "zod"; // Or any validation library that supports Standard Schema

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.start({
  transportType: "stdio",
});
```

---

### FastMCP: Configure Server Instructions

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Shows how to provide descriptive instructions to a FastMCP server during initialization. These instructions can guide clients on how to use the server's features and can be incorporated into prompts for LLMs to enhance their understanding of available tools and resources.

```TypeScript
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  instructions:
    'Instructions describing how to use the server and its features.\n\nThis can be used by clients to improve the LLM\'s understanding of available tools, resources, etc. It can be thought of like a \"hint\" to the model. For example, this information MAY be added to the system prompt.',
});
```

---

### Return Audio Content with FastMCP

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

This example shows how to use the `audioContent` function in FastMCP to create content objects for audio. It demonstrates returning audio via URL, file path, or buffer, and how to structure the response.

```JavaScript
import { audioContent } from "fastmcp";

server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return audioContent({
      url: "https://example.com/audio.mp3",
    });

    // or...
    // return audioContent({
    //   path: "/path/to/audio.mp3",
    // });

    // or...
    // return audioContent({
    //   buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
    // });

    // or...
    // return {
    //   content: [
    //     await audioContent(...)
    //   ],
    // };
  },
});
```

---

### Enable Stateless Mode via CLI Argument

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Starts the FastMCP development server with HTTP streaming and stateless mode enabled using a command-line argument.

```bash
npx fastmcp dev src/server.ts --transport http-stream --port 8080 --stateless true
```

---

### Install FastMCP Package

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

This command installs the FastMCP package using npm, making it available for use in your Node.js project.

```Bash
npm install fastmcp
```

---

### Start FastMCP Server with HTTP Streaming

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Starts the FastMCP server using HTTP streaming transport on a specified port. This enables efficient data transfer for larger payloads.

```typescript
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});
```

---

### Enable Stateless Mode via Environment Variable

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Starts the FastMCP development server with HTTP streaming and stateless mode enabled by setting the FASTMCP_STATELESS environment variable.

```bash
FASTMCP_STATELESS=true npx fastmcp dev src/server.ts
```

---

### FastMCP: Request Sampling with Messages and System Prompt

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Provides an example of using the `requestSampling` method on a `FastMCPSession` object. It shows how to send messages, define a system prompt, include context, and set `maxTokens` for a sampling request, likely for interacting with a language model.

```TypeScript
await session.requestSampling({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "What files are in the current directory?",
      },
    },
  ],
  systemPrompt: "You are a helpful file system assistant.",
  includeContext: "thisServer",
  maxTokens: 100,
});
```

---

### Logging Messages in FastMCP Tools

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Illustrates how to use the `log` object provided in the context of a FastMCP tool's execution to send log messages to the client. It covers different logging levels like info and provides examples of passing data with logs.

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log }) => {
    log.info("Downloading file...", {
      url,
    });

    // ...

    log.info("Downloaded file");

    return "done";
  },
});
```

---

### Stream Data Processing Updates with FastMCP

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Illustrates how to combine streaming output with progress reporting in FastMCP. This example shows a tool that processes data incrementally, reporting numeric progress and streaming intermediate text updates using `reportProgress` and `streamContent`.

```javascript
server.addTool({
  name: "processData",
  description: "Process data with streaming updates",
  parameters: z.object({
    datasetSize: z.number(),
  }),
  annotations: {
    streamingHint: true,
  },
  execute: async (args, { streamContent, reportProgress }) => {
    const total = args.datasetSize;

    for (let i = 0; i < total; i++) {
      // Report numeric progress
      await reportProgress({ progress: i, total });

      // Stream intermediate results
      if (i % 10 === 0) {
        await streamContent({
          type: "text",
          text: `Processed ${i} of ${total} items...\n`,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return "Processing complete!";
  },
});
```

---

### Use Tool Annotations for Metadata in FastMCP

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Shows how to use tool annotations in FastMCP to provide metadata about a tool's behavior, such as a human-readable title, read-only status, and interaction with external entities. This example adds annotations to a tool that fetches content from a URL.

```typescript
server.addTool({
  name: "fetch-content",
  description: "Fetch content from a URL",
  parameters: z.object({
    url: z.string(),
  }),
  annotations: {
    title: "Web Content Fetcher", // Human-readable title for UI display
    readOnlyHint: true, // Tool doesn't modify its environment
    openWorldHint: true, // Tool interacts with external entities
  },
  execute: async (args) => {
    return await fetchWebpageContent(args.url);
  },
});
```

---

### FastMCP Stateless Mode Health Check Response

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Example JSON response from the `/ready` health check endpoint when the FastMCP server is running in stateless mode.

```json
{
  "mode": "stateless",
  "ready": 1,
  "status": "ready",
  "total": 1
}
```

---

### Add Country Poem Prompt with Auto-completion

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Creates a prompt for writing a poem about a country. It includes an auto-completion feature for the 'name' argument, suggesting 'Germany' when the input starts with 'Germ'.

```javascript
server.addPrompt({
  name: "countryPoem",
  description: "Writes a poem about a country",
  load: async ({ name }) => {
    return `Hello, ${name}!`;
  },
  arguments: [
    {
      name: "name",
      description: "Name of the country",
      required: true,
      complete: async (value) => {
        if (value === "Germ") {
          return {
            values: ["Germany"],
          };
        }

        return {
          values: [],
        };
      },
    },
  ],
});
```

---

### Embed Documentation Resource using Template

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Shows how to use `server.embedded()` with a resource template to fetch project documentation sections dynamically within a tool.

```js
// Define a resource template
server.addResourceTemplate({
  uriTemplate: "docs://project/{section}",
  name: "Project Documentation",
  mimeType: "text/markdown",
  arguments: [
    {
      name: "section",
      required: true,
    },
  ],
  async load(args) {
    const docs = {
      "getting-started": "# Getting Started\n\nWelcome to our project!",
      "api-reference": "# API Reference\n\nAuthentication is required.",
    };
    return {
      text: docs[args.section] || "Documentation not found",
    };
  },
});

// Use embedded resources in a tool
server.addTool({
  name: "get_documentation",
  description: "Retrieve project documentation",
  parameters: z.object({
    section: z.enum(["getting-started", "api-reference"]),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "resource",
          resource: await server.embedded(`docs://project/${args.section}`),
        },
      ],
    };
  },
});
```

---

### Claude Desktop Configuration for FastMCP Server in JSON

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Illustrates the JSON configuration required for Claude Desktop to connect to a FastMCP server, including command execution, arguments, and environment variables.

```JSON
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["tsx", "/PATH/TO/YOUR_PROJECT/src/index.ts"],
      "env": {
        "YOUR_ENV_VAR": "value"
      }
    }
  }
}
```

---

### Add Resource Returning Multiple Files

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how a `load` function can return multiple resources, simulating the retrieval of multiple files within a directory.

```ts
async load() {
  return [
    {
      text: "First file content",
    },
    {
      text: "Second file content",
    },
  ];
}
```

---

### Unsplash AI Image Server

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Enables AI agents to seamlessly search, recommend, and deliver professional stock photos from Unsplash. This server is built with FastMCP for AI integration.

```Python
This is a showcase of projects using FastMCP. The specific code for enabling AI agents to search and deliver Unsplash photos is found in the drumnation/unsplash-smart-mcp-server repository.
```

---

### Request Sampling with Options in TypeScript

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how to use the `requestSampling` method with advanced options such as progress callbacks, abort signals, timeouts, and total timeout configurations. This is useful for managing long-running requests and providing user feedback.

```TypeScript
await session.requestSampling(
  {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "What files are in the current directory?",
        },
      },
    ],
    systemPrompt: "You are a helpful file system assistant.",
    includeContext: "thisServer",
    maxTokens: 100,
  },
  {
    // Progress callback - called when progress notifications are received
    onprogress: (progress) => {
      console.log(`Progress: ${progress.progress}/${progress.total}`);
    },

    // Abort signal for cancelling the request
    signal: abortController.signal,

    // Request timeout in milliseconds (default: DEFAULT_REQUEST_TIMEOUT_MSEC)
    timeout: 30000,

    // Whether progress notifications reset the timeout (default: false)
    resetTimeoutOnProgress: true,

    // Maximum total timeout regardless of progress (no default)
    maxTotalTimeout: 60000,
  },
);
```

---

### Listening to Session Events in TypeScript

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how to subscribe to session events like `rootsChanged` and `error` using the `on` method. This allows for real-time updates and error handling within the application.

```TypeScript
session.on("rootsChanged", (event) => {
  console.log("Roots changed:", event.roots);
});
```

```TypeScript
session.on("error", (event) => {
  console.error("Error:", event.error);
});
```

---

### Stream Text Incrementally with FastMCP

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how to enable streaming for a tool in FastMCP by using the `streamingHint` annotation and the `streamContent` method to send partial results incrementally. It shows how to send initial content, simulate word-by-word generation with delays, and the options for returning void or a final result.

```javascript
server.addTool({
  name: "generateText",
  description: "Generate text incrementally",
  parameters: z.object({
    prompt: z.string(),
  }),
  annotations: {
    streamingHint: true, // Signals this tool uses streaming
    readOnlyHint: true,
  },
  execute: async (args, { streamContent }) => {
    // Send initial content immediately
    await streamContent({ type: "text", text: "Starting generation...\n" });

    // Simulate incremental content generation
    const words = "The quick brown fox jumps over the lazy dog.".split(" ");
    for (const word of words) {
      await streamContent({ type: "text", text: word + " " });
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
    }

    // When using streamContent, you can:
    // 1. Return void (if all content was streamed)
    // 2. Return a final result (which will be appended to streamed content)

    // Option 1: All content was streamed, so return void
    return;

    // Option 2: Return final content that will be appended
    // return "Generation complete!";
  },
});
```

---

### Return Image Content from Tool (Path)

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates returning an image from a FastMCP tool using `imageContent` with a local file path. This allows serving images stored on the server.

```javascript
import { imageContent } from "fastmcp";

server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return imageContent({
      path: "/path/to/image.png",
    });
  },
});
```

---

### Return Combination Types in FastMCP

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how to combine different content types (text, image, audio) within a tool's execution in FastMCP. This allows for rich responses to AI interactions.

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
        {
          type: "image",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "image/png",
        },
        {
          type: "audio",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "audio/mpeg",
        },
      ],
    };
  },

  // or...
  // execute: async (args) => {
  //   const imgContent = await imageContent({
  //     url: "https://example.com/image.png",
  //   });
  //   const audContent = await audioContent({
  //     url: "https://example.com/audio.mp3",
  //   });
  //   return {
  //     content: [
  //       {
  //         type: "text",
  //         text: "Hello, world!",
  //       },
  //       imgContent,
  //       audContent,
  //     ],
  //   };
  // },
});
```

---

### AI Media Generation Server

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

This project generates media using various AI models like Midjourney, Flux, Kling, LumaLabs, Udio, Chrip, and Trellis. It leverages the FastMCP framework for its backend.

```Python
This is a showcase of projects using FastMCP. The specific code for generating media using Midjourney/Flux/Kling/LumaLabs/Udio/Chrip/Trellis is found in the apinetwork/piapi-mcp-server repository.
```

---

### FastMCP: Listen to Server Events

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Demonstrates how to subscribe to server events like 'connect' and 'disconnect' using the `on` method in FastMCP. This allows you to react to client connection and disconnection events, logging relevant session information.

```TypeScript
server.on("connect", (event) => {
  console.log("Client connected:", event.session);
});

server.on("disconnect", (event) => {
  console.log("Client disconnected:", event.session);
});
```

---

### FastMCP Client: Connect and Call Tool with Headers

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Illustrates how a client can connect to a FastMCP server using `StreamableHTTPClientTransport` and include custom headers in its requests, such as `Authorization`. It then demonstrates calling a tool (`headerTool`) on the server and logging the result, which includes the headers passed from the client.

```JavaScript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const transport = new StreamableHTTPClientTransport(
  new URL(`http://localhost:8080/mcp`),
  {
    requestInit: {
      headers: {
        Authorization: "Test 123",
      },
    },
  },
);

const client = new Client({
  name: "example-client",
  version: "1.0.0",
});

(async () => {
  await client.connect(transport);

  // Call a tool
  const result = await client.callTool({
    name: "headerTool",
    arguments: {
      arg1: "value",
    },
  });

  console.log("Tool result:", result);
})().catch(console.error);
```

---

### AI Project/Task Manager

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

An advanced AI project and task manager powered by FastMCP. It leverages AI capabilities to streamline project management workflows.

```Python
This is a showcase of projects using FastMCP. The specific code for an advanced AI project/task manager powered by FastMCP is found in the eyaltoledano/claude-task-master repository.
```

---

### Create Tool with No Parameters (Empty Object)

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Shows how to define a FastMCP tool with explicitly empty parameters using an empty Zod object. This method is also fully compatible with all MCP clients.

```typescript
import { z } from "zod";

server.addTool({
  name: "sayHello",
  description: "Say hello",
  parameters: z.object({}), // Empty object
  execute: async () => {
    return "Hello, world!";
  },
});
```

---

### Meeting Bot and Data Management

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Create meeting bots, search transcripts, and manage recording data using this FastMCP-powered server. It facilitates efficient handling of meeting-related information.

```Python
This is a showcase of projects using FastMCP. The specific code for creating meeting bots and managing meeting data is found in the Meeting-Baas/meeting-mcp repository.
```

---

### HaloPSA Workflows Integration

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Integrates HaloPSA Workflows with AI assistants, providing enhanced automation and management capabilities. This server utilizes the FastMCP framework.

```Python
This is a showcase of projects using FastMCP. The specific code for HaloPSA Workflows integration with AI assistants is found in the ssmanji89/halopsa-workflows-mcp repository.
```

---

### Generative Media Platform Clients

Source: https://github.com/punkpeye/fastmcp/blob/main/README.md

Sunra.ai is a generative media platform built for developers, providing high-performance AI model inference capabilities. This repository includes FastMCP server implementations.

```Python
This is a showcase of projects using FastMCP. The specific code for Sunra.ai's generative media platform clients, including MCP server implementations, is found in the sunra-ai/sunra-clients repository.
```
