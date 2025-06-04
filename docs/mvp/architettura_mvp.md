# Architettura Tecnica - MVP SSOT Dinamico

## 1. Introduzione

[Nota per l'LLM: Questo documento è un documento vivente che descrive l'architettura tecnica del MVP SSOT Dinamico. Aggiornalo man mano che vengono implementate nuove funzionalità, mantenendo traccia delle modifiche e delle evoluzioni del sistema.]

**Importante Contesto Evolutivo:** Questo documento descrive l'architettura tecnica del *Minimum Viable Product (MVP)* iniziale per il progetto SSOT Dinamico. L'MVP si è concentrato sulla dimostrazione della propagazione bidirezionale e in tempo reale delle modifiche agli attributi tra moduli eterogenei, inclusa la sincronizzazione tra finestre del browser separate, con un focus sulla scoperta automatica degli attributi.

Successivamente alla fase MVP, il sistema ha intrapreso un'importante evoluzione del suo Core Engine Backend e del Sistema di Gestione degli Schemi, come dettagliato nel documento tecnico: **`doc_tecnico_evoluzione_core_v1.md`**. Tale evoluzione introduce una gestione della conoscenza più organica e semanticamente ricca, con concetti quali:

*   **Granularità Semantica Profonda**: Modellare attributi complessi come riferimenti a entità separate ("value-entities").
*   **SchemaManager Evoluto**: Custode della semantica strutturale e organica, con supporto per la definizione esplicita di schemi (inclusi attributi di tipo "reference"), modalità flessibili, e processi di evoluzione dello schema (come la promozione di attributi).
*   **RelationEngine Potenziato**: Per gestire relazioni tipizzate e i link derivanti da attributi di tipo "reference".
*   **Moduli UI Schema-Aware**: Moduli frontend che si adattano dinamicamente agli schemi definiti.

**Pertanto, per una comprensione dell'architettura attuale e delle funzionalità più avanzate del sistema SSOT Dinamico, si prega di fare riferimento primario a `doc_tecnico_evoluzione_core_v1.md`. Questo documento (`architettura_mvp.md`) rimane un riferimento storico per la fase MVP.**

Questo documento descrive l'architettura tecnica e il funzionamento interno del *Minimum Viable Product (MVP)* per il progetto "Verso un'Unica Fonte di Verità Dinamica e Contestuale" (SSOT Dinamico). L'MVP si concentra sulla dimostrazione della propagazione bidirezionale e in tempo reale delle modifiche agli attributi tra moduli eterogenei, inclusa la sincronizzazione tra finestre del browser separate.

[Istruzioni per l'LLM:
- Aggiorna questa sezione quando vengono implementate nuove funzionalità chiave
- Mantieni aggiornata la lista delle funzionalità dimostrate
- Documenta eventuali cambiamenti nell'architettura o nel design
- Assicurati che la descrizione rifletta sempre lo stato attuale del sistema]

## 2. Stack Tecnologico

L'MVP utilizza il seguente stack tecnologico minimale:

*   **Backend:**
    *   **Runtime:** Node.js
    *   **Framework Server:** Express.js
    *   **Comunicazione Real-time:** WebSocket (libreria `ws`)
    *   **Database:** Neo4j (Graph Database)
    *   **Driver Neo4j:** `neo4j-driver` per Node.js
    *   **Utility:** `uuid` per ID univoci, `cors` per la gestione Cross-Origin Resource Sharing.
*   **Frontend:**
    *   **Linguaggio:** Vanilla JavaScript (ES6+)
    *   **Struttura:** HTML5
    *   **Stile:** CSS3
    *   **Comunicazione Cross-Window:** `BroadcastChannel API` (con fallback a `localStorage` events)

## 3. Struttura del Progetto

```
/src
|-- /backend
|   |-- /core                 # Logica di business: EntityEngine, AttributeSpace, SchemaManager
|   |   |-- attributeSpace.js
|   |   |-- entityEngine.js
|   |   `-- schemaManager.js
|   |-- /dao                  # Data Access Object per Neo4j
|   |   `-- neo4j_dao.js
|   |-- /services             # (Potenziali servizi futuri, non usati massivamente nell'MVP)
|   |-- neo4j_connector.js    # Gestore connessione Neo4j
|   `-- server.js             # Server Express e WebSocket
|-- /frontend
|   |-- /modules              # Moduli UI riutilizzabili
|   |   |-- ContactCardModule.js
|   |   `-- TabularModule.js
|   |-- app.js                # Logica UI principale (dashboard e finestra principale)
|   |-- app_module.js         # Logica UI per finestre figlie (caricatore moduli)
|   |-- index.html            # Pagina principale (dashboard)
|   |-- module_loader.html    # Pagina template per finestre figlie
|   `-- style.css             # Stili CSS globali
|-- package.json
|-- package-lock.json
|-- .gitignore
|-- architettura_mvp.md     # Questo documento
|-- context.md              # Diario di bordo dello sviluppo
|-- full-ssot.md            # Visione completa del progetto (non MVP)
`-- manuale_sviluppo_mvp.md # Manuale di sviluppo per l'MVP
```

## 4. Architettura Backend

Il backend è responsabile della persistenza dei dati, della logica di business centrale e della comunicazione in tempo reale con i client frontend.

### 4.1. Server (`server.js`)

*   **Framework:** Express.js gestisce le richieste HTTP API REST.
*   **API REST Endpoints:**
    *   `GET /api/entities/:entityType`: Recupera tutte le entità di un tipo.
    *   `POST /api/entities`: Crea una nuova entità.
    *   `GET /api/entity/:entityId`: Recupera una singola entità.
    *   `PUT /api/entity/:entityId/attribute`: Aggiorna un attributo di un'entità.
    *   `GET /api/schema/:entityType/attributes`: Recupera gli attributi per un tipo di entità.
    *   `POST /api/schema/:entityType/attributes`: Aggiunge un nuovo attributo a un tipo di entità.
*   **WebSocket Server (libreria `ws`):**
    *   Instanziato parallelamente al server Express.
    *   Gestisce connessioni multiple dai client (finestra principale e finestre figlie).
    *   Utilizzato per la propagazione bidirezionale delle modifiche.

### 4.2. Connettore Neo4j (`neo4j_connector.js`)

*   Singleton responsabile della gestione della connessione al database Neo4j.
*   Fornisce un'istanza del driver Neo4j e metodi per acquisire sessioni di database.
*   Configurazione della connessione (URI, utente, password) centralizzata.

### 4.3. DAO - Data Access Object (`dao/neo4j_dao.js`)

*   Livello di astrazione per le interazioni con Neo4j.
*   Contiene funzioni che eseguono query Cypher per operazioni CRUD (Create, Read, Update, Delete) su entità e attributi.
    *   `createEntity(entityType, initialAttributes)`
    *   `getEntityById(id)`
    *   `updateEntityAttribute(entityId, attributeName, attributeValue)`
    *   `getAllEntities(entityType)`
    *   `getAllAttributeKeysForEntityType(entityType)`
    *   `addAttributeToSchema(entityType, attributeName)`
*   Utilizza il `neo4j_connector` per ottenere sessioni.

### 4.4. Core Logic (`core/`)

#### 4.4.1. `SchemaManager_MVP` (`core/schemaManager.js`)

*   Gestisce la conoscenza dei tipi di entità e dei loro attributi.
*   Nell'MVP, è una semplice implementazione in-memory che può essere estesa per la persistenza dello schema.
*   Metodi:
    *   `addAttributeToType(entityType, attributeName)`
    *   `getAttributesForType(entityType)`
    *   `loadSchemaFromDB()`: Carica dinamicamente gli attributi esistenti da Neo4j all'avvio.

#### 4.4.2. `EntityEngine_MVP` (`core/entityEngine.js`)

*   Motore centrale per la gestione delle entità.
*   Coordina le interazioni tra DAO, `SchemaManager` e `AttributeSpace`.
*   Metodi principali:
    *   `createEntity(entityType, initialData)`: Crea un'entità, la persiste e notifica.
    *   `setEntityAttribute(entityId, attributeName, value)`: Modifica un attributo, lo persiste e notifica.
    *   `getEntity(entityId)`: Recupera un'entità.
    *   `getAllEntities(entityType)`: Recupera tutte le entità.

#### 4.4.3. `AttributeSpace_MVP` (`core/attributeSpace.js`)

*   **Cuore della Reattività Backend.** Implementa il pattern Observer.
*   Mantiene un registro dei client WebSocket connessi (`listeners`).
*   Metodi:
    *   `addConnection(ws)`: Aggiunge un client WebSocket alla lista.
    *   `removeConnection(ws)`: Rimuove un client.
    *   `broadcastChange({ entityId, attributeName, newValue, sourceType, sourceId })`: Notifica a tutti i client connessi (eccetto la fonte originale della modifica, se specificata) un cambiamento avvenuto.
*   Viene chiamato da `EntityEngine_MVP` dopo ogni modifica persistita.

## 5. Architettura Frontend

Il frontend è responsabile della visualizzazione dei dati, dell'interazione utente e della sincronizzazione in tempo reale con il backend e tra finestre.

### 5.1. Pagina Principale (`index.html` e `app.js`)

*   **`index.html`**: Struttura HTML del dashboard principale.
    *   Contiene i contenitori per i moduli Tabellare e Scheda Contatto.
    *   Navigazione per switchare tra moduli.
    *   Controlli per aprire moduli in nuove finestre.
    *   Pannello di debug.
*   **`app.js` (`MVPApp` class):** Coordinatore della finestra principale.
    *   Gestisce la visualizzazione dei moduli (`TabularModule`, `ContactCardModule`).
    *   Inizializza e gestisce la connessione WebSocket globale al backend.
    *   **Gestione Finestre Separate:**
        *   `openModuleInNewWindow(moduleType)`: Usa `window.open()` per lanciare `module_loader.html`.
        *   Traccia le finestre figlie aperte (`openWindows` Map).
    *   **Comunicazione Cross-Window (`BroadcastChannel`):**
        *   Inizializza un `BroadcastChannel('ssot-sync')`.
        *   `handleCrossWindowMessage(data)`: Riceve messaggi da altre finestre e propaga gli aggiornamenti ai moduli locali.
        *   `broadcastToOtherWindows(entityId, attributeName, newValue)`: Invia messaggi alle altre finestre.
    *   Propaga gli aggiornamenti ricevuti dal WebSocket ai moduli attivi.

### 5.2. Caricatore Moduli Finestre Figlie (`module_loader.html` e `app_module.js`)

*   **`module_loader.html`**: Template HTML per le finestre figlie.
    *   Minimale, contiene un contenitore per il modulo e include gli script necessari.
    *   Non presenta più un header personalizzato o indicatori visivi, ma adotta uno stile "Web 1.0" estremamente primitivo (sfondo grigio, font monospace) per focalizzarsi unicamente sul contenuto del modulo.
*   **`app_module.js` (`ModuleWindowManager` class):** Coordinatore per le finestre figlie.
    *   Determina quale modulo caricare (`tabular` o `contact`) dal parametro URL `?module=...`.
    *   Crea dinamicamente l'HTML specifico del modulo richiesto all'interno del `module-container`. L'HTML generato per i moduli è anch'esso stilizzato in modo primitivo (bottoni base, tabelle e form con bordi semplici, font monospace).
    *   Istanzia il modulo corretto (`TabularModule` o `ContactCardModule`).
    *   **Sovrascrittura Metodo di Notifica:** Intercetta le chiamate a `notifyEntityUpdate()` del modulo figlio per inviare aggiornamenti tramite `BroadcastChannel` alla finestra principale e alle altre finestre figlie.
    *   Stabilisce una propria connessione WebSocket al backend.
    *   Partecipa alla comunicazione `BroadcastChannel('ssot-sync')` per ricevere e inviare aggiornamenti.
    *   Non gestisce più elementi UI come titoli di finestra o indicatori di stato, poiché rimossi da `module_loader.html`.

### 5.3. Moduli UI (`modules/`)

Ogni modulo è una classe JavaScript responsabile di una specifica vista e interazione.

#### 5.3.1. `TabularModule.js`

*   Visualizza entità come righe e attributi come colonne in una `<table>`.
*   Input editabili nelle celle.
*   Funzionalità:
    *   Aggiungi riga (nuova entità).
    *   Aggiungi colonna (nuovo attributo per `entityType`).
    *   `handleCellEdit()`: Gestisce la modifica di una cella, invia l'aggiornamento al backend via API REST.
    *   `handleAttributeChange(changeData)`: Riceve aggiornamenti dal WebSocket (propagato da `app.js` o `app_module.js`) e aggiorna la UI.
    *   `handleExternalUpdate(entityId, attributeName, newValue)`: Riceve aggiornamenti dal `BroadcastChannel` e aggiorna la UI.
    *   `notifyEntityUpdate(entityId, attributeName, newValue)`: Chiamato dopo una modifica locale, permette ad `app.js` o `app_module.js` di propagare via `BroadcastChannel`.
    *   `init()`: Metodo di inizializzazione asincrono che carica dati e imposta listeners (chiamato da `app.js` o `app_module.js`).

#### 5.3.2. `ContactCardModule.js`

*   Visualizza i dettagli di una singola entità selezionata tramite un `<select>`.
*   Campi input editabili per ogni attributo.
*   Funzionalità:
    *   Selezione entità.
    *   `handleFieldEdit()`: Gestisce la modifica di un campo, invia l'aggiornamento al backend via API REST.
    *   `handleAttributeChange(changeData)`: Come `TabularModule`.
    *   `handleExternalUpdate(entityId, attributeName, newValue)`: Come `TabularModule`.
    *   `notifyEntityUpdate(entityId, attributeName, newValue)`: Come `TabularModule`.
    *   `init()`: Come `TabularModule`.

## 6. Flusso Dati e Sincronizzazione

### 6.1. Modifica Utente in una Finestra (Principale o Figlia)

1.  **UI Event:** L'utente modifica un campo (es. input in tabella o scheda).
2.  **Modulo UI (es. `TabularModule.handleCellEdit`):**
    *   Valida la modifica.
    *   Invia una richiesta `PUT /api/entity/:entityId/attribute` al backend.
3.  **Backend `EntityEngine.setEntityAttribute`:**
    *   Chiama `Neo4jDAO.updateEntityAttribute` per persistere la modifica.
    *   Chiama `AttributeSpace.broadcastChange`.
4.  **Backend `AttributeSpace.broadcastChange`:**
    *   Invia un messaggio WebSocket (`{ type: 'attributeChange', data: {...} }`) a TUTTI i client WebSocket connessi (finestra principale e tutte le finestre figlie).
5.  **Modulo UI (es. `TabularModule.notifyEntityUpdate`):**
    *   Viene chiamato dopo la risposta positiva dall'API REST.
    *   Questo, a sua volta, chiama `app.broadcastToOtherWindows()` (nella finestra principale) o `moduleManager.broadcastToOtherWindows()` (nelle finestre figlie).
6.  **Comunicazione Cross-Window (`BroadcastChannel`):**
    *   Un messaggio `{ type: 'entity-update', ... }` viene inviato sul canale `ssot-sync`.

### 6.2. Ricezione Aggiornamenti

#### A. Da WebSocket (Notifica dal Server)

1.  **`app.js` / `app_module.js` (WebSocket `onmessage`):**
    *   Riceve il messaggio `attributeChange`.
    *   Lo propaga al metodo `handleAttributeChange` dei moduli UI locali.
2.  **Modulo UI (`handleAttributeChange`):**
    *   Aggiorna il campo/cella corrispondente nella UI, *se non è l'elemento che ha originato la modifica e non è attualmente in focus dall'utente*.
    *   Aggiorna lo stato dati locale del modulo.

#### B. Da BroadcastChannel (Notifica da Altra Finestra)

1.  **`app.js` / `app_module.js` (`BroadcastChannel onmessage`):**
    *   Riceve il messaggio `entity-update`.
    *   Lo propaga al metodo `handleExternalUpdate` dei moduli UI locali.
2.  **Modulo UI (`handleExternalUpdate`):**
    *   Simile a `handleAttributeChange`, aggiorna la UI e lo stato dati locale, evitando loop e conflitti con l'editing utente.

Questo doppio meccanismo (WebSocket per la sincronizzazione con il server e tra diverse sessioni/browser, BroadcastChannel per la sincronizzazione ultra-rapida tra finestre dello stesso browser) garantisce la reattività e la coerenza dei dati richieste.

## 7. Punti Chiave dell'Architettura

*   **Separazione delle Responsabilità:** Backend per logica e persistenza, frontend per UI e interazione.
*   **Comunicazione Real-time:** WebSockets per la propagazione server-client.
*   **Sincronizzazione Cross-Window:** BroadcastChannel API per comunicazioni efficienti tra finestre dello stesso browser.
*   **Modularità Frontend:** Componenti UI (`TabularModule`, `ContactCardModule`) riutilizzabili e gestiti da coordinatori (`app.js`, `app_module.js`).
*   **Pattern Observer:** Utilizzato in `AttributeSpace` per notificare i client delle modifiche.
*   **Fallback:** `localStorage` per browser che non supportano `BroadcastChannel`.
*   **Inizializzazione Differita:** I moduli UI inizializzano i propri elementi DOM e listener solo quando necessario e dopo che l'HTML pertinente è stato caricato, specialmente nelle finestre figlie.

## 8. Possibili Miglioramenti Futuri (Oltre MVP)

*   Persistenza dello schema utente in Neo4j.
*   Gestione più robusta dei conflitti di editing simultaneo.
*   Autenticazione e autorizzazione.
*   Ottimizzazioni delle prestazioni per grandi quantità di dati.
*   Notifiche WebSocket più granulari (es. per specifici tipi di entità o utenti).
*   Test unitari e di integrazione più completi. 