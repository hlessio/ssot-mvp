const AttributeDefinition = require('./attributeDefinition');

/**
 * Rappresenta lo schema di un tipo di entità nel sistema evoluto
 */
class EntitySchema {
    constructor(entityType, definition = {}) {
        this.entityType = entityType;
        this.attributes = new Map(); // attributeName -> AttributeDefinition
        this.constraints = definition.constraints || [];
        this.mode = definition.mode || "strict"; // "strict" or "flexible"
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
     * Valida un attributo contro questo schema
     * @param {string} attributeName - Nome dell'attributo
     * @param {any} value - Valore da validare
     * @returns {object} Risultato della validazione: { valid: boolean, error?: string, warning?: string }
     */
    validateAttribute(attributeName, value) {
        const attrDef = this.attributes.get(attributeName);
        
        if (!attrDef) {
            if (this.mode === "flexible") {
                return { valid: true, warning: `Attributo ${attributeName} non definito nello schema (modalità flessibile)` };
            }
            return { valid: false, error: `Attributo ${attributeName} non definito nello schema per ${this.entityType}` };
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
     * Recupera tutti gli attributi di un certo tipo
     * @param {string} type - Tipo di attributo da cercare (es. 'reference')
     * @returns {Array} Array di { name, definition } per attributi del tipo specificato
     */
    getAttributesByType(type) {
        const result = [];
        for (const [name, def] of this.attributes) {
            if (def.type === type) {
                result.push({ name, definition: def });
            }
        }
        return result;
    }

    /**
     * Verifica se lo schema ha attributi di tipo reference
     * @returns {boolean} True se ha almeno un attributo di tipo reference
     */
    hasReferenceAttributes() {
        for (const [name, def] of this.attributes) {
            if (def.type === 'reference') {
                return true;
            }
        }
        return false;
    }

    /**
     * Applica i valori di default degli attributi a un'entità
     * @param {object} entity - L'entità a cui applicare i default
     */
    applyDefaults(entity) {
        for (const [attrName, attrDef] of this.attributes) {
            if (attrDef.defaultValue !== null && (!entity.attributes || !entity.attributes.has(attrName))) {
                if (!entity.attributes) {
                    entity.attributes = new Map();
                }
                entity.attributes.set(attrName, attrDef.defaultValue);
            }
        }
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
            entityType: this.entityType,
            version: this.version,
            mode: this.mode,
            created: this.created,
            modified: this.modified,
            constraints: this.constraints,
            attributes: attributesArray
        };
    }

    /**
     * Crea un EntitySchema da un oggetto
     * @param {object} data - Dati dello schema
     * @returns {EntitySchema} Nuova istanza
     */
    static fromJSON(data) {
        return new EntitySchema(data.entityType, data);
    }

    /**
     * Crea un EntitySchema da dati caricati dal database
     * @param {object} schemaData - Dati dello schema dal database
     * @returns {EntitySchema} Nuova istanza
     */
    static fromDatabase(schemaData) {
        const definition = {
            version: schemaData.version,
            mode: schemaData.mode,
            created: schemaData.created,
            modified: schemaData.modified,
            constraints: schemaData.constraints,
            attributes: schemaData.attributes || []
        };
        
        return new EntitySchema(schemaData.entityType, definition);
    }
}

module.exports = EntitySchema; 