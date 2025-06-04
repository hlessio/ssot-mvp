# Documento Tecnico: Evoluzione Frontend - Webmodules con Istanze Salvabili (Versione 1.0)

## 🎯 STATO IMPLEMENTAZIONE

### ✅ FASE 1 COMPLETATA - Fondamenta e Rendering da Template
**Data Completamento:** 03 Giugno 2025
**Status:** ✅ Implementato e Testato con Successo

**Componenti Implementati:**
- ✅ **4 Servizi Frontend Core**: ModuleDefinitionService, SchemaService, EntityService, WebSocketService
- ✅ **3 Web Components Base**: ssot-input, attribute-display, template-module-renderer
- ✅ **3 Template JSON**: SimpleContactCard, StandardContactCard, CompactContactCard
- ✅ **1 Pagina Test Completa**: views/template-test.html con interfaccia testing
- ✅ **Server Backend Operativo**: server_evolved.js con API MVP + evolute
- ✅ **Dati Test**: Schema Contact + 2 entità Mario Rossi e Anna Verdi
- ✅ **Integrazione End-to-End**: Template rendering, WebSocket real-time, schema-awareness

**Funzionalità Validate:**
- ✅ Template-driven rendering con layout strutturato e viste multiple
- ✅ Schema-awareness con formattazione tipo-specifica (email, telefone, date)
- ✅ WebSocket real-time updates per attribute changes
- ✅ Fallback graceful API evolute→MVP
- ✅ Validazione attributi con SchemaService integration
- ✅ Component focus management e user experience

### ✅ FASE 2 COMPLETATA - Editing, Azioni Base e Introduzione Concetto di Istanza
**Data Completamento:** 03 Giugno 2025
**Status:** ✅ Implementato e Testato con Successo

**Componenti Implementati:**
- ✅ **attribute-editor.js** (640 righe): Editor schema-aware con validazione real-time, debounce 300ms, keyboard shortcuts
- ✅ **SaveInstanceService.js** (396 righe): CRUD ModuleInstance con cache intelligente, validazione, deduplicazione richieste
- ✅ **saved-module-instance.js** (550 righe): Rendering istanze salvate con configurazioni override e metadati
- ✅ **template-module-renderer.js EVOLUTO**: Editing mode, batch save/cancel, azioni configurabili, "Salva Vista Come..."
- ✅ **Backend API /api/module-instances**: CRUD completo con WebSocket notifications
- ✅ **StandardContactCard v2.0.0**: Template evoluto con viste multiple, azioni categorizzate, configurazioni estese

**Funzionalità Validate:**
- ✅ Editing in-place con validazione schema-aware e salvataggio batch
- ✅ Sistema ModuleInstance per configurazioni personalizzate salvabili
- ✅ Template evoluti con azioni configurabili (🔄 Aggiorna, ✏️ Modifica, 📋 Duplica)
- ✅ "Salva Vista Come..." per creare istanze da configurazioni correnti
- ✅ Rendering istanze salvate con override configurazioni template
- ✅ WebSocket real-time per sincronizzazione istanze e modifiche
- ✅ Gestione errori robusta con normalizzazione tipi entità
- ✅ API backend completa con validazione e metadati sistema

**Risoluzione Problemi:**
- ✅ Errore HTTP 500 instanceConfigOverrides: Serializzazione JSON corretta
- ✅ Errore schema "Contact,Contatto": Normalizzazione array entityType
- ✅ Errore logMessage undefined: Correzione riferimenti pagina test

### ✅ DEMO FASE 2 COMPLETATA - Sistema Operativo con Bug Risolti
**Data Completamento:** Dicembre 2024
**Status:** ✅ Demo Validata e Sistema Completamente Funzionante

**Bug Critici Risolti:**
1. **Errore 500 Evoluzione Schema**: Formato dati `evolution: { addAttributes: {...} }` corretto
2. **Validazione Istanze**: `targetEntityId` come stringa, `instanceConfigOverrides` come oggetto
3. **Dashboard Istanze**: Estrazione corretta array istanze da response backend
4. **Neo4j Serializzazione**: Gestione oggetti complessi con stringificazione JSON
5. **WebSocket Service**: Metodo `isConnected()` aggiunto, conflitti proprietà risolti
6. **Schema Mancanti**: Gestione completa creazione entità per tipi senza schema esistente

**Sistema Completamente Operativo:**
- ✅ Moduli tabellari dinamici con evoluzione schema real-time
- ✅ Editing attributi con validazione schema-aware
- ✅ Salvataggio istanze personalizzate con configurazioni override
- ✅ Dashboard gestione istanze salvate completamente funzionale
- ✅ Sincronizzazione WebSocket cross-window operativa
- ✅ Gestione robusta entità e schemi mancanti con UX informativa
- ✅ Backend Neo4j con persistenza oggetti complessi corretta

**Database Status:**
- ✅ **15+ ModuleInstance** salvate e validate nel database
- ✅ **Schema evoluti** per multipli entity types (Contact, Persona, Task)
- ✅ **WebSocket notifications** completamente operative per tutte le operazioni CRUD

**Prossimo:** Fase 3 - Relazioni, Sub-moduli e Riutilizzo Avanzato

### ✅ FASE 3 COMPLETATA - Relazioni, Sub-moduli e Riutilizzo Avanzato
**Data Completamento:** 03 Gennaio 2025
**Status:** ✅ Implementato e Testato con Successo

**Componenti Implementati:**
- ✅ **RelationService.js** (376 righe): Servizio completo per gestione relazioni con cache intelligente, WebSocket integration, CRUD relazioni tipizzate
- ✅ **relation-list.js** (550 righe): Web Component per visualizzazione liste entità correlate con filtri, azioni e real-time updates
- ✅ **relation-editor.js** (763 righe): Editor modale per creazione/modifica relazioni con ricerca entità, validazione e attributi personalizzati
- ✅ **StandardContactCard v3.0.0**: Template evoluto con sezione relations, sub-moduli configurabili, azioni relazioni
- ✅ **CompactContactCard v1.0.0**: Template compatto universale per sub-moduli in liste relazioni
- ✅ **views/relation-test.html**: Pagina test completa per tutti i componenti di relazione con logging avanzato
- ✅ **Soluzione Relazioni Universali**: Supporto wildcard "*" per flessibilità schemi relazione.

**Funzionalità Validate:**
- ✅ CRUD relazioni tipizzate con RelationEngine backend integration
- ✅ Visualizzazione liste entità correlate con filtri e sub-moduli
- ✅ Editor relazioni con ricerca entità target e selezione tipo relazione
- ✅ WebSocket real-time per sincronizzazione eventi relazioni
- ✅ Template evolution con supporto `relations` section

### ✅ POST FASE 3 - Miglioramenti Autocomplete e Fix Critici
**Data Completamento:** $(date +%Y-%m-%d)
**Status:** ✅ Bug Corretti e Componente Autocomplete Migliorato

Questa sezione documenta importanti fix e miglioramenti apportati al componente `entity-autocomplete.js` e alle interazioni backend correlate, successivi al completamento formale della Fase 3.

**Problemi Risolti e Miglioramenti Chiave:**

**1. Visualizzazione Nomi Entità (Invece di soli ID):**
   - **Problema**: L'autocomplete e la visualizzazione dell'entità selezionata mostravano l'ID grezzo dell'entità, rendendo difficile l'identificazione.
   - **Soluzione**:
     - Introdotti/Migliorati i metodi `getDisplayName(entity)` e `getSecondareName(entity)` in `entity-autocomplete.js`. Questi metodi ora cercano attraverso una lista prioritaria di campi (es. `nome`, `name`, `title`, `ragioneSociale`) per determinare il miglior nome da visualizzare.
     - Aggiornato il rendering dei risultati di ricerca e dell'entità selezionata per utilizzare questi display name migliorati, mostrando nome completo (es. nome + cognome) quando possibile.
   - **Impatto**: Migliorata significativamente la User Experience del componente autocomplete.

**2. Correzione Creazione Entità (Errore 500 su `POST /api/entities`):**
   - **Problema**: La creazione di nuove entità (specialmente `Persona` o tipi con schemi `strict` e campi `required`) falliva con un errore 500.
   - **Causa Fondamentale**: Disallineamento nel formato dei dati attesi dal backend. Il server (`server_evolved.js`) si aspettava i dati della nuova entità nel campo `req.body.initialData`, mentre il frontend inviava i dati direttamente nel `req.body`.
   - **Soluzione Backend**: Modificato l'endpoint `POST /api/entities` in `server_evolved.js` per accettare i dati sia da `req.body.initialData` sia direttamente dal `req.body` (usando `...directData`). Questo ha reso il backend più robusto a diverse modalità di invio dati dal frontend.
   - **Impatto**: Risolto un bug critico che impediva la corretta creazione di entità da contesti che non usavano esplicitamente il wrapper `initialData` (come l'autocomplete).

**3. Aggiornamento Real-Time dell'Autocomplete (Entità Appena Create):**
   - **Problema**: Le entità create tramite un'istanza dell'autocomplete (o altrove nel sistema) non apparivano immediatamente nei risultati di ricerca di altre istanze dell'autocomplete senza un refresh manuale o una nuova digitazione.
   - **Soluzione**:
     - **Integrazione WebSocket**: Implementato `setupWebSocketListeners()` in `entity-autocomplete.js`. Questo listener si sottoscrive agli eventi `entity-created` e `attribute-updated` propagati dal `WebSocketService`.
     - **Auto-Refresh Intelligente**: Se un'entità di un tipo rilevante per l'istanza corrente dell'autocomplete viene creata (o un'entità visualizzata viene aggiornata), e l'utente ha una query attiva nel campo di ricerca, la ricerca viene automaticamente rieseguita dopo un breve delay. Questo assicura che i risultati riflettano lo stato più recente del sistema.
     - **Pulsante di Refresh Manuale**: Aggiunto un pulsante "🔄" nell'interfaccia dell'autocomplete. Questo permette all'utente di forzare un aggiornamento dei risultati, utile in scenari di fallback o per verifica.
     - **Gestione Ciclo di Vita**: Aggiunto `disconnectedCallback()` per pulire i listener WebSocket, prevenendo memory leak.
   - **Impatto**: L'autocomplete ora fornisce un'esperienza utente più fluida e real-time, mostrando le entità appena create quasi istantaneamente.

**File Modificati Principalmente:**
- `src/frontend/components/entity-autocomplete.js` (logica display, WebSocket, refresh button)
- `src/backend/server_evolved.js` (gestione dati `POST /api/entities`)

Questi interventi hanno reso il componente `entity-autocomplete` più robusto, user-friendly e meglio integrato con il flusso di dati real-time del sistema SSOT.

**Prossimo:** Fase 4 - Dashboard Dinamici e Composizione Documenti

## 1. Introduzione

### 1.1. Scopo del Documento
Questo documento definisce l'architettura tecnica e il piano di implementazione per l'evoluzione del frontend del sistema SSOT Dinamico. L'obiettivo è creare Webmodules efficienti, versatili, schema-aware, relation-aware, contestuali e interattivi, con un robusto supporto per Definizioni di Modulo (Template) e Istanze di Modulo (Salvabili).

### 1.2. Obiettivi Primari
1.  **Sviluppo di Webmodules Riusabili:** Basati su template e istanze configurabili.
2.  **Rendering Dinamico Schema-Aware:** Moduli che si adattano dinamicamente agli schemi definiti nel backend.
3.  **Gestione delle Relazioni:** Visualizzazione e interazione con entità correlate.
4.  **Istanze di Modulo Salvabili:** Permettere agli utenti di salvare e riutilizzare configurazioni specifiche dei moduli, che puntano ai dati SSOT senza duplicarli.
5.  **Composizione di Dashboard/Documenti:** Abilitare la creazione di viste complesse aggregando istanze di moduli.

### 1.3. Allineamento con Architettura SSOT Evoluta
Questa evoluzione del frontend si basa sulle fondamenta del Core Engine SSOT Evoluto, come descritto in:
*   `doc_tecnico_evoluzione_core_v1.md`: Dettaglia l'evoluzione del backend (SchemaManager, EntityEngine, RelationEngine, AttributeSpace).
*   `architettura_mvp_evoluto.md`: Descrive l'architettura consolidata del sistema post-evoluzione del core.

Il frontend sfrutterà le API e le capacità avanzate del backend evoluto per la gestione degli schemi, delle entità e delle relazioni.

### 1.4. Principi di Progettazione
*   **Modularità:** Componenti frontend ben definiti e riutilizzabili.
*   **Component-Based:** Utilizzo di Web Components per incapsulare logica e UI.
*   **Schema-Driven:** UI generata e adattata dinamicamente in base agli schemi.
*   **Separation of Concerns:** Chiara distinzione tra logica di presentazione, servizi e gestione dello stato.
*   **Sviluppo Incrementale:** Adozione di un approccio fasato per gestire la complessità.

### 1.5. Riferimenti Documentali Chiave
*   `doc_tecnico_evoluzione_core_v1.md`: Piano evolutivo del Core Engine.
*   `architettura_mvp_evoluto.md`: Architettura del sistema evoluto.
*   `context.md`: Diario di bordo del progetto.
*   `full-ssot.md`: Visione completa del sistema SSOT Dinamico.

## 2. Stack Tecnologico Frontend Proposto

### 2.1. Tecnologia dei Componenti
*   **Scelta Raccomandata:** Iniziare con **Web Components Puri** (standard web) per massimo controllo, interoperabilità e allineamento con un approccio vanilla JavaScript.
*   Alternative Considerabili (per fasi future o moduli specifici): Svelte, Vue.

### 2.2. Struttura Progetto Frontend
Si propone la seguente struttura di directory all'interno di `src/frontend/`:
```
/frontend
|-- /components         # Web Components riutilizzabili (es. ssot-input, attribute-display)
|-- /modules            # Implementazioni specifiche dei moduli (es. ContactCardModule)
|-- /definitions        # File JSON/YAML per le definizioni dei template dei moduli
|-- /services           # Servizi frontend (ModuleDefinitionService, SchemaService, etc.)
|-- /views              # Componenti che orchestrano viste complesse o pagine
|-- app.js              # Entry point principale dell'applicazione frontend
|-- app_module.js       # Logica per finestre figlie (se mantenuta)
|-- index.html          # Pagina principale
|-- module_loader.html  # Template per caricare moduli (se mantenuto)
`-- style.css           # Stili globali
```

## 3. Formato di Definizione dei Moduli (Template)

### 3.1. Struttura JSON/YAML Iniziale (per Template)
I template dei moduli saranno definiti in file JSON (o YAML) nella directory `frontend/definitions/`.
Esempio (`StandardContactCard.json`):
```json
{
  "moduleId": "StandardContactCard",
  "moduleVersion": "1.0.0",
  "targetEntityType": "Contatto", // O un array se applicabile a più tipi
  "description": "Template base per la visualizzazione di un contatto.",
  "defaultView": {
    "renderer": "StandardCardRenderer", // Potrebbe mappare a un Web Component o logica specifica
    "layout": [ // Opzionale: per layout più complessi, altrimenti una lista semplice
      { "sectionTitle": "Informazioni Principali", "attributes": ["nome", "cognome", "email"] },
      { "sectionTitle": "Dettagli", "attributes": ["telefono", "indirizzo_completo"] }
    ],
    // Alternativa più semplice per la Fase 1:
    // "attributesToDisplay": ["nome", "cognome", "email", "telefono"]
  },
  "instanceConfigurableFields": [ // Campi che un'istanza può sovrascrivere (Fase 2+)
    "attributesToDisplay",
    "sortOrder",
    "filterCriteria"
  ],
  "actions": [ // Azioni disponibili nel modulo (Fase 2+)
    { "actionId": "save", "label": "Salva", "handler": "handleSave" },
    { "actionId": "edit", "label": "Modifica", "handler": "handleEdit" }
  ],
  "views": { // Per viste multiple (Fase 2+)
    "compactCard": {
      "renderer": "CompactCardRenderer",
      "attributesToDisplay": ["nome", "cognome", "icona_status"]
    },
    "editableForm": {
      "renderer": "EditableFormRenderer",
      "attributesToEdit": ["nome", "cognome", "email", "telefono", "indirizzo_completo"]
    }
  },
  "relations": [ // Per la gestione delle relazioni (Fase 3+)
    {
      "relationType": "HA_TASK_ASSOCIATO",
      "targetEntityType": "Task",
      "displayAs": "subModuleList",
      "subModuleId": "TaskRowItem", // Template per ogni item della lista
      "label": "Task Associati"
    }
  ]
}
```

### 3.2. Evoluzione per Istanze e Relazioni
*   **Istanze:** Le istanze di modulo salveranno riferimenti al `templateModuleId`, `targetEntityId` (o criteri di query), e gli `instanceConfigOverrides` specifici.
*   **Relazioni:** La sezione `relations` nei template definirà come visualizzare e interagire con le entità correlate.

## 4. Servizi Frontend Chiave

Saranno sviluppati i seguenti servizi JavaScript in `frontend/services/`:

### 4.1. `ModuleDefinitionService.js`
*   **Responsabilità:** Caricare e gestire le definizioni dei template dei moduli.
*   **Metodi Chiave (Fase 1):**
    *   `async getDefinition(moduleId)`: Carica un file di definizione JSON da `frontend/definitions/`.
    *   `async listDefinitions()`: Restituisce un elenco dei template disponibili.
*   **Evoluzione:** Potrebbe interagire con un endpoint backend se i template diventano entità persistite.

### 4.2. `SchemaService.js`
*   **Responsabilità:** Interagire con il backend per recuperare informazioni sugli schemi delle entità e delle relazioni.
*   **Metodi Chiave (Fase 1):**
    *   `async getAttributes(entityType)`: Inizialmente usa `/api/schema/:entityType/attributes` (MVP).
*   **Preparazione per Backend Evoluto:**
    *   `async getEntitySchema(entityType)`: Per ottenere lo schema completo (tipi, validazioni, etc.) dallo SchemaManager evoluto.
    *   `async getRelationSchema(relationType)`: Per ottenere schemi di relazione.

### 4.3. `EntityService.js`
*   **Responsabilità:** Gestire le operazioni CRUD per le entità.
*   **Metodi Chiave (Fase 1):**
    *   `async getEntity(entityId)`: Interagisce con `/api/entity/:entityId` (MVP).
    *   `async getEntities(entityType, queryParams)`: Interagisce con `/api/entities/:entityType` (MVP).
*   **Preparazione per Backend Evoluto:**
    *   Integrare con EntityEngine evoluto per lazy loading, gestione reference.
    *   `async updateEntityAttribute(entityId, attributeName, value)` (Fase 2).
    *   Gestirà anche il CRUD per `ModuleInstance` e `DynamicDocument` (Fasi 2-3).

### 4.4. `WebSocketService.js`
*   **Responsabilità:** Gestire la connessione WebSocket e la propagazione degli eventi dal backend.
*   **Metodi Chiave (Fase 1):**
    *   `connect()`
    *   `subscribe(eventPattern, callback)`: Inizialmente per `attributeChange`.
*   **Preparazione per Backend Evoluto:**
    *   Sottoscrizioni più granulari tramite AttributeSpace evoluto (eventi entità, relazioni, schemi).
    *   Notificare i moduli/componenti interessati.

### 4.5. `SaveInstanceService.js` (o integrato in `EntityService.js`) - Fase 2
*   **Responsabilità:** Interagire con gli endpoint API per le `ModuleInstance`.
*   **Metodi Chiave:**
    *   `async createInstance(instanceData)`
    *   `async getInstance(instanceId)`
    *   `async updateInstance(instanceId, instanceData)`
    *   `async deleteInstance(instanceId)`

### 4.6. `RelationService.js` - Fase 3
*   **Responsabilità:** Interagire con il `RelationEngine` del backend per recuperare e manipolare relazioni.
*   **Metodi Chiave:**
    *   `async getRelatedEntities(entityId, relationType, queryParams)`
    *   `async createRelation(sourceEntityId, targetEntityId, relationType, attributes)`
    *   `async deleteRelation(relationId)`

## 5. Web Components di Base e Moduli

Verranno sviluppati i seguenti Web Components in `frontend/components/`:

### 5.1. Primitivi UI (es. `<ssot-input>`, `<ssot-button>`, `<ssot-select>`)
*   Componenti generici per elementi UI di base, per garantire consistenza e facilitare lo sviluppo.

### 5.2. `<attribute-display>`
*   **Responsabilità (Fase 1):** Visualizzare un valore di un attributo.
*   **Props:** `attribute-name`, `value`, `attribute-schema-info` (opzionale, fornito da `SchemaService` per formattazione specifica basata sul tipo).
*   **Funzionalità:** Rendering non editabile del valore.

### 5.3. `<attribute-editor>` - Fase 2
*   **Responsabilità:** Fornire un campo editabile per un attributo.
*   **Props:** `attribute-name`, `value`, `attribute-schema-info` (include tipo, validazioni, opzioni per select).
*   **Funzionalità:** Renderizza l'input appropriato (testo, numero, data, select, etc.), gestisce la validazione base e l'invio della modifica (tramite `EntityService`).

### 5.4. `<template-module-renderer>` (o `<module-container>`)
*   **Responsabilità (Fase 1):** Renderizzare un modulo basato su un template JSON e un ID entità.
*   **Props:** `module-id` (per il template), `entity-id`.
*   **Funzionalità:**
    *   Recupera la definizione del modulo (`ModuleDefinitionService`) e i dati dell'entità (`EntityService`).
    *   Renderizza la struttura base del modulo (es. titolo).
    *   Usa `<attribute-display>` per visualizzare gli attributi specificati nella definizione.
    *   Si sottoscrive a `WebSocketService` per aggiornare gli `<attribute-display>` al cambio dati.
*   **Evoluzione:** In Fase 2, passerà configurazioni derivate da `ModuleInstance` e potrà usare `<attribute-editor>` se il contesto/definizione lo richiede.

### 5.5. `<saved-module-instance>` - Fase 2
*   **Responsabilità:** Renderizzare un'istanza di modulo salvata.
*   **Props:** `instance-id`.
*   **Funzionalità:**
    *   Recupera i dati dell'istanza (`SaveInstanceService`).
    *   Usa `templateModuleId` e `targetEntityId` (o criteri) dall'istanza.
    *   Carica la definizione del template JSON (`ModuleDefinitionService`).
    *   Applica gli `instanceConfigOverrides` alla configurazione del template.
    *   Renderizza il modulo (potrebbe internamente usare/configurare un `<template-module-renderer>`).
    *   Si sottoscrive per aggiornamenti all'entità target e, potenzialmente, all'istanza stessa.

### 5.6. `<relation-list>` - Fase 3
*   **Responsabilità:** Visualizzare una lista di entità correlate.
*   **Props:** `source-entity-id`, `relation-type`, `sub-module-id` (template per ogni item), `relation-schema-info`.
*   **Funzionalità:**
    *   Usa `RelationService` per recuperare le entità correlate.
    *   Renderizza ogni entità correlata, usando `sub-module-id` per istanziare un template per item, oppure una vista semplice.
    *   Permette azioni sulle relazioni (es. crea, elimina, naviga).

### 5.7. `<relation-editor>` - Fase 3
*   **Responsabilità:** Componente per selezionare/cercare/creare entità da mettere in relazione.
*   **Funzionalità:** Utilizzato all'interno di moduli che gestiscono la creazione o modifica di relazioni.

### 5.8. `<document-renderer>` - Fase 3
*   **Responsabilità:** Caricare e renderizzare un `DynamicDocument` (o `Dashboard`).
*   **Props:** `document-id`.
*   **Funzionalità:**
    *   Recupera la definizione del documento (`EntityService`).
    *   Itera sulle `ModuleInstance` embeddate e renderizza ognuna usando `<saved-module-instance>`.

## 6. FASE 1: Fondamenta e Rendering da Template (Preparazione Immediata)

### 6.1. Obiettivi Fase 1
*   Creare i mattoni base per renderizzare moduli da definizioni template.
*   Stabilire i servizi frontend minimi e i Web Components di visualizzazione.
*   Preparare il backend per supportare le fasi successive (definizione schemi).

### 6.2. Azioni Frontend
1.  **Tecnologia dei Componenti e Struttura Progetto:**
    *   Decisione: Adottare Web Components Puri.
    *   Azione: Impostare la struttura delle directory `frontend/components`, `frontend/modules`, `frontend/definitions`, `frontend/services`.
2.  **Formato di Definizione dei Moduli (Template - JSON):**
    *   Azione: Progettare e iterare sulla struttura JSON iniziale (vedi Sezione 3.1), focalizzandosi su `moduleId`, `targetEntityType`, `description`, una singola `defaultView` con `attributesToDisplay`.
    *   Preparazione per Istanze: Strutturare in modo che sia chiaro quali attributi/relazioni sono configurabili.
3.  **Servizi Frontend Chiave (Minimale):**
    *   `ModuleDefinitionService.js`: Carica i file JSON di definizione.
    *   `SchemaService.js`: Interagisce con API MVP `/api/schema/:entityType/attributes`. Predisporre per API evolute.
    *   `EntityService.js`: Interagisce con API MVP `/api/entity/:entityId`, `/api/entities/:entityType`. Predisporre per API evolute.
    *   `WebSocketService.js`: Gestisce connessione e `attributeChange` come in MVP. Predisporre per sottoscrizioni granulari.
4.  **Web Components di Base:**
    *   Primitivi UI (`<ssot-input>`, `<ssot-button>`): Sviluppare versioni semplici.
    *   `<attribute-display>`: Sviluppare componente per visualizzazione (non editabile).
    *   `<template-module-renderer>`: Sviluppare componente che accetta `module-id` e `entity-id`, usa i servizi per recuperare dati e definizione, e renderizza usando `<attribute-display>`. Si sottoscrive a WebSocket.
5.  **Rifattorizzazione Moduli MVP Esistenti (Parziale):**
    *   Azione: Provare a usare `<template-module-renderer>` per visualizzare un Contatto (es. basandosi su un `SimpleContactCard.json`).
    *   Focus sulla visualizzazione da template; editing e azioni complesse MVP rimangono o vengono disabilitate temporaneamente.

### 6.3. Preparazione Backend (per Fase 1 Frontend)
Contemporaneamente allo sviluppo frontend della Fase 1, il backend dovrà:
1.  **SchemaManager Evoluto (Già in gran parte completato secondo `doc_tecnico_evoluzione_core_v1.md`):**
    *   Azione Immediata: Assicurarsi che esponga API REST stabili per recuperare schemi di entità dettagliati (tipi, validazioni), cruciali per `<attribute-display>` e il futuro `<attribute-editor>`.
    *   Azione Immediata: Progettare e definire (non necessariamente implementare CRUD completo subito) lo schema per `ModuleInstance` (attributi base: `id`, `instanceName`, `templateModuleId`, `targetEntityId`, `targetEntityType`, `ownerUserId`, `instanceConfigOverrides (JSON)`).
    *   Azione Immediata: Definire lo schema per `ModuleTemplateDefinition` se si decide di persisteli nel DB (alternativa: file JSON nel frontend).
2.  **EntityEngine Evoluto (Già in gran parte completato):**
    *   Azione Immediata: Essere pronto a gestire `ModuleInstance` e `ModuleTemplateDefinition` (se persistiti) come tipi di entità generiche, anche se il CRUD completo via API arriverà dopo.

## 7. FASE 4: Funzionalità Avanzate (Sviluppo Ulteriore)

### 9.1. Obiettivi Fase 4
*   Introdurre funzionalità enterprise e di usabilità avanzata.

### 9.2. Elenco Funzionalità Proposte
*   **Versionamento:** Per `ModuleInstance` e `ModuleTemplateDefinition`.
*   **Condivisione:** Di `ModuleInstance` e `DynamicDocument` tra utenti/gruppi.
*   **Logica di Migrazione:** Se un `ModuleTemplateDefinition` cambia e ci sono `ModuleInstance` basate su di esso.
*   **UI Sofisticate:** Per personalizzare gli `instanceConfigOverrides` (es. drag-and-drop, query builder visuali).
*   **Integrazione con LLM:** Per generare configurazioni di moduli, suggerire viste, o interpretare query in linguaggio naturale per configurare moduli.
*   **Analytics e Monitoring dei Moduli:** Tracciare l'utilizzo e le performance dei moduli.

## 10. Considerazioni Implementative e Prossimi Passi

### 10.1. Interdipendenze Backend-Frontend
*   La Fase 1 del frontend richiede che il backend fornisca API stabili per gli schemi di entità dettagliati.
*   La definizione dello schema di `ModuleInstance` nel backend (anche solo concettuale all'inizio) è importante per guidare il design frontend fin da subito.
*   L'implementazione del `RelationEngine` nel backend può procedere in parallelo, ma il frontend lo utilizzerà attivamente dalla Fase 3.

### 10.2. Approccio Incrementale e Validazione
*   Ogni fase dovrebbe portare a funzionalità testabili e validabili.
*   Raccogliere feedback continuo per iterare sul design dei moduli e dei template.

## 11. Conclusioni
Questa roadmap delinea un percorso ambizioso ma realizzabile per trasformare il frontend del sistema SSOT Dinamico. Attraverso un approccio fasato e modulare, si punta a costruire un'interfaccia utente potente, flessibile e altamente personalizzabile, sfruttando appieno le capacità del backend evoluto. La creazione di Webmodules basati su template e istanze salvabili rappresenta un passo cruciale verso la realizzazione della piena visione del SSOT Dinamico. 