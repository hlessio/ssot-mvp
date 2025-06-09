# 📚 Indice Completo Documentazione SSOT-3005

## 🏗️ Architettura Generale

- [📋 README Principale](README.md) - Panoramica e struttura generale
- [🗺️ Roadmap Documentazione](roadmap_documentazione_ssot.md)
- [📄 Documento Tecnico Completo](full-ssot.md)

## 🖥️ Backend

### 📁 [Documentazione Backend](backend/README.md)
Documentazione completa del backend con mappatura src/backend/

#### 🧠 Core Engine
- [⚙️ EntityEngine Evoluto](backend/core/entityEngine.md) - Motore gestione entità avanzato
- Schema Manager - *Da documentare*
- Relation Engine - *Da documentare*
- Attribute Space - *Da documentare*

#### 💾 Data Access Layer (DAO)
- [🔗 Neo4jDAO](backend/dao/neo4j_dao.md) - Data Access Object per Neo4j
- Neo4j Connector - *Da documentare*

#### 🔧 Services
- [📂 Documentazione Services](backend/services/README.md) - Linee guida per servizi
- *Servizi da documentare in base a implementazione*

## 🌐 Frontend

### 📁 [Documentazione Frontend](frontend/README.md)
Documentazione completa del frontend con mappatura src/frontend/

#### 🧩 Componenti
- [📝 RelationEditor](frontend/components/relation-editor.md) - Editor relazioni avanzato
- Entity Autocomplete - *Da documentare*
- Attribute Editor - *Da documentare*
- Attribute Display - *Da documentare*
- SSOT Input - *Da documentare*
- Relation List - *Da documentare*
- Template Module Renderer - *Da documentare*
- Saved Module Instance - *Da documentare*

#### 🔄 Servizi
- [🏢 EntityService](frontend/services/EntityService.md) - Gestione entità con cache
- RelationService - *Da documentare*
- SchemaService - *Da documentare*
- WebSocketService - *Da documentare*
- ModuleDefinitionService - *Da documentare*
- SaveInstanceService - *Da documentare*

#### 📱 Viste
- [📄 Documentazione Viste](frontend/views/README.md) - Linee guida per viste
- Relation Test - *Da documentare*
- Autocomplete Demo - *Da documentare*
- Phase2 Test - *Da documentare*
- Template Test - *Da documentare*

#### 🧱 Moduli
- [📊 Documentazione Moduli](frontend/modules/README.md) - Linee guida per moduli
- TabularModule - *Da documentare*
- ContactCardModule - *Da documentare*

#### 📋 Definizioni
- [🏷️ Documentazione Definizioni](frontend/definitions/README.md) - Tipi e interfacce
- CompactContactCard.json - *Da documentare*
- StandardContactCard.json - *Da documentare*
- DynamicTableModule.json - *Da documentare*
- SimpleContactCard.json - *Da documentare*

## 📊 Demo e Test

### 🎯 Demo
- [📁 Cartella Demos](demos/) - Esempi pratici e dimostrazioni

### 🧪 MVP
- [📁 Cartella MVP](mvp/) - Implementazioni Minimum Viable Product

### 📈 Logs
- [📁 Cartella Logs](logs/) - Documentazione operativa e logging

## 🗂️ Struttura File per Riferimento

### Backend Files (src/backend/)
```
core/
├── entityEngine_evolved.js ✅ Documentato
├── attributeSpace_evolved.js
├── schemaManager_evolved.js
├── relationEngine.js
├── relationSchema.js
├── entitySchema.js
├── attributeDefinition.js
└── ...

dao/
├── neo4j_dao.js ✅ Documentato
└── ...

services/
└── (vuoto attualmente)
```

### Frontend Files (src/frontend/)
```
components/
├── relation-editor.js ✅ Documentato
├── entity-autocomplete.js
├── relation-list.js
├── attribute-editor.js
├── attribute-display.js
├── ssot-input.js
├── template-module-renderer.js
└── saved-module-instance.js

services/
├── EntityService.js ✅ Documentato
├── RelationService.js
├── SchemaService.js
├── WebSocketService.js
├── ModuleDefinitionService.js
└── SaveInstanceService.js

views/
├── relation-test.html
├── autocomplete-demo.html
├── phase2-test.html
└── template-test.html

modules/
├── TabularModule.js
└── ContactCardModule.js

definitions/
├── CompactContactCard.json
├── StandardContactCard.json
├── DynamicTableModule.json
└── SimpleContactCard.json
```

## 🚀 Stato della Documentazione

### ✅ Completata
- Struttura organizzativa con mappatura codice
- README per ogni sezione con linee guida
- EntityEngine Evoluto (backend/core)
- Neo4jDAO (backend/dao)
- EntityService (frontend/services)
- RelationEditor (frontend/components)

### 🔄 In Corso
- Documentazione componenti frontend rimanenti
- Documentazione servizi frontend rimanenti
- Documentazione moduli e viste

### 📋 Da Fare
- Schema Manager e Relation Engine (backend/core)
- Attribute Space e altri core components
- Tutti i servizi backend
- Documentazione definizioni JSON
- Documentazione viste HTML
- Documentazione moduli JavaScript

## 🎯 Priorità Prossimi Passi

1. **Alta Priorità**: Completare servizi frontend (RelationService, SchemaService)
2. **Media Priorità**: Documentare componenti frontend rimanenti
3. **Bassa Priorità**: Documentare viste e definizioni JSON

## 📝 Template e Convenzioni

Ogni sezione ha template e linee guida specifiche:
- [Backend Services Template](backend/services/README.md#template-per-nuovi-servizi)
- [Frontend Components Template](frontend/components/README.md#template-per-nuovi-componenti)
- [Frontend Services Template](frontend/services/README.md#template-per-nuovi-servizi)
- [Views Template](frontend/views/README.md#template-per-nuove-viste)
- [Modules Template](frontend/modules/README.md#template-per-nuovi-moduli)

## 🔗 Collegamenti Utili

- [CHANGELOG](../CHANGELOG.md) - Cronologia delle modifiche
- [Backup Tecnico](doc_tecnico_backup.md) - Backup documentazione precedente 