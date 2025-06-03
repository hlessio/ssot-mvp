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

**Prossimo:** Fase 2 - Editing, Azioni Base e Introduzione Concetto di Istanza

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
Si propone la seguente struttura di directory all'interno di `mvp-ssot/frontend/`:
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

## 7. FASE 2: Editing, Azioni Base e Introduzione Concetto di Istanza (Sviluppo Successivo)

### 7.1. Obiettivi Fase 2
*   Introdurre capacità di editing nei moduli.
*   Permettere la personalizzazione e il salvataggio di istanze di moduli.
*   Implementare il backend per la gestione delle `ModuleInstance`.

### 7.2. Azioni Frontend
1.  **Web Components di Editing:**
    *   `<attribute-editor>`: Sviluppare componente per input editabile con validazione, basato su schema.
    *   Aggiornare `<template-module-renderer>` (o il suo wrapper per istanze) per usare `<attribute-editor>` se il contesto/definizione lo richiede.
2.  **Evoluzione Definizione dei Moduli (Template):**
    *   Estendere il JSON dei template per includere:
        *   Configurazioni per viste multiple (es. `views: { "compactCard": ..., "editableForm": ... }`).
        *   Definizione di azioni base (es. `"actions": [{ "actionId": "save", ...}]`) e i loro gestori.
        *   `instanceConfigurableFields`: Array che definisce cosa un'istanza può personalizzare (es. `["attributesToDisplay", "sortOrder"]`).
3.  **UI per Salvare Istanze:**
    *   `SaveInstanceService.js` (o integrare in `EntityService.js`): Sviluppare servizio.
    *   Aggiungere azione "Salva Vista Come..." (o simile) a `<template-module-renderer>` (o suo wrapper).
    *   Al click: raccoglie `templateModuleId`, `targetEntityId`, permette personalizzazione dei campi in `instanceConfigurableFields` (diventano `instanceConfigOverrides`), chiede un nome, chiama `SaveInstanceService.createInstance()`.
4.  **Web Component `<saved-module-instance>`:**
    *   Creare componente che accetta `instance-id`.
    *   Recupera dati istanza, carica definizione template, applica `instanceConfigOverrides`, renderizza il modulo.

### 7.3. Azioni Backend
1.  **CRUD per ModuleInstance:**
    *   Implementare completamente endpoint API per `ModuleInstance` (POST, GET `/:id`, PUT `/:id`, DELETE `/:id`) in `server_evolved.js`.
    *   Implementare la logica in `EntityEngine` evoluto per gestire le entità `ModuleInstance` (creazione, aggiornamento, recupero, persistenza).

## 8. FASE 3: Relazioni, Sub-moduli e Riutilizzo Avanzato (Sviluppo Successivo)

### 8.1. Obiettivi Fase 3
*   Integrare la visualizzazione e gestione delle relazioni nei moduli.
*   Supportare la composizione di moduli tramite sub-moduli.
*   Introdurre la capacità di creare documenti/dashboard dinamici.

### 8.2. Azioni Frontend
1.  **Potenziamento `RelationService.js`:**
    *   Interagire con il `RelationEngine` del backend.
2.  **Web Components per Relazioni:**
    *   `<relation-list>`: Mostra lista entità correlate, configurabile con `subModuleId` per item. Permette azioni.
    *   `<relation-editor>`: Per selezionare/creare entità da mettere in relazione.
3.  **Evoluzione Definizione dei Moduli (Template):**
    *   Estendere il JSON per specificare come visualizzare/interagire con relazioni (usando `<relation-list>`, `subModuleId`, ecc.).
    *   Es. `relations: [{ "type": "HAS_TASK", "displayAs": "subModuleList", "subModuleId": "TaskRowItem" }]`
4.  **Composizione di Documenti/Dashboard:**
    *   UI per creare/gestire `DynamicDocument`.
    *   UI per cercare e aggiungere `<saved-module-instance>` a un `DynamicDocument`.
    *   `<document-renderer>`: Carica un `DynamicDocument` e renderizza le istanze embeddate.

### 8.3. Azioni Backend
1.  **RelationEngine e Schemi di Relazione (Come da `doc_tecnico_evoluzione_core_v1.md`):**
    *   Assicurarsi che il `RelationEngine` sia completamente operativo e che la persistenza/gestione degli schemi di relazione sia robusta.
2.  **Definizione Entità `DynamicDocument`:**
    *   Definire lo schema per `DynamicDocument` (o `Dashboard`) nello `SchemaManager`.
    *   Questa entità avrà tipicamente una relazione (es. `EMBEDS_MODULE_INSTANCE` o `HAS_VIEW_COMPONENT`) verso più `ModuleInstance`.
    *   Implementare il CRUD per `DynamicDocument` in `EntityEngine` e API.

## 9. FASE 4: Funzionalità Avanzate (Sviluppo Ulteriore)

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