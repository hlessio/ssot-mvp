# Documento Tecnico: Evoluzione Core Engine e Gestione Schemi SSOT (Versione 1.0)

[Nota per l'LLM: Questo documento è un piano tecnico dettagliato per evolvere il backend del sistema SSOT dalla versione MVP attuale verso una versione più robusta e allineata con la visione completa delineata in `full-ssot.md`. ✅ **FASE 1 COMPLETATA** - SchemaManager evoluto, DAO evoluto e API schema implementati e testati.]

## 1. Introduzione

### 1.1. Scopo del Documento

Questo documento definisce l'architettura tecnica e il piano di implementazione per il prossimo macro passo evolutivo del sistema SSOT Dinamico: il potenziamento del Core Engine Backend e l'evoluzione del Sistema di Gestione degli Schemi.

**✅ STATO IMPLEMENTAZIONE**: La **Fase 1 del piano** (SchemaManager evoluto, DAO evoluto, API schema) è stata **completamente implementata e testata** con successo. Il sistema ora supporta schema evolution real-time con persistenza completa su Neo4j.

L'obiettivo è trasformare i componenti `_MVP` attuali in un'architettura più sofisticata, robusta e allineata con la visione completa del SSOT Dinamico descritta in `full-ssot.md`.

### 1.2. Obiettivi Primari del Macro Passo

1. ✅ **Evoluzione del Schema Manager**: Da `SchemaManager_MVP` a `SchemaManager` evoluto con persistenza completa, evoluzione dinamica e versionamento - **COMPLETATO**
2. ✅ **Introduzione del Relation Engine**: Implementazione di un nuovo componente che gestisce le relazioni come entità di prima classe - **COMPLETATO**
3. ⏳ **Evoluzione dell'Entity Engine**: Da `EntityEngine_MVP` a un `EntityEngine` completo con lazy loading e integrazione schema avanzata - **PROSSIMO**
4. ⏳ **Potenziamento dell'AttributeSpace**: Miglioramenti nella gestione delle sottoscrizioni e propagazione dei cambiamenti - **PROSSIMO**

### 1.3. Allineamento con la Visione Strategica SSOT (Rif. `full-ssot.md`)

✅ **Implementazione Fase 1** ha realizzato i seguenti principi chiave:

- **Schema Evolution**: ✅ Implementazione completa della capacità degli schemi di evolversi dinamicamente con formalizzazione di attributi scoperti (Sezione 5.1 di `full-ssot.md`)
- **Persistenza Intelligente**: ✅ Fondamenta per la memorizzazione ottimizzata degli schemi descritta nella Sezione 8.5
- **Crescita Organica della Conoscenza**: ✅ Abilitazione del sistema a partire da un nucleo definito e ad evolvere attraverso l'uso, formalizzando nuovi pattern informativi

⏳ **Prossime Fasi** implementeranno:
- **Entità e Relazioni come Fondamenta**: Realizzazione completa del concetto di relazioni come entità di prima classe (Sezione 2 di `full-ssot.md`)
- **Reattività Pervasiva**: Miglioramento del sistema nervoso informativo per propagazione intelligente (Sezione 8.4)

### 1.4. Principi di Progettazione Guida per l'Evoluzione

- ✅ **Estensibilità**: Ogni componente progettato per future espansioni - dimostrato dalla coesistenza MVP/Evoluto
- ✅ **Testabilità**: Separazione chiara delle responsabilità e API ben definite - verificato con test end-to-end
- ✅ **Performance**: Ottimizzazioni per gestire carichi maggiori - implementate query Cypher ottimizzate
- ✅ **Retrocompatibilità**: Impatto minimizzato sui componenti frontend esistenti - mantenuta compatibilità completa
- ✅ **Modularità**: Componenti loosely coupled con interfacce chiare - dimostrato dalla struttura implementata

### 1.5. Riferimenti Documentali Chiave

- `full-ssot.md`: Visione completa del sistema SSOT Dinamico
- `architettura_mvp_evoluto.md`: ✅ **NUOVO** - Architettura attuale del sistema evoluto
- `context.md`: ✅ **AGGIORNATO** - Diario di bordo con stato implementazione completa Fase 1
- `manuale_sviluppo_mvp.md`: Guida di sviluppo dell'MVP originale (riferimento storico)

## 2. ✅ FASE 1 COMPLETATA: SchemaManager Evoluto e Persistenza Schema

### 2.1. Stato Implementazione: Schema Management Completo

**✅ IMPLEMENTATO E TESTATO**:

**SchemaManager Evoluto** (`backend/core/schemaManager_evolved.js`):
- ✅ Persistenza completa degli schemi su Neo4j con strutture relazionali
- ✅ API per creazione, caricamento, evoluzione schemi dinamica
- ✅ Operazioni additive-only per sicurezza dati (MERGE, ON CREATE SET)
- ✅ Supporto modalità 'strict' e 'flexible' per validazione
- ✅ Gestione versioning e audit trail modifiche schema

**DAO Evoluto** (`backend/dao/neo4j_dao_evolved.js`):
- ✅ Query Cypher ottimizzate per gestione schemi
- ✅ Funzioni complete per CRUD schemi entità e relazioni
- ✅ Operazioni `addAttributeToSchema` sicure senza DELETE
- ✅ Logging dettagliato per debugging e monitoraggio

**Server API Evoluto** (`backend/server_evolved.js`):
- ✅ Nuovi endpoint API `/api/schema/entity/*` e `/api/schema/relation/*`
- ✅ Backward compatibility completa con API MVP originali
- ✅ Gestione errori robusta e logging dettagliato
- ✅ WebSocket integration per propagazione schema changes

### 2.2. Modello Dati Neo4j Implementato per Schemi

**✅ STRUTTURE SCHEMA COMPLETE**:

```cypher
-- Schema Entity Types
(:SchemaEntityType {
    entityType: "Cliente",
    version: 2,
    mode: "flexible",
    created: timestamp,
    modified: timestamp,
    constraints: []
})-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "email",
    type: "email",
    required: false,
    defaultValue: null,
    description: "Email del cliente",
    validationRules: "[]"
})

-- Schema Relation Types
(:SchemaRelationType {
    relationType: "Conosce",
    version: 1,
    cardinality: "N:M",
    sourceTypes: ["Persona"],
    targetTypes: ["Persona"],
    created: timestamp,
    modified: timestamp
})-[:HAS_ATTRIBUTE]->(:AttributeDefinition {
    name: "dataIncontro",
    type: "date",
    required: true,
    description: "Data primo incontro"
})
```

**✅ SCHEMI PRECARICATI E TESTATI**:
- ✅ Schema 'Cliente', 'Persona', 'Contact', 'Ordine', 'TestEvoluzione'
- ✅ Schema relazioni 'Conosce', 'HaCliente' con attributi relazionali
- ✅ Validazione persistenza e recovery dopo restart server

### 2.3. Frontend Schema-Aware Implementato

**✅ MODULI UI EVOLUTI**:

**TabularModule Evoluto** (`frontend/modules/TabularModule.js`):
- ✅ Lettura dinamica `entityType` da URL parameters per multi-finestre
- ✅ Utilizzo API evolute con fallback graceful a API MVP
- ✅ UI per evoluzione schema (aggiunta attributi) real-time
- ✅ Notifica cross-window per cambiamenti struttura schema

**Cross-Window Schema Synchronization**:
- ✅ Nuovi eventi 'schema-update' per propagazione struttura
- ✅ Re-rendering automatico tabelle con nuove colonne
- ✅ Sincronizzazione sia dati che schema tra finestre multiple

### 2.4. Funzionalità End-to-End Testate e Validate

**✅ TEST SCHEMA EVOLUTION COMPLETATI**:
1. ✅ Creazione schema da zero con primi attributi
2. ✅ Evoluzione schema esistente con nuovi attributi  
3. ✅ Propagazione cross-window modifiche struttura
4. ✅ Persistenza e recovery dopo restart server
5. ✅ Backward compatibility con componenti MVP

**✅ SCENARIOS OPERATIVI VALIDATI**:
- ✅ Aggiunta attributi senza restart server o perdita dati
- ✅ Multi-entity type management (`TestEvoluzione`, `Cliente`, etc.)
- ✅ URL parameters per entity types specifici in finestre separate
- ✅ Coesistenza pacifica componenti MVP e evoluti

## 3. Contesto: Stato Attuale del Backend (Post Fase 1)

### 3.1. Architettura Backend Attuale (Evoluta)

**✅ COMPONENTI IMPLEMENTATI**:

**SchemaManager Evoluto** (`backend/core/schemaManager_evolved.js`):
- ✅ Persistenza completa schemi con versioning
- ✅ Evoluzione dinamica real-time senza restart
- ✅ Validazione e modalità flessibili (strict/flexible)
- ✅ API complete per gestione lifecycle schema

**DAO Evoluto** (`backend/dao/neo4j_dao_evolved.js`):
- ✅ Query Cypher ottimizzate per performance
- ✅ Operazioni additive-only per sicurezza dati
- ✅ Gestione completa CRUD schemi entità e relazioni

**Server Evoluto** (`backend/server_evolved.js`):
- ✅ API RESTful complete per schema management
- ✅ WebSocket integration per real-time updates
- ✅ Backward compatibility mantenuta

**🔄 COMPONENTI MVP MANTENUTI** (per compatibilità):
- 🔄 EntityEngine_MVP (`backend/core/entityEngine.js`)
- 🔄 AttributeSpace_MVP (`backend/core/attributeSpace.js`)
- 🔄 Neo4jDAO (`backend/dao/neo4j_dao.js`)

### 3.2. Capacità Attuali del Sistema Evoluto

**✅ FUNZIONALITÀ OPERATIVE**:
- ✅ Schema evolution real-time con UI intuitiva
- ✅ Persistenza permanente configurazioni schema
- ✅ Multi-window synchronization per dati e struttura
- ✅ API backward-compatible per migrazione graduale
- ✅ Operazioni additive-only per integrità dati

**⏳ LIMITAZIONI IDENTIFICATE** (per prossime fasi):
1. **Mancanza di Relazioni Strutturate**: Le relazioni non sono ancora gestite come entità di prima classe
2. **EntityEngine Basilare**: Manca lazy loading, validazioni avanzate e gestione del ciclo di vita completa
3. **AttributeSpace Semplificato**: Mancano pattern matching avanzati e gestione ottimizzata della propagazione

## 4. Fasi Implementate e Prossime

### 4.1. ✅ FASE 2 COMPLETATA: RelationEngine (Settimane 1-2)

**✅ IMPLEMENTAZIONE COMPLETATA**:
- **✅ Task 2.1**: Modello Dati Relazioni - Implementato con nodi `:Relation` su Neo4j
- **✅ Task 2.2**: RelationEngine Implementation - Classe completa con tutte le funzionalità core
- **✅ Task 2.3**: API Server per Relazioni e Compatibilità Sistema:
    - ✅ Endpoint API `/api/relations/*` implementati e testati nel `server_evolved.js`
    - ✅ Gestione completa CRUD per relazioni via API RESTful
    - ✅ Notifiche WebSocket per `relation-created`, `relation-updated`, `relation-deleted`
    - ✅ Metodi di compatibilità con EntityEngine_MVP implementati e testati

**Funzionalità RelationEngine Implementate**:
- ✅ Creazione relazioni tipizzate con attributi custom
- ✅ Validazione automatica contro schemi relazione
- ✅ Ricerca relazioni con pattern flessibili  
- ✅ Navigazione entità correlate bidirezionale
- ✅ Aggiornamento attributi relazione
- ✅ Persistenza completa su Neo4j con nodi `:Relation`
- ✅ Statistiche e monitoraggio relazioni
- ✅ Caricamento e sincronizzazione da database
- ✅ Integrazione con SchemaManager evoluto

**Test End-to-End Validati**:
- ✅ Creazione relazioni "Lavora" (Persona → Azienda) e "Conosce" (Persona → Persona)
- ✅ Validazione schema (corretto rifiuto relazioni non conformi)
- ✅ Gestione attributi relazionali (dataInizio, ruolo, stipendio, dataIncontro, luogo)
- ✅ Compatibilità con EntityEngine_MVP tramite metodi bridge
- ✅ Test API RESTful per relazioni (GET, POST, PUT, DELETE) con `curl` e script di test
- ✅ Propagazione WebSocket per eventi relazioni verificata

### 4.2. ⏳ FASE 3: EntityEngine Evoluto (Settimane 3-4) - **PROSSIMO**

**Obiettivi Fase 3**:
- Evoluzione EntityEngine_MVP verso EntityEngine completo
- Lazy loading e schema integration
- Gestione attributi di tipo 'reference' via RelationEngine

**Task 3.1: EntityEngine Evolution**
- [ ] Refactoring `EntityEngine_MVP` verso `EntityEngine`
- [ ] Implementare lazy loading e schema integration
- [ ] Integrazione con RelationEngine per attributi reference

**Task 3.2: Reference Attributes Support**
- [ ] Implementare `resolveEntityReferences()` per attributi referenziati
- [ ] UI per gestione dropdown/autocomplete attributi reference
- [ ] Test end-to-end reference management

### 4.3. ⏳ FASE 4: AttributeSpace Potenziato (Settimane 5-6)

**Obiettivi Fase 4**:
- Pattern matching avanzato per sottoscrizioni
- Batching e ottimizzazioni performance
- Gestione propagazione per relazioni

**Task 4.1: AttributeSpace Enhancement**
- [ ] Evoluzione `AttributeSpace_MVP` verso `AttributeSpace`
- [ ] Implementare pattern matching avanzato
- [ ] Aggiungere batching e ottimizzazioni

**Task 4.2: Advanced Propagation**
- [ ] Gestione eventi relazioni oltre entità
- [ ] Prevenzione loop infiniti
- [ ] Performance tuning per grandi volumi

## 5. ✅ Architettura Attuale Consolidata (Post Fase 1)

### 5.1. Stack Tecnologico Completo

**✅ Backend Evoluto Operativo**:
- ✅ Node.js + Express.js con API schema avanzate
- ✅ Neo4j con persistenza schema completa
- ✅ WebSocket per propagazione real-time dati e schema
- ✅ Query Cypher ottimizzate con operazioni additive-only

**✅ Frontend Schema-Aware Operativo**:
- ✅ Vanilla JavaScript con URL parameters management
- ✅ UI dinamica basata su schema con evoluzione real-time
- ✅ BroadcastChannel per cross-window sync completa

### 5.2. API Complete Implementate

**✅ ENDPOINT SCHEMA EVOLUTI**:
```javascript
// ✅ OPERATIVI E TESTATI
POST   /api/schema/entity/:entityType    // Crea nuovo schema entità
GET    /api/schema/entity/:entityType    // Recupera schema entità
PUT    /api/schema/entity/:entityType    // Evolve schema (additive-only)
GET    /api/schema/entities              // Lista tutti gli schemi

POST   /api/schema/relation/:relationType // Crea schema relazione
GET    /api/schema/relation/:relationType // Recupera schema relazione
GET    /api/schema/relations             // Lista schemi relazioni
```

**✅ ENDPOINT MVP MANTENUTI** (backward compatibility):
```javascript
// ✅ COMPATIBILITÀ TOTALE MANTENUTA
GET    /api/entities/:entityType         // Recupera entità
POST   /api/entities                     // Crea entità
GET    /api/entity/:entityId             // Recupera entità singola
PUT    /api/entity/:entityId/attribute   // Aggiorna attributo
```

### 5.3. Modello Dati Consolidato

**✅ SCHEMA PERSISTENCE COMPLETA**:
- ✅ Nodi `:SchemaEntityType` per tipi entità
- ✅ Nodi `:SchemaRelationType` per tipi relazione
- ✅ Nodi `:AttributeDefinition` per definizioni attributi
- ✅ Relazioni `:HAS_ATTRIBUTE` per struttura schema
- ✅ Versioning e audit trail modifiche

## 6. ✅ Test e Validazione Completati

### 6.1. Scenari di Test Implementati e Validati

**✅ SCHEMA EVOLUTION END-TO-END**:
1. ✅ Creazione schema da zero con UI
2. ✅ Evoluzione schema esistente real-time
3. ✅ Propagazione modifiche cross-window immediate
4. ✅ Persistenza e recovery completa
5. ✅ Backward compatibility totale

**✅ MULTI-ENTITY TYPE MANAGEMENT**:
1. ✅ Gestione simultanea tipi multipli (`Cliente`, `TestEvoluzione`, etc.)
2. ✅ URL parameters per entity type specifici
3. ✅ Configurazioni separate per tipo entità

**✅ RELIABILITY E ROBUSTEZZA**:
- ✅ Error handling con fallback graceful
- ✅ Recovery automatico disconnessioni
- ✅ Validazione input e sanitization
- ✅ Audit trail completo modifiche

## 7. ✅ Risultati Fase 1 e Conclusioni

### 7.1. Obiettivi Raggiunti

**✅ FUNZIONALITÀ CORE IMPLEMENTATE**:
- ✅ **Schema Evolution Real-time**: Modifiche strutturali senza perdita dati
- ✅ **Persistent Schema Storage**: Tutti gli schemi salvati permanentemente  
- ✅ **Cross-Window Schema Sync**: Propagazione struttura tra finestre
- ✅ **Backward Compatible APIs**: Coesistenza componenti MVP/evoluti
- ✅ **Additive-Only Operations**: Sicurezza dati garantita

### 7.2. Base Architettonica Solida

**✅ FONDAMENTA COMPLETE PER PROSSIME FASI**:
- ✅ SchemaManager evoluto come custode semantica strutturale
- ✅ DAO evoluto con query ottimizzate e operazioni sicure
- ✅ API layer completo con backward compatibility
- ✅ Frontend schema-aware con UI dinamica
- ✅ Modello dati Neo4j robusto e estensibile

### 7.3. Roadmap Chiara per Completamento

**⏳ PROSSIMI MACRO PASSI DEFINITI**:
1. **Fase 2**: RelationEngine per relazioni tipizzate (2 settimane)
2. **Fase 3**: EntityEngine evoluto con lazy loading (2 settimane)  
3. **Fase 4**: AttributeSpace potenziato con pattern matching (2 settimane)

---

## ✅ Conclusioni

La **Fase 1 del piano di evoluzione** è stata **completata con successo**, implementando un sistema di Schema Management avanzato che fornisce:

- **Persistenza Completa**: Tutti gli schemi salvati permanentemente su Neo4j
- **Evoluzione Dinamica**: Modifiche schema real-time senza restart
- **Sicurezza Dati**: Operazioni additive-only per integrità garantita
- **Backward Compatibility**: Coesistenza pacifica con componenti MVP
- **UI Schema-Aware**: Frontend che si adatta dinamicamente agli schemi

Il sistema **MVP SSOT Dinamico Evoluto** è ora operativo e testato, fornendo una base architettonica solida per implementare le fasi successive del piano evolutivo verso la visione completa descritta in `full-ssot.md`.

La **documentazione è aggiornata** e allineata con l'implementazione attuale in `architettura_mvp_evoluto.md` e `context.md`.
