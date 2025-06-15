/**
 * <callsheet-module> Web Component
 * 
 * Manages a list of entities (like People) that belong to a ModuleInstance
 * with contextual attributes stored on the MEMBER_OF relationship (fee, role, etc.)
 * 
 * Features:
 * - Add/remove entities using entity-autocomplete
 * - Inline editing of contextual attributes
 * - Real-time synchronization across all instances
 * - Aggregate calculations (total fees, member count, etc.)
 * - Responsive design with mobile support
 */

class CallsheetModuleComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Configuration properties
        this.moduleId = '';
        this.moduleTitle = 'Callsheet';
        this.entityTypes = ['Persona', 'Contact', 'Person']; // Types of entities to allow
        this.allowAddMembers = true;
        this.allowRemoveMembers = true;
        this.allowEditAttributes = true;
        this.showAggregates = true;
        this.contextualAttributes = ['fee', 'role', 'startDate', 'endDate', 'notes']; // Editable attributes
        
        // State
        this.members = [];
        this.aggregates = null;
        this.isLoading = false;
        this.editingMember = null; // ID of member being edited
        this.wsSubscriptionId = null;
        
        // Services
        this.moduleRelationService = window.ModuleRelationService;
        this.entityService = window.EntityService;
        
        console.log('📋 CallsheetModule created');
    }

    static get observedAttributes() {
        return [
            'module-id',
            'module-title',
            'entity-types',
            'allow-add-members',
            'allow-remove-members', 
            'allow-edit-attributes',
            'show-aggregates',
            'contextual-attributes'
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'module-id':
                this.moduleId = newValue;
                break;
            case 'module-title':
                this.moduleTitle = newValue || 'Callsheet';
                break;
            case 'entity-types':
                this.entityTypes = newValue ? newValue.split(',').map(t => t.trim()) : ['Persona', 'Contact'];
                break;
            case 'allow-add-members':
                this.allowAddMembers = newValue !== 'false';
                break;
            case 'allow-remove-members':
                this.allowRemoveMembers = newValue !== 'false';
                break;
            case 'allow-edit-attributes':
                this.allowEditAttributes = newValue !== 'false';
                break;
            case 'show-aggregates':
                this.showAggregates = newValue !== 'false';
                break;
            case 'contextual-attributes':
                this.contextualAttributes = newValue ? newValue.split(',').map(a => a.trim()) : ['fee', 'role'];
                break;
        }
        
        this.render();
    }

    async connectedCallback() {
        if (!this.moduleId) {
            console.error('❌ module-id attribute is required for callsheet-module');
            return;
        }
        
        this.render();
        this.setupEventListeners();
        this.setupWebSocketSubscription();
        await this.loadData();
    }

    disconnectedCallback() {
        this.cleanupWebSocketSubscription();
    }

    /**
     * Sets up WebSocket subscription for real-time updates
     */
    setupWebSocketSubscription() {
        if (this.moduleRelationService && this.moduleId) {
            this.wsSubscriptionId = this.moduleRelationService.subscribeToModuleUpdates(
                this.moduleId,
                (update) => this.handleRealtimeUpdate(update)
            );
        }
    }

    /**
     * Cleans up WebSocket subscription
     */
    cleanupWebSocketSubscription() {
        if (this.wsSubscriptionId && this.moduleRelationService) {
            this.moduleRelationService.unsubscribeFromModuleUpdates(this.moduleId);
            this.wsSubscriptionId = null;
        }
    }

    /**
     * Handles real-time updates from WebSocket
     */
    async handleRealtimeUpdate(update) {
        console.log('🔄 Real-time update received:', update);
        
        // Reload data to reflect changes
        await this.loadData();
        
        // Show a brief notification
        this.showNotification(`Member ${update.changeType}: ${update.entityId}`, 'info');
    }

    /**
     * Loads module members and aggregates
     */
    async loadData() {
        if (!this.moduleRelationService || !this.moduleId) return;
        
        this.isLoading = true;
        this.render();
        
        try {
            // Load members and aggregates in parallel
            const [members, aggregates] = await Promise.all([
                this.moduleRelationService.getMembers(this.moduleId),
                this.showAggregates ? this.moduleRelationService.getAggregates(this.moduleId, 'fee') : Promise.resolve(null)
            ]);
            
            this.members = members;
            this.aggregates = aggregates;
            
            console.log(`✅ Loaded ${members.length} members for module ${this.moduleId}`);
            
        } catch (error) {
            console.error('❌ Error loading callsheet data:', error);
            this.showNotification('Error loading data: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    /**
     * Handles entity selection from autocomplete
     */
    async handleEntitySelected(event) {
        const { entity } = event.detail;
        
        if (!entity || !this.moduleRelationService) return;
        
        try {
            // Add entity to module with default attributes
            const defaultAttributes = {
                fee: '$0',
                role: 'Member',
                startDate: new Date().toISOString().split('T')[0],
                notes: ''
            };
            
            await this.moduleRelationService.addMember(this.moduleId, entity.id, defaultAttributes);
            
            // Reload data
            await this.loadData();
            
            this.showNotification(`Added ${this.getEntityDisplayName(entity)} to callsheet`, 'success');
            
        } catch (error) {
            console.error('❌ Error adding member:', error);
            this.showNotification('Error adding member: ' + error.message, 'error');
        }
    }

    /**
     * Handles entity creation request from autocomplete
     */
    handleCreateEntityRequested(event) {
        const { entityType, suggestedName } = event.detail;
        
        // For now, emit an event that parent components can handle
        this.dispatchEvent(new CustomEvent('create-entity-requested', {
            detail: { entityType, suggestedName, moduleId: this.moduleId },
            bubbles: true
        }));
    }

    /**
     * Handles removing a member
     */
    async handleRemoveMember(entityId) {
        if (!this.moduleRelationService) return;
        
        const member = this.members.find(m => m.entity.id === entityId);
        if (!member) return;
        
        if (!confirm(`Remove ${this.getEntityDisplayName(member.entity)} from callsheet?`)) {
            return;
        }
        
        try {
            await this.moduleRelationService.removeMember(this.moduleId, entityId);
            await this.loadData();
            
            this.showNotification(`Removed ${this.getEntityDisplayName(member.entity)} from callsheet`, 'success');
            
        } catch (error) {
            console.error('❌ Error removing member:', error);
            this.showNotification('Error removing member: ' + error.message, 'error');
        }
    }

    /**
     * Starts editing a member's attributes
     */
    startEditingMember(entityId) {
        this.editingMember = entityId;
        this.render();
        
        // Focus on first editable field
        setTimeout(() => {
            const firstInput = this.shadowRoot.querySelector('.member-attributes input, .member-attributes select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Saves member attribute changes
     */
    async saveMemberAttributes(entityId) {
        if (!this.moduleRelationService) return;
        
        const member = this.members.find(m => m.entity.id === entityId);
        if (!member) return;
        
        try {
            // Collect form data manually from inputs
            const memberElement = this.shadowRoot.querySelector(`[data-member-id="${entityId}"]`);
            const inputs = memberElement.querySelectorAll('.member-attributes input, .member-attributes select, .member-attributes textarea');
            
            const attributes = {};
            inputs.forEach(input => {
                if (input.name && input.name.startsWith('attr_')) {
                    const attrName = input.name.replace('attr_', '');
                    attributes[attrName] = input.value;
                }
            });
            
            await this.moduleRelationService.updateMemberAttributes(this.moduleId, entityId, attributes);
            
            this.editingMember = null;
            await this.loadData();
            
            this.showNotification('Attributes updated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Error updating member attributes:', error);
            this.showNotification('Error updating attributes: ' + error.message, 'error');
        }
    }

    /**
     * Cancels editing
     */
    cancelEditing() {
        this.editingMember = null;
        this.render();
    }

    /**
     * Gets display name for an entity
     */
    getEntityDisplayName(entity) {
        return entity.nome || entity.name || entity.title || entity.displayName || `Entity ${entity.id}`;
    }

    /**
     * Gets secondary name for an entity
     */
    getEntitySecondaryName(entity) {
        return entity.cognome || entity.surname || entity.lastName || '';
    }

    /**
     * Shows a notification message
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
            
            if (target.classList.contains('remove-member-btn')) {
                const entityId = target.getAttribute('data-entity-id');
                this.handleRemoveMember(entityId);
            }
            
            if (target.classList.contains('edit-member-btn')) {
                const entityId = target.getAttribute('data-entity-id');
                this.startEditingMember(entityId);
            }
            
            if (target.classList.contains('save-attributes-btn')) {
                const entityId = target.getAttribute('data-entity-id');
                this.saveMemberAttributes(entityId);
            }
            
            if (target.classList.contains('cancel-edit-btn')) {
                this.cancelEditing();
            }
            
            if (target.classList.contains('refresh-btn')) {
                this.loadData();
            }
        });
        
        // Entity autocomplete events
        this.shadowRoot.addEventListener('entity-selected', (e) => {
            this.handleEntitySelected(e);
        });
        
        this.shadowRoot.addEventListener('create-entity-requested', (e) => {
            this.handleCreateEntityRequested(e);
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
                }
                
                .callsheet-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .callsheet-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .callsheet-stats {
                    font-size: 14px;
                    opacity: 0.9;
                }
                
                .callsheet-body {
                    padding: 16px;
                }
                
                .add-member-section {
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 6px;
                    margin-bottom: 16px;
                }
                
                .add-member-label {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #495057;
                }
                
                .members-list {
                    margin-top: 16px;
                }
                
                .member-item {
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                }
                
                .member-item:hover {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .member-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .member-name {
                    font-weight: 500;
                    color: #212529;
                }
                
                .member-type {
                    background: #e9ecef;
                    color: #6c757d;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                
                .member-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .btn {
                    padding: 4px 8px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }
                
                .btn-sm {
                    padding: 2px 6px;
                    font-size: 11px;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #0056b3;
                }
                
                .btn-success {
                    background: #28a745;
                    color: white;
                }
                
                .btn-success:hover {
                    background: #1e7e34;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background: #545b62;
                }
                
                .btn-danger {
                    background: #dc3545;
                    color: white;
                }
                
                .btn-danger:hover {
                    background: #c82333;
                }
                
                .member-attributes {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 8px;
                    margin-top: 8px;
                    padding: 8px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                
                .member-attributes.editing {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                }
                
                .attr-group {
                    display: flex;
                    flex-direction: column;
                }
                
                .attr-label {
                    font-size: 12px;
                    color: #6c757d;
                    margin-bottom: 2px;
                    text-transform: capitalize;
                }
                
                .attr-value {
                    font-size: 14px;
                    color: #212529;
                }
                
                .attr-input {
                    padding: 4px 6px;
                    border: 1px solid #ced4da;
                    border-radius: 3px;
                    font-size: 14px;
                }
                
                .edit-actions {
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                
                .aggregates-section {
                    background: #e3f2fd;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 16px;
                }
                
                .aggregates-title {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #1565c0;
                }
                
                .aggregates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                }
                
                .aggregate-item {
                    text-align: center;
                }
                
                .aggregate-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1565c0;
                }
                
                .aggregate-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                }
                
                .loading {
                    text-align: center;
                    padding: 20px;
                    color: #6c757d;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 32px;
                    color: #6c757d;
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
                
                @media (max-width: 768px) {
                    .member-attributes {
                        grid-template-columns: 1fr;
                    }
                    
                    .aggregates-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .member-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                }
            </style>
            
            <div class="callsheet-header">
                <h3 class="callsheet-title">
                    📋 ${this.moduleTitle}
                    ${this.members.length > 0 ? `(${this.members.length})` : ''}
                </h3>
                <div class="callsheet-actions">
                    <button class="refresh-btn" title="Refresh data">🔄</button>
                </div>
            </div>
            
            <div class="callsheet-body">
                ${this.renderAddMemberSection()}
                ${this.renderMembersList()}
                ${this.renderAggregates()}
            </div>
            
            <div class="notification"></div>
        `;
    }

    /**
     * Renders the add member section
     */
    renderAddMemberSection() {
        if (!this.allowAddMembers) return '';
        
        return `
            <div class="add-member-section">
                <div class="add-member-label">Add New Member:</div>
                <entity-autocomplete 
                    entity-types="${this.entityTypes.join(',')}"
                    placeholder="Search for person to add..."
                    allow-create="true">
                </entity-autocomplete>
            </div>
        `;
    }

    /**
     * Renders the members list
     */
    renderMembersList() {
        if (this.isLoading) {
            return '<div class="loading">Loading members...</div>';
        }
        
        if (this.members.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <div>No members in this callsheet yet.</div>
                    ${this.allowAddMembers ? '<div style="margin-top: 8px; font-size: 14px; color: #999;">Use the search above to add people.</div>' : ''}
                </div>
            `;
        }
        
        return `
            <div class="members-list">
                ${this.members.map(member => this.renderMemberItem(member)).join('')}
            </div>
        `;
    }

    /**
     * Renders a single member item
     */
    renderMemberItem(member) {
        const entity = member.entity;
        const attributes = member.relationAttributes;
        const isEditing = this.editingMember === entity.id;
        
        const displayName = this.getEntityDisplayName(entity);
        const secondaryName = this.getEntitySecondaryName(entity);
        const fullName = secondaryName ? `${displayName} ${secondaryName}` : displayName;
        
        return `
            <div class="member-item" data-member-id="${entity.id}">
                <div class="member-header">
                    <div>
                        <div class="member-name">${fullName}</div>
                        ${entity.email ? `<div style="font-size: 12px; color: #6c757d;">${entity.email}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="member-type">${entity.entityType}</span>
                        <div class="member-actions">
                            ${this.allowEditAttributes ? `<button class="btn btn-sm btn-primary edit-member-btn" data-entity-id="${entity.id}">✏️</button>` : ''}
                            ${this.allowRemoveMembers ? `<button class="btn btn-sm btn-danger remove-member-btn" data-entity-id="${entity.id}">✖</button>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="member-attributes ${isEditing ? 'editing' : ''}">
                    ${this.renderMemberAttributes(entity.id, attributes, isEditing)}
                </div>
                
                ${isEditing ? this.renderEditActions(entity.id) : ''}
            </div>
        `;
    }

    /**
     * Renders member attributes (view or edit mode)
     */
    renderMemberAttributes(entityId, attributes, isEditing) {
        return this.contextualAttributes.map(attrName => {
            const value = attributes[attrName] || '';
            
            if (isEditing) {
                if (attrName === 'role') {
                    return `
                        <div class="attr-group">
                            <label class="attr-label">${attrName}</label>
                            <select name="attr_${attrName}" class="attr-input">
                                <option value="Member" ${value === 'Member' ? 'selected' : ''}>Member</option>
                                <option value="Lead" ${value === 'Lead' ? 'selected' : ''}>Lead</option>
                                <option value="Producer" ${value === 'Producer' ? 'selected' : ''}>Producer</option>
                                <option value="Director" ${value === 'Director' ? 'selected' : ''}>Director</option>
                                <option value="Actor" ${value === 'Actor' ? 'selected' : ''}>Actor</option>
                                <option value="Crew" ${value === 'Crew' ? 'selected' : ''}>Crew</option>
                                <option value="Other" ${value === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    `;
                } else if (attrName.includes('Date')) {
                    return `
                        <div class="attr-group">
                            <label class="attr-label">${attrName}</label>
                            <input type="date" name="attr_${attrName}" value="${value}" class="attr-input">
                        </div>
                    `;
                } else if (attrName === 'notes') {
                    return `
                        <div class="attr-group">
                            <label class="attr-label">${attrName}</label>
                            <textarea name="attr_${attrName}" class="attr-input" rows="2">${value}</textarea>
                        </div>
                    `;
                } else {
                    return `
                        <div class="attr-group">
                            <label class="attr-label">${attrName}</label>
                            <input type="text" name="attr_${attrName}" value="${value}" class="attr-input">
                        </div>
                    `;
                }
            } else {
                return `
                    <div class="attr-group">
                        <div class="attr-label">${attrName}</div>
                        <div class="attr-value">${value || '—'}</div>
                    </div>
                `;
            }
        }).join('');
    }

    /**
     * Renders edit action buttons
     */
    renderEditActions(entityId) {
        return `
            <div class="edit-actions">
                <button class="btn btn-success save-attributes-btn" data-entity-id="${entityId}">💾 Save</button>
                <button class="btn btn-secondary cancel-edit-btn">✖ Cancel</button>
            </div>
        `;
    }

    /**
     * Renders aggregates section
     */
    renderAggregates() {
        if (!this.showAggregates || !this.aggregates) return '';
        
        const formatCurrency = (amount) => {
            if (typeof amount === 'number') {
                return `$${amount.toLocaleString()}`;
            }
            return amount || '$0';
        };
        
        return `
            <div class="aggregates-section">
                <div class="aggregates-title">📊 Summary</div>
                <div class="aggregates-grid">
                    <div class="aggregate-item">
                        <div class="aggregate-value">${this.aggregates.totalMembers}</div>
                        <div class="aggregate-label">Total Members</div>
                    </div>
                    <div class="aggregate-item">
                        <div class="aggregate-value">${formatCurrency(this.aggregates.totalAmount)}</div>
                        <div class="aggregate-label">Total Fees</div>
                    </div>
                    <div class="aggregate-item">
                        <div class="aggregate-value">${formatCurrency(this.aggregates.averageAmount)}</div>
                        <div class="aggregate-label">Average Fee</div>
                    </div>
                    <div class="aggregate-item">
                        <div class="aggregate-value">${this.aggregates.roles.length}</div>
                        <div class="aggregate-label">Unique Roles</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Register the Web Component
customElements.define('callsheet-module', CallsheetModuleComponent);