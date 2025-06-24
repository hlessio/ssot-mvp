

**A Claude Code:** Questo è il documento definitivo. Contiene la specifica architetturale completa e un piano di test dettagliato. Esegui prima le fasi di implementazione e poi procedi con le verifiche descritte nella sezione Test.

## 1. Visione Architetturale Finale

L'architettura si basa su tre concetti chiave:

1. **Contratto Semantico Esteso:** Il backend fornisce dati e schemi auto-descrittivi, arricchiti con metadati per la UI. Questo è il "linguaggio" comune.
    
2. **Moduli come Istanze Operative:** L'interfaccia non è hard-coded. È composta da "Moduli" (es. una tabella, una griglia di schede) che vengono istanziati e configurati dinamicamente tramite entità ModuleInstance. La configurazione definisce su quali dati operare (target) e come operare (mode).
    
3. **Architettura Frontend a 3 Strati:**
    
    - **Servizi (API):** Wrapper "grezzi" per le chiamate API.
        
    - **Store (Traduzione/Stato):** Un "motore" che riceve una configurazione, carica i dati grezzi, li "traduce" in stato per la UI e gestisce la logica di business.
        
    - **Componenti (Presentazione):** Elementi Svelte "stupidi" che si adattano allo stato fornito dallo store.
        

Questo approccio disaccoppia completamente i dati dalla loro rappresentazione, permettendo una flessibilità e una scalabilità massime.

---

## 2. Implementazione (Raffinata)

Le fasi di implementazione sono state consolidate per maggiore chiarezza.

### Fase 1: Formalizzazione del Contratto Semantico (Backend)

**Obiettivo:** Il backend deve servire dati e schemi secondo il formato definito.

**Azioni:**

1. **Modifica schemaManager_evolved.js e le relative API:**
    
    - **Schema di Entità (/api/schema/entity/:entityType):** La risposta deve includere ui.displayLabel, ui.displayField a livello di entità e ui.label, ui.component per ogni attributo.
        
    - **Schema di Relazione (/api/schema/relation/:relationType):** La risposta deve includere ui.displayLabel e attributi con metadati ui.
        
2. **Crea lo Schema per ModuleInstance:** Nel file server.js (o dove inizializzi gli schemi base), definisci lo schema per l'entità ModuleInstance.
    
    Generated javascript
    
    ```
    // Esempio di definizione schema per ModuleInstance
    schemaManager.defineEntitySchema('ModuleInstance', {
        attributes: {
            instanceName: { type: 'string', required: true, ui: { label: 'Nome Modulo' } },
            templateId: { type: 'string', required: true, ui: { label: 'Template UI' } }, // Es. 'DynamicTable', 'CardGrid'
            targetEntityType: { type: 'string', required: true, ui: { label: 'Tipo Entità Target' } },
            mode: { type: 'string', defaultValue: 'list', ui: { label: 'Modalità Operativa' } }, // 'list', 'view', 'edit', 'create'
            configJSON: { type: 'string', ui: { label: 'Configurazione Specifica (JSON)' } } // Per filtri, ordinamenti, etc.
        }
    });
    ```
    
    content_copydownload
    
    Use code [with caution](https://support.google.com/legal/answer/13505487).JavaScript
    
3. **Crea API per ModuleInstance:** Assicurati di avere endpoint CRUD completi per /api/entities/ModuleInstance e /api/entity/:instanceId.
    

### Fase 2: Implementazione Strati Frontend (Servizi, Store, Componenti)

**Obiettivo:** Costruire i tre strati del frontend Svelte.

**Azioni:**

1. **Crea i Servizi API (src/frontend/svelte/api/):**
    
    - Implementa api/entity.js, api/schema.js, e l'esportazione aggregata api/index.js come da documento precedente. Includi una funzione getEntity(id) in entity.js per caricare le ModuleInstance.
        
2. **Crea lo Store Factory (src/frontend/svelte/stores/entityViewStore.js):**
    
    - Implementa createEntityViewStore(config) come specificato in precedenza. Deve accettare una configurazione dinamica (entityType, mode, filters).
        
    - **Focus sulla reattività:** Lo store deve essere il "cervello". L'azione loadData deve comportarsi diversamente a seconda della config.mode.
        
3. **Crea i Componenti di Presentazione:**
    
    - **Componenti Atomici (src/frontend/svelte/components/common/):**
        
        - StatusBadge.svelte
            
        - EditableCell.svelte
            
    - **Renderer Semantico (src/frontend/svelte/components/common/SemanticRenderer.svelte):**
        
        - Questo componente è cruciale. Utilizza la prop schema (che contiene schema.ui.component) per decidere dinamicamente quale componente atomico renderizzare.
            
    - **Template di Vista (src/frontend/svelte/components/modules/):**
        
        - DynamicTable.svelte: Deve essere un componente "template". Riceve una config via props, la usa per creare il suo entityViewStore e si renderizza in base allo stato $store. Deve adattare la sua UI (es. mostrare/nascondere bottoni "Aggiungi") in base a $store.config.mode.
            
    - **Contenitore Principale (src/frontend/svelte/components/ModuleContainer.svelte):**
        
        - È il componente orchestratore. Riceve un instanceId.
            
        - **Logica:**
            
            1. onMount: Chiama api.entity.getEntity(instanceId) per caricare la ModuleInstance.
                
            2. Estrae la configurazione dalla ModuleInstance (es. targetEntityType, mode, templateId, configJSON).
                
            3. Usa il templateId per selezionare dinamicamente quale componente template di vista renderizzare (es. DynamicTable).
                
            4. Passa la configurazione estratta come prop al componente di vista.
                

### Fase 3: Assemblaggio Finale e Pagina di Test

**Obiettivo:** Integrare e verificare il sistema in una pagina dedicata.

**Azioni:**

1. **Pre-popola il DB:** Assicurati che il backend, all'avvio, crei almeno:
    
    - Un'entità Persona.
        
    - Un'entità ModuleInstance che punti a entityType: 'Persona' e templateId: 'DynamicTable'.
        
2. **Crea la Pagina di Test (src/frontend/views/semantic-platform-demo.html).**
    
3. **Modifica App.svelte** per usare ModuleContainer, passandogli l'ID della ModuleInstance pre-popolata.
    
4. **Verifica il flusso end-to-end:**
    
    - ModuleContainer carica ModuleInstance.
        
    - ModuleContainer renderizza DynamicTable.
        
    - DynamicTable crea il suo entityViewStore con la configurazione ricevuta.
        
    - entityViewStore chiama i servizi API per caricare schema e dati di Persona.
        
    - La tabella si popola, usando SemanticRenderer per ogni cella.
        

---

## 3. Piano di Test Granulare e Atomico (CRUD Check)

**Obiettivo:** Verificare che ogni "atomo" informativo del sistema sia gestibile tramite operazioni CRUD complete attraverso l'interfaccia dinamica. Questo piano di test deve essere eseguito dopo l'implementazione delle fasi precedenti.

**Setup per i Test:**

- Utilizza la pagina semantic-platform-demo.html.
    
- Apri la console del browser per monitorare le chiamate API e i log.
    

### Test 1: Operazioni CRUD su Entità (Persona)

**Contesto:** Il modulo DynamicTable visualizza le entità Persona.

- **CREATE:**
    
    - **Azione:** Clicca il bottone "[+] Aggiungi Nuovo" nella tabella Persona.
        
    - **Aspettativa:**
        
        1. Appare una nuova riga vuota nella tabella, pronta per l'input.
            
        2. Nella console di rete, **NON** deve partire subito una chiamata POST /api/entities.
            
    - **Azione:** Compila i campi della nuova riga e premi "Invio" o clicca "Salva".
        
    - **Aspettativa:**
        
        1. Nella console di rete, viene eseguita una POST /api/entities con entityType: 'Persona' e i dati inseriti.
            
        2. La riga nella UI riceve l'ID restituito dal server e diventa non più "nuova".
            
- **READ:**
    
    - **Azione:** Carica la pagina.
        
    - **Aspettativa:**
        
        1. Viene eseguita una GET /api/entities/Persona.
            
        2. La tabella si popola con i dati delle entità Persona esistenti.
            
- **UPDATE:**
    
    - **Azione:** Clicca su una cella (es. il nome di una Persona) e modificala. Clicca fuori o premi Invio.
        
    - **Aspettativa:**
        
        1. Viene eseguita una PUT /api/entity/:entityId/attribute con il nuovo valore.
            
        2. La UI riflette immediatamente la modifica (aggiornamento ottimistico).
            
- **DELETE:**
    
    - **Azione:** Aggiungi un'icona "cestino" per ogni riga. Clicca sull'icona.
        
    - **Aspettativa:**
        
        1. Appare un popup di conferma (confirm()).
            
        2. Alla conferma, viene eseguita una DELETE /api/entity/:entityId.
            
        3. La riga scompare dalla UI.
            

### Test 2: Operazioni CRUD su Attributi di Schema (Evoluzione Schema)

**Contesto:** Il modulo DynamicTable permette di modificare la sua stessa struttura.

- **CREATE (Aggiungi Colonna):**
    
    - **Azione:** Clicca un bottone "[+] Aggiungi Colonna".
        
    - **Aspettativa:** Appare un modale che chiede "Nome attributo" e "Tipo".
        
    - **Azione:** Inserisci cognome (tipo string) e conferma.
        
    - **Aspettativa:**
        
        1. Viene eseguita una PUT /api/schema/entity/Persona per aggiungere il nuovo attributo.
            
        2. La tabella si ri-renderizza aggiungendo la nuova colonna "cognome" per tutte le righe (con valore vuoto).
            
- **READ (Visualizzazione Schema):**
    
    - **Azione:** Carica la pagina.
        
    - **Aspettativa:**
        
        1. Viene eseguita una GET /api/schema/entity/Persona.
            
        2. Le intestazioni della tabella (<th>) corrispondono esattamente agli attributi definiti nello schema.
            
- **UPDATE (Modifica Attributo Schema):**
    
    - **Azione:** Aggiungi un'icona "matita" su ogni intestazione di colonna. Cliccala.
        
    - **Aspettativa:** Appare un modale per modificare le proprietà dell'attributo (es. ui.label).
        
    - **Azione:** Cambia l'etichetta di nome in "Nome e Cognome" e salva.
        
    - **Aspettativa:**
        
        1. Viene eseguita una PUT /api/schema/entity/Persona con la modifica.
            
        2. L'intestazione della colonna nella UI si aggiorna in "Nome e Cognome".
            
- **DELETE (Rimuovi Attributo Schema):**
    
    - Nota: Questa operazione è distruttiva e spesso non implementata. Se implementata:
        
    - **Azione:** Clicca un'icona "cestino" sull'intestazione di una colonna.
        
    - **Aspettativa:**
        
        1. Viene eseguita una PUT /api/schema/entity/Persona per rimuovere l'attributo.
            
        2. La colonna scompare dalla tabella.
            

### Test 3: Operazioni CRUD su ModuleInstance

**Contesto:** Una pagina "Dashboard" (da creare o simulare) permette di gestire i moduli.

- **CREATE:**
    
    - **Azione:** In una pagina dashboard, compila un form per creare un nuovo modulo (Nome: "Task List", Template: "DynamicTable", Tipo Entità: "Task").
        
    - **Aspettativa:**
        
        1. Viene eseguita una POST /api/entities con entityType: 'ModuleInstance' e i dati del form.
            
        2. Il nuovo modulo appare nella lista dei moduli disponibili sulla dashboard.
            
- **READ:**
    
    - **Azione:** Apri la pagina dashboard.
        
    - **Aspettativa:**
        
        1. Viene eseguita una GET /api/entities/ModuleInstance.
            
        2. La lista dei moduli si popola con le istanze esistenti.
            
- **UPDATE:**
    
    - **Azione:** Sulla dashboard, clicca "Modifica" su un'istanza e cambia il suo nome.
        
    - **Aspettativa:**
        
        1. Viene eseguita una PUT /api/entity/:instanceId/attribute per l'attributo instanceName.
            
        2. Il nome nella UI della dashboard si aggiorna.
            
- **DELETE:**
    
    - **Azione:** Sulla dashboard, clicca "Elimina" su un'istanza.
        
    - **Aspettativa:**
        
        1. Viene eseguita una DELETE /api/entity/:instanceId.
            
        2. L'istanza scompare dalla lista sulla dashboard.
            

Completando questo piano di test, avrai validato che ogni componente fondamentale del tuo sistema SSOT è manipolabile attraverso l'interfaccia dinamica che hai costruito, confermando la robustezza e la completezza dell'architettura.