/**
 * LayoutStorage - Service for managing canvas layout persistence
 * Uses localStorage with fallback and future backend API integration
 */

const STORAGE_KEY = 'ssot-canvas-layouts'
const CURRENT_VERSION = '1.0'

export class LayoutStorage {
  
  /**
   * Save a layout to storage
   * @param {Object} layout - Layout object with name, description, blocks
   * @returns {string} - Generated layout ID
   */
  static saveLayout(layout) {
    const layouts = this.getAllLayouts()
    
    const layoutData = {
      id: layout.id || this.generateId(),
      name: layout.name,
      description: layout.description || '',
      blocks: layout.blocks,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
      metadata: {
        blockCount: layout.blocks.length,
        canvasSize: this.calculateCanvasSize(layout.blocks),
        ...layout.metadata
      }
    }
    
    layouts[layoutData.id] = layoutData
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
      return layoutData.id
    } catch (error) {
      console.error('Failed to save layout:', error)
      throw new Error('Storage full or not available')
    }
  }
  
  /**
   * Load a layout by ID
   * @param {string} layoutId - Layout ID to load
   * @returns {Object|null} - Layout object or null if not found
   */
  static loadLayout(layoutId) {
    const layouts = this.getAllLayouts()
    const layout = layouts[layoutId]
    
    if (!layout) {
      console.warn(`Layout ${layoutId} not found`)
      return null
    }
    
    // Validate layout structure
    if (!this.validateLayout(layout)) {
      console.error('Invalid layout structure:', layout)
      return null
    }
    
    return layout
  }
  
  /**
   * Delete a layout by ID
   * @param {string} layoutId - Layout ID to delete
   * @returns {boolean} - Success status
   */
  static deleteLayout(layoutId) {
    const layouts = this.getAllLayouts()
    
    if (!layouts[layoutId]) {
      return false
    }
    
    delete layouts[layoutId]
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
      return true
    } catch (error) {
      console.error('Failed to delete layout:', error)
      return false
    }
  }
  
  /**
   * Get all saved layouts
   * @returns {Object} - Object with layout ID as key and layout data as value
   */
  static getAllLayouts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to load layouts:', error)
      return {}
    }
  }
  
  /**
   * Get list of layouts for UI display
   * @returns {Array} - Array of layout objects sorted by timestamp
   */
  static getLayoutList() {
    const layouts = this.getAllLayouts()
    
    return Object.values(layouts)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(layout => ({
        id: layout.id,
        name: layout.name,
        description: layout.description,
        timestamp: layout.timestamp,
        blockCount: layout.metadata?.blockCount || layout.blocks.length,
        preview: this.generatePreview(layout.blocks)
      }))
  }
  
  /**
   * Check if layout name already exists
   * @param {string} name - Layout name to check
   * @returns {boolean} - True if name exists
   */
  static layoutNameExists(name) {
    const layouts = this.getAllLayouts()
    return Object.values(layouts).some(layout => layout.name === name)
  }
  
  /**
   * Export layout to JSON file
   * @param {string} layoutId - Layout ID to export
   * @returns {string} - JSON string for download
   */
  static exportLayout(layoutId) {
    const layout = this.loadLayout(layoutId)
    if (!layout) {
      throw new Error('Layout not found')
    }
    
    return JSON.stringify({
      ssotCanvas: true,
      version: CURRENT_VERSION,
      exportedAt: Date.now(),
      layout: layout
    }, null, 2)
  }
  
  /**
   * Import layout from JSON
   * @param {string} jsonString - JSON string to import
   * @returns {string} - Imported layout ID
   */
  static importLayout(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      
      if (!data.ssotCanvas || !data.layout) {
        throw new Error('Invalid layout file format')
      }
      
      const layout = data.layout
      layout.id = this.generateId() // Generate new ID to avoid conflicts
      layout.name = this.getUniqueLayoutName(layout.name)
      
      return this.saveLayout(layout)
    } catch (error) {
      console.error('Failed to import layout:', error)
      throw new Error('Invalid layout file')
    }
  }
  
  /**
   * Get storage usage stats
   * @returns {Object} - Storage statistics
   */
  static getStorageStats() {
    const layouts = this.getAllLayouts()
    const layoutCount = Object.keys(layouts).length
    const storageSize = localStorage.getItem(STORAGE_KEY)?.length || 0
    
    return {
      layoutCount,
      storageSize,
      storageSizeKB: Math.round(storageSize / 1024 * 100) / 100,
      estimatedMaxLayouts: Math.floor((5 * 1024 * 1024) / (storageSize / layoutCount || 1))
    }
  }
  
  // Private helper methods
  
  static generateId() {
    return 'layout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
  
  static calculateCanvasSize(blocks) {
    if (!blocks.length) return { width: 0, height: 0 }
    
    let maxX = 0, maxY = 0
    
    blocks.forEach(block => {
      const rightEdge = block.x + block.width
      const bottomEdge = block.y + block.height
      
      if (rightEdge > maxX) maxX = rightEdge
      if (bottomEdge > maxY) maxY = bottomEdge
    })
    
    return { width: maxX, height: maxY }
  }
  
  static validateLayout(layout) {
    return layout &&
           typeof layout.id === 'string' &&
           typeof layout.name === 'string' &&
           Array.isArray(layout.blocks) &&
           layout.blocks.every(block => 
             block.id && 
             typeof block.x === 'number' && 
             typeof block.y === 'number' &&
             typeof block.width === 'number' &&
             typeof block.height === 'number'
           )
  }
  
  static generatePreview(blocks) {
    // Generate a simple preview representation
    return blocks.map(block => ({
      x: Math.round(block.x / 50), // Simplified coordinates
      y: Math.round(block.y / 50),
      w: Math.round(block.width / 50),
      h: Math.round(block.height / 50),
      type: block.type
    }))
  }
  
  static getUniqueLayoutName(baseName) {
    const layouts = this.getAllLayouts()
    const existingNames = Object.values(layouts).map(l => l.name)
    
    if (!existingNames.includes(baseName)) {
      return baseName
    }
    
    let counter = 1
    let newName = `${baseName} (${counter})`
    
    while (existingNames.includes(newName)) {
      counter++
      newName = `${baseName} (${counter})`
    }
    
    return newName
  }
  
  /**
   * Create predefined templates
   * @returns {Array} - Array of template layouts
   */
  static createDefaultTemplates() {
    const templates = [
      {
        name: 'Dashboard Basic',
        description: 'Layout base con sidebar e area principale',
        blocks: [
          { id: 'template1_sidebar', type: 'container', title: 'Menu', x: 50, y: 50, width: 250, height: 400, content: [] },
          { id: 'template1_main', type: 'container', title: 'Contenuto Principale', x: 350, y: 50, width: 500, height: 400, content: [] }
        ]
      },
      {
        name: 'Monitor Wall',
        description: 'Layout a griglia per monitoring multipli',
        blocks: [
          { id: 'template2_1', type: 'container', title: 'Monitor 1', x: 50, y: 50, width: 300, height: 200, content: [] },
          { id: 'template2_2', type: 'container', title: 'Monitor 2', x: 400, y: 50, width: 300, height: 200, content: [] },
          { id: 'template2_3', type: 'container', title: 'Monitor 3', x: 50, y: 300, width: 300, height: 200, content: [] },
          { id: 'template2_4', type: 'container', title: 'Monitor 4', x: 400, y: 300, width: 300, height: 200, content: [] }
        ]
      },
      {
        name: 'Workflow Kanban',
        description: 'Layout per gestione task in colonne',
        blocks: [
          { id: 'template3_todo', type: 'container', title: 'To Do', x: 50, y: 50, width: 250, height: 500, content: [] },
          { id: 'template3_progress', type: 'container', title: 'In Progress', x: 350, y: 50, width: 250, height: 500, content: [] },
          { id: 'template3_done', type: 'container', title: 'Done', x: 650, y: 50, width: 250, height: 500, content: [] }
        ]
      }
    ]
    
    // Save templates if they don't exist
    templates.forEach(template => {
      if (!this.layoutNameExists(template.name)) {
        this.saveLayout({
          ...template,
          metadata: { isTemplate: true }
        })
      }
    })
    
    return templates
  }
}

export default LayoutStorage