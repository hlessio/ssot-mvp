# CLAUDE.md

> **META-PROMPT FOR AI ASSISTANTS:**
> This file serves as a high-level context document for the SSOT-3005 project. It should be read and understood before working on any code in this repository. 
> 
> **IMPORTANT:** This document MUST be updated every time a new feature is added, modified, or when the architecture evolves. When making changes to the codebase, always update this file to reflect the current state of the system.
> 
> **PURPOSE:** Provides essential context about project architecture, development workflows, and key components to enable productive work without requiring deep exploration of the entire codebase.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview: SSOT-3005 Dynamic System

This is a dynamic Single Source of Truth (SSOT) system where information (entities, attributes, relations) is managed centrally but dynamically and reactively. Changes propagate instantly to all UI interfaces (modules) displaying that data, even across different browser windows. The system enables real-time evolution of information schemas (entity types, attributes).

### High-Level Functioning

**Backend (Node.js, Express, Neo4j, WebSocket):**
- Manages core business logic, data persistence on Neo4j, and real-time communication
- Defines and manages entity and relation schemas (what can exist and how it's structured)  
- Stores and retrieves entity and relation instances
- Propagates data and schema changes to all connected frontend clients via WebSocket

**Frontend (Vanilla JavaScript, Web Components + Svelte):**
- Provides user interfaces (modules) to visualize and interact with data
- Modules are schema-aware: dynamically adapt to backend-defined structure
- Frontend changes sent to backend for persistence
- Receives real-time updates from backend (via WebSocket) and updates UI accordingly
- Uses BroadcastChannel for ultra-fast synchronization between same-browser windows
- Modules can be defined via JSON templates and saved as user-configured instances
- **✨ Canvas Prototype System**: Fully integrated Svelte-based draggable canvas with backend persistence

## Development Commands

### Starting the Application
```bash
npm install     # Install dependencies  
npm start       # Starts backend server on http://localhost:3000

# Canvas Prototype (separate Svelte app)
cd src/frontend/canvas-prototype
npm install     # Install Canvas dependencies
npm run dev     # Start Canvas on http://localhost:5174
```

### Testing
```bash
npm test            # Run unit tests (fast, no DB required)
npm run test:unit   # Run unit tests only
npm run test:integration # Run integration tests (requires Neo4j)
npm run test:all    # Run all tests (unit + integration)
npm run test:verbose # Run all tests with detailed output
npm run test:legacy # Run legacy test files
```

### Database Requirements
- Neo4j must be running locally (default: bolt://localhost:7687)
- Default auth: neo4j/password (configured in src/backend/neo4j_connector.js)

## Core Architecture Components

### I. Backend (src/backend/)

**Server (server.js):**
- Express.js entry point for REST API and WebSocket connections
- **REST API Endpoints (35 endpoints, 100% functional):**
  - Documents: `/api/documents/*` (CompositeDocument CRUD and canvas integration)
  - Entity schemas: `/api/schema/entity/*` (CRUD for entity type definitions)
  - Entities: `/api/entities/*`, `/api/entity/*` (unified MVP+Evolved API)
  - Module instances: `/api/module-instances/*` (UI module configurations)
  - Canvas: `/api/documents/:id/canvas` (canvas layout persistence)
- **WebSocket Server:** Handles frontend connections, used by AttributeSpace for change events

**Core Engine (src/backend/core/):**
- **schemaManager_evolved.js:** Structural semantic custodian. Manages definition, persistence (via DAO to Neo4j), dynamic evolution and versioning of entity/relation schemas
- **entityEngine_evolved.js:** Manages entity instance lifecycle. Integrates with SchemaManager for validation/defaults, RelationEngine for "reference" type attributes, DAO for persistence. Supports lazy loading and caching
- **relationEngine.js:** Manages relations as first-class entities. Create, read, update, delete typed relations with custom attributes. Validates against RelationSchemaDefinition
- **attributeSpace_evolved.js:** The backend "nervous system". Implements Observer/Pub-Sub pattern for reactivity. Notifies WebSocket clients when entities, relations, or schemas change. Supports advanced pattern matching, batching, loop prevention

**DAO Layer (src/backend/dao/):**
- **neo4j_dao.js:** Abstraction layer for Neo4j interactions with Cypher queries
- Uses "additive-only" operations (MERGE, ON CREATE SET) for schema management safety
- **Fixed**: Neo4j LIMIT/SKIP parameters now use inline integer values to prevent float conversion errors

### II. Frontend (src/frontend/)

**Services (src/frontend/services/):**
- **EntityService.js:** Entity CRUD operations with caching and evolved/MVP API fallback
- **RelationService.js:** Relation CRUD operations with backend integration  
- **SchemaService.js:** Retrieve entity/relation schema information from backend
- **ModuleDefinitionService.js:** Load/manage module template definitions (JSON files)
- **SaveInstanceService.js:** Save/load user-configured module instances
- **WebSocketService.js:** Manage WebSocket connection, automatic reconnect, granular subscriptions
- **EntityService.js:** Entity CRUD operations with unified MVP+Evolved API support

**Web Components (src/frontend/components/):**
- **template-module-renderer.js:** Key component that takes module template ID + entity ID and dynamically renders module
- **attribute-editor.js:** Schema-aware editable field with validation and debounce
- **attribute-display.js:** Displays single attribute with schema-based formatting
- **entity-autocomplete.js:** Entity search/selection with real-time WebSocket updates + entity creation capability
- **relation-list.js:** Displays list of related entities for a source entity
- **relation-editor.js:** Modal editor for creating/modifying relations with entity search
- **saved-module-instance.js:** Renders previously saved module instance (specific template configuration)
- **SimpleTableModule.js:** Enterprise-grade table component with real-time collaboration
- **callsheet-module.js:** Production callsheet for entity-module relationships
- **realtime-contact-card.js:** Real-time synchronized contact cards

**Module Definitions (src/frontend/definitions/):**
- JSON files (StandardContactCard.json, CompactContactCard.json, DynamicTableModule.json)
- Define structure, layout, attributes to display/edit, views and actions for module types
- Represent ModuleTemplateDefinition objects

**UI Modules (src/frontend/modules/):**
- **TabularModule.js:** Table-based entity display, evolved to be schema-driven
- **ContactCardModule.js:** Card-based entity display
- Complex view implementations that may use template-module-renderer internally

**Views and Pages (src/frontend/views/):**
- Empty after reorganization - demos moved to /examples/

**Active Production Demos (examples/):**
- **advanced/realtime-sync-demo.html**: Complete real-time bidirectional sync demo
- **advanced/callsheet-demo.html**: Production callsheet implementation  
- **advanced/simple-evolved-table-demo.html**: Enterprise-grade table collaboration
- **basic/websocket-test.html**: WebSocket debugging interface
- **basic/debug-logger.html**: System logging utility
- **Canvas Prototype**: http://localhost:5174/ (separate Svelte application)

### III. Database (Neo4j)

Stores:
- **Entity Data:** Nodes with labels (e.g., :Cliente, :Persona) and properties
- **Relation Data:** Specific :Relation nodes connecting entity nodes, with type and custom attributes  
- **Schema Definitions:**
  - :SchemaEntityType nodes for entity types
  - :SchemaRelationType nodes for relation types  
  - :AttributeDefinition nodes for attribute definitions
  - :HAS_ATTRIBUTE relationships connecting schemas to their attributes
- **Module Instances:** :ModuleInstance nodes storing saved UI module configurations
- **✨ NEW - Hierarchical Relations:** :MEMBER_OF relationships between entities and ModuleInstance with contextual attributes (fee, ruolo, date), :BELONGS_TO relationships linking ModuleInstance to projects

## Key Development Guidelines

### Real-time Data Flow Pattern
1. User modifies data in any UI module
2. Change persisted to Neo4j via REST API  
3. WebSocket broadcasts change to all connected clients
4. BroadcastChannel propagates between browser windows
5. All UI modules update automatically

### Working with Schemas
- Schemas auto-evolve as new attributes are added
- Use SchemaManager for entity/relation type definitions
- Components automatically adapt to schema changes
- Both MVP (discovery-based) and evolved (explicit definition) modes supported

### Frontend Development
- Use vanilla JavaScript ES6+ with Web Components
- Service layer pattern for API communication
- Event-driven architecture for real-time updates  
- Schema-aware components that adapt dynamically

### Backend Development
- Express.js with async/await patterns
- DAO pattern for database operations
- Observer pattern for change notifications
- Dual-track: MVP compatibility + evolved features

## Project Structure

```
/SSOT-3005/
├── README.md                    # Project overview and quick start
├── CLAUDE.md                    # AI assistant context (this file)
├── package.json                 # Dependencies and scripts
│
├── /src/                        # Main source code
│   ├── /backend/               # Server-side code
│   │   ├── /core/             # Core engine components
│   │   ├── /dao/              # Data access layer
│   │   ├── /services/         # Business services
│   │   ├── server.js          # Main Express server
│   │   └── neo4j_connector.js # Database connection
│   │
│   └── /frontend/             # Client-side code
│       ├── /components/       # Web Components
│       ├── /services/         # Frontend services
│       ├── /modules/          # UI modules
│       ├── /definitions/      # JSON templates
│       ├── /views/           # Empty - demos moved to /examples/
│       ├── /canvas-prototype/ # ✨ NEW - Svelte Canvas System
│       │   ├── /src/components/   # Canvas UI components
│       │   ├── /src/services/     # Layout storage service
│       │   ├── /src/stores/       # Svelte reactive stores
│       │   ├── package.json       # Svelte dependencies
│       │   └── README.md          # Canvas documentation
│       ├── app.js            # Main application
│       ├── index.html        # Main page
│       └── style.css         # Styles
│
├── /examples/                  # Production-ready demos (5 active demos)
│   ├── /basic/               # Development tools (websocket-test, debug-logger)
│   ├── /advanced/            # Production demos (realtime-sync, callsheet, table-demo)
│   └── README.md             # Demo documentation and usage guide
│
├── /tests/                    # Test files
│   ├── test-runner.js        # Main test runner
│   ├── test-utils.js         # Test utilities and framework
│   ├── /unit/               # Unit tests (fast, no DB)
│   ├── /integration/        # Integration tests (requires Neo4j)
│   ├── /performance/        # Performance tests
│   └── /backend/            # Legacy test files
│
├── /docs/                     # Documentation
│   ├── /current/             # Active architecture docs
│   ├── /phases/              # Development phase reports
│   ├── /guides/              # Implementation guides
│   └── /api/                 # API documentation
│
├── /logs/                     # Log files
│   ├── server.log
│   └── server_output.log
│
└── /archive/                  # Legacy and backup files
    ├── /mvp-baseline/        # Clean MVP reference  
    ├── /development-history/ # Historical documentation
    └── /phase-development-demos/ # Archived test demos from development phases
```

## Important Architecture Files

### Backend Core
- `src/backend/server.js`: Main server with full feature set
- `src/backend/core/schemaManager_evolved.js`: Schema management
- `src/backend/core/entityEngine_evolved.js`: Entity lifecycle management
- `src/backend/core/relationEngine.js`: Relation management
- `src/backend/core/attributeSpace_evolved.js`: Real-time notification system

### Frontend Key Components  
- `src/frontend/services/EntityService.js`: Primary entity operations
- `src/frontend/components/template-module-renderer.js`: Dynamic module rendering
- `src/frontend/app.js`: Main application coordinator

### ✅ Canvas Prototype System (Production Ready)
- `src/frontend/canvas-prototype/`: Complete Svelte-based draggable canvas system
- `src/frontend/canvas-prototype/src/components/Canvas.svelte`: Main canvas with grid and drag & drop  
- `src/frontend/canvas-prototype/src/services/CanvasBackendService.js`: Backend integration service
- `src/frontend/canvas-prototype/src/stores/canvas.js`: Reactive state management
- **Full Backend Integration**: Canvas layouts persist in Neo4j via CONTAINS_MODULE relations
- **Demo URL**: http://localhost:5174/ (Vite dev server)

### Documentation
- `docs/current/API-Optimization-Report.md`: Complete API optimization results
- `docs/current/Canvas-Svelte-Prototype-Documentation.md`: Canvas system documentation
- `docs/guides/API-Reference-Guide.md`: Complete API reference (35 endpoints)
- `docs/phases/`: Development phase reports and evolution  
- `archive/development-history/`: Historical documentation and development diary

## Dual-Track Architecture

The system maintains **MVP compatibility** while introducing **evolved features**:
- Single `src/backend/server.js` integrates both MVP and evolved functionality
- Components support both discovery-based (MVP) and explicit schema definition (evolved) modes  
- Gradual migration path from MVP to evolved functionality
- Original MVP implementation preserved in `archive/mvp-original/` for reference

## System Evolution: From MVP to Production-Ready Platform

### Current Status: Production-Ready System (June 2025)

**Status**: ✅ **PRODUCTION READY** - Complete SSOT-3005 Platform

**System Features**:
- **API Layer**: 35 endpoints, 100% functional, fully tested
- **Canvas System**: Svelte-based draggable interface with Neo4j persistence  
- **Real-time Sync**: WebSocket + BroadcastChannel for instant collaboration
- **Entity Management**: Unified MVP+Evolved engine with schema evolution
- **Documentation**: Complete API guides and system documentation

**Previous Phase - Phase 7 Completed**: Advanced Table Sync System
- **Planning Document**: `docs/phases/Phase-7-Advanced-Table-Sync-System.md`
- **Goal**: Enterprise-grade real-time collaboration spreadsheet system ✅ **ACHIEVED**
- **Key Innovation**: Smart debounce with bidirectional real-time sync ✅ **IMPLEMENTED**
- **UX Revolution**: Professional spreadsheet experience with real-time collaboration ✅ **DELIVERED**

**System Optimization & Testing (27 June 2025)**: API Consolidation & Canvas Integration
- ✅ **API Optimization**: 60 → 35 endpoints, 100% functional rate achieved
- ✅ **Canvas Integration**: Full Svelte Canvas system with Neo4j backend persistence
- ✅ **Testing Framework**: Complete test coverage for all API endpoints
- ✅ **Documentation**: Updated API guides reflecting real system capabilities
- ✅ **Production Ready**: Fully tested and verified system ready for deployment

**Phase 1 Completed (14 June 2025)**: 
- ✅ CompositeDocument schema defined with full attribute support
- ✅ DocumentService implemented with complete CRUD operations
- ✅ API endpoints for documents, layout management, and context inheritance
- ✅ WebSocket integration for real-time synchronization
- ✅ 100% test coverage (12/12 integration tests passing)
- ✅ JSON serialization/deserialization for Neo4j
- ✅ Support for CONTAINS_MODULE relations with layout attributes

**Phase 2 Completed (15 June 2025)**:
- ✅ **Complete Interactive Demo**: `examples/phase-demos/ssot-4000-complete-demo.html`
- ✅ **Dynamic Workspace**: 3-panel layout with documents, workspace, and real-time monitor
- ✅ **Module Management**: Full CRUD for modules in documents with visual grid layout
- ✅ **Real-time Sync**: WebSocket events with client-side subscription filtering
- ✅ **Visual Module Library**: 6 module types (Contact List, Notes, Tasks, Timeline, Data Table, Analytics)
- ✅ **Context Inheritance**: Document context propagated to all contained modules
- ✅ **Multi-window Support**: BroadcastChannel for cross-window synchronization
- ✅ **Error Handling**: Robust error handling with user-friendly feedback
- ✅ **Performance Monitoring**: Live metrics and latency tracking
- ✅ **Auto Demo Scenario**: One-click demo data generation

**Next Phase (Optional Enhancements)**:
- Svelte migration for enhanced performance (alternative: current vanilla JS works excellently)
- Advanced drag & drop with visual feedback
- Virtual scrolling for large workspaces
- Template system for reusable workspace layouts

### Recent Architectural Evolutions

**Phase 1**: MVP Implementation (Completed)
- Basic entity/relation management
- WebSocket real-time updates
- Simple schema management

**Phase 2**: Evolved Features (Completed)  
- Advanced schema management with versioning
- Reference attributes and lazy loading
- AttributeSpace for reactive notifications

**Phase 3**: Organic System (Attempted/Revised)
- Automatic schema discovery from usage patterns
- Soft validation with intelligent suggestions
- **Result**: Too complex, didn't match user mental model

**Phase 4**: Dynamic UI System (Current - Fase 1 Backend Completata ✅)
- **ModuleRelationService**: Implementa modello gerarchico Progetto → ModuleInstance → Entità
- **Attributi Relazionali**: Fee, ruoli, date memorizzati sulle relazioni MEMBER_OF
- **Query Bidirezionali**: Entità→progetti e progetti→entità con attributi contestuali
- **API REST Complete**: CRUD per membri modulo con aggregati automatici
- **Test Coverage**: 100% con integrazione Neo4j verificata

**Phase 5**: SSOT-4000 Knowledge Platform (✅ COMPLETED)
- **CompositeDocument**: ✅ Meta-meta-entità per orchestrazione di moduli multipli
- **Workspace Dinamico**: ✅ UI componibile con gestione moduli e layout persistente (vanilla JS)
- **Ereditarietà del Contesto**: ✅ Propagazione automatica del contesto dai documenti ai moduli
- **Demo Completa**: ✅ Interfaccia funzionale con 6 tipi di moduli e real-time sync
- **WebSocket Filtering**: ✅ Sottoscrizioni client-side con pattern matching
- **Multi-window Sync**: ✅ BroadcastChannel per sincronizzazione tra finestre
- **Documento di Riferimento**: `docs/phases/SSOT-4000-implementation-plan.md`

**Phase 6**: Real-time Sync Framework (✅ COMPLETED - 15 June 2025)
- **realtime-sync-demo.html**: ✅ Complete working real-time sync demo with bidirectional synchronization
- **WebSocket Architecture Fix**: ✅ Corrected server message format with data.newValue/oldValue structure
- **Callsheet + Contact Card Demo**: ✅ Comprehensive demo with intrinsic vs contextual attributes
- **Cross-window Synchronization**: ✅ BroadcastChannel implementation for multi-window real-time sync
- **Testing Framework**: ✅ Automated test suite (test-callsheet-sync.js) for end-to-end validation
- **Debugging Tools**: ✅ WebSocket test interface and comprehensive logging

**Phase 7**: Advanced Table Sync System (✅ COMPLETED - 23 June 2025)
- **Enterprise Real-time Sync**: ✅ Perfect bidirectional synchronization between admin interface and SimpleTableModule
- **Smart Debounce System**: ✅ Intelligent saving on user confirmation (blur/Enter/Tab) instead of every keystroke
- **Cross-window Synchronization**: ✅ BroadcastChannel implementation with sender ID loop prevention
- **WebSocket Compatibility**: ✅ Pattern mapping system for multiple backend message formats
- **Entity Creation Sync**: ✅ Fixed duplicate method definitions, seamless entity creation from table
- **Performance Optimization**: ✅ Clean console output, 90% reduction in verbose logging
- **Loop Prevention**: ✅ Robust instance ID system prevents infinite message loops
- **Professional UX**: ✅ Spreadsheet-like experience rivaling modern collaboration tools
- **Planning Document**: `docs/phases/Phase-7-Advanced-Table-Sync-System.md`

**Phase 8**: Semantic Rendering Architecture (✅ COMPLETED - 23 June 2025)
- **UI Metadata System**: ✅ Complete AttributeDefinition extension with component, label, validation, groups, rendering hints
- **Semantic APIs**: ✅ Intelligent /api/attribute-suggestions endpoint with pattern-based suggestions
- **Enhanced Schema APIs**: ✅ Multiple format support (standard, semantic-ui, ui-metadata-only) with full CRUD
- **Demo Platform**: ✅ Interactive semantic-platform-demo.html showcasing all capabilities
- **CRUD Test Suite**: ✅ Automated testing framework validating all CRUD operations with WebSocket events
- **Production Documentation**: ✅ Complete architecture documentation reflecting real system state
- **Enterprise Ready**: ✅ Professional spreadsheet experience with real-time collaboration

**Canvas System Integration (26-27 June 2025)**: ✅ COMPLETED  
- **Svelte Canvas**: Complete draggable canvas with grid snap and resize
- **Backend Integration**: Full Neo4j persistence via CONTAINS_MODULE relations
- **Layout Management**: Save/load system with database persistence
- **Professional UI**: Modal dialogs, toolbar, notifications, keyboard shortcuts
- **Real-time Ready**: Integration with WebSocket system for collaboration
- **Production Demo**: http://localhost:5174/ (fully integrated with backend)

## Common Development Tasks

### Adding New Entity Types
- Create via any UI module (auto-schema discovery)
- Or define explicitly via SchemaManager API
- UI modules automatically adapt to new types

### Creating New UI Modules
1. Add JSON definition in `src/frontend/definitions/`
2. Use `template-module-renderer` for dynamic rendering
3. Or create custom module in `src/frontend/modules/` following existing patterns

### Working with Relations
- Use RelationEngine for typed relationships between entities
- Relations are first-class entities with their own attributes
- UI components in `relation-list.js` and `relation-editor.js`
- **NEW**: ModuleRelationService for hierarchical entity-module relationships

### Working with Dynamic UI (Current Phase)
- Smart inputs with contextual autocomplete
- Relational attributes on entity-module relationships
- Bidirectional queries (entity→projects, project→entities)

### Working with SSOT-4000 Platform (✅ COMPLETED)
- **Reference Document**: `docs/phases/SSOT-4000-implementation-plan.md`
- **Demo URL**: http://localhost:3000/examples/phase-demos/ssot-4000-complete-demo.html
- **CompositeDocument**: ✅ Meta-meta-entity that orchestrates multiple modules
  - Schema defined in `initializeBaseSchemas()` in server.js
  - Attributes: name, description, projectId, layout, ownerId, metadata, status
  - Related to ModuleInstance via CONTAINS_MODULE relation
- **Workspace UI**: ✅ Dynamic grid-based UI with module management
- **Context Inheritance**: ✅ Automatic context propagation to all modules
- **Real-time Sync**: ✅ WebSocket with client-side filtering and multi-window support
- **Module Library**: ✅ 6 pre-built module types with extensible architecture
- **Base Schemas**: ✅ Project, ModuleInstance, CompositeDocument automatically initialized on server start

### Using the Complete Demo
1. **Access Demo**: Navigate to http://localhost:3000/examples/phase-demos/ssot-4000-complete-demo.html
2. **Create Documents**: Use "+ New" to create CompositeDocument instances
3. **Add Modules**: Select document → "+ Add Module" → Choose from library
4. **Real-time Test**: Open second window to see instant synchronization
5. **Auto Demo**: Click "🎭 Run Demo Scenario" for automatic setup

### Working with ModuleRelationService (New ✅)
- **Hierarchical Model**: `Project → ModuleInstance → Entity` with contextual attributes
- **API Endpoints**: `/api/modules/:moduleId/members` for CRUD operations
- **Contextual Attributes**: Store fee, role, dates on MEMBER_OF relationships
- **Aggregates**: Calculate totals, averages, member counts per module
- **Bidirectional Queries**: `/api/entities/:entityId/projects` for entity's project history

### Working with Real-time Sync Framework (✅ NEW - Phase 6)
- **Demo URL**: http://localhost:3000/examples/advanced/realtime-sync-demo.html
- **Architecture**: Direct WebSocket connection with BroadcastChannel for cross-window sync
- **Message Format**: Server sends `{type: 'change', entityId, attributeName, data: {newValue, oldValue}}`
- **Testing**: Use `tests/test-callsheet-sync.js` for automated end-to-end validation
- **Debugging**: WebSocket test interface at http://localhost:3000/examples/basic/websocket-test.html

### Working with Callsheet + Contact Card Demo (✅ NEW)
- **Demo URL**: http://localhost:3000/examples/advanced/callsheet-demo.html
- **Intrinsic Attributes**: Entity properties (nome, email, telefono) sync across all instances
- **Contextual Attributes**: Relationship properties (fee, role, dates) remain in specific module context
- **Components**: callsheet-module.js + realtime-contact-card.js + entity-autocomplete.js
- **Real-time Sync**: Bidirectional synchronization between callsheet table and contact cards

### Working with Advanced Table Sync System (✅ NEW - Phase 7)
- **Demo URL**: http://localhost:3000/examples/advanced/simple-evolved-table-demo.html
- **Architecture**: Enterprise-grade real-time collaboration system
- **Features**:
  - **Bidirectional Sync**: Admin interface ↔ SimpleTableModule perfect synchronization
  - **Smart Debounce**: Saves only on blur/Enter/Tab, not every keystroke
  - **Cross-window Sync**: BroadcastChannel with sender ID loop prevention
  - **Entity Creation**: Seamless entity creation with duplicate detection
  - **Performance**: Clean console output, optimized WebSocket usage
- **Components**: SimpleTableModule.js + WebSocketService.js + EntityService.js
- **Message Flow**: Input → Visual Update → User Confirmation → Persistence → WebSocket → All Clients Update
- **Testing**: Multi-window real-time collaboration testing

### Working with Canvas Prototype System (✅ PRODUCTION READY)
- **Demo URL**: http://localhost:5174/ (Vite dev server)
- **Backend Integration**: Full Neo4j persistence via `/api/documents/:id/canvas`
- **Key Features**:
  - **Draggable Blocks**: Grid-snapped drag & drop with resize handles
  - **Database Persistence**: Canvas layouts saved as CONTAINS_MODULE relations
  - **Module Integration**: ModuleInstance entities linked to canvas blocks
  - **Real-time Ready**: WebSocket integration for collaboration
- **Development**: `cd src/frontend/canvas-prototype && npm install && npm run dev`
- **API Endpoints**: PUT/GET `/api/documents/:id/canvas` for layout persistence
- **Testing**: Create document → Add modules → Save → Load → Verify database relations

### Working with API System (✅ PRODUCTION READY)
- **Base URL**: http://localhost:3000
- **Status**: 35/35 endpoints functional (100%)  
- **Documentation**: `docs/guides/API-Reference-Guide.md`
- **Key Endpoints**:
  - **Documents**: `/api/documents/*` (CRUD + Canvas integration)
  - **Entities**: `/api/entities/*` (Unified MVP+Evolved API)
  - **Schemas**: `/api/schema/*` (Schema management)
  - **Canvas**: `/api/documents/:id/canvas` (Layout persistence)
- **Testing**: All endpoints tested and verified functional
- **Real-time**: WebSocket integration for live updates

## Testing Framework

### Test Structure
- **Unit Tests** (`tests/unit/`): Fast tests that mock dependencies, no database required
- **Integration Tests** (`tests/integration/`): End-to-end tests with real Neo4j database
- **Test Framework** (`tests/test-utils.js`): Zero-dependency testing utilities optimized for Claude AI

### Test Output Format
Tests provide clear, structured output perfect for Claude AI analysis:
```
🧪 SchemaManager Unit Tests
═══════════════════════════
├── ✅ Initialize SchemaManager (5ms)
├── ✅ Define entity schema - valid definition (12ms)
├── ❌ Define entity schema - invalid definition (3ms)
│   └── Error: Invalid schema mode: invalid_mode
└── ✅ Get entity schema - existing (2ms)

📊 Results: 3/4 passed (75%) - 1 failure
⏱️  Total time: 22ms
```

### Testing Guidelines
- **For Claude AI**: Run `npm test` for quick validation after changes
- **For Development**: Use `npm run test:all --verbose` for detailed diagnostics
- **For CI/CD**: Integration tests require Neo4j running locally
- **Test Data**: Automatic cleanup prevents test pollution

### Writing New Tests
1. Add unit tests in `tests/unit/[component].test.js`
2. Add integration tests in `tests/integration/[workflow].test.js`
3. Use `TestRunner`, `Assert`, and `TestData` utilities from `test-utils.js`
4. Follow existing patterns for consistent output

---

> **REMINDER:** When you complete work on this project, update this document to reflect any changes made to the architecture, new features added, or development workflow modifications.