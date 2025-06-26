<script>
  import { createEventDispatcher } from 'svelte'
  
  export let selectedBlock = null
  
  const dispatch = createEventDispatcher()
  
  const blockTypes = [
    { id: 'container', name: 'Contenitore', icon: '📦' },
    { id: 'table', name: 'Tabella', icon: '📊' },
    { id: 'form', name: 'Form', icon: '📝' },
    { id: 'chart', name: 'Grafico', icon: '📈' }
  ]
  
  const moduleTypes = [
    { id: 'contact-list', name: 'Lista Contatti', icon: '👥' },
    { id: 'calendar', name: 'Calendario', icon: '📅' },
    { id: 'notes', name: 'Note', icon: '📓' },
    { id: 'tasks', name: 'Task', icon: '✅' }
  ]
  
  function addBlock(type) {
    dispatch('addBlock', type)
  }
</script>

<div class="sidebar">
  <div class="sidebar-section">
    <h2>Blocchi Base</h2>
    <div class="items-grid">
      {#each blockTypes as type}
        <button 
          class="item-button"
          on:click={() => addBlock(type.id)}
        >
          <span class="item-icon">{type.icon}</span>
          <span class="item-name">{type.name}</span>
        </button>
      {/each}
    </div>
  </div>
  
  <div class="sidebar-section">
    <h2>Moduli SSOT</h2>
    <div class="items-grid">
      {#each moduleTypes as module}
        <button 
          class="item-button module"
          draggable="true"
        >
          <span class="item-icon">{module.icon}</span>
          <span class="item-name">{module.name}</span>
        </button>
      {/each}
    </div>
  </div>
  
  {#if selectedBlock}
    <div class="sidebar-section properties">
      <h2>Proprietà</h2>
      <div class="property-group">
        <label>
          Titolo
          <input type="text" bind:value={selectedBlock.title} />
        </label>
      </div>
      <div class="property-group">
        <label>
          Posizione X
          <input type="number" bind:value={selectedBlock.x} step="25" />
        </label>
      </div>
      <div class="property-group">
        <label>
          Posizione Y
          <input type="number" bind:value={selectedBlock.y} step="25" />
        </label>
      </div>
      <div class="property-group">
        <label>
          Larghezza
          <input type="number" bind:value={selectedBlock.width} step="25" />
        </label>
      </div>
      <div class="property-group">
        <label>
          Altezza
          <input type="number" bind:value={selectedBlock.height} step="25" />
        </label>
      </div>
    </div>
  {/if}
</div>

<style>
  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e5e7eb;
    padding: 20px;
    overflow-y: auto;
  }
  
  .sidebar-section {
    margin-bottom: 32px;
  }
  
  .sidebar-section h2 {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 16px;
  }
  
  .items-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .item-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .item-button:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    transform: translateY(-1px);
  }
  
  .item-button.module {
    background: #eff6ff;
    border-color: #dbeafe;
  }
  
  .item-button.module:hover {
    background: #dbeafe;
    border-color: #bfdbfe;
  }
  
  .item-icon {
    font-size: 24px;
    margin-bottom: 4px;
  }
  
  .item-name {
    font-size: 12px;
    color: #374151;
    text-align: center;
  }
  
  .properties {
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }
  
  .property-group {
    margin-bottom: 16px;
  }
  
  .property-group label {
    display: block;
    font-size: 14px;
    color: #374151;
    margin-bottom: 4px;
  }
  
  .property-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  
  .property-group input:focus {
    border-color: #3b82f6;
  }
</style>