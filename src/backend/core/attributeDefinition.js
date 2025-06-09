/**
 * Rappresenta la definizione di un attributo nel sistema evoluto
 */
class AttributeDefinition {
    constructor(name, definition) {
        this.name = name;
        this.type = definition.type || 'string';
        this.required = definition.required || false;
        this.defaultValue = definition.defaultValue || null;
        this.validationRules = definition.validationRules || [];
        this.description = definition.description || '';
        
        // Proprietà specifiche per attributi di tipo "reference"
        this.referencesEntityType = definition.referencesEntityType || null;
        this.relationTypeForReference = definition.relationTypeForReference || null;
        this.displayAttributeFromReferencedEntity = definition.displayAttributeFromReferencedEntity || null;
        this.cardinalityForReference = definition.cardinalityForReference || null;
        
        // Opzioni per attributi di tipo select
        this.options = definition.options || null;
        
        // Limiti numerici
        this.min = definition.min || null;
        this.max = definition.max || null;
    }

    /**
     * Valida un valore contro questa definizione di attributo
     * @param {any} value - Il valore da validare
     * @returns {object} Risultato della validazione: { valid: boolean, error?: string, warning?: string }
     */
    validate(value) {
        // Se l'attributo è richiesto e il valore è null/undefined
        if (this.required && (value === null || value === undefined || value === '')) {
            return { valid: false, error: `L'attributo ${this.name} è richiesto` };
        }

        // Se il valore è null/undefined e non è richiesto, è valido
        if (value === null || value === undefined) {
            return { valid: true };
        }

        // Validazione per tipo
        switch (this.type) {
            case 'string':
                if (typeof value !== 'string') {
                    return { valid: false, error: `${this.name} deve essere una stringa` };
                }
                break;
                
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    return { valid: false, error: `${this.name} deve essere un numero` };
                }
                if (this.min !== null && value < this.min) {
                    return { valid: false, error: `${this.name} deve essere almeno ${this.min}` };
                }
                if (this.max !== null && value > this.max) {
                    return { valid: false, error: `${this.name} deve essere al massimo ${this.max}` };
                }
                break;
                
            case 'email':
                if (typeof value !== 'string') {
                    return { valid: false, error: `${this.name} deve essere una stringa` };
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { valid: false, error: `${this.name} deve essere un indirizzo email valido` };
                }
                break;
                
            case 'date':
                // Accetta sia oggetti Date che stringhe ISO
                if (!(value instanceof Date) && typeof value !== 'string') {
                    return { valid: false, error: `${this.name} deve essere una data` };
                }
                if (typeof value === 'string') {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        return { valid: false, error: `${this.name} deve essere una data valida` };
                    }
                }
                break;
                
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { valid: false, error: `${this.name} deve essere true o false` };
                }
                break;
                
            case 'select':
                if (this.options && !this.options.includes(value)) {
                    return { valid: false, error: `${this.name} deve essere uno di: ${this.options.join(', ')}` };
                }
                break;
                
            case 'percentage':
                if (typeof value !== 'number' || isNaN(value)) {
                    return { valid: false, error: `${this.name} deve essere un numero` };
                }
                if (value < 0 || value > 100) {
                    return { valid: false, error: `${this.name} deve essere tra 0 e 100` };
                }
                break;
                
            case 'reference':
                // Per i riferimenti, il valore dovrebbe essere un ID di entità
                if (typeof value !== 'string') {
                    return { valid: false, error: `${this.name} deve essere un ID di entità valido` };
                }
                // Ulteriori validazioni potrebbero verificare l'esistenza dell'entità referenziata
                break;
                
            default:
                // Tipo sconosciuto, accetta qualsiasi valore con warning
                return { valid: true, warning: `Tipo di attributo sconosciuto: ${this.type}` };
        }

        // Validazioni personalizzate
        for (const rule of this.validationRules) {
            const result = this.applyValidationRule(rule, value);
            if (!result.valid) {
                return result;
            }
        }

        return { valid: true };
    }

    /**
     * Applica una regola di validazione personalizzata
     * @param {string} rule - La regola da applicare
     * @param {any} value - Il valore da validare
     * @returns {object} Risultato della validazione
     */
    applyValidationRule(rule, value) {
        switch (rule) {
            case 'email_format':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { valid: false, error: `${this.name} deve essere un indirizzo email valido` };
                }
                break;
                
            case 'no_spaces':
                if (typeof value === 'string' && value.includes(' ')) {
                    return { valid: false, error: `${this.name} non può contenere spazi` };
                }
                break;
                
            case 'positive':
                if (typeof value === 'number' && value <= 0) {
                    return { valid: false, error: `${this.name} deve essere un numero positivo` };
                }
                break;
                
            default:
                // Regola sconosciuta, ignora
                break;
        }
        
        return { valid: true };
    }

    /**
     * Converte la definizione in un oggetto serializzabile
     * @returns {object} Oggetto con tutte le proprietà della definizione
     */
    toJSON() {
        return {
            name: this.name,
            type: this.type,
            required: this.required,
            defaultValue: this.defaultValue,
            validationRules: this.validationRules,
            description: this.description,
            referencesEntityType: this.referencesEntityType,
            relationTypeForReference: this.relationTypeForReference,
            displayAttributeFromReferencedEntity: this.displayAttributeFromReferencedEntity,
            cardinalityForReference: this.cardinalityForReference,
            options: this.options,
            min: this.min,
            max: this.max
        };
    }

    /**
     * Crea una AttributeDefinition da un oggetto
     * @param {string} name - Nome dell'attributo
     * @param {object} data - Dati della definizione
     * @returns {AttributeDefinition} Nuova istanza
     */
    static fromJSON(name, data) {
        return new AttributeDefinition(name, data);
    }
}

module.exports = AttributeDefinition; 