# Documentazione Backend

Questa cartella contiene tutta la documentazione relativa al backend del progetto SSOT-3005.

## Struttura

- **core/**: Documentazione delle funzionalità core del backend
- **dao/**: Documentazione del Data Access Object layer
- **services/**: Documentazione dei servizi e della business logic

## Mappatura con il Codice

Questa struttura rispecchia direttamente l'organizzazione del codice sorgente in `src/backend/`:

```
src/backend/          ←→  docs/backend/
├── core/            ←→  ├── core/
├── dao/             ←→  ├── dao/
└── services/        ←→  └── services/
```

## Come Contribuire

Per ogni nuova funzionalità o modifica significativa nel backend, assicurati di:

1. Aggiornare o creare la documentazione corrispondente nella cartella appropriata
2. Mantenere la sincronizzazione tra struttura del codice e documentazione
3. Includere esempi di utilizzo e API quando applicabile 