# Manuale di Sviluppo per l'MVP del SSOT Dinamico

## Introduzione Concettuale all'MVP del SSOT Dinamico

Questo documento guida la realizzazione di un *Minimum Viable Product (MVP)* per il progetto "Verso un'Unica Fonte di Verità Dinamica e Contestuale" (SSOT Dinamico). L'obiettivo di questo MVP non è implementare l'intera, ambiziosa visione del sistema, ma di costruire un *Proof of Concept (PoC)* focalizzato sulla dimostrazione della sua meccanica fondamentale: la capacità di mantenere e propagare la coerenza informativa in tempo reale attraverso interfacce utente eterogenee.

### Idee Chiave del Progetto SSOT Dinamico da Dimostrare nell'MVP:

1.  **Unica Fonte di Verità (SSOT) Dinamica:**
    *   A differenza degli SSOT tradizionali, statici e rigidi, questo sistema mira a rappresentare l'informazione come un'entità viva e reattiva. L'MVP dimostrerà che una modifica apportata a un dato in un punto del sistema si riflette istantaneamente e correttamente in tutti gli altri punti che visualizzano o utilizzano quel dato, **inclusi moduli aperti in finestre del browser separate**.
2.  **Entità e Attributi come Fondamenta:**
    *   Il sistema si basa sul concetto di *Entità* (oggetti del mondo reale o concetti, come un "Contatto") che possiedono *Attributi* (proprietà come "Nome", "Cognome", "Email").
    *   L'MVP permetterà la creazione dinamica di nuove entità e l'aggiunta dinamica di nuovi attributi a un tipo di entità, riflettendo la flessibilità del sistema finale.
    *   Propagata a tutte le altre interfacce (ad esempio, una scheda dettaglio) che stanno visualizzando o potrebbero visualizzare quell'attributo per quell'entità, aggiornandole in tempo reale. **Questo include istanze dello stesso modulo o moduli diversi aperti in altre schede o finestre del browser.**
3.  **Reattività e Propagazione Istantanea:**
    *   Il cuore del PoC è dimostrare la *reattività*. Quando un attributo di un'entità viene modificato attraverso un'interfaccia (ad esempio, una cella di una tabella), questa modifica deve essere:
        *   Persistita nella fonte di verità (Neo4j).
        *   Propagata a tutte le altre interfacce (ad esempio, una scheda dettaglio) che stanno visualizzando o potrebbero visualizzare quell'attributo per quell'entità, aggiornandole in tempo reale.
4.  **Dissociazione tra Dati e Presentazione:**
    *   L'MVP utilizzerà due moduli di visualizzazione/interazione distinti (un modulo tabellare simile a un foglio di calcolo e un modulo scheda contatto) per operare sugli stessi dati sottostanti. Questo evidenzierà come la "verità" sia unica e centrale, mentre le sue rappresentazioni possono essere molteplici e contestuali, **anche quando queste rappresentazioni risiedono in finestre del browser separate.**
5.  **Persistenza Affidabile (Leveraging Neo4j):**
    *   Per l'MVP, sfrutteremo un database a grafo maturo (Neo4j) come backend di persistenza. Questo ci permette di concentrarci sulla logica dinamica e reattiva dell'engine applicativo, delegando la complessità della gestione dei dati a un sistema collaudato. Il nostro "Engine Dinamico" agirà come uno strato intelligente sopra Neo4j.

### Funzionalità Core dell'MVP:

L'MVP si concentrerà sulla creazione di due semplici moduli interconnessi:

1.  **Modulo Tabellare:**
    *   Permetterà di visualizzare entità come righe e i loro attributi come colonne.
    *   L'aggiunta di una nuova riga creerà una nuova entità.
    *   L'aggiunta di una nuova colonna definirà un nuovo attributo disponibile per il tipo di entità visualizzato.
    *   Le celle saranno editabili, e le modifiche si propagheranno.
    *   **Sarà possibile aprire questo modulo in una nuova finestra del browser.**
2.  **Modulo Scheda Contatto:**
    *   Permetterà di selezionare una singola entità.
    *   Visualizzerà gli attributi dell'entità selezionata come campi editabili.
    *   Le modifiche apportate qui si propagheranno.
    *   **Sarà possibile aprire questo modulo in una nuova finestra del browser.**

### Scopo del Proof of Concept:

L'MVP sarà considerato un successo se dimostrerà in modo convincente che modificando un attributo in *qualsiasi* dei due moduli (sia nella finestra principale che in una finestra separata), la modifica viene immediatamente riflessa nell'altro modulo (o nella stessa istanza in un'altra finestra) e persistita correttamente, mantenendo una singola, coerente versione della verità per quell'informazione. L'interfaccia utente sarà minimale e funzionale, senza enfasi sull'estetica, per concentrarsi sulla meccanica di base del SSOT dinamico.

## Guida Passo-Passo per l'MVP del SSOT Dinamico

**Obiettivo Primario dell'MVP:** Dimostrare la propagazione bidirezionale e in tempo reale delle modifiche agli attributi tra due moduli distinti (Tabellare e Scheda Contatto), con persistenza dei dati su Neo4j.

### Stack Tecnologico Proposto (Minimale):

*   **Backend:** Node.js con Express (o simile, anche solo script Node.js per la logica core se non serve API subito).
*   **Database:** Neo4j (istanza locale o AuraDB free tier).
*   **Frontend:** Vanilla JavaScript (o un framework leggero come Svelte/Vue se hai familiarità e vuoi velocizzare la parte UI, ma per UI "essenziale" Vanilla JS basta), HTML, CSS.
*   **Comunicazione Backend-Frontend (per la reattività):** WebSocket (o Server-Sent Events se la comunicazione è prevalentemente server->client). Per un MVP iper-semplice, potremmo anche simulare la reattività nel frontend se inizialmente non vogliamo un backend server full-fledged, ma per dimostrare la SSOT *reale* con persistenza, un minimo di backend è utile.
*   **Driver Neo4j:** `neo4j-driver` per Node.js.

### Fasi di Sviluppo dell'MVP:

#### Fase 0: Setup Ambiente e Fondamenta

1.  **Installazione:**
    *   Node.js e npm/yarn.
    *   Neo4j Desktop (o Docker image).
    *   Crea un nuovo progetto Node.js (`npm init`).
    *   Installa le dipendenze base: `neo4j-driver`, `uuid` (per ID univoci). Se vuoi un server web: `express`, `ws` (per WebSocket).
2.  **Struttura Progetto (Suggerimento):**
    ```
    /mvp-ssot
    |-- /backend
    |   |-- /core                 # EntityEngine, AttributeSpace, SchemaManager (MVP versions)
    |   |-- /dao                  # Neo4j Data Access Object
    |   |-- /services             # Eventuali servizi di coordinamento
    |   |-- server.js             # Se usi Express/WebSocket
    |   |-- neo4j_connector.js    # Configurazione connessione Neo4j
    |-- /frontend
    |   |-- /modules              # TabularModule.js, ContactCardModule.js
    |   |-- index.html            # Dashboard primitivo
    |   |-- style.css             # Stili essenziali
    |   |-- app.js                # Logica frontend principale, gestione WebSocket
    |-- package.json
    ```

#### Fase 1: Modello Dati Neo4j e DAO Iniziale

1.  **Modello Neo4j:**
    *   **Entità:** Nodi con una label `:Entity` e una label specifica per il tipo (es. `:GenericEntity` per l'MVP, o `:Contact`). Proprietà chiave: `id` (univoco, generato via `uuid`), `entityType`, `createdAt`, `updatedAt`.
    *   **Attributi:** Per l'MVP, gli attributi possono essere memorizzati come proprietà direttamente sui nodi `:Entity`.
        *   Esempio: un nodo `:Entity:Contact {id: "...", entityType: "Contact", nome: "Mario", cognome: "Rossi"}`.
2.  **DAO (`neo4j_dao.js`):**
    *   Funzione per connettersi a Neo4j.
    *   `createEntity(entityType, initialAttributes)`: Crea un nodo `:Entity` con `id` univoco e `entityType`. Salva `initialAttributes` come proprietà. Ritorna l'entità creata.
    *   `getEntityById(id)`: Recupera un'entità per ID.
    *   `updateEntityAttribute(entityId, attributeName, attributeValue)`: Aggiorna/crea una proprietà sul nodo specificato.
    *   `getAllEntities(entityType)`: Recupera tutte le entità di un certo tipo (utile per il modulo tabellare).
    *   `getAllAttributeKeysForEntityType(entityType)`: (Opzionale, per popolare le colonne) Recupera tutti i nomi delle proprietà usate dalle entità di un tipo.

#### Fase 2: Core Engine (Versioni MVP)

1.  **`SchemaManager_MVP` (`backend/core/schemaManager.js`):**
    *   Per l'MVP, può essere un semplice oggetto in-memory o una classe che tiene traccia dei tipi di entità e dei loro attributi conosciuti.
    *   `knownEntityTypes = {"Contact": ["nome", "cognome", "email"]}` (inizialmente vuoto, si popola).
    *   `addAttributeToType(entityType, attributeName)`: Aggiunge un attributo a un tipo.
    *   `getAttributesForType(entityType)`: Ritorna gli attributi.
2.  **`EntityEngine_MVP` (`backend/core/entityEngine.js`):**
    *   Inietta il DAO e lo `SchemaManager_MVP`.
    *   `createEntity(entityType, initialData)`:
        *   Chiama `dao.createEntity`.
        *   Aggiorna lo `SchemaManager_MVP` con eventuali nuovi attributi da `initialData`.
    *   `setEntityAttribute(entityId, attributeName, value)`:
        *   Chiama `dao.updateEntityAttribute`.
        *   Notifica l'`AttributeSpace_MVP`.
    *   `getEntity(entityId)`: Chiama `dao.getEntityById`.
    *   `getAllEntities(entityType)`: Chiama `dao.getAllEntities`.
3.  **`AttributeSpace_MVP` (`backend/core/attributeSpace.js`):**
    *   Il cuore della reattività per l'MVP.
    *   Mantiene un registro dei "sottoscrittori" (i moduli frontend).
    *   `listeners = []` (ogni listener è una callback).
    *   `subscribe(callback)`: Aggiunge una callback alla lista.
    *   `unsubscribe(callback)`: Rimuove una callback.
    *   `notifyChange({ entityId, attributeName, newValue })`:
        *   Itera su `listeners` ed esegue ogni callback, passando i dettagli della modifica.
        *   Questa funzione sarà chiamata da `EntityEngine_MVP` dopo un `setEntityAttribute`.

#### Fase 3: Backend Server (Minimale per Comunicazione)

*   Se usi WebSocket (`server.js`):
    *   Configura un server Express e un server WebSocket.
    *   Quando `AttributeSpace_MVP.notifyChange` viene chiamato, il server invia un messaggio WebSocket a tutti i client connessi con i dettagli della modifica.
    *   Espone endpoint HTTP (o gestisce messaggi WebSocket) per:
        *   Creare entità.
        *   Aggiornare attributi di entità.
        *   Ottenere tutte le entità.
        *   Ottenere tutti gli attributi di un tipo (per le colonne della tabella).

#### Fase 4: Frontend - Modulo Tabellare (`frontend/modules/TabularModule.js`)

1.  **Struttura HTML (in `index.html` o generata dinamicamente):**
    *   Un `<table>`.
    *   Un bottone "Aggiungi Riga" (Nuova Entità).
    *   Un bottone "Aggiungi Colonna" (Nuovo Attributo).
2.  **Logica JavaScript:**
    *   **Caricamento Dati:** Al caricamento, richiede al backend tutte le entità (es. tipo "Contact") e tutti gli attributi definiti per quel tipo.
    *   **Rendering Tabella:**
        *   Le colonne sono gli attributi.
        *   Le righe sono le entità.
        *   Le celle `<td>` contengono `<input type="text">` per l'editing. Ogni input ha `data-entity-id` e `data-attribute-name`.
    *   **Aggiungi Riga:**
        *   Chiede all'utente il tipo di entità (o default a "Contact").
        *   Invia una richiesta al backend per creare una nuova entità (con attributi iniziali vuoti o di default).
        *   Al successo, aggiunge una nuova riga alla tabella.
    *   **Aggiungi Colonna:**
        *   Chiede all'utente il nome del nuovo attributo.
        *   Notifica il backend (che aggiornerà lo `SchemaManager_MVP`).
        *   Aggiunge una nuova colonna `<th>` e celle `<input>` vuote nelle righe esistenti per il nuovo attributo.
    *   **Editing Cella:**
        *   Quando un `<input>` perde il focus (evento `blur`) o il valore cambia (evento `change`), se il valore è diverso dal precedente:
            *   Ottiene `entityId` e `attributeName` dai `data-*` attributes.
            *   Invia una richiesta al backend per aggiornare l'attributo.
    *   **Sottoscrizione Aggiornamenti:**
        *   Si connette al WebSocket del backend.
        *   Quando riceve un messaggio di `attributeChange` dal server:
            *   Trova l'input corretto nella tabella (`document.querySelector('input[data-entity-id="..."][data-attribute-name="..."]')`).
            *   Aggiorna il valore dell'input, *solo se non è l'input che ha originato la modifica* (per evitare loop se la notifica è troppo rapida).

#### Fase 5: Frontend - Modulo Scheda Contatto (`frontend/modules/ContactCardModule.js`)

1.  **Struttura HTML:**
    *   Un `<select>` per scegliere un'entità (popolato con gli ID delle entità esistenti).
    *   Un `<div>` dove verranno mostrati gli slot degli attributi.
2.  **Logica JavaScript:**
    *   **Caricamento Entità:** Popola il `<select>` con gli ID delle entità disponibili (ottenute dal backend).
    *   **Selezione Entità:** Quando un'entità è selezionata dal `<select>`:
        *   Recupera i dati completi dell'entità dal backend (o da una cache locale se già caricati).
        *   Renderizza dinamicamente gli slot nel `<div>`: `<label>Nome Attributo</label><input type="text" data-attribute-name="nomeAttributo" value="valoreAttributo">`.
    *   **Editing Slot:**
        *   Come nel modulo tabellare, quando un `<input>` cambia valore, invia l'aggiornamento al backend.
    *   **Sottoscrizione Aggiornamenti:**
        *   Simile al modulo tabellare, si connette al WebSocket.
        *   Quando riceve `attributeChange`, se l'entità modificata è quella attualmente visualizzata, aggiorna l'input corrispondente.

#### Fase 6: Frontend - Dashboard e Integrazione (`frontend/index.html`, `frontend/app.js`)

1.  **`index.html`:**
    *   Link ai due moduli (es. `<a href="#" onclick="showModule('tabular')">Tabella</a>`, `<a href="#" onclick="showModule('contact')">Scheda</a>`).
    *   **Bottoni/Link per aprire i moduli in nuove finestre (es. `<a href="#" onclick="openModuleInNewWindow('tabular')">Apri Tabella in Nuova Finestra</a>`).**
    *   Div contenitori per i moduli nella finestra principale: `<div id="tabular-module-container" style="display:none;"></div>`, `<div id="contact-card-module-container" style="display:none;"></div>`.
2.  **`app.js`:**
    *   Funzione `showModule(moduleName)` per visualizzare il modulo corretto nella finestra principale.
    *   **Funzione `openModuleInNewWindow(moduleName)`:**
        *   Utilizza `window.open()` per aprire una nuova finestra (es. `module_loader.html?module=${moduleName}`).
        *   La nuova finestra (`module_loader.html`) conterrà la logica per caricare e inizializzare il modulo specificato.
    *   Inizializzazione della connessione WebSocket globale.
    *   **Gestione Comunicazione Cross-Window (es. tramite `localStorage` e/o `BroadcastChannel API`):**
        *   Quando una modifica viene originata localmente in una finestra, oltre a inviarla al backend via WebSocket, invia una notifica alle altre finestre aperte (es. scrivendo un item in `localStorage` con un timestamp).
        *   Ogni finestra ascolta gli eventi `storage` (per `localStorage`) o i messaggi del `BroadcastChannel`.
        *   Quando una finestra riceve una notifica di modifica da un'altra finestra, aggiorna la sua UI se sta visualizzando i dati impattati. Questo è un meccanismo di aggiornamento "locale" veloce.
        *   L'aggiornamento via WebSocket dal server rimane il meccanismo primario per la persistenza e la sincronizzazione tra diverse sessioni/browser o come fallback.
    *   Logica per caricare i moduli (istanziarli) sia nella finestra principale che nelle finestre figlie.
    *   **Le finestre figlie (`module_loader.html`) avranno un proprio `app_module.js` o una versione semplificata che:**
        *   Legge il tipo di modulo dai parametri URL.
        *   Inizializza il modulo corretto.
        *   Stabilisce la connessione WebSocket.
        *   Partecipa al meccanismo di comunicazione cross-window.

#### Fase 7: Test e Dimostrazione del PoC

1.  Apri `index.html` nel browser.
2.  **Scenario 1: Creazione e Modifica da Tabella (Finestra Principale e Secondaria)**
    *   Vai al modulo Tabella nella finestra principale.
    *   Aggiungi una colonna "Telefono".
    *   Aggiungi una riga (nuova entità). Inserisci valori per "Nome", "Cognome", "Telefono".
    *   **Apri il modulo Tabella in una nuova finestra del browser.** Verifica che la nuova entità e la colonna "Telefono" siano visibili e corrette.
    *   **Nella nuova finestra (Tabella), modifica il "Nome" dell'entità appena creata.** Verifica che il "Nome" si aggiorni istantaneamente nella tabella della finestra principale.
    *   Vai al modulo Scheda Contatto nella finestra principale. Seleziona l'entità. Verifica che i valori (incluso il "Nome" modificato dalla finestra secondaria) siano corretti.
    *   Modifica il "Telefono" nella Scheda Contatto (finestra principale).
    *   Torna al modulo Tabella (sia finestra principale che secondaria). Verifica che il "Telefono" sia aggiornato in entrambe.
3.  **Scenario 2: Modifica da Scheda (Finestra Principale e Secondaria)**
    *   Apri un'entità nella Scheda Contatto (finestra principale).
    *   **Apri la stessa entità (o il modulo Scheda Contatto che permette di selezionarla) in una nuova finestra.**
    *   Modifica un attributo nella finestra secondaria (Scheda). Verifica che si aggiorni nella finestra principale (Scheda).
    *   Vai al modulo Tabella (finestra principale o un'altra finestra ancora). Verifica che l'attributo sia aggiornato nella cella corrispondente.
4.  **Scenario 3: Interazione tra Moduli Diversi in Finestre Diverse**
    *   Apri il Modulo Tabellare in una finestra.
    *   Apri il Modulo Scheda Contatto in un'altra finestra, visualizzando un'entità presente nella tabella.
    *   Modifica un dato nella Scheda Contatto. Verifica l'aggiornamento nella Tabella.
    *   Modifica un dato nella Tabella. Verifica l'aggiornamento nella Scheda Contatto.

### Semplificazioni Chiave per l'MVP:

*   **Tipi di Entità:** Inizia con un solo tipo di entità (es. "Contact" o "GenericItem") per semplificare la gestione delle colonne/attributi nel modulo tabellare.
*   **Gestione Colonne/Attributi nel Tabellare:** Quando aggiungi una colonna, questa diventa un attributo disponibile per *tutte* le entità di quel tipo. Non gestire schemi diversi per singole entità all'interno della stessa tabella MVP.
*   **Reattività:**
    *   Per l'MVP, la notifica WebSocket può essere globale (tutti i client ricevono tutte le modifiche). I client filtrano poi se la modifica è rilevante per loro.
    *   **La comunicazione cross-window (es. `localStorage`) aiuterà a rendere gli aggiornamenti tra finestre dello stesso browser ancora più immediati, prima o in parallelo alla notifica WebSocket.**
*   **Error Handling:** Minimale, focus sulla "happy path".
*   **Sicurezza:** Non considerata per l'MVP.
*   **UI:** Estremamente basilare, come richiesto.
*   **Apertura Finestre:** L'MVP si concentrerà sul meccanismo di base. Non è necessario gestire layout complessi di finestre o persistenza dello stato delle finestre tra sessioni. 