/**
 * attribute-editor.js - Web Component per editing attributi con validazione schema-aware
 * 
 * Caratteristiche:
 * - Input editabile basato sul tipo schema (string, email, number, date, select)
 * - Validazione real-time usando SchemaService
 * - Gestione focus corretto
 * - Eventi personalizzati per propagazione cambiamenti
 * - Supporto azioni (save, cancel)
 * - Integrazione EntityService per persistenza
 */

class AttributeEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Stato del componente
        this.originalValue = null;
        this.currentValue = null;
        this.attributeInfo = null;
        this.isValidating = false;
        this.validationResult = { isValid: true, message: '' };
        this.isDirty = false;
        
        // Debounce per validazione
        this.validationTimeout = null;
        this.validationDelay = 300;
        
        // Binding metodi
        this.handleInput = this.handleInput.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }

    static get observedAttributes() {
        return [
            'attribute-name', 'value', 'entity-id', 'entity-type',
            'readonly', 'required', 'placeholder', 'show-actions'
        ];
    }

    connectedCallback() {
        this.loadAttributeInfo();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.isConnected) {
            if (name === 'value') {
                this.originalValue = newValue;
                this.currentValue = newValue;
                this.isDirty = false;
                this.render();
            } else if (['attribute-name', 'entity-type'].includes(name)) {
                this.loadAttributeInfo();
            } else {
                this.render();
            }
        }
    }

    /**
     * Carica informazioni schema per l'attributo
     */
    async loadAttributeInfo() {
        const attributeName = this.getAttribute('attribute-name');
        const entityType = this.getAttribute('entity-type');
        
        if (!attributeName || !entityType) {
            console.warn('⚠️ [attribute-editor] attribute-name e entity-type richiesti');
            return;
        }

        if (!window.SchemaService) {
            console.warn('⚠️ [attribute-editor] SchemaService non disponibile');
            return;
        }

        try {
            console.log(`🔄 [attribute-editor] Caricamento info attributo: ${entityType}.${attributeName}`);
            this.attributeInfo = await window.SchemaService.getAttributeInfo(entityType, attributeName);
            console.log(`✅ [attribute-editor] Info attributo caricata: ${attributeName}`, this.attributeInfo);
            
            // Inizializza valori se non presenti
            if (this.originalValue === null) {
                this.originalValue = this.getAttribute('value') || '';
                this.currentValue = this.originalValue;
            }
            
            this.render();
        } catch (error) {
            console.error('❌ [attribute-editor] Errore caricamento info attributo:', error);
        }
    }

    /**
     * Renderizza il componente
     */
    render() {
        if (!this.attributeInfo) {
            this.renderLoading();
            return;
        }

        const attributeName = this.getAttribute('attribute-name');
        const readonly = this.hasAttribute('readonly');
        const showActions = this.hasAttribute('show-actions');
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
            </style>
            <div class="editor-container">
                <div class="input-group">
                    <label class="input-label" for="input">${this.getDisplayLabel()}</label>
                    ${this.renderInput()}
                    ${this.renderValidationMessage()}
                </div>
                ${showActions ? this.renderActions() : ''}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Renderizza stato di caricamento
     */
    renderLoading() {
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getBaseStyles()}
            </style>
            <div class="editor-container">
                <div class="loading">Caricamento...</div>
            </div>
        `;
    }

    /**
     * Renderizza l'input appropriato basato sul tipo
     */
    renderInput() {
        const readonly = this.hasAttribute('readonly');
        const required = this.hasAttribute('required') || this.attributeInfo.required;
        const placeholder = this.getAttribute('placeholder') || this.getPlaceholderFromType();
        
        const commonAttributes = `
            id="input"
            ${readonly ? 'readonly' : ''}
            ${required ? 'required' : ''}
            placeholder="${placeholder}"
            value="${this.escapeHtml(this.currentValue || '')}"
        `;

        switch (this.attributeInfo.type) {
            case 'email':
                return `<input type="email" ${commonAttributes} class="input-field ${this.getValidationClass()}" />`;
            
            case 'number':
            case 'integer':
                return `<input type="number" ${commonAttributes} class="input-field ${this.getValidationClass()}" />`;
            
            case 'date':
                const dateValue = this.formatDateForInput(this.currentValue);
                return `<input type="date" ${commonAttributes.replace(this.currentValue, dateValue)} class="input-field ${this.getValidationClass()}" />`;
            
            case 'datetime':
                const datetimeValue = this.formatDatetimeForInput(this.currentValue);
                return `<input type="datetime-local" ${commonAttributes.replace(this.currentValue, datetimeValue)} class="input-field ${this.getValidationClass()}" />`;
            
            case 'select':
                return this.renderSelectInput(commonAttributes);
            
            case 'textarea':
            case 'longtext':
                return `<textarea ${commonAttributes} class="input-field textarea-field ${this.getValidationClass()}" rows="3">${this.escapeHtml(this.currentValue || '')}</textarea>`;
            
            case 'boolean':
                const checked = this.currentValue === 'true' || this.currentValue === true;
                return `<input type="checkbox" id="input" ${checked ? 'checked' : ''} ${readonly ? 'disabled' : ''} class="checkbox-field" />`;
            
            default:
                return `<input type="text" ${commonAttributes} class="input-field ${this.getValidationClass()}" />`;
        }
    }

    /**
     * Renderizza select input con opzioni
     */
    renderSelectInput(commonAttributes) {
        const options = this.attributeInfo.options || [];
        const readonly = this.hasAttribute('readonly');
        
        const optionsHtml = options.map(option => {
            const value = typeof option === 'object' ? option.value : option;
            const label = typeof option === 'object' ? option.label : option;
            const selected = value === this.currentValue ? 'selected' : '';
            return `<option value="${this.escapeHtml(value)}" ${selected}>${this.escapeHtml(label)}</option>`;
        }).join('');

        return `
            <select id="input" ${readonly ? 'disabled' : ''} class="input-field select-field ${this.getValidationClass()}">
                <option value="">-- Seleziona --</option>
                ${optionsHtml}
            </select>
        `;
    }

    /**
     * Renderizza messaggio di validazione
     */
    renderValidationMessage() {
        if (this.isValidating) {
            return '<div class="validation-message validating">Validazione in corso...</div>';
        }
        
        if (!this.validationResult.isValid && this.validationResult.message) {
            return `<div class="validation-message error">${this.validationResult.message}</div>`;
        }
        
        if (this.isDirty && this.validationResult.isValid) {
            return '<div class="validation-message success">✓ Valore valido</div>';
        }
        
        return '';
    }

    /**
     * Renderizza azioni (save/cancel)
     */
    renderActions() {
        const canSave = this.isDirty && this.validationResult.isValid;
        
        return `
            <div class="actions">
                <button class="action-button save-button" ${!canSave ? 'disabled' : ''}>
                    💾 Salva
                </button>
                <button class="action-button cancel-button" ${!this.isDirty ? 'disabled' : ''}>
                    ❌ Annulla
                </button>
            </div>
        `;
    }

    /**
     * Gestori eventi
     */
    attachEventListeners() {
        const input = this.shadowRoot.getElementById('input');
        if (!input) return;

        input.addEventListener('input', this.handleInput);
        input.addEventListener('blur', this.handleBlur);
        input.addEventListener('keydown', this.handleKeyDown);

        // Azioni
        const saveButton = this.shadowRoot.querySelector('.save-button');
        const cancelButton = this.shadowRoot.querySelector('.cancel-button');
        
        if (saveButton) saveButton.addEventListener('click', this.handleSave);
        if (cancelButton) cancelButton.addEventListener('click', this.handleCancel);
    }

    /**
     * Gestisce input dell'utente
     */
    handleInput(event) {
        const input = event.target;
        const newValue = this.attributeInfo.type === 'boolean' ? input.checked : input.value;
        
        this.currentValue = newValue;
        this.isDirty = this.currentValue !== this.originalValue;
        
        // Debounce validazione
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            this.validateValue();
        }, this.validationDelay);

        // Evento per notificare cambiamento
        this.dispatchEvent(new CustomEvent('value-changing', {
            detail: {
                attributeName: this.getAttribute('attribute-name'),
                oldValue: this.originalValue,
                newValue: this.currentValue,
                isDirty: this.isDirty,
                isValid: this.validationResult.isValid
            },
            bubbles: true
        }));
    }

    /**
     * Gestisce blur (perdita focus)
     */
    handleBlur(event) {
        clearTimeout(this.validationTimeout);
        this.validateValue();
    }

    /**
     * Gestisce pressione tasti (Enter = save, Esc = cancel)
     */
    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (this.isDirty && this.validationResult.isValid) {
                this.handleSave();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.handleCancel();
        }
    }

    /**
     * Gestisce salvataggio
     */
    async handleSave() {
        if (!this.isDirty || !this.validationResult.isValid) return;

        const entityId = this.getAttribute('entity-id');
        const attributeName = this.getAttribute('attribute-name');

        if (!entityId || !attributeName) {
            console.error('❌ [attribute-editor] entity-id e attribute-name richiesti per salvare');
            return;
        }

        try {
            console.log(`💾 [attribute-editor] Salvando ${attributeName}: ${this.originalValue} -> ${this.currentValue}`);

            // Usa EntityService per persistere
            if (window.EntityService) {
                await window.EntityService.updateEntityAttribute(entityId, attributeName, this.currentValue);
            }

            // Aggiorna stato
            this.originalValue = this.currentValue;
            this.isDirty = false;

            // Evento per notificare salvataggio completato
            this.dispatchEvent(new CustomEvent('value-saved', {
                detail: {
                    attributeName,
                    oldValue: this.originalValue,
                    newValue: this.currentValue,
                    entityId
                },
                bubbles: true
            }));

            this.render();
            console.log(`✅ [attribute-editor] Salvato ${attributeName}`);

        } catch (error) {
            console.error('❌ [attribute-editor] Errore salvataggio:', error);
            
            this.dispatchEvent(new CustomEvent('save-error', {
                detail: { error: error.message, attributeName },
                bubbles: true
            }));
        }
    }

    /**
     * Gestisce annullamento
     */
    handleCancel() {
        this.currentValue = this.originalValue;
        this.isDirty = false;
        this.validationResult = { isValid: true, message: '' };
        
        this.dispatchEvent(new CustomEvent('value-cancelled', {
            detail: {
                attributeName: this.getAttribute('attribute-name'),
                revertedTo: this.originalValue
            },
            bubbles: true
        }));

        this.render();
    }

    /**
     * Valida il valore corrente
     */
    async validateValue() {
        if (!this.attributeInfo || !window.SchemaService) {
            this.validationResult = { isValid: true, message: '' };
            return;
        }

        this.isValidating = true;
        this.render();

        try {
            const entityType = this.getAttribute('entity-type');
            const attributeName = this.getAttribute('attribute-name');
            
            this.validationResult = await window.SchemaService.validateAttributeValue(
                entityType, 
                attributeName, 
                this.currentValue
            );

        } catch (error) {
            console.error('❌ [attribute-editor] Errore validazione:', error);
            this.validationResult = { 
                isValid: false, 
                message: 'Errore durante la validazione' 
            };
        }

        this.isValidating = false;
        this.render();
    }

    /**
     * Utilità per UI
     */
    getDisplayLabel() {
        const attributeName = this.getAttribute('attribute-name');
        return this.attributeInfo.description || this.attributeInfo.label || attributeName;
    }

    getPlaceholderFromType() {
        const type = this.attributeInfo.type;
        const placeholders = {
            'email': 'esempio@email.com',
            'number': '123',
            'date': 'YYYY-MM-DD',
            'datetime': 'YYYY-MM-DD HH:mm',
            'text': 'Inserisci testo...'
        };
        return placeholders[type] || 'Inserisci valore...';
    }

    getValidationClass() {
        if (this.isValidating) return 'validating';
        if (!this.validationResult.isValid) return 'invalid';
        if (this.isDirty && this.validationResult.isValid) return 'valid';
        return '';
    }

    formatDateForInput(value) {
        if (!value) return '';
        try {
            const date = new Date(value);
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    formatDatetimeForInput(value) {
        if (!value) return '';
        try {
            const date = new Date(value);
            return date.toISOString().slice(0, 16);
        } catch {
            return '';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * API pubbliche
     */
    getValue() {
        return this.currentValue;
    }

    setValue(value) {
        this.currentValue = value;
        this.originalValue = value;
        this.isDirty = false;
        this.render();
    }

    focus() {
        const input = this.shadowRoot.getElementById('input');
        if (input) input.focus();
    }

    /**
     * Stili del componente
     */
    getBaseStyles() {
        return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .editor-container {
                width: 100%;
            }

            .input-group {
                margin-bottom: 1rem;
            }

            .input-label {
                display: block;
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
                margin-bottom: 0.25rem;
            }

            .input-field {
                width: 100%;
                padding: 0.5rem 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                font-size: 0.875rem;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .input-field:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .input-field.validating {
                border-color: #f59e0b;
                background-color: #fffbeb;
            }

            .input-field.valid {
                border-color: #10b981;
                background-color: #f0fdf4;
            }

            .input-field.invalid {
                border-color: #ef4444;
                background-color: #fef2f2;
            }

            .textarea-field {
                resize: vertical;
                min-height: 3rem;
            }

            .checkbox-field {
                width: auto;
                margin-right: 0.5rem;
            }

            .validation-message {
                font-size: 0.75rem;
                margin-top: 0.25rem;
                padding: 0.25rem;
                border-radius: 0.25rem;
            }

            .validation-message.validating {
                color: #f59e0b;
                background-color: #fffbeb;
            }

            .validation-message.success {
                color: #10b981;
                background-color: #f0fdf4;
            }

            .validation-message.error {
                color: #ef4444;
                background-color: #fef2f2;
            }

            .actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
            }

            .action-button {
                padding: 0.375rem 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                background-color: white;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-button:hover:not(:disabled) {
                background-color: #f9fafb;
            }

            .action-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .save-button:not(:disabled) {
                background-color: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }

            .save-button:hover:not(:disabled) {
                background-color: #2563eb;
            }

            .cancel-button:not(:disabled) {
                background-color: #ef4444;
                color: white;
                border-color: #ef4444;
            }

            .cancel-button:hover:not(:disabled) {
                background-color: #dc2626;
            }

            .loading {
                color: #6b7280;
                font-style: italic;
                padding: 0.5rem;
            }
        `;
    }
}

// Registra il Web Component
customElements.define('attribute-editor', AttributeEditor);

console.log('✅ [attribute-editor] Web Component registrato'); 