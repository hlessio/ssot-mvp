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
        
        // ✨ NUOVO: UI Metadata per architettura a rendering semantico
        this.uiMetadata = this.initializeUIMetadata(definition.uiMetadata || {});
        this.renderingHints = this.initializeRenderingHints(definition.renderingHints || {});
        this.displaySettings = this.initializeDisplaySettings(definition.displaySettings || {});
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
                
            case 'text':
                // Text è come string ma per contenuti più lunghi
                if (typeof value !== 'string') {
                    return { valid: false, error: `${this.name} deve essere una stringa di testo` };
                }
                break;
                
            case 'json':
                // JSON può essere un oggetto o array JavaScript
                if (typeof value === 'string') {
                    // Se è una stringa, verifica che sia JSON valido
                    try {
                        JSON.parse(value);
                    } catch (e) {
                        return { valid: false, error: `${this.name} deve essere un JSON valido` };
                    }
                } else if (typeof value !== 'object' || value === null) {
                    return { valid: false, error: `${this.name} deve essere un oggetto o array JSON` };
                }
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
     * ✨ NUOVO: Inizializza i metadati UI per il rendering semantico
     * @param {object} uiMetadata - Metadati UI forniti
     * @returns {object} Metadati UI normalizzati
     */
    initializeUIMetadata(uiMetadata) {
        return {
            // Componente UI da utilizzare per il rendering
            component: uiMetadata.component || this.getDefaultComponent(),
            
            // Label da mostrare nell'interfaccia
            label: uiMetadata.label || this.name,
            
            // Placeholder per input
            placeholder: uiMetadata.placeholder || `Inserisci ${this.name}...`,
            
            // Larghezza suggerita (auto, small, medium, large)
            width: uiMetadata.width || 'auto',
            
            // Validazione real-time
            validation: {
                realtime: uiMetadata.validation?.realtime || false,
                debounceMs: uiMetadata.validation?.debounceMs || 300,
                showErrors: uiMetadata.validation?.showErrors !== false
            },
            
            // Dipendenze da altri attributi
            dependsOn: uiMetadata.dependsOn || [],
            
            // Ordinamento per gruppi
            order: uiMetadata.order || 0,
            
            // Gruppo logico (per organizzazione UI)
            group: uiMetadata.group || 'default'
        };
    }

    /**
     * ✨ NUOVO: Inizializza i rendering hints per il layout
     * @param {object} renderingHints - Hints di rendering forniti
     * @returns {object} Rendering hints normalizzati
     */
    initializeRenderingHints(renderingHints) {
        return {
            // Priorità di visualizzazione (high, medium, low)
            priority: renderingHints.priority || 'medium',
            
            // Raggruppamento logico per UI
            grouping: renderingHints.grouping || 'general',
            
            // Formato di visualizzazione preferito
            displayFormat: renderingHints.displayFormat || 'auto',
            
            // Condizioni per la visualizzazione
            conditional: {
                showIf: renderingHints.conditional?.showIf || null,
                hideIf: renderingHints.conditional?.hideIf || null,
                enableIf: renderingHints.conditional?.enableIf || null
            },
            
            // Suggerimenti per la responsività
            responsive: {
                mobile: renderingHints.responsive?.mobile || 'auto',
                tablet: renderingHints.responsive?.tablet || 'auto',
                desktop: renderingHints.responsive?.desktop || 'auto'
            }
        };
    }

    /**
     * ✨ NUOVO: Inizializza le impostazioni di visualizzazione
     * @param {object} displaySettings - Impostazioni di display fornite
     * @returns {object} Display settings normalizzati
     */
    initializeDisplaySettings(displaySettings) {
        return {
            // Icona associata all'attributo
            icon: displaySettings.icon || this.getDefaultIcon(),
            
            // Tooltip descrittivo
            tooltip: displaySettings.tooltip || this.description,
            
            // Formato di visualizzazione dei valori
            valueFormat: displaySettings.valueFormat || this.getDefaultValueFormat(),
            
            // Stile personalizzato
            style: displaySettings.style || {},
            
            // CSS classes aggiuntive
            cssClasses: displaySettings.cssClasses || [],
            
            // Modalità di editing (inline, modal, disabled)
            editMode: displaySettings.editMode || 'inline',
            
            // Configurazioni specifiche per liste/autocomplete
            listConfig: {
                searchable: displaySettings.listConfig?.searchable !== false,
                creatable: displaySettings.listConfig?.creatable !== false,
                multiSelect: displaySettings.listConfig?.multiSelect || false,
                pageSize: displaySettings.listConfig?.pageSize || 10
            }
        };
    }

    /**
     * ✨ NUOVO: Determina il componente UI di default basato sul tipo
     * @returns {string} Nome del componente UI di default
     */
    getDefaultComponent() {
        const componentMap = {
            'string': 'TextInput',
            'text': 'TextArea',
            'number': 'NumberInput',
            'email': 'EmailInput',
            'date': 'DateInput',
            'boolean': 'Checkbox',
            'select': 'SelectInput',
            'reference': 'EntityAutocomplete',
            'percentage': 'PercentageInput',
            'json': 'JsonEditor'
        };
        
        return componentMap[this.type] || 'TextInput';
    }

    /**
     * ✨ NUOVO: Determina l'icona di default basata sul tipo e nome
     * @returns {string} Nome dell'icona di default
     */
    getDefaultIcon() {
        // Icone basate sul nome comune
        const nameIcons = {
            'nome': 'user',
            'email': 'mail',
            'telefono': 'phone',
            'indirizzo': 'map-pin',
            'data': 'calendar',
            'prezzo': 'dollar-sign',
            'stato': 'check-circle'
        };
        
        // Icone basate sul tipo
        const typeIcons = {
            'email': 'mail',
            'date': 'calendar',
            'boolean': 'check-square',
            'reference': 'link',
            'percentage': 'percent'
        };
        
        return nameIcons[this.name.toLowerCase()] || 
               typeIcons[this.type] || 
               'edit-3';
    }

    /**
     * ✨ NUOVO: Determina il formato di visualizzazione dei valori
     * @returns {object} Configurazione di formato
     */
    getDefaultValueFormat() {
        const formatMap = {
            'percentage': { type: 'percentage', decimals: 0, suffix: '%' },
            'email': { type: 'email', linkify: true },
            'date': { type: 'date', format: 'DD/MM/YYYY' },
            'number': { type: 'number', decimals: 2 },
            'reference': { type: 'reference', showLabel: true }
        };
        
        return formatMap[this.type] || { type: 'text' };
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
            max: this.max,
            // ✨ NUOVO: Include UI metadata per architettura semantica
            uiMetadata: this.uiMetadata,
            renderingHints: this.renderingHints,
            displaySettings: this.displaySettings
        };
    }

    /**
     * ✨ NUOVO: Restituisce solo i metadati UI per il frontend
     * @returns {object} Solo i metadati UI necessari per il rendering
     */
    getUIMetadata() {
        return {
            component: this.uiMetadata.component,
            label: this.uiMetadata.label,
            placeholder: this.uiMetadata.placeholder,
            width: this.uiMetadata.width,
            validation: this.uiMetadata.validation,
            group: this.uiMetadata.group,
            order: this.uiMetadata.order,
            icon: this.displaySettings.icon,
            tooltip: this.displaySettings.tooltip,
            valueFormat: this.displaySettings.valueFormat,
            editMode: this.displaySettings.editMode,
            priority: this.renderingHints.priority,
            grouping: this.renderingHints.grouping,
            conditional: this.renderingHints.conditional
        };
    }

    /**
     * ✨ NUOVO: Valida la configurazione UI metadata
     * @returns {object} Risultato della validazione UI
     */
    validateUIMetadata() {
        const validComponents = [
            'TextInput', 'TextArea', 'NumberInput', 'EmailInput', 
            'DateInput', 'Checkbox', 'SelectInput', 'EntityAutocomplete', 
            'PercentageInput', 'JsonEditor'
        ];
        
        const errors = [];
        const warnings = [];
        
        // Valida componente
        if (!validComponents.includes(this.uiMetadata.component)) {
            warnings.push(`Componente UI non riconosciuto: ${this.uiMetadata.component}`);
        }
        
        // Valida larghezza
        const validWidths = ['auto', 'small', 'medium', 'large'];
        if (!validWidths.includes(this.uiMetadata.width)) {
            errors.push(`Larghezza non valida: ${this.uiMetadata.width}`);
        }
        
        // Valida priorità
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(this.renderingHints.priority)) {
            errors.push(`Priorità non valida: ${this.renderingHints.priority}`);
        }
        
        // Valida modalità di editing
        const validEditModes = ['inline', 'modal', 'disabled'];
        if (!validEditModes.includes(this.displaySettings.editMode)) {
            errors.push(`Modalità di editing non valida: ${this.displaySettings.editMode}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
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