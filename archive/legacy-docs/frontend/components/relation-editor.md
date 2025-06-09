# RelationEditor - Componente Editor Relazioni

## Scopo

RelationEditor è un Web Component avanzato che permette di gestire le relazioni tra entità nel sistema. In particolare:

- Consente di creare nuove relazioni tra entità esistenti, specificando il tipo di relazione e l'entità target
- Permette di modificare relazioni esistenti, aggiornando attributi e proprietà
- Integra una ricerca intelligente delle entità target con autocompletamento
- Valida le relazioni secondo gli schemi definiti, garantendo consistenza dei dati
- Supporta due modalità operative:
  - Creazione: per definire nuove relazioni partendo da un'entità sorgente
  - Editing: per modificare relazioni già esistenti nel sistema
- Offre un'interfaccia user-friendly con validazione in tempo reale e feedback visivo
- Si integra con i servizi di gestione entità e relazioni del sistema

## Utilizzo

### Modalità Creazione
```html
<relation-editor 
    mode="create"
    source-entity-id="entity-123"
    allowed-relation-types="Conosce,Lavora_Per"
    target-entity-types="Contact,Company">
</relation-editor>
```

### Modalità Editing
```html
<relation-editor 
    mode="edit"
    relation-id="relation-456"
    show-advanced="true">
</relation-editor>
```

## Props/Attributi

| Prop | Tipo | Obbligatorio | Descrizione |
|------|------|-------------|-------------|
| `mode` | string | No | Modalità: 'create' (default) o 'edit' |
| `source-entity-id` | string | Sì (create) | ID dell'entità sorgente |
| `relation-id` | string | Sì (edit) | ID della relazione da modificare |
| `allowed-relation-types` | string | No | Tipi di relazione permessi (CSV) |
| `target-entity-types` | string | No | Tipi di entità target permessi (CSV) |
| `show-advanced` | boolean | No | Mostra opzioni avanzate |

## Funzionalità Principali

### 1. Gestione Modalità

**Modalità Create:**
- Richiede `source-entity-id`
- Permette selezione entità target
- Crea nuova relazione

**Modalità Edit:**
- Richiede `relation-id`
- Carica relazione esistente
- Permette modifica attributi

### 2. Ricerca Entità Target

- **Autocomplete intelligente**: Ricerca in tempo reale con 1+ caratteri
- **Filtri per tipo**: Limita risultati ai tipi permessi
- **Creazione al volo**: Opzione "Aggiungi nuova entità" nei risultati
- **Selezione visuale**: Preview dell'entità selezionata

**Esempio ricerca:**
```javascript
// Ricerca automatica durante digitazione
async searchEntities(query) {
    if (query.length < 1) return;
    
    // Filtra per tipi permessi se specificati
    const results = await this.entityService.searchEntities(query, {
        entityTypes: this.targetEntityTypes
    });
    
    this.searchResults = results;
    this.updateSearchResults();
}
```

### 3. Selezione Tipo Relazione

- **Lista configurabile**: Usa `allowed-relation-types` o default predefiniti
- **Tipi predefiniti**: Include relazioni comuni (Conosce, Lavora_Per, etc.)
- **Validazione**: Controlla compatibilità con schema

**Tipi default supportati:**
```javascript
const defaultTypes = [
    'Correlato', 'Conosce', 'HaCliente', 'Lavora_Per',
    'Appartiene_A', 'Ha_Padre', 'Ha_Figlio', 'È_Sposato_Con',
    'È_Amico_Di', 'Ha_Task', 'Dipende_Da'
];
```

### 4. Gestione Attributi Relazione

- **Attributi dinamici**: Schema-aware per ogni tipo di relazione
- **Validazione real-time**: Controllo tipi e vincoli
- **Valori default**: Applicazione automatica da schema

### 5. Creazione Entità al Volo

Permette di creare nuove entità durante la selezione target:

```javascript
async createNewEntity(entityType) {
    const formData = this.collectCreateFormData();
    
    const newEntity = await this.entityService.createEntity(entityType, formData);
    
    // Seleziona automaticamente la nuova entità
    this.selectTargetEntity(newEntity);
    this.hideCreateEntityForm();
}
```

## Stato Interno

### Proprietà Principali
```javascript
{
    mode: 'create' | 'edit',
    sourceEntityId: string,
    relationId: string,
    relation: object,        // Relazione in editing
    sourceEntity: object,    // Entità sorgente
    targetEntity: object,    // Entità target selezionata
    searchResults: array,    // Risultati ricerca
    isLoading: boolean,
    error: string
}
```

### Form Data
```javascript
{
    relationType: string,
    targetEntityId: string,
    attributes: object       // Attributi della relazione
}
```

## Eventi

### Emessi dal Componente

#### `relation-saved`
Emesso quando una relazione viene salvata con successo.

**Detail:**
```javascript
{
    relation: object,        // Relazione salvata
    mode: 'create' | 'edit'  // Modalità utilizzata
}
```

#### `relation-cancelled`
Emesso quando l'utente cancella l'operazione.

#### `relation-error`
Emesso in caso di errori durante le operazioni.

**Detail:**
```javascript
{
    error: string,          // Messaggio errore
    operation: string       // Operazione che ha fallito
}
```

### Gestione Eventi

```javascript
// Ascolto eventi
const editor = document.querySelector('relation-editor');

editor.addEventListener('relation-saved', (event) => {
    const { relation, mode } = event.detail;
    console.log(`Relazione ${mode === 'create' ? 'creata' : 'aggiornata'}:`, relation);
});
```

## Metodi Pubblici

### initialize()
Inizializza il componente e carica i dati necessari.

### loadInitialData()
Carica entità sorgente, relazione (se edit) e tipi disponibili.

### searchEntities(query)
Esegue ricerca entità per autocomplete.

### selectTargetEntity(entity)
Seleziona un'entità come target della relazione.

### saveRelation()
Salva la relazione (create/update).

### close()
Chiude l'editor ed emette evento cancelled.

## Integrazione con Servizi

### EntityService
- Caricamento entità sorgente e target
- Ricerca entità per autocomplete
- Creazione nuove entità

### RelationService
- Caricamento relazioni esistenti (edit mode)
- Salvataggio/aggiornamento relazioni
- Validazione relazioni

### SchemaService
- Caricamento schemi di relazione
- Validazione attributi
- Applicazione valori default

## UI/UX

### Sezioni Principali

1. **Header**: Mostra entità sorgente e modalità
2. **Tipo Relazione**: Dropdown con tipi disponibili
3. **Target Entity**: Search/autocomplete per selezione
4. **Attributi**: Form dinamico per attributi relazione
5. **Actions**: Bottoni Save/Cancel

### Responsive Design

- Layout adattivo per mobile/desktop
- Interfaccia touch-friendly
- Accessibilità keyboard

### Feedback Visuale

- Loading states durante operazioni async
- Validazione real-time con indicatori
- Messaggi errore inline
- Conferme per azioni critiche

## Stili CSS

Il componente utilizza Shadow DOM con stili incapsulati:

```css
/* Variabili CSS personalizzabili */
:host {
    --primary-color: #007bff;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --border-radius: 4px;
}
```

## Pattern di Utilizzo

### Workflow Creazione Relazione

```javascript
// 1. Setup componente
const editor = document.createElement('relation-editor');
editor.setAttribute('mode', 'create');
editor.setAttribute('source-entity-id', sourceId);

// 2. Ascolto eventi
editor.addEventListener('relation-saved', handleSaved);
editor.addEventListener('relation-cancelled', handleCancelled);

// 3. Aggiungi al DOM
document.body.appendChild(editor);
```

### Workflow Editing Relazione

```javascript
// Setup per editing
const editor = document.createElement('relation-editor');
editor.setAttribute('mode', 'edit');
editor.setAttribute('relation-id', relationId);
editor.setAttribute('show-advanced', 'true');
```

### Restrizioni e Filtri

```javascript
// Limita tipi di relazione e entità target
editor.setAttribute('allowed-relation-types', 'Conosce,Lavora_Per');
editor.setAttribute('target-entity-types', 'Contact,Company');
```

## Best Practices

### Performance
- Debounce per ricerca autocomplete
- Cache risultati ricerca temporanei
- Lazy loading dei dati schema

### Usabilità
- Auto-focus su campi attivi
- Keyboard navigation completa
- Undo/redo per modifiche (se implementato)

### Robustezza
- Validazione client-side e server-side
- Gestione errori graceful
- Fallback per API indisponibili

## Note Tecniche

- **Web Component nativo**: Utilizza Custom Elements API
- **Shadow DOM**: Incapsulamento stili e DOM
- **Async/Await**: Gestione asincrona moderna
- **Event-driven**: Architettura basata su eventi
- **Schema-aware**: Integrazione con sistema schemi dinamici

## Dipendenze

- Window services: `RelationService`, `EntityService`, `SchemaService`
- Modern browser support per Web Components
- Fetch API per chiamate HTTP 