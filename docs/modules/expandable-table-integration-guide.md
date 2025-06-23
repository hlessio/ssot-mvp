# Expandable Table Module - Integration Guide

## Overview

The Expandable Table Module is a fully dynamic table component that implements the vision from the "Piano di Sviluppo Modulo Tabella Espandibile". It provides advanced functionality for managing entity collections with dynamic column creation and contextual attributes.

## Quick Start

### 1. Basic Usage

```javascript
// Import the module
import { ExpandableTableModule } from '../components/expandable-table-module.js';

// Create a container element
const container = document.getElementById('my-table-container');

// Initialize the table
const table = new ExpandableTableModule(container, {
    tableName: 'My Dynamic Table',
    selectedEntityType: 'Contact',
    permissions: {
        canAddRows: true,
        canEditRows: true,
        canDeleteRows: true,
        canAddColumns: true,
        canEditColumns: true
    }
});
```

### 2. Integration with SSOT-4000

```javascript
// When used within SSOT-4000 workspace
const tableConfig = {
    moduleInstanceId: 'module_123',
    tableName: 'Project Management Table',
    selectedEntityType: 'Project',
    contextEntityId: 'document_456',
    contextEntityType: 'CompositeDocument'
};

const expandableTable = new ExpandableTableModule(container, tableConfig);
```

## Key Features

### 1. Dynamic Column Creation

The module supports two types of columns:

- **Intrinsic Columns** (🟢): Attributes that belong to the entity itself
- **Contextual Columns** (🟡): Attributes specific to this table instance

```javascript
// Columns are automatically discovered from existing entities
// Or can be added manually through the UI:
// 1. Click "➕ Nuova Colonna"
// 2. Select attribute name (existing or new)
// 3. Choose column type (intrinsic or contextual)
// 4. Select data type
```

### 2. Smart Attribute Selection

The column creation modal provides:
- Autocomplete for existing attributes
- "Create new attribute" option for non-existing ones
- Visual chips for quickly selecting available attributes
- Type-ahead suggestions

### 3. Real-time Synchronization

The module integrates with WebSocket services for real-time updates:

```javascript
// WebSocket events are automatically handled:
// - entity-updated: Updates cell values in real-time
// - entity-created: Adds new rows automatically
// - entity-deleted: Removes rows automatically
// - schema-updated: Refreshes available attributes
```

### 4. Contextual Attributes

Contextual attributes are stored with module instance context:

```javascript
// Pattern: _ctx_{moduleInstanceId}_{attributeName}
// Example: _ctx_module_123_priority_rating

// This allows the same entity to have different contextual
// attributes in different table instances
```

## Configuration Options

### Constructor Parameters

```javascript
const config = {
    // Required
    moduleInstanceId: 'unique_module_id',
    tableName: 'Table Display Name',
    
    // Optional
    selectedEntityType: 'EntityType',        // Pre-select entity type
    contextEntityId: 'parent_entity_id',     // Parent context
    contextEntityType: 'ParentEntityType',   // Parent type
    
    // Permissions
    permissions: {
        canAddRows: true,      // Allow row creation
        canEditRows: true,     // Allow cell editing
        canDeleteRows: true,   // Allow row deletion
        canAddColumns: true,   // Allow column creation
        canEditColumns: true   // Allow column management
    },
    
    // Advanced options
    autoLoadEntities: true,           // Auto-load existing entities
    maxEntitiesPerPage: 100,          // Pagination limit
    enableRealTimeSync: true          // WebSocket integration
};
```

### Service Dependencies

The module requires these services to be available:

```javascript
// Required services (will use mocks if not available)
window.EntityService = new EntityService();
window.SchemaService = new SchemaService();
window.WebSocketService = new WebSocketService();
```

## Usage Patterns

### 1. Contact Management

```javascript
const contactTable = new ExpandableTableModule(container, {
    tableName: 'Customer Contacts',
    selectedEntityType: 'Contact',
    permissions: {
        canAddRows: true,
        canEditRows: true,
        canDeleteRows: false,  // Protect from accidental deletion
        canAddColumns: true,
        canEditColumns: true
    }
});

// Common contextual attributes for contacts:
// - priority_rating (1-5 stars)
// - last_contact_date
// - follow_up_notes
// - relationship_strength
```

### 2. Project Tracking

```javascript
const projectTable = new ExpandableTableModule(container, {
    tableName: 'Active Projects',
    selectedEntityType: 'Project',
    contextEntityId: 'workspace_id',
    permissions: {
        canAddRows: true,
        canEditRows: true,
        canDeleteRows: false,
        canAddColumns: true,
        canEditColumns: false  // Lock column structure
    }
});

// Common contextual attributes for projects:
// - completion_percentage
// - risk_level
// - team_assignment
// - budget_allocation
```

### 3. Custom Entity Management

```javascript
const customTable = new ExpandableTableModule(container, {
    tableName: 'Product Inventory',
    selectedEntityType: 'Product',
    permissions: {
        canAddRows: true,
        canEditRows: true,
        canDeleteRows: true,
        canAddColumns: true,
        canEditColumns: true
    }
});

// Will auto-discover or allow creation of attributes like:
// - product_name, category, price (intrinsic)
// - stock_location, reorder_point (contextual)
```

## API Reference

### Methods

```javascript
// Get current configuration
const config = table.getConfiguration();
// Returns: { tableName, selectedEntityType, columns, entityCount }

// Refresh data from backend
await table.refreshData();

// Update configuration
table.updateConfiguration({ tableName: 'New Name' });

// Destroy instance (cleanup)
table.destroy();
```

### Events

The module fires events that can be listened to:

```javascript
// Cell editing
table.addEventListener('cell-edited', (event) => {
    console.log('Cell updated:', event.detail);
});

// Column management
table.addEventListener('column-added', (event) => {
    console.log('New column:', event.detail);
});

// Row operations
table.addEventListener('row-added', (event) => {
    console.log('New entity:', event.detail);
});
```

## Styling and Customization

### CSS Classes

The module uses BEM-style CSS classes:

```css
.expandable-table-container    /* Main container */
.table-header                  /* Header section */
.table-name-input             /* Table name input */
.type-selector                /* Entity type selector */
.expandable-table             /* Main table element */
.column-header                /* Column headers */
.data-cell                    /* Data cells */
.modal-overlay                /* Modal dialogs */
```

### Custom Styling

```css
/* Override default styles */
.expandable-table-container {
    --primary-color: #your-color;
    --border-radius: 8px;
    --cell-padding: 12px;
}

/* Customize column type indicators */
.column-type-icon {
    font-size: 1.2em;
}

/* Style contextual vs intrinsic columns differently */
.column-header[data-column-type="contextual"] {
    background: #fff3cd;
}

.column-header[data-column-type="intrinsic"] {
    background: #d4edda;
}
```

## Advanced Features

### 1. Column Type Detection

The module automatically infers data types:

```javascript
// Email detection: contains @
// URL detection: starts with http/www
// Date detection: valid date string
// Boolean detection: true/false values
// Number detection: numeric values
// Default: string
```

### 2. Auto-Discovery

When entities are loaded:

```javascript
// Analyzes existing entities
// Creates columns for attributes present in 30%+ of entities
// Sorts by importance (name first, then alphabetical)
// Handles missing attributes gracefully
```

### 3. Performance Optimization

```javascript
// Debounced saves (1.5s delay)
// Efficient DOM updates
// Lazy loading for large datasets
// Virtual scrolling (future enhancement)
```

## Demo and Testing

### Access the Demo

Visit: `http://localhost:3000/views/expandable-table-demo.html`

The demo includes:
- 4 predefined scenarios
- Interactive controls
- Real-time statistics
- Event logging
- Sample data generation

### Test Scenarios

1. **Contact Management**: Traditional CRM-style table
2. **Project Tracking**: Project management with status tracking
3. **Custom Entities**: Product inventory management
4. **Contextual Attributes**: Demonstration of table-specific attributes

### Integration Testing

```javascript
// Test with real SSOT-4000 services
const table = new ExpandableTableModule(container, {
    tableName: 'Test Table',
    selectedEntityType: 'TestEntity'
});

// Add test data
await table.createEntity('TestEntity', { name: 'Test Item' });

// Test column creation
table.showAddColumnModal();

// Test real-time sync
// (modify entity in another window/tab)
```

## Migration from Existing Tables

### From DynamicTableModule

```javascript
// Old approach with ConfiguredTable/TableRowLink
const oldTable = new DynamicTableModule(container, {
    configuredTableId: 'table_123',
    rowEntityType: 'Contact'
});

// New approach - simplified
const newTable = new ExpandableTableModule(container, {
    tableName: 'Contacts',
    selectedEntityType: 'Contact'
});
```

### From TabularModule

```javascript
// Old MVP approach
const oldTabular = new TabularModule();
oldTabular.entityType = 'Contact';
await oldTabular.init();

// New approach - more powerful
const newExpandable = new ExpandableTableModule(container, {
    selectedEntityType: 'Contact',
    permissions: { /* configure as needed */ }
});
```

## Troubleshooting

### Common Issues

1. **Table not loading**
   - Check that container element exists
   - Verify EntityService is available
   - Check browser console for errors

2. **Columns not appearing**
   - Ensure entities have attributes
   - Check that selectedEntityType is set
   - Verify schema service connectivity

3. **Real-time sync not working**
   - Check WebSocket connection
   - Verify entity IDs match
   - Check browser network tab

4. **Permission errors**
   - Review permissions configuration
   - Check user access rights
   - Verify context entity permissions

### Debug Mode

```javascript
// Enable debug logging
const table = new ExpandableTableModule(container, {
    debug: true,
    logLevel: 'verbose'
});

// Access internal state
console.log(table.state);
console.log(table.config);
```

## Future Enhancements

Planned improvements:
- Virtual scrolling for large datasets
- Advanced filtering and sorting
- Bulk operations interface
- Column reordering via drag & drop
- Export/import functionality
- Template-based column sets
- Collaborative editing indicators

## Support and Documentation

- **User Guide**: `docs/modules/expandable-table-user-guide.md`
- **API Reference**: `docs/api/expandable-table-api.md`
- **Examples**: `examples/expandable-table-*.html`
- **Issues**: Report in SSOT-4000 issue tracker

---

*This module represents the complete implementation of the "Piano di Sviluppo Modulo Tabella Espandibile" with modern JavaScript, advanced UI patterns, and full integration with the SSOT-4000 platform.*