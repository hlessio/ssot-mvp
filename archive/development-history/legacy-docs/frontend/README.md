# Documentazione Frontend

Questa cartella contiene tutta la documentazione relativa al frontend del progetto SSOT-3005.

## Struttura

- **components/**: Documentazione dei componenti UI riutilizzabili
- **definitions/**: Documentazione delle definizioni e tipi
- **modules/**: Documentazione dei moduli applicativi
- **services/**: Documentazione dei servizi frontend (API calls, utilities)
- **views/**: Documentazione delle viste e pagine

## Mappatura con il Codice

Questa struttura rispecchia direttamente l'organizzazione del codice sorgente in `src/frontend/`:

```
src/frontend/         ←→  docs/frontend/
├── components/      ←→  ├── components/
├── definitions/     ←→  ├── definitions/
├── modules/         ←→  ├── modules/
├── services/        ←→  ├── services/
└── views/           ←→  └── views/
```

## Migrazione dalla Documentazione Precedente

Il contenuto del file `doc_tecnico_evoluzione_frontend_v1.md` è stato conservato come backup e dovrebbe essere suddiviso nelle rispettive cartelle tematiche.

## Come Contribuire

Per ogni nuovo componente, modulo o vista:

1. Crea la documentazione nella cartella appropriata
2. Includi esempi di utilizzo e props/parametri
3. Documenta le dipendenze e l'integrazione con altri componenti
4. Mantieni la sincronizzazione con il codice sorgente 