# Architettura Tecnica - MVP SSOT Dinamico Evoluto

## 1. Introduzione

**Stato del Sistema:** Questo documento descrive l'architettura tecnica del sistema SSOT Dinamico in versione **MVP Evoluto**, che rappresenta una significativa evoluzione rispetto al MVP iniziale. Il sistema ha ora implementato componenti core evoluti con gestione schema avanzata, persistenza completa e capacità di evoluzione dinamica real-time.

**Nota Storica:** Questo documento sostituisce `architettura_mvp.md` per riflettere l'implementazione attuale del sistema. Il documento originale rimane un riferimento per la fase MVP iniziale.

Il sistema SSOT Dinamico Evoluto dimostra:
- **Schema Evolution Real-time**: Modifiche strutturali istantanee senza perdita dati
- **Persistenza Schema Completa**: Tutti gli schemi sono persistiti su Neo4j
- **Sincronizzazione Cross-Window Avanzata**: Propagazione sia dati che struttura schema
- **API Backward-Compatible**: Mantiene compatibilità con componenti MVP originali
- **Operazioni Additive-Only**: Sicurezza dati tramite operazioni solo di aggiunta

## 2. Stack Tecnologico Evoluto

L'MVP Evoluto utilizza il seguente stack tecnologico:

*   **Backend Evoluto:**
    *   **Runtime:** Node.js
    *   **Framework Server:** Express.js con API RESTful evolute
    *   **Comunicazione Real-time:** WebSocket (`ws`) per sincronizzazione dati e schema
    *   **Database:** Neo4j con persistenza schema completa
    *   **Driver Neo4j:** `neo4j-driver` con query Cypher ottimizzate
    *   **Utility:** `uuid`, `cors`, logging avanzato
*   **Frontend Evoluto:**
    *   **Linguaggio:** Vanilla JavaScript (ES6+) con gestione URL parameters
    *   **Struttura:** HTML5 dinamico basato su schema
    *   **Stile:** CSS3 con stili primitivi per finestre figlie
    *   **Comunicazione Cross-Window:** `BroadcastChannel API` estesa per schema updates

## 3. Struttura del Progetto Evoluto

```
/mvp-ssot
|-- /backend
|   |-- /core                 # Core Engine Evoluto
|   |   |-- attributeSpace.js          # MVP version (mantenuta)
|   |   |-- entityEngine.js            # MVP version (mantenuta)
|   |   |-- schemaManager.js           # MVP version (mantenuta)
|   |   `-- schemaManager_evolved.js   # ✨ NUOVO: SchemaManager evoluto
|   |-- /dao                  # Data Access Layer Esteso
|   |   |-- neo4j_dao.js              # MVP version (mantenuta)
|   |   `-- neo4j_dao_evolved.js      # ✨ NUOVO: DAO evoluto per schemi
|   |-- /services             # Servizi di supporto
|   |-- neo4j_connector.js    # Gestore connessione Neo4j
|   |-- server.js             # Server MVP (mantenuto)
|   `-- server_evolved.js     # ✨ NUOVO: Server evoluto con API schema
|-- /frontend
|   |-- /modules              # Moduli UI Evoluti
|   |   |-- ContactCardModule.js      # Aggiornato per schema awareness
|   |   `-- TabularModule.js          # ✨ EVOLUTO: Schema-driven, URL params
|   |-- app.js                # ✨ EVOLUTO: Gestione schema cross-window
|   |-- app_module.js         # ✨ EVOLUTO: Schema sync finestre figlie
|   |-- index.html            # Dashboard principale (aggiornata)
|   |-- module_loader.html    # Template finestre figlie (aggiornato)
|   `-- style.css             # Stili CSS (mantenuti)
|-- package.json
|-- architettura_mvp_evoluto.md  # ✨ QUESTO DOCUMENTO
|-- context.md                     # Diario di bordo aggiornato
|-- doc_tecnico_evoluzione_core_v1.md  # Documentazione tecnica evoluzione
|-- full-ssot.md                  # Visione completa sistema
`-- manuale_sviluppo_mvp.md       # Guida MVP originale
```

## 4. Architettura Backend Evoluta

### 4.1. Server Evoluto (`server_evolved.js`)

**Framework:** Express.js con API RESTful estese per gestione schema avanzata.

**API REST Endpoints Evoluti:**
```javascript
// ✨ NUOVI ENDPOINT SCHEMA ENTITY
POST   /api/schema/entity/:entityType    // Crea nuovo schema entità
GET    /api/schema/entity/:entityType    // Recupera schema entità specifico
PUT    /api/schema/entity/:entityType    // Evolve schema entità (additive-only)
DELETE /api/schema/entity/:entityType    // Elimina schema entità
GET    /api/schema/entities              // Lista tutti gli schemi entità

// ✨ NUOVI ENDPOINT SCHEMA RELATION  
POST   /api/schema/relation/:relationType    // Crea nuovo schema relazione
GET    /api/schema/relation/:relationType    // Recupera schema relazione
PUT    /api/schema/relation/:relationType    // Evolve schema relazione
DELETE /api/schema/relation/:relationType    // Elimina schema relazione
GET    /api/schema/relations                 // Lista tutti gli schemi relazione

// ✨ NUOVI ENDPOINT RELATION ENGINE (Implementati e Testati)
POST   /api/relations                       // Crea una nuova relazione tipizzata
GET    /api/relations                       // Trova relazioni basate su pattern (sourceEntityId, targetEntityId, relationType, ecc.)
GET    /api/relations/stats                 // Recupera statistiche sulle relazioni
GET    /api/relations/:relationId           // Recupera una relazione specifica per ID
PUT    /api/relations/:relationId           // Aggiorna gli attributi di una relazione specifica
DELETE /api/relations/:relationId           // Elimina una relazione specifica
GET    /api/entities/:entityId/relations    // Recupera le entità correlate a un'entità specifica (con filtri opzionali)

// 🔄 ENDPOINT MVP MANTENUTI (Backward Compatibility)
GET    /api/entities/:entityType         // Recupera entità (compatibile)
POST   /api/entities                     // Crea entità (compatibile)
GET    /api/entity/:entityId             // Recupera entità singola (compatibile)
PUT    /api/entity/:entityId/attribute   // Aggiorna attributo (compatibile)
GET    /api/schema/:entityType/attributes // Recupera attributi MVP style
```

**WebSocket Server Evoluto:**
- Gestione connessioni multiple con propagazione schema changes
- Eventi per modifiche entità (`attributeChange`) e schema (`schemaEvolution`)
- ✨ Eventi per modifiche relazioni (`relation-created`, `relation-updated`, `relation-deleted`)
- Sincronizzazione real-time tra finestre e sessioni

### 4.2. SchemaManager Evoluto (`core/schemaManager_evolved.js`)

**Caratteristiche Principali:**
- **Persistenza Completa:** Tutti gli schemi salvati su Neo4j con versioning
- **Evoluzione Dinamica:** API per modificare schemi a runtime senza restart
- **Operazioni Additive-Only:** Sicurezza dati con `MERGE` e `ON CREATE SET`
- **Modalità Flessibili:** Support per 'strict' e 'flexible' schema modes

**Metodi Chiave:**
```javascript
// Creazione e gestione schemi
async defineEntitySchema(entityType, schemaDefinition)
async defineRelationSchema(relationType, schemaDefinition)
async evolveSchema(entityType, evolution)

// Caricamento e validazione
async loadSchemaFromPersistence(entityType)
async loadAllEntitySchemas()
async loadAllRelationSchemas()
validateAttributeValue(entityType, attributeName, value)

// Evoluzione e migrazione
async addAttributeToSchema(entityType, attributeName, definition)
requiresDataMigration(evolution, currentSchema, newSchema)
```

**Struttura EntitySchema:**
```javascript
{
    entityType: "Cliente",
    version: 2,
    mode: "flexible", // o "strict"
    created: timestamp,
    modified: timestamp,
    constraints: [],
    attributes: Map([
        ["nome", {
            type: "string",
            required: true,
            description: "Nome cliente",
            defaultValue: null,
            validationRules: []
        }],
        ["email", {
            type: "email", 
            required: false,
            description: "Email cliente",
            defaultValue: null,
            validationRules: []
        }]
    ])
}
```

### 4.3. DAO Evoluto (`dao/neo4j_dao_evolved.js`)

**Nuove Funzioni per Gestione Schemi:**
```javascript
// Schema Entity Types
async saveEntitySchema(schema)
async loadEntitySchema(entityType)
async updateEntitySchema(schema)
async getAllEntitySchemas()

// Schema Relation Types
async saveRelationSchema(schema)
async loadRelationSchema(relationType)
async getAllRelationSchemas()

// Operazioni Schema Evolution
async addAttributeToSchema(entityType, attributeName, definition)
async getSchemaVersion(entityType)
```

**Query Cypher Ottimizzate:**
- Caricamento schemi con `OPTIONAL MATCH` per attributi
- Operazioni `MERGE ... ON CREATE SET` per sicurezza
- Gestione relazioni `:HAS_ATTRIBUTE` per struttura schema

### 4.4. Modello Dati Neo4j per Schemi

**Schema Entity Type:**
```cypher
(:SchemaEntityType {
    entityType: "Cliente",
    version: 2,
    mode: "flexible",
    created: timestamp,
    modified: timestamp,
    constraints: []
})-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "email",
    type: "email",
    required: false,
    defaultValue: null,
    description: "Email del cliente",
    validationRules: "[]"
})
```

**Schema Relation Type:**
```cypher
(:SchemaRelationType {
    relationType: "Conosce",
    version: 1,
    cardinality: "N:M",
    sourceTypes: ["Persona"],
    targetTypes: ["Persona"],
    created: timestamp,
    modified: timestamp
})-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "dataIncontro",
    type: "date",
    required: true,
    description: "Data primo incontro"
})
```

## 5. Architettura Frontend Evoluta

### 5.1. TabularModule Evoluto (`modules/TabularModule.js`)

**Nuove Caratteristiche:**
- **Dynamic Entity Type:** Lettura `entityType` da URL parameters per finestre multiple
- **Schema-Driven Rendering:** Utilizza API evolute con fallback MVP
- **Schema Evolution UI:** Interfaccia per aggiungere attributi dinamicamente
- **Cross-Window Schema Sync:** Notifica altre finestre di cambiamenti struttura

**Funzionalità Chiave:**
```javascript
// Lettura dinamica tipo entità
const urlParams = new URLSearchParams(window.location.search);
this.entityType = urlParams.get('entityType') || 'TestEvoluzione';

// Caricamento schema evoluto con fallback
async fetchAttributes() {
    // Prima prova API evolute
    const response = await fetch(`/api/schema/entity/${this.entityType}`);
    if (response.ok) {
        const result = await response.json();
        return result.data.attributes.map(attr => attr.name);
    }
    // Fallback API MVP
    const fallbackResponse = await fetch(`/api/schema/${this.entityType}/attributes`);
    return await fallbackResponse.json();
}

// Evoluzione schema real-time
async addNewAttribute() {
    // Verifica schema esistente
    let schemaResponse = await fetch(`/api/schema/entity/${this.entityType}`);
    
    if (!schemaResponse.ok) {
        // Crea nuovo schema
        await fetch(`/api/schema/entity/${this.entityType}`, {
            method: 'POST',
            body: JSON.stringify(newSchema)
        });
    } else {
        // Evolve schema esistente
        await fetch(`/api/schema/entity/${this.entityType}`, {
            method: 'PUT',
            body: JSON.stringify(evolutionData)
        });
    }
    
    // Notifica cross-window
    this.notifySchemaUpdate(attributeName);
}
```

### 5.2. Gestione Cross-Window Evoluta (`app.js` e `app_module.js`)

**Schema Update Events:**
```javascript
// Nuovo tipo di messaggio per aggiornamenti schema
{
    type: 'schema-update',
    entityType: 'Cliente',
    newAttribute: 'telefono',
    timestamp: Date.now(),
    source: 'main-window'
}

// Gestione eventi schema
handleCrossWindowMessage(data) {
    if (data.type === 'entity-update') {
        // Gestione aggiornamenti dati (esistente)
        this.propagateEntityUpdate(data);
    } else if (data.type === 'schema-update') {
        // ✨ NUOVO: Gestione aggiornamenti schema
        this.propagateSchemaUpdate(data);
    }
}
```

**Sincronizzazione Struttura:**
- Propagazione immediate di nuove colonne/attributi
- Re-rendering automatico tabelle con nuova struttura
- Persistenza configurazione finestre separate

## 6. Flusso Dati e Schema Evolution

### 6.1. Flusso Schema Evolution End-to-End

**Scenario: Aggiunta Nuovo Attributo "telefono" a Cliente**

1. **UI Action:** Utente clicca "Aggiungi Colonna" → inserisce "telefono"
2. **Frontend Check:** TabularModule verifica se schema evoluto esiste
3. **API Evolution:** PUT `/api/schema/entity/Cliente` con nuovo attributo
4. **Backend Processing:** SchemaManager_evolved.addAttributeToSchema()
5. **Neo4j Update:** `MERGE` nuovo nodo `:AttributeDefinition`
6. **Response:** Conferma successo evoluzione schema
7. **UI Update:** Tabella re-renderizzata con nuova colonna "telefono"
8. **Cross-Window Broadcast:** Evento 'schema-update' inviato a tutte le finestre
9. **Sync Windows:** Altre finestre ricevono e applicano nuova struttura
10. **Persistence:** Schema modificato immediatamente disponibile per nuove sessioni

### 6.2. Sicurezza e Integrità Dati

**Operazioni Additive-Only:**
```cypher
-- ✅ SICURO: Solo aggiunta, mai eliminazione
MERGE (s:SchemaEntityType {entityType: $entityType})-[:HAS_ATTRIBUTE]->(a:AttributeDefinition {name: $attributeName})
ON CREATE SET 
    a.type = $type,
    a.required = $required,
    a.description = $description

-- ❌ EVITATO: Eliminazioni che causerebbero errori relazioni
DELETE (a:AttributeDefinition) -- Mai usato nel sistema evoluto
```

**Validazione e Rollback:**
- Backup automatico versione schema precedente
- Validazione compatibilità prima dell'applicazione
- Rollback disponibile tramite API (futuro)

## 7. Compatibilità e Migrazione

### 7.1. Backward Compatibility

**API MVP Mantenute:**
- Tutti gli endpoint originali rimangono funzionali
- Frontend MVP originale continua a funzionare
- Graceful degradation per browser non supportati

**Migrazione Graduale:**
- Schema discovery automatico da dati esistenti
- Conversione progressiva a schemi evoluti
- Coesistenza pacifica componenti MVP e evoluti

### 7.2. Performance e Scalabilità

**Ottimizzazioni Implementate:**
- Query Cypher ottimizzate con `OPTIONAL MATCH`
- Caching in-memory degli schemi caricati
- Lazy loading componenti schema non utilizzati
- Batching operazioni multiple per ridurre round-trips

## 8. Funzionalità Dimostrate

### 8.1. ✅ Schema Evolution Real-time
- Aggiunta attributi senza restart server
- Propagazione immediate modifiche struttura
- Persistenza automatica configurazioni

### 8.2. ✅ Multi-Window Synchronization  
- Sincronizzazione dati tra finestre (MVP)
- ✨ Sincronizzazione struttura schema tra finestre (Evoluto)
- Gestione robusta eventi cross-window

### 8.3. ✅ Schema Persistence
- Persistenza completa schemi su Neo4j
- Versioning e audit trail modifiche
- Backup automatico configurazioni

### 8.4. ✅ Flexible Schema Modes
- Modalità 'flexible': accetta attributi ad-hoc
- Modalità 'strict': solo attributi definiti in schema
- Conversion dinamica tra modalità

## 9. Test e Validazione

### 9.1. Scenari di Test Implementati

**Test Schema Evolution:**
1. ✅ Creazione schema da zero con primi attributi
2. ✅ Evoluzione schema esistente con nuovi attributi  
3. ✅ Propagazione cross-window modifiche struttura
4. ✅ Persistenza e recovery dopo restart server
5. ✅ Backward compatibility con componenti MVP

**Test Multi-Entity Types:**
1. ✅ Gestione tipi entità multipli (`Cliente`, `Persona`, `TestEvoluzione`)
2. ✅ Switching dinamico tra tipi in finestre separate
3. ✅ Persistenza configurazione per tipo entità specifico

### 9.2. Reliability e Robustezza

**Error Handling:**
- Gestione errori API con fallback graceful
- Recovery automatico da disconnessioni WebSocket
- Validazione input utente e sanitization

**Data Integrity:**
- Solo operazioni additive per evitare perdita dati
- Validation schema prima dell'applicazione
- Audit trail completo delle modifiche

## 10. Prossimi Passi e Roadmap

### 10.1. Completamento Core Engine (Doc Tecnico)
- Implementazione RelationEngine per relazioni tipizzate
- EntityEngine evoluto con lazy loading e riferimenti
- AttributeSpace potenziato con pattern matching avanzato

### 10.2. UI Schema-Aware Avanzata  
- Generazione automatica form basati su schema
- Validazione client-side dinamica
- UI admin per gestione schemi visuale

### 10.3. Schema Evolution Avanzata
- Rollback/undo modifiche schema
- Migration assistita per trasformazioni complesse
- Branching e merging schemi per ambienti multipli

---

## Conclusioni

Il **MVP SSOT Dinamico Evoluto** rappresenta una significativa evoluzione del sistema originale, implementando funzionalità core per la gestione dinamica degli schemi con persistenza completa e sincronizzazione real-time. Il sistema dimostra:

- **Flessibilità:** Schema evolution senza interruzioni
- **Robustezza:** Operazioni additive-only per sicurezza dati  
- **Scalabilità:** Architettura pronta per estensioni future
- **Usabilità:** Interface intuitiva per modifiche strutturali
- **Compatibilità:** Coesistenza con componenti MVP originali

La base architettonica è ora solida per implementare le funzionalità complete descritte in `doc_tecnico_evoluzione_core_v1.md`. 