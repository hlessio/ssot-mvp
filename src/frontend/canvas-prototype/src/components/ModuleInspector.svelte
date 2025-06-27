<script>
  import { removeBlock } from '../stores/canvas.js'
  
  export let selectedBlock = null
  
  // Function to handle block removal
  function handleRemoveBlock() {
    if (selectedBlock && confirm(`Are you sure you want to remove "${selectedBlock.title}"?`)) {
      removeBlock(selectedBlock.id)
    }
  }
  
  // Mock data per mostrare il pannello
  $: moduleData = selectedBlock ? {
    type: selectedBlock.type,
    title: selectedBlock.title,
    id: selectedBlock.id,
    properties: [
      { name: 'Entity Type', value: 'Contact', editable: true },
      { name: 'Schema Version', value: '2.1', editable: false },
      { name: 'Data Source', value: 'Neo4j', editable: false },
      { name: 'Last Updated', value: new Date().toLocaleString(), editable: false }
    ],
    attributes: [
      { name: 'nome', type: 'string', required: true, visible: true },
      { name: 'email', type: 'email', required: true, visible: true },
      { name: 'telefono', type: 'phone', required: false, visible: true },
      { name: 'ruolo', type: 'enum', required: false, visible: false }
    ],
    relations: [
      { type: 'WORKS_IN', target: 'Project', count: 3 },
      { type: 'MEMBER_OF', target: 'Team', count: 1 }
    ],
    stats: {
      totalEntities: 247,
      activeConnections: 12,
      lastSync: '2 minutes ago'
    }
  } : null
</script>

<div class="inspector-panel">
  {#if !selectedBlock}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>Ispezione Modulo</h3>
      <p>Seleziona un modulo nel canvas per visualizzare i dettagli</p>
    </div>
  {:else}
    <div class="inspector-content">
      <!-- Header modulo -->
      <div class="module-header">
        <div class="module-icon">
          {#if moduleData.type === 'container'}
            📦
          {:else if moduleData.type === 'table'}
            📊
          {:else}
            🧩
          {/if}
        </div>
        <div class="module-info">
          <h2>{moduleData.title}</h2>
          <span class="module-type">{moduleData.type}</span>
        </div>
      </div>

      <!-- Properties -->
      <div class="section">
        <h3>📋 Proprietà</h3>
        <div class="properties-list">
          {#each moduleData.properties as prop}
            <div class="property-item">
              <label>{prop.name}</label>
              {#if prop.editable}
                <input type="text" bind:value={prop.value} />
              {:else}
                <span class="readonly">{prop.value}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Attributes Schema -->
      <div class="section">
        <h3>🏗️ Schema Attributi</h3>
        <div class="attributes-list">
          {#each moduleData.attributes as attr}
            <div class="attribute-item" class:hidden={!attr.visible}>
              <div class="attr-header">
                <span class="attr-name">{attr.name}</span>
                <span class="attr-type">{attr.type}</span>
                {#if attr.required}
                  <span class="required">*</span>
                {/if}
              </div>
              <div class="attr-controls">
                <label>
                  <input type="checkbox" bind:checked={attr.visible} />
                  Visibile
                </label>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Relations -->
      <div class="section">
        <h3>🔗 Relazioni</h3>
        <div class="relations-list">
          {#each moduleData.relations as rel}
            <div class="relation-item">
              <div class="rel-info">
                <span class="rel-type">{rel.type}</span>
                <span class="rel-target">→ {rel.target}</span>
              </div>
              <span class="rel-count">{rel.count}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Statistics -->
      <div class="section">
        <h3>📊 Statistiche</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{moduleData.stats.totalEntities}</span>
            <span class="stat-label">Entità Totali</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{moduleData.stats.activeConnections}</span>
            <span class="stat-label">Connessioni Attive</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{moduleData.stats.lastSync}</span>
            <span class="stat-label">Ultimo Sync</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="section">
        <h3>⚡ Azioni</h3>
        <div class="actions-list">
          <button class="action-btn primary">🔄 Refresh Data</button>
          <button class="action-btn">⚙️ Configure</button>
          <button class="action-btn">📤 Export</button>
          <button class="action-btn danger" on:click={handleRemoveBlock}>🗑️ Remove</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .inspector-panel {
    width: 320px;
    background: white;
    border-left: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    color: #6b7280;
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin-bottom: 8px;
    color: #374151;
  }

  .inspector-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .module-header {
    padding: 20px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .module-icon {
    font-size: 32px;
  }

  .module-info h2 {
    margin: 0;
    font-size: 18px;
    color: #111827;
  }

  .module-type {
    color: #6b7280;
    font-size: 12px;
    text-transform: uppercase;
    font-weight: 500;
  }

  .section {
    padding: 20px;
    border-bottom: 1px solid #f3f4f6;
  }

  .section h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .properties-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .property-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .property-item label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }

  .property-item input {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
  }

  .property-item .readonly {
    padding: 6px 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 13px;
    color: #6b7280;
  }

  .attributes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .attribute-item {
    padding: 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    transition: opacity 0.2s;
  }

  .attribute-item.hidden {
    opacity: 0.5;
  }

  .attr-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .attr-name {
    font-weight: 500;
    font-size: 13px;
  }

  .attr-type {
    font-size: 11px;
    color: #6b7280;
    background: #e5e7eb;
    padding: 2px 6px;
    border-radius: 10px;
  }

  .required {
    color: #ef4444;
    font-weight: bold;
  }

  .attr-controls {
    font-size: 11px;
  }

  .attr-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: #6b7280;
  }

  .relations-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relation-item {
    display: flex;
    justify-content: between;
    align-items: center;
    padding: 8px 12px;
    background: #eff6ff;
    border: 1px solid #dbeafe;
    border-radius: 4px;
  }

  .rel-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rel-type {
    font-weight: 500;
    font-size: 12px;
    color: #1e40af;
  }

  .rel-target {
    font-size: 11px;
    color: #6b7280;
  }

  .rel-count {
    background: #3b82f6;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-item {
    text-align: center;
    padding: 12px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .stat-value {
    display: block;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }

  .stat-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    text-align: left;
  }

  .action-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .action-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .action-btn.primary:hover {
    background: #2563eb;
  }

  .action-btn.danger {
    color: #dc2626;
    border-color: #fca5a5;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
    border-color: #f87171;
  }
</style>