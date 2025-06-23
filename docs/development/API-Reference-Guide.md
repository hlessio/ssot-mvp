# API Reference Guide - SSOT-3005
## Guida Completa agli Endpoint per Sviluppo Moduli

**Data**: 23 Giugno 2025  
**Versione**: 1.0 - Sistema Produzione  
**Base URL**: `http://localhost:3000`

---

## 📚 Collegamenti Documentazione

**Guide Correlate:**
- 📖 [SearchService Implementation Guide](SearchService-Implementation-Guide.md) - Architettura di ricerca riusabile
- 🏗️ [Architettura Semantica SSOT-3005](../architecture/Architettura-Semantica-Reale-SSOT-3005.md) - Panoramica completa del sistema

---

## 📋 Indice

1. [Schema APIs](#schema-apis) - Gestione schemi e UI metadata
2. [Entity APIs](#entity-apis) - CRUD entità con validazione
3. [Relation APIs](#relation-apis) - Gestione relazioni tra entità
4. [Module Instance APIs](#module-instance-apis) - Gestione moduli UI
5. [Real-time APIs](#real-time-apis) - WebSocket e sincronizzazione
6. [Search & Autocomplete APIs](#search--autocomplete-apis) - Ricerca intelligente
7. [SearchService Architecture](#searchservice-architecture) - Sistema di ricerca riusabile
8. [Esempi Pratici](#esempi-pratici) - Use cases comuni

---

## 🎨 Schema APIs

### **1. Lista Tutti gli Schemi Entità**
```http
GET /api/schema/entities
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "entityType": "Persona",
      "attributeCount": 5,
      "entityCount": 120
    },
    {
      "entityType": "Contact",
      "attributeCount": 3,
      "entityCount": 85
    }
  ]
}
```

### **2. Schema Entità Standard**
```http
GET /api/schema/entity/{entityType}
GET /api/schema/entity/{entityType}?includeUIMetadata=true
```

**Parametri Query:**
- `includeUIMetadata` (boolean): Include UI metadata negli attributi
- `format` (string): Formato risposta (`standard`, `semantic-ui`)

**Response Standard:**
```json
{
  "success": true,
  "data": {
    "entityType": "Persona",
    "version": 1,
    "mode": "flexible",
    "attributes": {
      "nome": {
        "type": "string",
        "required": true,
        "description": "Nome completo della persona"
      },
      "email": {
        "type": "email",
        "required": false,
        "validationRules": { "format": "email" }
      }
    }
  }
}
```

### **3. Schema Semantico per UI**
```http
GET /api/schema/entity/{entityType}?format=semantic-ui
```

**Response Semantico:**
```json
{
  "success": true,
  "data": {
    "entityType": "Persona",
    "displayConfig": {
      "displayLabel": "Persona",
      "displayField": "nome",
      "supportedViews": ["table", "card", "form"]
    },
    "attributes": {
      "nome": {
        "type": "string",
        "label": "Nome Completo",
        "component": "TextInput",
        "placeholder": "Inserisci nome...",
        "icon": "user",
        "group": "contact",
        "priority": "high",
        "validation": {
          "required": true,
          "minLength": 2
        }
      },
      "email": {
        "type": "email",
        "label": "Email",
        "component": "EmailInput",
        "placeholder": "esempio@email.com",
        "icon": "envelope",
        "group": "contact",
        "priority": "high"
      }
    },
    "groups": {
      "contact": {
        "label": "Informazioni Contatto",
        "order": 1,
        "attributes": ["nome", "email"]
      }
    },
    "renderingHints": {
      "priority": "high",
      "defaultSort": "nome",
      "bulkOperations": ["edit", "delete"]
    }
  }
}
```

### **4. Solo UI Metadata**
```http
GET /api/schema/entity/{entityType}/ui-metadata
GET /api/schema/entity/{entityType}/ui-metadata?attributes=nome,email
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nome": {
      "component": "TextInput",
      "label": "Nome Completo",
      "placeholder": "Inserisci nome...",
      "icon": "user",
      "group": "contact",
      "priority": "high",
      "width": "medium",
      "validation": {
        "realtime": true,
        "debounceMs": 300
      }
    }
  }
}
```

### **5. Aggiorna UI Metadata**
```http
PUT /api/schema/entity/{entityType}/ui-metadata
```

**Body:**
```json
{
  "attributeName": "nome",
  "uiMetadata": {
    "label": "Nome Aggiornato",
    "component": "TextArea",
    "priority": "high",
    "placeholder": "Nuovo placeholder...",
    "icon": "person"
  }
}
```

### **6. Evoluzione Schema (Additive-Only)**
```http
PUT /api/schema/entity/{entityType}
```

**Body:**
```json
{
  "evolution": {
    "attributes": {
      "nuovoAttributo": {
        "type": "string",
        "description": "Nuovo attributo aggiunto",
        "uiMetadata": {
          "label": "Nuovo Campo",
          "component": "TextInput",
          "group": "extra"
        }
      }
    }
  }
}
```

---

## 🏗️ Entity APIs

### **1. Lista Entità**
```http
GET /api/entities
GET /api/entities?entityType=Persona
GET /api/entities?entityType=Persona&search=mario
GET /api/entities?entityType=Persona&limit=50&offset=0
```

**Parametri Query:**
- `entityType` (string): Filtra per tipo entità
- `search` (string): Ricerca testuale
- `limit` (number): Limite risultati (default: 100)
- `offset` (number): Offset paginazione (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "entityType": "Persona",
      "nome": "Mario Rossi",
      "email": "mario@test.com",
      "createdAt": "2025-06-23T10:00:00Z",
      "modifiedAt": "2025-06-23T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasNext": true
  }
}
```

### **2. Singola Entità**
```http
GET /api/entity/{entityId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "entityType": "Persona",
    "nome": "Mario Rossi",
    "email": "mario@test.com",
    "telefono": "+39 123 456 7890",
    "createdAt": "2025-06-23T10:00:00Z",
    "modifiedAt": "2025-06-23T10:30:00Z"
  }
}
```

### **3. Crea Entità**
```http
POST /api/entities
```

**Body:**
```json
{
  "entityType": "Persona",
  "nome": "Mario Rossi",
  "email": "mario@test.com",
  "telefono": "+39 123 456 7890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-entity-id",
    "entityType": "Persona",
    "nome": "Mario Rossi",
    "email": "mario@test.com",
    "telefono": "+39 123 456 7890",
    "createdAt": "2025-06-23T11:00:00Z",
    "modifiedAt": "2025-06-23T11:00:00Z"
  }
}
```

### **4. Aggiorna Singolo Attributo**
```http
PUT /api/entity/{entityId}/attribute
```

**Body:**
```json
{
  "attributeName": "email",
  "value": "nuovo@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": true,
    "oldValue": "mario@test.com",
    "newValue": "nuovo@email.com",
    "timestamp": "2025-06-23T11:15:00Z"
  }
}
```

### **5. Aggiorna Entità Completa**
```http
PUT /api/entity/{entityId}
```

**Body:**
```json
{
  "nome": "Mario Rossi Aggiornato",
  "email": "mario.aggiornato@test.com",
  "telefono": "+39 987 654 3210"
}
```

### **6. Elimina Entità**
```http
DELETE /api/entity/{entityId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "entityId": "abc-123",
    "timestamp": "2025-06-23T11:20:00Z"
  }
}
```

---

## 🔗 Relation APIs

### **1. Lista Relazioni di un'Entità**
```http
GET /api/entity/{entityId}/relations
GET /api/entity/{entityId}/relations?relationType=Knows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rel-123",
      "relationType": "Knows",
      "sourceEntity": {
        "id": "abc-123",
        "entityType": "Persona",
        "nome": "Mario Rossi"
      },
      "targetEntity": {
        "id": "def-456",
        "entityType": "Persona", 
        "nome": "Luigi Verdi"
      },
      "attributes": {
        "strength": 8,
        "since": "2020-01-15"
      },
      "createdAt": "2025-06-23T10:00:00Z"
    }
  ]
}
```

### **2. Crea Relazione**
```http
POST /api/relations
```

**Body:**
```json
{
  "relationType": "Knows",
  "sourceEntityId": "abc-123",
  "targetEntityId": "def-456",
  "attributes": {
    "strength": 9,
    "since": "2023-06-01",
    "context": "Lavoro"
  }
}
```

### **3. Aggiorna Relazione**
```http
PUT /api/relation/{relationId}
```

**Body:**
```json
{
  "attributes": {
    "strength": 10,
    "notes": "Ottima collaborazione"
  }
}
```

### **4. Elimina Relazione**
```http
DELETE /api/relation/{relationId}
```

---

## 🧩 Module Instance APIs

### **1. Lista Module Instances**
```http
GET /api/entities?entityType=ModuleInstance
GET /api/entities?entityType=ModuleInstance&templateModuleId=DynamicTableModule
```

### **2. Crea Module Instance**
```http
POST /api/entities
```

**Body:**
```json
{
  "entityType": "ModuleInstance",
  "name": "Tabella Contatti Vendite",
  "templateModuleId": "DynamicTableModule",
  "targetEntityType": "Contact",
  "ownerUserId": "user-123",
  "description": "Gestione contatti per il team vendite",
  "instanceConfigOverrides": {
    "columns": ["nome", "email", "telefono", "azienda"],
    "defaultFilters": { "stato": "attivo" },
    "permissions": { "canEdit": true, "canDelete": false }
  },
  "status": "active"
}
```

### **3. Aggiorna Configurazione Module**
```http
PUT /api/entity/{moduleInstanceId}/attribute
```

**Body:**
```json
{
  "attributeName": "instanceConfigOverrides",
  "value": {
    "columns": ["nome", "email", "telefono", "azienda", "note"],
    "sorting": { "field": "nome", "direction": "asc" },
    "pagination": { "pageSize": 25 }
  }
}
```

---

## ⚡ Real-time APIs

### **1. WebSocket Connection**
```javascript
// Connessione WebSocket
const ws = new WebSocket('ws://localhost:3000');

// Sottoscrizione eventi
ws.send(JSON.stringify({
  type: 'subscription',
  pattern: {
    type: 'entity',
    entityType: 'Persona',
    changeType: '*'
  }
}));

// Gestione eventi
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'change') {
    console.log('Entity aggiornata:', {
      entityType: message.entityType,
      entityId: message.entityId,
      attributeName: message.attributeName,
      newValue: message.data.newValue,
      oldValue: message.data.oldValue
    });
    
    // Aggiorna UI automaticamente
    updateUIElement(message.entityId, message.attributeName, message.data.newValue);
  }
};
```

### **2. Tipi di Eventi WebSocket**

**Entity Changes:**
```json
{
  "type": "change",
  "entityType": "Persona", 
  "entityId": "abc-123",
  "attributeName": "email",
  "changeType": "updated",
  "data": {
    "newValue": "nuovo@email.com",
    "oldValue": "vecchio@email.com"
  },
  "timestamp": "2025-06-23T11:30:00Z"
}
```

**Schema Changes:**
```json
{
  "type": "schema-change",
  "entityType": "Persona",
  "changeType": "evolved",
  "data": {
    "newAttribute": "nuovoAttributo",
    "attributeType": "string"
  },
  "timestamp": "2025-06-23T11:30:00Z"
}
```

**Relation Changes:**
```json
{
  "type": "relation-change", 
  "relationType": "Knows",
  "sourceEntityId": "abc-123",
  "targetEntityId": "def-456",
  "changeType": "created",
  "data": {
    "relationId": "rel-789",
    "attributes": { "strength": 8 }
  },
  "timestamp": "2025-06-23T11:30:00Z"
}
```

---

## 🔍 Search & Autocomplete APIs

> **📚 AGGIORNAMENTO IMPORTANTE (23 Giugno 2025):**
> È stata implementata una nuova architettura di ricerca riusabile con SearchService. 
> **Vedi:** [`SearchService-Implementation-Guide.md`](SearchService-Implementation-Guide.md) per la guida completa alla nuova implementazione.

### **Architettura Query Search Engine**

Il sistema di autocomplete si integra con lo schema semantico per fornire ricerca intelligente e context-aware:

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Input        │────▶│  Schema Service  │────▶│ Search Engine   │
│  (Autocomplete)     │     │  (UI Metadata)   │     │ (Entity Query)  │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
                                      │                        │
                                      ▼                        ▼
                            ┌──────────────────┐     ┌─────────────────┐
                            │ Display Config   │     │  Neo4j Query    │
                            │ (which fields?)  │     │  (MATCH/WHERE)  │
                            └──────────────────┘     └─────────────────┘
```

### **1. ✨ NUOVO - Endpoint Ricerca Dedicato**
```http
GET /api/entities/search?search=mario&entityType=Persona&limit=10
GET /api/entities/search?search=mario&limit=10
```

**Response (Formato SearchService):**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "entityType": "Persona",
      "nome": "Mario Rossi",
      "email": "mario@test.com"
    }
  ],
  "count": 1,
  "total": 1,
  "search": "mario",
  "entityType": "Persona",
  "pagination": {
    "offset": 0,
    "limit": 10,
    "hasMore": false
  }
}
```

### **2. Ricerca Base Entità (Compatibilità)**
```http
GET /api/entities?entityType=Persona&search=mario
GET /api/entities?search=mario&limit=10
```

**Come funziona:**
1. **Schema lookup**: Sistema carica displayField da schema (`nome` per Persona)
2. **Query building**: Crea query Neo4j su campi searchable
3. **Ranking**: Ordina per relevance score

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "entityType": "Persona",
      "nome": "Mario Rossi",
      "email": "mario@test.com",
      "_relevance": 0.95,
      "_displayValue": "Mario Rossi"  // Basato su schema displayField
    }
  ]
}
```

### **2. Autocomplete Context-Aware**
```http
GET /api/entities?entityType=Persona&attributeSearch=nome:mario
GET /api/entities?entityType=Contact&attributeSearch=email:@gmail.com
```

**Integration Points:**

```javascript
// 1. Frontend Component chiede suggerimenti
const searchService = new EntitySearchService();

// 2. Service consulta schema per UI hints
const schema = await schemaService.getSchema('Persona');
const searchableFields = schema.getSearchableAttributes();
// -> ["nome", "email", "telefono"] con priority

// 3. Query ottimizzata basata su schema
const results = await searchService.search({
  entityType: 'Persona',
  query: 'mario',
  searchFields: searchableFields,
  displayField: schema.displayField
});
```

### **3. Autocomplete per Tipo Attributo**

Il sistema usa UI metadata per ottimizzare la ricerca:

```javascript
// Schema dice che "email" è tipo "email"
{
  "email": {
    "type": "email",
    "uiMetadata": {
      "component": "EmailInput",
      "searchStrategy": "domain"  // Cerca per dominio
    }
  }
}

// Query autocomplete intelligente
GET /api/entities?entityType=Contact&attributeSearch=email:@company
// -> Trova tutti i contatti con email @company.com
```

### **4. Multi-Entity Search con Schema Awareness**

```http
GET /api/search/global?q=mario&types=Persona,Contact,Project
```

**Come lo schema guida la ricerca:**

```javascript
// Per ogni entityType, il sistema:
1. Carica schema -> displayField e searchableAttributes
2. Genera sub-query ottimizzata per tipo
3. Combina risultati con ranking unificato

// Response strutturata per tipo
{
  "success": true,
  "data": {
    "Persona": [
      {
        "id": "p-123",
        "displayValue": "Mario Rossi",    // nome field
        "matchedField": "nome",
        "relevance": 0.95
      }
    ],
    "Contact": [
      {
        "id": "c-456", 
        "displayValue": "Mario's Company", // name field
        "matchedField": "company",
        "relevance": 0.80
      }
    ]
  }
}
```

---

## 🛠️ Esempi Pratici

### **Esempio 1: Rendering Dinamico di una Tabella**

```javascript
class DynamicTableRenderer {
  async init(entityType) {
    // 1. Carica schema con UI metadata
    const schema = await this.loadSchema(entityType);
    
    // 2. Configura colonne dinamicamente
    this.setupColumns(schema.data.attributes);
    
    // 3. Carica dati
    const entities = await this.loadEntities(entityType);
    
    // 4. Renderizza tabella
    this.renderTable(entities);
    
    // 5. Setup real-time sync
    this.setupWebSocketSync(entityType);
  }
  
  async loadSchema(entityType) {
    const response = await fetch(`/api/schema/entity/${entityType}?format=semantic-ui`);
    return response.json();
  }
  
  setupColumns(attributes) {
    Object.entries(attributes).forEach(([name, attr]) => {
      this.addColumn({
        name: name,
        label: attr.label,
        component: attr.component,
        width: attr.width || 'auto',
        sortable: true,
        editable: attr.editMode !== 'disabled'
      });
    });
  }
  
  async saveAttribute(entityId, attributeName, value) {
    const response = await fetch(`/api/entity/${entityId}/attribute`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributeName, value })
    });
    
    if (!response.ok) {
      throw new Error('Save failed');
    }
    
    // Il WebSocket si occuperà di sincronizzare gli altri client
  }
}
```

### **Esempio 2: Autocomplete Schema-Driven con Creazione Entità**

```javascript
/**
 * SmartAutocomplete - Integrazione completa Search Engine + Schema + UI
 * 
 * Flow:
 * 1. User digita → 2. Schema lookup → 3. Search ottimizzata → 4. Display results
 */
class SmartAutocomplete {
  constructor() {
    this.schemaCache = new Map();
    this.searchCache = new Map();
  }

  /**
   * STEP 1: Inizializza con schema awareness
   */
  async init(entityType) {
    // Carica schema con UI metadata
    const schema = await this.loadSchemaWithUI(entityType);
    this.schemaCache.set(entityType, schema);
    
    // Configura search strategy basata su schema
    this.searchConfig = {
      displayField: schema.displayConfig?.displayField || 'name',
      searchableFields: this.extractSearchableFields(schema),
      searchStrategies: this.extractSearchStrategies(schema)
    };
  }

  /**
   * STEP 2: Schema-driven search configuration
   */
  async loadSchemaWithUI(entityType) {
    const response = await fetch(`/api/schema/entity/${entityType}?format=semantic-ui`);
    return response.json();
  }

  extractSearchableFields(schema) {
    // Estrai campi searchable basati su UI metadata
    return Object.entries(schema.data.attributes)
      .filter(([name, attr]) => {
        // Campo è searchable se:
        // 1. Ha priority alta/media
        // 2. È di tipo string/email
        // 3. Non è esplicitamente non-searchable
        return attr.uiMetadata?.searchable !== false &&
               ['string', 'email'].includes(attr.type) &&
               ['high', 'medium'].includes(attr.uiMetadata?.priority);
      })
      .map(([name, attr]) => ({
        field: name,
        weight: attr.uiMetadata?.priority === 'high' ? 2 : 1,
        strategy: attr.uiMetadata?.searchStrategy || 'contains'
      }));
  }

  /**
   * STEP 3: Search ottimizzata con schema
   */
  async search(entityType, query, options = {}) {
    const schema = this.schemaCache.get(entityType) || await this.init(entityType);
    
    // Build search URL con parametri schema-aware
    const searchParams = new URLSearchParams({
      entityType: entityType,
      search: query,
      limit: options.limit || 10,
      // Include searchable fields hint per ottimizzazione backend
      searchFields: this.searchConfig.searchableFields.map(f => f.field).join(',')
    });

    const response = await fetch(`/api/entities?${searchParams}`);
    const results = await response.json();
    
    // STEP 4: Formatta risultati con display field da schema
    return this.formatResults(results.data, schema);
  }

  /**
   * STEP 4: Display formatting basato su schema
   */
  formatResults(entities, schema) {
    const displayField = schema.data.displayConfig?.displayField || 'name';
    const displayFormat = schema.data.displayConfig?.displayFormat;
    
    const formattedResults = entities.map(entity => {
      // Calcola display value basato su schema
      let displayValue = entity[displayField] || entity.id;
      
      // Applica formato custom se definito
      if (displayFormat) {
        displayValue = this.applyDisplayFormat(entity, displayFormat);
      }
      
      return {
        id: entity.id,
        label: displayValue,
        sublabel: this.generateSublabel(entity, schema),
        entityType: entity.entityType,
        icon: schema.data.displayConfig?.icon || 'circle',
        data: entity
      };
    });

    // Se nessun risultato, offri creazione
    if (formattedResults.length === 0) {
      formattedResults.push({
        id: '_create_new',
        label: `Crea nuovo ${schema.data.displayConfig?.displayLabel || entityType}`,
        sublabel: `"${query}"`,
        icon: 'plus-circle',
        isCreateOption: true,
        entityType: entityType,
        suggestedValue: query
      });
    }
    
    return formattedResults;
  }

  /**
   * STEP 5: Creazione entity schema-aware
   */
  async createEntity(entityType, initialValue) {
    const schema = this.schemaCache.get(entityType);
    const displayField = schema.data.displayConfig?.displayField || 'name';
    
    // Prepara dati iniziali con defaults da schema
    const entityData = {
      entityType: entityType,
      [displayField]: initialValue
    };
    
    // Aggiungi default values da schema
    Object.entries(schema.data.attributes).forEach(([name, attr]) => {
      if (attr.defaultValue !== undefined && !(name in entityData)) {
        entityData[name] = attr.defaultValue;
      }
    });
    
    const response = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityData)
    });
    
    return response.json();
  }

  /**
   * Utility: Genera sublabel intelligente
   */
  generateSublabel(entity, schema) {
    // Trova attributi secondari da mostrare
    const secondaryFields = Object.entries(schema.data.attributes)
      .filter(([name, attr]) => 
        attr.uiMetadata?.showInList && 
        attr.uiMetadata?.priority === 'medium'
      )
      .map(([name]) => entity[name])
      .filter(Boolean);
    
    return secondaryFields.join(' • ');
  }

  /**
   * Utility: Applica formato display custom
   */
  applyDisplayFormat(entity, format) {
    // Esempio: "{nome} ({email})"
    return format.replace(/\{(\w+)\}/g, (match, field) => 
      entity[field] || ''
    );
  }
}
```

### **Esempio 3: Module Instance Configurabile**

```javascript
class ConfigurableModule {
  constructor(moduleInstanceId) {
    this.moduleInstanceId = moduleInstanceId;
    this.config = null;
  }
  
  async init() {
    // 1. Carica configurazione modulo
    const moduleInstance = await this.loadModuleInstance();
    this.config = moduleInstance.instanceConfigOverrides || {};
    
    // 2. Setup basato su configurazione
    this.setupFromConfig();
    
    // 3. Subscribe ai cambi di configurazione
    this.subscribeToConfigChanges();
  }
  
  async loadModuleInstance() {
    const response = await fetch(`/api/entity/${this.moduleInstanceId}`);
    const result = await response.json();
    return result.data;
  }
  
  async updateConfig(newConfig) {
    const response = await fetch(`/api/entity/${this.moduleInstanceId}/attribute`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributeName: 'instanceConfigOverrides',
        value: { ...this.config, ...newConfig }
      })
    });
    
    if (response.ok) {
      this.config = { ...this.config, ...newConfig };
      this.applyConfigChanges(newConfig);
    }
  }
}
```

### **Esempio 4: Integrazione Completa in SimpleTableModule**

```javascript
/**
 * Esempio reale di come SimpleTableModule integra Search + Schema + UI
 */
class SimpleTableModule {
  async setupEntityTypeAutocomplete(input) {
    // 1. SCHEMA: Carica lista entity types disponibili
    const entityTypes = await fetch('/api/schema/entities').then(r => r.json());
    
    // 2. SEARCH: Setup autocomplete su input
    input.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase();
      
      // Filtra entity types che matchano la query
      const matches = entityTypes.data.filter(et => 
        et.entityType.toLowerCase().includes(query)
      );
      
      // 3. UI: Mostra dropdown con risultati
      this.showDropdown(input, matches.map(et => ({
        value: et.entityType,
        label: et.entityType,
        sublabel: `${et.attributeCount} attributi, ${et.entityCount} entità`
      })));
    });
    
    // 4. SELECTION: Quando user seleziona un tipo
    input.addEventListener('autocomplete-select', async (e) => {
      const selectedType = e.detail.value;
      
      // 5. SCHEMA LOAD: Carica schema completo per configurare tabella
      const schema = await fetch(`/api/schema/entity/${selectedType}?format=semantic-ui`)
        .then(r => r.json());
      
      // 6. UI GENERATION: Genera colonne basate su schema
      this.generateColumnsFromSchema(schema.data);
      
      // 7. DATA LOAD: Carica entità di quel tipo
      await this.loadEntities(selectedType);
    });
  }
  
  async setupEntitySearchAutocomplete(input, entityType) {
    const autocomplete = new SmartAutocomplete();
    await autocomplete.init(entityType);
    
    // Debounce per performance
    let searchTimeout;
    
    input.addEventListener('input', async (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;
      
      if (query.length < 2) {
        this.hideDropdown();
        return;
      }
      
      // Mostra loading indicator
      this.showLoadingIndicator(input);
      
      searchTimeout = setTimeout(async () => {
        // SEARCH: Query schema-aware
        const results = await autocomplete.search(entityType, query, {
          limit: 10,
          includeCreate: true
        });
        
        // UI: Display results
        this.showDropdown(input, results);
      }, 300); // 300ms debounce
    });
    
    // Handle selection
    input.addEventListener('autocomplete-select', async (e) => {
      const selected = e.detail;
      
      if (selected.isCreateOption) {
        // CREATE: Nuova entità
        const created = await autocomplete.createEntity(
          entityType, 
          selected.suggestedValue
        );
        
        // Aggiungi alla tabella
        this.addRow(created.data);
        
        // Notifica WebSocket propagherà a tutti i client
      } else {
        // LOAD: Entità esistente
        const fullEntity = await fetch(`/api/entity/${selected.id}`)
          .then(r => r.json());
        
        this.populateRow(input.closest('tr'), fullEntity.data);
      }
    });
  }
}
```

### **Flusso Completo: User Type → Schema → Search → Display**

```
┌─────────────────┐
│ 1. User Types   │
│   "Mar..."      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ 2. Schema Check │────▶│ Which fields to  │
│   EntityType?   │     │ search? (nome,   │
└────────┬────────┘     │ email, etc.)     │
         │              └──────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐
│ 3. Search Query │────▶│ Neo4j: MATCH ... │
│   Optimized     │     │ WHERE nome       │
└────────┬────────┘     │ CONTAINS 'Mar'   │
         │              └──────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐
│ 4. Format       │────▶│ Apply display    │
│   Results       │     │ format from      │
└────────┬────────┘     │ schema           │
         │              └──────────────────┘
         ▼
┌─────────────────┐
│ 5. Show UI      │
│   Dropdown      │
└─────────────────┘
```

---

## 🎯 Esempi Pratici Avanzati

### **Esempio 5: Gestione di un Modulo Contestuale (Tabella "Membri Progetto")**

Questo esempio mostra come utilizzare le API per creare un modulo in cui le righe rappresentano entità (Persona), ma alcune colonne rappresentano **attributi contestuali**, appartenenti alla relazione che lega la persona al modulo (MEMBER_OF).

**Scenario**: Vogliamo creare una tabella "Team del Progetto X". Ogni riga è una Persona, ma le colonne "Ruolo" e "Fee" sono specifiche di questo progetto.

#### **Passo 1: Definizione della ModuleInstance**

La ModuleInstance è la chiave. Specifica che il modulo è popolato da relazioni.

```javascript
// POST /api/entities (con entityType: 'ModuleInstance')
{
  "entityType": "ModuleInstance",
  "id": "module-progetto-x-team",
  "name": "Team del Progetto X",
  "templateModuleId": "DynamicTable",
  "populationStrategy": "relation",      // <-- CHIAVE: Popolato da relazioni
  "populationRelationType": "MEMBER_OF",  // <-- CHIAVE: Tipo di relazione
  "instanceConfigOverrides": {
    // La notazione 'entity.' e 'relation.' è una convenzione per la UI
    "columns": [
      "entity.nome",       // Attributo intrinseco della Persona
      "entity.email",      // Attributo intrinseco della Persona
      "relation.ruolo",    // Attributo contestuale (della relazione)
      "relation.fee"       // Attributo contestuale (della relazione)
    ],
    "columnLabels": {
      "entity.nome": "Nome Membro",
      "entity.email": "Email",
      "relation.ruolo": "Ruolo nel Progetto",
      "relation.fee": "Fee (EUR)"
    }
  }
}
```

#### **Passo 2: Caricamento dei Dati per il Modulo (Frontend)**

Il frontend carica la ModuleInstance, vede `populationStrategy: "relation"`, e chiama l'API delle relazioni del modulo.

```http
GET /api/entity/module-progetto-x-team/relations?relationType=MEMBER_OF
```

**Response API Ottimizzata** (formato consigliato per questo caso d'uso):

```json
{
  "success": true,
  "data": [
    {
      "relationId": "rel-123",
      "relationType": "MEMBER_OF",
      "attributes": {           // Attributi della RELAZIONE
        "ruolo": "Lead Actor",
        "fee": 50000,
        "dataInizio": "2024-01-15",
        "dataFine": "2024-06-30"
      },
      "targetEntity": {         // L'entità CORRELATA
        "id": "persona-leo-456",
        "entityType": "Persona",
        "nome": "Leonardo DiCaprio",
        "email": "leo@hollywood.com",
        "telefono": "+1 555 123 4567"
      }
    },
    {
      "relationId": "rel-124",
      "relationType": "MEMBER_OF",
      "attributes": {
        "ruolo": "Supporting Actor",
        "fee": 25000,
        "dataInizio": "2024-02-01",
        "dataFine": "2024-05-15"
      },
      "targetEntity": {
        "id": "persona-brad-789",
        "entityType": "Persona", 
        "nome": "Brad Pitt",
        "email": "brad@hollywood.com",
        "telefono": "+1 555 987 6543"
      }
    }
  ]
}
```

> **Nota Importante**: Questo formato di risposta è ottimizzato per evitare chiamate multiple. Include sia gli attributi della relazione che l'entità completa correlata.

#### **Passo 3: Aggiornamento di un Attributo Intrinseco (Frontend)**

L'utente modifica l'email di Leonardo DiCaprio nella tabella.

- **UI Logic**: Il frontend vede che la colonna è mappata a `"entity.email"`
- **API Call**: Esegue una chiamata all'API delle entità

```http
PUT /api/entity/persona-leo-456/attribute
```

**Body:**
```json
{
  "attributeName": "email",
  "value": "leonardo.d@newemail.com"
}
```

> **Comportamento**: Questa modifica si rifletterà in TUTTE le tabelle dove appare Leonardo, poiché è un attributo intrinseco.

#### **Passo 4: Aggiornamento di un Attributo Contestuale (Frontend)**

L'utente modifica il ruolo di Leonardo DiCaprio nel progetto.

- **UI Logic**: Il frontend vede che la colonna è mappata a `"relation.ruolo"`
- **API Call**: Esegue una chiamata all'API delle relazioni

```http
PUT /api/relation/rel-123
```

**Body:**
```json
{
  "attributes": {
    "ruolo": "Protagonist",
    "fee": 75000  // Può aggiornare più attributi contemporaneamente
  }
}
```

> **Comportamento**: Questa modifica è specifica per QUESTO progetto. Leonardo può avere ruoli diversi in altri progetti.

#### **Passo 5: Aggiunta di una Nuova Colonna Contestuale (Evoluzione Schema)**

L'utente vuole aggiungere la colonna "Note di Regia" alla tabella del team.

**Step 5.1: Evoluzione Schema Relazione**

- **UI Logic**: Il modale "Aggiungi Colonna" permette di specificare che il nuovo attributo è "Contestuale"
- **API Call**: Il frontend chiama l'API per evolvere lo schema della relazione

```http
PUT /api/schema/relation/MEMBER_OF
```

**Body:**
```json
{
  "evolution": {
    "attributes": {
      "note_regia": {
        "type": "text",
        "description": "Note del regista sul ruolo",
        "uiMetadata": {
          "label": "Note di Regia",
          "component": "TextArea",
          "placeholder": "Inserisci note...",
          "group": "production"
        }
      }
    }
  }
}
```

**Step 5.2: Aggiornamento Configurazione Modulo**

- **UI Logic**: Il frontend aggiorna la ModuleInstance per includere la nuova colonna

```http
PUT /api/entity/module-progetto-x-team/attribute
```

**Body:**
```json
{
  "attributeName": "instanceConfigOverrides",
  "value": {
    "columns": [
      "entity.nome",
      "entity.email", 
      "relation.ruolo",
      "relation.fee",
      "relation.note_regia"  // Nuova colonna aggiunta
    ],
    "columnLabels": {
      "entity.nome": "Nome Membro",
      "entity.email": "Email",
      "relation.ruolo": "Ruolo nel Progetto",
      "relation.fee": "Fee (EUR)",
      "relation.note_regia": "Note di Regia"
    }
  }
}
```

#### **Implementazione Frontend Completa**

```javascript
class ContextualTableModule {
  constructor(moduleInstanceId) {
    this.moduleInstanceId = moduleInstanceId;
    this.moduleConfig = null;
    this.relations = [];
  }

  async init() {
    // 1. Carica configurazione modulo
    this.moduleConfig = await this.loadModuleInstance();
    
    // 2. Se popolato da relazioni, carica dati relazionali
    if (this.moduleConfig.populationStrategy === 'relation') {
      await this.loadRelationalData();
    }
    
    // 3. Genera UI
    this.renderTable();
    
    // 4. Setup real-time sync
    this.setupWebSocketSync();
  }

  async loadRelationalData() {
    const response = await fetch(
      `/api/entity/${this.moduleInstanceId}/relations?relationType=${this.moduleConfig.populationRelationType}`
    );
    const result = await response.json();
    this.relations = result.data;
  }

  renderTable() {
    const columns = this.moduleConfig.instanceConfigOverrides.columns;
    
    // Genera headers
    const headers = columns.map(col => {
      const label = this.moduleConfig.instanceConfigOverrides.columnLabels[col];
      const isContextual = col.startsWith('relation.');
      
      return `
        <th class="${isContextual ? 'contextual-column' : 'intrinsic-column'}">
          ${label}
          ${isContextual ? '<i class="bi bi-link-45deg" title="Attributo contestuale"></i>' : ''}
        </th>
      `;
    });

    // Genera righe
    const rows = this.relations.map(rel => {
      return columns.map(col => {
        const [source, attribute] = col.split('.');
        const value = source === 'entity' 
          ? rel.targetEntity[attribute]
          : rel.attributes[attribute];
        
        return `
          <td>
            <input 
              type="text" 
              value="${value || ''}"
              data-relation-id="${rel.relationId}"
              data-entity-id="${rel.targetEntity.id}"
              data-column="${col}"
              data-source="${source}"
              data-attribute="${attribute}"
              onchange="this.saveValue(this)"
            />
          </td>
        `;
      }).join('');
    });
  }

  async saveValue(input) {
    const source = input.dataset.source;
    const attribute = input.dataset.attribute;
    const value = input.value;

    if (source === 'entity') {
      // Aggiorna attributo intrinseco
      await fetch(`/api/entity/${input.dataset.entityId}/attribute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributeName: attribute, value })
      });
    } else {
      // Aggiorna attributo contestuale
      await fetch(`/api/relation/${input.dataset.relationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attributes: { [attribute]: value }
        })
      });
    }
  }

  setupWebSocketSync() {
    // Subscribe to both entity and relation changes
    ws.send(JSON.stringify({
      type: 'subscription',
      patterns: [
        {
          type: 'relation',
          relationType: this.moduleConfig.populationRelationType
        },
        {
          type: 'entity',
          entityType: 'Persona'  // O dinamico basato su config
        }
      ]
    }));
  }
}
```

#### **Best Practices per Moduli Contestuali**

1. **Naming Convention**: Usa sempre `entity.` e `relation.` come prefissi per distinguere gli attributi
2. **Visual Indicators**: Mostra icone o colori diversi per attributi intrinseci vs contestuali
3. **Performance**: Carica relazioni con entità embedded per evitare N+1 queries
4. **Validation**: Valida separatamente attributi entity (schema entità) e relation (schema relazione)
5. **Real-time Sync**: Sottoscrivi a eventi sia di entità che di relazioni

---

## 📝 Note Importanti

### **Error Handling**
Tutti gli endpoint restituiscono errori strutturati:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Il campo 'email' non è valido",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "rule": "email_format"
    }
  }
}
```

### **Rate Limiting**
- 1000 richieste/minuto per client
- WebSocket: 100 messaggi/secondo

### **Caching**
- Schema API: cache 5 minuti
- Entity API: no cache (real-time)
- UI Metadata: cache 10 minuti

### **Versioning**
- API Version: `v1` (implicita nell'URL)
- Schema Version: automatico tramite timestamp

---

**🎯 Questa guida copre tutti gli endpoint necessari per sviluppare moduli dinamici e reattivi nel sistema SSOT-3005.**