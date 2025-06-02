const AttributeDefinition = require('./attributeDefinition');

/**
 * Rappresenta lo schema di un tipo di relazione nel sistema evoluto
 */
class RelationSchema {
    constructor(relationType, definition) {
        this.relationType = relationType;
        this.sourceTypes = definition.sourceTypes || [];
        this.targetTypes = definition.targetTypes || [];
        this.cardinality = definition.cardinality || 'N:M';
        this.attributes = new Map();
        this.constraints = definition.constraints || [];
        this.version = definition.version || 1;
        this.created = definition.created || Date.now();
        this.modified = definition.modified || Date.now();
        
        // Processa definizioni attributi
        if (definition.attributes) {
            if (definition.attributes instanceof Map) {
                // Se è già una Map
                for (const [attrName, attrDef] of definition.attributes) {
                    if (attrDef instanceof AttributeDefinition) {
                        this.attributes.set(attrName, attrDef);
                    } else {
                        this.attributes.set(attrName, new AttributeDefinition(attrName, attrDef));
                    }
                }
            } else if (Array.isArray(definition.attributes)) {
                // Se è un array di oggetti con proprietà name
                for (const attrData of definition.attributes) {
                    if (attrData.name) {
                        this.attributes.set(attrData.name, new AttributeDefinition(attrData.name, attrData));
                    }
                }
            } else {
                // Se è un oggetto con chiavi come nomi attributi
                for (const [attrName, attrDef] of Object.entries(definition.attributes)) {
                    this.attributes.set(attrName, new AttributeDefinition(attrName, attrDef));
                }
            }
        }
    }

    /**
     * Valida una relazione contro questo schema
     * @param {string} sourceEntityType - Tipo dell'entità sorgente
     * @param {string} targetEntityType - Tipo dell'entità target
     * @param {object} attributes - Attributi della relazione
     * @returns {object} Risultato della validazione: { valid: boolean, error?: string, warnings?: string[] }
     */
    validateRelation(sourceEntityType, targetEntityType, attributes = {}) {
        const warnings = [];
        
        // Valida tipi partecipanti
        if (this.sourceTypes.length > 0 && !this.sourceTypes.includes(sourceEntityType)) {
            return { valid: false, error: `Tipo sorgente non valido: ${sourceEntityType}. Tipi consentiti: ${this.sourceTypes.join(', ')}` };
        }
        
        if (this.targetTypes.length > 0 && !this.targetTypes.includes(targetEntityType)) {
            return { valid: false, error: `Tipo target non valido: ${targetEntityType}. Tipi consentiti: ${this.targetTypes.join(', ')}` };
        }
        
        // Valida attributi della relazione
        for (const [attrName, value] of Object.entries(attributes)) {
            const result = this.validateAttribute(attrName, value);
            if (!result.valid) {
                return { valid: false, error: result.error };
            }
            if (result.warning) {
                warnings.push(result.warning);
            }
        }
        
        // Verifica attributi richiesti
        for (const [attrName, attrDef] of this.attributes) {
            if (attrDef.required && (!attributes.hasOwnProperty(attrName) || attributes[attrName] === null || attributes[attrName] === undefined)) {
                return { valid: false, error: `Attributo richiesto mancante: ${attrName}` };
            }
        }
        
        return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
    }

    /**
     * Valida un attributo della relazione contro questo schema
     * @param {string} attributeName - Nome dell'attributo
     * @param {any} value - Valore da validare
     * @returns {object} Risultato della validazione
     */
    validateAttribute(attributeName, value) {
        const attrDef = this.attributes.get(attributeName);
        
        if (!attrDef) {
            return { valid: true, warning: `Attributo ${attributeName} non definito nello schema per relazione ${this.relationType}` };
        }
        
        return attrDef.validate(value);
    }

    /**
     * Aggiunge un nuovo attributo allo schema
     * @param {string} attributeName - Nome dell'attributo
     * @param {object} definition - Definizione dell'attributo
     */
    addAttribute(attributeName, definition) {
        this.attributes.set(attributeName, new AttributeDefinition(attributeName, definition));
        this.version++;
        this.modified = Date.now();
    }

    /**
     * Rimuove un attributo dallo schema
     * @param {string} attributeName - Nome dell'attributo da rimuovere
     * @returns {boolean} True se l'attributo è stato rimosso
     */
    removeAttribute(attributeName) {
        const removed = this.attributes.delete(attributeName);
        if (removed) {
            this.version++;
            this.modified = Date.now();
        }
        return removed;
    }

    /**
     * Modifica la definizione di un attributo esistente
     * @param {string} attributeName - Nome dell'attributo
     * @param {object} newDefinition - Nuova definizione
     * @returns {boolean} True se l'attributo è stato modificato
     */
    updateAttribute(attributeName, newDefinition) {
        if (!this.attributes.has(attributeName)) {
            return false;
        }
        
        this.attributes.set(attributeName, new AttributeDefinition(attributeName, newDefinition));
        this.version++;
        this.modified = Date.now();
        return true;
    }

    /**
     * Recupera la definizione di un attributo
     * @param {string} attributeName - Nome dell'attributo
     * @returns {AttributeDefinition|null} La definizione dell'attributo o null
     */
    getAttribute(attributeName) {
        return this.attributes.get(attributeName) || null;
    }

    /**
     * Recupera tutti i nomi degli attributi
     * @returns {string[]} Array dei nomi degli attributi
     */
    getAttributeNames() {
        return Array.from(this.attributes.keys());
    }

    /**
     * Applica i valori di default degli attributi a una relazione
     * @param {object} relation - La relazione a cui applicare i default
     */
    applyDefaults(relation) {
        for (const [attrName, attrDef] of this.attributes) {
            if (attrDef.defaultValue !== null && (!relation.attributes || !relation.attributes.has(attrName))) {
                if (!relation.attributes) {
                    relation.attributes = new Map();
                }
                relation.attributes.set(attrName, attrDef.defaultValue);
            }
        }
    }

    /**
     * Verifica se questo schema supporta una relazione tra due tipi di entità
     * @param {string} sourceType - Tipo entità sorgente
     * @param {string} targetType - Tipo entità target
     * @returns {boolean} True se la relazione è supportata
     */
    supportsRelation(sourceType, targetType) {
        const sourceValid = this.sourceTypes.length === 0 || this.sourceTypes.includes(sourceType);
        const targetValid = this.targetTypes.length === 0 || this.targetTypes.includes(targetType);
        return sourceValid && targetValid;
    }

    /**
     * Converte lo schema in un oggetto serializzabile
     * @returns {object} Oggetto con tutte le proprietà dello schema
     */
    toJSON() {
        const attributesArray = [];
        for (const [name, def] of this.attributes) {
            attributesArray.push(def.toJSON());
        }

        return {
            relationType: this.relationType,
            version: this.version,
            cardinality: this.cardinality,
            sourceTypes: this.sourceTypes,
            targetTypes: this.targetTypes,
            created: this.created,
            modified: this.modified,
            constraints: this.constraints,
            attributes: attributesArray
        };
    }

    /**
     * Crea un RelationSchema da un oggetto
     * @param {object} data - Dati dello schema
     * @returns {RelationSchema} Nuova istanza
     */
    static fromJSON(data) {
        return new RelationSchema(data.relationType, data);
    }

    /**
     * Crea un RelationSchema da dati caricati dal database
     * @param {object} schemaData - Dati dello schema dal database
     * @returns {RelationSchema} Nuova istanza
     */
    static fromDatabase(schemaData) {
        const definition = {
            version: schemaData.version,
            cardinality: schemaData.cardinality,
            sourceTypes: schemaData.sourceTypes,
            targetTypes: schemaData.targetTypes,
            created: schemaData.created,
            modified: schemaData.modified,
            constraints: schemaData.constraints,
            attributes: schemaData.attributes || []
        };
        
        return new RelationSchema(schemaData.relationType, definition);
    }
}

module.exports = RelationSchema; 