class SchemaManager_MVP {
    constructor() {
        this.knownEntityTypes = {}; // Esempio: {"Contact": ["nome", "cognome", "email"]}
    }

    /**
     * Aggiunge un attributo a un tipo di entità.
     * Se il tipo di entità non esiste, viene creato.
     * Se l'attributo esiste già per quel tipo, non viene duplicato.
     * @param {string} entityType - Il tipo di entità (es. "Contact").
     * @param {string} attributeName - Il nome dell'attributo (es. "telefono").
     */
    addAttributeToType(entityType, attributeName) {
        if (!this.knownEntityTypes[entityType]) {
            this.knownEntityTypes[entityType] = [];
        }
        if (!this.knownEntityTypes[entityType].includes(attributeName)) {
            this.knownEntityTypes[entityType].push(attributeName);
        }
        // console.log(`Attributo "${attributeName}" aggiunto al tipo "${entityType}". Schema:`, this.knownEntityTypes);
    }

    /**
     * Recupera tutti gli attributi conosciuti per un dato tipo di entità.
     * @param {string} entityType - Il tipo di entità.
     * @returns {string[] | undefined} Un array di nomi di attributi, o undefined se il tipo non è conosciuto.
     */
    getAttributesForType(entityType) {
        // console.log(`Richiesti attributi per il tipo "${entityType}". Risultato:`, this.knownEntityTypes[entityType]);
        return this.knownEntityTypes[entityType];
    }

    /**
     * Recupera tutti i tipi di entità conosciuti.
     * @returns {string[]} Un array con i nomi di tutti i tipi di entità.
     */
    getAllEntityTypes() {
        return Object.keys(this.knownEntityTypes);
    }
}

// Esportazione del modulo per poterlo utilizzare in altri file (Node.js)
// Se si usa ES6 modules, sarebbe export default SchemaManager_MVP;
module.exports = SchemaManager_MVP; 