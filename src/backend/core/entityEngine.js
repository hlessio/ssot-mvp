class EntityEngine_MVP {
    constructor(dao, schemaManager, attributeSpace = null) {
        this.dao = dao;
        this.schemaManager = schemaManager;
        this.attributeSpace = attributeSpace; // Sarà iniettato dopo, quando AttributeSpace_MVP sarà implementato
    }

    /**
     * Crea una nuova entità del tipo specificato con i dati iniziali forniti.
     * Aggiorna automaticamente lo SchemaManager con eventuali nuovi attributi.
     * @param {string} entityType - Il tipo di entità da creare (es. "Contact").
     * @param {object} initialData - Oggetto contenente gli attributi iniziali dell'entità.
     * @returns {Promise<object>} L'entità creata.
     */
    async createEntity(entityType, initialData = {}) {
        try {
            // Crea l'entità tramite il DAO
            const entity = await this.dao.createEntity(entityType, initialData);
            
            // Aggiorna lo SchemaManager con eventuali nuovi attributi
            Object.keys(initialData).forEach(attributeName => {
                this.schemaManager.addAttributeToType(entityType, attributeName);
            });

            console.log(`Entità creata con ID: ${entity.id}, Tipo: ${entityType}`);
            return entity;
        } catch (error) {
            console.error('Errore durante la creazione dell\'entità:', error);
            throw error;
        }
    }

    /**
     * Imposta il valore di un attributo per un'entità specifica.
     * Notifica l'AttributeSpace se configurato.
     * @param {string} entityId - L'ID dell'entità.
     * @param {string} attributeName - Il nome dell'attributo.
     * @param {*} value - Il nuovo valore dell'attributo.
     * @returns {Promise<void>}
     */
    async setEntityAttribute(entityId, attributeName, value) {
        try {
            // Aggiorna l'attributo tramite il DAO
            await this.dao.updateEntityAttribute(entityId, attributeName, value);
            
            // Notifica l'AttributeSpace se configurato
            if (this.attributeSpace) {
                this.attributeSpace.notifyChange({
                    entityId,
                    attributeName,
                    newValue: value
                });
            }

            console.log(`Attributo aggiornato - Entità: ${entityId}, Attributo: ${attributeName}, Nuovo valore: ${value}`);
        } catch (error) {
            console.error('Errore durante l\'aggiornamento dell\'attributo:', error);
            throw error;
        }
    }

    /**
     * Recupera un'entità per ID.
     * @param {string} entityId - L'ID dell'entità.
     * @returns {Promise<object|null>} L'entità trovata o null se non esiste.
     */
    async getEntity(entityId) {
        try {
            const entity = await this.dao.getEntityById(entityId);
            return entity;
        } catch (error) {
            console.error('Errore durante il recupero dell\'entità:', error);
            throw error;
        }
    }

    /**
     * Recupera tutte le entità di un tipo specifico.
     * @param {string} entityType - Il tipo di entità.
     * @returns {Promise<object[]>} Array di entità del tipo specificato.
     */
    async getAllEntities(entityType, options = {}) {
        try {
            const entities = await this.dao.getAllEntities(entityType, options);
            
            // Aggiorna lo schema con gli attributi scoperti
            entities.forEach(entity => this.updateSchemaFromEntity(entity));
            
            return entities;
        } catch (error) {
            console.error('Errore nel recupero delle entità:', error);
            throw error;
        }
    }

    /**
     * Aggiorna lo schema manager con gli attributi scoperti da un'entità.
     * @param {Object} entity - L'entità da cui estrarre gli attributi.
     */
    updateSchemaFromEntity(entity) {
        if (!entity || !entity.entityType) return;
        
        Object.keys(entity).forEach(attributeName => {
            // Salta gli attributi di sistema
            if (!['id', 'entityType', 'createdAt', 'updatedAt'].includes(attributeName)) {
                this.schemaManager.addAttributeToType(entity.entityType, attributeName);
            }
        });
    }

    /**
     * Imposta l'AttributeSpace per le notifiche di cambio attributi.
     * @param {object} attributeSpace - L'istanza di AttributeSpace_MVP.
     */
    setAttributeSpace(attributeSpace) {
        this.attributeSpace = attributeSpace;
    }
}

// Esportazione del modulo
module.exports = EntityEngine_MVP; 