#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import {
  ConnectionManager,
  RecipeService,
  EscrowService,
  FeeService,
} from './services/index.js';

class Mpl404Server {
  private server: Server;
  private recipeService: RecipeService;
  private escrowService: EscrowService;
  private feeService: FeeService;

  constructor() {
    // Initialize connection and services
    const connectionManager = ConnectionManager.getInstance();
    const connection = connectionManager.getConnection();
    const program = connectionManager.getProgram();

    this.recipeService = new RecipeService(connection, program);
    this.escrowService = new EscrowService(connection, program);
    this.feeService = new FeeService(connection, program);

    this.server = new Server(
      {
        name: 'mpl-404-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            analyze_recipe: {
              name: 'analyze_recipe',
              description: 'Analyze an MPL-404 recipe configuration',
              inputSchema: {
                type: 'object',
                properties: {
                  collection: {
                    type: 'string',
                    description: 'Collection address to analyze',
                  },
                },
                required: ['collection'],
              },
            },
            validate_escrow: {
              name: 'validate_escrow',
              description: 'Validate an MPL-404 escrow configuration',
              inputSchema: {
                type: 'object',
                properties: {
                  collection: {
                    type: 'string',
                    description: 'Collection address to validate',
                  },
                  escrow: {
                    type: 'string',
                    description: 'Escrow address to validate',
                  },
                },
                required: ['collection', 'escrow'],
              },
            },
            calculate_fees: {
              name: 'calculate_fees',
              description: 'Calculate fees for MPL-404 operations',
              inputSchema: {
                type: 'object',
                properties: {
                  operation: {
                    type: 'string',
                    description: 'Operation type (capture/release)',
                    enum: ['capture', 'release'],
                  },
                  amount: {
                    type: 'number',
                    description: 'Token amount',
                  },
                },
                required: ['operation', 'amount'],
              },
            },
            check_conversion_status: {
              name: 'check_conversion_status',
              description: 'Check NFT/token conversion status',
              inputSchema: {
                type: 'object',
                properties: {
                  asset: {
                    type: 'string',
                    description: 'Asset address to check',
                  },
                },
                required: ['asset'],
              },
            }
          },
          resources: {}
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_recipe',
          description: 'Analyze an MPL-404 recipe configuration',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection address to analyze',
              },
            },
            required: ['collection'],
          },
        },
        {
          name: 'validate_escrow',
          description: 'Validate an MPL-404 escrow configuration',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Collection address to validate',
              },
              escrow: {
                type: 'string',
                description: 'Escrow address to validate',
              },
            },
            required: ['collection', 'escrow'],
          },
        },
        {
          name: 'calculate_fees',
          description: 'Calculate fees for MPL-404 operations',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                description: 'Operation type (capture/release)',
                enum: ['capture', 'release'],
              },
              amount: {
                type: 'number',
                description: 'Token amount',
              },
            },
            required: ['operation', 'amount'],
          },
        },
        {
          name: 'check_conversion_status',
          description: 'Check NFT/token conversion status',
          inputSchema: {
            type: 'object',
            properties: {
              asset: {
                type: 'string',
                description: 'Asset address to check',
              },
            },
            required: ['asset'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'analyze_recipe':
          return this.handleAnalyzeRecipe(request.params.arguments);
        case 'validate_escrow':
          return this.handleValidateEscrow(request.params.arguments);
        case 'calculate_fees':
          return this.handleCalculateFees(request.params.arguments);
        case 'check_conversion_status':
          return this.handleCheckConversionStatus(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleAnalyzeRecipe(args: any) {
    const result = await this.recipeService.analyzeRecipe(args.collection);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleValidateEscrow(args: any) {
    const result = await this.escrowService.validateEscrow(args.collection, args.escrow);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCalculateFees(args: any) {
    const result = await this.feeService.calculateFees(args.operation, args.amount);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCheckConversionStatus(args: any) {
    const result = await this.escrowService.checkConversionStatus(args.asset);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MPL-404 MCP server running on stdio');
  }
}

const server = new Mpl404Server();
server.run().catch(console.error);
