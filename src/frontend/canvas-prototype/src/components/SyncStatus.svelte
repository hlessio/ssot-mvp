<script>
  import { backendSyncEnabled, blocks } from '../stores/canvas.js'
  import ModuleInstanceService from '../services/ModuleInstanceService.js'
  
  const moduleInstanceService = new ModuleInstanceService()
  
  // Track sync status
  let syncedBlocks = 0
  let totalBlocks = 0
  
  $: {
    totalBlocks = $blocks.length
    const mappings = moduleInstanceService.getBlockMappings()
    syncedBlocks = $blocks.filter(block => mappings[block.id]).length
  }
  
  function clearMappings() {
    if (confirm('Clear all block-to-instance mappings?')) {
      moduleInstanceService.clearAllMappings()
      syncedBlocks = 0
    }
  }
</script>

{#if $backendSyncEnabled}
  <div class="sync-status">
    <div class="sync-header">
      <span class="sync-icon">🔄</span>
      <span class="sync-title">Backend Sync Status</span>
    </div>
    
    <div class="sync-info">
      <div class="sync-stat">
        <span class="stat-label">Total Blocks:</span>
        <span class="stat-value">{totalBlocks}</span>
      </div>
      
      <div class="sync-stat">
        <span class="stat-label">Synced:</span>
        <span class="stat-value" class:success={syncedBlocks === totalBlocks}>
          {syncedBlocks} / {totalBlocks}
        </span>
      </div>
      
      <div class="sync-stat">
        <span class="stat-label">Unsynced:</span>
        <span class="stat-value" class:warning={totalBlocks - syncedBlocks > 0}>
          {totalBlocks - syncedBlocks}
        </span>
      </div>
    </div>
    
    <div class="sync-actions">
      <button class="sync-btn" on:click={clearMappings} title="Clear all mappings">
        🗑️ Clear Mappings
      </button>
    </div>
    
    <div class="sync-note">
      <p>✨ New blocks will auto-create ModuleInstance entities</p>
      <p>🗑️ Deleted blocks will remove ModuleInstance entities</p>
      <p>📍 Position/size changes sync automatically</p>
    </div>
  </div>
{/if}

<style>
  .sync-status {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 280px;
    z-index: 1000;
  }
  
  .sync-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .sync-icon {
    font-size: 20px;
    animation: rotate 2s linear infinite;
  }
  
  @keyframes rotate {
    to { transform: rotate(360deg); }
  }
  
  .sync-title {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
  }
  
  .sync-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .sync-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: #f9fafb;
    border-radius: 4px;
  }
  
  .stat-label {
    font-size: 12px;
    color: #6b7280;
  }
  
  .stat-value {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
  
  .stat-value.success {
    color: #10b981;
  }
  
  .stat-value.warning {
    color: #f59e0b;
  }
  
  .sync-actions {
    margin-bottom: 12px;
  }
  
  .sync-btn {
    width: 100%;
    padding: 6px 12px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .sync-btn:hover {
    background: #e5e7eb;
    border-color: #d1d5db;
  }
  
  .sync-note {
    padding-top: 12px;
    border-top: 1px solid #f3f4f6;
  }
  
  .sync-note p {
    margin: 4px 0;
    font-size: 11px;
    color: #6b7280;
  }
</style>