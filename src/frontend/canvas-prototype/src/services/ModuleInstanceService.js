/**
 * Service for managing ModuleInstance entities in the backend
 * Provides integration between Canvas blocks and SSOT ModuleInstance entities
 */
export default class ModuleInstanceService {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
    this.apiPath = '/api/module-instances'
  }

  /**
   * Create a new ModuleInstance entity when a block is added to canvas
   * @param {Object} block - Canvas block data
   * @returns {Promise<Object>} Created ModuleInstance entity
   */
  async createModuleInstance(block) {
    // Map canvas block to backend ModuleInstance schema (evolved)
    const moduleData = {
      // Required attributes per backend schema
      templateId: block.templateId || 'default-template',
      name: block.title || `Module ${block.id}`,
      
      // Layout information - now a top-level attribute
      layout: {
        position: { x: block.x, y: block.y },
        size: { width: block.width, height: block.height }
      },
      
      // Configuration for module-specific settings
      configuration: {
        // Block metadata
        blockId: block.id,
        type: block.type,
        
        // Instance configuration
        instanceConfigOverrides: {
          ...block.content,
          displaySettings: {
            showHeader: true,
            showBorder: true,
            ...block.displaySettings
          }
        },
        
        // Additional properties
        entityType: block.entityType || 'GenericEntity'
      },
      
      // Reference to project if available
      projectId: null // TODO: Get from context when needed
    }

    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(moduleData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create module instance')
      }

      const createdInstance = await response.json()
      console.log('✅ ModuleInstance created:', createdInstance)
      return createdInstance
    } catch (error) {
      console.error('❌ Error creating ModuleInstance:', error)
      throw error
    }
  }

  /**
   * Update an existing ModuleInstance when canvas block is modified
   * @param {String} instanceId - ModuleInstance ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated ModuleInstance
   */
  async updateModuleInstance(instanceId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update module instance')
      }

      const updatedInstance = await response.json()
      console.log('✅ ModuleInstance updated:', updatedInstance)
      return updatedInstance
    } catch (error) {
      console.error('❌ Error updating ModuleInstance:', error)
      throw error
    }
  }

  /**
   * Delete a ModuleInstance when block is removed from canvas
   * @param {String} instanceId - ModuleInstance ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteModuleInstance(instanceId) {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/${instanceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete module instance')
      }

      const result = await response.json()
      console.log('✅ ModuleInstance deleted:', instanceId)
      return result
    } catch (error) {
      console.error('❌ Error deleting ModuleInstance:', error)
      throw error
    }
  }

  /**
   * Get a single ModuleInstance by ID
   * @param {String} instanceId - ModuleInstance ID
   * @returns {Promise<Object>} ModuleInstance entity
   */
  async getModuleInstance(instanceId) {
    try {
      const response = await fetch(`${this.baseUrl}${this.apiPath}/${instanceId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get module instance')
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Error getting ModuleInstance:', error)
      throw error
    }
  }

  /**
   * List ModuleInstances with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Array of ModuleInstance entities
   */
  async listModuleInstances(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString()
    const url = `${this.baseUrl}${this.apiPath}${queryParams ? '?' + queryParams : ''}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to list module instances')
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Error listing ModuleInstances:', error)
      throw error
    }
  }

  /**
   * Sync canvas position/size changes to ModuleInstance
   * @param {String} instanceId - ModuleInstance ID
   * @param {Object} canvasData - Canvas position and size data
   * @returns {Promise<Object>} Updated instance
   */
  async syncCanvasMetadata(instanceId, canvasData) {
    const updates = {
      layout: {
        position: { x: canvasData.x, y: canvasData.y },
        size: { width: canvasData.width, height: canvasData.height }
      }
    }

    return this.updateModuleInstance(instanceId, updates)
  }

  /**
   * Create a block-to-instance mapping for tracking
   * @param {String} blockId - Canvas block ID
   * @param {String} instanceId - ModuleInstance ID
   */
  createBlockMapping(blockId, instanceId) {
    const mappings = this.getBlockMappings()
    mappings[blockId] = instanceId
    localStorage.setItem('canvas-block-mappings', JSON.stringify(mappings))
  }

  /**
   * Get the ModuleInstance ID for a canvas block
   * @param {String} blockId - Canvas block ID
   * @returns {String|null} ModuleInstance ID or null
   */
  getInstanceIdForBlock(blockId) {
    const mappings = this.getBlockMappings()
    return mappings[blockId] || null
  }

  /**
   * Remove block-to-instance mapping
   * @param {String} blockId - Canvas block ID
   */
  removeBlockMapping(blockId) {
    const mappings = this.getBlockMappings()
    delete mappings[blockId]
    localStorage.setItem('canvas-block-mappings', JSON.stringify(mappings))
  }

  /**
   * Get all block-to-instance mappings
   * @returns {Object} Mapping object
   */
  getBlockMappings() {
    const stored = localStorage.getItem('canvas-block-mappings')
    return stored ? JSON.parse(stored) : {}
  }

  /**
   * Clear all mappings (useful for reset/cleanup)
   */
  clearAllMappings() {
    localStorage.removeItem('canvas-block-mappings')
  }
}