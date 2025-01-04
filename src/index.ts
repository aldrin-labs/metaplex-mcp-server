#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const GITHUB_API_URL = 'https://api.github.com';
const METAPLEX_ORG = 'metaplex-foundation';
const CACHE_DIR = path.join(process.cwd(), '.cache');
const DOCS_URL = 'https://docs.metaplex.com';

class MetaplexServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: 'metaplex-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'metaplex://docs',
          name: 'Metaplex Documentation',
          description: 'Complete Metaplex documentation',
          mimeType: 'text/html'
        }
      ],
    }));

    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'metaplex://repos/{repo}/files/{path}',
            name: 'Metaplex Repository File',
            description: 'Access files from Metaplaex repositories',
            mimeType: 'text/plain'
          }
        ],
      })
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_docs',
          description: 'Search Metaplex documentation',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          }
        },
        {
          name: 'get_repo',
          description: 'Get Metaplaex repository details',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string' }
            },
            required: ['repo']
          }
        },
        {
          name: 'search_code',
          description: 'Search code in Metaplaex repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              repo: { type: 'string' }
            },
            required: ['query']
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'search_docs':
          return this.handleSearchDocs(request.params.arguments);
        case 'get_repo':
          return this.handleGetRepo(request.params.arguments);
        case 'search_code':
          return this.handleSearchCode(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleSearchDocs(args: any) {
    const query = args.query;
    if (typeof query !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid query parameter');
    }

    const response = await axios.get(DOCS_URL);
    const $ = cheerio.load(response.data);
    const results = $('body')
      .find('*')
      .filter((_, el) => $(el).text().includes(query))
      .map((_, el) => $(el).text())
      .get();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  private async handleGetRepo(args: any) {
    try {
      const repo = args.repo || 'metaplex-program-library';
      console.error(`Fetching repository: ${repo}`);
      
      const { data } = await axios.get(`${GITHUB_API_URL}/repos/${METAPLEX_ORG}/${repo}`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              name: data.name,
              description: data.description,
              stars: data.stargazers_count,
              forks: data.forks_count,
              url: data.html_url
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch repository: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private async handleSearchCode(args: any) {
    const { query, repo } = args;
    if (typeof query !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid query parameter');
    }

    const searchUrl = `${GITHUB_API_URL}/search/code?q=${encodeURIComponent(query)}+repo:${METAPLEX_ORG}/${repo || '*'}`;
    const { data } = await axios.get(searchUrl);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data.items.map((item: any) => ({
            path: item.path,
            repository: item.repository.full_name,
            url: item.html_url
          })), null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    
    // Add timeout for connection
    const timeout = setTimeout(() => {
      console.error('MCP connection timed out after 30 seconds');
      process.exit(1);
    }, 30000);

    console.error('Attempting to connect to MCP client...');
    await this.server.connect(transport);
    clearTimeout(timeout);
    
    console.error('Metaplex MCP server successfully connected');
    console.error('Ready to handle requests');
  }
}

const server = new MetaplexServer();
server.run().catch(console.error);
