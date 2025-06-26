<script>
  import { createEventDispatcher } from 'svelte'
  import { layoutSaveModalOpen, saveCurrentLayout, blocks } from '../stores/canvas.js'
  import LayoutStorage from '../services/LayoutStorage.js'
  
  const dispatch = createEventDispatcher()
  
  export let isOpen = false
  
  let layoutName = ''
  let layoutDescription = ''
  let isLoading = false
  let error = ''
  let nameExists = false
  
  // Auto-generate name suggestion
  $: if (isOpen && !layoutName) {
    const timestamp = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    layoutName = `Layout ${timestamp}`
  }
  
  // Check if name already exists
  $: if (layoutName.trim()) {
    nameExists = LayoutStorage.layoutNameExists(layoutName.trim())
  }
  
  // Validation
  $: isValid = layoutName.trim().length >= 3 && $blocks.length > 0 && !isLoading
  
  async function handleSave() {
    if (!isValid) return
    
    error = ''
    isLoading = true
    
    try {
      const layoutId = saveCurrentLayout(layoutName.trim(), layoutDescription.trim())
      
      dispatch('saved', { layoutId, name: layoutName })
      closeModal()
      
    } catch (err) {
      error = err.message || 'Errore durante il salvataggio'
    } finally {
      isLoading = false
    }
  }
  
  function closeModal() {
    isOpen = false
    layoutSaveModalOpen.set(false)
    
    // Reset form
    layoutName = ''
    layoutDescription = ''
    error = ''
    isLoading = false
  }
  
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal()
    } else if (event.key === 'Enter' && event.ctrlKey && isValid) {
      handleSave()
    }
  }
  
  // Close on click outside
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal">
      <div class="modal-header">
        <h2>💾 Salva Layout</h2>
        <button class="close-btn" on:click={closeModal}>✕</button>
      </div>
      
      <div class="modal-body">
        {#if error}
          <div class="error-message">
            ⚠️ {error}
          </div>
        {/if}
        
        <div class="form-group">
          <label for="layoutName">Nome Layout *</label>
          <input 
            id="layoutName"
            type="text" 
            bind:value={layoutName}
            placeholder="Es: Dashboard Principale, Monitor Wall..."
            class:error={nameExists}
            maxlength="50"
            disabled={isLoading}
          />
          {#if nameExists}
            <span class="field-error">⚠️ Questo nome esiste già</span>
          {/if}
          <span class="field-help">Minimo 3 caratteri</span>
        </div>
        
        <div class="form-group">
          <label for="layoutDescription">Descrizione</label>
          <textarea 
            id="layoutDescription"
            bind:value={layoutDescription}
            placeholder="Descrizione opzionale del layout..."
            rows="3"
            maxlength="200"
            disabled={isLoading}
          ></textarea>
          <span class="field-help">{layoutDescription.length}/200 caratteri</span>
        </div>
        
        <div class="layout-preview">
          <h4>📋 Anteprima Layout</h4>
          <div class="preview-stats">
            <div class="stat">
              <span class="stat-value">{$blocks.length}</span>
              <span class="stat-label">Blocchi</span>
            </div>
            <div class="stat">
              <span class="stat-value">
                {Math.max(...$blocks.map(b => b.x + b.width), 0)}px
              </span>
              <span class="stat-label">Larghezza</span>
            </div>
            <div class="stat">
              <span class="stat-value">
                {Math.max(...$blocks.map(b => b.y + b.height), 0)}px
              </span>
              <span class="stat-label">Altezza</span>
            </div>
          </div>
          
          <div class="preview-canvas">
            {#each $blocks as block}
              <div 
                class="preview-block"
                style="
                  left: {block.x / 10}px; 
                  top: {block.y / 10}px; 
                  width: {block.width / 10}px; 
                  height: {block.height / 10}px;
                "
                title={block.title}
              ></div>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn btn-secondary" 
          on:click={closeModal}
          disabled={isLoading}
        >
          Annulla
        </button>
        
        <button 
          class="btn btn-primary" 
          on:click={handleSave}
          disabled={!isValid}
          class:loading={isLoading}
        >
          {#if isLoading}
            <span class="spinner"></span>
            Salvando...
          {:else}
            💾 Salva Layout
          {/if}
        </button>
      </div>
      
      <div class="modal-shortcuts">
        <span>💡 <kbd>Ctrl+Enter</kbd> per salvare, <kbd>Esc</kbd> per chiudere</span>
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
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
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
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-group input.error {
    border-color: #ef4444;
  }
  
  .field-error {
    display: block;
    color: #ef4444;
    font-size: 12px;
    margin-top: 4px;
  }
  
  .field-help {
    display: block;
    color: #6b7280;
    font-size: 12px;
    margin-top: 4px;
  }
  
  .layout-preview {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
  }
  
  .layout-preview h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #374151;
  }
  
  .preview-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat-value {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }
  
  .stat-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
  }
  
  .preview-canvas {
    position: relative;
    width: 100%;
    height: 120px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .preview-block {
    position: absolute;
    background: #3b82f6;
    border: 1px solid #2563eb;
    border-radius: 2px;
    opacity: 0.8;
  }
  
  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: #f9fafb;
  }
  
  .btn {
    padding: 10px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
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
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn.loading {
    cursor: wait;
  }
  
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .modal-shortcuts {
    padding: 8px 20px;
    background: #f3f4f6;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #6b7280;
    text-align: center;
  }
  
  kbd {
    background: #e5e7eb;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-family: monospace;
  }
</style>