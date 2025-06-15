<script>
    import { createEventDispatcher } from 'svelte';
    import { workspaceStore } from '../stores/workspaceStore.js';
    
    export let document = null;
    
    const dispatch = createEventDispatcher();
    
    let workspace = {};
    let lastSaved = null;
    let saveStatus = 'saved'; // 'saving' | 'saved' | 'error'
    
    // Subscribe to workspace store for save status
    workspaceStore.subscribe(value => {
        workspace = value;
        lastSaved = value.lastSaved;
        
        // Update save status based on lastSaved
        if (value.lastSaved) {
            saveStatus = 'saved';
        } else if (value.documentId && value.modules.size > 0) {
            saveStatus = 'unsaved';
        }
    });
    
    function handleSave() {
        if (document) {
            saveStatus = 'saving';
            dispatch('save');
        }
    }
    
    function handleViewModeChange(mode) {
        workspaceStore.setViewMode(mode);
    }
    
    function handleZoomChange(direction) {
        const currentZoom = workspace.zoom || 1.0;
        const newZoom = direction === 'in' ? currentZoom * 1.2 : currentZoom / 1.2;
        workspaceStore.setZoom(newZoom);
    }
    
    function formatLastSaved(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }
    
    function handleCreateNew() {
        dispatch('create');
    }
</script>

<header class="workspace-header">
    <div class="header-left">
        {#if document}
            <div class="document-info">
                <h1 class="document-title">{document.name}</h1>
                <p class="document-description">{document.description || 'Nessuna descrizione'}</p>
            </div>
        {:else}
            <div class="document-info">
                <h1 class="document-title">SSOT-4000 Workspace</h1>
                <p class="document-description">Nessun documento caricato</p>
            </div>
        {/if}
    </div>
    
    <div class="header-center">
        <div class="view-mode-selector">
            <button 
                class="mode-btn"
                class:active={workspace.viewMode === 'edit'}
                on:click={() => handleViewModeChange('edit')}
                title="Modalità Modifica"
            >
                ✏️ Modifica
            </button>
            <button 
                class="mode-btn"
                class:active={workspace.viewMode === 'preview'}
                on:click={() => handleViewModeChange('preview')}
                title="Modalità Anteprima"
            >
                👁️ Anteprima
            </button>
            <button 
                class="mode-btn"
                class:active={workspace.viewMode === 'present'}
                on:click={() => handleViewModeChange('present')}
                title="Modalità Presentazione"
            >
                📺 Presenta
            </button>
        </div>
    </div>
    
    <div class="header-right">
        <div class="zoom-controls">
            <button 
                class="zoom-btn"
                on:click={() => handleZoomChange('out')}
                title="Zoom Out"
            >
                🔍−
            </button>
            <span class="zoom-level">{Math.round((workspace.zoom || 1.0) * 100)}%</span>
            <button 
                class="zoom-btn"
                on:click={() => handleZoomChange('in')}
                title="Zoom In"
            >
                🔍+
            </button>
        </div>
        
        <div class="save-controls">
            {#if document}
                <button 
                    class="save-btn"
                    class:saving={saveStatus === 'saving'}
                    on:click={handleSave}
                    disabled={saveStatus === 'saving'}
                >
                    {#if saveStatus === 'saving'}
                        ⏳ Salvataggio...
                    {:else if saveStatus === 'saved'}
                        ✅ Salvato
                    {:else}
                        💾 Salva
                    {/if}
                </button>
                
                {#if lastSaved}
                    <span class="last-saved">
                        Ultimo salvataggio: {formatLastSaved(lastSaved)}
                    </span>
                {/if}
            {:else}
                <button 
                    class="create-btn"
                    on:click={handleCreateNew}
                >
                    📄 Nuovo Documento
                </button>
            {/if}
        </div>
    </div>
</header>

<style>
    .workspace-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 25px;
        background: white;
        border-bottom: 1px solid #dee2e6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        min-height: 70px;
    }
    
    .header-left {
        flex: 1;
        min-width: 0; /* Allow text truncation */
    }
    
    .document-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .document-title {
        margin: 0;
        font-size: 1.4em;
        font-weight: 600;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .document-description {
        margin: 0;
        font-size: 0.9em;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .header-center {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        margin: 0 20px;
    }
    
    .view-mode-selector {
        display: flex;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 4px;
        gap: 2px;
    }
    
    .mode-btn {
        padding: 8px 16px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        transition: all 0.2s;
        white-space: nowrap;
    }
    
    .mode-btn:hover {
        background: #e9ecef;
    }
    
    .mode-btn.active {
        background: #007bff;
        color: white;
    }
    
    .header-right {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 20px;
    }
    
    .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        padding: 4px 8px;
    }
    
    .zoom-btn {
        padding: 4px 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.9em;
    }
    
    .zoom-btn:hover {
        background: #e9ecef;
    }
    
    .zoom-level {
        font-size: 0.9em;
        color: #666;
        min-width: 40px;
        text-align: center;
    }
    
    .save-controls {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .save-btn, .create-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        transition: all 0.2s;
        white-space: nowrap;
    }
    
    .save-btn {
        background: #28a745;
        color: white;
    }
    
    .save-btn:hover:not(:disabled) {
        background: #218838;
    }
    
    .save-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .save-btn.saving {
        background: #ffc107;
        color: #000;
    }
    
    .create-btn {
        background: #007bff;
        color: white;
    }
    
    .create-btn:hover {
        background: #0056b3;
    }
    
    .last-saved {
        font-size: 0.8em;
        color: #666;
        white-space: nowrap;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .workspace-header {
            flex-wrap: wrap;
            padding: 10px 15px;
        }
        
        .header-center {
            order: 3;
            flex-basis: 100%;
            margin: 10px 0 0 0;
            justify-content: center;
        }
        
        .document-title {
            font-size: 1.2em;
        }
        
        .mode-btn {
            padding: 6px 12px;
            font-size: 0.8em;
        }
        
        .last-saved {
            display: none;
        }
    }
</style>