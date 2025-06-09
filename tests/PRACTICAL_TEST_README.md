# Test Pratico Backend SSOT

Test completo end-to-end per verificare il funzionamento reale del sistema SSOT con scenario pratico.

## Scenario Test

**Gestione Contatti Aziendali**: Sistema per gestire persone, aziende e relazioni lavorative con:
- Schema evolution real-time
- Entità first-class (Persone, Aziende)
- Relazioni tipizzate (Chi lavora dove)
- WebSocket notifications
- Persistenza Neo4j completa

## Come Eseguire

### 1. Prerequisiti
```bash
# Assicurati che Neo4j sia in esecuzione
# Default: bolt://localhost:7687
```

### 2. Avvia il Server
```bash
# Terminal 1: Avvia il server SSOT
npm start
```

### 3. Esegui il Test Client
```bash
# Terminal 2: Esegui il test pratico
npm run test:practical
```

## Cosa Testa

### Fase 1: Connessione Server ✅
- Server HTTP raggiungibile
- WebSocket connection attiva  
- API health check

### Fase 2: Schema Management ✅
- Creazione schema Persona (nome, cognome, età)
- Creazione schema Azienda (nome, settore, dipendenti)
- Creazione schema relazione Lavora (dataInizio, ruolo, stipendio)
- Verifica persistenza schemi

### Fase 3: Entity Operations ✅
- Creazione 5 persone (Mario, Luigi, Anna, Marco, Sara)
- Creazione 3 aziende (TechCorp, FinanceInc, StartupXYZ)
- Test retrieval per tipo e per ID
- Test update attributi

### Fase 4: Relations Management ✅
- Creazione 5 relazioni Lavora (chi lavora dove)
- Navigazione bidirezionale delle relazioni
- Verifica attributi relazione (ruolo, stipendio, data)

### Fase 5: Schema Evolution ✅
- Aggiunta campo email a Persona (real-time)
- Aggiunta campo telefono a Persona
- Verifica propagazione schema
- Test update con nuovi campi

### Fase 6: Real-time Events ✅
- Monitor eventi WebSocket
- Verifica tipi di eventi ricevuti
- Test latency eventi (<1s)

### Fase 7: Consistency & Performance ✅
- Verifica integrità dati
- Test performance queries
- Monitor memory usage

## Output Atteso

```
🧪 SSOT Backend - Test Pratico con Client
════════════════════════════════════════

🚀 FASE: 1. Connessione Server
══════════════════════════════════════════════════
✅ Verifica Server HTTP (45ms)
✅ Connessione WebSocket (123ms)
✅ Health Check API (67ms)

📊 1. Connessione Server: 3/3 test passed (235ms)

🚀 FASE: 2. Schema Management
══════════════════════════════════════════════════
✅ Crea Schema Persona (156ms)
✅ Crea Schema Azienda (89ms)
✅ Crea Schema Relazione Lavora (134ms)
✅ Verifica Persistenza Schemi (45ms)

📊 2. Schema Management: 4/4 test passed (424ms)

[... continua con tutte le fasi ...]

🎯 REPORT FINALE
═════════════════
📊 Test eseguiti: 25
✅ Superati: 25  
❌ Falliti: 0
🎯 Success rate: 100.0%
⏱️ Tempo totale: 4235ms

🌐 WebSocket Events: 18 ricevuti

🎉 SISTEMA BACKEND COMPLETAMENTE FUNZIONANTE!
```

## Interpretazione Risultati

### ✅ Successo (100% test passed)
Il backend SSOT è completamente funzionante:
- Tutti i componenti operativi
- Schema evolution funziona
- Relazioni first-class operative
- Real-time sync attivo
- Persistenza garantita

### ⚠️ Parziale (90-99% test passed)
Sistema principalmente funzionante con alcuni problemi minori:
- Controllare i test falliti specifici
- Possibili problemi di performance o timing
- WebSocket potrebbe avere latenza alta

### ❌ Fallimento (<90% test passed)
Problemi significativi nel backend:
- Verificare connessione Neo4j
- Controllare configurazione server
- Possibili errori nei componenti core

## Debugging

### Problemi Comuni

**Server non raggiungibile**:
```bash
# Verifica che il server sia avviato
npm start

# Verifica porta 3000 libera
lsof -i :3000
```

**Neo4j connection failed**:
```bash
# Verifica Neo4j running
neo4j status

# Verifica credenziali in src/backend/neo4j_connector.js
```

**WebSocket connection timeout**:
- Server potrebbe non supportare WebSocket
- Firewall che blocca connessioni WS
- Controllare implementazione WebSocket nel server

**Test falliti sporadici**:
- Possibili race conditions
- Aumentare timeout nei test
- Verificare cleanup tra test

## Personalizzazione

### Modificare Scenario Test
Edita `tests/utils/test-data.js` per:
- Cambiare dati di test (nomi, aziende)
- Aggiungere nuovi tipi di entità
- Modificare attributi degli schemi

### Aggiungere Nuovi Test
Edita `tests/practical-client-test.js`:
- Aggiungi nuove fasi al metodo `runAllTests()`
- Implementa nuovi metodi di test
- Personalizza scenari per il tuo use case

### Configurare Timing
Modifica timeout e delays:
```javascript
// In practical-client-test.js
await this.sleep(100); // Aumenta per sistemi lenti
const maxWait = 1000;   // Timeout WebSocket events
```

## Integrazione CI/CD

```bash
# Script per CI/CD
#!/bin/bash
npm start &
SERVER_PID=$!

sleep 5  # Attendi avvio server

npm run test:practical
TEST_RESULT=$?

kill $SERVER_PID
exit $TEST_RESULT
```