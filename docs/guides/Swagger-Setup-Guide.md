# Swagger UI Setup Guide - SSOT-3005

**Data**: 27 Giugno 2025  
**Versione**: 1.0  
**Status**: ✅ **IMPLEMENTATO**

---

## 📚 Overview

Swagger UI è stato integrato con successo nel sistema SSOT-3005 per fornire documentazione API interattiva e automatica.

**URL Documentazione**: http://localhost:3000/api-docs

---

## 🚀 Quick Start

### 1. Avviare il Server
```bash
npm start
```

### 2. Accedere a Swagger UI
Apri il browser su: http://localhost:3000/api-docs

### 3. Testare un Endpoint
1. Clicca su qualsiasi endpoint per espandere
2. Clicca su "Try it out"
3. Inserisci i parametri richiesti
4. Clicca su "Execute"
5. Visualizza la risposta

---

## 📦 Dipendenze Installate

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1"
}
```

---

## 🔧 Configurazione

### Setup in server.js

```javascript
// 1. Import delle dipendenze
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// 2. Configurazione Swagger
setupSwagger() {
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'SSOT-3005 API',
                version: '2.0.0',
                description: 'Single Source of Truth - Dynamic System API'
            },
            servers: [{
                url: 'http://localhost:3000',
                description: 'Development server'
            }],
            tags: [
                { name: 'Documents', description: 'CompositeDocument management' },
                { name: 'Entities', description: 'Entity CRUD operations' },
                { name: 'Schema', description: 'Schema management' },
                // ... altri tag
            ]
        },
        apis: [__filename] // Scansiona JSDoc nel file corrente
    };

    const specs = swaggerJSDoc(swaggerOptions);
    
    // 3. Serve Swagger UI
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
```

---

## 📝 Come Documentare un Endpoint

### Esempio Completo

```javascript
/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Create a new CompositeDocument
 *     description: Creates a new document for orchestrating modules
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Project Dashboard"
 *               description:
 *                 type: string
 *                 example: "Main dashboard"
 *     responses:
 *       200:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompositeDocument'
 *       400:
 *         description: Invalid input
 */
app.post('/api/documents', async (req, res) => {
    // Implementation
});
```

---

## 📊 Endpoint Documentati

### Statistiche Attuali
- **Totale Endpoint**: 35
- **Documentati**: 14+ (in progress)
- **Coverage**: ~40%

### Endpoint Principali Documentati

#### 📄 Documents (8 endpoint)
- ✅ `POST /api/documents` - Create document
- ✅ `GET /api/documents` - List documents  
- ✅ `GET /api/documents/:id` - Get document
- ✅ `PUT /api/documents/:id` - Update document
- ✅ `DELETE /api/documents/:id` - Delete document
- ✅ `PUT /api/documents/:id/canvas` - Save canvas layout
- ✅ `GET /api/documents/:id/canvas` - Get canvas layout
- `POST /api/documents/:id/canvas/sync` - Sync canvas

#### 🧩 Modules (5 endpoint)
- ✅ `POST /api/module-instances` - Create module
- `GET /api/module-instances` - List modules
- `GET /api/module-instances/:id` - Get module
- `DELETE /api/module-instances/:id` - Delete module
- `DELETE /api/module-instances/cleanup-orphaned` - Cleanup

#### 👥 Entities (6 endpoint)
- ✅ `POST /api/entities` - Create entity
- `GET /api/entities/:type` - List by type
- `GET /api/entity/:id` - Get entity
- `PUT /api/entity/:id/attribute` - Update attribute
- `DELETE /api/entity/:id` - Delete entity
- ✅ `GET /api/entities/search` - Search entities

#### 🎨 Schema (9 endpoint)
- ✅ `GET /api/schema/:type/attributes` - Get attributes
- Altri da documentare...

---

## 🎯 Best Practices

### 1. Usa Tag Appropriati
```javascript
tags: [Documents]  // Raggruppa endpoint correlati
```

### 2. Fornisci Esempi
```javascript
example: "mario@example.com"  // Aiuta gli utenti
```

### 3. Documenta Tutti i Response Codes
```javascript
responses: {
  200: { description: "Success" },
  400: { description: "Bad Request" },
  404: { description: "Not Found" },
  500: { description: "Server Error" }
}
```

### 4. Usa Schema References
```javascript
$ref: '#/components/schemas/Entity'  // Riutilizza definizioni
```

---

## 🔄 Aggiungere Nuovi Endpoint

1. **Aggiungi JSDoc** sopra l'endpoint:
```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   get:
 *     summary: New endpoint description
 *     tags: [Category]
 */
```

2. **Riavvia il server**:
```bash
npm start
```

3. **Verifica** su http://localhost:3000/api-docs

---

## 🐛 Troubleshooting

### Swagger UI non carica
- Verifica che il server sia avviato
- Controlla la console per errori
- Assicurati che `__filename` sia corretto nel setup

### Endpoint non appare
- Verifica sintassi JSDoc (deve iniziare con `/**`)
- Controlla indentazione YAML nel commento
- Riavvia il server dopo modifiche

### Errori di validazione
- Usa uno YAML validator online
- Controlla che tutti i `$ref` esistano
- Verifica required fields

---

## 🚀 Next Steps

1. **Completare documentazione** dei rimanenti ~20 endpoint
2. **Aggiungere autenticazione** headers nella documentazione
3. **Esportare OpenAPI spec** per generare client SDK
4. **Configurare esempi** più dettagliati per request/response

---

## 📚 Risorse Utili

- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Features](https://swagger.io/tools/swagger-ui/)

---

**Nota**: Swagger UI si aggiorna automaticamente quando aggiungi nuova documentazione JSDoc. Non serve ricompilare o configurare nulla dopo il setup iniziale!