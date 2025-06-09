# EntityEngine Evoluto

## Scopo

EntityEngine è il motore centrale per la gestione avanzata delle entità nel sistema SSOT. Implementa la Fase 3 del piano di evoluzione core engine con gestione schema integrata, validazione, caching e supporto per attributi reference.

## Classe Principale

### EntityEngine

Classe principale che gestisce tutte le operazioni CRUD delle entità con schema integration.

**Costruttore:**
```javascript
new EntityEngine(dao, schemaManager, relationEngine, attributeSpace = null)
```

**Parametri:**
- `dao`: Data Access Object per le operazioni di persistenza
- `schemaManager`: Gestore degli schemi delle entità
- `relationEngine`: Motore per la gestione delle relazioni
- `attributeSpace`: (Opzionale) Spazio degli attributi per notifiche

## Funzionalità Principali

### 1. Gestione Cache

- **Entity Cache**: Cache delle entità caricate (`entityId -> Entity`)
- **Schema Cache**: Cache degli schemi (`entityType -> EntitySchema`)
- **Reference Cache**: Cache dei riferimenti (`entityId -> Map<attributeName, referencedEntity>`)

### 2. Configurazione

- `enableCache`: Abilita/disabilita il sistema di cache (default: true)
- `enableLazyLoading`: Abilita caricamento lazy dei riferimenti (default: true)
- `enableValidation`: Abilita validazione degli schemi (default: true)

## Metodi Pubblici

### createEntity(entityType, data, options = {})

Crea una nuova entità con validazione schema integrata.

**Parametri:**
- `entityType` (string): Tipo dell'entità da creare
- `data` (object): Dati dell'entità
- `options` (object): Opzioni aggiuntive

**Processo:**
1. Ottiene o crea schema per il tipo
2. Applica valori di default
3. Validazione (strict/flexible mode)
4. Creazione nel DAO
5. Gestione attributi reference
6. Aggiornamento cache
7. Notifica AttributeSpace

**Ritorna:** `Promise<object>` - L'entità creata

**Esempio:**
```javascript
const entity = await entityEngine.createEntity('Contact', {
    name: 'Mario Rossi',
    email: 'mario@example.com',
    company: 'company-uuid-123' // Attributo reference
});
```

### getEntity(entityId, options = {})

Recupera un'entità per ID con supporto lazy loading.

**Parametri:**
- `entityId` (string): ID dell'entità
- `options` (object): Opzioni di recupero
  - `includeReferences` (boolean): Include attributi reference risolti
  - `referenceAttributes` (string[]): Specifici attributi reference da caricare

**Ritorna:** `Promise<object|null>` - L'entità o null se non trovata

**Esempio:**
```javascript
// Recupero base
const entity = await entityEngine.getEntity('entity-123');

// Con riferimenti risolti
const entityWithRefs = await entityEngine.getEntity('entity-123', {
    includeReferences: true,
    referenceAttributes: ['company', 'manager']
});
```

### setEntityAttribute(entityId, attributeName, value, options = {})

Aggiorna un attributo di un'entità con validazione schema.

**Parametri:**
- `entityId` (string): ID dell'entità
- `attributeName` (string): Nome dell'attributo
- `value` (any): Nuovo valore
- `options` (object): Opzioni di aggiornamento

**Processo:**
1. Carica entità e schema
2. Validazione valore
3. Gestione differenziata per attributi reference vs normali
4. Aggiornamento cache
5. Notifica AttributeSpace

**Esempio:**
```javascript
// Attributo normale
await entityEngine.setEntityAttribute('entity-123', 'name', 'Nuovo Nome');

// Attributo reference
await entityEngine.setEntityAttribute('entity-123', 'company', 'new-company-uuid');
```

### getAllEntities(entityType, options = {})

Recupera tutte le entità di un tipo specifico.

**Parametri:**
- `entityType` (string): Tipo delle entità da recuperare
- `options` (object): Opzioni di recupero

**Ritorna:** `Promise<Array>` - Array delle entità

### resolveEntityReferences(entityId, attributeNames = [])

Risolve gli attributi reference di un'entità.

**Parametri:**
- `entityId` (string): ID dell'entità
- `attributeNames` (string[]): Nomi degli attributi reference da risolvere (vuoto = tutti)

**Ritorna:** `Promise<object>` - Mappa degli attributi risolti

## Gestione Schema

### getOrCreateSchema(entityType, sampleData = {})

Ottiene lo schema esistente o ne crea uno nuovo basato sui dati di esempio.

### validateEntity(entityType, data)

Valida i dati di un'entità contro il suo schema.

**Ritorna:**
```javascript
{
    isValid: boolean,
    errors: string[],
    warnings: string[]
}
```

### applySchemaDefaults(schema, data, originalSchemaDefinition = null)

Applica i valori di default definiti nello schema ai dati dell'entità.

## Gestione Attributi Reference

### isReferenceAttribute(entityType, attributeName)

Determina se un attributo è di tipo reference.

### extractReferenceAttributes(schema, data)

Estrae gli attributi reference dai dati di un'entità.

### createReferenceRelations(entityId, entityType, referenceAttributes)

Crea le relazioni nel grafo per gli attributi reference.

### updateReferenceAttribute(entityId, attributeName, newReferencedEntityId)

Aggiorna un attributo reference esistente.

## Utilità

### invalidateCache(entityId = null)

Invalida la cache per un'entità specifica o tutta la cache.

### getStats()

Restituisce statistiche sull'uso della cache e performance.

### setAttributeSpace(attributeSpace)

Imposta o aggiorna il riferimento all'AttributeSpace.

## Modalità Schema

### Strict Mode
- Validazione rigorosa
- Errori bloccanti per dati non conformi
- Schema fisso

### Flexible Mode
- Validazione con avvertimenti
- Permette attributi non definiti nello schema
- Schema evolutivo

## Integrazione

### Con DAO
Utilizza il DAO per tutte le operazioni di persistenza.

### Con SchemaManager
Collabora per la gestione dinamica degli schemi.

### Con RelationEngine
Gestisce le relazioni per gli attributi reference.

### Con AttributeSpace
Notifica i cambiamenti per la propagazione in tempo reale.

## Note Tecniche

- Utilizza UUID v4 per gli ID delle entità
- Supporta transazioni per operazioni atomiche
- Sistema di cache configurabile per performance
- Robustezza con fallback su definizioni schema originali
- Logging estensivo per debugging 