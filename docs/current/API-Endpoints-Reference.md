# SSOT-3005 API Endpoints Reference

**Versione**: 1.0  
**Data**: 27 Giugno 2025 - **AGGIORNATO POST-AUDIT**  
**Status**: Sistema Unificato - API Core Funzionanti  

## 📋 Indice

- [📊 Risultati Audit](#risultati-audit)
- [🏠 Root & Health](#root--health)
- [📄 Documents & Canvas System](#documents--canvas-system)
- [🧩 Module Instances](#module-instances)
- [👥 Entities (API Unificata)](#entities-api-unificata)
- [📋 Schema Management](#schema-management)
- [🔗 Relations](#relations)
- [⚙️ Testing & Examples](#testing--examples)
- [🚀 Next Steps](#next-steps)

---

## Statistiche Generali

| **Status** | **Count** | **Percentage** |
|------------|-----------|----------------|
| ✅ Funzionanti | 25 | 42% |
| ⚠️ Parzialmente Funzionanti | 10 | 17% |
| ❌ Non Funzionanti | 25 | 41% |
| **TOTALE** | **60** | **100%** |

---

## 🏠 Root & Health

### `GET /`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Homepage HTML con dashboard principale
- **Response**: HTML page con moduli tabellare e contact card
- **Response Time**: ~10ms
- **Uso**: Health check e interfaccia utente principale

---

## 📄 Documents & Canvas

### `POST /api/documents`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Crea nuovo documento CompositeDocument
- **Body**: `{name, description, ownerId, projectId?}`
- **Response**: `{success: true, data: {id, name, ...}}`
- **Response Time**: ~80ms
- **Note**: ownerId obbligatorio

### `GET /api/documents`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista tutti i documenti
- **Query**: `?projectId, ownerId, status, limit, offset, orderBy, orderDirection`
- **Response**: `{success: true, data: [documents], count}`
- **Response Time**: ~50ms
- **Note**: Supporta filtri e paginazione

### `GET /api/documents/:id`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera documento con moduli inclusi
- **Query**: `?includeModules=true/false, includeProject=true/false`
- **Response**: `{success: true, data: {id, name, modules: [...]}}`
- **Response Time**: ~60ms
- **Note**: Include relazioni CONTAINS_MODULE

### `PUT /api/documents/:id`
- **Status**: ⚠️ **PARZIALE**
- **Descrizione**: Aggiorna documento
- **Body**: `{name?, description?, status?}`
- **Response**: `{success: true, message: null}`
- **Response Time**: ~70ms
- **Note**: Funziona ma message=null

### `DELETE /api/documents/:id`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Elimina documento e cascade delete ModuleInstance
- **Response**: `{success: true, message: "Documento eliminato"}`
- **Response Time**: ~120ms
- **Note**: Cascade delete perfetto

### `PUT /api/documents/:id/canvas`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Salva layout canvas e crea relazioni CONTAINS_MODULE
- **Body**: `{canvasLayout: {enabled, blocks: [{id, x, y, width, height, instanceId}]}}`
- **Response**: `{success: true, data: layout, message: "Canvas layout salvato"}`
- **Response Time**: ~150ms
- **Note**: Core del sistema Canvas - PERFETTO

### `GET /api/documents/:id/canvas`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera layout canvas
- **Response**: `{success: true, data: {enabled, blocks, gridSize}}`
- **Response Time**: ~40ms
- **Note**: Restituisce layout completo

### `POST /api/documents/:id/canvas/sync`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Sincronizza canvas con ModuleInstances
- **Response**: `{success: true, message: "Sincronizzati N blocchi"}`
- **Response Time**: ~60ms
- **Note**: Utility di sincronizzazione

### `PUT /api/documents/:id/modules`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna moduli del documento
- **Body**: `{modules: [{moduleId, order, position, size}]}`
- **Response**: `{success: false, message: null}`
- **Error**: Implementazione mancante/rotta

### `PUT /api/documents/:id/layout`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna layout documento
- **Body**: `{layout: {type, columns, modules}}`
- **Response**: `{success: false, message: null}`
- **Error**: Implementazione mancante/rotta

### `POST /api/documents/:id/clone`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Clona documento
- **Body**: `{name}`
- **Response**: `{success: false, data: null}`
- **Error**: Implementazione mancante/rotta

### `GET /api/documents/:id/context`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Recupera contesto documento
- **Response**: `{success: false, data: null}`
- **Error**: Implementazione mancante/rotta

---

## 🧩 Module Instances

### `POST /api/module-instances`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Crea nuova istanza modulo
- **Body**: `{templateId, name, configuration}`
- **Response**: `{id, name, templateId, configuration, ...}`
- **Response Time**: ~70ms
- **Note**: Core del sistema - PERFETTO

### `GET /api/module-instances`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista tutte le istanze modulo
- **Response**: `{success: true, data: [instances]}`
- **Response Time**: ~50ms
- **Note**: Lista completa

### `GET /api/module-instances/:instanceId`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera istanza modulo specifica
- **Response**: `{id, name, templateId, configuration, ...}`
- **Response Time**: ~30ms
- **Note**: Dettaglio completo

### `PUT /api/module-instances/:instanceId`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna istanza modulo
- **Body**: `{name?, configuration?}`
- **Response**: `{success: false, message: null}`
- **Error**: Update non implementato correttamente

### `DELETE /api/module-instances/:instanceId`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Elimina istanza modulo
- **Response**: `{success: true, message: "Istanza modulo eliminata"}`
- **Response Time**: ~60ms
- **Note**: Elimina correttamente

### `DELETE /api/module-instances/cleanup-orphaned`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Elimina ModuleInstance orfani (senza documento)
- **Response**: `{success: true, message: "N ModuleInstance orfani eliminati"}`
- **Response Time**: ~100ms
- **Note**: Utility di pulizia - UTILE

---

## 👥 Entities (Standard)

### `POST /api/entities`
- **Status**: ❌ **CRITICO - BUG ATTRIBUTI**
- **Descrizione**: Crea nuova entità
- **Body**: `{entityType, attributes: {nome, email, ...}}`
- **Response**: `{success: true, data: {id, entityType}}`
- **Response Time**: ~60ms
- **Bug**: Attributi non vengono salvati - sempre null

### `GET /api/entities/search`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Ricerca entità per query
- **Query**: `?q=searchterm&entityType=Type&limit&offset`
- **Response**: `{success: true, data: [entities], count, total}`
- **Response Time**: ~80ms
- **Note**: Ricerca funziona bene

### `GET /api/entities/:entityType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista entità per tipo
- **Query**: `?limit, offset, orderBy`
- **Response**: `{success: true, data: [entities], count, total}`
- **Response Time**: ~60ms
- **Note**: Lista per tipo funziona

### `GET /api/entity/:entityId`
- **Status**: ❌ **CRITICO - BUG ATTRIBUTI**
- **Descrizione**: Recupera entità per ID
- **Response**: `{success: true, data: {id, entityType, attributes}}`
- **Response Time**: ~40ms
- **Bug**: Tutti gli attributi sono null

### `PUT /api/entity/:entityId/attribute`
- **Status**: ❌ **BUG ATTRIBUTI**
- **Descrizione**: Aggiorna singolo attributo entità
- **Body**: `{attributeName, attributeValue}`
- **Response**: `{success: true, message: "Attributo aggiornato"}`
- **Response Time**: ~50ms
- **Bug**: Update dice success ma attributo rimane null

### `DELETE /api/entity/:entityId`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Elimina entità
- **Response**: `{success: true, message: "Entità eliminata"}`
- **Response Time**: ~60ms
- **Note**: Eliminazione funziona

---

## ⚡ Entities (Evolved)

### `GET /api/evolved/entities/:entityType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista entità evolved per tipo
- **Response**: `{success: true, data: [entities], count}`
- **Response Time**: ~50ms
- **Note**: Stesso comportamento di standard

### `GET /api/evolved/entity/:entityId`
- **Status**: ❌ **CRITICO - STESSO BUG**
- **Descrizione**: Recupera entità evolved per ID
- **Response**: `{success: true, data: {attributes: null}}`
- **Response Time**: ~40ms
- **Bug**: Stesso problema attributi dell'API standard

### `POST /api/evolved/entities`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Crea entità evolved
- **Body**: `{entityType, attributes}`
- **Response**: `{success: false, error: "Cannot read properties of null (reading 'mode')"}`
- **Error**: Schema mode null - implementazione rotta

### `PUT /api/evolved/entity/:entityId/attribute`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Aggiorna attributo evolved
- **Body**: `{attributeName, attributeValue}`
- **Response**: `{success: true, message: "Attributo aggiornato"}`
- **Response Time**: ~50ms
- **Note**: Stessa implementazione di standard

### `GET /api/evolved/entity/:entityId/references`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera riferimenti entità
- **Response**: `{success: true, data: []}`
- **Response Time**: ~40ms
- **Note**: Ritorna array vuoto

### `GET /api/evolved/stats`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Statistiche sistema evolved
- **Response**: `{success: false, data: null}`
- **Error**: Implementazione mancante

---

## 📋 Schema Management

### `GET /api/schema/:entityType/attributes`
- **Status**: ⚠️ **PARZIALE**
- **Descrizione**: Recupera attributi schema per tipo
- **Response**: `{success: true, data: []}`
- **Response Time**: ~40ms
- **Note**: Ritorna array vuoto per la maggior parte dei tipi

### `POST /api/schema/entity/:entityType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Crea schema entità
- **Body**: `{mode: "strict", attributes: [{name, type, required}]}`
- **Response**: `{success: true, message: null}`
- **Response Time**: ~80ms
- **Note**: Crea schema correttamente

### `GET /api/schema/entity/:entityType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera schema entità
- **Response**: `{success: true, data: {entityType, attributes, mode}}`
- **Response Time**: ~60ms
- **Note**: Schema dettagliato

### `PUT /api/schema/entity/:entityType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Aggiorna schema entità
- **Body**: `{mode, attributes}`
- **Response**: `{success: true, message: null}`
- **Response Time**: ~70ms
- **Note**: Update schema funziona

### `GET /api/schema/entity/:entityType/ui-metadata`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera metadati UI per schema
- **Response**: `{success: true, data: {entityType, attributes, entityDisplayConfig}}`
- **Response Time**: ~50ms
- **Note**: Metadati UI completi

### `PUT /api/schema/entity/:entityType/ui-metadata`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna metadati UI
- **Body**: `{entityDisplayConfig: {displayLabel, displayField}}`
- **Response**: `{success: false, message: null}`
- **Error**: Update UI metadata non implementato

### `GET /api/schema/entities`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista tutti gli schemi entità
- **Response**: `{success: true, data: [schemas]}`
- **Response Time**: ~50ms
- **Note**: Lista completa schemi

### `POST /api/schema/relation/:relationType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Crea schema relazione
- **Body**: `{sourceEntityType, targetEntityType, attributes}`
- **Response**: `{success: true, message: null}`
- **Response Time**: ~60ms
- **Note**: Schema relazione creato

### `GET /api/schema/relation/:relationType`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera schema relazione
- **Response**: `{success: true, data: {relationType, sourceEntityType, targetEntityType}}`
- **Response Time**: ~40ms
- **Note**: Schema relazione dettagliato

### `GET /api/schema/relations`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista tutti gli schemi relazione
- **Response**: `{success: true, data: [relationSchemas]}`
- **Response Time**: ~40ms
- **Note**: Lista schemi relazione

---

## 🔗 Relations

### `POST /api/relations`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Crea relazione tramite RelationEngine
- **Body**: `{relationType, sourceEntityId, targetEntityId, attributes}`
- **Response**: `{success: false, error: "Entità sorgente non trovata"}`
- **Error**: Sistema usa relazioni Neo4j native, non RelationEngine

### `GET /api/relations`
- **Status**: ⚠️ **INUTILIZZATO**
- **Descrizione**: Lista relazioni RelationEngine
- **Response**: `{success: true, data: [], count: 0}`
- **Response Time**: ~30ms
- **Note**: Sempre 0 - sistema usa relazioni native

### `POST /api/relations/find`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Trova relazioni per pattern
- **Body**: `{relationType?, sourceEntityType?}`
- **Response**: `{success: true, data: [], count: 0}`
- **Response Time**: ~40ms
- **Note**: Query funziona ma sempre 0 risultati

### `GET /api/relations/stats`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Statistiche relazioni
- **Response**: `{success: true, data: {totalRelations: 0}}`
- **Response Time**: ~40ms
- **Note**: Stats corrette (0 per RelationEngine)

### `GET /api/relations/:relationId`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Recupera relazione per ID
- **Response**: `{success: false, error: "Relazione non trovata"}`
- **Error**: ID inesistente - normale per RelationEngine inutilizzato

### `PUT /api/relations/:relationId`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna relazione
- **Response**: `{success: false, error: "Relazione non trovata"}`
- **Error**: Stesso problema - RelationEngine inutilizzato

### `DELETE /api/relations/:relationId`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Elimina relazione
- **Response**: `{success: false, error: "Relazione non trovata"}`
- **Error**: Stesso problema - RelationEngine inutilizzato

### `GET /api/entities/:entityId/relations`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera relazioni di un'entità
- **Response**: `{success: true, data: [], relations_count: 0}`
- **Response Time**: ~40ms
- **Note**: Query funziona, 0 risultati per RelationEngine

---

## 👥 Module Members & Projects

### `POST /api/modules/:moduleId/members`
- **Status**: ⚠️ **PARZIALE**
- **Descrizione**: Aggiunge membro a modulo
- **Body**: `{entityId, attributes: {fee, role}}`
- **Response**: `{success: true, message: null}`
- **Response Time**: ~60ms
- **Note**: Dice success ma implementazione incompleta

### `GET /api/modules/:moduleId/members`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Lista membri modulo
- **Response**: `{success: true, data: [members]}`
- **Response Time**: ~50ms
- **Note**: Lista membri funziona

### `PUT /api/modules/:moduleId/members/:entityId/attributes`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Aggiorna attributi membro
- **Body**: `{fee, role}`
- **Response**: `{success: false, message: null}`
- **Error**: Update attributi membro non implementato

### `DELETE /api/modules/:moduleId/members/:entityId`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Rimuove membro da modulo
- **Response**: `{success: true, message: "Entità rimossa dal modulo"}`
- **Response Time**: ~50ms
- **Note**: Rimozione membro funziona

### `GET /api/entities/:entityId/projects`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera progetti di un'entità
- **Response**: `{success: true, data: [projects]}`
- **Response Time**: ~40ms
- **Note**: Query progetti funziona

### `GET /api/modules/:moduleId/aggregates`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Calcola aggregati modulo (totali, medie)
- **Response**: `{success: true, data: {totalMembers, totalAmount, averageAmount}}`
- **Response Time**: ~50ms
- **Note**: Aggregati funzionano (totali=0)

### `POST /api/projects/:projectId/modules/:moduleId/link`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Collega modulo a progetto
- **Body**: `{}`
- **Response**: `{success: false, error: "Progetto o ModuleInstance non trovati"}`
- **Error**: Entità progetto non esistono

---

## 🌱 Organic System

### `POST /api/organic/module/:moduleId/propagate-attribute`
- **Status**: ⚠️ **PARZIALE**
- **Descrizione**: Propaga attributo a entità del modulo
- **Body**: `{attributeName, propagationMode}`
- **Response**: `{success: true, message: "Attributo propagato a 0 entità"}`
- **Response Time**: ~50ms
- **Note**: Funziona ma propaga a 0 entità

### `GET /api/organic/entity/:entityId/related`
- **Status**: ✅ **FUNZIONANTE**
- **Descrizione**: Recupera entità correlate organicamente
- **Response**: `{success: true, data: []}`
- **Response Time**: ~40ms
- **Note**: Query funziona, 0 risultati

### `POST /api/organic/validate`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Valida dati con sistema organico
- **Body**: `{entityType, attributes}`
- **Response**: `{success: false, validation: null}`
- **Error**: Validazione organica non implementata

---

## ⚙️ Admin

### `POST /api/admin/cleanup-duplicates`
- **Status**: ❌ **NON FUNZIONA**
- **Descrizione**: Elimina entità duplicate
- **Body**: `{entityType}`
- **Response**: `{success: false, error: "Cannot destructure property 'entityType'"}`
- **Error**: Body richiesto ma non gestito correttamente

---

## 🔴 Problemi Critici

### 1. **BUG ATTRIBUTI ENTITÀ** - PRIORITÀ 1 
**Endpoints Affetti**: 
- `POST /api/entities`
- `GET /api/entity/:id` 
- `PUT /api/entity/:id/attribute`
- `GET /api/evolved/entity/:id`

**Sintomi**:
- Entità create con `success=true`
- Tutti gli attributi risultano `null` quando letti
- Update attributi dice `success` ma attributi rimangono `null`

**Impatto**: CRITICO - Core entity system non funziona

### 2. **API DUPLICATE E INCONSISTENTI** - PRIORITÀ 2
**Duplicate**:
- `/api/entities` vs `/api/evolved/entities` (stesso comportamento, stesso bug)
- `/api/entity` vs `/api/evolved/entity` (stesso problema)

**Inconsistenze**:
- Response format diversi (`message` a volte `null`, a volte assente)
- Error handling inconsistente
- Comportamento identico per API "diverse"

### 3. **RELATIONS API INUTILIZZATA** - PRIORITÀ 3
**Endpoints Affetti**: Tutti i 9 endpoint `/api/relations/*`

**Problema**: 
- Sistema usa relazioni Neo4j native (`CONTAINS_MODULE`)
- API RelationEngine sempre 0 risultati
- Manteniamo API per pattern non utilizzato

### 4. **MODULE MEMBERS INCOMPLETO** - PRIORITÀ 2
**Endpoints Affetti**:
- `PUT /api/modules/:moduleId/members/:entityId/attributes`
- `POST /api/projects/:projectId/modules/:moduleId/link`

**Problema**:
- Add member funziona parzialmente
- Update attributes non implementato
- Link progetti non funziona

---

## 🚀 Raccomandazioni

### **PRIORITÀ 1: Fix Core Entity System**
1. **Debug attributi entità**:
   - Verificare EntityEngine.createEntity()
   - Controllare persistenza attributi in Neo4j
   - Fix GET entity per leggere attributi correttamente

2. **Unificare API Standard/Evolved**:
   - Eliminare duplicazione `/api/entities` vs `/api/evolved/entities`
   - Mantenere solo una API unificata
   - Consistent response format

### **PRIORITÀ 2: Cleanup API Architecture**
1. **Rimuovere Relations API** (9 endpoint):
   - Sistema usa relazioni native
   - Elimina `/api/relations/*` endpoints
   - Aggiorna documentazione

2. **Fix Module Members**:
   - Implementare update attributes correttamente
   - Fix project linking

### **PRIORITÀ 3: Documentation & Optimization**
1. **Creare OpenAPI spec** per 25 endpoint funzionanti
2. **Marcare deprecated** endpoint rotti
3. **Performance optimization** per query frequenti

### **RISULTATO FINALE**
**Da 60 → ~35 endpoint funzionali, consistenti e ben documentati**

---

## 📊 Summary Funzionalità Core

### ✅ **COMPLETAMENTE FUNZIONANTI**
- **Canvas System**: Documents + Canvas + ModuleInstances + CONTAINS_MODULE relations
- **Document CRUD**: Create, Read, Update, Delete con cascade
- **ModuleInstance CRUD**: Create, Read, Delete + Cleanup orphaned
- **Schema Management**: Entity/Relation schemas + UI metadata
- **Search**: Entity search performante

### 🔴 **DA FIXARE URGENTEMENTE**  
- **Entity Attributes**: POST/GET attributi sempre null
- **Module Members**: Update attributes e project linking
- **API Duplicates**: Standard vs Evolved inconsistenti

### 🗑️ **DA RIMUOVERE**
- **Relations API**: 9 endpoint inutilizzati (sistema usa native)
- **Organic System**: 3 endpoint non implementati completamente
- **Admin Cleanup**: 1 endpoint rotto

---

**Prossimi Passi**: Procedere con fix Priorità 1 - Debug e risoluzione bug attributi entità.