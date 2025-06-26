<script>
  import { createEventDispatcher } from 'svelte'
  import { 
    blocks, 
    currentLayoutId, 
    quickSaveLayout, 
    newCanvas, 
    hasUnsavedChanges,
    initializeTemplates 
  } from '../stores/canvas.js'
  
  const dispatch = createEventDispatcher()
  
  let isQuickSaving = false
  let showUnsavedIndicator = false
  
  // Monitor unsaved changes
  $: {
    const unsaved = hasUnsavedChanges()
    if (unsaved && !showUnsavedIndicator) {
      showUnsavedIndicator = true
    } else if (!unsaved) {
      showUnsavedIndicator = false
    }
  }
  
  async function handleQuickSave() {
    if ($blocks.length === 0) return
    
    isQuickSaving = true
    try {
      const layoutId = quickSaveLayout()
      dispatch('layoutSaved', { layoutId, message: 'Layout salvato velocemente!' })
    } catch (error) {
      dispatch('error', { message: error.message })
    } finally {
      isQuickSaving = false
    }
  }
  
  function handleNewCanvas() {
    if (hasUnsavedChanges()) {
      if (!confirm('Hai modifiche non salvate. Vuoi procedere comunque?')) {
        return
      }
    }
    
    newCanvas()
    dispatch('canvasCleared')
  }
  
  function handleSaveAs() {
    dispatch('openSaveModal')
  }
  
  function handleLoad() {
    dispatch('openLoadModal')
  }
  
  function handleInitTemplates() {
    initializeTemplates()
    dispatch('templatesCreated', { message: 'Template predefiniti creati!' })
  }
  
  // Keyboard shortcuts
  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault()
          if (event.shiftKey) {
            handleSaveAs()
          } else {
            handleQuickSave()
          }
          break
        case 'o':
          event.preventDefault()
          handleLoad()
          break
        case 'n':
          event.preventDefault()
          handleNewCanvas()
          break
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="canvas-toolbar">
  <div class="toolbar-section">
    <button 
      class="toolbar-btn primary"
      on:click={handleNewCanvas}
      title="Nuovo Canvas (Ctrl+N)"
    >
      📄 Nuovo
    </button>
    
    <div class="toolbar-separator"></div>
    
    <button 
      class="toolbar-btn"
      on:click={handleLoad}
      title="Carica Layout (Ctrl+O)"
    >
      📂 Carica
    </button>
    
    <button 
      class="toolbar-btn"
      on:click={handleSaveAs}
      disabled={$blocks.length === 0}
      title="Salva con Nome (Ctrl+Shift+S)"
    >
      💾 Salva come...
    </button>
    
    <button 
      class="toolbar-btn quick-save"
      class:loading={isQuickSaving}
      on:click={handleQuickSave}
      disabled={$blocks.length === 0 || isQuickSaving}
      title="Salvataggio Rapido (Ctrl+S)"
    >
      {#if isQuickSaving}
        <span class="spinner"></span>
        Salvando...
      {:else}
        ⚡ Quick Save
      {/if}
    </button>
  </div>
  
  <div class="toolbar-section status">
    {#if $currentLayoutId}
      <div class="layout-status">
        <span class="layout-indicator">🎨 Layout caricato</span>
        {#if showUnsavedIndicator}
          <span class="unsaved-indicator" title="Modifiche non salvate">●</span>
        {/if}
      </div>
    {:else if $blocks.length > 0}
      <div class="layout-status">
        <span class="layout-indicator">✏️ Layout non salvato</span>
        <span class="unsaved-indicator" title="Layout non salvato">●</span>
      </div>
    {:else}
      <div class="layout-status">
        <span class="layout-indicator">📄 Canvas vuoto</span>
      </div>
    {/if}
  </div>
  
  <div class="toolbar-section">
    <span class="blocks-count">{$blocks.length} blocchi</span>
    
    <div class="toolbar-separator"></div>
    
    <button 
      class="toolbar-btn secondary"
      on:click={handleInitTemplates}
      title="Crea Template Predefiniti"
    >
      🎨 Template
    </button>
  </div>
</div>

<style>
  .canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .toolbar-section.status {
    flex: 1;
    justify-content: center;
  }
  
  .toolbar-btn {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  
  .toolbar-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
    transform: translateY(-1px);
  }
  
  .toolbar-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .toolbar-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .toolbar-btn.primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }
  
  .toolbar-btn.secondary {
    background: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
  }
  
  .toolbar-btn.quick-save {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }
  
  .toolbar-btn.quick-save:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }
  
  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .toolbar-btn.loading {
    cursor: wait;
  }
  
  .toolbar-separator {
    width: 1px;
    height: 20px;
    background: #e5e7eb;
    margin: 0 4px;
  }
  
  .layout-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;
  }
  
  .layout-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .unsaved-indicator {
    color: #f59e0b;
    font-size: 16px;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .blocks-count {
    font-size: 12px;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 10px;
    font-weight: 500;
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
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .canvas-toolbar {
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .toolbar-section {
      gap: 4px;
    }
    
    .toolbar-btn {
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .blocks-count {
      font-size: 11px;
    }
  }
</style>