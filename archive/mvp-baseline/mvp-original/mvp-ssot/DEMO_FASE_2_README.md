# 🚀 Demo Fase 2 - Moduli Tabellari Dinamici con Istanze Salvabili

## 📋 Panoramica Demo

Questa demo mostra le **funzionalità complete della Fase 2** del sistema SSOT Dinamico, incentrata su:

### ✨ Funzionalità Principali Implementate:

1. **📊 Moduli Tabellari Dinamici**
   - Visualizzazione entità come righe e attributi come colonne
   - **Aggiungi Riga**: Creazione nuove entità con form modale strutturato
   - **Aggiungi Colonna**: Evoluzione schema con nuovi attributi tipizzati
   - **Editing In-Place**: Utilizzo di `attribute-editor.js` con validazione schema-aware

2. **💾 Sistema Istanze Salvabili**
   - **"Salva Vista Come..."**: Salvataggio configurazioni personalizzate
   - **Gestione Istanze**: CRUD completo (visualizza, modifica, duplica, elimina)
   - **Apertura Istanze**: Ripristino viste salvate con configurazioni applicate

3. **🔄 Sincronizzazione Real-time**
   - **Cross-Window Sync**: Aggiornamenti immediati tra finestre multiple
   - **WebSocket Integration**: Propagazione modifiche entità e schema
   - **BroadcastChannel**: Comunicazione istantanea tra dashboard e moduli

4. **🎨 UX Avanzata**
   - **Form Modali**: Interface strutturate per aggiunta entità/attributi
   - **Validazione Schema-Aware**: Supporto tipi (string, integer, email, etc.)
   - **Keyboard Shortcuts**: Enter/Esc per salva/annulla
   - **Indicatori Visivi**: Feedback real-time per modifiche

---

## 🚀 Come Eseguire la Demo

### 1. **Prerequisiti**

```bash
# Assicurati che Neo4j Desktop sia in esecuzione
# Database: neo4j (username: neo4j, password: impostata)

# Assicurati che Node.js sia installato
node --version  # Deve essere >= 14.x
npm --version   # Deve essere >= 6.x
```

### 2. **Avvio Backend**

```bash
# Naviga nella directory backend
cd mvp-ssot/backend

# Installa dipendenze (se non fatto)
npm install

# Avvia il server evoluto (supporta API Fase 2)
node server_evolved.js
```

**Verifica:** Il server dovrebbe mostrare:
```
✅ Server SSOT evoluto avviato su porta 3000
🔗 WebSocket server attivo
📊 Endpoint API evolute disponibili
```

### 3. **Apertura Dashboard Demo**

```bash
# Apri browser e naviga a:
http://localhost:3000/table_demo_dashboard.html
```

**Cosa vedrai:**
- 🎨 Dashboard moderna con sezioni per gestione moduli e istanze
- 🟢 Indicatore connessione (dovrebbe essere verde "Connesso")
- 📊 Sezione "Nuovo Modulo Tabellare" con selezione tipi entità
- 💾 Sezione "Istanze Modulo Salvate" (inizialmente vuota)
- 🐛 Panel debug con log real-time

---

## 🎯 Scenario di Demo Completo

### **Fase A: Creazione e Personalizzazione Modulo**

1. **📊 Apri Nuovo Modulo Tabellare**
   - Seleziona "Contatto" dal dropdown (o inserisci tipo personalizzato)
   - Clicca "🚀 Apri Nuovo Modulo Tabellare"
   - **Risultato**: Si apre una finestra separata con tabella "Contatto"

2. **➕ Aggiungi Nuove Righe (Entità)**
   - Nella finestra modulo, clicca "[Aggiungi Riga]"
   - **Modale strutturata** si apre con campi per l'entità
   - Inserisci: Nome: "Mario Rossi", Email: "mario@test.it"
   - Clicca "Conferma"
   - **Verifica**: Nuova riga appare nella tabella

3. **📋 Aggiungi Nuove Colonne (Attributi)**
   - Clicca "[Aggiungi Colonna]"
   - **Modale tipizzata** si apre:
     - Nome: "telefono"
     - Tipo: "Telefono"
     - Spunta "Campo obbligatorio" se desiderato
     - Descrizione: "Numero di telefono del contatto"
   - Clicca "Conferma"
   - **Verifica**: Nuova colonna "telefono" appare nella tabella

4. **✏️ Modifica Dati In-Place**
   - Clicca su una cella per editarla
   - **Attribute-editor** con validazione real-time
   - Prova con email invalida per vedere validazione
   - Premi Enter per salvare, Esc per annullare

### **Fase B: Salvataggio e Gestione Istanze**

5. **💾 Salva Vista Personalizzata**
   - Clicca "[💾 Salva Vista Come...]"
   - **Modale istanza** si apre:
     - Nome: "Contatti Completi con Telefono"
     - Descrizione: "Vista tabellare contatti con tutti i campi"
   - Clicca "Conferma"
   - **Verifica**: Alert conferma salvataggio

6. **🔄 Verifica Sincronizzazione Dashboard**
   - Torna alla dashboard (non chiudere finestra modulo)
   - Clicca "🔄 Aggiorna Lista Istanze"
   - **Verifica**: La nuova istanza appare nella lista con metadati

7. **📋 Gestione Istanze CRUD**
   - **Apri**: Clicca "🚀 Apri" su un'istanza → Nuova finestra con configurazione applicata
   - **Modifica**: Clicca "✏️ Modifica" → Cambia nome istanza
   - **Duplica**: Clicca "📋 Duplica" → Crea copia dell'istanza
   - **Elimina**: Clicca "🗑️ Elimina" → Rimuovi istanza (con conferma)

### **Fase C: Sincronizzazione Cross-Window**

8. **🪟 Apri Moduli Multipli**
   - Dalla dashboard, apri un secondo modulo "Contatto"
   - **Verifica**: Entrambe le finestre mostrano stessi dati

9. **🔄 Test Sincronizzazione Real-time**
   - In Finestra 1: Modifica un valore (es. telefono di Mario)
   - **Verifica**: Finestra 2 si aggiorna automaticamente
   - In Finestra 2: Aggiungi una nuova colonna (es. "citta")
   - **Verifica**: Finestra 1 si aggiorna con nuova colonna

10. **📊 Evoluzione Schema Cross-Window**
    - In una finestra: Aggiungi attributo "data_nascita" (tipo Date)
    - **Verifica Dashboard**: Log debug mostra "🔧 Aggiornamento schema ricevuto"
    - **Verifica Altre Finestre**: Colonna appare automaticamente

---

## 🔍 Punti di Verifica Chiave

### ✅ **Funzionalità Backend:**
- [ ] API `/api/module-instances` funzionante (POST/GET/PUT/DELETE)
- [ ] Schema evolution con API `/api/schema/entity/:entityType`
- [ ] WebSocket notifications per istanze e modifiche entità
- [ ] Persistenza Neo4j per ModuleInstance

### ✅ **Funzionalità Frontend:**
- [ ] Web Components `attribute-editor` funzionante con validazione
- [ ] Servizi `SaveInstanceService` per CRUD istanze
- [ ] Modali strutturate per aggiunta entità/attributi
- [ ] Comunicazione `BroadcastChannel` cross-window

### ✅ **Esperienza Utente:**
- [ ] Form validazione real-time senza perdita focus
- [ ] Keyboard shortcuts (Enter/Esc) funzionanti
- [ ] Indicatori visivi per modifiche e stato connessione
- [ ] Gestione errori con messaggi user-friendly

### ✅ **Sincronizzazione:**
- [ ] Modifiche dati si propagano tra finestre
- [ ] Modifiche schema si propagano tra finestre
- [ ] Dashboard riceve notifiche creazione/modifica istanze
- [ ] WebSocket reconnection automatica funzionante

---

## 🐛 Troubleshooting

### **Problema: Dashboard non si carica**
```bash
# Verifica che il server sia in esecuzione
curl http://localhost:3000/api/schema/entities
# Dovrebbe rispondere con lista schemi
```

### **Problema: Servizi Fase 2 non disponibili**
```bash
# Verifica che i file servizi esistano:
ls mvp-ssot/frontend/services/
# Dovrebbe mostrare: SaveInstanceService.js, SchemaService.js, etc.
```

### **Problema: WebSocket non si connette**
```bash
# Verifica console browser per errori WebSocket
# Verifica che server_evolved.js (non server.js) sia in esecuzione
```

### **Problema: Modali non si aprono**
```bash
# Verifica console browser per errori JavaScript
# Verifica che TabularModule.js sia stato aggiornato con nuove funzionalità
```

---

## 📊 Database Neo4j - Strutture Create

Durante la demo, verranno create queste strutture in Neo4j:

```cypher
// Schema entità evoluti
(:SchemaEntityType {entityType: "Contatto"})-[:HAS_ATTRIBUTE]->(:AttributeDefinition)

// Istanze modulo salvate
(:ModuleInstance {
  instanceName: "Contatti Completi con Telefono",
  templateModuleId: "DynamicTableModule",
  targetEntityType: "Contatto",
  instanceConfigOverrides: "{...}"
})

// Entità dati
(:Contatto {nome: "Mario Rossi", email: "mario@test.it", telefono: "123456789"})
```

---

## 🚀 Prossimi Passi

Questa demo della **Fase 2** dimostra un sistema completo di gestione moduli tabellari con persistenza e sincronizzazione. 

Per la **Fase 3** futura:
- 🔗 Gestione relazioni tra entità
- 📑 Composizione documenti con moduli multipli  
- 🔍 Ricerca e filtri avanzati
- 🤖 Integrazione LLM per generazione automatica moduli

---

**🎉 Buona Demo! La Fase 2 è completa e operativa!** 🎉 