<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { workspaceStore } from '../stores/workspaceStore.js';
    
    export let module = null;
    export let layoutConfig = {};
    export let isSelected = false;
    export let isDragging = false;
    export let isResizing = false;
    export let viewMode = 'edit'; // 'edit' | 'preview' | 'present'
    export let documentContext = {};
    
    const dispatch = createEventDispatcher();
    
    let containerEl;
    let headerEl;
    let resizeObserver;
    let dragStartPos = { x: 0, y: 0 };
    let resizeStartSize = { w: 0, h: 0 };
    
    // Reactive position e size dal layoutConfig
    $: position = layoutConfig.position || { x: 0, y: 0 };
    $: size = layoutConfig.size || { w: 4, h: 3 };
    $: gridSize = 12; // From workspace layout
    $: cellHeight = 60; // From workspace layout
    
    // Calculate pixel dimensions
    $: pixelWidth = (size.w / gridSize) * 100; // Percentage based
    $: pixelHeight = size.h * cellHeight;
    
    onMount(() => {
        // Setup resize observer per auto-resize content
        if (containerEl) {
            resizeObserver = new ResizeObserver((entries) => {
                // Handle container resize if needed
            });
            resizeObserver.observe(containerEl);
        }
    });
    
    onDestroy(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });
    
    function handleMouseDown(event) {
        if (viewMode !== 'edit') return;
        
        event.preventDefault();
        event.stopPropagation();
        
        workspaceStore.selectModule(module.id);
        
        // Check if it's a resize handle
        if (event.target.classList.contains('resize-handle')) {
            startResize(event);
        } else if (headerEl && headerEl.contains(event.target)) {
            startDrag(event);
        }
    }
    
    function startDrag(event) {
        const rect = containerEl.getBoundingClientRect();
        dragStartPos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        workspaceStore.setDragging(true, module.id);
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    }
    
    function handleDragMove(event) {
        if (!isDragging) return;
        
        const workspaceEl = document.querySelector('.grid-container');
        if (!workspaceEl) return;
        
        const workspaceRect = workspaceEl.getBoundingClientRect();
        const newX = Math.max(0, Math.round((event.clientX - workspaceRect.left - dragStartPos.x) / 100));
        const newY = Math.max(0, Math.round((event.clientY - workspaceRect.top - dragStartPos.y) / cellHeight));
        
        const newPosition = { x: newX, y: newY };
        
        dispatch('update', {
            moduleId: module.id,
            layoutConfig: {
                ...layoutConfig,
                position: newPosition
            }
        });
    }
    
    function handleDragEnd() {
        workspaceStore.setDragging(false);
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    }
    
    function startResize(event) {
        resizeStartSize = { ...size };
        
        workspaceStore.setResizing(true, module.id);
        
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    }
    
    function handleResizeMove(event) {
        if (!isResizing) return;
        
        // Simple resize logic - can be enhanced
        const deltaX = event.movementX;
        const deltaY = event.movementY;
        
        const newW = Math.max(2, size.w + Math.round(deltaX / 50));
        const newH = Math.max(2, size.h + Math.round(deltaY / 30));
        
        const newSize = { w: newW, h: newH };
        
        dispatch('update', {
            moduleId: module.id,
            layoutConfig: {
                ...layoutConfig,
                size: newSize
            }
        });
    }
    
    function handleResizeEnd() {
        workspaceStore.setResizing(false);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    function handleRemove() {
        if (confirm(`Rimuovere il modulo "${module.name || module.type}"?`)) {
            dispatch('remove', { moduleId: module.id });
        }
    }
    
    function handleSettings() {
        // TODO: Open module settings modal
        console.log('🔧 Apri impostazioni modulo:', module.id);
    }
    
    function getModuleDisplayName(module) {
        return module.name || module.type || 'Modulo Senza Nome';
    }
    
    // Handle drop for module palette
    function handleDrop(event) {
        event.preventDefault();
        const moduleTypeData = event.dataTransfer.getData('text/plain');
        if (moduleTypeData) {
            // Module dropped from palette - handled by parent GridLayout
        }
    }
    
    function handleDragOver(event) {
        event.preventDefault();
    }
</script>

<div 
    class="module-container"
    class:selected={isSelected}
    class:dragging={isDragging}
    class:resizing={isResizing}
    class:edit-mode={viewMode === 'edit'}
    style="
        left: {(position.x / gridSize) * 100}%; 
        top: {position.y * cellHeight}px;
        width: {pixelWidth}%;
        height: {pixelHeight}px;
    "
    bind:this={containerEl}
    on:mousedown={handleMouseDown}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
>
    <!-- Module Header -->
    {#if viewMode === 'edit'}
        <div class="module-header" bind:this={headerEl}>
            <div class="module-title">
                <span class="module-icon">🧩</span>
                <span class="module-name">{getModuleDisplayName(module)}</span>
            </div>
            
            <div class="module-actions">
                <button 
                    class="action-btn settings-btn"
                    on:click|stopPropagation={handleSettings}
                    title="Impostazioni"
                >
                    ⚙️
                </button>
                <button 
                    class="action-btn remove-btn"
                    on:click|stopPropagation={handleRemove}
                    title="Rimuovi"
                >
                    ✕
                </button>
            </div>
        </div>
    {/if}
    
    <!-- Module Content -->
    <div class="module-content">
        {#if module}
            <!-- Dynamic module content will be rendered here -->
            <div class="module-placeholder">
                <div class="placeholder-icon">🧩</div>
                <h4>{getModuleDisplayName(module)}</h4>
                <p>Tipo: {module.type}</p>
                <p>Dimensioni: {size.w}×{size.h}</p>
                {#if module.config}
                    <details>
                        <summary>Configurazione</summary>
                        <pre>{JSON.stringify(module.config, null, 2)}</pre>
                    </details>
                {/if}
            </div>
        {:else}
            <div class="module-error">
                <p>❌ Modulo non disponibile</p>
            </div>
        {/if}
    </div>
    
    <!-- Resize Handle -->
    {#if viewMode === 'edit' && isSelected}
        <div class="resize-handle"></div>
    {/if}
    
    <!-- Selection Outline -->
    {#if isSelected && viewMode === 'edit'}
        <div class="selection-outline"></div>
    {/if}
</div>

<style>
    .module-container {
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.2s ease;
        cursor: default;
        z-index: 1;
    }
    
    .module-container:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .module-container.selected {
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        z-index: 10;
    }
    
    .module-container.dragging {
        transform: rotate(2deg);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 100;
        cursor: grabbing;
    }
    
    .module-container.resizing {
        z-index: 50;
    }
    
    .module-container.edit-mode .module-header {
        cursor: grab;
    }
    
    .module-container.edit-mode .module-header:active {
        cursor: grabbing;
    }
    
    .module-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        min-height: 40px;
        user-select: none;
    }
    
    .module-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
    }
    
    .module-icon {
        font-size: 1.1em;
        flex-shrink: 0;
    }
    
    .module-name {
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.9em;
    }
    
    .module-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }
    
    .action-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8em;
        transition: background 0.2s;
    }
    
    .action-btn:hover {
        background: #e9ecef;
    }
    
    .remove-btn:hover {
        background: #f8d7da;
        color: #721c24;
    }
    
    .module-content {
        flex: 1;
        overflow: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
    }
    
    .module-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #666;
        height: 100%;
        min-height: 100px;
    }
    
    .placeholder-icon {
        font-size: 2em;
        margin-bottom: 10px;
        opacity: 0.5;
    }
    
    .module-placeholder h4 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 1.1em;
    }
    
    .module-placeholder p {
        margin: 4px 0;
        font-size: 0.9em;
    }
    
    .module-placeholder details {
        margin-top: 10px;
        font-size: 0.8em;
        text-align: left;
        max-width: 100%;
    }
    
    .module-placeholder pre {
        background: #f8f9fa;
        padding: 8px;
        border-radius: 4px;
        font-size: 0.7em;
        overflow: auto;
        max-height: 100px;
    }
    
    .module-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #dc3545;
        text-align: center;
    }
    
    .resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 16px;
        height: 16px;
        background: #007bff;
        border-top-left-radius: 4px;
        cursor: nw-resize;
        opacity: 0.7;
    }
    
    .resize-handle:hover {
        opacity: 1;
    }
    
    .selection-outline {
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px solid #007bff;
        border-radius: 10px;
        pointer-events: none;
        opacity: 0.8;
    }
    
    /* Different view modes */
    .module-container:not(.edit-mode) {
        cursor: default;
    }
    
    .module-container:not(.edit-mode) .module-header {
        display: none;
    }
    
    .module-container:not(.edit-mode) .module-content {
        padding: 0;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .module-header {
            padding: 6px 8px;
            min-height: 36px;
        }
        
        .module-name {
            font-size: 0.85em;
        }
        
        .action-btn {
            width: 20px;
            height: 20px;
            font-size: 0.7em;
        }
        
        .module-content {
            padding: 8px;
        }
    }
</style>