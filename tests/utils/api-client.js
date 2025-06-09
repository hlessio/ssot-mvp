/**
 * API Client Helper per Test Pratici
 * Gestisce chiamate HTTP al server SSOT
 */

class APIClient {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseData = await response.text();
            
            let parsedData;
            try {
                parsedData = JSON.parse(responseData);
            } catch {
                parsedData = responseData;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseData}`);
            }

            return {
                status: response.status,
                data: parsedData,
                success: true
            };
        } catch (error) {
            return {
                status: 0,
                error: error.message,
                success: false
            };
        }
    }

    // Health check
    async healthCheck() {
        return this.request('GET', '/api/health');
    }

    // Schema API
    async createEntitySchema(entityType, schemaDefinition) {
        return this.request('POST', `/api/schema/entity/${entityType}`, schemaDefinition);
    }

    async getEntitySchema(entityType) {
        return this.request('GET', `/api/schema/entity/${entityType}`);
    }

    async getAllEntitySchemas() {
        return this.request('GET', '/api/schema/entities');
    }

    async createRelationSchema(relationType, schemaDefinition) {
        return this.request('POST', `/api/schema/relation/${relationType}`, schemaDefinition);
    }

    async getRelationSchema(relationType) {
        return this.request('GET', `/api/schema/relation/${relationType}`);
    }

    // Entity API
    async createEntity(data) {
        return this.request('POST', '/api/entities', data);
    }

    async getEntity(entityId) {
        return this.request('GET', `/api/entity/${entityId}`);
    }

    async getEntitiesByType(entityType) {
        return this.request('GET', `/api/entities/${entityType}`);
    }

    // Metodo comodo per getEntities (alias)
    async getEntities(entityType) {
        return this.getEntitiesByType(entityType);
    }

    async updateEntityAttribute(entityId, attributeName, value) {
        return this.request('PUT', `/api/entity/${entityId}/attribute`, {
            attributeName,
            value
        });
    }

    async deleteEntity(entityId) {
        return this.request('DELETE', `/api/entity/${entityId}`);
    }

    // Relations API  
    async createRelation(data) {
        return this.request('POST', '/api/relations', data);
    }

    async getRelation(relationId) {
        return this.request('GET', `/api/relation/${relationId}`);
    }

    async getRelationsByType(relationType) {
        return this.request('GET', `/api/relations/${relationType}`);
    }

    async findRelations(query) {
        return this.request('POST', '/api/relations/find', query);
    }

    async updateRelation(relationId, data) {
        return this.request('PUT', `/api/relation/${relationId}`, data);
    }

    async deleteRelation(relationId) {
        return this.request('DELETE', `/api/relation/${relationId}`);
    }
}

module.exports = APIClient;