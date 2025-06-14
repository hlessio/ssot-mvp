# Piano di Implementazione SSOT-4000: La Piattaforma di Conoscenza Operativa

**ID Documento**: IMPL-SSOT-4000  
**Data Creazione**: 14 Giugno 2025  
**Stato**: ACTIVE - In Implementazione  
**Versione**: 1.1  
**Ultimo Aggiornamento**: 14 Giugno 2025 - Fase 1 Completata

## Executive Summary

SSOT-4000 rappresenta l'evoluzione del sistema da applicazione di gestione dati a **piattaforma di conoscenza contestuale**. Questa trasformazione introduce il concetto di **CompositeDocument** come orchestratore di alto livello e un **Workspace Dinamico Svelte** per un'esperienza utente rivoluzionaria.

### Obiettivi Principali
1. Trasformare i moduli da semplici UI a **contenitori semantici** di business
2. Implementare una **gerarchia della conoscenza** a tre livelli
3. Creare un **workspace dinamico** per la composizione visuale dei processi
4. Abilitare l'**ereditarietà del contesto** per automazione intelligente
5. Evolvere verso una **piattaforma estensibile** con SDK dichiarativo

## 1. Principi Concettuali Fondamentali

### 1.1 Il Modulo come Contenitore Semantico
**Trasformazione**: Da componente UI a Meta-Entità che incapsula significato di business e contesto operativo.

**Implementazione**:
- ModuleInstance diventa un costrutto di primo livello
- Separazione tra dati anagrafici (proprietà intrinseche) e dati contestuali (attributi relazionali)
- Prevenzione dell'inquinamento degli schemi base

### 1.2 La Gerarchia della Conoscenza
```
Livello 0: Entità (Dati Base)
    ↓
Livello 1: ModuleInstance (Meta-Entità)
    ↓
Livello 2: CompositeDocument (Meta-Meta-Entità)
```

**Vantaggio**: Query multi-livello potenti e massima riusabilità dei componenti.

### 1.3 Il Principio del Doppio Spazio
- **Grafo dei Dati**: Istanze concrete e operative
- **Grafo delle Definizioni**: Metamodello con regole e template

**Beneficio**: Evoluzione dei processi senza compromettere i dati esistenti.

### 1.4 Ereditarietà del Contesto
**Automazione**: Un CompositeDocument impone contesto globale a tutti i sottomoduli.

**Esempio**: Documento "Callsheet Giorno 3" → Tutti i moduli ereditano il contesto del progetto.

### 1.5 Da Applicazione a Piattaforma
**Vision**: SDK per proliferazione organica dei processi attraverso template JSON dichiarativi.

## 2. Architettura della Soluzione

### 2.1 CompositeDocument: La Meta-Meta-Entità

```javascript
// Struttura nel grafo Neo4j
(doc:CompositeDocument:Entity {
  id: "doc-uuid-1",
  entityType: "CompositeDocument",
  name: "Callsheet Giorno 3",
  description: "Documento di produzione per il terzo giorno di riprese",
  ownerId: "user-123",
  projectId: "proj-inception",  // Contesto globale
  createdAt: timestamp(),
  modifiedAt: timestamp()
})

// Relazione con layout flessibile
(doc)-[r:CONTAINS_MODULE {
  order: 1,
  position: {x: 0, y: 0},
  size: {width: 4, height: 6},
  collapsed: false,
  config: {} // Configurazione specifica del modulo
}]->(module:ModuleInstance)
```

### 2.2 Workspace Dinamico Svelte

**Caratteristiche**:
- Grid/Canvas flessibile per composizione visuale
- Drag & drop per riorganizzazione moduli
- Ridimensionamento dinamico
- Persistenza automatica del layout
- Virtualizzazione per performance

**Stack Tecnologico**:
- Svelte per reattività e gestione stato efficiente
- CSS Grid/Flexbox per layout responsivo
- ResizeObserver API per ridimensionamento
- Intersection Observer per virtualizzazione

### 2.3 Sistema di Ereditarietà Contestuale

```javascript
// Store Svelte per contesto globale
export const documentContext = writable({
  documentId: null,
  projectId: null,
  globalFilters: {},
  inheritedAttributes: {}
});

// Propagazione automatica ai moduli
<ModuleContainer 
  {moduleInstance}
  context={$documentContext}
  on:update={handleModuleUpdate}
/>
```

## 3. Piano di Implementazione Dettagliato

### Fase 1: Backend Foundation (1-2 settimane) ✅ COMPLETATA

**Obiettivo**: Creare le fondamenta per CompositeDocument nel backend.

**Status**: ✅ Completata il 14 Giugno 2025

**Tasks**:
1. **Schema Definition** (`schemaManager`)
   ```javascript
   const compositeDocumentSchema = {
     type: 'CompositeDocument',
     attributes: {
       name: { type: 'string', required: true },
       description: { type: 'text' },
       projectId: { type: 'reference', targetType: 'Project' },
       layout: { type: 'json', default: {} }
     }
   };
   ```

2. **DocumentService** (`src/backend/services/DocumentService.js`)
   - CRUD operations per CompositeDocument
   - Gestione relazioni CONTAINS_MODULE
   - Propagazione contesto ai moduli

3. **API Endpoints**
   - `POST /api/documents` - Crea documento
   - `GET /api/documents/:id` - Recupera con moduli
   - `PUT /api/documents/:id` - Aggiorna layout/moduli
   - `DELETE /api/documents/:id` - Elimina documento
   - `PUT /api/documents/:id/modules` - Gestione moduli

4. **WebSocket Integration**
   - Eventi per modifiche documento
   - Sincronizzazione layout real-time

### Fase 2: Svelte Workspace Base (2-3 settimane)

**Obiettivo**: Implementare il workspace di base con Svelte.

**Tasks**:
1. **Setup Svelte** 
   - Configurazione Rollup
   - Struttura directory `src/frontend/svelte/`
   - Integration con build esistente

2. **Core Components**
   ```
   DocumentWorkspace.svelte    // Container principale
   ModuleContainer.svelte      // Wrapper per singolo modulo
   GridLayout.svelte          // Sistema di griglia
   WorkspaceHeader.svelte     // Header con azioni documento
   ```

3. **State Management**
   ```javascript
   // stores/document.js
   export const currentDocument = writable(null);
   export const documentModules = writable([]);
   export const layoutConfig = writable({});
   ```

4. **Service Integration**
   - DocumentService frontend
   - WebSocket subscription per updates

### Fase 3: Rendering e Contesto (2 settimane)

**Obiettivo**: Implementare rendering dinamico con ereditarietà del contesto.

**Tasks**:
1. **Dynamic Module Loading**
   - Caricamento lazy dei moduli
   - Gestione errori graceful
   - Loading states

2. **Context Inheritance**
   ```svelte
   <!-- ModuleContainer.svelte -->
   <script>
     export let moduleInstance;
     export let documentContext;
     
     $: moduleContext = {
       ...moduleInstance.context,
       ...documentContext,
       moduleId: moduleInstance.id
     };
   </script>
   ```

3. **SmartInput Integration**
   - Componente unificato per input contestuali
   - Query filtrate per contesto
   - Creazione inline di entità

4. **Relation Attribute Editor**
   - Editor per attributi contestuali
   - Validazione in tempo reale

### Fase 4: Interattività Avanzata (2 settimane)

**Obiettivo**: Workspace completamente interattivo con persistenza.

**Tasks**:
1. **Drag & Drop System**
   - Riorganizzazione moduli
   - Drop zones visibili
   - Animazioni fluide

2. **Resize Functionality**
   - Handle di ridimensionamento
   - Snap to grid
   - Limiti min/max

3. **Module Palette**
   - Lista moduli disponibili
   - Drag to add
   - Anteprima hover

4. **Layout Persistence**
   - Auto-save con debounce
   - Undo/Redo support
   - Layout templates

### Fase 5: Ottimizzazione e Polish (1-2 settimane)

**Obiettivo**: Performance, UX refinement e documentazione.

**Tasks**:
1. **Performance Optimization**
   - Virtual scrolling per grandi workspace
   - Lazy rendering dei moduli fuori viewport
   - Memoization aggressive

2. **UX Enhancements**
   - Onboarding guidato
   - Tooltips contestuali
   - Keyboard shortcuts

3. **Testing & Documentation**
   - Test E2E completi
   - Documentazione utente
   - API documentation

4. **Migration & Cleanup**
   - Deprecazione vecchie UI
   - Tool di migrazione
   - Cleanup codebase

## 4. Gestione dei Rischi e Mitigazioni

### 4.1 Performance
**Rischio**: Rallentamenti con molti moduli complessi nel workspace.

**Mitigazione**:
- **Virtual Scrolling**: Renderizza solo moduli nel viewport
- **Lazy Loading**: Carica dati modulo on-demand
- **Web Workers**: Elaborazione pesante off main thread
- **Limite pratico**: Max 50 moduli visibili contemporaneamente

```javascript
// Esempio virtualizzazione
import VirtualGrid from './VirtualGrid.svelte';

<VirtualGrid 
  items={modules}
  itemHeight={300}
  buffer={2}
  on:visible={loadModuleData}
/>
```

### 4.2 Complessità
**Rischio**: Sistema troppo complesso da mantenere.

**Mitigazione**:
- **Architettura modulare**: Componenti indipendenti e testabili
- **Store centralizzati**: Single source of truth per stato
- **Documentazione inline**: JSDoc per tutte le funzioni pubbliche
- **Convenzioni rigorose**: Naming e struttura consistenti

### 4.3 User Experience
**Rischio**: Interfaccia overwhelming per nuovi utenti.

**Mitigazione**:
- **Progressive Disclosure**: Inizia con layout semplice (colonna singola)
- **Preset Templates**: Workspace pre-configurati per casi comuni
- **Guided Tours**: Onboarding interattivo con Shepherd.js
- **Modalità Semplificata**: Toggle per nascondere features avanzate

```javascript
// Layout progressivo
const layoutModes = {
  simple: { columns: 1, dragEnabled: false },
  standard: { columns: 2, dragEnabled: true },
  advanced: { freeform: true, allFeatures: true }
};
```

### 4.4 Compatibilità
**Rischio**: Breaking changes per utenti esistenti.

**Mitigazione**:
- **Dual Mode**: Mantieni accesso legacy ai singoli moduli
- **Migration Assistant**: Tool per convertire vecchie configurazioni
- **Feature Flag**: Abilita nuovo workspace gradualmente
- **Fallback Automatico**: Se workspace fails, apri modulo singolo

## 5. Criteri di Successo

### Funzionalità Core
- [x] CRUD completo per CompositeDocument ✅ (Fase 1)
- [ ] Workspace Svelte renderizza multipli moduli
- [ ] Drag & drop funzionante con persistenza
- [x] Ereditarietà contesto verificata ✅ (Fase 1 - fondamenta)
- [x] WebSocket sync tra client multipli ✅ (Fase 1 - eventi documento)

### Performance
- [ ] Caricamento iniziale < 2 secondi
- [ ] Interazioni drag/resize < 16ms (60fps)
- [ ] Supporto 50+ moduli con virtualizzazione
- [ ] Memory footprint stabile

### User Experience
- [ ] Onboarding completo < 2 minuti
- [ ] Zero errori in console durante uso normale
- [ ] Feedback visuale per tutte le azioni
- [ ] Undo/Redo per operazioni principali

### Quality
- [ ] Test coverage > 80%
- [ ] Documentazione API completa
- [ ] Zero regression sui test esistenti
- [ ] Code review approvato

## 6. Timeline e Milestone

```
Settimana 1-2:   Fase 1 - Backend Foundation
                 ├── Schema e DAO
                 └── API REST

Settimana 3-5:   Fase 2 - Svelte Workspace
                 ├── Setup e componenti base
                 └── State management

Settimana 6-7:   Fase 3 - Rendering e Contesto
                 ├── Module loading dinamico
                 └── Context inheritance

Settimana 8-9:   Fase 4 - Interattività
                 ├── Drag & Drop
                 └── Persistenza layout

Settimana 10-11: Fase 5 - Ottimizzazione
                 ├── Performance tuning
                 └── Polish e docs

Settimana 12:    Release & Monitoring
```

### Milestone Chiave
- **M1** (Sett. 2): Backend pronto, primi test API ✅ **RAGGIUNTO 14/06/2025**
  - Schema CompositeDocument definito
  - DocumentService implementato
  - API endpoints completi
  - 12 test di integrazione passing (100% coverage)
- **M2** (Sett. 5): Workspace base funzionante
- **M3** (Sett. 7): Contesto e SmartInput integrati
- **M4** (Sett. 9): Feature complete
- **M5** (Sett. 11): Production ready

## 7. Note Tecniche di Implementazione

### Gestione dello Stato Svelte
```javascript
// stores/workspace.js
import { writable, derived } from 'svelte/store';

export const workspace = writable({
  document: null,
  modules: [],
  layout: {},
  selection: null,
  isDragging: false
});

export const visibleModules = derived(
  workspace,
  $workspace => calculateVisible($workspace.modules, viewport)
);
```

### Pattern di Comunicazione
```javascript
// Workspace → Module
dispatch('context-change', { projectId });

// Module → Workspace  
dispatch('request-save', { moduleId, data });

// Workspace → Backend
await documentService.updateLayout(documentId, newLayout);

// Backend → All Clients (WebSocket)
broadcast('document:layout:updated', { documentId, layout });
```

### Ottimizzazione Rendering
```javascript
// Usa Svelte reactive blocks con cautela
$: expensiveComputation && requestIdleCallback(() => {
  // Calcoli pesanti fuori dal render cycle
});

// Memoizza componenti pesanti
const MemoizedModule = memoize(ModuleRenderer, 
  (props) => props.moduleId + props.version
);
```

## 8. Conclusione

SSOT-4000 rappresenta un salto evolutivo fondamentale, trasformando il sistema in una vera piattaforma di conoscenza operativa. Il piano bilancia ambizione e pragmatismo, con particolare attenzione a performance e UX.

Il successo dipenderà da:
1. Implementazione incrementale con feedback continuo
2. Focus su semplicità iniziale con crescita progressiva
3. Testing rigoroso ad ogni fase
4. Documentazione come first-class citizen

---

**Prossimi Passi**:
1. ~~Review e approvazione del piano~~ ✅
2. Setup ambiente Svelte ⬅️ **NEXT**
3. ~~Inizio Fase 1 con schema CompositeDocument~~ ✅
4. Implementazione componenti Svelte base (Fase 2)

**Risultati Fase 1**:
- ✅ CompositeDocument schema con tutti gli attributi
- ✅ DocumentService con CRUD completo
- ✅ Gestione relazioni CONTAINS_MODULE con layout
- ✅ API REST endpoints funzionanti
- ✅ WebSocket integration per real-time sync
- ✅ 12/12 test di integrazione passing
- ✅ JSON serialization per Neo4j
- ✅ Context inheritance foundation

**Documento mantenuto da**: Team SSOT Development  
**Ultimo aggiornamento**: 14 Giugno 2025 (Fase 1 Completata)