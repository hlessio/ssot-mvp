# SSOT-3005 Dynamic System

A dynamic Single Source of Truth (SSOT) system where information (entities, attributes, relations) is managed centrally but dynamically and reactively. Changes propagate instantly to all UI interfaces across different browser windows with real-time schema evolution.

## Quick Start

### Prerequisites
- Node.js (v16+)
- Neo4j running locally (bolt://localhost:7687)
- Default Neo4j auth: neo4j/password

### Installation & Run
```bash
npm install
npm start
```

Open http://localhost:3000 to access the dashboard.

## Project Structure

```
/src/
├── /backend/           # Server-side code
│   ├── /core/         # Core engine (Schema, Entity, Relation management)
│   ├── /dao/          # Data access layer (Neo4j)
│   └── server.js      # Main Express server
└── /frontend/         # Client-side code
    ├── /components/   # Web Components
    ├── /services/     # Frontend services
    ├── /modules/      # UI modules
    └── /definitions/  # JSON templates

/tests/                # Test files
/docs/                 # Documentation
/archive/              # Legacy files and backups
```

## Key Features

- **Real-time Sync**: WebSocket + BroadcastChannel for instant data propagation
- **Schema Evolution**: Dynamic entity/relation schema that evolves as you use it
- **Cross-Window Sync**: Changes sync across multiple browser windows
- **Template-Driven UI**: JSON-defined modules that adapt to any entity type
- **Neo4j Backend**: Graph database for flexible data relationships

## Development

- `npm start` - Start the server
- `npm test` - Run core engine tests
- `npm run test:all` - Run all backend tests

See `CLAUDE.md` for detailed development guidance and architecture overview.

## Documentation

- `/docs/architecture/` - System architecture documents
- `/docs/development/` - Development guides and manuals
- `CLAUDE.md` - AI assistant context and development guide

## Evolution

This project has evolved from an MVP to a full-featured dynamic SSOT system. Historical files and the original MVP implementation are preserved in `/archive/mvp-original/` for reference.