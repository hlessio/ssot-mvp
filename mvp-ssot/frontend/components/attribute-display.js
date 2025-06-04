/**
 * attribute-display.js - Web Component per visualizzare attributi delle entità
 * 
 * Caratteristiche:
 * - Visualizzazione schema-aware basata sul tipo di attributo
 * - Formattazione automatica per diversi tipi di dato
 * - Integrazione con SchemaService per informazioni attributi
 * - Supporto per valori null/undefined con fallback
 * - Stili consistenti e responsive
 */

class AttributeDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.attributeInfo = null;
    }

    static get observedAttributes() {
        return [
            'attribute-name', 'value', 'entity-type', 'entity-id',
            'format', 'show-label', 'inline', 'empty-text'
        ];
    }

    connectedCallback() {
        this.loadAttributeInfo().then(() => {
            this.render();
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'attribute-name' || name === 'entity-type') {
                this.loadAttributeInfo().then(() => {
                    this.render();
                });
            } else {
                this.render();
            }
        }
    }

    /**
     * Carica informazioni sull'attributo dal SchemaService
     */
    async loadAttributeInfo() {
        try {
            const entityType = this.getAttribute('entity-type');
            const attributeName = this.getAttribute('attribute-name');

            if (entityType && attributeName && window.SchemaService) {
                try {
                    this.attributeInfo = await window.SchemaService.getAttributeInfo(entityType, attributeName);
                } catch (error) {
                    console.warn(`⚠️ [attribute-display] Info attributo non disponibile per ${attributeName}:`, error.message);
                    this.attributeInfo = this.getDefaultAttributeInfo(attributeName);
                }
            } else {
                this.attributeInfo = this.getDefaultAttributeInfo(attributeName || 'attribute');
            }
        } catch (error) {
            console.error('❌ [attribute-display] Errore caricamento info attributo:', error);
            this.attributeInfo = this.getDefaultAttributeInfo(attributeName || 'attribute');
        }
    }

    /**
     * Ottiene informazioni di default per un attributo
     * @param {string} attributeName - Nome dell'attributo
     * @returns {Object} - Informazioni attributo di default
     */
    getDefaultAttributeInfo(attributeName) {
        return {
            name: attributeName,
            type: 'string',
            required: false,
            description: `Attributo ${attributeName}`
        };
    }

    render() {
        const value = this.getAttribute('value');
        const showLabel = this.hasAttribute('show-label');
        const inline = this.hasAttribute('inline');
        const emptyText = this.getAttribute('empty-text') || '-';
        const format = this.getAttribute('format');

        const formattedValue = this.formatValue(value, format);
        const displayLabel = this.attributeInfo ? this.formatAttributeName(this.attributeInfo.name) : '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: ${inline ? 'inline-flex' : 'block'};
                    align-items: ${inline ? 'center' : 'stretch'};
                    gap: 0.5rem;
                }

                .display-container {
                    display: flex;
                    flex-direction: ${inline ? 'row' : 'column'};
                    gap: ${inline ? '0.5rem' : '0.25rem'};
                    align-items: ${inline ? 'center' : 'stretch'};
                }

                .attribute-label {
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: #374151;
                    margin: 0;
                    ${inline ? 'white-space: nowrap;' : ''}
                }

                .attribute-value {
                    font-size: 0.875rem;
                    color: #1f2937;
                    margin: 0;
                    word-break: break-word;
                }

                .attribute-value.empty {
                    color: #9ca3af;
                    font-style: italic;
                }

                .attribute-value.email {
                    color: #3b82f6;
                    text-decoration: underline;
                    cursor: pointer;
                }

                .attribute-value.url {
                    color: #3b82f6;
                    text-decoration: underline;
                    cursor: pointer;
                }

                .attribute-value.phone {
                    color: #059669;
                    cursor: pointer;
                }

                .attribute-value.number {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    text-align: right;
                }

                .attribute-value.date {
                    color: #7c3aed;
                }

                .attribute-value.boolean {
                    font-weight: 500;
                }

                .attribute-value.boolean.true {
                    color: #059669;
                }

                .attribute-value.boolean.false {
                    color: #dc2626;
                }

                .type-indicator {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-left: 0.5rem;
                    font-style: italic;
                }

                .required-indicator {
                    color: #dc2626;
                    margin-left: 0.25rem;
                    font-size: 0.75rem;
                }

                /* Responsive per dispositivi mobili */
                @media (max-width: 640px) {
                    .display-container {
                        flex-direction: column;
                        gap: 0.25rem;
                    }

                    .attribute-value {
                        font-size: 0.8rem;
                    }

                    .attribute-label {
                        font-size: 0.8rem;
                    }
                }
            </style>

            <div class="display-container">
                ${showLabel ? `
                    <div class="attribute-label">
                        ${displayLabel}
                        ${this.attributeInfo && this.attributeInfo.required ? '<span class="required-indicator">*</span>' : ''}
                        ${this.shouldShowTypeIndicator() ? `<span class="type-indicator">(${this.attributeInfo.type})</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="attribute-value ${this.getValueClasses(value, formattedValue)}" 
                     ${this.getValueAttributes(value)}
                     title="${this.getValueTitle(value)}">
                    ${formattedValue}
                </div>
            </div>
        `;

        this.attachValueEventListeners();
    }

    /**
     * Formatta il valore basandosi sul tipo e formato specificato
     * @param {*} value - Valore da formattare
     * @param {string} format - Formato specifico richiesto
     * @returns {string} - Valore formattato
     */
    formatValue(value, format) {
        // Gestione valori null/undefined
        if (value === null || value === undefined || value === '') {
            return this.getAttribute('empty-text') || '-';
        }

        // Formato specificato esplicitamente
        if (format) {
            return this.applyCustomFormat(value, format);
        }

        // Formattazione basata sul tipo schema
        if (this.attributeInfo && this.attributeInfo.type) {
            return this.formatByType(value, this.attributeInfo.type);
        }

        // Fallback: valore così com'è
        return String(value);
    }

    /**
     * Applica formattazione personalizzata
     * @param {*} value - Valore da formattare
     * @param {string} format - Formato da applicare
     * @returns {string} - Valore formattato
     */
    applyCustomFormat(value, format) {
        switch (format) {
            case 'uppercase':
                return String(value).toUpperCase();
            case 'lowercase':
                return String(value).toLowerCase();
            case 'capitalize':
                return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
            case 'currency':
                return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value));
            case 'percentage':
                return `${Number(value)}%`;
            default:
                return String(value);
        }
    }

    /**
     * Formatta valore basandosi sul tipo schema
     * @param {*} value - Valore da formattare
     * @param {string} type - Tipo dell'attributo
     * @returns {string} - Valore formattato
     */
    formatByType(value, type) {
        switch (type) {
            case 'date':
                try {
                    const date = new Date(value);
                    return date.toLocaleDateString('it-IT');
                } catch {
                    return String(value);
                }

            case 'datetime':
                try {
                    const date = new Date(value);
                    return date.toLocaleString('it-IT');
                } catch {
                    return String(value);
                }

            case 'boolean':
                return value ? 'Sì' : 'No';

            case 'number':
                return new Intl.NumberFormat('it-IT').format(Number(value));

            case 'currency':
                return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value));

            case 'email':
            case 'url':
            case 'phone':
                return String(value);

            default:
                return String(value);
        }
    }

    /**
     * Ottiene le classi CSS per il valore
     * @param {*} originalValue - Valore originale
     * @param {string} formattedValue - Valore formattato
     * @returns {string} - Classi CSS
     */
    getValueClasses(originalValue, formattedValue) {
        const classes = [];

        // Classe per valori vuoti
        if (originalValue === null || originalValue === undefined || originalValue === '') {
            classes.push('empty');
        }

        // Classi basate sul tipo
        if (this.attributeInfo && this.attributeInfo.type) {
            classes.push(this.attributeInfo.type);
        }

        // Classi speciali per booleani
        if (this.attributeInfo && this.attributeInfo.type === 'boolean') {
            classes.push(originalValue ? 'true' : 'false');
        }

        return classes.join(' ');
    }

    /**
     * Ottiene attributi HTML per il valore
     * @param {*} value - Valore dell'attributo
     * @returns {string} - Attributi HTML
     */
    getValueAttributes(value) {
        if (!this.attributeInfo) return '';

        switch (this.attributeInfo.type) {
            case 'email':
                return `data-action="email"`;
            case 'url':
                return `data-action="url"`;
            case 'phone':
                return `data-action="phone"`;
            default:
                return '';
        }
    }

    /**
     * Ottiene il titolo tooltip per il valore
     * @param {*} value - Valore dell'attributo
     * @returns {string} - Titolo tooltip
     */
    getValueTitle(value) {
        if (!this.attributeInfo) return '';

        let title = this.attributeInfo.description || '';

        if (this.attributeInfo.type === 'email') {
            title += ' (Click per inviare email)';
        } else if (this.attributeInfo.type === 'url') {
            title += ' (Click per aprire link)';
        } else if (this.attributeInfo.type === 'phone') {
            title += ' (Click per chiamare)';
        }

        return title;
    }

    /**
     * Determina se mostrare l'indicatore di tipo
     * @returns {boolean}
     */
    shouldShowTypeIndicator() {
        return this.hasAttribute('show-type') && this.attributeInfo && this.attributeInfo.type !== 'string';
    }

    /**
     * Formatta il nome dell'attributo per la visualizzazione
     * @param {string} attributeName - Nome dell'attributo
     * @returns {string} - Nome formattato
     */
    formatAttributeName(attributeName) {
        return attributeName.charAt(0).toUpperCase() + 
               attributeName.slice(1).replace(/_/g, ' ');
    }

    /**
     * Attacca event listeners per valori interattivi
     */
    attachValueEventListeners() {
        const valueElement = this.shadowRoot.querySelector('.attribute-value');
        if (!valueElement) return;

        const action = valueElement.getAttribute('data-action');
        const value = this.getAttribute('value');

        if (action && value) {
            valueElement.addEventListener('click', (e) => {
                this.handleValueClick(action, value, e);
            });
        }
    }

    /**
     * Gestisce il click su valori interattivi
     * @param {string} action - Tipo di azione
     * @param {string} value - Valore dell'attributo
     * @param {Event} event - Evento click
     */
    handleValueClick(action, value, event) {
        event.preventDefault();

        switch (action) {
            case 'email':
                window.open(`mailto:${value}`, '_blank');
                break;
            case 'url':
                window.open(value.startsWith('http') ? value : `https://${value}`, '_blank');
                break;
            case 'phone':
                window.open(`tel:${value}`, '_blank');
                break;
        }

        // Emetti evento personalizzato
        this.dispatchEvent(new CustomEvent('attribute-action', {
            detail: {
                action: action,
                value: value,
                attributeName: this.getAttribute('attribute-name'),
                entityType: this.getAttribute('entity-type'),
                entityId: this.getAttribute('entity-id')
            },
            bubbles: true
        }));
    }

    /**
     * Aggiorna il valore visualizzato
     * @param {*} newValue - Nuovo valore
     */
    updateValue(newValue) {
        this.setAttribute('value', newValue);
    }

    /**
     * Ottiene le informazioni dell'attributo
     * @returns {Object} - Informazioni attributo
     */
    getAttributeInfo() {
        return this.attributeInfo;
    }
}

// Registra il Web Component
customElements.define('attribute-display', AttributeDisplay);

console.log('✅ [attribute-display] Web Component registrato'); 