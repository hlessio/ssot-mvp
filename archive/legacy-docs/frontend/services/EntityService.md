# EntityService - Servizio Gestione Entità Frontend

## Scopo

EntityService fornisce un'interfaccia unificata per tutte le operazioni CRUD delle entità nel frontend. Gestisce la cache, ottimizza le performance e fornisce compatibilità tra API MVP e evolute.

## Classe Principale

### EntityService

Servizio principale per la gestione delle entità nel frontend.

**Costruttore:**
```javascript
new EntityService()
```

**Configurazione:**
- `cacheTimeout`: 30 secondi (timeout cache)
- `entityCache`: Cache delle singole entità
- `entitiesListCache`: Cache delle liste di entità per tipo
- `pendingRequests`: Gestione richieste duplicate

## Sistema di Cache

### Cache Entità Singole
Chiave formato: `entity_{entityId}`

### Cache Liste Entità
Chiave formato: `entities_{entityType}`

### Gestione Richieste Duplicate
Previene richieste multiple simultanee per la stessa risorsa.

## Metodi Principali

### getEntity(entityId, options = {})

Recupera una singola entità per ID con cache intelligente.

**Parametri:**
- `entityId` (string): ID dell'entità
- `options` (object): Opzioni di recupero
  - `forceRefresh` (boolean): Bypassa la cache
  - `includeReferences` (boolean): Include riferimenti risolti (API evoluta)

**Processo:**
1. Verifica cache se non forzato refresh
2. Gestisce richieste duplicate in corso
3. Esegue richiesta API
4. Aggiorna cache con risultato
5. Restituisce entità

**Ritorna:** `Promise<object>` - L'entità recuperata

**Esempio:**
```javascript
// Recupero base con cache
const entity = await entityService.getEntity('entity-123');

// Forzare refresh
const freshEntity = await entityService.getEntity('entity-123', {
    forceRefresh: true
});

// Con riferimenti (API evoluta)
const entityWithRefs = await entityService.getEntity('entity-123', {
    includeReferences: true
});
```

### getEntities(entityType, forceRefresh = false)

Recupera tutte le entità di un tipo specifico con cache ottimizzata.

**Parametri:**
- `entityType` (string): Tipo di entità da recuperare
- `forceRefresh` (boolean): Forza il refresh della cache

**Caratteristiche:**
- Cache separata per liste di entità
- Cache automatica delle singole entità nella lista
- Gestione richieste duplicate per tipo
- Logging dettagliato per performance

**Ritorna:** `Promise<Array>` - Lista delle entità

**Esempio:**
```javascript
// Recupero con cache
const contacts = await entityService.getEntities('Contact');

// Forzare refresh della lista
const freshContacts = await entityService.getEntities('Contact', true);
```

### createEntity(entityType, data)

Crea una nuova entità.

**Parametri:**
- `entityType` (string): Tipo dell'entità da creare
- `data` (object): Dati dell'entità

**Processo:**
1. Prepara payload con entityType
2. Esegue POST request al backend
3. Gestisce risposta e validation
4. Invalida cache correlate
5. Restituisce entità creata

**Ritorna:** `Promise<object>` - L'entità creata

**Esempio:**
```javascript
const newContact = await entityService.createEntity('Contact', {
    name: 'Mario Rossi',
    email: 'mario@example.com',
    phone: '+39 123 456 789'
});
```

### updateEntityAttribute(entityId, attributeName, value)

Aggiorna un singolo attributo di un'entità.

**Parametri:**
- `entityId` (string): ID dell'entità
- `attributeName` (string): Nome dell'attributo
- `value` (any): Nuovo valore

**Caratteristiche:**
- Invalida cache automaticamente
- Supporta tutti i tipi di attributi
- Logging dettagliato per debug

**Ritorna:** `Promise<object>` - L'entità aggiornata

**Esempio:**
```javascript
const updatedEntity = await entityService.updateEntityAttribute(
    'entity-123',
    'email',
    'nuovo@email.com'
);
```

### deleteEntity(entityId)

Elimina un'entità.

**Parametri:**
- `entityId` (string): ID dell'entità da eliminare

**Processo:**
1. Esegue DELETE request
2. Invalida cache entità e liste correlate
3. Conferma eliminazione

**Ritorna:** `Promise<boolean>` - Success status

### resolveEntityReferences(entityId, attributeNames = [])

Risolve i riferimenti di un'entità (API evoluta).

**Parametri:**
- `entityId` (string): ID dell'entità
- `attributeNames` (string[]): Attributi specifici da risolvere (vuoto = tutti)

**Ritorna:** `Promise<object>` - Mappa dei riferimenti risolti

**Esempio:**
```javascript
// Risolvi tutti i riferimenti
const allRefs = await entityService.resolveEntityReferences('entity-123');

// Risolvi riferimenti specifici
const specificRefs = await entityService.resolveEntityReferences('entity-123', [
    'company', 'manager'
]);
```

## Gestione API Dual-Mode

### API Evoluta (Preferita)
- Endpoint con funzionalità avanzate
- Supporto `includeReferences`
- Gestione errori migliorata

### API MVP (Fallback)
- Endpoint base per compatibilità
- Funzionalità essenziali CRUD
- Attivazione automatica in caso di fallimento API evoluta

**Esempio di Fallback:**
```javascript
// Tenta prima API evoluta
try {
    const response = await fetch(`/api/entity/${entityId}?includeReferences=true`);
    // ...gestisci risposta evoluta
} catch (error) {
    console.warn('API evoluta fallita, uso fallback MVP');
    // Fallback su API MVP
    const response = await fetch(`/api/entity/${entityId}`);
}
```

## Gestione Cache

### cacheEntity(cacheKey, entity)

Cache un'entità con timestamp.

### invalidateEntityCache(entityId)

Invalida la cache per una singola entità.

### clearTypeCache(entityType)

Pulisce la cache per tutte le entità di un tipo.

### clearAllCache()

Pulisce completamente la cache.

## Utilità e Monitoring

### getStats()

Restituisce statistiche sulla cache e performance.

**Ritorna:**
```javascript
{
    entityCacheSize: number,
    entitiesListCacheSize: number,
    pendingRequestsCount: number,
    cacheHitRate: number // se implementato
}
```

## Pattern di Utilizzo

### Recupero Ottimizzato
```javascript
// Prima volta: carica dal server
const entity1 = await entityService.getEntity('entity-123');

// Seconda volta: servito dalla cache
const entity2 = await entityService.getEntity('entity-123');

// Forzare refresh quando necessario
const freshEntity = await entityService.getEntity('entity-123', {
    forceRefresh: true
});
```

### Gestione Liste
```javascript
// Carica lista completa
const contacts = await entityService.getEntities('Contact');

// Le singole entità sono ora in cache
const singleContact = await entityService.getEntity(contacts[0].id); // Cache hit
```

### Workflow Creazione/Aggiornamento
```javascript
// Crea entità
const newEntity = await entityService.createEntity('Contact', data);

// Aggiorna attributo
await entityService.updateEntityAttribute(newEntity.id, 'status', 'active');

// Pulisci cache tipo se necessario
entityService.clearTypeCache('Contact');
```

## Caratteristiche Tecniche

### Performance
- Cache intelligente con timeout
- Prevenzione richieste duplicate
- Batch caching per liste
- Logging performance per monitoring

### Robustezza
- Fallback automatico API MVP
- Gestione errori granulare
- Retry logic (se implementato)
- Validazione response

### Integrazione
- Compatibile con tutti i componenti frontend
- Interface unificata per diversi tipi di entità
- Supporto per future evoluzioni API

## Logging e Debug

Il servizio produce log dettagliati:
- `🔄` Cache hit
- `📥` Caricamento dal server
- `⏳` Richiesta in attesa
- `✅` Operazione completata
- `❌` Errori
- `⚠️` Avvertimenti e fallback

## Note di Implementazione

- Utilizza Map per cache ad alte performance
- Timestamp per gestione timeout cache
- Promesse per gestione asincrona
- Pattern singleton per istanza globale 