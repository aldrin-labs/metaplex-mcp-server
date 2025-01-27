# Metaplex MCP Server

[![smithery badge](https://smithery.ai/badge/metaplex-server)](https://smithery.ai/server/metaplex-server)

A Model Context Protocol (MCP) server for accessing Metaplex documentation and repository information.

## Features

- Search Metaplex documentation
- Get repository details from metaplex-foundation
- Search code across Metaplex repositories

## Usage

The server runs as an MCP server and can be accessed through the MCP protocol.

## Installation

### Installing via Smithery

To install Metaplex Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/metaplex-server):

```bash
npx -y @smithery/cli install metaplex-server --client claude
```

### Manual Installation
```bash
# Install and configure Metaplex MCP Server
cd ~/Documents/Cline/MCP && \
git clone https://github.com/metaplex-foundation/metaplex-mcp-server.git && \
cd metaplex-mcp-server && \
npm install && \
npm run build && \
echo '{
  "metaplex": {
    "command": "node",
    "args": ["'$(pwd)'/build/index.js"],
    "env": {}
  }
}' | jq -s '.[0] * .[1]' ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json - > /tmp/cline_mcp_settings.json && \
mv /tmp/cline_mcp_settings.json ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json && \
nohup node build/index.js > /dev/null 2>&1 &
```

## Development

```bash
# Install dependencies
npm install

# Build and run
npm run build && node build/index.js
```

## License

This project is released under The Unlicense. See [LICENSE](LICENSE) for details.
