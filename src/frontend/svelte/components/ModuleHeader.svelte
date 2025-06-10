<script>
    export let project = null;
    export let module = null;
    
    $: breadcrumb = project && module ? 
        `${project.name} → ${module.instanceName}` : 
        'Nessun modulo selezionato';
</script>

<div class="module-header">
    <div class="breadcrumb">
        <span class="breadcrumb-text">{breadcrumb}</span>
    </div>
    
    {#if module}
        <div class="module-info">
            <h2 class="module-title">{module.instanceName}</h2>
            {#if project}
                <p class="project-context">Progetto: <strong>{project.name}</strong></p>
            {/if}
            <p class="module-type">Tipo: {module.moduleType || 'Standard'}</p>
        </div>
        
        <div class="module-actions">
            <button class="action-btn primary">
                💾 Salva Modulo
            </button>
            <button class="action-btn secondary">
                📊 Visualizza Aggregati
            </button>
            <button class="action-btn secondary">
                🔗 Gestisci Collegamenti
            </button>
        </div>
    {/if}
</div>

<style>
    .module-header {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .breadcrumb {
        margin-bottom: 15px;
    }
    
    .breadcrumb-text {
        font-size: 0.9em;
        color: #666;
        background: #f8f9fa;
        padding: 6px 12px;
        border-radius: 20px;
        font-family: monospace;
    }
    
    .module-info {
        margin-bottom: 20px;
    }
    
    .module-title {
        margin: 0 0 10px 0;
        font-size: 1.8em;
        color: #2c3e50;
        font-weight: 600;
    }
    
    .project-context, .module-type {
        margin: 5px 0;
        color: #555;
        font-size: 1em;
    }
    
    .module-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .action-btn {
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.95em;
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 500;
    }
    
    .action-btn.primary {
        background: #3498db;
        color: white;
    }
    
    .action-btn.primary:hover {
        background: #2980b9;
        transform: translateY(-1px);
    }
    
    .action-btn.secondary {
        background: #ecf0f1;
        color: #34495e;
        border: 1px solid #bdc3c7;
    }
    
    .action-btn.secondary:hover {
        background: #d5dbdb;
        transform: translateY(-1px);
    }
</style>