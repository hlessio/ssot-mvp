<script>
    import { onMount, onDestroy } from 'svelte';
    import { documentStore } from '../stores/documentStore.js';
    import { workspaceStore } from '../stores/workspaceStore.js';
    import WorkspaceHeader from './WorkspaceHeader.svelte';
    import GridLayout from './GridLayout.svelte';
    import ModulePalette from './ModulePalette.svelte';
    
    export let documentId = null;
    
    let document = null;
    let workspace = null;
    let modules = [];
    let loading = true;
    let error = null;
    
    // Store subscriptions
    let documentUnsubscribe;
    let workspaceUnsubscribe;
    
    onMount(async () => {
        console.log('🏗️ DocumentWorkspace inizializzato per documento:', documentId);
        
        // Subscribe to stores
        documentUnsubscribe = documentStore.subscribe(value => {
            document = value.document;
            modules = value.modules || [];
            loading = value.loading;
            error = value.error;
        });
        
        workspaceUnsubscribe = workspaceStore.subscribe(value => {
            workspace = value;
        });
        
        // Load document if documentId provided
        if (documentId) {
            await loadDocument(documentId);
        } else {
            loading = false;
        }
    });
    
    onDestroy(() => {
        if (documentUnsubscribe) documentUnsubscribe();
        if (workspaceUnsubscribe) workspaceUnsubscribe();
    });
    
    async function loadDocument(id) {
        try {
            await documentStore.loadDocument(id);
            workspaceStore.initializeForDocument(id);
        } catch (err) {
            console.error('Errore caricamento documento:', err);
        }
    }
    
    function handleCreateDocument() {
        // TODO: Implement document creation modal
        console.log('🆕 Crea nuovo documento');
    }
    
    function handleSaveLayout() {
        if (document) {
            workspaceStore.saveLayout(document.id);
        }
    }
    
    function handleModuleAdd(event) {
        const { moduleType, position } = event.detail;
        if (document) {
            documentStore.addModule(document.id, moduleType, position);
        }
    }
    
    function handleModuleRemove(event) {
        const { moduleId } = event.detail;
        if (document) {
            documentStore.removeModule(document.id, moduleId);
        }
    }
    
    function handleModuleUpdate(event) {
        const { moduleId, layoutConfig } = event.detail;
        if (document) {
            documentStore.updateModuleLayout(document.id, moduleId, layoutConfig);
        }
    }
</script>

<main class="document-workspace">
    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Caricamento workspace...</p>
        </div>
    {:else if error}
        <div class="error-state">
            <h2>❌ Errore</h2>
            <p>{error}</p>
            <button on:click={() => location.reload()}>Ricarica</button>
        </div>
    {:else if document}
        <!-- Document Workspace -->
        <WorkspaceHeader 
            {document} 
            on:save={handleSaveLayout}
            on:create={handleCreateDocument}
        />
        
        <div class="workspace-container">
            <aside class="module-palette-sidebar">
                <ModulePalette 
                    on:add-module={handleModuleAdd}
                />
            </aside>
            
            <section class="grid-container">
                <GridLayout 
                    {modules}
                    layout={workspace?.layout || {}}
                    on:module-update={handleModuleUpdate}
                    on:module-remove={handleModuleRemove}
                />
            </section>
        </div>
    {:else}
        <!-- Welcome Screen -->
        <div class="welcome-screen">
            <h1>🎯 SSOT-4000 Workspace</h1>
            <p>Sistema di orchestrazione documenti con moduli dinamici</p>
            
            <div class="welcome-actions">
                <button class="primary-btn" on:click={handleCreateDocument}>
                    📄 Crea Nuovo Documento
                </button>
                
                <button class="secondary-btn" on:click={() => {}}>
                    📂 Apri Documento Esistente
                </button>
            </div>
            
            <div class="architecture-overview">
                <h3>🏗️ Architettura SSOT-4000</h3>
                <ul>
                    <li>✅ <strong>CompositeDocument</strong> - Meta-meta-entità orchestratore</li>
                    <li>✅ <strong>Workspace Dinamico</strong> - Grid-based UI con Svelte</li>
                    <li>🚧 <strong>Context Inheritance</strong> - Propagazione automatica contesto</li>
                    <li>🚧 <strong>Real-time Sync</strong> - WebSocket multi-client</li>
                </ul>
            </div>
        </div>
    {/if}
</main>

<style>
    .document-workspace {
        height: 100vh;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f8f9fa;
    }
    
    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        color: #666;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 20px;
        text-align: center;
    }
    
    .error-state h2 {
        color: #dc3545;
        margin-bottom: 15px;
    }
    
    .error-state button {
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 15px;
    }
    
    .workspace-container {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    
    .module-palette-sidebar {
        width: 280px;
        background: white;
        border-right: 1px solid #dee2e6;
        display: flex;
        flex-direction: column;
    }
    
    .grid-container {
        flex: 1;
        background: #f8f9fa;
        overflow: auto;
        position: relative;
    }
    
    .welcome-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 40px 20px;
        text-align: center;
    }
    
    .welcome-screen h1 {
        color: #333;
        margin-bottom: 15px;
        font-size: 2.5em;
        font-weight: 300;
    }
    
    .welcome-screen p {
        color: #666;
        margin-bottom: 40px;
        font-size: 1.2em;
    }
    
    .welcome-actions {
        display: flex;
        gap: 20px;
        margin-bottom: 50px;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .primary-btn, .secondary-btn {
        padding: 15px 30px;
        border: none;
        border-radius: 8px;
        font-size: 1.1em;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .primary-btn {
        background: #007bff;
        color: white;
    }
    
    .primary-btn:hover {
        background: #0056b3;
        transform: translateY(-2px);
    }
    
    .secondary-btn {
        background: #6c757d;
        color: white;
    }
    
    .secondary-btn:hover {
        background: #545b62;
        transform: translateY(-2px);
    }
    
    .architecture-overview {
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 600px;
        text-align: left;
    }
    
    .architecture-overview h3 {
        margin-top: 0;
        color: #333;
        text-align: center;
    }
    
    .architecture-overview ul {
        list-style: none;
        padding: 0;
    }
    
    .architecture-overview li {
        padding: 8px 0;
        font-size: 1.05em;
    }
    
    .architecture-overview li strong {
        color: #2c3e50;
    }
</style>