# Neo4jDAO - Data Access Object per Neo4j

## Scopo

Neo4jDAO è il layer di accesso ai dati per il database Neo4j. Gestisce tutte le operazioni CRUD per entità, schemi e relazioni, fornendo un'interfaccia unificata per le operazioni di persistenza.

## Classe Principale

### Neo4jDAO

Classe che implementa il pattern Data Access Object per Neo4j.

**Costruttore:**
```javascript
new Neo4jDAO()
```

**Dipendenze:**
- `neo4j_connector`: Connector per la connessione al database Neo4j
- `uuid`: Generazione di ID univoci per le entità

## Operazioni Entità

### createEntity(entityType, initialAttributes = {})

Crea una nuova entità nel database Neo4j.

**Parametri:**
- `entityType` (string): Tipo dell'entità (es. "Contact", "Company")
- `initialAttributes` (object): Attributi iniziali dell'entità

**Processo:**
1. Genera un UUID v4 per l'entità
2. Aggiunge timestamp di creazione e aggiornamento
3. Costruisce query Cypher dinamica per attributi
4. Crea nodo con label `Entity` e tipo specifico
5. Imposta proprietà dinamiche

**Ritorna:** `Promise<object>` - L'entità creata

**Esempio:**
```javascript
const entity = await dao.createEntity('Contact', {
    name: 'Mario Rossi',
    email: 'mario@example.com',
    phone: '+39 123 456 789'
});
```

**Query Cypher generata:**
```cypher
CREATE (e:Entity:`Contact`)
SET e.id = $id, 
    e.entityType = $entityType, 
    e.createdAt = $createdAt, 
    e.updatedAt = $updatedAt,
    e.`name` = $attr0,
    e.`email` = $attr1,
    e.`phone` = $attr2
RETURN e
```

### getEntityById(id)

Recupera un'entità per ID.

**Parametri:**
- `id` (string): ID univoco dell'entità

**Ritorna:** `Promise<object|null>` - L'entità trovata o null

**Esempio:**
```javascript
const entity = await dao.getEntityById('uuid-123-456');
```

### updateEntityAttribute(entityId, attributeName, attributeValue)

Aggiorna un singolo attributo di un'entità.

**Parametri:**
- `entityId` (string): ID dell'entità
- `attributeName` (string): Nome dell'attributo
- `attributeValue` (any): Nuovo valore

**Caratteristiche:**
- Aggiorna timestamp `updatedAt` automaticamente
- Supporta attributi con nomi speciali tramite backtick
- Ritorna l'entità aggiornata

**Esempio:**
```javascript
const updatedEntity = await dao.updateEntityAttribute(
    'uuid-123', 
    'email', 
    'nuovo@email.com'
);
```

### getAllEntities(entityType)

Recupera tutte le entità di un tipo specifico.

**Parametri:**
- `entityType` (string): Tipo delle entità da recuperare

**Ritorna:** `Promise<Array>` - Array delle entità

**Caratteristiche:**
- Ordinate per data di creazione
- Efficiente per grandi dataset

**Esempio:**
```javascript
const contacts = await dao.getAllEntities('Contact');
```

### getAllAttributeKeysForEntityType(entityType)

Recupera tutti i nomi degli attributi utilizzati dalle entità di un tipo.

**Parametri:**
- `entityType` (string): Tipo delle entità

**Ritorna:** `Promise<Array>` - Array dei nomi degli attributi

**Esclusioni:** Gli attributi di sistema (`id`, `entityType`, `createdAt`, `updatedAt`) sono esclusi.

**Esempio:**
```javascript
const attributes = await dao.getAllAttributeKeysForEntityType('Contact');
// Risultato: ['name', 'email', 'phone', 'company', ...]
```

### deleteAllEntities()

Elimina tutte le entità dal database (utile per test e reset).

**Ritorna:** `Promise<number>` - Numero di entità eliminate

## Operazioni Schema

### saveEntitySchema(schema)

Salva o aggiorna uno schema di entità nel database.

**Parametri:**
- `schema` (object): Schema dell'entità con struttura:
  ```javascript
  {
      entityType: string,
      version: number,
      mode: string, // 'strict' | 'flexible'
      attributes: Map,
      // ...altri metadati
  }
  ```

**Processo:**
1. Salva nodo schema principale
2. Salva definizioni degli attributi in transazioni separate
3. Gestisce aggiornamenti incrementali

### loadEntitySchema(entityType)

Carica lo schema di un'entità dal database.

**Parametri:**
- `entityType` (string): Tipo dell'entità

**Ritorna:** `Promise<object|null>` - Schema caricato o null

### updateEntitySchema(schema)

Aggiorna uno schema esistente.

### addAttributeToSchema(entityType, attributeName, attributeDefinition)

Aggiunge un nuovo attributo a uno schema esistente.

### deleteEntitySchema(entityType)

Elimina uno schema dal database.

### getAllEntitySchemas()

Recupera tutti gli schemi di entità dal database.

## Operazioni Schema Relazioni

### saveRelationSchema(schema)

Salva uno schema di relazione.

### loadRelationSchema(relationType)

Carica uno schema di relazione.

### updateRelationSchema(schema)

Aggiorna uno schema di relazione.

### deleteRelationSchema(relationType)

Elimina uno schema di relazione.

### getAllRelationSchemas()

Recupera tutti gli schemi di relazione.

## Gestione Attributi

### saveAttributeDefinition(schemaId, attributeName, attributeDefinition, forceCreate = false)

Salva la definizione di un attributo.

**Parametri:**
- `schemaId` (string): ID dello schema
- `attributeName` (string): Nome dell'attributo
- `attributeDefinition` (object): Definizione dell'attributo
- `forceCreate` (boolean): Forza la creazione anche se esiste

**Struttura AttributeDefinition:**
```javascript
{
    type: string,           // 'string', 'number', 'boolean', 'reference'
    required: boolean,
    defaultValue: any,
    validation: object,
    label: string,
    description: string
}
```

### saveAttributeDefinitionSeparateTransaction(schemaId, attributeName, attributeDefinition)

Salva un attributo in una transazione separata per robustezza.

### updateAttributeOptionalProperties(schemaId, attributeName, attributeDefinition)

Aggiorna solo le proprietà opzionali di un attributo.

## Pattern di Utilizzo

### Gestione Transazioni

```javascript
// Le operazioni critiche utilizzano transazioni separate
await dao.saveAttributeDefinitionSeparateTransaction(
    schemaId, 
    attributeName, 
    definition
);
```

### Query Dinamiche

```javascript
// Costruzione dinamica per supportare attributi variabili
let setClause = 'SET e.id = $id, e.entityType = $entityType';
Object.keys(attributes).forEach((key, index) => {
    setClause += `, e.\`${key}\` = $attr${index}`;
});
```

### Gestione Errori

Ogni metodo include:
- Try-catch completo
- Logging degli errori
- Gestione stati di errore specifici
- Ripristino in caso di fallimento

## Caratteristiche Tecniche

### Performance

- Query ottimizzate per Neo4j
- Uso di indici per ricerche efficienti
- Parametrizzazione per evitare SQL injection

### Robustezza

- Gestione transazioni atomiche
- Retry logic per operazioni critiche
- Validazione input
- Logging estensivo

### Compatibilità

- Supporta attributi con nomi speciali
- Gestisce tipi di dato Neo4j nativi
- Compatibile con versioni multiple di Neo4j

## Integrazione

Il Neo4jDAO viene utilizzato da:
- **EntityEngine**: Per operazioni CRUD entità
- **SchemaManager**: Per gestione schemi
- **RelationEngine**: Per operazioni relazioni

## Note di Implementazione

- Utilizza il connector Neo4j condiviso
- Genera UUID v4 per tutti gli ID
- Mantiene timestamp automatici (`createdAt`, `updatedAt`)
- Supporta proprietà dinamiche per flessibilità schema 