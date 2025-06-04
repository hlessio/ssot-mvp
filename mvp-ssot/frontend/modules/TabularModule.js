/**
 * TabularModule.js - Modulo Tabellare per MVP SSOT Dinamico
 * 
 * Questo modulo implementa la visualizzazione tabellare delle entità come specificato nella Fase 4 del manuale.
 * EVOLUTO FASE 2: Aggiunge editing con attribute-editor, "Salva Vista Come..." e modali strutturate.
 * 
 * Caratteristiche:
 * - Visualizza entità come righe e attributi come colonne
 * - Supporta l'aggiunta di nuove righe (entità) e colonne (attributi)
 * - Celle editabili con attribute-editor e validazione schema-aware
 * - Sottoscrizione agli aggiornamenti in tempo reale
 * - Sistema "Salva Vista Come..." per creare istanze modulo
 * - Form modali per aggiunta attributi/entità strutturate
 */

class TabularModule {
    constructor() {
        // Leggi il tipo di entità dai parametri URL (per finestre separate) o usa default
        const urlParams = new URLSearchParams(window.location.search);
        this.entityType = urlParams.get('entityType') || 'TestEvoluzione'; // Test dell'evoluzione schema
        this.instanceId = urlParams.get('instanceId') || null; // ID istanza se caricata da istanza salvata
        
        this.entities = [];
        this.attributes = [];
        this.websocket = null;
        this.isUpdatingCell = false; // Flag per evitare loop di aggiornamento
        
        // Servizi Fase 2
        this.saveInstanceService = null;
        this.schemaService = null;
        this.entityService = null;
        
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
        
        // Inizializza servizi Fase 2
        await this.initializeServices();
        
        await this.loadData();
    }

    async initializeServices() {
        try {
            // Inizializza servizi se disponibili (Fase 2)
            if (typeof SaveInstanceService !== 'undefined') {
                this.saveInstanceService = new SaveInstanceService();
                this.debugLog('✅ SaveInstanceService inizializzato', 'success');
            }
            
            if (typeof SchemaService !== 'undefined') {
                this.schemaService = new SchemaService();
                this.debugLog('✅ SchemaService inizializzato', 'success');
            }
            
            if (typeof EntityService !== 'undefined') {
                this.entityService = new EntityService();
                this.debugLog('✅ EntityService inizializzato', 'success');
            }
            
        } catch (error) {
            this.debugLog(`⚠️ Alcuni servizi Fase 2 non disponibili: ${error.message}`, 'warning');
        }
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
        this.btnSaveInstance = document.getElementById('btn-save-instance'); // Nuovo Fase 2
    }

    attachEventListeners() {
        // Event listeners per i pulsanti
        this.btnAddRow.addEventListener('click', () => this.showAddEntityModal());
        this.btnAddColumn.addEventListener('click', () => this.showAddAttributeModal());
        this.btnRefreshTable.addEventListener('click', () => this.refreshData());
        
        // Nuovo pulsante Fase 2
        if (this.btnSaveInstance) {
            this.btnSaveInstance.addEventListener('click', () => this.showSaveInstanceModal());
        }
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
                
                // Se caricato da istanza, applica configurazioni (Fase 2)
                if (this.instanceId) {
                    await this.applyInstanceConfig();
                }
            } else {
                throw new Error('Errore nel caricamento dei dati');
            }
        } catch (error) {
            this.debugLog(`Errore nel caricamento: ${error.message}`, 'error');
            console.error('Errore nel caricamento dati tabellari:', error);
        }
    }

    // Applica configurazioni da istanza salvata (Fase 2)
    async applyInstanceConfig() {
        if (!this.saveInstanceService || !this.instanceId) return;
        
        try {
            const instance = await this.saveInstanceService.getInstance(this.instanceId);
            if (instance && instance.instanceConfigOverrides) {
                const config = JSON.parse(instance.instanceConfigOverrides);
                
                // Applica ordine attributi se specificato
                if (config.visibleAttributes) {
                    this.attributes = config.visibleAttributes.filter(attr => 
                        this.attributes.includes(attr)
                    );
                    this.renderTable();
                    this.debugLog(`Applicata configurazione istanza: ${instance.instanceName}`, 'success');
                }
            }
        } catch (error) {
            this.debugLog(`Errore applicazione configurazione istanza: ${error.message}`, 'error');
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
            if (fallbackResponse.ok) {
                const fallbackResult = await fallbackResponse.json();
                if (fallbackResult.success) {
                    return fallbackResult;
                }
            }
            
            // Se entrambi gli endpoint falliscono, restituisci array vuoto
            console.warn(`Schema non trovato per ${this.entityType}, inizializzo con array vuoto`);
            return { success: true, data: [] };
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
        
        // Verifica che this.attributes sia definito e sia un array
        if (!this.attributes || !Array.isArray(this.attributes)) {
            console.warn('Attributi non definiti o non array, inizializzo array vuoto');
            this.attributes = [];
        }
        
        // Aggiungi colonne per ogni attributo
        this.attributes.forEach(attribute => {
            const th = document.createElement('th');
            th.textContent = attribute;
            th.dataset.attribute = attribute;
            this.tableHeader.appendChild(th);
        });
        
        // Se non ci sono attributi, aggiungi messaggio informativo
        if (this.attributes.length === 0) {
            const th = document.createElement('th');
            th.textContent = 'Nessun attributo definito - Aggiungi colonne per iniziare';
            th.style.fontStyle = 'italic';
            th.style.color = '#666';
            this.tableHeader.appendChild(th);
        }
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

    // Aggiunge una riga per un'entità (EVOLUTO FASE 2 con attribute-editor)
    addEntityRow(entity) {
        const row = document.createElement('tr');
        row.dataset.entityId = entity.id;
        
        // Colonna ID (non editabile)
        const idCell = document.createElement('td');
        idCell.textContent = entity.id.substring(0, 8) + '...'; // Mostra solo parte dell'ID
        idCell.classList.add('id-cell');
        row.appendChild(idCell);
        
        // Assicurati che this.attributes sia un array
        if (!this.attributes || !Array.isArray(this.attributes)) {
            this.attributes = [];
        }
        
        // Se non ci sono attributi, mostra messaggio informativo
        if (this.attributes.length === 0) {
            const cell = document.createElement('td');
            cell.textContent = 'Usa "Aggiungi Colonna" per definire attributi';
            cell.style.fontStyle = 'italic';
            cell.style.color = '#666';
            row.appendChild(cell);
        } else {
            // Colonne attributi (editabili con attribute-editor se disponibile)
            this.attributes.forEach(attribute => {
                const cell = document.createElement('td');
                
                // Usa attribute-editor se disponibile (Fase 2), altrimenti input normale
                if (typeof document.createElement('attribute-editor') !== 'undefined' && customElements.get('attribute-editor')) {
                    const editor = document.createElement('attribute-editor');
                    editor.setAttribute('attribute-name', attribute);
                    editor.setAttribute('value', entity[attribute] || '');
                    editor.setAttribute('entity-id', entity.id);
                    editor.setAttribute('entity-type', this.entityType);
                    
                    // Event listeners per attribute-editor
                    editor.addEventListener('value-saved', (e) => {
                        this.handleAttributeEditorSave(e.detail);
                    });
                    
                    editor.addEventListener('save-error', (e) => {
                        this.debugLog(`Errore salvataggio ${attribute}: ${e.detail.error}`, 'error');
                    });
                    
                    cell.appendChild(editor);
                } else {
                    // Fallback a input normale (MVP style)
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
                }
                
                row.appendChild(cell);
            });
        }
        
        this.tableBody.appendChild(row);
    }

    // Gestisce salvataggio da attribute-editor (Fase 2)
    async handleAttributeEditorSave(detail) {
        const { entityId, attributeName, newValue } = detail;
        
        try {
            this.debugLog(`Salvataggio da attribute-editor: ${attributeName} = "${newValue}" per entità ${entityId}`, 'info');
            
            // Aggiorna entità locale
            const entity = this.entities.find(e => e.id === entityId);
            if (entity) {
                entity[attributeName] = newValue;
            }
            
            // Notifica l'aggiornamento per propagazione cross-window
            this.notifyEntityUpdate(entityId, attributeName, newValue);
            
            this.debugLog(`Attributo aggiornato con successo da editor`, 'success');
            
        } catch (error) {
            this.debugLog(`Errore gestione salvataggio editor: ${error.message}`, 'error');
        }
    }

    // Gestisce l'editing di una cella (Fallback MVP)
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

    // Mostra modale per aggiunta entità (NUOVO FASE 2)
    showAddEntityModal() {
        // Assicurati che this.attributes sia un array
        if (!this.attributes || !Array.isArray(this.attributes)) {
            this.attributes = [];
        }
        
        const modal = this.createModal('Aggiungi Nuova Entità', `
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome entità:</label>
                <input type="text" id="entity-name-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
                       placeholder="Inserisci nome per ${this.entityType}">
            </div>
            ${this.attributes.length > 0 ? this.attributes.map(attr => `
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">${attr}:</label>
                    <input type="text" id="attr-${attr}-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
                           placeholder="Valore per ${attr}">
                </div>
            `).join('') : `
                <div style="margin-bottom: 15px; padding: 10px; background-color: #f0f8ff; border: 1px solid #ccc; border-radius: 4px;">
                    <p style="margin: 0; font-style: italic; color: #666;">
                        ℹ️ Nessun attributo definito per ${this.entityType}. 
                        Dopo aver creato questa entità, usa "Aggiungi Colonna" per definire attributi.
                    </p>
                </div>
            `}
        `, async () => {
            await this.handleAddEntity(modal);
        });
        
        // Focus sul primo input
        setTimeout(() => {
            const firstInput = modal.querySelector('#entity-name-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // Gestisce aggiunta entità da modale (NUOVO FASE 2)
    async handleAddEntity(modal) {
        const nameInput = modal.querySelector('#entity-name-input');
        const entityName = nameInput.value.trim();
        
        if (!entityName) {
            alert('⚠️ Inserisci un nome per l\'entità');
            return;
        }
        
        try {
            this.debugLog(`Creazione nuova entità: ${entityName}`, 'info');
            
            // Raccoglie dati da tutti gli input
            const initialData = { nome: entityName };
            
            // Solo se ci sono attributi definiti, raccoglie i loro valori
            if (this.attributes && this.attributes.length > 0) {
                this.attributes.forEach(attr => {
                    const input = modal.querySelector(`#attr-${attr}-input`);
                    if (input && input.value.trim()) {
                        initialData[attr] = input.value.trim();
                    }
                });
            }
            
            const response = await fetch('/api/entities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entityType: this.entityType,
                    initialData: initialData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Aggiungi l'entità alla lista locale
                this.entities.push(result.data);
                
                // Assicurati che tutti gli attributi usati siano nella lista
                Object.keys(initialData).forEach(attr => {
                    if (!this.attributes.includes(attr)) {
                        this.attributes.push(attr);
                    }
                });
                
                // Re-renderizza la tabella
                this.renderTable();
                
                this.debugLog(`✅ Entità creata con successo: ${result.data.id}`, 'success');
                this.closeModal(modal);
            } else {
                throw new Error(result.error || 'Errore nella creazione');
            }
        } catch (error) {
            this.debugLog(`❌ Errore nella creazione entità: ${error.message}`, 'error');
            alert(`Errore nella creazione entità: ${error.message}`);
        }
    }

    // Mostra modale per aggiunta attributo (NUOVO FASE 2)
    showAddAttributeModal() {
        const modal = this.createModal('Aggiungi Nuovo Attributo', `
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome attributo:</label>
                <input type="text" id="attribute-name-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
                       placeholder="es. telefono, indirizzo, data_nascita">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo:</label>
                <select id="attribute-type-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="string">Testo (string)</option>
                    <option value="integer">Numero intero (integer)</option>
                    <option value="boolean">Booleano (boolean)</option>
                    <option value="date">Data (date)</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                    <option value="phone">Telefono</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="attribute-required-input" style="margin-right: 5px;">
                    Campo obbligatorio
                </label>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descrizione (opzionale):</label>
                <input type="text" id="attribute-description-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
                       placeholder="Breve descrizione dell'attributo">
            </div>
        `, async () => {
            await this.handleAddAttribute(modal);
        });
        
        // Focus sul primo input
        setTimeout(() => {
            const firstInput = modal.querySelector('#attribute-name-input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // Gestisce aggiunta attributo da modale (EVOLUTO FASE 2)
    async handleAddAttribute(modal) {
        const nameInput = modal.querySelector('#attribute-name-input');
        const typeInput = modal.querySelector('#attribute-type-input');
        const requiredInput = modal.querySelector('#attribute-required-input');
        const descriptionInput = modal.querySelector('#attribute-description-input');
        
        const attributeName = nameInput.value.trim();
        const attributeType = typeInput.value;
        const isRequired = requiredInput.checked;
        const description = descriptionInput.value.trim() || `Attributo ${attributeName}`;
        
        if (!attributeName) {
            alert('⚠️ Inserisci un nome per l\'attributo');
            return;
        }
        
        if (this.attributes.includes(attributeName)) {
            alert('⚠️ Attributo già esistente!');
            return;
        }
        
        try {
            this.debugLog(`Aggiunta nuovo attributo: ${attributeName} (${attributeType})`, 'info');
            
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
                    if (attr === attributeName) {
                        newSchema.attributes[attr] = {
                            type: attributeType,
                            required: isRequired,
                            description: description
                        };
                    } else {
                        newSchema.attributes[attr] = {
                            type: 'string',
                            required: false,
                            description: `Attributo ${attr}`
                        };
                    }
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
                
                this.debugLog(`✅ Nuovo schema creato per ${this.entityType}`, 'success');
            } else {
                // Schema evoluto esiste - evolvi lo schema aggiungendo il nuovo attributo
                this.debugLog(`Evoluzione schema ${this.entityType} con nuovo attributo ${attributeName}`, 'info');
                
                const evolutionData = {
                    evolution: {
                        addAttributes: {
                            [attributeName]: {
                                type: attributeType,
                                required: isRequired,
                                description: description
                            }
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
                
                this.debugLog(`✅ Schema evoluto con successo per ${this.entityType}`, 'success');
            }
            
            // Aggiungi l'attributo alla lista locale
            this.attributes.push(attributeName);
            
            // Re-renderizza la tabella per includere la nuova colonna
            this.renderTable();
            
            // Notifica l'aggiornamento della struttura per le altre finestre
            this.notifySchemaUpdate(attributeName);
            
            this.debugLog(`✅ Attributo aggiunto con successo: ${attributeName}`, 'success');
            this.closeModal(modal);
            
        } catch (error) {
            this.debugLog(`❌ Errore nell'aggiunta attributo: ${error.message}`, 'error');
            alert(`Errore nell'aggiunta attributo: ${error.message}`);
        }
    }

    // Mostra modale "Salva Vista Come..." (NUOVO FASE 2)
    showSaveInstanceModal() {
        if (!this.saveInstanceService) {
            alert('⚠️ SaveInstanceService non disponibile');
            return;
        }
        
        const modal = this.createModal('Salva Vista Come Istanza', `
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome istanza:</label>
                <input type="text" id="instance-name-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
                       placeholder="es. Tabella Contatti Personalizzata" value="Tabella ${this.entityType} - ${new Date().toLocaleDateString('it-IT')}">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Descrizione (opzionale):</label>
                <textarea id="instance-description-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; height: 60px;" 
                          placeholder="Breve descrizione di questa vista personalizzata..."></textarea>
            </div>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 0.9em; color: #495057;">
                <strong>Configurazione corrente:</strong><br>
                • Tipo entità: ${this.entityType}<br>
                • Attributi visibili: ${this.attributes.join(', ')}<br>
                • Numero entità: ${this.entities.length}
            </div>
        `, async () => {
            await this.handleSaveInstance(modal);
        });
        
        // Focus sul primo input
        setTimeout(() => {
            const firstInput = modal.querySelector('#instance-name-input');
            if (firstInput) {
                firstInput.select();
            }
        }, 100);
    }

    // Gestisce salvataggio istanza (NUOVO FASE 2)
    async handleSaveInstance(modal) {
        const nameInput = modal.querySelector('#instance-name-input');
        const descriptionInput = modal.querySelector('#instance-description-input');
        
        const instanceName = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!instanceName) {
            alert('⚠️ Inserisci un nome per l\'istanza');
            return;
        }
        
        try {
            this.debugLog(`💾 Salvataggio istanza: ${instanceName}`, 'info');
            
            // Configura i dati dell'istanza
            const instanceData = {
                instanceName: instanceName,
                templateModuleId: 'DynamicTableModule',
                targetEntityType: this.entityType,
                targetEntityId: '', // Stringa vuota invece di null per tabelle non legate a entità specifica
                description: description || `Vista tabellare per ${this.entityType}`,
                instanceConfigOverrides: {
                    visibleAttributes: this.attributes,
                    attributeOrder: this.attributes,
                    entityType: this.entityType,
                    viewType: 'table',
                    createdAt: new Date().toISOString()
                }
            };
            
            const result = await this.saveInstanceService.createInstance(instanceData);
            
            this.debugLog(`✅ Istanza salvata con successo: ${result.instanceName} (ID: ${result.id})`, 'success');
            
            // Notifica cross-window della nuova istanza
            this.notifyInstanceCreated(result);
            
            this.closeModal(modal);
            alert(`✅ Vista salvata come "${instanceName}"!\n\nPuoi trovarla nella dashboard per riaprirla in futuro.`);
            
        } catch (error) {
            this.debugLog(`❌ Errore salvataggio istanza: ${error.message}`, 'error');
            alert(`Errore salvataggio istanza: ${error.message}`);
        }
    }

    // Utility per creare modali (NUOVO FASE 2)
    createModal(title, content, onConfirm) {
        // Crea overlay modale
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 10000; 
            display: flex; align-items: center; justify-content: center;
        `;
        
        // Crea contenuto modale
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white; border-radius: 8px; padding: 20px; 
            max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #495057; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                ${title}
            </h3>
            <div style="margin-bottom: 20px;">
                ${content}
            </div>
            <div style="text-align: right; border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 15px;">
                <button class="modal-cancel-btn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-right: 10px; cursor: pointer;">
                    Annulla
                </button>
                <button class="modal-confirm-btn" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Conferma
                </button>
            </div>
        `;
        
        // Event listeners
        modal.querySelector('.modal-cancel-btn').addEventListener('click', () => {
            this.closeModal(overlay);
        });
        
        modal.querySelector('.modal-confirm-btn').addEventListener('click', async () => {
            if (onConfirm) {
                await onConfirm();
            }
        });
        
        // Click fuori per chiudere
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal(overlay);
            }
        });
        
        // ESC per chiudere
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(overlay);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return modal;
    }

    closeModal(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // Notifica creazione istanza (NUOVO FASE 2)
    notifyInstanceCreated(instance) {
        const message = {
            type: 'module-instance-created',
            instanceId: instance.id,
            instanceName: instance.instanceName,
            entityType: this.entityType,
            timestamp: Date.now(),
            source: window.mvpApp ? 'main-window' : 'child-window'
        };
        
        // Invia messaggio cross-window
        if (window.mvpApp && window.mvpApp.crossWindowChannel) {
            window.mvpApp.crossWindowChannel.postMessage(message);
        } else if (window.moduleWindowManager && window.moduleWindowManager.crossWindowChannel) {
            window.moduleWindowManager.crossWindowChannel.postMessage(message);
        } else {
            // Fallback localStorage
            localStorage.setItem('ssot-sync', JSON.stringify(message));
            setTimeout(() => localStorage.removeItem('ssot-sync'), 10);
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
        
        // Trova l'input corrispondente nella tabella (MVP fallback)
        const input = document.querySelector(
            `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
        );
        
        // Trova attribute-editor corrispondente (Fase 2)
        const editor = document.querySelector(
            `attribute-editor[entity-id="${entityId}"][attribute-name="${attributeName}"]`
        );
        
        if (editor) {
            // Aggiorna attribute-editor
            editor.setAttribute('value', newValue);
        } else if (input && input !== document.activeElement) {
            // Aggiorna input normale (fallback MVP)
            this.isUpdatingCell = true;
            input.value = newValue;
            input.classList.add('modified');
            
            setTimeout(() => {
                input.classList.remove('modified');
                this.isUpdatingCell = false;
            }, 1000);
        }
        
        // Aggiorna l'entità locale
        const entity = this.entities.find(e => e.id === entityId);
        if (entity) {
            entity[attributeName] = newValue;
        }
    }

    // Gestisce aggiornamenti esterni (cross-window communication)
    handleExternalUpdate(entityId, attributeName, newValue) {
        if (this.isUpdatingCell) return; // Evita loop
        
        this.debugLog(`Ricevuto aggiornamento cross-window: ${attributeName} = "${newValue}" per entità ${entityId}`, 'info');
        
        // Trova l'input corrispondente nella tabella (MVP fallback)
        const input = document.querySelector(
            `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
        );
        
        // Trova attribute-editor corrispondente (Fase 2)
        const editor = document.querySelector(
            `attribute-editor[entity-id="${entityId}"][attribute-name="${attributeName}"]`
        );
        
        if (editor) {
            // Aggiorna attribute-editor
            editor.setAttribute('value', newValue);
        } else if (input && input !== document.activeElement) {
            // Aggiorna input normale (fallback MVP)
            this.isUpdatingCell = true;
            input.value = newValue;
            input.classList.add('modified');
            
            setTimeout(() => {
                input.classList.remove('modified');
                this.isUpdatingCell = false;
            }, 1000);
        }
        
        // Aggiorna l'entità locale
        const entity = this.entities.find(e => e.id === entityId);
        if (entity) {
            entity[attributeName] = newValue;
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
            
            this.debugLog(`Schema aggiornato localmente con nuovo attributo: ${updateData.newAttribute}`, 'success');
        }
    }

    debugLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('it-IT');
        const prefix = `[${timestamp}] [TabularModule]`;
        
        // Emoji per i tipi
        const emoji = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[type] || 'ℹ️';
        
        console.log(`${prefix} ${emoji} ${message}`);
        
        // Se c'è un debugger nella pagina, usa quello
        if (window.demoApp && window.demoApp.debugLog) {
            window.demoApp.debugLog(`[Tabular] ${message}`, type);
        }
    }
}

// Istanza globale del modulo tabellare
window.tabularModule = new TabularModule(); 