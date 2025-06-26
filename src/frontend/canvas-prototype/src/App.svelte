<script>
  import Canvas from './components/Canvas.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import ModuleInspector from './components/ModuleInspector.svelte'
  import CanvasToolbar from './components/CanvasToolbar.svelte'
  import SaveLayoutModal from './components/SaveLayoutModal.svelte'
  import LoadLayoutModal from './components/LoadLayoutModal.svelte'
  import { 
    blocks, 
    selectedBlock, 
    selectedBlockId, 
    addBlock, 
    updateBlock, 
    initWebSocket, 
    wsStatus,
    layoutSaveModalOpen,
    layoutLoadModalOpen,
    initializeTemplates
  } from './stores/canvas.js'
  import { onMount } from 'svelte'
  
  let notifications = []
  
  // Inizializza l'applicazione
  onMount(() => {
    // Inizializza WebSocket
    initWebSocket()
    
    // Inizializza template predefiniti se è la prima volta
    initializeTemplates()
    
    // Carica blocchi di esempio se non ci sono layout salvati
    const initialBlocks = [
      { id: 'block1', type: 'container', title: 'Modulo 1', x: 100, y: 100, width: 300, height: 200, content: [] },
      { id: 'block2', type: 'container', title: 'Modulo 2', x: 450, y: 100, width: 300, height: 200, content: [] },
      { id: 'block3', type: 'container', title: 'Modulo 3', x: 100, y: 350, width: 300, height: 200, content: [] }
    ]
    
    blocks.set(initialBlocks)
  })
  
  function handleBlockUpdate(event) {
    const { id, data } = event.detail
    updateBlock(id, data)
  }
  
  function handleBlockSelect(event) {
    selectedBlockId.set(event.detail.id)
  }
  
  function addNewBlock(type) {
    const newBlock = {
      id: `block${Date.now()}`,
      type: 'container',
      title: `Nuovo ${type}`,
      x: 150,
      y: 150,
      width: 300,
      height: 200,
      content: []
    }
    addBlock(newBlock)
  }
  
  // Layout management event handlers
  function handleOpenSaveModal() {
    layoutSaveModalOpen.set(true)
  }
  
  function handleOpenLoadModal() {
    layoutLoadModalOpen.set(true)
  }
  
  function handleLayoutSaved(event) {
    showNotification('✅ Layout salvato con successo!', 'success')
  }
  
  function handleLayoutLoaded(event) {
    showNotification('📂 Layout caricato con successo!', 'success')
  }
  
  function handleCanvasCleared() {
    showNotification('🗑️ Canvas pulito', 'info')
  }
  
  function handleTemplatesCreated() {
    showNotification('🎨 Template predefiniti creati!', 'info')
  }
  
  function handleError(event) {
    showNotification(`❌ ${event.detail.message}`, 'error')
  }
  
  // Notification system
  function showNotification(message, type = 'info') {
    const id = Date.now()
    const notification = { id, message, type }
    
    notifications = [...notifications, notification]
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notifications = notifications.filter(n => n.id !== id)
    }, 3000)
  }
  
  function removeNotification(id) {
    notifications = notifications.filter(n => n.id !== id)
  }
</script>

<div class="app-container">
  <Sidebar 
    selectedBlock={$selectedBlock} 
    on:addBlock={(e) => addNewBlock(e.detail)}
  />
  
  <div class="canvas-area">
    <CanvasToolbar 
      on:openSaveModal={handleOpenSaveModal}
      on:openLoadModal={handleOpenLoadModal}
      on:layoutSaved={handleLayoutSaved}
      on:canvasCleared={handleCanvasCleared}
      on:templatesCreated={handleTemplatesCreated}
      on:error={handleError}
    />
    
    <Canvas 
      blocks={$blocks}
      on:blockUpdate={handleBlockUpdate}
      on:blockSelect={handleBlockSelect}
    />
  </div>
  
  <ModuleInspector selectedBlock={$selectedBlock} />
  
  {#if $wsStatus === 'connected'}
    <div class="ws-status connected">🟢 Connected</div>
  {:else}
    <div class="ws-status disconnected">🔴 Disconnected</div>
  {/if}
</div>

<!-- Modals -->
<SaveLayoutModal 
  isOpen={$layoutSaveModalOpen}
  on:saved={handleLayoutSaved}
/>

<LoadLayoutModal 
  isOpen={$layoutLoadModalOpen}
  on:loaded={handleLayoutLoaded}
/>

<!-- Notifications -->
{#if notifications.length > 0}
  <div class="notifications">
    {#each notifications as notification (notification.id)}
      <div 
        class="notification notification-{notification.type}"
        on:click={() => removeNotification(notification.id)}
      >
        <span>{notification.message}</span>
        <button class="notification-close">✕</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .app-container {
    display: grid;
    grid-template-columns: 280px 1fr 320px;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative;
  }
  
  .canvas-area {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .ws-status {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 8px 12px;
    border-radius: 16px;
    font-size: 12px;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .ws-status.connected {
    background: #d1fae5;
    color: #065f46;
  }
  
  .ws-status.disconnected {
    background: #fee2e2;
    color: #991b1b;
  }
  
  /* Notifications */
  .notifications {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  
  .notification {
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    cursor: pointer;
    transition: all 0.3s ease;
    animation: slideDown 0.3s ease-out;
    max-width: 400px;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .notification-success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }
  
  .notification-error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }
  
  .notification-info {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
  }
  
  .notification:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  .notification-close {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .notification-close:hover {
    opacity: 1;
  }
</style>