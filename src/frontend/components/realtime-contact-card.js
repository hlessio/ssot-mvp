/**
 * <realtime-contact-card> Web Component
 * 
 * Enhanced contact card that displays intrinsic Person/Contact attributes
 * with real-time synchronization across all instances and browser windows.
 * 
 * Features:
 * - Real-time attribute updates via WebSocket
 * - Cross-window synchronization via BroadcastChannel
 * - Inline editing with debounced saves
 * - Visual indicators for real-time changes
 * - Responsive design
 * - Configurable display attributes
 */

class RealtimeContactCardComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Configuration properties
        this.entityId = '';
        this.entityType = 'Contact';
        this.displayAttributes = ['nome', 'cognome', 'email', 'telefono', 'indirizzo', 'citta'];
        this.editableAttributes = ['nome', 'cognome', 'email', 'telefono', 'indirizzo', 'citta'];
        this.showTitle = true;
        this.allowEdit = true;
        this.compactMode = false;
        
        // State
        this.entity = null;
        this.isLoading = false;
        this.isEditing = false;
        this.editingAttribute = null;
        this.wsSubscriptionId = null;
        this.broadcastChannel = null;
        this.pendingChanges = new Map(); // For debounced saves
        this.saveTimeouts = new Map();
        this.lastUpdateTime = null;
        
        // Services
        this.entityService = window.EntityService;
        this.moduleRelationService = window.ModuleRelationService;
        
        console.log('👤 RealtimeContactCard created');
    }

    static get observedAttributes() {
        return [
            'entity-id',
            'entity-type',
            'display-attributes',
            'editable-attributes',
            'show-title',
            'allow-edit',
            'compact-mode'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'entity-id':
                this.entityId = newValue;
                if (newValue) {
                    this.loadEntity();
                }
                break;
            case 'entity-type':
                this.entityType = newValue || 'Contact';
                break;
            case 'display-attributes':
                this.displayAttributes = newValue ? newValue.split(',').map(a => a.trim()) : ['nome', 'email'];
                break;
            case 'editable-attributes':
                this.editableAttributes = newValue ? newValue.split(',').map(a => a.trim()) : ['nome', 'email'];
                break;
            case 'show-title':
                this.showTitle = newValue !== 'false';
                break;
            case 'allow-edit':
                this.allowEdit = newValue !== 'false';
                break;
            case 'compact-mode':
                this.compactMode = newValue === 'true';
                break;
        }
        
        this.render();
    }

    async connectedCallback() {
        if (!this.entityId && !this.entity) {
            console.error('❌ entity-id attribute or entity object is required for realtime-contact-card');
            return;
        }
        
        this.setupBroadcastChannel();
        this.setupWebSocketSubscription();
        this.render();
        
        if (this.entityId && !this.entity) {
            await this.loadEntity();
        }
        
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.cleanupWebSocketSubscription();
        this.cleanupBroadcastChannel();
        this.clearAllSaveTimeouts();
    }

    /**
     * Sets the entity object directly (alternative to entity-id attribute)
     */
    setEntity(entity) {
        this.entity = entity;
        this.entityId = entity?.id || '';
        this.entityType = entity?.entityType || 'Contact';
        
        this.setupWebSocketSubscription();
        this.render();
    }

    /**
     * Sets up WebSocket subscription for real-time attribute updates
     */
    setupWebSocketSubscription() {
        if (this.moduleRelationService && this.entityId) {
            // Clean up existing subscription
            this.cleanupWebSocketSubscription();
            
            this.wsSubscriptionId = this.moduleRelationService.subscribeToEntityUpdates(
                this.entityId,
                (update) => this.handleRealtimeUpdate(update)
            );
        }
    }

    /**
     * Cleans up WebSocket subscription
     */
    cleanupWebSocketSubscription() {
        if (this.wsSubscriptionId && this.moduleRelationService) {
            if (this.moduleRelationService.unsubscribeFromEntityUpdates) {
                this.moduleRelationService.unsubscribeFromEntityUpdates(this.entityId);
            }
            this.wsSubscriptionId = null;
        }
    }

    /**
     * Sets up BroadcastChannel for cross-window synchronization
     */
    setupBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('ssot-entity-updates');
            this.broadcastChannel.addEventListener('message', (event) => {
                this.handleBroadcastMessage(event.data);
            });
        }
    }

    /**
     * Cleans up BroadcastChannel
     */
    cleanupBroadcastChannel() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
    }

    /**
     * Handles real-time updates from WebSocket
     */
    handleRealtimeUpdate(update) {
        console.log('🔄 Real-time attribute update:', update);
        
        if (update.entityId === this.entityId && this.entity) {
            // Update local entity data
            this.entity[update.attributeName] = update.newValue;
            this.lastUpdateTime = new Date();
            
            // Show visual indication of change
            this.showAttributeUpdateIndicator(update.attributeName);
            
            // Broadcast to other windows
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage({
                    type: 'entity-attribute-updated',
                    entityId: this.entityId,
                    attributeName: update.attributeName,
                    newValue: update.newValue,
                    timestamp: update.timestamp
                });
            }
            
            // Re-render to show new value
            this.render();
        }
    }

    /**
     * Handles broadcast messages from other windows
     */
    handleBroadcastMessage(data) {
        if (data.type === 'entity-attribute-updated' && 
            data.entityId === this.entityId && 
            this.entity) {
            
            console.log('📡 Cross-window attribute update:', data);
            
            // Update local entity data
            this.entity[data.attributeName] = data.newValue;
            this.lastUpdateTime = new Date(data.timestamp);
            
            // Show visual indication
            this.showAttributeUpdateIndicator(data.attributeName);
            
            // Re-render
            this.render();
        }
    }

    /**
     * Shows visual indicator for attribute updates
     */
    showAttributeUpdateIndicator(attributeName) {
        setTimeout(() => {
            const attrElement = this.shadowRoot.querySelector(`[data-attribute="${attributeName}"]`);
            if (attrElement) {
                attrElement.classList.add('updated');
                setTimeout(() => {
                    attrElement.classList.remove('updated');
                }, 2000);
            }
        }, 100);
    }

    /**
     * Loads entity data from backend
     */
    async loadEntity() {
        if (!this.entityService || !this.entityId) return;
        
        this.isLoading = true;
        this.render();
        
        try {
            this.entity = await this.entityService.getEntity(this.entityId);
            console.log('✅ Entity loaded:', this.entity);
            
        } catch (error) {
            console.error('❌ Error loading entity:', error);
            this.showNotification('Error loading contact: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    /**
     * Starts editing an attribute
     */
    startEditingAttribute(attributeName) {
        if (!this.allowEdit || !this.editableAttributes.includes(attributeName)) return;
        
        this.editingAttribute = attributeName;
        this.render();
        
        // Focus on the input field
        setTimeout(() => {
            const input = this.shadowRoot.querySelector(`input[data-attribute="${attributeName}"]`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    /**
     * Handles attribute value changes (with debounced save)
     */
    handleAttributeChange(attributeName, newValue) {
        if (!this.entity || !this.entityService) return;
        
        // Update local state immediately for responsive UI
        const oldValue = this.entity[attributeName];
        this.entity[attributeName] = newValue;
        
        // Store pending change
        this.pendingChanges.set(attributeName, { oldValue, newValue });
        
        // Clear any existing timeout for this attribute
        if (this.saveTimeouts.has(attributeName)) {
            clearTimeout(this.saveTimeouts.get(attributeName));
        }
        
        // Set new debounced save timeout
        const timeoutId = setTimeout(async () => {
            await this.saveAttributeChange(attributeName, newValue);
            this.pendingChanges.delete(attributeName);
            this.saveTimeouts.delete(attributeName);
        }, 1000); // 1 second debounce
        
        this.saveTimeouts.set(attributeName, timeoutId);
        
        // Show pending indicator
        this.showAttributePendingIndicator(attributeName);
    }

    /**
     * Saves an attribute change to backend
     */
    async saveAttributeChange(attributeName, newValue) {
        try {
            console.log(`💾 Saving ${attributeName}: ${newValue}`);
            
            await this.entityService.updateEntityAttribute(this.entityId, attributeName, newValue);
            
            // Show success indicator
            this.showAttributeSavedIndicator(attributeName);
            
            // Emit event for other components to listen
            this.dispatchEvent(new CustomEvent('entity-attribute-updated', {
                detail: {
                    entityId: this.entityId,
                    attributeName,
                    newValue,
                    entityType: this.entityType
                },
                bubbles: true
            }));
            
            console.log(`✅ Attribute ${attributeName} saved successfully`);
            
        } catch (error) {
            console.error(`❌ Error saving ${attributeName}:`, error);
            
            // Revert local change on error
            const pendingChange = this.pendingChanges.get(attributeName);
            if (pendingChange) {
                this.entity[attributeName] = pendingChange.oldValue;
                this.render();
            }
            
            this.showNotification(`Error saving ${attributeName}: ${error.message}`, 'error');
        }
    }

    /**
     * Shows pending save indicator
     */
    showAttributePendingIndicator(attributeName) {
        setTimeout(() => {
            const attrElement = this.shadowRoot.querySelector(`[data-attribute="${attributeName}"]`);
            if (attrElement) {
                attrElement.classList.add('pending');
            }
        }, 100);
    }

    /**
     * Shows saved indicator
     */
    showAttributeSavedIndicator(attributeName) {
        setTimeout(() => {
            const attrElement = this.shadowRoot.querySelector(`[data-attribute="${attributeName}"]`);
            if (attrElement) {
                attrElement.classList.remove('pending');
                attrElement.classList.add('saved');
                setTimeout(() => {
                    attrElement.classList.remove('saved');
                }, 1500);
            }
        }, 100);
    }

    /**
     * Cancels editing
     */
    cancelEditing() {
        this.editingAttribute = null;
        
        // Revert any unsaved changes
        this.pendingChanges.forEach((change, attributeName) => {
            this.entity[attributeName] = change.oldValue;
        });
        this.pendingChanges.clear();
        this.clearAllSaveTimeouts();
        
        this.render();
    }

    /**
     * Clears all save timeouts
     */
    clearAllSaveTimeouts() {
        this.saveTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.saveTimeouts.clear();
    }

    /**
     * Gets display name for the entity
     */
    getDisplayName() {
        if (!this.entity) return 'Loading...';
        
        const firstName = this.entity.nome || this.entity.name || '';
        const lastName = this.entity.cognome || this.entity.surname || this.entity.lastName || '';
        
        return `${firstName} ${lastName}`.trim() || this.entity.title || this.entity.displayName || `${this.entityType} ${this.entityId}`;
    }

    /**
     * Gets formatted attribute value for display
     */
    getAttributeDisplayValue(attributeName) {
        if (!this.entity) return '';
        
        const value = this.entity[attributeName];
        
        if (value === null || value === undefined) return '';
        
        // Format specific attribute types
        if (attributeName === 'email' && value) {
            return `<a href="mailto:${value}">${value}</a>`;
        }
        
        if (attributeName === 'telefono' && value) {
            return `<a href="tel:${value}">${value}</a>`;
        }
        
        return String(value);
    }

    /**
     * Gets attribute label for display
     */
    getAttributeLabel(attributeName) {
        const labels = {
            nome: 'First Name',
            cognome: 'Last Name', 
            name: 'Name',
            surname: 'Surname',
            email: 'Email',
            telefono: 'Phone',
            phone: 'Phone',
            indirizzo: 'Address',
            address: 'Address',
            citta: 'City',
            city: 'City',
            ragioneSociale: 'Company',
            title: 'Title'
        };
        
        return labels[attributeName] || attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
    }

    /**
     * Shows notification message
     */
    showNotification(message, type = 'info') {
        const notification = this.shadowRoot.querySelector('.notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    /**
     * Sets up event listeners
     */
    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.classList.contains('attr-display') && this.allowEdit) {
                const attributeName = target.getAttribute('data-attribute');
                if (this.editableAttributes.includes(attributeName)) {
                    this.startEditingAttribute(attributeName);
                }
            }
            
            if (target.classList.contains('cancel-edit-btn')) {
                this.cancelEditing();
            }
            
            if (target.classList.contains('refresh-btn')) {
                this.loadEntity();
            }
        });
        
        this.shadowRoot.addEventListener('input', (e) => {
            const target = e.target;
            
            if (target.classList.contains('attr-input')) {
                const attributeName = target.getAttribute('data-attribute');
                this.handleAttributeChange(attributeName, target.value);
            }
        });
        
        this.shadowRoot.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelEditing();
            }
            
            if (e.key === 'Enter' && e.target.classList.contains('attr-input')) {
                e.target.blur(); // This will save the change via timeout
            }
        });
    }

    /**
     * Renders the component
     */
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                    transition: all 0.3s;
                }
                
                :host([compact-mode="true"]) {
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .contact-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: ${this.compactMode ? '12px' : '16px'};
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .contact-name {
                    font-size: ${this.compactMode ? '16px' : '18px'};
                    font-weight: 600;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .entity-type {
                    background: rgba(255,255,255,0.2);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    text-transform: uppercase;
                    opacity: 0.9;
                }
                
                .contact-body {
                    padding: ${this.compactMode ? '12px' : '16px'};
                }
                
                .attributes-grid {
                    display: grid;
                    grid-template-columns: ${this.compactMode ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'};
                    gap: ${this.compactMode ? '8px' : '12px'};
                }
                
                .attr-group {
                    position: relative;
                    transition: all 0.3s;
                }
                
                .attr-group.updated {
                    background: #e3f2fd;
                    border-radius: 4px;
                    padding: 4px;
                    animation: highlightUpdate 0.5s ease-out;
                }
                
                .attr-group.pending::after {
                    content: '⏳';
                    position: absolute;
                    right: 4px;
                    top: 4px;
                    font-size: 12px;
                    animation: pulse 1s infinite;
                }
                
                .attr-group.saved::after {
                    content: '✓';
                    position: absolute;
                    right: 4px;
                    top: 4px;
                    color: #28a745;
                    font-size: 12px;
                    animation: fadeInOut 1.5s ease-out;
                }

                .attr-group.updated {
                    background: linear-gradient(90deg, #e3f2fd, transparent);
                    animation: slideUpdate 0.5s ease-out;
                }
                
                .attr-group.updated::after {
                    content: '🔄';
                    position: absolute;
                    right: 4px;
                    top: 4px;
                    font-size: 12px;
                    animation: spin 0.5s ease-out;
                }
                
                @keyframes highlightUpdate {
                    0% { background: #bbdefb; }
                    100% { background: #e3f2fd; }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.1); }
                    100% { opacity: 0; transform: scale(1); }
                }

                @keyframes slideUpdate {
                    0% { 
                        background: linear-gradient(90deg, #2196f3, transparent);
                        transform: translateX(-10px);
                    }
                    100% { 
                        background: linear-gradient(90deg, #e3f2fd, transparent);
                        transform: translateX(0);
                    }
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .attr-label {
                    font-size: 12px;
                    color: #6c757d;
                    margin-bottom: 4px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .attr-display {
                    font-size: 14px;
                    color: #212529;
                    padding: 6px 8px;
                    border-radius: 4px;
                    cursor: ${this.allowEdit ? 'text' : 'default'};
                    border: 1px solid transparent;
                    transition: all 0.2s;
                    min-height: 20px;
                    word-break: break-word;
                }
                
                .attr-display:hover {
                    ${this.allowEdit ? 'background: #f8f9fa; border-color: #e9ecef;' : ''}
                }
                
                .attr-display.editable::after {
                    content: '✏️';
                    opacity: 0;
                    margin-left: 8px;
                    font-size: 12px;
                    transition: opacity 0.2s;
                }
                
                .attr-display.editable:hover::after {
                    opacity: ${this.allowEdit ? '0.6' : '0'};
                }
                
                .attr-input {
                    width: 100%;
                    padding: 6px 8px;
                    border: 2px solid #007bff;
                    border-radius: 4px;
                    font-size: 14px;
                    outline: none;
                    background: #fff;
                    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
                }
                
                .loading {
                    text-align: center;
                    padding: 20px;
                    color: #6c757d;
                }
                
                .error-state {
                    text-align: center;
                    padding: 20px;
                    color: #dc3545;
                }
                
                .last-update {
                    font-size: 11px;
                    color: #6c757d;
                    text-align: center;
                    margin-top: 12px;
                    padding-top: 8px;
                    border-top: 1px solid #e9ecef;
                }
                
                .header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .refresh-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 3px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                
                .refresh-btn:hover {
                    opacity: 1;
                    background: rgba(255,255,255,0.1);
                }
                
                .sync-indicator {
                    font-size: 12px;
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .sync-indicator.connected::before {
                    content: '🟢';
                    font-size: 8px;
                }
                
                .sync-indicator.disconnected::before {
                    content: '🔴';
                    font-size: 8px;
                }
                
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 4px;
                    color: white;
                    z-index: 1000;
                    transform: translateX(400px);
                    transition: transform 0.3s;
                }
                
                .notification.show {
                    transform: translateX(0);
                }
                
                .notification.success {
                    background: #28a745;
                }
                
                .notification.error {
                    background: #dc3545;
                }
                
                .notification.info {
                    background: #17a2b8;
                }
                
                @media (max-width: 768px) {
                    .attributes-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .contact-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                }
            </style>
            
            ${this.renderCard()}
            
            <div class="notification"></div>
        `;
        
        this.setupEventListeners();
    }

    /**
     * Renders the main card content
     */
    renderCard() {
        if (this.isLoading) {
            return '<div class="loading">Loading contact...</div>';
        }
        
        if (!this.entity) {
            return '<div class="error-state">Contact not found</div>';
        }
        
        return `
            ${this.showTitle ? this.renderHeader() : ''}
            <div class="contact-body">
                ${this.renderAttributes()}
                ${this.renderLastUpdate()}
            </div>
        `;
    }

    /**
     * Renders the card header
     */
    renderHeader() {
        const isConnected = this.wsSubscriptionId !== null;
        
        return `
            <div class="contact-header">
                <div>
                    <h3 class="contact-name">
                        👤 ${this.getDisplayName()}
                    </h3>
                    <span class="entity-type">${this.entityType}</span>
                </div>
                <div class="header-actions">
                    <div class="sync-indicator ${isConnected ? 'connected' : 'disconnected'}">
                        ${isConnected ? 'Live' : 'Offline'}
                    </div>
                    <button class="refresh-btn" title="Refresh data">🔄</button>
                </div>
            </div>
        `;
    }

    /**
     * Renders the attributes grid
     */
    renderAttributes() {
        return `
            <div class="attributes-grid">
                ${this.displayAttributes.map(attrName => this.renderAttribute(attrName)).join('')}
            </div>
        `;
    }

    /**
     * Renders a single attribute
     */
    renderAttribute(attributeName) {
        const isEditing = this.editingAttribute === attributeName;
        const isEditable = this.allowEdit && this.editableAttributes.includes(attributeName);
        const value = this.entity[attributeName] || '';
        const displayValue = this.getAttributeDisplayValue(attributeName);
        const label = this.getAttributeLabel(attributeName);
        
        return `
            <div class="attr-group" data-attribute="${attributeName}">
                <div class="attr-label">${label}</div>
                ${isEditing ? `
                    <input type="text" 
                           class="attr-input" 
                           data-attribute="${attributeName}"
                           value="${value}"
                           placeholder="Enter ${label.toLowerCase()}...">
                ` : `
                    <div class="attr-display ${isEditable ? 'editable' : ''}" 
                         data-attribute="${attributeName}">
                        ${displayValue || '<em style="color: #999;">Not set</em>'}
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Renders last update timestamp
     */
    renderLastUpdate() {
        if (!this.lastUpdateTime) return '';
        
        const timeAgo = this.getTimeAgo(this.lastUpdateTime);
        return `
            <div class="last-update">
                Last updated ${timeAgo}
            </div>
        `;
    }

    /**
     * Gets human-readable time difference
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffSecs < 60) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Updates entity attribute from external source (real-time sync)
     */
    updateEntityAttribute(attributeName, newValue) {
        if (!this.entity) return;
        
        console.log(`🔄 Updating contact card ${this.entityId} attribute ${attributeName}=${newValue}`);
        
        // Update entity data
        this.entity[attributeName] = newValue;
        
        // Update display immediately
        const attrElement = this.shadowRoot.querySelector(`[data-attribute="${attributeName}"]`);
        if (attrElement) {
            if (this.editableAttributes.includes(attributeName)) {
                // Update input value if editable
                const input = attrElement.querySelector('input, textarea, select');
                if (input && input !== document.activeElement) {
                    input.value = newValue || '';
                }
            } else {
                // Update display value if read-only
                const valueElement = attrElement.querySelector('.attribute-value');
                if (valueElement) {
                    valueElement.innerHTML = this.getAttributeDisplayValue(attributeName);
                }
            }
            
            // Show update indicator
            attrElement.classList.add('updated');
            setTimeout(() => {
                attrElement.classList.remove('updated');
            }, 2000);
        }
        
        // Update name display if name attributes changed
        if (['nome', 'cognome', 'name', 'surname'].includes(attributeName)) {
            const nameElement = this.shadowRoot.querySelector('.card-name');
            if (nameElement) {
                nameElement.textContent = this.getDisplayName();
            }
        }
        
        console.log(`✅ Contact card ${this.entityId} updated: ${attributeName}=${newValue}`);
    }
}

// Register the Web Component
customElements.define('realtime-contact-card', RealtimeContactCardComponent);