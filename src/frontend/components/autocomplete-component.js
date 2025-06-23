/**
 * AutocompleteComponent - Reusable component for entity reference fields
 * 
 * This component provides a rich autocomplete interface for selecting entities
 * in reference columns. It supports search, creation of new entities, and
 * displays the selected entity with proper formatting.
 */

class AutocompleteComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            initialEntityId: null,
            targetEntityType: 'Entity',
            onSelect: () => {},
            placeholder: 'Seleziona o cerca entità...',
            allowCreate: true,
            displayAttribute: 'name',
            ...options
        };
        
        // Component state
        this.selectedEntity = null;
        this.isSearchMode = false;
        this.searchTimeout = null;
        this.activeDropdown = null;
        
        // Services
        this.entityManager = window.EntityService || window.entityManager;
        this.schemaService = window.SchemaService || window.schemaService;
        
        this.init();
    }
    
    async init() {
        // Load initial entity if provided
        if (this.options.initialEntityId) {
            await this.loadInitialEntity();
        }
        
        this.render();
        this.bindEvents();
    }
    
    async loadInitialEntity() {
        try {
            if (this.entityManager.getEntity) {
                this.selectedEntity = this.entityManager.getEntity(this.options.initialEntityId);
            } else if (this.entityManager.entities) {
                this.selectedEntity = this.entityManager.entities.get(this.options.initialEntityId);
            }
            
            if (!this.selectedEntity && this.entityManager.searchEntities) {
                // Try to fetch from backend
                const result = await this.entityManager.searchEntities({
                    entityType: this.options.targetEntityType,
                    query: this.options.initialEntityId,
                    limit: 1
                });
                
                const entities = result?.data || [];
                if (entities.length > 0) {
                    this.selectedEntity = entities[0];
                }
            }
        } catch (error) {
            console.error('Error loading initial entity:', error);
        }
    }
    
    render() {
        this.container.innerHTML = '';
        this.container.className = 'autocomplete-component';
        
        if (this.isSearchMode || !this.selectedEntity) {
            this.renderSearchMode();
        } else {
            this.renderDisplayMode();
        }
    }
    
    renderDisplayMode() {
        const wrapper = document.createElement('div');
        wrapper.className = 'entity-display';
        
        const displayValue = this.getDisplayValue(this.selectedEntity);
        
        wrapper.innerHTML = `
            <span class="entity-name">${displayValue}</span>
            <span class="entity-type">${this.selectedEntity.entityType || this.options.targetEntityType}</span>
            <button class="change-btn" title="Cambia selezione">✏️</button>
            <button class="clear-btn" title="Rimuovi selezione">×</button>
        `;
        
        this.container.appendChild(wrapper);
    }
    
    renderSearchMode() {
        const wrapper = document.createElement('div');
        wrapper.className = 'entity-search';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-input';
        input.placeholder = this.options.placeholder;
        input.value = '';
        
        wrapper.appendChild(input);
        
        // Dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'search-dropdown';
        dropdown.style.display = 'none';
        wrapper.appendChild(dropdown);
        
        this.container.appendChild(wrapper);
        
        // Focus the input
        setTimeout(() => input.focus(), 0);
    }
    
    bindEvents() {
        if (this.isSearchMode || !this.selectedEntity) {
            this.bindSearchEvents();
        } else {
            this.bindDisplayEvents();
        }
    }
    
    bindDisplayEvents() {
        const changeBtn = this.container.querySelector('.change-btn');
        const clearBtn = this.container.querySelector('.clear-btn');
        
        if (changeBtn) {
            changeBtn.onclick = () => {
                this.enterSearchMode();
            };
        }
        
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.clearSelection();
            };
        }
        
        // Click on display to edit
        const entityDisplay = this.container.querySelector('.entity-display');
        if (entityDisplay) {
            entityDisplay.onclick = (e) => {
                // Don't trigger if clicking on buttons
                if (!e.target.closest('button')) {
                    this.enterSearchMode();
                }
            };
        }
    }
    
    bindSearchEvents() {
        const input = this.container.querySelector('.search-input');
        const dropdown = this.container.querySelector('.search-dropdown');
        
        if (!input || !dropdown) return;
        
        // Search on input
        input.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            this.handleKeydown(e, dropdown);
        });
        
        // Blur handling
        input.addEventListener('blur', () => {
            // Delay to allow click on dropdown
            setTimeout(() => {
                if (!this.container.contains(document.activeElement)) {
                    this.exitSearchMode();
                }
            }, 200);
        });
        
        // Enter key handling
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnterKey(input.value);
            }
        });
    }
    
    async performSearch(query) {
        if (!query || query.length < 2) {
            this.hideDropdown();
            return;
        }
        
        try {
            let suggestions = [];
            
            // Search entities
            if (this.entityManager.searchEntities) {
                const result = await this.entityManager.searchEntities({
                    entityType: this.options.targetEntityType,
                    query,
                    limit: 10
                });
                suggestions = result?.data || [];
            }
            
            // Add create option if no exact match
            const exactMatch = suggestions.find(entity => {
                const displayValue = this.getDisplayValue(entity);
                return displayValue.toLowerCase() === query.toLowerCase();
            });
            
            if (!exactMatch && this.options.allowCreate) {
                suggestions.push({
                    id: 'CREATE_NEW',
                    [this.options.displayAttribute]: query,
                    entityType: this.options.targetEntityType,
                    _isCreateNew: true,
                    _createValue: query
                });
            }
            
            this.showDropdown(suggestions);
            
        } catch (error) {
            console.error('Error searching entities:', error);
        }
    }
    
    showDropdown(suggestions) {
        const dropdown = this.container.querySelector('.search-dropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        dropdown.style.display = 'block';
        
        if (suggestions.length === 0) {
            dropdown.innerHTML = '<div class="no-results">Nessun risultato trovato</div>';
            return;
        }
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            
            if (suggestion._isCreateNew) {
                item.classList.add('create-new-item');
                item.innerHTML = `
                    <span class="create-text">Crea nuovo: "${suggestion._createValue}"</span>
                    <span class="entity-type-indicator">${this.options.targetEntityType}</span>
                `;
            } else {
                const displayValue = this.getDisplayValue(suggestion);
                item.innerHTML = `
                    <span class="entity-name">${displayValue}</span>
                    <span class="entity-type-indicator">${suggestion.entityType || this.options.targetEntityType}</span>
                `;
            }
            
            // Highlight first item
            if (index === 0) {
                item.classList.add('highlighted');
            }
            
            item.onclick = () => {
                this.selectEntity(suggestion);
            };
            
            dropdown.appendChild(item);
        });
        
        this.activeDropdown = dropdown;
    }
    
    hideDropdown() {
        const dropdown = this.container.querySelector('.search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
        }
        this.activeDropdown = null;
    }
    
    handleKeydown(e, dropdown) {
        if (!dropdown || dropdown.style.display === 'none') return;
        
        const items = dropdown.querySelectorAll('.dropdown-item');
        let highlightedIndex = Array.from(items).findIndex(item => 
            item.classList.contains('highlighted')
        );
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
                this.highlightItem(items, highlightedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, 0);
                this.highlightItem(items, highlightedIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && items[highlightedIndex]) {
                    items[highlightedIndex].click();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.exitSearchMode();
                break;
        }
    }
    
    highlightItem(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }
    
    async handleEnterKey(query) {
        if (!query.trim()) {
            this.exitSearchMode();
            return;
        }
        
        // Check if we have a highlighted item
        const dropdown = this.container.querySelector('.search-dropdown');
        if (dropdown) {
            const highlighted = dropdown.querySelector('.highlighted');
            if (highlighted) {
                highlighted.click();
                return;
            }
        }
        
        // Create new entity with the query text
        await this.createNewEntity(query);
    }
    
    async selectEntity(entity) {
        if (entity._isCreateNew) {
            await this.createNewEntity(entity._createValue);
        } else {
            this.selectedEntity = entity;
            this.isSearchMode = false;
            this.hideDropdown();
            this.render();
            this.bindEvents();
            
            // Notify parent
            this.options.onSelect(entity.id, entity);
        }
    }
    
    async createNewEntity(name) {
        try {
            const initialData = {
                [this.options.displayAttribute]: name,
                entityType: this.options.targetEntityType
            };
            
            let newEntity;
            
            if (this.entityManager.createEntity) {
                const result = await this.entityManager.createEntity(
                    this.options.targetEntityType,
                    initialData
                );
                newEntity = result?.data || result;
            }
            
            if (newEntity && newEntity.id) {
                this.selectedEntity = newEntity;
                this.isSearchMode = false;
                this.hideDropdown();
                this.render();
                this.bindEvents();
                
                // Notify parent
                this.options.onSelect(newEntity.id, newEntity);
            }
            
        } catch (error) {
            console.error('Error creating entity:', error);
            alert('Errore nella creazione dell\'entità');
        }
    }
    
    enterSearchMode() {
        this.isSearchMode = true;
        this.render();
        this.bindEvents();
    }
    
    exitSearchMode() {
        this.isSearchMode = false;
        this.hideDropdown();
        this.render();
        this.bindEvents();
    }
    
    clearSelection() {
        this.selectedEntity = null;
        this.isSearchMode = true;
        this.render();
        this.bindEvents();
        
        // Notify parent
        this.options.onSelect(null, null);
    }
    
    getDisplayValue(entity) {
        if (!entity) return '';
        
        const displayAttr = this.options.displayAttribute;
        return entity[displayAttr] || entity.name || entity.id || 'Unknown';
    }
    
    // Public methods
    setValue(entityId) {
        this.options.initialEntityId = entityId;
        this.loadInitialEntity().then(() => {
            this.render();
            this.bindEvents();
        });
    }
    
    getValue() {
        return this.selectedEntity?.id || null;
    }
    
    getEntity() {
        return this.selectedEntity;
    }
    
    destroy() {
        clearTimeout(this.searchTimeout);
        this.hideDropdown();
        this.container.innerHTML = '';
    }
}

// CSS Styles for the component
const autocompleteStyles = `
    .autocomplete-component {
        position: relative;
        width: 100%;
    }
    
    .entity-display {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 32px;
    }
    
    .entity-display:hover {
        background: #f8f9fa;
        border-color: #dee2e6;
    }
    
    .entity-display .entity-name {
        flex: 1;
        font-weight: 500;
        color: #495057;
    }
    
    .entity-display .entity-type {
        font-size: 0.8em;
        color: #6c757d;
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
    }
    
    .entity-display .change-btn,
    .entity-display .clear-btn {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        padding: 2px 4px;
        border-radius: 3px;
    }
    
    .entity-display:hover .change-btn,
    .entity-display:hover .clear-btn {
        opacity: 0.7;
    }
    
    .entity-display .change-btn:hover,
    .entity-display .clear-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
    }
    
    .entity-search {
        position: relative;
    }
    
    .search-input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.2s;
    }
    
    .search-input:focus {
        border-color: #4CAF50;
        outline: none;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.25);
    }
    
    .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .dropdown-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        transition: background 0.2s;
        border-bottom: 1px solid #f8f9fa;
    }
    
    .dropdown-item:last-child {
        border-bottom: none;
    }
    
    .dropdown-item:hover,
    .dropdown-item.highlighted {
        background: #f8f9fa;
    }
    
    .dropdown-item.create-new-item {
        background: #e8f5e9;
        font-style: italic;
    }
    
    .dropdown-item.create-new-item:hover,
    .dropdown-item.create-new-item.highlighted {
        background: #d4edda;
    }
    
    .dropdown-item .create-text {
        color: #28a745;
        font-weight: 500;
    }
    
    .dropdown-item .entity-type-indicator {
        font-size: 0.8em;
        color: #6c757d;
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
    }
    
    .no-results {
        padding: 12px;
        text-align: center;
        color: #6c757d;
        font-style: italic;
    }
`;

// Add styles to document if not already present
if (!document.getElementById('autocomplete-component-styles')) {
    const style = document.createElement('style');
    style.id = 'autocomplete-component-styles';
    style.textContent = autocompleteStyles;
    document.head.appendChild(style);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutocompleteComponent;
} else {
    window.AutocompleteComponent = AutocompleteComponent;
}