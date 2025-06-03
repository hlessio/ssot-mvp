/**
 * ssot-input.js - Web Component per input base del sistema SSOT
 * 
 * Fornisce un input consistente e riutilizzabile con:
 * - Validazione integrata
 * - Stili consistenti
 * - Integrazione con SchemaService per validazione attributi
 * - Eventi personalizzati per changes
 */

class SSOTInput extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.value = '';
        this.isValid = true;
        this.validationErrors = [];
    }

    static get observedAttributes() {
        return [
            'value', 'type', 'placeholder', 'required', 'disabled', 
            'entity-type', 'attribute-name', 'validation-type',
            'label', 'description'
        ];
    }

    connectedCallback() {
        this.render();
        this.attachEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'value') {
                // Per il valore, aggiorna solo l'input esistente senza re-render completo
                const input = this.shadowRoot?.querySelector('.input-field');
                if (input && input.value !== newValue) {
                    input.value = newValue || '';
                    this.value = newValue || '';
                }
            } else {
                // Per altri attributi, fai re-render completo
                this.render();
            }
        }
    }

    render() {
        const value = this.getAttribute('value') || '';
        const type = this.getAttribute('type') || 'text';
        const placeholder = this.getAttribute('placeholder') || '';
        const required = this.hasAttribute('required');
        const disabled = this.hasAttribute('disabled');
        const label = this.getAttribute('label') || '';
        const description = this.getAttribute('description') || '';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 1rem;
                }

                .input-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .label {
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: #374151;
                    margin-bottom: 0.25rem;
                }

                .required-indicator {
                    color: #dc2626;
                    margin-left: 0.25rem;
                }

                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    background-color: white;
                    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                }

                .input-field:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .input-field:disabled {
                    background-color: #f9fafb;
                    color: #6b7280;
                    cursor: not-allowed;
                }

                .input-field.invalid {
                    border-color: #dc2626;
                }

                .input-field.invalid:focus {
                    border-color: #dc2626;
                    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
                }

                .description {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                .validation-errors {
                    margin-top: 0.25rem;
                }

                .error-message {
                    font-size: 0.75rem;
                    color: #dc2626;
                    margin-top: 0.125rem;
                }

                .validation-indicator {
                    display: inline-flex;
                    align-items: center;
                    margin-left: 0.5rem;
                    font-size: 0.75rem;
                }

                .validation-indicator.valid {
                    color: #059669;
                }

                .validation-indicator.invalid {
                    color: #dc2626;
                }
            </style>

            <div class="input-container">
                ${label ? `
                    <label class="label">
                        ${label}
                        ${required ? '<span class="required-indicator">*</span>' : ''}
                    </label>
                ` : ''}
                
                <div style="position: relative;">
                    <input 
                        class="input-field ${this.isValid ? '' : 'invalid'}"
                        type="${type}"
                        value="${value}"
                        placeholder="${placeholder}"
                        ${required ? 'required' : ''}
                        ${disabled ? 'disabled' : ''}
                    />
                    
                    ${this.showValidationIndicator() ? `
                        <span class="validation-indicator ${this.isValid ? 'valid' : 'invalid'}">
                            ${this.isValid ? '✓' : '✗'}
                        </span>
                    ` : ''}
                </div>

                ${description ? `<div class="description">${description}</div>` : ''}
                
                ${this.validationErrors.length > 0 ? `
                    <div class="validation-errors">
                        ${this.validationErrors.map(error => `
                            <div class="error-message">${error}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    attachEventListeners() {
        const input = this.shadowRoot.querySelector('.input-field');
        if (!input) return;

        // Input event - per aggiornamenti real-time
        input.addEventListener('input', (e) => {
            this.value = e.target.value;
            
            // Validazione real-time (con debounce)
            this.debounceValidation();
            
            // Emetti evento personalizzato
            this.dispatchEvent(new CustomEvent('ssot-input', {
                detail: {
                    value: this.value,
                    isValid: this.isValid,
                    attributeName: this.getAttribute('attribute-name'),
                    entityType: this.getAttribute('entity-type')
                },
                bubbles: true
            }));
        });

        // Change event - per validazione finale
        input.addEventListener('change', async (e) => {
            await this.validateInput();
            
            this.dispatchEvent(new CustomEvent('ssot-change', {
                detail: {
                    value: this.value,
                    isValid: this.isValid,
                    errors: this.validationErrors,
                    attributeName: this.getAttribute('attribute-name'),
                    entityType: this.getAttribute('entity-type')
                },
                bubbles: true
            }));
        });

        // Blur event - per salvataggio automatico
        input.addEventListener('blur', async (e) => {
            await this.validateInput();
            
            this.dispatchEvent(new CustomEvent('ssot-blur', {
                detail: {
                    value: this.value,
                    isValid: this.isValid,
                    errors: this.validationErrors,
                    attributeName: this.getAttribute('attribute-name'),
                    entityType: this.getAttribute('entity-type')
                },
                bubbles: true
            }));
        });
    }

    /**
     * Validazione con debounce per evitare troppe chiamate
     */
    debounceValidation() {
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            this.validateInput();
        }, 300);
    }

    /**
     * Valida l'input corrente
     */
    async validateInput() {
        try {
            const entityType = this.getAttribute('entity-type');
            const attributeName = this.getAttribute('attribute-name');
            const validationType = this.getAttribute('validation-type');

            // Reset validation
            this.isValid = true;
            this.validationErrors = [];

            // Validazione required
            if (this.hasAttribute('required') && (!this.value || this.value.trim() === '')) {
                this.isValid = false;
                this.validationErrors.push('Campo richiesto');
            }

            // Validazione via SchemaService se disponibile
            if (this.value && this.value.trim() !== '' && entityType && attributeName && window.schemaService) {
                try {
                    const result = await window.schemaService.validateAttributeValue(
                        entityType, 
                        attributeName, 
                        this.value
                    );
                    
                    if (!result.isValid) {
                        this.isValid = false;
                        this.validationErrors.push(...result.errors);
                    }
                } catch (error) {
                    console.warn('⚠️ [ssot-input] Validazione schema fallita:', error);
                }
            }

            // Validazione tipo specifica
            if (this.value && this.value.trim() !== '' && validationType) {
                const typeValidation = this.validateByType(validationType, this.value);
                if (!typeValidation.isValid) {
                    this.isValid = false;
                    this.validationErrors.push(...typeValidation.errors);
                }
            }

            // Aggiorna solo gli elementi di validazione senza re-render completo
            this.updateValidationDisplay();

        } catch (error) {
            console.error('❌ [ssot-input] Errore validazione:', error);
            this.isValid = false;
            this.validationErrors = ['Errore nella validazione'];
            this.updateValidationDisplay();
        }
    }

    /**
     * Aggiorna solo la visualizzazione dello stato di validazione senza re-render completo
     */
    updateValidationDisplay() {
        const input = this.shadowRoot?.querySelector('.input-field');
        const indicator = this.shadowRoot?.querySelector('.validation-indicator');
        const errorsContainer = this.shadowRoot?.querySelector('.validation-errors');

        if (input) {
            // Aggiorna classe CSS dell'input
            if (this.isValid) {
                input.classList.remove('invalid');
            } else {
                input.classList.add('invalid');
            }
        }

        if (indicator) {
            // Aggiorna indicatore validazione
            indicator.className = `validation-indicator ${this.isValid ? 'valid' : 'invalid'}`;
            indicator.textContent = this.isValid ? '✓' : '✗';
        }

        if (errorsContainer) {
            // Aggiorna errori di validazione
            errorsContainer.innerHTML = this.validationErrors.map(error => `
                <div class="error-message">${error}</div>
            `).join('');
        }
    }

    /**
     * Validazione per tipo specifico
     * @param {string} type - Tipo di validazione
     * @param {string} value - Valore da validare
     * @returns {Object} - Risultato validazione
     */
    validateByType(type, value) {
        const errors = [];

        switch (type) {
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors.push('Formato email non valido');
                }
                break;
            
            case 'number':
                if (isNaN(Number(value))) {
                    errors.push('Deve essere un numero');
                }
                break;
            
            case 'url':
                try {
                    new URL(value);
                } catch {
                    errors.push('URL non valido');
                }
                break;
            
            case 'phone':
                if (!/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
                    errors.push('Numero di telefono non valido');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Determina se mostrare l'indicatore di validazione
     * @returns {boolean}
     */
    showValidationIndicator() {
        return this.value && this.value.trim() !== '' && 
               (this.getAttribute('entity-type') || this.getAttribute('validation-type'));
    }

    /**
     * Imposta il valore programmaticamente
     * @param {string} value - Nuovo valore
     */
    setValue(value) {
        this.value = value;
        this.setAttribute('value', value);
        this.validateInput();
    }

    /**
     * Ottiene il valore corrente
     * @returns {string}
     */
    getValue() {
        return this.value;
    }

    /**
     * Ottiene lo stato di validazione
     * @returns {Object}
     */
    getValidationState() {
        return {
            isValid: this.isValid,
            errors: [...this.validationErrors]
        };
    }

    /**
     * Focus sull'input
     */
    focus() {
        const input = this.shadowRoot.querySelector('.input-field');
        if (input) {
            input.focus();
        }
    }
}

// Registra il Web Component
customElements.define('ssot-input', SSOTInput);

export default SSOTInput; 