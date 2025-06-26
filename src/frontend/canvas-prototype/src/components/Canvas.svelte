<script>
  import { dndzone } from 'svelte-dnd-action'
  import Block from './Block.svelte'
  import { createEventDispatcher } from 'svelte'
  
  export let blocks = []
  
  const dispatch = createEventDispatcher()
  
  let canvasEl
  let isDragging = false
  let currentBlock = null
  let dragOffset = { x: 0, y: 0 }
  let isResizing = false
  let adjacentBlocks = []
  
  // Grid settings
  const gridSize = 25
  const showGrid = true
  const edgeThreshold = 5 // Pixel threshold for edge detection
  
  // Reactive computation of adjacent blocks for each edge
  $: adjacentMap = blocks.reduce((map, block) => {
    map[block.id] = {
      right: findAdjacentBlocks(block, 'right'),
      left: findAdjacentBlocks(block, 'left'),
      bottom: findAdjacentBlocks(block, 'bottom')
    }
    return map
  }, {})
  
  function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize
  }
  
  // Find blocks that share an edge with the given block
  function findAdjacentBlocks(block, edge) {
    const adjacent = []
    
    blocks.forEach(b => {
      if (b.id === block.id) return
      
      switch (edge) {
        case 'right':
          // Check if block's right edge aligns with another block's left edge
          if (Math.abs((block.x + block.width) - b.x) < edgeThreshold) {
            // Check vertical overlap
            const overlapStart = Math.max(block.y, b.y)
            const overlapEnd = Math.min(block.y + block.height, b.y + b.height)
            if (overlapEnd > overlapStart) {
              adjacent.push({ block: b, edge: 'left', overlap: overlapEnd - overlapStart })
            }
          }
          break
          
        case 'left':
          // Check if block's left edge aligns with another block's right edge
          if (Math.abs(block.x - (b.x + b.width)) < edgeThreshold) {
            // Check vertical overlap
            const overlapStart = Math.max(block.y, b.y)
            const overlapEnd = Math.min(block.y + block.height, b.y + b.height)
            if (overlapEnd > overlapStart) {
              adjacent.push({ block: b, edge: 'right', overlap: overlapEnd - overlapStart })
            }
          }
          break
          
        case 'bottom':
          // Check if block's bottom edge aligns with another block's top edge
          if (Math.abs((block.y + block.height) - b.y) < edgeThreshold) {
            // Check horizontal overlap
            const overlapStart = Math.max(block.x, b.x)
            const overlapEnd = Math.min(block.x + block.width, b.x + b.width)
            if (overlapEnd > overlapStart) {
              adjacent.push({ block: b, edge: 'top', overlap: overlapEnd - overlapStart })
            }
          }
          break
      }
    })
    
    return adjacent
  }
  
  function handleMouseDown(event, block) {
    if (event.target.closest('.block-content')) return
    
    isDragging = true
    currentBlock = block
    
    const rect = event.currentTarget.getBoundingClientRect()
    dragOffset = {
      x: event.clientX - block.x,
      y: event.clientY - block.y
    }
    
    dispatch('blockSelect', block)
  }
  
  function handleMouseMove(event) {
    if (!isDragging || !currentBlock) return
    
    const newX = snapToGrid(event.clientX - dragOffset.x)
    const newY = snapToGrid(event.clientY - dragOffset.y)
    
    dispatch('blockUpdate', {
      id: currentBlock.id,
      data: { x: newX, y: newY }
    })
  }
  
  function handleMouseUp() {
    isDragging = false
    currentBlock = null
  }
  
  function handleResize(event, block, direction) {
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = block.width
    const startHeight = block.height
    const startBlockX = block.x
    const startBlockY = block.y
    
    // Find adjacent blocks that should resize together
    isResizing = true
    adjacentBlocks = findAdjacentBlocks(block, direction)
    
    // Store initial state of adjacent blocks
    const adjacentStartStates = adjacentBlocks.map(adj => ({
      block: adj.block,
      edge: adj.edge,
      startWidth: adj.block.width,
      startHeight: adj.block.height,
      startX: adj.block.x,
      startY: adj.block.y
    }))
    
    function onMouseMove(e) {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startBlockX
      let newY = startBlockY
      
      // Handle horizontal resizing
      if (direction.includes('right')) {
        newWidth = snapToGrid(startWidth + deltaX)
        
        // Update adjacent blocks with left edge
        adjacentStartStates.forEach(adj => {
          if (adj.edge === 'left') {
            const adjNewX = snapToGrid(adj.startX + deltaX)
            const adjNewWidth = snapToGrid(adj.startWidth - deltaX)
            
            if (adjNewWidth >= 200) { // Minimum width check
              dispatch('blockUpdate', {
                id: adj.block.id,
                data: { 
                  x: adjNewX,
                  width: adjNewWidth
                }
              })
            }
          }
        })
      }
      
      if (direction.includes('left')) {
        newWidth = snapToGrid(startWidth - deltaX)
        newX = snapToGrid(startBlockX + deltaX)
        
        // Update adjacent blocks with right edge
        adjacentStartStates.forEach(adj => {
          if (adj.edge === 'right') {
            const adjNewWidth = snapToGrid(adj.startWidth + deltaX)
            
            if (adjNewWidth >= 200) { // Minimum width check
              dispatch('blockUpdate', {
                id: adj.block.id,
                data: { 
                  width: adjNewWidth
                }
              })
            }
          }
        })
      }
      
      // Handle vertical resizing
      if (direction.includes('bottom')) {
        newHeight = snapToGrid(startHeight + deltaY)
        
        // Update adjacent blocks with top edge
        adjacentStartStates.forEach(adj => {
          if (adj.edge === 'top') {
            const adjNewY = snapToGrid(adj.startY + deltaY)
            const adjNewHeight = snapToGrid(adj.startHeight - deltaY)
            
            if (adjNewHeight >= 150) { // Minimum height check
              dispatch('blockUpdate', {
                id: adj.block.id,
                data: { 
                  y: adjNewY,
                  height: adjNewHeight
                }
              })
            }
          }
        })
      }
      
      // Apply minimum constraints for main block
      const minWidth = 200
      const minHeight = 150
      
      if (newWidth < minWidth) {
        newWidth = minWidth
        if (direction.includes('left')) {
          newX = startBlockX + startWidth - minWidth
        }
      }
      
      if (newHeight < minHeight) {
        newHeight = minHeight
        if (direction.includes('top')) {
          newY = startBlockY + startHeight - minHeight
        }
      }
      
      dispatch('blockUpdate', {
        id: block.id,
        data: { 
          width: newWidth, 
          height: newHeight,
          x: newX,
          y: newY
        }
      })
    }
    
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      isResizing = false
      adjacentBlocks = []
    }
    
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
</script>

<svelte:window 
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
/>

<div class="canvas" bind:this={canvasEl}>
  {#if showGrid}
    <svg class="grid" width="100%" height="100%">
      <defs>
        <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <circle cx={gridSize/2} cy={gridSize/2} r="1" fill="#ddd" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  {/if}
  
  <div class="blocks-container">
    {#each blocks as block (block.id)}
      <div 
        class="block-wrapper"
        style="transform: translate({block.x}px, {block.y}px); width: {block.width}px; height: {block.height}px;"
        on:mousedown={(e) => handleMouseDown(e, block)}
      >
        <Block {block} />
        
        <!-- Resize handles -->
        <!-- Edges -->
        <div 
          class="resize-handle resize-handle-right {adjacentMap[block.id]?.right?.length > 0 ? 'has-adjacent' : ''}"
          on:mousedown={(e) => handleResize(e, block, 'right')}
          title={adjacentMap[block.id]?.right?.length > 0 ? 'Resize sincronizzato' : ''}
        />
        <div 
          class="resize-handle resize-handle-bottom {adjacentMap[block.id]?.bottom?.length > 0 ? 'has-adjacent' : ''}"
          on:mousedown={(e) => handleResize(e, block, 'bottom')}
          title={adjacentMap[block.id]?.bottom?.length > 0 ? 'Resize sincronizzato' : ''}
        />
        <div 
          class="resize-handle resize-handle-left {adjacentMap[block.id]?.left?.length > 0 ? 'has-adjacent' : ''}"
          on:mousedown={(e) => handleResize(e, block, 'left')}
          title={adjacentMap[block.id]?.left?.length > 0 ? 'Resize sincronizzato' : ''}
        />
        
        <!-- Corners -->
        <div 
          class="resize-handle resize-handle-corner resize-handle-bottom-left"
          on:mousedown={(e) => handleResize(e, block, 'bottom-left')}
        />
        <div 
          class="resize-handle resize-handle-corner resize-handle-bottom-right"
          on:mousedown={(e) => handleResize(e, block, 'bottom-right')}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .canvas {
    position: relative;
    flex: 1;
    background: #fafafa;
    overflow: auto;
  }
  
  .grid {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
  
  .blocks-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 2000px;
    min-height: 2000px;
  }
  
  .block-wrapper {
    position: absolute;
    cursor: move;
    user-select: none;
  }
  
  .resize-handle {
    position: absolute;
    background: #3b82f6;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .block-wrapper:hover .resize-handle {
    opacity: 0.5;
  }
  
  .resize-handle:hover {
    opacity: 1 !important;
  }
  
  /* Synchronized resize indicator */
  .resize-handle.has-adjacent {
    background: #10b981;
  }
  
  .resize-handle.has-adjacent:hover {
    background: #059669;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }
  
  .block-wrapper:hover .resize-handle.has-adjacent {
    opacity: 0.7;
  }
  
  /* Edge handles */
  .resize-handle-right {
    right: -4px;
    top: 20%;
    width: 8px;
    height: 60%;
    cursor: ew-resize;
  }
  
  .resize-handle-bottom {
    bottom: -4px;
    left: 20%;
    width: 60%;
    height: 8px;
    cursor: ns-resize;
  }
  
  .resize-handle-left {
    left: -4px;
    top: 20%;
    width: 8px;
    height: 60%;
    cursor: ew-resize;
  }
  
  /* Corner handles */
  .resize-handle-corner {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  
  .resize-handle-bottom-left {
    bottom: -4px;
    left: -4px;
    cursor: sw-resize;
  }
  
  .resize-handle-bottom-right {
    bottom: -4px;
    right: -4px;
    cursor: se-resize;
  }
</style>