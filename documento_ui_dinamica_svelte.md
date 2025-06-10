# Documento Operativo: UI Dinamica con Svelte - Sistema Modulo-Entità Gerarchico

## 1. VISIONE E MODELLO CONCETTUALE

### 1.1 Esempio Concreto: Crew List di un Progetto

```
Progetto: "Film: Inception"
    ↓ HAS_MODULE
ModuleInstance: "Crew List - Inception" 
    ↓ CONTAINS (con attributi relazionali)
    ├── Persona: "Christopher Nolan" [fee: $2M, ruolo: "Director"]
    ├── Persona: "Leonardo DiCaprio" [fee: $20M, ruolo: "Lead Actor"] 
    ├── Persona: "Hans Zimmer" [fee: $1M, ruolo: "Composer"]
    └── Persona: "Wally Pfister" [fee: $500K, ruolo: "Cinematographer"]
```

### 1.2 Struttura Relazionale Gerarchica

**Livello 1**: `Progetto` (entità madre)
**Livello 2**: `ModuleInstance` (contenitore semantico-operativo)  
**Livello 3**: `Entità` (membri del modulo)

**Relazioni**:
- `ModuleInstance → BELONGS_TO → Progetto`
- `Entità → MEMBER_OF → ModuleInstance` (con attributi: fee, ruolo, date, etc.)

### 1.3 Principi Chiave

1. **ModuleInstance come Hub Semantico**: Tutte le entità del modulo sono in relazione con il ModuleInstance stesso, non tra loro direttamente
2. **Attributi Relazionali**: La relazione `MEMBER_OF` contiene attributi specifici al contesto (fee, ruolo, date)
3. **Sistema Operativo + Data Entry + Visualizzazione**: Un'unica interfaccia per tutte le operazioni
4. **Query Bidirezionali**: Possibilità di navigare dall'entità al progetto e viceversa

### 1.4 Query Bidirezionali Possibili

```cypher
// Di che crew list ha fatto parte Persona X?
MATCH (p:Persona {name: "Hans Zimmer"})-[r:MEMBER_OF]->(m:ModuleInstance)-[:BELONGS_TO]->(proj:Progetto)
RETURN proj.name, m.instanceName, r.ruolo, r.fee

// Chi è nella crew list del Progetto Y?  
MATCH (proj:Progetto {name: "Inception"})<-[:BELONGS_TO]-(m:ModuleInstance)<-[r:MEMBER_OF]-(p:Persona)
RETURN p.name, r.ruolo, r.fee

// Qual è la fee totale della crew del progetto?
MATCH (proj:Progetto {name: "Inception"})<-[:BELONGS_TO]-(m:ModuleInstance)<-[r:MEMBER_OF]-(p:Persona)
RETURN SUM(r.fee) as totalBudget
```

## 2. ARCHITETTURA UI SVELTE

### 2.1 Struttura Componenti

```
/frontend/svelte/
├── components/
│   ├── DynamicModuleGrid.svelte     # Griglia modulo con context awareness
│   ├── SmartInput.svelte            # Input con autocomplete contestuale
│   ├── RelationAttributeEditor.svelte # Editor attributi relazione (fee, ruolo)
│   ├── ModuleHeader.svelte          # Header con info progetto madre
│   └── EntityCard.svelte            # Card entità con attributi relazionali
├── stores/
│   ├── moduleStore.js               # Store ModuleInstance corrente
│   ├── projectStore.js              # Store Progetto madre
│   └── relationAttributeStore.js    # Store attributi relazioni
└── services/
    ├── ModuleContextService.js      # Gestione contesto modulo
    ├── RelationAttributeService.js  # CRUD attributi relazioni
    └── HierarchicalQueryService.js  # Query gerarchiche
```

### 2.2 Componente Smart Input

**Funzionamento**:
- **Header Cells**: Search attributi/entità/relazioni + "Crea nuovo..." se non trovato
- **Content Cells**: Search entità specifiche + creazione automatica se non esistenti
- **Autocomplete Contestuale**: Suggerimenti basati sul contesto del ModuleInstance

```svelte
<!-- SmartInput.svelte -->
<script>
  export let cellType = 'content'; // 'header' | 'content'
  export let value = '';
  export let rowIndex = 0;
  export let colIndex = 0;
  export let moduleContext = {};
  
  let suggestions = [];
  let showDropdown = false;
  let searchQuery = '';
  
  // Autocomplete differenziato per tipo cella
  $: if (cellType === 'header') {
    loadHeaderSuggestions(searchQuery, moduleContext);
  } else {
    loadContentSuggestions(searchQuery, getColumnContext());
  }
</script>
```

### 2.3 Editor Attributi Relazionali

```svelte
<!-- RelationAttributeEditor.svelte -->
<script>
  export let entityId;
  export let moduleId;
  export let relationAttributes = {};
  
  // Attributi specifici al contesto del modulo
  let fee = relationAttributes.fee || '';
  let ruolo = relationAttributes.ruolo || '';
  let startDate = relationAttributes.startDate || '';
  
  async function updateRelationAttributes() {
    await RelationAttributeService.updateMembershipAttributes(
      entityId, 
      moduleId, 
      { fee, ruolo, startDate }
    );
  }
</script>

<div class="relation-attributes">
  <h4>Attributi per questo modulo:</h4>
  
  <label>
    Fee: <input bind:value={fee} on:blur={updateRelationAttributes} />
  </label>
  
  <label>
    Ruolo: <input bind:value={ruolo} on:blur={updateRelationAttributes} />
  </label>
  
  <label>
    Data inizio: <input type="date" bind:value={startDate} on:blur={updateRelationAttributes} />
  </label>
</div>
```

## 3. BACKEND IMPLEMENTATION

### 3.1 ModuleRelationService

```javascript
// ModuleRelationService.js
export class ModuleRelationService {
  
  // Aggiunge entità al modulo con attributi relazionali
  async addEntityToModule(entityId, moduleId, relationAttributes = {}) {
    const cypher = `
      MATCH (e:Entity {id: $entityId}), (m:ModuleInstance {id: $moduleId})
      CREATE (e)-[r:MEMBER_OF]->(m)
      SET r += $relationAttributes, r.addedAt = timestamp()
      RETURN r
    `;
    
    return await neo4jDAO.executeQuery(cypher, {
      entityId,
      moduleId, 
      relationAttributes
    });
  }
  
  // Aggiorna attributi della relazione entità-modulo
  async updateMembershipAttributes(entityId, moduleId, attributes) {
    const cypher = `
      MATCH (e:Entity {id: $entityId})-[r:MEMBER_OF]->(m:ModuleInstance {id: $moduleId})
      SET r += $attributes, r.lastModified = timestamp()
      RETURN r
    `;
    
    return await neo4jDAO.executeQuery(cypher, {
      entityId,
      moduleId,
      attributes
    });
  }
  
  // Recupera membri del modulo con attributi relazionali
  async getModuleMembers(moduleId) {
    const cypher = `
      MATCH (m:ModuleInstance {id: $moduleId})<-[r:MEMBER_OF]-(e:Entity)
      RETURN e, r, 
             r.fee as fee,
             r.ruolo as ruolo, 
             r.startDate as startDate,
             r.addedAt as addedAt
      ORDER BY r.addedAt DESC
    `;
    
    const result = await neo4jDAO.executeQuery(cypher, { moduleId });
    
    return result.records.map(record => ({
      entity: record.get('e').properties,
      relationAttributes: {
        fee: record.get('fee'),
        ruolo: record.get('ruolo'),
        startDate: record.get('startDate'),
        addedAt: record.get('addedAt')
      }
    }));
  }
  
  // Query bidirezionale: progetti di un'entità
  async getEntityProjects(entityId) {
    const cypher = `
      MATCH (e:Entity {id: $entityId})-[r:MEMBER_OF]->(m:ModuleInstance)-[:BELONGS_TO]->(p:Progetto)
      RETURN p, m, r,
             r.fee as fee,
             r.ruolo as ruolo
      ORDER BY r.addedAt DESC
    `;
    
    return await neo4jDAO.executeQuery(cypher, { entityId });
  }
}
```

### 3.2 Endpoint API

```javascript
// Endpoint per gestione modulo-entità con attributi relazionali

app.post('/api/modules/:moduleId/members', async (req, res) => {
  const { moduleId } = req.params;
  const { entityId, relationAttributes } = req.body;
  
  const result = await moduleRelationService.addEntityToModule(
    entityId, 
    moduleId, 
    relationAttributes
  );
  
  res.json({ success: true, data: result });
});

app.put('/api/modules/:moduleId/members/:entityId/attributes', async (req, res) => {
  const { moduleId, entityId } = req.params;
  const { attributes } = req.body;
  
  await moduleRelationService.updateMembershipAttributes(
    entityId, 
    moduleId, 
    attributes
  );
  
  res.json({ success: true });
});

app.get('/api/modules/:moduleId/members', async (req, res) => {
  const { moduleId } = req.params;
  const members = await moduleRelationService.getModuleMembers(moduleId);
  res.json({ success: true, data: members });
});

app.get('/api/entities/:entityId/projects', async (req, res) => {
  const { entityId } = req.params;
  const projects = await moduleRelationService.getEntityProjects(entityId);
  res.json({ success: true, data: projects });
});
```

## 4. FUNZIONALITÀ OPERATIVE

### 4.1 Scenario Operativo Completo: Crew List

**Setup**: Producer crea ModuleInstance "Crew List" per progetto "Film ABC"

**Data Entry**: 
- Aggiunge "Christopher Nolan" come "Director" con fee "$2M"
- Autocomplete suggerisce persone già nel sistema
- Crea nuova persona se non esiste

**Visualizzazione**:
- Tabella mostra crew con ruoli e fee
- Totali automatici (budget crew)
- Link bidirezionali (altri progetti di Nolan)

**Operations**:
- Modifica fee di una persona
- Aggiunge nuovo membro alla crew
- Esporta lista per contratti
- Query "Qual è il costo totale della crew?"

### 4.2 Vantaggi del Modello

1. **Riflette Framework Mentale**: L'utente pensa "questa è la crew del mio progetto" → il sistema modella esattamente questo
2. **Operativo + Data + Visualizzazione**: Un'unica interfaccia per tutto
3. **Query Bidirezionali**: "In quali progetti ha lavorato X?" e "Chi ha lavorato nel progetto Y?"
4. **Attributi Contestuali**: Fee e ruolo sono specifici al progetto, non generali della persona
5. **Scalabile**: Il pattern si applica a qualsiasi dominio (team, fornitori, location, etc.)

## 5. PIANO DI IMPLEMENTAZIONE

### Fase 1: Modello Relazionale Gerarchico ⭐ (CORRENTE)
- [ ] Implementare ModuleRelationService
- [ ] Creare endpoint per attributi relazionali
- [ ] Test CRUD relazioni con attributi
- [ ] **Fix errore LIMIT Neo4j** (critico - blocking)

### Fase 2: Setup Svelte Environment
- [ ] Configurare Svelte nel progetto esistente
- [ ] Creare struttura componenti base
- [ ] Integrazione con backend esistente

### Fase 3: Smart Input Component
- [ ] Implementare SmartInput.svelte con autocomplete
- [ ] AutocompleteService per suggerimenti contestuali
- [ ] Test input isolato

### Fase 4: Dynamic Grid
- [ ] Griglia dinamica con SmartInput
- [ ] Gestione stato locale (Svelte stores)
- [ ] Sincronizzazione real-time con WebSocket

### Fase 5: Relation Attributes
- [ ] RelationAttributeEditor per fee/ruolo
- [ ] Integration con ModuleRelationService
- [ ] Test CRUD attributi relazionali

### Fase 6: Query Bidirezionali
- [ ] HierarchicalQueryService
- [ ] Endpoint per query complesse
- [ ] Dashboard con insights automatici

### Fase 7: Operazioni Avanzate
- [ ] Calcoli automatici (totali fee)
- [ ] Export/Import crew lists
- [ ] Template moduli riutilizzabili

## 6. NOTE E AGGIORNAMENTI

**Stato Corrente**: Documento creato, definizione modello concettuale completa

**Prossimi Passi**: 
1. Implementazione ModuleRelationService
2. Setup ambiente Svelte

**Da Aggiornare Dopo Ogni Fase**: Questo documento deve essere aggiornato ad ogni completamento di fase per tracciare il progresso e le modifiche.

---

> **IMPORTANTE**: Questo documento deve essere aggiornato ad ogni step completato per mantenere traccia dell'evoluzione del progetto e delle decisioni implementative.