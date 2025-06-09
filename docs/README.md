# Documentazione SSOT-3005

Benvenuto nella documentazione del progetto SSOT-3005. Questa documentazione è organizzata per riflettere fedelmente la struttura del codice sorgente.

## Struttura della Documentazione

```
docs/
├── backend/           # Documentazione backend
│   ├── core/         # Funzionalità core
│   ├── dao/          # Data Access Objects
│   └── services/     # Servizi e business logic
├── frontend/          # Documentazione frontend
│   ├── components/   # Componenti UI
│   ├── definitions/  # Tipi e interfacce
│   ├── modules/      # Moduli applicativi
│   ├── services/     # Servizi frontend
│   └── views/        # Viste e pagine
├── demos/            # Documentazione demo
├── logs/             # Log e documentazione operativa
└── mvp/              # Documentazione MVP
```

## Mappatura con il Codice Sorgente

La struttura della documentazione rispecchia quella del codice:

```
src/                  ←→  docs/
├── backend/         ←→  ├── backend/
│   ├── core/       ←→  │   ├── core/
│   ├── dao/        ←→  │   ├── dao/
│   └── services/   ←→  │   └── services/
└── frontend/        ←→  └── frontend/
    ├── components/ ←→      ├── components/
    ├── definitions/←→      ├── definitions/
    ├── modules/    ←→      ├── modules/
    ├── services/   ←→      ├── services/
    └── views/      ←→      └── views/
```

## Come Navigare

1. **Per documentazione backend**: Vai a `backend/` e scegli la sottocartella appropriata
2. **Per documentazione frontend**: Vai a `frontend/` e scegli la sottocartella appropriata
3. Ogni cartella contiene un README con linee guida specifiche

## Principi Guida

- **Sincronizzazione**: La documentazione deve sempre riflettere la struttura del codice
- **Granularità**: Ogni componente/servizio/modulo ha la sua documentazione specifica
- **Chiarezza**: Template e linee guida standard per mantenere coerenza
- **Manutenibilità**: Struttura che facilita gli aggiornamenti e la ricerca

## Migrazione dalla Documentazione Precedente

- `docs/core/doc_tecnico_evoluzione_core_v1.md` → `docs/backend/core/`
- `docs/frontend/doc_tecnico_evoluzione_frontend_v1.md` → conservato come backup, da suddividere nelle nuove cartelle tematiche

## Come Contribuire

1. Per nuove funzionalità, crea la documentazione nella cartella appropriata
2. Segui i template forniti nei README di ciascuna sezione
3. Mantieni sempre la sincronizzazione tra codice e documentazione
4. Aggiorna questo README se aggiungi nuove sezioni principali 