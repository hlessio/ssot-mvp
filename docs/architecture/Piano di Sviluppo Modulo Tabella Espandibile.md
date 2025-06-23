### **Piano di Sviluppo: Modulo Tabella Espandibile**

**Obiettivo:** Creare un modulo table-module completamente dinamico ed espandibile che funga da "entità modulo". Questo modulo potrà visualizzare e modificare collezioni di entità, aggiungendo colonne per gli attributi in modo dinamico e permettendo la creazione di nuovi attributi contestuali (relazioni).

**Principi Architettonici Chiave:**

1. **Sfruttare l'Auto-Discovery:** L'aggiunta di nuove colonne per attributi inesistenti si baserà sulla capacità di Entity.js di creare attributi al volo (setAttribute).
    
2. **Reattività Totale:** Ogni modifica a una cella aggiornerà l'Entity sottostante, e le modifiche verranno propagate a tutti gli altri moduli tramite AttributeSpace.
    
3. **Component-driven:** La logica complessa del modulo sarà incapsulata in una classe JavaScript dedicata (TableModule.js), mentre la definizione .mod.json rimarrà semplice e strutturale.
    
4. **Istanza come Contesto:** Ogni istanza del modulo tabella (ModuleInstance) rappresenta un contesto unico. I nuovi attributi "relazionali" creati saranno legati a questa istanza.
    

---

### **Fasi di Implementazione**

#### **Fase 1: Struttura di Base del Modulo Tabella**

L'obiettivo di questa fase è creare il guscio del modulo e la sua logica di base, senza ancora implementare la dinamicità.

1. **File da creare:** mvp-dynamic-docs/modules/table-module.mod.json
    
    - Questo file definirà la struttura statica del modulo. Non avrà slots predefiniti, poiché saranno gestiti dinamicamente dal JavaScript.
        
    
    Generated json
    
    ```
    {
      "module_id": "table-module",
      "version": "1.0.0",
      "metadata": {
        "name": "Tabella Espandibile",
        "description": "Un modulo tabellare per visualizzare e modificare collezioni di entità in modo dinamico.",
        "category": "Utility",
        "author": "MVP System"
      },
      "slots": {
        "module_name": {
          "path": "System.ModuleName",
          "type": "text",
          "editable": true,
          "label": "Nome del Modulo Tabella"
        }
      },
      "layout": {
        "type": "custom",
        "elements": [
          {
            "element": "div",
            "attributes": { "class": "table-module-header" },
            "children": [
              {
                "element": "input",
                "attributes": { 
                  "type": "text", 
                  "class": "module-name-input",
                  "placeholder": "Inserisci un nome per questa tabella..."
                },
                "slot": "module_name"
              }
            ]
          },
          {
            "element": "div",
            "attributes": { 
              "class": "table-container",
              "data-table-module": "true" 
            },
            "children": [
              {
                "element": "table",
                "attributes": { "class": "dynamic-table" },
                "children": [
                  { "element": "thead", "attributes": { "class": "dynamic-table-header" } },
                  { "element": "tbody", "attributes": { "class": "dynamic-table-body" } }
                ]
              }
            ]
          }
        ]
      },
      "styling": {
        "theme": "minimal",
        "custom": "/* CSS per la tabella verrà aggiunto qui */"
      },
      "behavior": {
        "script": "TableModule.js"
      }
    }
    ```
    
    content_copydownload
    
    Use code [with caution](https://support.google.com/legal/answer/13505487).Json
    
2. **File da creare:** mvp-dynamic-docs/modules/js/TableModule.js
    
    - Questa sarà la classe che gestirà tutta la logica dinamica del modulo.
        
    
    Generated javascript
    
    ```
    class TableModule {
        constructor(container, moduleInstance) {
            this.container = container;
            this.moduleInstance = moduleInstance; // Sarà cruciale per la persistenza
            this.table = container.querySelector('.dynamic-table');
            this.thead = container.querySelector('.dynamic-table-header');
            this.tbody = container.querySelector('.dynamic-table-body');
            
            this.entityManager = window.entityManager;
            this.attributeSpace = window.attributeSpace;
    
            this.selectedEntityType = null;
            this.columns = []; // Array di stringhe con i nomi degli attributi
            this.entities = []; // Array di oggetti Entity
    
            this.initialize();
        }
    
        initialize() {
            console.log(`TableModule inizializzato per l'istanza: ${this.moduleInstance.instanceId}`);
            this.renderInitialState();
        }
    
        renderInitialState() {
            this.thead.innerHTML = '';
            this.tbody.innerHTML = '';
    
            const headerRow = this.thead.insertRow();
            const cell = headerRow.insertCell();
            cell.classList.add('header-cell', 'type-selector-cell');
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Cerca e seleziona un tipo di entità...';
            input.classList.add('type-selector-input');
            
            // Logica di selezione tipo andrà qui (Fase 2)
            input.addEventListener('change', (e) => this.handleTypeSelected(e.target.value));
            
            cell.appendChild(input);
        }
    
        handleTypeSelected(entityType) {
            // Logica da implementare nella Fase 2
            this.selectedEntityType = entityType;
            console.log(`Tipo di entità selezionato: ${this.selectedEntityType}`);
            // Qui partirà il rendering della tabella popolata
        }
    }
    ```
    
    content_copydownload
    
    Use code [with caution](https://support.google.com/legal/answer/13505487).JavaScript
    
3. **File da modificare:** mvp-dynamic-docs/core/module/ModuleCompiler.js
    
    - Assicurati che il compilatore possa caricare e associare uno script esterno definito nella sezione behavior.
        
    
    **Logica da implementare (o verificare):**
    
    - Nel metodo compile, dopo aver generato HTML e CSS, controlla moduleDefinition.behavior.script.
        
    - Se presente, il JS generato dovrà caricare dinamicamente questo script e istanziare la classe principale (es. new TableModule(container, moduleInstance)). L'infrastruttura per questo sembra già parzialmente presente.
        

---

#### **Fase 2: Selezione del Tipo di Entità e Popolamento Iniziale**

L'obiettivo è implementare la logica per selezionare un tipo di entità e visualizzare la tabella con le entità esistenti e i controlli per aggiungere colonne/righe.

1. **File da modificare:** mvp-dynamic-docs/modules/js/TableModule.js
    
    **Logica da implementare:**
    
    - **Migliorare renderInitialState:** Invece di un semplice input, integra un componente di autocompletamento per i tipi di entità. Puoi creare un TypeSelector o adattare EntitySelector.js. Per ora, un input va bene per il test.
        
    - **Implementare handleTypeSelected(entityType):**
        
        1. Salva entityType nello stato dell'istanza: this.moduleInstance.updateState({ entityType: entityType });
            
        2. Recupera tutte le entità di quel tipo: this.entities = this.entityManager.getEntitiesByType(entityType);
            
        3. Chiama un nuovo metodo renderTable().
            
    - **Creare renderTable():**
        
        1. Pulisci thead e tbody.
            
        2. Chiama renderHeader().
            
        3. Itera su this.entities e per ogni entità chiama renderRow(entity).
            
        4. Chiama renderAddRowControl().
            
    - **Creare renderHeader():**
        
        1. Crea la prima cella <th> con il nome del tipo di entità e un controllo per aggiungere colonne (es. un + o un input).
            
    - **Creare renderRow(entity):**
        
        1. Crea un <tr> per l'entità.
            
        2. Per ora, crea solo una cella <td> con l'ID o un attributo principale dell'entità (es. nome).
            
        3. Aggiungi il <tr> al tbody.
            
    - **Creare renderAddRowControl():**
        
        1. Aggiungi una riga finale al tbody con un pulsante + per creare una nuova entità.
            
        2. L'evento click chiamerà addNewEntity().
            
    - **Creare addNewEntity():**
        
        1. Usa this.entityManager.createEntity(this.selectedEntityType, null, {}).
            
        2. Una volta creata l'entità, aggiungila a this.entities e chiama renderRow() per visualizzarla.
            

---

#### **Fase 3: Aggiunta Dinamica di Colonne**

Questa fase implementa la funzionalità chiave di espandere la tabella con nuove colonne per gli attributi.

1. **File da modificare:** mvp-dynamic-docs/modules/js/TableModule.js
    
    **Logica da implementare:**
    
    - **Migliorare renderHeader():**
        
        1. Dopo la prima cella (tipo entità), aggiungi un <th> con un input di autocompletamento per gli attributi.
            
        2. L'autocomplete deve suggerire gli attributi disponibili per this.selectedEntityType. Puoi ottenere questa lista interrogando AttributeSpace o analizzando gli attributi delle entità già caricate.
            
        3. Quando un attributo viene selezionato, chiama addColumn(attributeName).
            
    - **Creare addColumn(attributeName):**
        
        1. Se l'attributo è già presente in this.columns, non fare nulla.
            
        2. Aggiungi attributeName a this.columns.
            
        3. Salva la lista di colonne nello stato dell'istanza: this.moduleInstance.updateState({ columns: this.columns });
            
        4. **Aggiorna l'header:** Inserisci un nuovo <th> con attributeName prima della cella di controllo.
            
        5. **Aggiorna tutte le righe esistenti:** Itera sui <tr> del tbody e per ognuno:
            
            - Recupera l'entità associata alla riga (dovrai salvarla nel <tr> con tr.dataset.entityId).
                
            - Chiama addCellToRow(tr, entity, attributeName).
                
    - **Creare addCellToRow(rowElement, entity, attributeName):**
        
        1. Crea un nuovo <td>.
            
        2. Crea un <input> o un <div> (se non editabile) al suo interno.
            
        3. **Binding Dati (Cruciale):**
            
            - Imposta il valore iniziale: input.value = entity.getAttributeValue(attributeName, '');
                
            - Aggiungi un event listener (input o blur) all'input: input.addEventListener('input', e => entity.setAttribute(attributeName, e.target.value));
                
            - **Sottoscrivi agli aggiornamenti:** Usa this.attributeSpace.subscribe(entity.id, attributeName, (newValue) => { input.value = newValue; }); per la reattività.
                
        4. Aggiungi la cella alla riga.
            

---

#### **Fase 4: Creazione di Nuovi Attributi (Relazioni)**

Questa fase implementa la logica avanzata per creare attributi che non esistono, rappresentando una relazione tra l'entità e l'istanza del modulo.

1. **File da modificare:** mvp-dynamic-docs/modules/js/TableModule.js
    
    **Logica da implementare:**
    
    - **Migliorare l'autocomplete degli attributi:**
        
        1. Se il testo inserito non corrisponde a nessun attributo esistente, mostra l'opzione "Crea nuovo attributo: [testo_inserito]".
            
        2. Se l'utente seleziona questa opzione, chiama addColumn(attributeName, { isNew: true }).
            
    - **Aggiornare addColumn(attributeName, options = {}):**
        
        1. La logica è quasi la stessa della Fase 3. La differenza sta nel modo in cui l'attributo viene trattato.
            
        2. L'auto-discovery di Entity.js gestirà la creazione automatica. Quando entity.setAttribute(newAttributeName, ...) viene chiamato per la prima volta su un'entità, l'attributo verrà creato.
            
        3. **Contestualizzazione (la "Relazione"):** Per distinguere questi attributi, possiamo aggiungere metadati specifici. Modifica il listener dell'input nella funzione addCellToRow.
            
    - **Migliorare addCellToRow:**
        
        - Quando crei la cella per un nuovo attributo, modifica la logica di binding:
            
        
        Generated javascript
        
        ```
        // Dentro addCellToRow, quando si binda l'evento
        input.addEventListener('input', e => {
            const metadata = {};
            if (isNewAttribute) { // 'isNewAttribute' è un flag passato alla funzione
                metadata.source = `table-module:${this.moduleInstance.instanceId}`;
                metadata.createdBy = 'user';
                metadata.context = 'Definito nella tabella ' + this.container.querySelector('.module-name-input').value;
            }
            // L'API di setAttribute dovrebbe accettare un terzo/quarto parametro per i metadati
            entity.setAttribute(attributeName, e.target.value, 'text', metadata); 
        });
        ```
        
        content_copydownload
        
        Use code [with caution](https://support.google.com/legal/answer/13505487).JavaScript
        
2. **File da modificare (potrebbe essere necessario):** mvp-dynamic-docs/core/entity/Entity.js
    
    - Verifica che il metodo setAttribute accetti correttamente i metadati e li passi al costruttore di Attribute. La struttura attuale sembra già predisposta.
        
    
    Generated javascript
    
    ```
    // In Entity.js - setAttribute (verifica che sia così)
    setAttribute(name, value, type = 'text', metadata = {}) {
        let attribute = this.attributes.get(name);
        // ...
        if (!attribute) {
            // Qui passiamo i metadati al costruttore di Attribute
            attribute = new window.Attribute(name, null, type, { ...metadata, source: 'entity' });
            this.attributes.set(name, attribute);
            // ...
        }
        // ...
    }
    ```
    
    content_copydownload
    
    Use code [with caution](https://support.google.com/legal/answer/13505487).JavaScript
    

### **Considerazioni Finali e Test**

- **Persistenza:** Lo stato della tabella (tipo di entità selezionato, colonne visibili) deve essere salvato in ModuleInstance.state e ricaricato all'inizializzazione del modulo.
    
- **Performance:** Per tabelle molto grandi, considera il rendering virtualizzato (visualizzare solo le righe visibili). Per l'MVP, non è necessario.
    
- **UI/UX:** Cura l'interfaccia per l'aggiunta di colonne e righe, rendendola intuitiva. Usa icone e placeholder chiari.
    
- **Testing:**
    
    1. Testa la creazione di una tabella per un tipo di entità esistente (Cliente).
        
    2. Verifica che le entità vengano caricate correttamente.
        
    3. Aggiungi una colonna per un attributo esistente (email) e verifica che i valori appaiano.
        
    4. Modifica un valore in una cella e apri un contact-card per la stessa entità per verificare la reattività.
        
    5. Aggiungi una nuova riga e verifica che una nuova entità venga creata e salvata.
        
    6. **Testa il caso "relazione":** crea una nuova colonna per un attributo inesistente (es. "priorità_contatto"). Inserisci valori. Verifica tramite debug che l'attributo sia stato aggiunto alle entità con i metadati corretti.