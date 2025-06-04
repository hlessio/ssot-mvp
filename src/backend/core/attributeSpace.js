class AttributeSpace_MVP {
    constructor() {
        this.listeners = []; // Array di callback che verranno notificate sui cambiamenti
    }

    /**
     * Aggiunge un listener (callback) che verrà chiamato quando un attributo cambia.
     * @param {function} callback - Funzione da chiamare quando avviene un cambiamento.
     *                             Riceverà un oggetto { entityId, attributeName, newValue }.
     */
    subscribe(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Il callback deve essere una funzione');
        }
        
        if (!this.listeners.includes(callback)) {
            this.listeners.push(callback);
            console.log(`Nuovo listener sottoscritto. Totale listeners: ${this.listeners.length}`);
        } else {
            console.log('Listener già sottoscritto, non viene duplicato');
        }
    }

    /**
     * Rimuove un listener dalla lista delle sottoscrizioni.
     * @param {function} callback - La funzione callback da rimuovere.
     */
    unsubscribe(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
            console.log(`Listener rimosso. Totale listeners rimanenti: ${this.listeners.length}`);
        } else {
            console.log('Listener non trovato nella lista delle sottoscrizioni');
        }
    }

    /**
     * Notifica tutti i listener sottoscritti di un cambiamento di attributo.
     * Questo è il cuore della reattività dell'MVP.
     * @param {object} changeDetails - Oggetto contenente i dettagli del cambiamento.
     * @param {string} changeDetails.entityId - L'ID dell'entità modificata.
     * @param {string} changeDetails.attributeName - Il nome dell'attributo modificato.
     * @param {*} changeDetails.newValue - Il nuovo valore dell'attributo.
     */
    notifyChange(changeDetails) {
        const { entityId, attributeName, newValue } = changeDetails;
        
        console.log(`AttributeSpace: Notificando cambiamento - Entità: ${entityId}, Attributo: ${attributeName}, Nuovo valore: ${newValue}`);
        console.log(`Numero di listeners da notificare: ${this.listeners.length}`);

        // Itera su tutti i listeners e li chiama con i dettagli del cambiamento
        this.listeners.forEach((callback, index) => {
            try {
                callback(changeDetails);
            } catch (error) {
                console.error(`Errore durante l'esecuzione del listener ${index}:`, error);
                // Continua con gli altri listeners anche se uno fallisce
            }
        });
    }

    /**
     * Restituisce il numero corrente di listeners sottoscritti.
     * Utile per debugging e monitoring.
     * @returns {number} Il numero di listeners attivi.
     */
    getListenerCount() {
        return this.listeners.length;
    }

    /**
     * Rimuove tutti i listeners.
     * Utile per reset o cleanup.
     */
    clearAllListeners() {
        const count = this.listeners.length;
        this.listeners = [];
        console.log(`Tutti i listeners rimossi. Erano ${count} listeners attivi.`);
    }
}

// Esportazione del modulo
module.exports = AttributeSpace_MVP; 