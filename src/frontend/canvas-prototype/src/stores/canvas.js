import { writable, derived, get } from 'svelte/store'
import LayoutStorage from '../services/LayoutStorage.js'
import ModuleInstanceService from '../services/ModuleInstanceService.js'
import CanvasBackendService from '../services/CanvasBackendService.js'

// Initialize services
const moduleInstanceService = new ModuleInstanceService()
const canvasBackendService = new CanvasBackendService()

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

// Store for backend sync status
export const backendSyncEnabled = writable(true) // Always enabled now
export const backendSyncStatus = writable('synced') // 'synced', 'pending', 'error'
export const currentDocumentId = writable(null) // Current CompositeDocument ID
export const documentMode = writable('localStorage') // 'localStorage' or 'backend'
export const canvasDocuments = writable([]) // Available canvas documents

// Funzioni helper per manipolare i blocchi
export async function addBlock(block) {
  // Add block to local store first
  blocks.update(b => [...b, block])
  
  // Mark as pending sync when new block is added
  backendSyncStatus.set('pending')
  
  const mode = get(documentMode)
  
  // If backend sync is enabled, handle based on mode
  if (get(backendSyncEnabled)) {
    if (mode === 'backend') {
      // Backend mode: create ModuleInstance and add to document
      try {
        const moduleInstance = await moduleInstanceService.createModuleInstance(block)
        moduleInstanceService.createBlockMapping(block.id, moduleInstance.id)
        
        // Update block with instance ID (relation created during canvas save)
        updateBlock(block.id, { instanceId: moduleInstance.id })
        
        console.log('✅ Backend mode: Block created with ModuleInstance:', block.id, '->', moduleInstance.id)
      } catch (error) {
        console.error('❌ Failed to add block to backend document:', error)
      }
    } else {
      // LocalStorage mode: create standalone ModuleInstance
      try {
        const moduleInstance = await moduleInstanceService.createModuleInstance(block)
        moduleInstanceService.createBlockMapping(block.id, moduleInstance.id)
        updateBlock(block.id, { instanceId: moduleInstance.id })
        
        console.log('✅ LocalStorage mode: Block synced with backend:', block.id, '->', moduleInstance.id)
      } catch (error) {
        console.error('❌ Failed to sync block with backend:', error)
      }
    }
  }
}

// Note: Module-Document relations are now created automatically during canvas save

export async function updateBlock(id, updates) {
  // Update local store only - no automatic backend sync
  blocks.update(b => 
    b.map(block => block.id === id ? { ...block, ...updates } : block)
  )
  
  // Mark as pending sync
  backendSyncStatus.set('pending')
}

// Sync all blocks to backend - behavior depends on mode
export async function syncAllBlocksToBackend() {
  if (!get(backendSyncEnabled)) {
    console.log('Backend sync is disabled')
    return false
  }
  
  const currentBlocks = get(blocks)
  const mode = get(documentMode)
  const docId = get(currentDocumentId)
  let syncedCount = 0
  let errorCount = 0
  
  console.log(`🔍 Syncing all blocks to backend (${mode} mode):`, currentBlocks.length)
  
  if (mode === 'backend' && docId) {
    // Backend mode: sync canvas positions to document and update existing ModuleInstances
    try {
      // Save canvas layout to document
      await canvasBackendService.setCurrentDocument(docId)
      await canvasBackendService.saveCanvas({
        blocks: currentBlocks,
        gridSize: 25,
        metadata: {
          syncedAt: new Date().toISOString()
        }
      })
      
      // Update positions of existing ModuleInstances
      for (const block of currentBlocks) {
        if (block.instanceId) {
          try {
            await moduleInstanceService.syncCanvasMetadata(block.instanceId, {
              x: block.x,
              y: block.y,
              width: block.width,
              height: block.height
            })
            syncedCount++
          } catch (error) {
            console.error(`❌ Failed to sync existing instance ${block.instanceId}:`, error)
            errorCount++
          }
        }
      }
      
      console.log(`✅ Backend mode: synced positions for ${syncedCount} existing ModuleInstances`)
    } catch (error) {
      console.error('❌ Failed to sync to backend document:', error)
      errorCount++
    }
  } else {
    // LocalStorage mode: create new instances if needed
    for (const block of currentBlocks) {
      try {
        if (block.instanceId) {
          // Update existing instance
          await moduleInstanceService.syncCanvasMetadata(block.instanceId, {
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height
          })
          console.log(`✅ Updated existing instance for block ${block.id}`)
        } else {
          // Create new instance for block without one (localStorage mode)
          const moduleInstance = await moduleInstanceService.createModuleInstance(block)
          moduleInstanceService.createBlockMapping(block.id, moduleInstance.id)
          
          // Update block with instance ID in local store
          blocks.update(items => 
            items.map(b => b.id === block.id ? { ...b, instanceId: moduleInstance.id } : b)
          )
          
          console.log(`✅ Created new instance for block ${block.id} -> ${moduleInstance.id}`)
        }
        syncedCount++
      } catch (error) {
        console.error(`❌ Failed to sync block ${block.id}:`, error)
        errorCount++
      }
    }
  }
  
  console.log(`✅ Synced ${syncedCount}/${currentBlocks.length} blocks to backend`)
  
  // Update sync status
  if (errorCount === 0) {
    backendSyncStatus.set('synced')
  } else {
    backendSyncStatus.set('error')
  }
  
  return errorCount === 0
}

export async function removeBlock(id) {
  // If backend sync is enabled, delete ModuleInstance first
  if (get(backendSyncEnabled)) {
    const currentBlocks = get(blocks)
    const block = currentBlocks.find(b => b.id === id)
    
    if (block && block.instanceId) {
      try {
        await moduleInstanceService.deleteModuleInstance(block.instanceId)
        moduleInstanceService.removeBlockMapping(id)
        console.log('✅ ModuleInstance deleted:', block.instanceId)
      } catch (error) {
        console.error('❌ Failed to delete ModuleInstance:', error)
        // Optionally prevent local deletion if backend fails
        // return
      }
    }
  }
  
  // Remove from local store
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
    
    // Subscribe to ModuleInstance events
    ws.send(JSON.stringify({
      type: 'subscribe',
      pattern: {
        entityType: 'ModuleInstance'
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
    
    // Handle ModuleInstance WebSocket events
    case 'module-instance-created':
      console.log('📥 ModuleInstance created:', data.data.instance)
      // Could update local blocks if needed
      break
      
    case 'module-instance-updated':
      // Skip WebSocket updates to prevent loops
      // Canvas position is now only synced manually on save
      console.log('📥 ModuleInstance updated (position sync skipped):', data.data.instance)
      break
      
    case 'module-instance-deleted':
      console.log('📥 ModuleInstance deleted:', data.data.instanceId)
      // Remove local block if it exists
      const deletedInstanceId = data.data.instanceId
      const allMappings = moduleInstanceService.getBlockMappings()
      const deletedBlockId = Object.keys(allMappings).find(key => allMappings[key] === deletedInstanceId)
      
      if (deletedBlockId) {
        removeBlock(deletedBlockId)
      }
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
 * Save current canvas as a named layout - salva direttamente nel backend
 */
export async function saveCurrentLayout(name, description) {
  const currentBlocks = get(blocks)
  
  if (!currentBlocks.length) {
    throw new Error('Cannot save empty canvas')
  }
  
  try {
    // Crea CompositeDocument nel backend
    const document = await canvasBackendService.createCanvasDocument({
      name,
      description: description || 'Layout canvas salvato',
      ownerId: 'default-user' // TODO: Get from auth
    })
    
    // Switch to backend mode immediately per abilitare creazione ModuleInstance
    documentMode.set('backend')
    currentDocumentId.set(document.id)
    
    // Crea ModuleInstance solo per blocchi che non ne hanno già uno
    const blocksWithInstances = []
    for (const block of currentBlocks) {
      try {
        if (block.instanceId) {
          // Il blocco ha già un ModuleInstance, riutilizzalo
          blocksWithInstances.push(block)
          console.log(`♻️ ModuleInstance esistente riutilizzato per blocco ${block.id} -> ${block.instanceId}`)
        } else {
          // Crea nuovo ModuleInstance solo se necessario
          const moduleInstance = await moduleInstanceService.createModuleInstance(block)
          moduleInstanceService.createBlockMapping(block.id, moduleInstance.id)
          
          // Aggiorna il blocco con instanceId
          const blockWithInstance = { ...block, instanceId: moduleInstance.id }
          blocksWithInstances.push(blockWithInstance)
          
          console.log(`✅ Nuovo ModuleInstance creato per blocco ${block.id} -> ${moduleInstance.id}`)
        }
      } catch (error) {
        console.error(`❌ Errore gestione ModuleInstance per blocco ${block.id}:`, error)
        // Mantieni il blocco senza instanceId se la creazione fallisce
        blocksWithInstances.push(block)
      }
    }
    
    // Aggiorna lo store con i blocchi che hanno instanceId
    blocks.set(blocksWithInstances)
    
    // Ora salva canvas con i blocchi che hanno instanceId
    await canvasBackendService.saveCanvas({
      blocks: blocksWithInstances,
      gridSize: 25,
      metadata: {
        createdAt: Date.now(),
        source: 'canvas-prototype'
      }
    })
    
    currentLayoutId.set(document.id)
    backendSyncStatus.set('synced')
    
    // Update documents list
    await refreshCanvasDocuments()
    
    console.log(`Layout "${name}" saved as backend document: ${document.id} with ${blocksWithInstances.filter(b => b.instanceId).length} ModuleInstance`)
    return document.id
  } catch (error) {
    console.error('Failed to save layout to backend:', error)
    throw error
  }
}

/**
 * Load a layout by ID - carica sempre dal backend
 */
export async function loadLayout(layoutId) {
  try {
    // Carica sempre dal backend CompositeDocument
    const layout = await loadCanvasDocument(layoutId)
    
    // Set current layout ID
    currentLayoutId.set(layoutId)
    
    console.log(`Backend layout "${layout.documentName}" loaded successfully`)
    return layout
  } catch (error) {
    console.error('Failed to load layout:', error)
    throw error
  }
}

/**
 * Delete a saved layout - elimina sempre dal backend
 */
export async function deleteLayout(layoutId) {
  try {
    // Elimina sempre dal backend CompositeDocument
    await deleteCanvasDocument(layoutId)
    
    // Clear current layout ID if it was deleted
    if (get(currentLayoutId) === layoutId) {
      currentLayoutId.set(null)
      currentDocumentId.set(null)
      // Switch back to localStorage mode when no document selected
      documentMode.set('localStorage')
    }
    
    console.log('Backend document deleted successfully')
    return true
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
 * Quick save with auto-generated name (backend or localStorage)
 */
export async function quickSaveLayout() {
  const mode = get(documentMode)
  const currentBlocks = get(blocks)
  
  if (mode === 'backend') {
    // Save to backend via CompositeDocument
    const docId = get(currentDocumentId)
    if (!docId) {
      throw new Error('Nessun documento selezionato per il salvataggio backend')
    }
    
    try {
      await canvasBackendService.setCurrentDocument(docId)
      const result = await canvasBackendService.saveCanvas({
        blocks: currentBlocks,
        gridSize: 25,
        metadata: {
          quickSave: true,
          timestamp: Date.now()
        }
      })
      
      console.log('✅ Canvas salvato nel documento backend:', docId)
      return docId
    } catch (error) {
      console.error('❌ Errore salvataggio backend:', error)
      throw error
    }
  } else {
    // Save to localStorage (original behavior)
    const timestamp = new Date().toLocaleString()
    const name = `Quick Save ${timestamp}`
    return saveCurrentLayout(name, 'Auto-saved layout')
  }
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

// ===== HELPER FUNCTIONS FOR LAYOUT LOADING/DELETION =====

/**
 * Clear block mappings when switching between layouts (localStorage mode only)
 */
async function clearExistingMappings() {
  const mode = get(documentMode)
  
  if (mode === 'backend') {
    // In backend mode, we reuse existing ModuleInstances - no clearing needed
    console.log('🔄 Backend mode: reusing existing ModuleInstances')
    return
  }
  
  if (!get(backendSyncEnabled)) {
    return
  }
  
  const currentBlocks = get(blocks)
  
  // Only clear mappings, not the actual instances (they might be used elsewhere)
  for (const block of currentBlocks) {
    if (block.instanceId) {
      moduleInstanceService.removeBlockMapping(block.id)
      console.log('🧹 Cleared block mapping:', block.id)
    }
  }
}

/**
 * Clean up backend instances associated with a layout
 */
async function cleanupBackendInstancesForLayout(layoutId) {
  if (!get(backendSyncEnabled)) {
    return
  }
  
  try {
    // Get block mappings for this layout
    const allMappings = moduleInstanceService.getBlockMappings()
    const layout = LayoutStorage.loadLayout(layoutId)
    
    if (layout && layout.blocks) {
      for (const block of layout.blocks) {
        const instanceId = allMappings[block.id]
        if (instanceId) {
          try {
            await moduleInstanceService.deleteModuleInstance(instanceId)
            moduleInstanceService.removeBlockMapping(block.id)
            console.log('🧹 Cleaned up backend instance for deleted layout:', instanceId)
          } catch (error) {
            console.warn('⚠️ Failed to cleanup backend instance:', error)
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Error during backend cleanup:', error)
  }
}

// ===== DOCUMENT MANAGEMENT FUNCTIONS =====

/**
 * Create a new canvas document in backend
 */
export async function createCanvasDocument(documentData) {
  try {
    const document = await canvasBackendService.createCanvasDocument({
      name: documentData.name,
      description: documentData.description,
      ownerId: documentData.ownerId || 'default-user', // TODO: Get from auth
      projectId: documentData.projectId
    })
    
    // Switch to backend mode and set current document
    documentMode.set('backend')
    currentDocumentId.set(document.id)
    
    // Refresh documents list
    await refreshCanvasDocuments()
    
    console.log('📄 Nuovo documento canvas creato:', document.id)
    return document
  } catch (error) {
    console.error('❌ Errore creazione documento canvas:', error)
    throw error
  }
}

/**
 * Load canvas from backend document - legge canvasLayout e posiziona i blocchi
 */
export async function loadCanvasDocument(documentId) {
  try {
    canvasBackendService.setCurrentDocument(documentId)
    const result = await canvasBackendService.loadCanvas()
    
    const canvasLayout = result.canvasLayout || { blocks: [] }
    
    console.log('🔧 CanvasLayout received:', canvasLayout)
    
    // Il canvasLayout contiene già tutti i dati necessari inclusi instanceId
    const canvasBlocks = Array.isArray(canvasLayout.blocks) ? canvasLayout.blocks : []
    
    // Crea blocchi canvas dal layout salvato - instanceId è già presente
    const blocksWithInstances = canvasBlocks.map(block => {
      // Se il blocco ha instanceId, crea il mapping
      if (block.instanceId) {
        moduleInstanceService.createBlockMapping(block.id, block.instanceId)
      }
      
      return {
        id: block.id || `block-${Date.now()}`,
        x: block.x || 0,
        y: block.y || 0,
        width: block.width || 300,
        height: block.height || 200,
        title: block.title || 'Untitled',
        type: block.type || 'container',
        content: Array.isArray(block.content) ? block.content : [],
        instanceId: block.instanceId || null
      }
    })
    
    console.log('🔧 Blocks processed:', blocksWithInstances.length, blocksWithInstances)
    
    // Update stores - ensure it's always an array
    blocks.set(Array.isArray(blocksWithInstances) ? blocksWithInstances : [])
    currentDocumentId.set(documentId)
    documentMode.set('backend')
    backendSyncStatus.set('synced')
    
    console.log(`📂 Canvas documento caricato: ${documentId} con ${canvasBlocks.length} blocchi dal layout`)
    return {
      ...result,
      blocksLoaded: canvasBlocks.length
    }
  } catch (error) {
    console.error('❌ Errore caricamento documento canvas:', error)
    throw error
  }
}


/**
 * Switch between localStorage and backend mode
 */
export function switchDocumentMode(mode) {
  if (mode === 'localStorage') {
    documentMode.set('localStorage')
    currentDocumentId.set(null)
    console.log('🔄 Modalità: localStorage')
  } else if (mode === 'backend') {
    documentMode.set('backend')
    console.log('🔄 Modalità: backend')
  }
}

/**
 * List available canvas documents
 */
export async function refreshCanvasDocuments() {
  try {
    const documents = await canvasBackendService.listCanvasDocuments()
    canvasDocuments.set(documents)
    console.log('📋 Documenti canvas aggiornati:', documents.length)
    return documents
  } catch (error) {
    console.error('❌ Errore recupero documenti canvas:', error)
    canvasDocuments.set([])
    return []
  }
}

/**
 * Delete a canvas document
 */
export async function deleteCanvasDocument(documentId) {
  try {
    await canvasBackendService.deleteCanvasDocument(documentId)
    
    // If it was the current document, switch to localStorage mode
    if (get(currentDocumentId) === documentId) {
      switchDocumentMode('localStorage')
      newCanvas()
    }
    
    // Refresh documents list
    await refreshCanvasDocuments()
    
    console.log('🗑️ Documento canvas eliminato:', documentId)
    return true
  } catch (error) {
    console.error('❌ Errore eliminazione documento canvas:', error)
    throw error
  }
}

/**
 * Migrate existing localStorage layouts to backend documents
 */
export async function migrateLayoutsToBackend(ownerId) {
  try {
    const migratedDocuments = await canvasBackendService.migrateFromLocalStorage(ownerId)
    
    // Refresh documents list
    await refreshCanvasDocuments()
    
    console.log('🔄 Migrazione completata:', migratedDocuments.length, 'documenti')
    return migratedDocuments
  } catch (error) {
    console.error('❌ Errore migrazione a backend:', error)
    throw error
  }
}

// ===== BACKEND DOCUMENT MODE FUNCTIONS =====

/**
 * Get current layouts list - carica sempre dal backend
 */
export async function getCurrentLayoutsList() {
  // Carica sempre dal backend canvas documents
  await refreshCanvasDocuments()
  return get(canvasDocuments)
}

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