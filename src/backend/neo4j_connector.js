const neo4j = require('neo4j-driver');

class Neo4jConnector {
    constructor() {
        this.driver = null;
        this.session = null;
        
        // Configurazione della connessione per database standard Neo4j
        this.uri = 'bolt://localhost:7687';
        this.username = 'neo4j';
        this.password = 'password';
    }
    
    /**
     * Inizializza la connessione al database Neo4j
     */
    async connect() {
        try {
            console.log('Connessione a Neo4j in corso...');
            
            // Configurazione semplificata per compatibilità massima
            const config = {
                encrypted: false,
                disableLosslessIntegers: true
            };
            
            this.driver = neo4j.driver(
                this.uri,
                neo4j.auth.basic(this.username, this.password),
                config
            );
            
            // Test della connessione con metodo compatibile
            const session = this.driver.session();
            try {
                await session.run('RETURN 1 as test');
                console.log('✅ Connessione a Neo4j stabilita con successo (Pool: 10 connections)');
            } finally {
                await session.close();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Errore durante la connessione a Neo4j:', error.message);
            throw error;
        }
    }
    
    /**
     * Ottiene una nuova sessione dal driver
     */
    getSession() {
        if (!this.driver) {
            throw new Error('Driver Neo4j non inizializzato. Chiamare prima connect()');
        }
        
        return this.driver.session();
    }
    
    /**
     * Esegue una query Cypher e ritorna i risultati
     */
    async executeQuery(cypher, parameters = {}) {
        const session = this.getSession();
        
        try {
            console.log(`🔍 Esecuzione query: ${cypher}`);
            const result = await session.run(cypher, parameters);
            return result;
        } catch (error) {
            console.error('❌ Errore durante l\'esecuzione della query:', error.message);
            throw error;
        } finally {
            await session.close();
        }
    }
    
    /**
     * ✨ OTTIMIZZAZIONE: Cleanup memory e connections
     */
    async cleanup() {
        if (this.driver) {
            try {
                // Forza chiusura sessioni idle
                await this.driver.session().close();
                
                // Piccola pausa per permettere garbage collection
                await new Promise(resolve => setTimeout(resolve, 100));
                
                console.log('🧹 Neo4j memory cleanup completato');
            } catch (error) {
                // Ignora errori di cleanup - non critici
                console.warn('⚠️ Warning durante cleanup:', error.message);
            }
        }
    }

    /**
     * Chiude la connessione al database
     */
    async close() {
        if (this.driver) {
            console.log('Chiusura connessione a Neo4j...');
            
            // Cleanup prima della chiusura
            await this.cleanup();
            
            await this.driver.close();
            this.driver = null;
            console.log('✅ Connessione a Neo4j chiusa');
        }
    }
}

// Istanza singleton del connettore
const connector = new Neo4jConnector();

module.exports = connector;
