# Documentazione Componenti

Questa cartella contiene la documentazione di tutti i componenti UI riutilizzabili del frontend.

## Struttura del Codice Correlato

Questa documentazione si riferisce al codice in `src/frontend/components/`.

## Linee Guida per la Documentazione

Per ogni componente, includi:

- **Scopo**: Breve descrizione della funzionalità del componente
- **Props/Parametri**: Lista completa con tipi e descrizioni
- **Esempi di utilizzo**: Codice di esempio pratico
- **Stili**: Classi CSS e personalizzazioni disponibili
- **Dipendenze**: Altri componenti o librerie utilizzate
- **Stati**: Gestione dello stato interno (se applicabile)

## Template per Nuovi Componenti

```markdown
# NomeComponente

## Scopo
Breve descrizione del componente...

## Props
| Prop | Tipo | Obbligatorio | Descrizione |
|------|------|-------------|-------------|
| ... | ... | ... | ... |

## Esempio di Utilizzo
\`\`\`jsx
<NomeComponente prop1="valore" />
\`\`\`

## Note
Eventuali note aggiuntive...
``` 