# WhatsMCP

Agente de IA para WhatsApp com suporte dinâmico a servidores MCP (Model Context Protocol).

## Funcionalidades

- Conecta ao WhatsApp via [Baileys](https://github.com/WhiskeySockets/Baileys) (multi-device, QR code)
- Usa Claude (Anthropic) como LLM com agentic loop completo (tool use)
- Gerencia servidores MCP **em runtime** — add/remove sem reiniciar
- Suporta todos os tipos de MCP: `stdio`, `http` (Streamable HTTP) e `sse`
- Painel web admin para ativar/desativar o agente por chat ou grupo
- System prompt global configurável via interface web
- Histórico de conversa persistido por chat (SQLite)

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript (ESM) |
| WhatsApp | @whiskeysockets/baileys |
| LLM | @anthropic-ai/sdk (claude-sonnet-4-6) |
| MCP | @modelcontextprotocol/sdk |
| API Admin | Express.js |
| Banco de dados | better-sqlite3 (SQLite, WAL mode) |
| Frontend | HTML/JS vanilla (sem build step) |

## Estrutura

```
src/
├── index.ts                    # Entry point
├── db/                         # SQLite + repositories
│   ├── database.ts
│   ├── schema.ts
│   └── repositories/
│       ├── chatRepository.ts
│       ├── messageRepository.ts
│       ├── mcpRepository.ts
│       └── settingsRepository.ts
├── mcp/
│   └── mcpManager.ts           # Gerenciador dinâmico de MCP servers
├── agent/
│   └── claudeAgent.ts          # Agentic loop com tool use
├── whatsapp/
│   ├── whatsappClient.ts       # Baileys + reconexão automática
│   ├── messageHandler.ts       # Processamento de mensagens
│   └── authState.ts            # Auth state persistido no SQLite
└── api/
    ├── server.ts
    └── routes/
        ├── status.ts           # GET /api/status (conexão + QR)
        ├── chats.ts            # Gerenciar chats
        ├── mcp.ts              # CRUD de MCP servers
        ├── settings.ts         # Configurações globais
        └── messages.ts         # Histórico por chat

public/                         # Painel admin (vanilla JS)
├── index.html                  # Dashboard + QR code
├── chats.html                  # Toggle agente por chat
├── mcp.html                    # Gerenciar MCP servers
└── settings.html               # System prompt + modelo
```

## Requisitos

- Node.js 18+
- npm
- Conta na [Anthropic](https://console.anthropic.com/) para a API key

## Instalação

```bash
git clone https://github.com/Captando/WhatsMCP.git
cd WhatsMCP
npm install
```

Configure o arquivo `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
NODE_ENV=development
```

## Uso

```bash
npm run dev
```

Acesse `http://localhost:3000`:

1. **Dashboard** — escaneie o QR code com o WhatsApp
2. **Chats** — ative o agente para os contatos/grupos desejados
3. **MCP Servers** — adicione servidores MCP (qualquer tipo)
4. **Settings** — configure o system prompt e o modelo

## Adicionando servidores MCP

### stdio (processo local)

| Campo | Exemplo |
|---|---|
| ID | `filesystem` |
| Nome | `Filesystem Local` |
| Tipo | `stdio` |
| Comando | `npx` |
| Args | `-y @modelcontextprotocol/server-filesystem /tmp` |

### HTTP / SSE (servidor remoto)

| Campo | Exemplo |
|---|---|
| ID | `meu-mcp` |
| Tipo | `http` ou `sse` |
| URL | `http://localhost:3001/mcp` |

Os servidores são adicionados e removidos **em tempo real** sem reiniciar a aplicação.

## API Admin

```
GET  /api/status                    → status WhatsApp + QR code (data URL)
GET  /api/chats                     → lista todos os chats conhecidos
PATCH /api/chats/:jid/agent         → { active: bool }
GET  /api/mcp-servers               → lista servidores MCP
POST /api/mcp-servers               → adiciona e conecta um servidor
DELETE /api/mcp-servers/:id         → remove e desconecta
PATCH /api/mcp-servers/:id/toggle   → ativa/desativa sem restart
GET  /api/settings                  → configurações globais
PUT  /api/settings                  → atualiza configurações
GET  /api/messages/:jid             → histórico de um chat
DELETE /api/messages/:jid           → limpa histórico de um chat
```

## Scripts

```bash
npm run dev     # desenvolvimento com hot reload (tsx watch)
npm run build   # compila TypeScript para dist/
npm run start   # executa versão compilada
```

## Licença

MIT
