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
  
  // Grid settings
  const gridSize = 25
  const showGrid = true
  
  function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize
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
      }
      if (direction.includes('left')) {
        newWidth = snapToGrid(startWidth - deltaX)
        newX = snapToGrid(startBlockX + deltaX)
      }
      
      // Handle vertical resizing
      if (direction.includes('bottom')) {
        newHeight = snapToGrid(startHeight + deltaY)
      }
      if (direction.includes('top')) {
        newHeight = snapToGrid(startHeight - deltaY)
        newY = snapToGrid(startBlockY + deltaY)
      }
      
      // Apply minimum constraints
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
          class="resize-handle resize-handle-right"
          on:mousedown={(e) => handleResize(e, block, 'right')}
        />
        <div 
          class="resize-handle resize-handle-bottom"
          on:mousedown={(e) => handleResize(e, block, 'bottom')}
        />
        <div 
          class="resize-handle resize-handle-left"
          on:mousedown={(e) => handleResize(e, block, 'left')}
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