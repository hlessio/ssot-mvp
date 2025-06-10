import { writable } from 'svelte/store';

function createRelationAttributeStore() {
    const { subscribe, set, update } = writable(new Map());

    return {
        subscribe,
        
        // Carica attributi relazionali per una specifica coppia entità-modulo
        async loadRelationAttributes(entityId, moduleId) {
            try {
                console.log('🔗 Caricamento attributi relazione:', { entityId, moduleId });
                
                const response = await fetch(`/api/modules/${moduleId}/members`);
                const result = await response.json();
                
                if (result.success) {
                    const member = result.data.find(m => m.entity.id === entityId);
                    if (member) {
                        const key = `${entityId}_${moduleId}`;
                        update(attributesMap => {
                            attributesMap.set(key, member.relationAttributes);
                            return attributesMap;
                        });
                        
                        console.log('✅ Attributi relazione caricati:', member.relationAttributes);
                        return member.relationAttributes;
                    }
                }
                
                return {};
                
            } catch (error) {
                console.error('❌ Errore caricamento attributi relazione:', error);
                return {};
            }
        },
        
        // Aggiorna attributi relazionali
        async updateRelationAttributes(entityId, moduleId, attributes) {
            try {
                console.log('🔄 Aggiornamento attributi relazione:', { entityId, moduleId, attributes });
                
                const response = await fetch(`/api/modules/${moduleId}/members/${entityId}/attributes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attributes })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const key = `${entityId}_${moduleId}`;
                    update(attributesMap => {
                        const current = attributesMap.get(key) || {};
                        attributesMap.set(key, { ...current, ...attributes });
                        return attributesMap;
                    });
                    
                    console.log('✅ Attributi relazione aggiornati');
                    return result.data;
                } else {
                    throw new Error(result.error);
                }
                
            } catch (error) {
                console.error('❌ Errore aggiornamento attributi relazione:', error);
                throw error;
            }
        },
        
        // Ottieni attributi per una specifica relazione
        getAttributes(entityId, moduleId) {
            let currentMap;
            const unsubscribe = subscribe(map => currentMap = map);
            unsubscribe();
            
            const key = `${entityId}_${moduleId}`;
            return currentMap.get(key) || {};
        },
        
        // Imposta attributi localmente (senza persistenza)
        setLocalAttributes(entityId, moduleId, attributes) {
            const key = `${entityId}_${moduleId}`;
            update(attributesMap => {
                attributesMap.set(key, attributes);
                return attributesMap;
            });
        },
        
        // Rimuovi attributi per una relazione
        removeRelationAttributes(entityId, moduleId) {
            const key = `${entityId}_${moduleId}`;
            update(attributesMap => {
                attributesMap.delete(key);
                return attributesMap;
            });
        },
        
        // Calcola aggregati per un modulo
        async getModuleAggregates(moduleId, field = 'fee') {
            try {
                console.log('📊 Calcolo aggregati modulo:', { moduleId, field });
                
                const response = await fetch(`/api/modules/${moduleId}/aggregates?field=${field}`);
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Aggregati calcolati:', result.data);
                    return result.data;
                } else {
                    throw new Error(result.error);
                }
                
            } catch (error) {
                console.error('❌ Errore calcolo aggregati:', error);
                return {
                    totalMembers: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                    minAmount: 0,
                    maxAmount: 0,
                    roles: []
                };
            }
        },
        
        // Reset store
        reset() {
            set(new Map());
        }
    };
}

export const relationAttributeStore = createRelationAttributeStore();