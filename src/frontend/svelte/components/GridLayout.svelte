<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { workspaceStore } from '../stores/workspaceStore.js';
    import ModuleContainer from './ModuleContainer.svelte';
    
    export let modules = [];
    export let layout = {};
    export let documentContext = {};
    
    const dispatch = createEventDispatcher();
    
    let gridEl;
    let workspace = {};
    let selectedModule = null;
    let viewMode = 'edit';
    let zoom = 1.0;
    
    // Grid configuration
    $: gridSize = layout.gridSize || 12;
    $: cellHeight = layout.cellHeight || 60;
    $: margin = layout.margin || [10, 10];
    $: containerPadding = layout.containerPadding || [20, 20];
    
    // Subscribe to workspace store
    const unsubscribe = workspaceStore.subscribe(value => {
        workspace = value;
        selectedModule = value.selection;
        viewMode = value.viewMode;
        zoom = value.zoom;
    });
    
    onMount(() => {
        // Setup drop zone for module palette
        if (gridEl) {
            gridEl.addEventListener('drop', handleDrop);
            gridEl.addEventListener('dragover', handleDragOver);
        }
        
        // Setup click handler for deselection
        document.addEventListener('click', handleDocumentClick);
    });
    
    onDestroy(() => {
        unsubscribe();
        
        if (gridEl) {
            gridEl.removeEventListener('drop', handleDrop);
            gridEl.removeEventListener('dragover', handleDragOver);
        }
        
        document.removeEventListener('click', handleDocumentClick);
    });
    
    function handleDocumentClick(event) {
        // Deselect module if clicking outside
        if (!event.target.closest('.module-container')) {
            workspaceStore.clearSelection();
        }
    }
    
    function handleDrop(event) {
        event.preventDefault();
        
        const moduleTypeData = event.dataTransfer.getData('text/plain');
        if (!moduleTypeData) return;
        
        try {
            const moduleType = JSON.parse(moduleTypeData);
            
            // Calculate grid position from drop coordinates
            const rect = gridEl.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left - containerPadding[0]) / (rect.width / gridSize));
            const y = Math.floor((event.clientY - rect.top - containerPadding[1]) / cellHeight);
            
            const position = {
                x: Math.max(0, Math.min(x, gridSize - moduleType.defaultSize.w)),
                y: Math.max(0, y)
            };
            
            dispatch('module-add', {
                moduleType: moduleType.id,
                position: position,
                defaultSize: moduleType.defaultSize
            });
            
        } catch (error) {
            console.error('Errore parsing module data:', error);
        }
    }
    
    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
    
    function handleModuleUpdate(event) {
        const { moduleId, layoutConfig } = event.detail;
        dispatch('module-update', { moduleId, layoutConfig });
    }
    
    function handleModuleRemove(event) {
        const { moduleId } = event.detail;
        dispatch('module-remove', { moduleId });
    }
    
    function getModuleLayoutConfig(module) {
        return workspace.modules.get(module.id) || module.layoutConfig || {};
    }
    
    function isModuleSelected(moduleId) {
        return selectedModule === moduleId;
    }
    
    function isModuleDragging(moduleId) {
        return workspace.isDragging && selectedModule === moduleId;
    }
    
    function isModuleResizing(moduleId) {
        return workspace.isResizing && selectedModule === moduleId;
    }
    
    // Generate grid background for visual reference
    function generateGridBackground() {
        if (viewMode !== 'edit') return '';
        
        const cellWidth = 100 / gridSize; // Percentage
        const horizontalLines = [];
        const verticalLines = [];
        
        // Vertical lines (columns)
        for (let i = 1; i < gridSize; i++) {
            const position = (i * cellWidth);
            verticalLines.push(`${position}% 0, ${position}% 100%`);
        }
        
        // Horizontal lines (rows) - show every cellHeight pixels
        for (let i = 1; i <= 20; i++) { // Limit to reasonable number
            const position = i * cellHeight;
            horizontalLines.push(`0 ${position}px, 100% ${position}px`);
        }
        
        const allLines = [
            ...verticalLines.map(line => `linear-gradient(90deg, transparent ${line.split(',')[0]}, #e9ecef ${line.split(',')[0]}, #e9ecef calc(${line.split(',')[0]} + 1px), transparent calc(${line.split(',')[0]} + 1px))`),
            ...horizontalLines.map(line => `linear-gradient(0deg, transparent ${line.split(' ')[1].split(',')[0]}, #e9ecef ${line.split(' ')[1].split(',')[0]}, #e9ecef calc(${line.split(' ')[1].split(',')[0]} + 1px), transparent calc(${line.split(' ')[1].split(',')[0]} + 1px))`)
        ];
        
        return allLines.join(', ');
    }
    
    $: gridBackground = generateGridBackground();
</script>

<div 
    class="grid-layout"
    class:edit-mode={viewMode === 'edit'}
    class:preview-mode={viewMode === 'preview'}
    class:present-mode={viewMode === 'present'}
    style="
        padding: {containerPadding[1]}px {containerPadding[0]}px;
        transform: scale({zoom});
        transform-origin: top left;
        background-image: {gridBackground};
        min-height: {Math.max(600, (Math.max(...modules.map(m => {
            const config = getModuleLayoutConfig(m);
            const pos = config.position || { y: 0 };
            const size = config.size || { h: 3 };
            return (pos.y + size.h) * cellHeight;
        })) || 10) + containerPadding[1] * 2)}px;
    "
    bind:this={gridEl}
>
    <!-- Drop Zone Indicator -->
    {#if viewMode === 'edit'}
        <div class="drop-zone-hint">
            <p>📦 Trascina moduli dalla palette o clicca per aggiungere</p>
        </div>
    {/if}
    
    <!-- Modules -->
    {#each modules as module (module.id)}
        <ModuleContainer
            {module}
            layoutConfig={getModuleLayoutConfig(module)}
            isSelected={isModuleSelected(module.id)}
            isDragging={isModuleDragging(module.id)}
            isResizing={isModuleResizing(module.id)}
            {viewMode}
            {documentContext}
            on:update={handleModuleUpdate}
            on:remove={handleModuleRemove}
        />
    {/each}
    
    <!-- Grid Size Indicator -->
    {#if viewMode === 'edit' && modules.length === 0}
        <div class="grid-info">
            <div class="grid-stats">
                <h3>🏗️ Workspace Grid</h3>
                <p><strong>Colonne:</strong> {gridSize}</p>
                <p><strong>Altezza cella:</strong> {cellHeight}px</p>
                <p><strong>Zoom:</strong> {Math.round(zoom * 100)}%</p>
                <p><strong>Modalità:</strong> {viewMode}</p>
            </div>
            
            <div class="quick-actions">
                <h4>🚀 Azioni Rapide</h4>
                <ul>
                    <li>Trascina moduli dalla palette a sinistra</li>
                    <li>Clicca su un modulo per selezionarlo</li>
                    <li>Usa i controlli nell'header per salvare</li>
                    <li>Cambia modalità visualizzazione dall'header</li>
                </ul>
            </div>
        </div>
    {/if}
    
    <!-- Module Count Badge -->
    {#if modules.length > 0}
        <div class="module-count-badge">
            🧩 {modules.length} modulo{modules.length !== 1 ? 'i' : ''}
        </div>
    {/if}
</div>

<style>
    .grid-layout {
        position: relative;
        width: 100%;
        background: #f8f9fa;
        background-size: 100% auto;
        background-repeat: repeat-y;
        overflow: visible;
        transition: transform 0.3s ease;
    }
    
    .grid-layout.edit-mode {
        cursor: default;
    }
    
    .grid-layout.preview-mode {
        background-image: none !important;
    }
    
    .grid-layout.present-mode {
        background: white;
        background-image: none !important;
    }
    
    .drop-zone-hint {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #666;
        font-size: 1.1em;
        opacity: 0.7;
        pointer-events: none;
        z-index: 0;
    }
    
    .drop-zone-hint p {
        margin: 0;
        padding: 20px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 12px;
        border: 2px dashed #ccc;
    }
    
    .grid-info {
        position: absolute;
        top: 40px;
        left: 40px;
        right: 40px;
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1;
    }
    
    .grid-stats {
        margin-bottom: 25px;
    }
    
    .grid-stats h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.3em;
    }
    
    .grid-stats p {
        margin: 8px 0;
        color: #666;
        font-size: 1em;
    }
    
    .quick-actions h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 1.1em;
    }
    
    .quick-actions ul {
        margin: 0;
        padding-left: 20px;
        color: #666;
    }
    
    .quick-actions li {
        margin: 6px 0;
        line-height: 1.4;
    }
    
    .module-count-badge {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        pointer-events: none;
    }
    
    /* Responsive grid */
    @media (max-width: 1200px) {
        .grid-layout {
            padding: 15px;
        }
        
        .grid-info {
            top: 20px;
            left: 20px;
            right: 20px;
            padding: 20px;
        }
    }
    
    @media (max-width: 768px) {
        .grid-layout {
            padding: 10px;
        }
        
        .grid-info {
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 15px;
        }
        
        .grid-stats h3 {
            font-size: 1.1em;
        }
        
        .quick-actions h4 {
            font-size: 1em;
        }
        
        .module-count-badge {
            bottom: 15px;
            right: 15px;
            padding: 6px 12px;
            font-size: 0.8em;
        }
    }
    
    /* Present mode - full screen clean */
    .grid-layout.present-mode .grid-info,
    .grid-layout.present-mode .drop-zone-hint,
    .grid-layout.present-mode .module-count-badge {
        display: none;
    }
    
    /* Preview mode - minimal grid */
    .grid-layout.preview-mode .grid-info {
        opacity: 0.5;
    }
    
    /* Animation for smooth transitions */
    .grid-layout * {
        transition: opacity 0.3s ease;
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .grid-layout {
            background: white;
        }
        
        .drop-zone-hint p {
            border-color: #000;
            background: #fff;
            color: #000;
        }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        .grid-layout,
        .grid-layout * {
            transition: none;
        }
    }
</style>