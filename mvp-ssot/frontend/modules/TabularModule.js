/**
 * TabularModule.js - Modulo Tabellare per MVP SSOT Dinamico
 * 
 * Questo modulo implementa la visualizzazione tabellare delle entità come specificato nella Fase 4 del manuale.
 * Caratteristiche:
 * - Visualizza entità come righe e attributi come colonne
 * - Supporta l'aggiunta di nuove righe (entità) e colonne (attributi)
 * - Celle editabili con propagazione delle modifiche via WebSocket
 * - Sottoscrizione agli aggiornamenti in tempo reale
 */

class TabularModule {
    constructor() {
        // Leggi il tipo di entità dai parametri URL (per finestre separate) o usa default
        const urlParams = new URLSearchParams(window.location.search);
        this.entityType = urlParams.get('entityType') || 'TestEvoluzione'; // Test dell'evoluzione schema
        this.entities = [];
        this.attributes = [];
        this.websocket = null;
        this.isUpdatingCell = false; // Flag per evitare loop di aggiornamento
        
        // Solo inizializza se gli elementi DOM sono disponibili
        if (document.getElementById('btn-add-row')) {
            this.initializeElements();
            this.attachEventListeners();
        }
    }

    // Metodo di inizializzazione esplicito
    async init() {
        if (!this.btnAddRow) {
            this.initializeElements();
            this.attachEventListeners();
        }
        await this.loadData();
    }

    initializeElements() {
        // Elementi DOM della tabella
        this.tableElement = document.getElementById('entities-table');
        this.tableHeader = document.getElementById('table-header');
        this.tableBody = document.getElementById('table-body');
        
        // Pulsanti di controllo
        this.btnAddRow = document.getElementById('btn-add-row');
        this.btnAddColumn = document.getElementById('btn-add-column');
        this.btnRefreshTable = document.getElementById('btn-refresh-table');
    }

    attachEventListeners() {
        // Event listeners per i pulsanti
        this.btnAddRow.addEventListener('click', () => this.addNewEntity());
        this.btnAddColumn.addEventListener('click', () => this.addNewAttribute());
        this.btnRefreshTable.addEventListener('click', () => this.refreshData());
    }

    setWebSocket(ws) {
        this.websocket = ws;
    }

    // Caricamento iniziale dei dati
    async loadData() {
        try {
            this.debugLog('Caricamento dati tabellari...', 'info');
            
            // Carica entità e attributi in parallelo
            const [entitiesResponse, attributesResponse] = await Promise.all([
                this.fetchEntities(),
                this.fetchAttributes()
            ]);

            if (entitiesResponse.success && attributesResponse.success) {
                this.entities = entitiesResponse.data;
                this.attributes = attributesResponse.data;
                this.renderTable();
                this.debugLog(`Caricati ${this.entities.length} entità e ${this.attributes.length} attributi`, 'success');
            } else {
                throw new Error('Errore nel caricamento dei dati');
            }
        } catch (error) {
            this.debugLog(`Errore nel caricamento: ${error.message}`, 'error');
            console.error('Errore nel caricamento dati tabellari:', error);
        }
    }

    // Fetch delle entità dal backend
    async fetchEntities() {
        const response = await fetch(`/api/entities/${this.entityType}`);
        return await response.json();
    }

    // Fetch degli attributi dal backend (aggiornato per API evolute)
    async fetchAttributes() {
        try {
            // Prima prova a recuperare lo schema evoluto
            const response = await fetch(`/api/schema/entity/${this.entityType}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.attributes) {
                    // Estrai solo i nomi degli attributi dal nuovo formato schema
                    return { 
                        success: true, 
                        data: result.data.attributes.map(attr => attr.name) 
                    };
                }
            }
            
            // Fallback all'endpoint MVP se lo schema evoluto non esiste
            const fallbackResponse = await fetch(`/api/schema/${this.entityType}/attributes`);
            return await fallbackResponse.json();
        } catch (error) {
            console.warn('Errore nel recupero attributi, usando lista vuota:', error);
            return { success: true, data: [] };
        }
    }

    // Rendering della tabella
    renderTable() {
        this.renderTableHeader();
        this.renderTableBody();
    }

    // Rendering dell'header della tabella
    renderTableHeader() {
        // Pulisci header esistente
        this.tableHeader.innerHTML = '<th>ID</th>';
        
        // Aggiungi colonne per ogni attributo
        this.attributes.forEach(attribute => {
            const th = document.createElement('th');
            th.textContent = attribute;
            th.dataset.attribute = attribute;
            this.tableHeader.appendChild(th);
        });
    }

    // Rendering del corpo della tabella
    renderTableBody() {
        // Pulisci corpo esistente
        this.tableBody.innerHTML = '';
        
        // Aggiungi riga per ogni entità
        this.entities.forEach(entity => {
            this.addEntityRow(entity);
        });
    }

    // Aggiunge una riga per un'entità
    addEntityRow(entity) {
        const row = document.createElement('tr');
        row.dataset.entityId = entity.id;
        
        // Colonna ID (non editabile)
        const idCell = document.createElement('td');
        idCell.textContent = entity.id.substring(0, 8) + '...'; // Mostra solo parte dell'ID
        idCell.classList.add('id-cell');
        row.appendChild(idCell);
        
        // Colonne attributi (editabili)
        this.attributes.forEach(attribute => {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            
            input.type = 'text';
            input.classList.add('cell-input');
            input.value = entity[attribute] || '';
            input.dataset.entityId = entity.id;
            input.dataset.attributeName = attribute;
            
            // Event listeners per l'editing
            input.addEventListener('blur', (e) => this.handleCellEdit(e));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
            
            cell.appendChild(input);
            row.appendChild(cell);
        });
        
        this.tableBody.appendChild(row);
    }

    // Gestisce l'editing di una cella
    async handleCellEdit(event) {
        if (this.isUpdatingCell) return; // Evita loop di aggiornamento
        
        const input = event.target;
        const entityId = input.dataset.entityId;
        const attributeName = input.dataset.attributeName;
        const newValue = input.value.trim();
        
        // Trova l'entità corrente e controlla se il valore è cambiato
        const entity = this.entities.find(e => e.id === entityId);
        const oldValue = entity ? entity[attributeName] : '';
        
        if (newValue === oldValue) return; // Nessun cambiamento
        
        try {
            // Marca l'input come in modifica
            input.classList.add('modified');
            this.debugLog(`Aggiornamento ${attributeName} per entità ${entityId}: "${oldValue}" -> "${newValue}"`, 'info');
            
            // Invia l'aggiornamento al backend
            const response = await fetch(`/api/entity/${entityId}/attribute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    attributeName: attributeName,
                    value: newValue
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Aggiorna l'entità locale
                if (entity) {
                    entity[attributeName] = newValue;
                }
                
                // Notifica l'aggiornamento per propagazione cross-window
                this.notifyEntityUpdate(entityId, attributeName, newValue);
                
                // Rimuovi l'indicatore di modifica
                setTimeout(() => {
                    input.classList.remove('modified');
                }, 1000);
                
                this.debugLog(`Attributo aggiornato con successo`, 'success');
            } else {
                throw new Error(result.error || 'Errore nell\'aggiornamento');
            }
        } catch (error) {
            this.debugLog(`Errore nell'aggiornamento: ${error.message}`, 'error');
            console.error('Errore nell\'aggiornamento attributo:', error);
            
            // Ripristina il valore precedente
            input.value = oldValue;
            input.classList.remove('modified');
        }
    }

    // Aggiunge una nuova entità (riga)
    async addNewEntity() {
        const entityName = prompt(`Inserisci un nome per la nuova entità ${this.entityType}:`);
        if (!entityName) return;
        
        try {
            this.debugLog(`Creazione nuova entità: ${entityName}`, 'info');
            
            const response = await fetch('/api/entities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityType: this.entityType,
                    initialData: {
                        nome: entityName // Attributo di default
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Aggiungi l'entità alla lista locale
                this.entities.push(result.data);
                
                // Assicurati che 'nome' sia negli attributi
                if (!this.attributes.includes('nome')) {
                    this.attributes.push('nome');
                    this.renderTableHeader();
                }
                
                // Aggiungi la riga alla tabella
                this.addEntityRow(result.data);
                
                this.debugLog(`Entità creata con successo: ${result.data.id}`, 'success');
            } else {
                throw new Error(result.error || 'Errore nella creazione');
            }
        } catch (error) {
            this.debugLog(`Errore nella creazione entità: ${error.message}`, 'error');
            console.error('Errore nella creazione entità:', error);
        }
    }

    // Aggiunge un nuovo attributo (colonna) - aggiornato per API evolute
    async addNewAttribute() {
        const attributeName = prompt('Inserisci il nome del nuovo attributo:');
        if (!attributeName || this.attributes.includes(attributeName)) {
            if (this.attributes.includes(attributeName)) {
                alert('Attributo già esistente!');
            }
            return;
        }
        
        try {
            this.debugLog(`Aggiunta nuovo attributo: ${attributeName}`, 'info');
            
            // Prima verifica se esiste uno schema evoluto
            let schemaResponse = await fetch(`/api/schema/entity/${this.entityType}`);
            
            if (!schemaResponse.ok) {
                // Schema evoluto non esiste - crea un nuovo schema
                const newSchema = {
                    mode: 'flexible',
                    attributes: {}
                };
                
                // Aggiungi tutti gli attributi esistenti + il nuovo
                [...this.attributes, attributeName].forEach(attr => {
                    newSchema.attributes[attr] = {
                        type: 'string',
                        required: false,
                        description: `Attributo ${attr}`
                    };
                });
                
                const createResponse = await fetch(`/api/schema/entity/${this.entityType}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSchema)
                });
                
                const createResult = await createResponse.json();
                if (!createResult.success) {
                    throw new Error(createResult.error || 'Errore nella creazione schema');
                }
                
                this.debugLog(`Nuovo schema creato per ${this.entityType}`, 'success');
            } else {
                // Schema evoluto esiste - evolvi lo schema aggiungendo il nuovo attributo
                this.debugLog(`Evoluzione schema ${this.entityType} con nuovo attributo ${attributeName}`, 'info');
                
                const evolutionData = {
                    addAttributes: {
                        [attributeName]: {
                            type: 'string',
                            required: false,
                            description: `Attributo ${attributeName}`
                        }
                    }
                };
                
                const evolutionResponse = await fetch(`/api/schema/entity/${this.entityType}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(evolutionData)
                });
                
                const evolutionResult = await evolutionResponse.json();
                if (!evolutionResult.success) {
                    throw new Error(evolutionResult.error || 'Errore nell\'evoluzione schema');
                }
                
                this.debugLog(`Schema evoluto con successo per ${this.entityType}`, 'success');
            }
            
            // Aggiungi l'attributo alla lista locale
            this.attributes.push(attributeName);
            
            // Re-renderizza la tabella per includere la nuova colonna
            this.renderTable();
            
            // Notifica l'aggiornamento della struttura per le altre finestre
            this.notifySchemaUpdate(attributeName);
            
            this.debugLog(`Attributo aggiunto con successo: ${attributeName}`, 'success');
            
        } catch (error) {
            this.debugLog(`Errore nell'aggiunta attributo: ${error.message}`, 'error');
            console.error('Errore nell\'aggiunta attributo:', error);
        }
    }

    // Notifica aggiornamenti dello schema (per cross-window communication)
    notifySchemaUpdate(attributeName) {
        this.debugLog(`Notifica aggiornamento schema: nuovo attributo ${attributeName}`, 'info');
        
        const message = {
            type: 'schema-update',
            entityType: this.entityType,
            newAttribute: attributeName,
            timestamp: Date.now(),
            source: window.mvpApp ? 'main-window' : 'child-window'
        };
        
        // Se siamo nella finestra principale
        if (window.mvpApp && window.mvpApp.crossWindowChannel) {
            window.mvpApp.crossWindowChannel.postMessage(message);
        }
        // Se siamo in una finestra separata e abbiamo accesso al manager
        else if (window.moduleWindowManager && window.moduleWindowManager.crossWindowChannel) {
            window.moduleWindowManager.crossWindowChannel.postMessage(message);
        }
        // Fallback localStorage per compatibilità
        else {
            localStorage.setItem('ssot-schema-sync', JSON.stringify(message));
            setTimeout(() => localStorage.removeItem('ssot-schema-sync'), 10);
        }
    }

    // Aggiorna i dati dalla fonte
    async refreshData() {
        this.debugLog('Aggiornamento dati...', 'info');
        await this.loadData();
    }

    // Gestisce le notifiche WebSocket di cambiamento attributi
    handleAttributeChange(changeData) {
        if (this.isUpdatingCell) return; // Evita loop
        
        const { entityId, attributeName, newValue } = changeData;
        
        this.debugLog(`Ricevuto aggiornamento WebSocket: ${attributeName} = "${newValue}" per entità ${entityId}`, 'info');
        
        // Trova l'input corrispondente nella tabella
        const input = document.querySelector(
            `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
        );
        
        if (input && input !== document.activeElement) { // Non aggiornare se l'utente sta editando
            this.isUpdatingCell = true;
            input.value = newValue;
            input.classList.add('modified');
            
            // Aggiorna l'entità locale
            const entity = this.entities.find(e => e.id === entityId);
            if (entity) {
                entity[attributeName] = newValue;
            }
            
            // Rimuovi l'indicatore dopo un breve periodo
            setTimeout(() => {
                input.classList.remove('modified');
                this.isUpdatingCell = false;
            }, 1000);
        }
    }

    // Gestisce aggiornamenti esterni (cross-window communication)
    handleExternalUpdate(entityId, attributeName, newValue) {
        if (this.isUpdatingCell) return; // Evita loop
        
        this.debugLog(`Ricevuto aggiornamento cross-window: ${attributeName} = "${newValue}" per entità ${entityId}`, 'info');
        
        // Trova l'input corrispondente nella tabella
        const input = document.querySelector(
            `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
        );
        
        if (input && input !== document.activeElement) { // Non aggiornare se l'utente sta editando
            this.isUpdatingCell = true;
            input.value = newValue;
            input.classList.add('modified');
            
            // Aggiorna l'entità locale
            const entity = this.entities.find(e => e.id === entityId);
            if (entity) {
                entity[attributeName] = newValue;
            }
            
            // Rimuovi l'indicatore dopo un breve periodo
            setTimeout(() => {
                input.classList.remove('modified');
                this.isUpdatingCell = false;
            }, 1000);
        }
    }

    // Notifica aggiornamenti di entità (usato per propagazione cross-window)
    notifyEntityUpdate(entityId, attributeName, newValue) {
        // Questo metodo viene sovrascritto dalla finestra principale o dalle finestre figlie
        // per implementare la comunicazione cross-window
        this.debugLog(`Notifica aggiornamento entità: ${entityId}:${attributeName} = ${newValue}`, 'info');
        
        // Se siamo nella finestra principale, propaga ai moduli e alle altre finestre
        if (window.mvpApp && window.mvpApp.broadcastToOtherWindows) {
            window.mvpApp.broadcastToOtherWindows(entityId, attributeName, newValue);
        }
    }

    // Gestisce aggiornamenti di schema da altre finestre
    async handleSchemaUpdate(updateData) {
        if (updateData.entityType !== this.entityType) return; // Non è per il nostro tipo di entità
        
        this.debugLog(`Ricevuto aggiornamento schema: nuovo attributo ${updateData.newAttribute}`, 'info');
        
        // Aggiungi l'attributo se non esiste già
        if (!this.attributes.includes(updateData.newAttribute)) {
            this.attributes.push(updateData.newAttribute);
            
            // Re-renderizza la tabella per mostrare la nuova colonna
            this.renderTable();
            
            this.debugLog(`Schema aggiornato localmente con attributo: ${updateData.newAttribute}`, 'success');
        }
    }

    // Utility per debug logging
    debugLog(message, type = 'info') {
        const debugMessages = document.getElementById('debug-messages');
        if (debugMessages) {
            const p = document.createElement('p');
            p.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> <span class="${type}">[TABELLARE]</span> ${message}`;
            debugMessages.appendChild(p);
            debugMessages.scrollTop = debugMessages.scrollHeight;
        }
    }
}

// Istanza globale del modulo tabellare
window.tabularModule = new TabularModule(); 