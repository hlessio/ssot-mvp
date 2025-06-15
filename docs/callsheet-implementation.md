# Callsheet & Real-time Contact Implementation

## Overview

This implementation provides a complete solution for managing entity-module relationships with contextual attributes and real-time synchronization. It consists of:

1. **Frontend ModuleRelationService** - JavaScript service wrapping the backend API
2. **Callsheet Module Component** - Web component for managing module members
3. **Real-time Contact Card Component** - Synchronized contact display component
4. **Demo Page** - Comprehensive demonstration of all features

## Components

### 1. ModuleRelationService.js

**Location**: `/src/frontend/services/ModuleRelationService.js`

**Purpose**: Frontend service that wraps the backend ModuleRelationService API endpoints.

**Key Features**:
- Add/remove entities from modules with contextual attributes
- Update relationship attributes (fee, role, dates, etc.)
- Get module members with pagination and filtering
- Real-time WebSocket subscriptions for module and entity updates
- Intelligent caching with automatic invalidation
- Cross-window synchronization support

**API Methods**:
```javascript
// Add entity to module with contextual attributes
await moduleRelationService.addMember(moduleId, entityId, {
    fee: '$5000',
    role: 'Director',
    startDate: '2025-01-15',
    notes: 'Lead director for the project'
});

// Update member attributes
await moduleRelationService.updateMemberAttributes(moduleId, entityId, {
    fee: '$7500',
    role: 'Executive Producer'
});

// Get all module members
const members = await moduleRelationService.getMembers(moduleId);

// Subscribe to real-time updates
const subscriptionId = moduleRelationService.subscribeToModuleUpdates(moduleId, (update) => {
    console.log('Module updated:', update);
});
```

### 2. Callsheet Module Component

**Location**: `/src/frontend/components/callsheet-module.js`

**Purpose**: Web component for managing callsheet/crew lists with contextual member attributes.

**Key Features**:
- Add/remove entities using entity autocomplete
- Inline editing of contextual attributes (fee, role, dates, notes)
- Real-time synchronization across all instances
- Aggregate calculations (total fees, member count, role distribution)
- Responsive design with mobile support
- Configurable attribute sets and permissions

**Usage**:
```html
<callsheet-module 
    module-id="film-production-001"
    module-title="Film Production Callsheet"
    entity-types="Persona,Contact,Person"
    contextual-attributes="fee,role,startDate,endDate,notes"
    allow-add-members="true"
    allow-edit-attributes="true"
    show-aggregates="true">
</callsheet-module>
```

**Configurable Attributes**:
- `module-id` - ID of the ModuleInstance to manage
- `module-title` - Display title for the callsheet
- `entity-types` - Comma-separated list of allowed entity types
- `contextual-attributes` - Comma-separated list of editable attributes
- `allow-add-members` - Enable/disable adding new members
- `allow-remove-members` - Enable/disable removing members
- `allow-edit-attributes` - Enable/disable attribute editing
- `show-aggregates` - Show/hide aggregate calculations

### 3. Real-time Contact Card Component

**Location**: `/src/frontend/components/realtime-contact-card.js`

**Purpose**: Contact card that displays entity attributes with real-time synchronization.

**Key Features**:
- Real-time attribute updates via WebSocket
- Cross-window synchronization via BroadcastChannel
- Inline editing with debounced saves (1-second delay)
- Visual indicators for pending saves and real-time updates
- Configurable display and editable attributes
- Responsive design with compact mode

**Usage**:
```html
<realtime-contact-card 
    entity-id="person-123"
    entity-type="Persona"
    display-attributes="nome,cognome,email,telefono"
    editable-attributes="nome,cognome,email,telefono,indirizzo"
    allow-edit="true"
    compact-mode="false">
</realtime-contact-card>
```

**Visual Indicators**:
- 🟢 Blue highlight - Real-time update received
- ⏳ Spinning icon - Pending save (debounced)
- ✓ Green checkmark - Save confirmed
- 🟢/🔴 Connection status indicator

### 4. Demo Page

**Location**: `/src/frontend/views/callsheet-demo.html`

**Purpose**: Comprehensive demonstration of all callsheet and real-time contact features.

**Features**:
- Complete callsheet management interface
- Multiple synchronized contact cards
- Real-time status monitoring
- Demo data creation and testing tools
- Cross-window synchronization testing
- WebSocket connection status monitoring

**Demo Controls**:
- **Create Sample Data** - Generates test entities and adds them to callsheet
- **Simulate Attribute Change** - Tests real-time sync by updating random attributes
- **Open Second Window** - Tests cross-window synchronization
- **Reset Demo** - Clears all demo data

**Access**: http://localhost:3000/views/callsheet-demo.html

## Real-time Synchronization

### WebSocket Events

The system uses WebSocket for real-time updates with these event types:

**Entity Attribute Changes**:
```javascript
{
    type: 'change',
    data: {
        entityId: 'person-123',
        attributeName: 'telefono',
        newValue: '+1-555-9999',
        oldValue: '+1-555-1234',
        changeType: 'updated'
    }
}
```

**Module Membership Changes**:
```javascript
{
    type: 'relation-change',
    data: {
        relationType: 'MEMBER_OF',
        sourceEntityId: 'person-123',
        targetEntityId: 'module-001',
        changeType: 'created',
        attributes: { fee: '$5000', role: 'Director' }
    }
}
```

### Cross-window Synchronization

Uses `BroadcastChannel` API for instant updates between browser windows:

```javascript
const channel = new BroadcastChannel('ssot-entity-updates');
channel.postMessage({
    type: 'entity-attribute-updated',
    entityId: 'person-123',
    attributeName: 'email',
    newValue: 'new.email@example.com'
});
```

## Database Schema

### Entity-Module Relationships

The system uses Neo4j `MEMBER_OF` relationships to store contextual attributes:

```cypher
MATCH (person:Entity)-[r:MEMBER_OF]->(module:ModuleInstance)
RETURN person, r, module

# Relationship properties (contextual attributes):
r.fee = '$5000'
r.role = 'Director'  
r.startDate = '2025-01-15'
r.endDate = '2025-03-15'
r.notes = 'Lead director for the project'
r.addedAt = '2025-06-15T10:30:00Z'
r.lastModified = '2025-06-15T11:45:00Z'
```

### Backend API Endpoints

All endpoints are fully implemented and tested:

- `POST /api/modules/:moduleId/members` - Add member with attributes
- `PUT /api/modules/:moduleId/members/:entityId/attributes` - Update member attributes  
- `GET /api/modules/:moduleId/members` - Get all module members
- `DELETE /api/modules/:moduleId/members/:entityId` - Remove member
- `GET /api/entities/:entityId/projects` - Get entity's project memberships
- `GET /api/modules/:moduleId/aggregates` - Calculate module aggregates

## Testing

### Manual Testing Steps

1. **Access Demo**: Navigate to http://localhost:3000/views/callsheet-demo.html

2. **Create Sample Data**:
   - Click "🎭 Create Sample Data"
   - Verify 3 entities are created and added to callsheet
   - Check that contact cards appear automatically

3. **Test Real-time Sync**:
   - Click "🔄 Simulate Attribute Change"
   - Watch for blue highlighting on updated contact cards
   - Verify aggregate calculations update automatically

4. **Test Cross-window Sync**:
   - Click "🪟 Open Second Window"
   - Make changes in one window
   - Verify instant updates in the other window

5. **Test Manual Operations**:
   - Add new members using autocomplete search
   - Edit member attributes inline (fee, role, dates)
   - Remove members and verify cleanup

### WebSocket Connection Testing

Monitor WebSocket status in the demo:
- 🟢 Connected - Real-time sync active
- 🔴 Disconnected - Offline mode, changes cached

### Performance Characteristics

- **Debounced Saves**: 1-second delay prevents excessive API calls
- **Intelligent Caching**: 30-second cache timeout with smart invalidation
- **Efficient Updates**: Only affected components re-render
- **Cross-window Sync**: Near-instant propagation via BroadcastChannel

## Integration with Existing System

The new components integrate seamlessly with the existing SSOT infrastructure:

- **Backend**: Uses existing ModuleRelationService and AttributeSpace
- **Database**: Leverages existing Neo4j schema and relationships
- **WebSocket**: Integrates with existing WebSocket service
- **Entity Management**: Compatible with existing EntityService
- **Real-time**: Uses existing AttributeSpace notification system

## Future Enhancements

Potential improvements for future versions:

1. **Drag & Drop**: Visual module member reordering
2. **Bulk Operations**: Multi-select for batch attribute updates
3. **Advanced Filtering**: Filter members by role, fee range, dates
4. **Export Features**: PDF/Excel export of callsheets
5. **Template System**: Reusable callsheet templates
6. **Approval Workflow**: Multi-stage approval for member changes
7. **Notification System**: Email/SMS notifications for changes
8. **Mobile App**: Native mobile app with offline sync

The current implementation provides a solid foundation for all these enhancements while maintaining full backward compatibility with the existing SSOT system.