# SSOT Canvas Prototype

Prototipo iterativo di canvas con blocchi draggable per il sistema SSOT. Costruito con Svelte e svelte-dnd-action.

## 🚀 Avvio Rapido

```bash
cd src/frontend/canvas-prototype
npm install
npm run dev
```

Il canvas sarà disponibile su http://localhost:5173/

## 🏗️ Architettura

### Componenti Principali

- **App.svelte** - Componente principale che orchestrea canvas e sidebar
- **Canvas.svelte** - Area di lavoro con griglia per posizionare i blocchi
- **Block.svelte** - Componente blocco con drag & drop interno
- **Sidebar.svelte** - Pannello laterale con tipi di blocchi e proprietà

### Store Svelte

- `blocks` - Store dei blocchi nel canvas
- `selectedBlock` - Blocco attualmente selezionato  
- `wsConnection` - Connessione WebSocket per real-time
- `wsStatus` - Stato della connessione

## ✨ Funzionalità Implementate

### Canvas
- ✅ Griglia con snap automatico (25px)
- ✅ Drag & drop dei blocchi
- ✅ Resize con handle visuali (5 direzioni)
- ✅ Selezione blocchi
- ✅ Area scrollabile infinita
- ✅ **Toolbar integrata** con save/load rapido

### Blocchi
- ✅ Contenitori base con header e contenuto
- ✅ Drag & drop interno per contenuti
- ✅ Aggiunta dinamica di elementi
- ✅ Persistenza posizione e dimensioni

### Sidebar
- ✅ Libreria di blocchi base
- ✅ Tipi di moduli SSOT
- ✅ Pannello proprietà per blocco selezionato
- ✅ Controlli per posizione e dimensioni

### **Layout Management System** ⭐ NUOVO
- ✅ **Save/Load Layout** - Salvataggio e caricamento con nome
- ✅ **Quick Save** - Salvataggio rapido con timestamp
- ✅ **Layout Gallery** - Visualizzazione con preview thumbnail
- ✅ **Local Storage** - Persistenza automatica in localStorage
- ✅ **Template Predefiniti** - 3 layout pronti all'uso
- ✅ **Export/Import** - Download/upload file JSON
- ✅ **Unsaved Changes Detection** - Indicatore modifiche non salvate
- ✅ **Search & Filter** - Ricerca nei layout salvati
- ✅ **Keyboard Shortcuts** - Ctrl+S save, Ctrl+O load, Ctrl+N new

### ModuleInspector
- ✅ Pannello ispezione moduli a destra
- ✅ Proprietà dettagliate del modulo selezionato
- ✅ Schema attributi con controlli visibilità
- ✅ Statistiche real-time
- ✅ Azioni rapide per moduli

### Real-time
- ✅ WebSocket integration setup
- ✅ Store reattivi per sincronizzazione
- ✅ Indicatore stato connessione
- ✅ **Notification System** - Toast notifications per feedback
- 🔄 API backend da implementare

## 🎯 Prossimi Passi

1. **Backend API** - Endpoint per salvare/caricare layout canvas
2. **Moduli SSOT** - Integrazione con i moduli del sistema principale  
3. **Drag da Sidebar** - Drag & drop dalla sidebar al canvas
4. **Persistenza** - Salvataggio automatico layout
5. **Collaborazione** - Multi-utente real-time
6. **Template** - Sistema di template per layout comuni

## 🛠️ Tecnologie

- **Svelte 4** - Framework reattivo
- **svelte-dnd-action** - Drag & drop library
- **Vite** - Build tool e dev server
- **WebSocket** - Real-time communication

## 📁 Struttura File

```
src/frontend/canvas-prototype/
├── src/
│   ├── components/
│   │   ├── Canvas.svelte      # Area canvas principale
│   │   ├── Block.svelte       # Componente blocco
│   │   └── Sidebar.svelte     # Pannello laterale
│   ├── stores/
│   │   └── canvas.js          # Store globali Svelte
│   ├── App.svelte             # Root component
│   └── main.js                # Entry point
├── package.json
├── vite.config.js
└── index.html
```

## 🎨 Design Principles

- **Iterativo** - Sviluppo incrementale per feedback rapido
- **Modulare** - Componenti riutilizzabili e sostituibili
- **Reattivo** - UI che risponde automaticamente ai cambi di stato
- **Accessibile** - Drag & drop completamente accessibile via tastiera
- **Performante** - Ottimizzato per grandi quantità di blocchi

## 🔧 Personalizzazione

### Aggiungere Nuovi Tipi di Blocco

1. Aggiungi il tipo in `Sidebar.svelte`:
```javascript
const blockTypes = [
  { id: 'nuovo-tipo', name: 'Nuovo Tipo', icon: '🆕' }
]
```

2. Gestisci il rendering in `Block.svelte` se necessario

### Modificare Griglia

Cambia `gridSize` in `Canvas.svelte`:
```javascript
const gridSize = 50 // Griglia più larga
```

### Integrare con Backend SSOT

Il canvas è progettato per integrarsi con il backend esistente tramite WebSocket e REST API. Vedere `stores/canvas.js` per i pattern di integrazione.

## 🚀 Come Testare il Sistema Completo

### Canvas Base
Il server è attivo su **http://localhost:5174/**

1. **Manipolazione Blocchi:**
   - Trascinare i blocchi esistenti nel canvas
   - Ridimensionarli con gli handle (5 direzioni: destra, sinistra, basso, angoli)
   - Aggiungere contenuti nei blocchi con drag & drop interno
   - Creare nuovi blocchi dalla sidebar sinistra
   - Modificare proprietà nel pannello ispezione destro

### Sistema Save/Load Layout ⭐

2. **Salvataggio:**
   - **Quick Save**: Clicca "⚡ Quick Save" per salvataggio rapido
   - **Save As**: Clicca "💾 Salva come..." per nome personalizzato
   - **Auto-naming**: Nomi suggeriti automaticamente con timestamp

3. **Caricamento:**
   - **Gallery**: Clicca "📂 Carica" per vedere tutti i layout con preview
   - **Search**: Cerca nei layout salvati per nome/descrizione
   - **Visual Preview**: Miniature dei layout nella gallery
   - **Template**: Clicca "🎨 Template" per layout predefiniti

4. **Features Avanzate:**
   - **Export/Import**: Scarica/carica layout come file JSON
   - **Unsaved Changes**: Indicatore ● arancione per modifiche non salvate
   - **Conflict Warning**: Avviso prima di perdere modifiche non salvate
   - **Delete Protection**: Conferma eliminazione layout

### Keyboard Shortcuts

5. **Comandi Rapidi:**
   - `Ctrl+S` - Quick Save
   - `Ctrl+Shift+S` - Save As (con nome)
   - `Ctrl+O` - Carica Layout
   - `Ctrl+N` - Nuovo Canvas
   - `Esc` - Chiudi modal

### Sistema di Notifiche

6. **Feedback Visuale:**
   - **Toast Notifications**: Conferma azioni completate
   - **Success** (verde): Layout salvato/caricato
   - **Error** (rosso): Errori durante operazioni
   - **Info** (blu): Template creati, canvas pulito
   - **Auto-dismiss**: Scompaiono dopo 3 secondi

### Test di Persistenza

7. **Verifica Storage:**
   - Crea layout complessi e salvali
   - Ricarica la pagina - i layout rimangono
   - Testa export/import con diversi browser
   - Verifica preview accuracy nei layout gallery