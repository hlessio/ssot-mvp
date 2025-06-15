<script>
    import { createEventDispatcher } from 'svelte';
    import { workspaceStore } from '../stores/workspaceStore.js';
    
    const dispatch = createEventDispatcher();
    
    // Definizione dei tipi di moduli disponibili
    const moduleTypes = [
        {
            id: 'contact-card',
            name: 'Contact Card',
            description: 'Scheda contatto con informazioni base',
            icon: '👤',
            category: 'basic',
            defaultSize: { w: 4, h: 3 }
        },
        {
            id: 'data-table',
            name: 'Data Table',
            description: 'Tabella dati con ordinamento e filtri',
            icon: '📊',
            category: 'data',
            defaultSize: { w: 8, h: 4 }
        },
        {
            id: 'crew-list',
            name: 'Crew List',
            description: 'Lista membri crew con ruoli',
            icon: '🎬',
            category: 'specialized',
            defaultSize: { w: 6, h: 5 }
        },
        {
            id: 'project-timeline',
            name: 'Timeline',
            description: 'Timeline progetto con milestone',
            icon: '📅',
            category: 'project',
            defaultSize: { w: 10, h: 3 }
        },
        {
            id: 'budget-tracker',
            name: 'Budget Tracker',
            description: 'Tracker budget e spese',
            icon: '💰',
            category: 'finance',
            defaultSize: { w: 6, h: 4 }
        },
        {
            id: 'notes-board',
            name: 'Notes Board',
            description: 'Board per note e appunti',
            icon: '📝',
            category: 'basic',
            defaultSize: { w: 4, h: 4 }
        },
        {
            id: 'file-manager',
            name: 'File Manager',
            description: 'Gestore file e documenti',
            icon: '📁',
            category: 'utility',
            defaultSize: { w: 5, h: 4 }
        },
        {
            id: 'smart-form',
            name: 'Smart Form',
            description: 'Form dinamico con validazione',
            icon: '📋',
            category: 'basic',
            defaultSize: { w: 4, h: 5 }
        }
    ];
    
    // Raggruppa moduli per categoria
    const moduleCategories = {
        basic: { name: 'Base', icon: '🔧' },
        data: { name: 'Dati', icon: '📊' },
        specialized: { name: 'Specializzati', icon: '🎯' },
        project: { name: 'Progetto', icon: '📋' },
        finance: { name: 'Finanza', icon: '💰' },
        utility: { name: 'Utilità', icon: '⚙️' }
    };
    
    let selectedCategory = 'all';
    let searchQuery = '';
    let draggedModule = null;
    
    // Filtra moduli in base a categoria e ricerca
    $: filteredModules = moduleTypes.filter(module => {
        const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
        const matchesSearch = searchQuery === '' || 
            module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            module.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    
    function handleModuleClick(moduleType, event) {
        // Calcola posizione nel grid basata sulla posizione del click
        const workspaceEl = document.querySelector('.grid-container');
        if (!workspaceEl) return;
        
        const rect = workspaceEl.getBoundingClientRect();
        const position = {
            x: Math.floor((event.clientX - rect.left) / 100), // Approssimazione grid
            y: Math.floor((event.clientY - rect.top) / 60)
        };
        
        dispatch('add-module', {
            moduleType: moduleType.id,
            position: position,
            defaultSize: moduleType.defaultSize
        });
    }
    
    function handleDragStart(event, moduleType) {
        draggedModule = moduleType;
        event.dataTransfer.setData('text/plain', JSON.stringify(moduleType));
        event.dataTransfer.effectAllowed = 'copy';
        
        // Visual feedback durante drag
        event.target.classList.add('dragging');
    }
    
    function handleDragEnd(event) {
        event.target.classList.remove('dragging');
        draggedModule = null;
    }
    
    function clearSearch() {
        searchQuery = '';
    }
</script>

<aside class="module-palette">
    <!-- Header -->
    <div class="palette-header">
        <h3>🧩 Moduli</h3>
        <p class="palette-subtitle">Trascina o clicca per aggiungere</p>
    </div>
    
    <!-- Search -->
    <div class="search-section">
        <div class="search-input-wrapper">
            <input 
                type="text" 
                placeholder="Cerca moduli..."
                bind:value={searchQuery}
                class="search-input"
            />
            {#if searchQuery}
                <button class="clear-search" on:click={clearSearch}>✕</button>
            {/if}
        </div>
    </div>
    
    <!-- Category Filter -->
    <div class="category-filter">
        <button 
            class="category-btn"
            class:active={selectedCategory === 'all'}
            on:click={() => selectedCategory = 'all'}
        >
            🌟 Tutti
        </button>
        
        {#each Object.entries(moduleCategories) as [categoryId, category]}
            <button 
                class="category-btn"
                class:active={selectedCategory === categoryId}
                on:click={() => selectedCategory = categoryId}
            >
                {category.icon} {category.name}
            </button>
        {/each}
    </div>
    
    <!-- Module List -->
    <div class="module-list">
        {#if filteredModules.length === 0}
            <div class="no-modules">
                <p>🔍 Nessun modulo trovato</p>
                {#if searchQuery}
                    <button class="reset-search" on:click={clearSearch}>
                        Cancella ricerca
                    </button>
                {/if}
            </div>
        {:else}
            {#each filteredModules as moduleType}
                <div 
                    class="module-item"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, moduleType)}
                    on:dragend={handleDragEnd}
                    on:click={(e) => handleModuleClick(moduleType, e)}
                    title="Clicca per aggiungere al centro o trascina nella posizione desiderata"
                >
                    <div class="module-icon">{moduleType.icon}</div>
                    <div class="module-info">
                        <h4 class="module-name">{moduleType.name}</h4>
                        <p class="module-description">{moduleType.description}</p>
                        <div class="module-meta">
                            <span class="module-size">
                                {moduleType.defaultSize.w}×{moduleType.defaultSize.h}
                            </span>
                            <span class="module-category">
                                {moduleCategories[moduleType.category]?.name || moduleType.category}
                            </span>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    
    <!-- Footer Info -->
    <div class="palette-footer">
        <div class="usage-hint">
            <h4>💡 Come utilizzare:</h4>
            <ul>
                <li><strong>Clicca</strong> per aggiungere al centro</li>
                <li><strong>Trascina</strong> per posizionare</li>
                <li><strong>Cerca</strong> per trovare rapidamente</li>
            </ul>
        </div>
    </div>
</aside>

<style>
    .module-palette {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-right: 1px solid #dee2e6;
        overflow: hidden;
    }
    
    .palette-header {
        padding: 20px;
        border-bottom: 1px solid #f1f3f4;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .palette-header h3 {
        margin: 0 0 5px 0;
        font-size: 1.2em;
        font-weight: 600;
    }
    
    .palette-subtitle {
        margin: 0;
        font-size: 0.85em;
        opacity: 0.9;
    }
    
    .search-section {
        padding: 15px;
        border-bottom: 1px solid #f1f3f4;
    }
    
    .search-input-wrapper {
        position: relative;
    }
    
    .search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9em;
        box-sizing: border-box;
    }
    
    .search-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
    }
    
    .clear-search {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        font-size: 0.8em;
        padding: 2px;
        border-radius: 50%;
    }
    
    .clear-search:hover {
        background: #f1f3f4;
    }
    
    .category-filter {
        padding: 10px 15px;
        border-bottom: 1px solid #f1f3f4;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .category-btn {
        padding: 6px 10px;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
        text-align: left;
        transition: all 0.2s;
    }
    
    .category-btn:hover {
        background: #f8f9fa;
    }
    
    .category-btn.active {
        background: #e3f2fd;
        color: #1976d2;
        font-weight: 500;
    }
    
    .module-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
    }
    
    .module-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
    }
    
    .module-item:hover {
        border-color: #007bff;
        box-shadow: 0 2px 8px rgba(0,123,255,0.15);
        transform: translateY(-1px);
    }
    
    .module-item.dragging {
        opacity: 0.5;
        transform: rotate(3deg);
    }
    
    .module-icon {
        font-size: 1.5em;
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .module-info {
        flex: 1;
        min-width: 0;
    }
    
    .module-name {
        margin: 0 0 4px 0;
        font-size: 0.95em;
        font-weight: 600;
        color: #333;
    }
    
    .module-description {
        margin: 0 0 8px 0;
        font-size: 0.8em;
        color: #666;
        line-height: 1.3;
    }
    
    .module-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75em;
        color: #888;
    }
    
    .module-size {
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 500;
    }
    
    .module-category {
        font-style: italic;
    }
    
    .no-modules {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .no-modules p {
        margin: 0 0 15px 0;
    }
    
    .reset-search {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
    }
    
    .palette-footer {
        padding: 15px;
        border-top: 1px solid #f1f3f4;
        background: #f8f9fa;
        font-size: 0.8em;
    }
    
    .usage-hint h4 {
        margin: 0 0 8px 0;
        color: #333;
    }
    
    .usage-hint ul {
        margin: 0;
        padding-left: 16px;
        color: #666;
    }
    
    .usage-hint li {
        margin-bottom: 4px;
    }
    
    /* Scrollbar styling */
    .module-list::-webkit-scrollbar {
        width: 6px;
    }
    
    .module-list::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    
    .module-list::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
    }
    
    .module-list::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
</style>