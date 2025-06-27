# SSOT-3005 Examples - Production Ready Demos

**Status**: Production-ready system demos (27 June 2025)  
**All demos tested and verified functional**

## 🚀 Active Production Demos

### Advanced Features

- **`realtime-sync-demo.html`** - Complete real-time bidirectional sync demo
  - Callsheet + Contact Card integration
  - WebSocket + BroadcastChannel sync
  - Intrinsic vs contextual attributes demonstration

- **`simple-evolved-table-demo.html`** - Enterprise-grade table collaboration
  - Real-time multi-user editing
  - Smart debounce system
  - Professional spreadsheet experience

- **`callsheet-demo.html`** - Production callsheet implementation
  - Real-time collaboration
  - Entity-module relationships
  - Contextual attribute management

### Development Tools

- **`websocket-test.html`** (basic/) - WebSocket debugging interface
  - Real-time message monitoring
  - Connection testing tools
  - Development debugging

- **`debug-logger.html`** (basic/) - System logging utility
  - API debugging
  - Performance monitoring
  - Development diagnostics

## 🏗️ Canvas Prototype

**Separate Svelte Application**: `src/frontend/canvas-prototype/`  
**Demo URL**: http://localhost:5174/  
**Status**: ✅ Fully integrated with backend SSOT system

## 📦 Archived Development History

Historical demos and phase development files moved to:
- `archive/phase-development-demos/basic/`
- `archive/phase-development-demos/advanced/`
- `archive/phase-development-demos/phase-demos/`

## 🎯 System Status

- **Backend**: 35/35 API endpoints functional (100%)
- **Canvas**: Fully integrated with Neo4j persistence
- **Real-time**: WebSocket + BroadcastChannel sync working
- **Production**: Ready for deployment

All demos represent the current production-ready state of SSOT-3005.

## Usage

To run any demo:
1. Ensure the backend server is running: `npm start` (port 3000)
2. For Canvas Prototype: `cd src/frontend/canvas-prototype && npm run dev` (port 5174)
3. Navigate to `http://localhost:3000/examples/[category]/[demo-file].html`