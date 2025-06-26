import { writable, derived, get } from 'svelte/store'
import LayoutStorage from '../services/LayoutStorage.js'

// Store principale per i blocchi
export const blocks = writable([])

// Store per il blocco selezionato
export const selectedBlockId = writable(null)

// Store derivato per ottenere il blocco selezionato
export const selectedBlock = derived(
  [blocks, selectedBlockId],
  ([$blocks, $selectedBlockId]) => {
    return $blocks.find(block => block.id === $selectedBlockId) || null
  }
)

// Store per la connessione WebSocket
export const wsConnection = writable(null)
export const wsStatus = writable('disconnected')

// Funzioni helper per manipolare i blocchi
export function addBlock(block) {
  blocks.update(b => [...b, block])
}

export function updateBlock(id, updates) {
  blocks.update(b => 
    b.map(block => block.id === id ? { ...block, ...updates } : block)
  )
}

export function removeBlock(id) {
  blocks.update(b => b.filter(block => block.id !== id))
}

export function moveBlock(id, x, y) {
  updateBlock(id, { x, y })
}

export function resizeBlock(id, width, height) {
  updateBlock(id, { width, height })
}

// WebSocket integration
export function initWebSocket() {
  const ws = new WebSocket('ws://localhost:3000')
  
  ws.onopen = () => {
    wsStatus.set('connected')
    wsConnection.set(ws)
    console.log('WebSocket connected')
    
    // Sottoscrivi agli eventi del documento
    ws.send(JSON.stringify({
      type: 'subscribe',
      pattern: {
        entityType: 'CanvasDocument'
      }
    }))
  }
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    handleWebSocketMessage(data)
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    wsStatus.set('error')
  }
  
  ws.onclose = () => {
    wsStatus.set('disconnected')
    wsConnection.set(null)
    // Riconnetti dopo 3 secondi
    setTimeout(initWebSocket, 3000)
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'block-added':
      addBlock(data.block)
      break
    case 'block-updated':
      updateBlock(data.blockId, data.updates)
      break
    case 'block-removed':
      removeBlock(data.blockId)
      break
    case 'blocks-sync':
      blocks.set(data.blocks)
      break
  }
}

// Layout Management Functions

// Store for layout management UI state
export const savedLayouts = writable([])
export const currentLayoutId = writable(null)
export const layoutSaveModalOpen = writable(false)
export const layoutLoadModalOpen = writable(false)

/**
 * Save current canvas as a named layout
 */
export function saveCurrentLayout(name, description) {
  const currentBlocks = get(blocks)
  
  if (!currentBlocks.length) {
    throw new Error('Cannot save empty canvas')
  }
  
  try {
    const layoutId = LayoutStorage.saveLayout({
      name,
      description,
      blocks: currentBlocks,
      metadata: {
        createdAt: Date.now(),
        source: 'canvas-prototype'
      }
    })
    
    // Update layouts list
    refreshLayoutsList()
    currentLayoutId.set(layoutId)
    
    console.log(`Layout "${name}" saved successfully`)
    return layoutId
  } catch (error) {
    console.error('Failed to save layout:', error)
    throw error
  }
}

/**
 * Load a layout by ID
 */
export function loadLayout(layoutId) {
  try {
    const layout = LayoutStorage.loadLayout(layoutId)
    
    if (!layout) {
      throw new Error('Layout not found')
    }
    
    // Update blocks store
    blocks.set(layout.blocks)
    currentLayoutId.set(layoutId)
    
    console.log(`Layout "${layout.name}" loaded successfully`)
    return layout
  } catch (error) {
    console.error('Failed to load layout:', error)
    throw error
  }
}

/**
 * Delete a saved layout
 */
export function deleteLayout(layoutId) {
  try {
    const success = LayoutStorage.deleteLayout(layoutId)
    
    if (success) {
      refreshLayoutsList()
      
      // Clear current layout ID if it was deleted
      if (get(currentLayoutId) === layoutId) {
        currentLayoutId.set(null)
      }
      
      console.log('Layout deleted successfully')
    }
    
    return success
  } catch (error) {
    console.error('Failed to delete layout:', error)
    return false
  }
}

/**
 * Get all saved layouts for UI display
 */
export function refreshLayoutsList() {
  const layouts = LayoutStorage.getLayoutList()
  savedLayouts.set(layouts)
  return layouts
}

/**
 * Quick save with auto-generated name
 */
export function quickSaveLayout() {
  const timestamp = new Date().toLocaleString()
  const name = `Quick Save ${timestamp}`
  
  return saveCurrentLayout(name, 'Auto-saved layout')
}

/**
 * Create a new empty canvas
 */
export function newCanvas() {
  blocks.set([])
  currentLayoutId.set(null)
}

/**
 * Duplicate current layout with new name
 */
export function duplicateCurrentLayout(newName) {
  const currentBlocks = get(blocks)
  
  if (!currentBlocks.length) {
    throw new Error('No layout to duplicate')
  }
  
  // Generate new IDs for all blocks to avoid conflicts
  const duplicatedBlocks = currentBlocks.map(block => ({
    ...block,
    id: `${block.id}_copy_${Date.now()}`
  }))
  
  return LayoutStorage.saveLayout({
    name: newName,
    description: 'Duplicated layout',
    blocks: duplicatedBlocks,
    metadata: {
      createdAt: Date.now(),
      source: 'duplicate',
      originalLayout: get(currentLayoutId)
    }
  })
}

/**
 * Check if current canvas has unsaved changes
 */
export function hasUnsavedChanges() {
  const currentLayoutIdValue = get(currentLayoutId)
  
  if (!currentLayoutIdValue) {
    return get(blocks).length > 0
  }
  
  const savedLayout = LayoutStorage.loadLayout(currentLayoutIdValue)
  if (!savedLayout) {
    return true
  }
  
  const currentBlocks = get(blocks)
  return JSON.stringify(currentBlocks) !== JSON.stringify(savedLayout.blocks)
}

/**
 * Export layout to file
 */
export function exportLayout(layoutId) {
  try {
    const jsonData = LayoutStorage.exportLayout(layoutId)
    const layout = LayoutStorage.loadLayout(layoutId)
    
    // Create and trigger download
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${layout.name.replace(/[^a-z0-9]/gi, '_')}_layout.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export layout:', error)
    throw error
  }
}

/**
 * Import layout from file
 */
export function importLayoutFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const layoutId = LayoutStorage.importLayout(e.target.result)
        refreshLayoutsList()
        resolve(layoutId)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Initialize default templates
 */
export function initializeTemplates() {
  LayoutStorage.createDefaultTemplates()
  refreshLayoutsList()
}

// Initialize layouts list on module load
refreshLayoutsList()

// Funzione per salvare lo stato sul server (legacy)
export async function saveCanvas() {
  const currentBlocks = get(blocks)
  
  try {
    const response = await fetch('/api/canvas/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: 'canvas-' + Date.now(),
        blocks: currentBlocks
      })
    })
    
    if (response.ok) {
      console.log('Canvas saved successfully')
    }
  } catch (error) {
    console.error('Error saving canvas:', error)
  }
}