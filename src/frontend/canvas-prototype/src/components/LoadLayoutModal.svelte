<script>
  import { createEventDispatcher } from 'svelte'
  import { layoutLoadModalOpen, savedLayouts, loadLayout, deleteLayout, hasUnsavedChanges, exportLayout, refreshLayoutsList } from '../stores/canvas.js'
  
  const dispatch = createEventDispatcher()
  
  export let isOpen = false
  
  let searchQuery = ''
  let selectedLayoutId = null
  let isLoading = false
  let error = ''
  let showDeleteConfirm = null
  let confirmOverwrite = false
  
  // Filter layouts based on search
  $: filteredLayouts = $savedLayouts.filter(layout => 
    layout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    layout.description.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Check for unsaved changes
  $: unsavedChanges = hasUnsavedChanges()
  
  async function handleLoad(layoutId) {
    if (unsavedChanges && !confirmOverwrite) {
      confirmOverwrite = true
      selectedLayoutId = layoutId
      return
    }
    
    error = ''
    isLoading = true
    
    try {
      const layout = loadLayout(layoutId)
      dispatch('loaded', { layoutId, layout })
      closeModal()
    } catch (err) {
      error = err.message || 'Errore durante il caricamento'
    } finally {
      isLoading = false
    }
  }
  
  function handleDelete(layoutId) {
    if (deleteLayout(layoutId)) {
      showDeleteConfirm = null
      refreshLayoutsList()
    } else {
      error = 'Errore durante l\'eliminazione del layout'
    }
  }
  
  function handleExport(layoutId) {
    try {
      exportLayout(layoutId)
    } catch (err) {
      error = err.message || 'Errore durante l\'esportazione'
    }
  }
  
  function closeModal() {
    isOpen = false
    layoutLoadModalOpen.set(false)
    
    // Reset state
    searchQuery = ''
    selectedLayoutId = null
    error = ''
    isLoading = false
    showDeleteConfirm = null
    confirmOverwrite = false
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (showDeleteConfirm) {
        showDeleteConfirm = null
      } else {
        closeModal()
      }
    }
  }
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  }
  
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  function getLayoutPreview(preview) {
    if (!preview || preview.length === 0) {
      return []
    }
    return preview.slice(0, 8) // Limit to 8 blocks for preview
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal">
      <div class="modal-header">
        <h2>📂 Carica Layout</h2>
        <button class="close-btn" on:click={closeModal}>✕</button>
      </div>
      
      <div class="modal-body">
        {#if error}
          <div class="error-message">
            ⚠️ {error}
          </div>
        {/if}
        
        {#if unsavedChanges && confirmOverwrite}
          <div class="warning-message">
            <h4>⚠️ Modifiche non salvate</h4>
            <p>Il layout corrente contiene modifiche non salvate. Procedendo le perderai.</p>
            <div class="warning-actions">
              <button class="btn btn-secondary" on:click={() => { confirmOverwrite = false; selectedLayoutId = null }}>
                Annulla
              </button>
              <button class="btn btn-primary" on:click={() => handleLoad(selectedLayoutId)}>
                Carica comunque
              </button>
            </div>
          </div>
        {:else}
          <div class="search-bar">
            <input 
              type="text"
              placeholder="🔍 Cerca layout..."
              bind:value={searchQuery}
            />
          </div>
          
          {#if filteredLayouts.length === 0}
            <div class="empty-state">
              {#if $savedLayouts.length === 0}
                <div class="empty-icon">📄</div>
                <h3>Nessun layout salvato</h3>
                <p>I tuoi layout salvati appariranno qui</p>
              {:else}
                <div class="empty-icon">🔍</div>
                <h3>Nessun risultato</h3>
                <p>Prova a modificare i termini di ricerca</p>
              {/if}
            </div>
          {:else}
            <div class="layouts-grid">
              {#each filteredLayouts as layout (layout.id)}
                <div class="layout-card">
                  <div class="layout-preview">
                    <div class="preview-canvas">
                      {#each getLayoutPreview(layout.preview) as block}
                        <div 
                          class="preview-block"
                          style="
                            left: {block.x * 3}px; 
                            top: {block.y * 3}px; 
                            width: {Math.max(block.w * 3, 8)}px; 
                            height: {Math.max(block.h * 3, 6)}px;
                          "
                        ></div>
                      {/each}
                    </div>
                  </div>
                  
                  <div class="layout-info">
                    <h3 class="layout-name">{layout.name}</h3>
                    {#if layout.description}
                      <p class="layout-description">{layout.description}</p>
                    {/if}
                    <div class="layout-meta">
                      <span class="layout-date">📅 {formatDate(layout.timestamp)}</span>
                      <span class="layout-blocks">🧩 {layout.blockCount} blocchi</span>
                    </div>
                  </div>
                  
                  <div class="layout-actions">
                    <button 
                      class="btn btn-primary btn-small"
                      on:click={() => handleLoad(layout.id)}
                      disabled={isLoading}
                    >
                      {#if isLoading}
                        <span class="spinner"></span>
                      {:else}
                        📂 Carica
                      {/if}
                    </button>
                    
                    <div class="layout-menu">
                      <button 
                        class="btn btn-icon"
                        on:click={() => handleExport(layout.id)}
                        title="Esporta layout"
                      >
                        💾
                      </button>
                      
                      <button 
                        class="btn btn-icon btn-danger"
                        on:click={() => showDeleteConfirm = layout.id}
                        title="Elimina layout"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {#if showDeleteConfirm === layout.id}
                    <div class="delete-confirm">
                      <p>Eliminare "{layout.name}"?</p>
                      <div class="delete-actions">
                        <button 
                          class="btn btn-secondary btn-small"
                          on:click={() => showDeleteConfirm = null}
                        >
                          Annulla
                        </button>
                        <button 
                          class="btn btn-danger btn-small"
                          on:click={() => handleDelete(layout.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
      
      <div class="modal-footer">
        <div class="footer-info">
          <span>{$savedLayouts.length} layout salvati</span>
        </div>
        
        <button 
          class="btn btn-secondary" 
          on:click={closeModal}
        >
          Chiudi
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  }
  
  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f9fafb;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: #111827;
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: #6b7280;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  .modal-body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .error-message {
    padding: 12px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    color: #dc2626;
    margin-bottom: 16px;
    font-size: 14px;
  }
  
  .warning-message {
    padding: 16px;
    background: #fffbeb;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  
  .warning-message h4 {
    margin: 0 0 8px 0;
    color: #92400e;
    font-size: 16px;
  }
  
  .warning-message p {
    margin: 0 0 12px 0;
    color: #92400e;
    font-size: 14px;
  }
  
  .warning-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .search-bar {
    margin-bottom: 20px;
  }
  
  .search-bar input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
  }
  
  .search-bar input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #374151;
  }
  
  .layouts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  
  .layout-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    transition: all 0.2s;
    position: relative;
  }
  
  .layout-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }
  
  .layout-preview {
    height: 120px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 8px;
  }
  
  .preview-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .preview-block {
    position: absolute;
    background: #3b82f6;
    border: 1px solid #2563eb;
    border-radius: 1px;
    opacity: 0.8;
  }
  
  .layout-info {
    padding: 16px;
  }
  
  .layout-name {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }
  
  .layout-description {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.4;
  }
  
  .layout-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #9ca3af;
  }
  
  .layout-actions {
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .layout-menu {
    display: flex;
    gap: 4px;
  }
  
  .delete-confirm {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
  }
  
  .delete-confirm p {
    margin: 0 0 16px 0;
    font-weight: 500;
    color: #111827;
  }
  
  .delete-actions {
    display: flex;
    gap: 8px;
  }
  
  .btn {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .btn-small {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .btn-icon {
    padding: 6px;
    border: none;
    background: transparent;
  }
  
  .btn-icon:hover {
    background: #f3f4f6;
  }
  
  .btn-secondary {
    background: white;
    color: #374151;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
  
  .btn-danger {
    color: #dc2626;
  }
  
  .btn-danger:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #fca5a5;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
  }
  
  .footer-info {
    font-size: 12px;
    color: #6b7280;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(50px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>