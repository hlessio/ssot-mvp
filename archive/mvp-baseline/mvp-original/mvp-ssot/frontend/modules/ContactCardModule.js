/**
 * ContactCardModule.js - Modulo Scheda Contatto per MVP SSOT Dinamico
 * 
 * Questo modulo implementa la visualizzazione a scheda singola delle entità come specificato nella Fase 5 del manuale.
 * Caratteristiche:
 * - Dropdown per selezione entità
 * - Visualizzazione attributi come campi editabili
 * - Propagazione delle modifiche via WebSocket
 * - Sincronizzazione bidirezionale con il modulo tabellare
 */

class ContactCardModule {
    constructor() {
        this.entityType = 'Contact'; // Stesso tipo del modulo tabellare
        this.entities = [];
        this.currentEntity = null;
        this.websocket = null;
        this.isUpdatingField = false; // Flag per evitare loop di aggiornamento
        
        // Solo inizializza se gli elementi DOM sono disponibili
        if (document.getElementById('entity-selector')) {
            this.initializeElements();
            this.attachEventListeners();
        }
    }

    // Metodo di inizializzazione esplicito
    async init() {
        if (!this.entitySelector) {
            this.initializeElements();
            this.attachEventListeners();
        }
        await this.loadEntities();
    }

    initializeElements() {
        // Elementi DOM principali
        this.entitySelector = document.getElementById('entity-selector');
        this.entityDetails = document.getElementById('entity-details');
        this.btnRefreshEntities = document.getElementById('btn-refresh-entities');
    }

    attachEventListeners() {
        // Event listeners
        this.entitySelector.addEventListener('change', (e) => this.selectEntity(e.target.value));
        this.btnRefreshEntities.addEventListener('click', () => this.refreshEntities());
    }

    setWebSocket(ws) {
        this.websocket = ws;
    }

    // Caricamento delle entità disponibili
    async loadEntities() {
        try {
            this.debugLog('Caricamento entità per scheda contatto...', 'info');
            
            const response = await fetch(`/api/entities/${this.entityType}`);
            const result = await response.json();
            
            if (result.success) {
                this.entities = result.data;
                this.populateEntitySelector();
                this.debugLog(`Caricate ${this.entities.length} entità`, 'success');
            } else {
                throw new Error(result.error || 'Errore nel caricamento entità');
            }
        } catch (error) {
            this.debugLog(`Errore nel caricamento entità: ${error.message}`, 'error');
            console.error('Errore nel caricamento entità:', error);
        }
    }

    // Popola il dropdown di selezione entità
    populateEntitySelector() {
        // Pulisci le opzioni esistenti (tranne quella di default)
        this.entitySelector.innerHTML = '<option value="">-- Seleziona un\'entità --</option>';
        
        // Aggiungi un'opzione per ogni entità
        this.entities.forEach(entity => {
            const option = document.createElement('option');
            option.value = entity.id;
            
            // Mostra nome se disponibile, altrimenti ID abbreviato
            const displayName = entity.nome || `Entità ${entity.id.substring(0, 8)}...`;
            option.textContent = displayName;
            
            this.entitySelector.appendChild(option);
        });
    }

    // Seleziona e carica un'entità
    async selectEntity(entityId) {
        if (!entityId) {
            this.currentEntity = null;
            this.renderEntityDetails();
            return;
        }

        try {
            this.debugLog(`Caricamento entità: ${entityId}`, 'info');
            
            // Trova l'entità nella cache locale o caricala dal server
            let entity = this.entities.find(e => e.id === entityId);
            
            if (!entity) {
                // Carica dal server se non trovata localmente
                const response = await fetch(`/api/entity/${entityId}`);
                const result = await response.json();
                
                if (result.success) {
                    entity = result.data;
                } else {
                    throw new Error(result.error || 'Entità non trovata');
                }
            }
            
            this.currentEntity = entity;
            this.renderEntityDetails();
            this.debugLog(`Entità caricata: ${entity.nome || entity.id}`, 'success');
            
        } catch (error) {
            this.debugLog(`Errore nel caricamento entità: ${error.message}`, 'error');
            console.error('Errore nel caricamento entità:', error);
            this.currentEntity = null;
            this.renderEntityDetails();
        }
    }

    // Renderizza i dettagli dell'entità corrente
    renderEntityDetails() {
        if (!this.currentEntity) {
            this.entityDetails.innerHTML = '<p class="no-entity">Nessuna entità selezionata</p>';
            return;
        }

        // Pulisci il contenuto esistente
        this.entityDetails.innerHTML = '';
        
        // Crea un campo per ogni attributo dell'entità
        Object.keys(this.currentEntity).forEach(attributeName => {
            // Salta attributi di sistema
            if (['id', 'entityType', 'createdAt', 'updatedAt'].includes(attributeName)) {
                return;
            }
            
            this.addAttributeField(attributeName, this.currentEntity[attributeName]);
        });
        
        // Se non ci sono attributi editabili, mostra un messaggio
        if (this.entityDetails.children.length === 0) {
            this.entityDetails.innerHTML = '<p class="no-entity">Nessun attributo modificabile per questa entità</p>';
        }
    }

    // Aggiunge un campo per un attributo
    addAttributeField(attributeName, value) {
        const fieldDiv = document.createElement('div');
        fieldDiv.classList.add('attribute-field');
        fieldDiv.dataset.attributeName = attributeName;
        
        const label = document.createElement('label');
        label.textContent = this.formatAttributeName(attributeName);
        label.setAttribute('for', `field-${attributeName}`);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `field-${attributeName}`;
        input.value = value || '';
        input.dataset.attributeName = attributeName;
        input.dataset.entityId = this.currentEntity.id;
        
        // Event listeners per l'editing
        input.addEventListener('blur', (e) => this.handleFieldEdit(e));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
        
        fieldDiv.appendChild(label);
        fieldDiv.appendChild(input);
        this.entityDetails.appendChild(fieldDiv);
    }

    // Formatta il nome dell'attributo per la visualizzazione
    formatAttributeName(attributeName) {
        // Capitalizza la prima lettera e sostituisce underscore con spazi
        return attributeName.charAt(0).toUpperCase() + 
               attributeName.slice(1).replace(/_/g, ' ');
    }

    // Gestisce l'editing di un campo
    async handleFieldEdit(event) {
        if (this.isUpdatingField) return; // Evita loop di aggiornamento
        
        const input = event.target;
        const attributeName = input.dataset.attributeName;
        const entityId = input.dataset.entityId;
        const newValue = input.value.trim();
        
        // Controlla se il valore è cambiato
        const oldValue = this.currentEntity[attributeName] || '';
        if (newValue === oldValue) return;
        
        try {
            // Marca il campo come in modifica
            input.classList.add('modified');
            this.debugLog(`Aggiornamento ${attributeName}: "${oldValue}" -> "${newValue}"`, 'info');
            
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
                this.currentEntity[attributeName] = newValue;
                
                // Aggiorna anche la cache delle entità
                const cachedEntity = this.entities.find(e => e.id === entityId);
                if (cachedEntity) {
                    cachedEntity[attributeName] = newValue;
                }
                
                // Notifica l'aggiornamento per propagazione cross-window
                this.notifyEntityUpdate(entityId, attributeName, newValue);
                
                // Rimuovi l'indicatore di modifica
                setTimeout(() => {
                    input.classList.remove('modified');
                }, 1000);
                
                this.debugLog(`Campo aggiornato con successo`, 'success');
            } else {
                throw new Error(result.error || 'Errore nell\'aggiornamento');
            }
        } catch (error) {
            this.debugLog(`Errore nell'aggiornamento: ${error.message}`, 'error');
            console.error('Errore nell\'aggiornamento campo:', error);
            
            // Ripristina il valore precedente
            input.value = oldValue;
            input.classList.remove('modified');
        }
    }

    // Aggiorna la lista delle entità
    async refreshEntities() {
        const selectedEntityId = this.entitySelector.value;
        await this.loadEntities();
        
        // Ripristina la selezione se possibile
        if (selectedEntityId && this.entities.some(e => e.id === selectedEntityId)) {
            this.entitySelector.value = selectedEntityId;
            await this.selectEntity(selectedEntityId);
        }
    }

    // Gestisce le notifiche WebSocket di cambiamento attributi
    handleAttributeChange(changeData) {
        if (this.isUpdatingField) return; // Evita loop
        
        const { entityId, attributeName, newValue } = changeData;
        
        // Aggiorna solo se l'entità corrente è quella modificata
        if (this.currentEntity && this.currentEntity.id === entityId) {
            this.debugLog(`Ricevuto aggiornamento WebSocket: ${attributeName} = "${newValue}"`, 'info');
            
            // Trova il campo corrispondente
            const input = document.querySelector(
                `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
            );
            
            if (input && input !== document.activeElement) { // Non aggiornare se l'utente sta editando
                this.isUpdatingField = true;
                input.value = newValue;
                input.classList.add('modified');
                
                // Aggiorna l'entità locale
                this.currentEntity[attributeName] = newValue;
                
                // Aggiorna anche la cache delle entità
                const cachedEntity = this.entities.find(e => e.id === entityId);
                if (cachedEntity) {
                    cachedEntity[attributeName] = newValue;
                }
                
                // Rimuovi l'indicatore dopo un breve periodo
                setTimeout(() => {
                    input.classList.remove('modified');
                    this.isUpdatingField = false;
                }, 1000);
            }
        } else if (changeData.entityId) {
            // Se l'entità modificata non è quella corrente, aggiorna solo la cache
            const cachedEntity = this.entities.find(e => e.id === entityId);
            if (cachedEntity) {
                cachedEntity[attributeName] = newValue;
                
                // Se l'attributo modificato è 'nome', aggiorna anche il dropdown
                if (attributeName === 'nome') {
                    this.populateEntitySelector();
                    // Ripristina la selezione corrente
                    if (this.currentEntity) {
                        this.entitySelector.value = this.currentEntity.id;
                    }
                }
            }
        }
    }

    // Gestisce aggiornamenti esterni (cross-window communication)
    handleExternalUpdate(entityId, attributeName, newValue) {
        if (this.isUpdatingField) return; // Evita loop
        
        this.debugLog(`Ricevuto aggiornamento cross-window: ${attributeName} = "${newValue}" per entità ${entityId}`, 'info');
        
        // Aggiorna solo se l'entità corrente è quella modificata
        if (this.currentEntity && this.currentEntity.id === entityId) {
            // Trova il campo corrispondente
            const input = document.querySelector(
                `input[data-entity-id="${entityId}"][data-attribute-name="${attributeName}"]`
            );
            
            if (input && input !== document.activeElement) { // Non aggiornare se l'utente sta editando
                this.isUpdatingField = true;
                input.value = newValue;
                input.classList.add('modified');
                
                // Aggiorna l'entità locale
                this.currentEntity[attributeName] = newValue;
                
                // Aggiorna anche la cache delle entità
                const cachedEntity = this.entities.find(e => e.id === entityId);
                if (cachedEntity) {
                    cachedEntity[attributeName] = newValue;
                }
                
                // Rimuovi l'indicatore dopo un breve periodo
                setTimeout(() => {
                    input.classList.remove('modified');
                    this.isUpdatingField = false;
                }, 1000);
            }
        } else if (entityId) {
            // Se l'entità modificata non è quella corrente, aggiorna solo la cache
            const cachedEntity = this.entities.find(e => e.id === entityId);
            if (cachedEntity) {
                cachedEntity[attributeName] = newValue;
                
                // Se l'attributo modificato è 'nome', aggiorna anche il dropdown
                if (attributeName === 'nome') {
                    this.populateEntitySelector();
                    // Ripristina la selezione corrente
                    if (this.currentEntity) {
                        this.entitySelector.value = this.currentEntity.id;
                    }
                }
            }
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

    // Aggiunge una nuova entità alla cache (chiamata quando viene creata dal modulo tabellare)
    addEntity(entity) {
        // Evita duplicati
        if (!this.entities.some(e => e.id === entity.id)) {
            this.entities.push(entity);
            this.populateEntitySelector();
            this.debugLog(`Nuova entità aggiunta: ${entity.nome || entity.id}`, 'info');
        }
    }

    // Utility per debug logging
    debugLog(message, type = 'info') {
        const debugMessages = document.getElementById('debug-messages');
        if (debugMessages) {
            const p = document.createElement('p');
            p.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> <span class="${type}">[SCHEDA]</span> ${message}`;
            debugMessages.appendChild(p);
            debugMessages.scrollTop = debugMessages.scrollHeight;
        }
    }
}

// Istanza globale del modulo scheda contatto
window.contactCardModule = new ContactCardModule(); 