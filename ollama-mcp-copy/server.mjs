import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";

const askSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
  system: z.string().optional(),
});

async function callOllamaGenerate({ prompt, model, system }) {
  const finalPrompt = system ? `${system}\n\n${prompt}` : prompt;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      prompt: finalPrompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.response ?? "";
}

const server = new Server(
  {
    name: "ollama-local",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ollama_prompt",
        description: "Send a prompt to a local Ollama model and return the response.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Prompt to send to Ollama" },
            model: { type: "string", description: "Optional Ollama model name" },
            system: { type: "string", description: "Optional system instruction prefix" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "ollama_list_models",
        description: "List all models available in the local OLLAMA instance.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "ollama_show_model_info",
        description: "Show detailed information about a specific model.",
        inputSchema: {
          type: "object",
          properties: {
            model: { type: "string", description: "The name of the model to inspect" }
          },
          required: ["model"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ollama_prompt") {
    const args = askSchema.parse(request.params.arguments ?? {});
    const output = await callOllamaGenerate(args);
    return {
      content: [{ type: "text", text: output }],
    };
  }
  
  if (request.params.name === "ollama_list_models") {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    const models = data.models.map(m => m.name).join("\n");
    return {
      content: [{ type: "text", text: models }],
    };
  }

  if (request.params.name === "ollama_show_model_info") {
    const { model } = z.object({ model: z.string() }).parse(request.params.arguments ?? {});
    const res = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
