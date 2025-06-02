# Documento Tecnico: Evoluzione Core Engine e Gestione Schemi SSOT (Versione 1.0)

[Nota per l'LLM: Questo documento è un piano tecnico dettagliato per evolvere il backend del sistema SSOT dalla versione MVP attuale verso una versione più robusta e allineata con la visione completa delineata in `full-ssot.md`. Aggiorna questo documento man mano che l'implementazione procede.]

## 1. Introduzione

### 1.1. Scopo del Documento

Questo documento definisce l'architettura tecnica e il piano di implementazione per il prossimo macro passo evolutivo del sistema SSOT Dinamico: il potenziamento del Core Engine Backend e l'evoluzione del Sistema di Gestione degli Schemi.

L'obiettivo è trasformare i componenti `_MVP` attuali in un'architettura più sofisticata, robusta e allineata con la visione completa del SSOT Dinamico descritta in `full-ssot.md`.

### 1.2. Obiettivi Primari del Macro Passo

1. **Evoluzione dell'Entity Engine**: Da `EntityEngine_MVP` a un `EntityEngine` completo con lazy loading, integrazione schema avanzata e gestione del ciclo di vita estesa
2. **Introduzione del Relation Engine**: Implementazione di un nuovo componente che gestisce le relazioni come entità di prima classe, inclusa la capacità di modellare attributi complessi come relazioni a "value-entities".
3. **Potenziamento dell'AttributeSpace**: Miglioramenti nella gestione delle sottoscrizioni e propagazione dei cambiamenti
4. **Evoluzione dello Schema Manager**: Da gestione in-memory a persistenza completa, gestione dinamica (inclusa la "promozione" di attributi e la trasformazione in riferimenti), e versionamento degli schemi, per supportare una crescita organica della conoscenza.

### 1.3. Allineamento con la Visione Strategica SSOT (Rif. `full-ssot.md`)

Questo macro passo implementa direttamente i seguenti principi chiave della visione SSOT:

- **Entità e Relazioni come Fondamenta**: Realizzazione completa del concetto di relazioni come entità di prima classe, e introduzione di una granularità semantica più profonda dove attributi significativi possono essere modellati come entità referenziate (Sezione 2 di `full-ssot.md`)
- **Reattività Pervasiva**: Miglioramento del sistema nervoso informativo per propagazione intelligente (Sezione 8.4 di `full-ssot.md`)
- **Schema Evolution**: Implementazione della capacità degli schemi di evolversi dinamicamente, inclusa la formalizzazione di attributi scoperti e la loro potenziale trasformazione in strutture relazionali più ricche (Sezione 5.1 di `full-ssot.md`)
- **Persistenza Intelligente**: Fondamenta per la memorizzazione ottimizzata descritta nella Sezione 8.5
- **Crescita Organica della Conoscenza**: Abilitare il sistema a partire da un nucleo definito e ad evolvere attraverso l'uso, formalizzando nuovi pattern informativi.

### 1.4. Principi di Progettazione Guida per l'Evoluzione

- **Estensibilità**: Ogni componente deve essere progettato per future espansioni
- **Testabilità**: Separazione chiara delle responsabilità e API ben definite
- **Performance**: Ottimizzazioni per gestire carichi maggiori rispetto all'MVP
- **Retrocompatibilità**: Minimizzare l'impatto sui componenti frontend esistenti
- **Modularità**: Componenti loosely coupled con interfacce chiare

### 1.5. Riferimenti Documentali Chiave

- `full-ssot.md`: Visione completa del sistema SSOT Dinamico
- `architettura_mvp.md`: Architettura attuale dell'MVP
- `manuale_sviluppo_mvp.md`: Guida di sviluppo dell'MVP
- `context.md`: Diario di bordo dello sviluppo

## 2. Contesto: Stato Attuale del Backend (Derivato dall'MVP)

### 2.1. Architettura Backend dell'MVP

L'attuale architettura backend comprende:

**EntityEngine_MVP** (`backend/core/entityEngine.js`):
- Gestione CRUD base delle entità
- Coordinamento tra DAO, SchemaManager e AttributeSpace
- Metodi: `createEntity()`, `setEntityAttribute()`, `getEntity()`, `getAllEntities()`

**AttributeSpace_MVP** (`backend/core/attributeSpace.js`):
- Pattern Observer per reattività
- Gestione lista di connessioni WebSocket
- Propagazione broadcast dei cambiamenti
- Metodi: `addConnection()`, `removeConnection()`, `broadcastChange()`

**SchemaManager_MVP** (`backend/core/schemaManager.js`):
- Gestione in-memory dei tipi di entità e attributi
- Caricamento iniziale dinamico da Neo4j
- Metodi: `addAttributeToType()`, `getAttributesForType()`, `loadSchemaFromDB()`

**Neo4jDAO** (`backend/dao/neo4j_dao.js`):
- Operazioni CRUD di base su Neo4j
- Funzioni: `createEntity()`, `getEntityById()`, `updateEntityAttribute()`, `getAllEntities()`, `getAllAttributeKeysForEntityType()`

### 2.2. Limitazioni Identificate e Motivazioni per l'Evoluzione

**Limitazioni Attuali**:
1. **Mancanza di Relazioni Strutturate**: Le relazioni non sono gestite come entità di prima classe
2. **Schema Statico**: Lo SchemaManager non persiste modifiche e non supporta evoluzione dinamica
3. **AttributeSpace Semplificato**: Mancano pattern matching avanzati e gestione ottimizzata della propagazione
4. **EntityEngine Basilare**: Manca lazy loading, validazioni avanzate e gestione del ciclo di vita completa

**Motivazioni per l'Evoluzione**:
- Allineamento con la visione completa di `full-ssot.md`
- Preparazione per funzionalità avanzate come moduli dinamici e workflow
- Miglioramento delle performance e scalabilità
- Supporto per casi d'uso più complessi e realistici

## 3. Architettura Proposta per il Core Engine Evoluto

### 3.1. Panoramica Generale e Filosofia dell'Architettura Evoluta

L'architettura evoluta mantiene la separazione delle responsabilità dell'MVP ma introduce:
- **Gestione Unificata delle Entità e Relazioni**: Sia entità che relazioni sono trattate come oggetti di prima classe
- **Schema Vivente**: Gli schemi possono essere modificati, versionati e persistiti dinamicamente
- **Reattività Intelligente**: Propagazione ottimizzata con pattern matching e batching
- **API Coerente**: Interfacce uniformi per tutti i componenti del core

### 3.2. EntityEngine (Evoluzione da `EntityEngine_MVP`)

#### 3.2.1. Motivazioni e Benefici Chiave dell'Evoluzione

**Motivazioni**:
- Supportare lazy loading per performance migliori
- Integrare validazioni avanzate basate su schema
- Gestire il ciclo di vita completo delle entità
- Preparare l'integrazione con il RelationEngine

**Benefici**:
- Performance migliorate su dataset grandi
- Validazione e integrità dei dati più robusta
- API più ricca e flessibile
- Fondamenta per funzionalità avanzate

#### 3.2.2. Funzionalità Target e Miglioramenti Specifici

**Lazy Loading**:
```javascript
// Entità caricate solo quando richieste
getEntity(id, type = null) {
    if (!this.entities.has(id)) {
        const entity = this.loadEntityFromPersistence(id, type);
        this.registerEntity(entity);
    }
    return this.entities.get(id);
}
```

**Schema Integration**:
- Applicazione automatica di defaults da schema
- Validazione attributi in tempo reale
- Supporto per attributi computati

**Lifecycle Management**:
- Eventi di creazione, modifica, eliminazione
- Cleanup automatico di entità non utilizzate
- Gestione stato (dirty, clean, deleted)

#### 3.2.3. Design Tecnico Proposto

```javascript
class EntityEngine {
    constructor(schemaManager, attributeSpace, persistence, relationEngine) {
        this.entities = new Map(); // id -> Entity
        this.entityStates = new Map(); // id -> EntityState
        this.schemaManager = schemaManager;
        this.attributeSpace = attributeSpace;
        this.persistence = persistence;
        this.relationEngine = relationEngine;
        this.events = new EventBus();
    }

    // Lazy loading con auto-discovery
    async getEntity(id, type = null, options = { resolveReferences: false }) {
        let entity = this.entities.get(id);
        if (!entity) {
            entity = await this.persistence.loadEntityById(id, type);
            if (!entity) return null;
            this.registerEntity(entity);
        }

        if (options.resolveReferences) {
            await this.resolveEntityReferences(entity);
        }
        return entity;
    }
    
    // Creazione con validazione schema
    async createEntity(type, initialData) {
        const schema = this.schemaManager.getEntitySchema(type);
        if (!schema && (this.schemaManager.getModeForEntityType(type) === 'strict')) { // Assumendo una funzione per ottenere la mode
            throw new Error(`Entity type ${type} not defined in schema (strict mode).`);
        }

        const entity = new Entity(type, generateUniqueId());
        if (schema) {
            this.applySchemaDefaults(entity, schema);
        }

        for (const [key, value] of Object.entries(initialData)) {
            await this.setEntityAttribute(entity.id, key, value, { isNewEntity: true, entityInstance: entity, schemaInstance: schema });
        }
        
        await this.persistence.saveEntity(entity); // Salva dopo aver impostato tutti gli attributi iniziali
        this.registerEntity(entity);
        this.events.emit('entity.created', { entity });
        return entity;
    }
    
    // Aggiornamento con propagazione
    async setEntityAttribute(entityId, attributeName, value, options = {}) {
        const entity = options.entityInstance || await this.getEntity(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found.`);
        }

        const schema = options.schemaInstance || this.schemaManager.getEntitySchema(entity.type);
        const attributeSchema = schema ? schema.attributes.get(attributeName) : null;

        if (!attributeSchema && schema && schema.mode === 'strict') {
            throw new Error(`Attribute ${attributeName} not defined in schema for ${entity.type} (strict mode).`);
        }

        if (attributeSchema) {
            const validation = attributeSchema.validate(value);
            if (!validation.valid) {
                throw new Error(`Validation failed for ${attributeName}: ${validation.error}`);
            }

            if (attributeSchema.type === 'reference') {
                // Delega al RelationEngine la gestione del link
                // 'value' qui dovrebbe essere l'ID dell'entità referenziata, o null per rimuovere il riferimento.
                await this.relationEngine.manageReferenceAttributeLink(entityId, attributeSchema, value);
                // L'entità sorgente è cambiata concettualmente, quindi emettiamo un evento.
                // Potremmo voler memorizzare l'ID referenziato direttamente sull'entità per query semplici,
                // ma la "verità" è nella relazione.
                // Per ora, assumiamo che la lettura di questo attributo risolverà la relazione.
            } else {
                // Attributo letterale
                entity.setAttribute(attributeName, value);
                if (!options.isNewEntity) { // Non persistere ogni attributo singolarmente durante la creazione
                    await this.persistence.updateEntityAttribute(entityId, attributeName, value);
                }
            }
        } else { // Attributo ad-hoc in modalità flessibile
            entity.setAttribute(attributeName, value);
            if (!options.isNewEntity) {
                await this.persistence.updateEntityAttribute(entityId, attributeName, value); // o una saveEntity completa
            }
            // Se in modalità flessibile e lo schemaManager "scopre" attributi, notificarlo qui.
            if (schema && schema.mode === 'flexible') {
                this.schemaManager.notifyAttributeDiscovery(entity.type, attributeName, this.determineAttributeType(value));
            }
        }

        if (!options.isNewEntity) {
            this.markEntityDirty(entityId);
            this.attributeSpace.propagateChange(entityId, attributeName, value, entity.getAttribute(attributeName) /*old value potentially needed*/);
            this.events.emit('entity.attribute.changed', { entityId, attributeName, newValue: value });
        }
    }

    async resolveEntityReferences(entity) {
        const schema = this.schemaManager.getEntitySchema(entity.type);
        if (!schema) return;

        entity.resolvedReferences = {}; // Contenitore per i dati referenziati

        for (const [attrName, attrDef] of schema.attributes) {
            if (attrDef.type === 'reference') {
                const relatedEntities = await this.relationEngine.findRelations({
                    source: entity.id,
                    type: attrDef.relationTypeForReference,
                    // limit: attrDef.cardinalityForReference.endsWith(':1') ? 1 : undefined
                });
                
                if (relatedEntities && relatedEntities.length > 0) {
                    if (attrDef.cardinalityForReference.endsWith(':1')) {
                        const targetEntity = await this.getEntity(relatedEntities[0].targetEntityId, attrDef.referencesEntityType, { resolveReferences: false }); // Evita ricorsione infinita
                        entity.resolvedReferences[attrName] = targetEntity ? targetEntity.attributes.get(attrDef.displayAttributeFromReferencedEntity) : null;
                        // Opzionalmente, si potrebbe mettere l'ID direttamente in entity.attributes[attrName] per coerenza
                        entity.attributes.set(attrName, relatedEntities[0].targetEntityId); 
                    } else { // 1:N or N:M
                        const targets = [];
                        for (const rel of relatedEntities) {
                            const targetEntity = await this.getEntity(rel.targetEntityId, attrDef.referencesEntityType, { resolveReferences: false });
                            if (targetEntity) {
                                targets.push({ id: targetEntity.id, displayValue: targetEntity.attributes.get(attrDef.displayAttributeFromReferencedEntity) });
                            }
                        }
                        entity.resolvedReferences[attrName] = targets;
                        entity.attributes.set(attrName, targets.map(t => t.id));
                    }
                } else {
                    entity.attributes.set(attrName, null);
                }
            }
        }
    }
    
    // Gestione ciclo di vita
    markEntityDirty(entityId) { /* implementazione */ }
    async persistDirtyEntities() { /* implementazione */ }
    
    // Query avanzate
    async findEntities(criteria) { /* implementazione */ }
}
```

### 3.3. RelationEngine (Nuovo Componente Fondamentale)

#### 3.3.1. Motivazioni e Benefici dell'Introduzione del RelationEngine

**Motivazioni**:
- Implementare il concetto di "Relazioni come Entità di Prima Classe" da `full-ssot.md`
- Supportare relazioni con attributi propri e semantica ricca
- Abilitare query e navigazione sofisticate nel grafo di entità
- Preparare per funzionalità avanzate come workflow e moduli dinamici

**Benefici**:
- Modellazione più accurata della realtà operativa
- Query relazionali potenti
- Tracciabilità e auditabilità delle relazioni
- Fondamenta per intelligenza delle connessioni

#### 3.3.2. Concetto di "Relazioni come Entità di Prima Classe"

Ogni relazione nel sistema è un'istanza di un TipoRelazione definito nello SchemaManager:

```javascript
// Definizione tipo relazione
RelationType:HaComeAgente = {
    participants: [
        { entityType: 'Persona', role: 'client', cardinality: '1' },
        { entityType: 'Persona', role: 'agent', cardinality: '1' }
    ],
    attributes: {
        dataInizio: { type: 'date', required: true },
        tipoContratto: { type: 'select', options: ['Esclusivo', 'Non-esclusivo'] },
        commissione: { type: 'percentage', default: 10 }
    }
}

// Istanza relazione
Persona:AlessioHong <HaComeAgente:Rel001 {
    dataInizio="01/01/2025", 
    tipoContratto="Esclusivo",
    commissione=15
}> Persona:MarcoAgent
```

#### 3.3.3. Design Tecnico Proposto

```javascript
class RelationEngine {
    constructor(entityEngine, schemaManager, persistence) {
        this.relations = new Map(); // id -> Relation
        this.entityRelations = new Map(); // entityId -> Set<relationId>
        this.relationsByType = new Map(); // relationType -> Set<relationId>
        this.entityEngine = entityEngine;
        this.schemaManager = schemaManager;
        this.persistence = persistence;
    }

    // Creazione relazione tipizzata
    async createRelation(type, sourceEntityId, targetEntityId, attributes = {}) {
        const schema = this.schemaManager.getRelationSchema(type);
        if (!schema) {
            throw new Error(`Relation type ${type} not defined in schema.`);
        }
        this.validateRelationCreation(schema, sourceEntityId, targetEntityId, attributes);
        
        const relation = new Relation(type, sourceEntityId, targetEntityId);
        await this.applyAttributesWithValidation(relation, attributes, schema);
        
        await this.persistRelation(relation);
        this.registerRelation(relation);
        
        return relation;
    }

    // Query relazioni con pattern
    findRelations(pattern) {
        // pattern: { source: "Cliente.*", type: "HaOrdinato", target: "Prodotto.*" }
        // Questa implementazione base può essere potenziata per query più complesse.
        return Array.from(this.relations.values())
            .filter(rel => this.matchesRelationPattern(rel, pattern));
    }

    // Navigazione bidirezionale
    getRelatedEntities(entityId, relationType = null, direction = 'both') {
        // Implementazione navigazione efficiente
    }

    // Gestisce la creazione/aggiornamento/rimozione di una relazione che rappresenta un attributo di tipo "reference"
    async manageReferenceAttributeLink(sourceEntityId, attributeSchema, targetValueEntityIdOrNull) {
        const { relationTypeForReference, cardinalityForReference, referencesEntityType } = attributeSchema;

        // Trova e rimuovi relazioni esistenti in base alla cardinalità
        const existingRelations = await this.findRelations({
            source: sourceEntityId,
            type: relationTypeForReference,
            // target: se targetValueEntityIdOrNull è specificato e vogliamo solo aggiornare quella specifica, altrimenti tutte le relazioni di quel tipo
        });

        for (const rel of existingRelations) {
            // Per cardinalità N:1 o 1:1, rimuoviamo la vecchia relazione prima di crearne una nuova.
            // Per N:M, questo passo potrebbe essere diverso (es. aggiungere e non sostituire, a meno che targetValueEntityIdOrNull indichi una rimozione specifica)
            if (cardinalityForReference === 'N:1' || cardinalityForReference === '1:1') {
                await this.deleteRelation(rel.id); 
            }
            // TODO: Gestire N:M e 1:N più specificamente se necessario qui.
        }

        if (targetValueEntityIdOrNull) {
            // Verifica che targetValueEntityIdOrNull sia un ID valido per referencesEntityType (potrebbe essere fatto a monte o qui)
            // await this.entityEngine.getEntity(targetValueEntityIdOrNull, referencesEntityType); // Throws se non esiste o tipo errato
            
            return this.createRelation(relationTypeForReference, sourceEntityId, targetValueEntityIdOrNull, {});
        }
        return null; // Nessuna nuova relazione creata se targetValueEntityIdOrNull è null (significa "rimuovi riferimento")
    }
}

class Relation {
    constructor(type, sourceId, targetId) {
        this.id = generateUniqueId();
        this.type = type;
        this.sourceEntityId = sourceId;
        this.targetEntityId = targetId;
        this.attributes = new Map();
        this.created = Date.now();
        this.modified = Date.now();
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
        this.modified = Date.now();
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }
}
```

### 3.4. AttributeSpace (Evoluzione da `AttributeSpace_MVP`)

#### 3.4.1. Motivazioni e Benefici Chiave dell'Evoluzione

**Motivazioni**:
- Supportare pattern matching avanzati per sottoscrizioni
- Implementare batching e ottimizzazioni per performance
- Gestire propagazione per relazioni oltre che entità
- Prevenire loop infiniti e gestire dipendenze circolari

**Benefici**:
- Sottoscrizioni più flessibili e potenti
- Performance migliori con grandi volumi di cambiamenti
- Sistema di propagazione più robusto e affidabile

#### 3.4.2. Funzionalità Target e Miglioramenti Specifici

**Pattern Matching Avanzato**:
```javascript
// Esempi di pattern supportati
attributeSpace.subscribe("Cliente.*.email", callback);           // Qualsiasi cliente, attributo email
attributeSpace.subscribe("*.stato", callback);                  // Qualsiasi entità, attributo stato
attributeSpace.subscribe("Progetto.budget", callback);          // Specifico: budget di progetti
attributeSpace.subscribe("HaComeAgente:*.commissione", callback); // Relazioni: commissione in relazioni HaComeAgente
```

**Batching e Throttling**:
- Raggruppamento di cambiamenti in batch per ridurre overhead
- Throttling per prevenire spam di notifiche
- Prioritizzazione di cambiamenti critici

#### 3.4.3. Design Tecnico Proposto

```javascript
class AttributeSpace {
    constructor() {
        this.subscriptions = new Map(); // pattern -> Set<subscription>
        this.propagationQueue = new Set();
        this.batchTimer = null;
        this.circuitBreaker = new Map(); // pattern -> failureCount
    }

    // Sottoscrizione con pattern matching avanzato
    subscribe(pattern, callback, options = {}) {
        const subscription = new AttributeSubscription(pattern, callback, options);
        
        if (!this.subscriptions.has(pattern)) {
            this.subscriptions.set(pattern, new Set());
        }
        this.subscriptions.get(pattern).add(subscription);
        
        return () => this.unsubscribe(subscription);
    }

    // Propagazione con batching
    propagateChange(entityId, attributeName, newValue, oldValue, changeType = 'entity') {
        const change = {
            entityId,
            attributeName,
            newValue,
            oldValue,
            changeType, // 'entity' | 'relation'
            timestamp: Date.now()
        };

        this.propagationQueue.add(change);
        this.scheduleBatchProcessing();
    }

    // Elaborazione batch ottimizzata
    processBatch() {
        const changes = Array.from(this.propagationQueue);
        this.propagationQueue.clear();

        // Raggruppa cambiamenti per pattern
        const changesByPattern = this.groupChangesByPattern(changes);
        
        // Processa ogni gruppo
        for (const [pattern, patternChanges] of changesByPattern) {
            this.processPatternChanges(pattern, patternChanges);
        }
    }

    // Pattern matching efficiente
    matchesPattern(changePath, pattern) {
        // Implementazione pattern matching con wildcard e regex
    }
}
```

### 3.5. SchemaManager (Evoluzione Radicale da `SchemaManager_MVP`)

#### 3.5.1. Motivazioni e Benefici Chiave dell'Evoluzione

**Motivazioni**:
- Persistere definizioni di schema su Neo4j per durabilità
- Supportare evoluzione dinamica degli schemi a runtime
- Gestire sia schemi di entità che di relazioni
- Implementare versionamento per tracciare cambiamenti

**Benefici**:
- Schema come "living documentation" del sistema
- Possibilità di modificare strutture dati senza restart
- Tracciabilità completa delle evoluzioni strutturali
- Foundation per generazione automatica di UI

#### 3.5.2. Funzionalità Target

**Persistenza Completa**:
- Salvataggio/caricamento schemi entità e relazioni
- Backup e recovery di definizioni schema
- Distribuzione di schemi tra istanze multiple

**Gestione Dinamica**:
- API per modificare schemi a runtime
- Validazione di modifiche schema per compatibilità
- Migrazione automatica di dati esistenti (ove possibile)
- Supporto per la "promozione" di attributi ad-hoc a attributi formali, inclusa la trasformazione in riferimenti a "value-entities" con migrazione dati associata.

**Versionamento Iniziale**:
- Tracking delle modifiche agli schemi
- Rollback a versioni precedenti
- Audit trail delle evoluzioni

#### 3.5.3. Design Tecnico Proposto

```javascript
class SchemaManager {
    constructor(persistence) {
        this.entitySchemas = new Map(); // entityType -> EntitySchema
        this.relationSchemas = new Map(); // relationType -> RelationSchema
        this.schemaVersions = new Map(); // schemaId -> VersionHistory
        this.persistence = persistence;
        this.validators = new Map(); // type -> ValidatorFunction
    }

    // Definizione schema entità
    async defineEntitySchema(entityType, schemaDefinition) {
        const schema = new EntitySchema(entityType, schemaDefinition);
        await this.validateSchemaDefinition(schema);
        
        // Verifica compatibilità con dati esistenti
        await this.checkCompatibilityWithExistingData(entityType, schema);
        
        // Persisti schema
        await this.persistence.saveEntitySchema(schema);
        
        // Registra in memoria
        this.entitySchemas.set(entityType, schema);
        
        // Versioning
        this.recordSchemaChange(entityType, 'entity', 'created', schema);
        
        return schema;
    }

    // Definizione schema relazioni
    async defineRelationSchema(relationType, schemaDefinition) {
        const schema = new RelationSchema(relationType, schemaDefinition);
        await this.validateRelationSchema(schema);
        
        await this.persistence.saveRelationSchema(schema);
        this.relationSchemas.set(relationType, schema);
        
        this.recordSchemaChange(relationType, 'relation', 'created', schema);
        
        return schema;
    }

    // Evoluzione schema
    async evolveSchema(entityType, evolution) {
        const currentSchema = this.entitySchemas.get(entityType);
        const newSchema = await this.applyEvolution(currentSchema, evolution);
        
        // Migrazione dati se necessaria (es. promozione attributo a reference)
        if (this.requiresDataMigration(evolution, currentSchema, newSchema)) {
            await this.migrateExistingEntities(entityType, currentSchema, newSchema, evolution);
        }
        
        await this.persistence.updateEntitySchema(newSchema);
        this.entitySchemas.set(entityType, newSchema);
        
        this.recordSchemaChange(entityType, 'entity', 'evolved', newSchema);
        
        return newSchema;
    }

    // Validazione valore contro schema
    validateAttributeValue(entityType, attributeName, value) {
        const schema = this.entitySchemas.get(entityType);
        if (!schema) return { valid: true }; // Modalità flessibile per tipi sconosciuti
        
        return schema.validateAttribute(attributeName, value);
    }
}

class EntitySchema {
    constructor(entityType, definition) {
        this.entityType = entityType;
        this.attributes = new Map(); // attributeName -> AttributeDefinition
        this.constraints = definition.constraints || [];
        this.mode = definition.mode || "strict"; // "strict" or "flexible"
        this.version = definition.version || 1;
        this.created = Date.now();
        
        // Processa definizioni attributi
        for (const [attrName, attrDef] of Object.entries(definition.attributes || {})) {
            this.attributes.set(attrName, new AttributeDefinition(attrName, attrDef));
        }
    }

    validateAttribute(attributeName, value) {
        const attrDef = this.attributes.get(attributeName);
        if (!attrDef) {
            if (this.mode === "flexible") {
                return { valid: true, warning: "Attribute not in schema (flexible mode)" };
            }
            return { valid: false, error: `Attribute ${attributeName} not defined in schema for ${this.entityType}` };
        }
        
        return attrDef.validate(value);
    }

    addAttribute(attributeName, definition) {
        this.attributes.set(attributeName, new AttributeDefinition(attributeName, definition));
        this.version++;
    }
}

class RelationSchema {
    constructor(relationType, definition) {
        this.relationType = relationType;
        this.sourceTypes = definition.sourceTypes || [];
        this.targetTypes = definition.targetTypes || [];
        this.cardinality = definition.cardinality || 'N:M';
        this.attributes = new Map();
        this.constraints = definition.constraints || [];
        
        for (const [attrName, attrDef] of Object.entries(definition.attributes || {})) {
            this.attributes.set(attrName, new AttributeDefinition(attrName, attrDef));
        }
    }

    validateRelation(sourceEntityType, targetEntityType, attributes) {
        // Valida tipi partecipanti
        if (this.sourceTypes.length > 0 && !this.sourceTypes.includes(sourceEntityType)) {
            return { valid: false, error: `Invalid source type: ${sourceEntityType}` };
        }
        
        if (this.targetTypes.length > 0 && !this.targetTypes.includes(targetEntityType)) {
            return { valid: false, error: `Invalid target type: ${targetEntityType}` };
        }
        
        // Valida attributi
        for (const [attrName, value] of Object.entries(attributes)) {
            const result = this.validateAttribute(attrName, value);
            if (!result.valid) return result;
        }
        
        return { valid: true };
    }
}
```

## 4. Impatto sui Componenti Esistenti e Definizione delle API

### 4.1. DAO (`neo4j_dao.js`): Modifiche Strutturali e Nuove Funzionalità Richieste

**Nuove Funzioni per Gestione Schemi**:
```javascript
// Schema Entity Types
async saveEntitySchema(schema)
async loadEntitySchema(entityType)
async updateEntitySchema(schema)
async deleteEntitySchema(entityType)
async getAllEntitySchemas()

// Schema Relation Types  
async saveRelationSchema(schema)
async loadRelationSchema(relationType)
async updateRelationSchema(schema)
async deleteRelationSchema(relationType)
async getAllRelationSchemas()

// Schema Versioning
async saveSchemaVersion(schemaId, version, changes)
async getSchemaVersionHistory(schemaId)
async rollbackToSchemaVersion(schemaId, version)
```

**Nuove Funzioni per Gestione Relazioni**:
```javascript
// CRUD Relazioni
async createRelation(relation)
async getRelationById(relationId)
async updateRelationAttribute(relationId, attributeName, value)
async deleteRelation(relationId)

// Query Relazioni
async findRelationsByType(relationType)
async findRelationsByEntity(entityId, relationType = null)
async findRelationsByPattern(pattern)
async getRelatedEntities(entityId, relationType, direction)

// Nuove funzioni per supportare la risoluzione di riferimenti e popolamento UI
async getReferencedEntityValue(entityId, attributeName) // Interna o per EntityEngine
async getValueEntities(entityTypeForValues, displayAttribute) // Per popolare dropdowns
```

**Modifiche alle Funzioni Esistenti**:
- `createEntity()`: Integrazione con validazione schema e gestione attributi di riferimento tramite EntityEngine/RelationEngine.
- `updateEntityAttribute()`: Validazione tramite SchemaManager e gestione attributi di riferimento.
- `loadEntityById()` (nuova, o evoluzione di `getEntityById` nel DAO): Deve poter caricare l'entità base. La risoluzione dei riferimenti avviene a un livello superiore (EntityEngine).
- Query functions: Supporto per lazy loading.

### 4.2. Server API (`server.js`): Evoluzione degli Endpoint Esistenti e Nuovi Endpoint

**Nuovi Endpoint per Gestione Schemi**:
```javascript
// Entity Schemas
POST   /api/schema/entity/:entityType           // Definisce nuovo schema entità
GET    /api/schema/entity/:entityType           // Recupera schema entità  
PUT    /api/schema/entity/:entityType           // Aggiorna schema entità
DELETE /api/schema/entity/:entityType           // Elimina schema entità
GET    /api/schema/entities                     // Lista tutti gli schemi entità

// Relation Schemas
POST   /api/schema/relation/:relationType       // Definisce nuovo schema relazione
GET    /api/schema/relation/:relationType       // Recupera schema relazione
PUT    /api/schema/relation/:relationType       // Aggiorna schema relazione
DELETE /api/schema/relation/:relationType       // Elimina schema relazione
GET    /api/schema/relations                    // Lista tutti gli schemi relazione

// Schema Evolution
POST   /api/schema/entity/:entityType/evolve    // Evolve schema entità
GET    /api/schema/entity/:entityType/versions  // Storia versioni schema
POST   /api/schema/entity/:entityType/rollback  // Rollback schema
```

**Nuovi Endpoint per Gestione Relazioni**:
```javascript
// CRUD Relazioni
POST   /api/relations                           // Crea nuova relazione
GET    /api/relation/:relationId                // Recupera relazione specifica
PUT    /api/relation/:relationId/attribute      // Aggiorna attributo relazione
DELETE /api/relation/:relationId                // Elimina relazione

// Query Relazioni
GET    /api/relations/type/:relationType        // Relazioni per tipo
GET    /api/entity/:entityId/relations          // Relazioni di un'entità
POST   /api/relations/search                    // Query relazioni con pattern
GET    /api/entity/:entityId/related            // Entità correlate

// Endpoint per value-entities (per UI dropdowns, etc.)
GET    /api/values/:entityTypeForValues         // Recupera tutte le istanze di un entityType usato come valore (es. stati, ruoli predefiniti)
```

**Modifiche agli Endpoint Esistenti**:
- Tutti gli endpoint di entità ora supportano validazione schema.
- `PUT /api/entity/:entityId/attribute`: il payload `value` per un attributo di riferimento sarà l'ID dell'entità referenziata.
- `GET /api/entity/:entityId`: potrebbe accettare un parametro `?resolveReferences=true` (o `?expand=attributeName`) per includere i dati delle "value-entities" referenziate.
- WebSocket messages estesi per includere eventi di relazioni
- Endpoint di ricerca potenziati con query relazionali

### 4.3. Considerazioni sulla Retrocompatibilità con le API dell'MVP

**Strategie di Retrocompatibilità**:
1. **API Versioning**: Mantenere `/api/v1/` per compatibilità MVP
2. **Graceful Defaults**: Comportamenti backward-compatible quando non specificato
3. **Optional Features**: Funzionalità avanzate opt-in piuttosto che breaking changes

**Potenziali Breaking Changes Identificati**:
- Formato response di alcune API potrebbe includere informazioni aggiuntive
- Validazione più rigorosa potrebbe rifiutare dati precedentemente accettati
- Performance characteristics potrebbero cambiare con lazy loading

## 5. Modelli Dati Neo4j Dettagliati (Post-Evoluzione)

### 5.1. Rappresentazione Consolidata delle Entità

```cypher
// Nodo Entità (rimane sostanzialmente uguale all'MVP)
(:Entity:TipoEntità {
    id: "unique_entity_id",
    entityType: "TipoEntità", 
    created: timestamp,
    modified: timestamp,
    version: 1,
    // Attributi specifici come proprietà del nodo
    attributo1: "valore1",
    attributo2: "valore2"
})
```

### 5.2. Nuova Rappresentazione delle Relazioni

**Opzione A: Relazioni come Nodi Separati**
```cypher
// Nodo Relazione
(:Relation:TipoRelazione {
    id: "unique_relation_id",
    relationType: "TipoRelazione",
    created: timestamp,
    modified: timestamp,
    // Attributi specifici della relazione
    attributoRelazione1: "valore1"
})

// Connessioni strutturali
(:Entity)-[:SOURCE_OF]->(:Relation)-[:TARGET_TO]->(:Entity)
```

**Opzione B: Relazioni Neo4j Arricchite**
```cypher
// Relazione Neo4j con proprietà ricche
(:Entity)-[:TipoRelazione {
    id: "unique_relation_id",
    created: timestamp,
    modified: timestamp,
    attributoRelazione1: "valore1",
    attributoRelazione2: "valore2"
}]->(:Entity)
```

### 5.3. Modello per la Persistenza degli Schemi

```cypher
// Schema Tipo Entità
(:SchemaEntityType {
    entityType: "Cliente",
    version: 2,
    created: timestamp,
    modified: timestamp,
    constraints: ["unique_email"],
    mode: "flexible" // o "strict"
})

// Definizione Attributo
(:SchemaEntityType)-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "email",
    type: "email",
    required: true,
    defaultValue: null,
    validationRules: ["email_format"],
    description: "Email address of the client"
})

// Schema Tipo Relazione
(:SchemaRelationType {
    relationType: "HaComeAgente",
    version: 1,
    cardinality: "1:1",
    sourceTypes: ["Persona"],
    targetTypes: ["Persona"],
    created: timestamp
})

// Attributi di Relazione
(:SchemaRelationType)-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "commissione",
    type: "percentage",
    required: false,
    defaultValue: 10,
    min: 0,
    max: 100
})

// Versioning Schemi
(:SchemaVersion {
    schemaId: "Cliente",
    schemaType: "entity", // o "relation"
    version: 2,
    changes: "Added email validation",
    author: "system",
    timestamp: timestamp
})
(:SchemaEntityType)-[:HAS_VERSION]->(:SchemaVersion)
```

## 6. Piano di Implementazione Proposto (Suddivisione in Task)

### 6.1. Fase 1: SchemaManager - Persistenza e API di Base (Settimane 1-2)

**Task 1.1: Modello Dati Schema su Neo4j**
- Definire strutture Cypher per `:SchemaEntityType`, `:SchemaRelationType`, `:AttributeDefinition`
- Implementare query base per CRUD schemi

**Task 1.2: SchemaManager Core**  
- Creare classe `SchemaManager` con API base
- Implementare `defineEntitySchema()`, `defineRelationSchema()`
- Aggiungere validazione base delle definizioni

**Task 1.3: Estensione DAO per Schemi**
- Aggiungere funzioni schema al `neo4j_dao.js`
- Implementare persistenza e caricamento schemi
- Test di persistenza schemi

**Task 1.4: API Server per Schemi**
- Implementare endpoint `/api/schema/*` di base
- Integrazione con SchemaManager
- Test API con Postman/curl

### 6.2. Fase 2: RelationEngine - Implementazione Core (Settimane 3-4)

**Task 2.1: Modello Dati Relazioni**
- Decidere tra opzione A o B per rappresentazione Neo4j
- Implementare strutture dati e query Cypher
- Test di persistenza relazioni base

**Task 2.2: RelationEngine Implementation**
- Creare classe `RelationEngine` 
- Implementare `createRelation()`, `findRelations()`, `getRelatedEntities()`
- Integrazione con SchemaManager per validazione

**Task 2.3: Estensione DAO per Relazioni**
- Aggiungere funzioni relazioni al DAO
- Implementare query di navigazione efficiente
- Ottimizzazioni performance base

**Task 2.4: API Server per Relazioni**
- Implementare endpoint `/api/relations/*`
- Test API relazioni
- Documentazione API

### 6.3. Fase 3: EntityEngine & AttributeSpace Evolution (Settimane 5-6)

**Task 3.1: EntityEngine Evolution**
- Refactoring `EntityEngine_MVP` verso `EntityEngine`
- Implementare lazy loading e schema integration
- Integrazione con RelationEngine per gestione attributi di tipo 'reference'
- Implementare `resolveEntityReferences()` per popolare i dati degli attributi referenziati

**Task 3.2: AttributeSpace Enhancement**
- Evoluzione `AttributeSpace_MVP` verso `AttributeSpace`
- Implementare pattern matching avanzato
- Aggiungere batching e ottimizzazioni
- Documentazione breaking changes

### 6.4. Fase 4: API Complete, Frontend Adaptation e Testing End-to-End (Settimane 7-8)

**Task 4.1: API Finalization**
- Completamento tutti gli endpoint nuovi/modificati, inclusi quelli per `resolveReferences` e `getValueEntities`
- Documentazione API completa
- Versioning API implementato

**Task 4.2: Frontend Adaptation (Moduli UI Dinamici - Primo Passo)**
- Aggiornare `TabularModule.js` e `ContactCardModule.js` per:
    - Richiedere e utilizzare le definizioni di schema (EntityTypeSchema) dal backend.
    - Renderizzare dinamicamente i campi basati sullo schema ricevuto.
    - Gestire input specifici per attributi di tipo 'reference' (es. dropdown popolati da `/api/values/:entityTypeForValues`).
    - Inviare l'ID dell'entità referenziata quando si aggiorna un attributo di tipo 'reference'.
    - Visualizzare l'attributo `displayAttributeFromReferencedEntity` per i riferimenti.
- Adattare `app.js` e `app_module.js` per passare gli schemi ai moduli e gestire le chiamate API aggiuntive.
- Test di compatibilità con frontend MVP esistente e validazione delle nuove funzionalità UI schema-driven.

**Task 4.3: Sistema Testing (Backend e Frontend Integrati)**
- Test completi degli scenari MVP originali con il frontend adattato.
- Validazione nuove funzionalità core (gestione riferimenti, schema evolution base) end-to-end.
- Performance benchmarking con UI.

**Task 4.4: Documentation Update**
- Aggiornamento `architettura_mvp.md` per riflettere il backend evoluto e le modifiche frontend.
- Creazione documentazione nuove API (inclusi esempi di payload per attributi reference).
- Guide di migrazione per sviluppatori (se applicabile).

### 6.5. Fase 5: Schema Evolution - Gestione Avanzata e UI Admin (Settimane 9-10) (Opzionale per primo rilascio, ma importante per visione a lungo termine)

**Task 5.1: SchemaManager - Funzionalità di Evoluzione Avanzata**
- Implementare API per "proporre" e "approvare" modifiche di schema (aggiunta attributi, promozione a reference).
- Sviluppare la logica di `migrateExistingEntities()` per la trasformazione di attributi stringa in riferimenti.
- Implementare il versioning di base degli schemi.

**Task 5.2: UI Admin per la Gestione degli Schemi (Prototipo)**
- Creare un modulo frontend basilare per visualizzare gli schemi esistenti.
- Permettere la definizione di nuovi EntityTypes e RelationTypes.
- Interfaccia per aggiungere/modificare attributi, inclusa la specificazione di tipo "reference" e i metadati associati.
- Bottone per avviare la "promozione" di un attributo (conferma manuale prima della migrazione).

**Task 5.3: Test Migrazione Dati**
- Creare scenari di test specifici per la migrazione di attributi da letterali a riferimenti.
- Validare la correttezza dei dati post-migrazione.
- Testare il rollback (se implementato).

## 7. Strategie di Test e Validazione

### 7.1. Test Unitari per Ciascun Componente

**SchemaManager Tests**:
```javascript
describe('SchemaManager', () => {
    test('should define and persist entity schema');
    test('should validate schema definitions');
    test('should evolve schema with migration');
    test('should handle schema versioning');
});
```

**RelationEngine Tests**:
```javascript
describe('RelationEngine', () => {
    test('should create typed relations with validation');
    test('should find relations by pattern');
    test('should navigate entity relationships');
    test('should handle relation lifecycle');
});
```

**EntityEngine Tests**:
```javascript  
describe('EntityEngine', () => {
    test('should lazy load entities with schema integration');
    test('should validate attributes against schema');
    test('should coordinate with RelationEngine');
    test('should manage entity lifecycle');
});
```

**AttributeSpace Tests**:
```javascript
describe('AttributeSpace', () => {
    test('should match advanced subscription patterns');
    test('should batch and optimize propagation');
    test('should handle relation change events');
    test('should prevent infinite loops');
});
```

### 7.2. Test di Integrazione tra Componenti

**Core Engine Integration**:
- Test completi del flusso: creazione entità → definizione relazioni → propagazione cambiamenti
- Test di coordinamento tra tutti i componenti core
- Test di performance con dataset simulati

**API Integration**:
- Test end-to-end delle API REST complete
- Test di propagazione WebSocket per entità e relazioni

**Frontend Integration (Nuovo)**:
- Test dei moduli UI dinamici con schemi variabili.
- Test della corretta visualizzazione e gestione degli attributi di tipo "reference" (dropdown, autocomplete).
- Test dell'aggiornamento degli attributi di riferimento e della corretta chiamata API al backend.
- Test della reattività della UI ai cambiamenti di schema (se implementata la notifica live).

### 7.3. Scenari di Test Chiave

**Scenario 1: Schema Evolution**
1. Definire schema entità "Cliente"
2. Creare alcune entità Cliente
3. Evolvere schema aggiungendo attributo "categoria"
4. Verificare migrazione automatica
5. Validare nuove entità con schema evoluto

**Scenario 2: Rich Relations**
1. Definire schema relazione "HaComeAgente"
2. Creare entità Persona (cliente e agente)
3. Creare relazione tipizzata con attributi
4. **Validazione Frontend**: Un modulo UI permette di visualizzare e creare/modificare queste relazioni e i loro attributi.
5. Query navigazione relazioni, i risultati sono visibili e navigabili nella UI.
6. Modificare attributi relazione e validare propagazione (sia al backend che ad altre viste UI).

**Scenario 3: Compatibility (MVP Frontend con Nuovo Backend)**
1. Test completo di scenari MVP originali
2. Validazione che frontend MVP continua a funzionare
3. Performance comparison con MVP baseline
