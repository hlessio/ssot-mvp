<script>
  import { dndzone } from 'svelte-dnd-action'
  
  export let block
  
  const flipDurationMs = 200
  
  function handleDndConsider(e) {
    block.content = e.detail.items
  }
  
  function handleDndFinalize(e) {
    block.content = e.detail.items
  }
  
  function addContentItem() {
    const newItem = {
      id: `item-${Date.now()}`,
      type: 'text',
      value: 'Nuovo elemento'
    }
    block.content = [...block.content, newItem]
  }
</script>

<div class="block">
  <div class="block-header">
    <h3>{block.title}</h3>
    <button class="add-btn" on:click={addContentItem}>+</button>
  </div>
  
  <div 
    class="block-content"
    use:dndzone={{
      items: block.content,
      flipDurationMs,
      type: 'content'
    }}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
  >
    {#each block.content as item (item.id)}
      <div class="content-item">
        {#if item.type === 'text'}
          <input type="text" bind:value={item.value} />
        {:else if item.type === 'module'}
          <div class="module-placeholder">
            Modulo: {item.moduleType}
          </div>
        {/if}
      </div>
    {/each}
    
    {#if block.content.length === 0}
      <div class="empty-state">
        Trascina qui i contenuti o clicca + per aggiungere
      </div>
    {/if}
  </div>
</div>

<style>
  .block {
    width: 100%;
    height: 100%;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .block-header {
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .block-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }
  
  .add-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #6b7280;
    transition: all 0.2s;
  }
  
  .add-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #374151;
  }
  
  .block-content {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    min-height: 100px;
  }
  
  .content-item {
    padding: 8px;
    margin-bottom: 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    cursor: move;
  }
  
  .content-item input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 14px;
    outline: none;
  }
  
  .module-placeholder {
    padding: 16px;
    text-align: center;
    color: #6b7280;
    font-size: 14px;
  }
  
  .empty-state {
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    padding: 20px;
  }
</style>