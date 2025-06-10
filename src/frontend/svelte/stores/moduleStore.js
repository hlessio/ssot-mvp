import { writable } from 'svelte/store';

function createModuleStore() {
    const { subscribe, set, update } = writable(null);

    return {
        subscribe,
        
        // Carica un modulo specifico dal backend
        async loadModule(moduleId) {
            try {
                console.log('📦 Caricamento modulo:', moduleId);
                
                // Per ora usiamo dati mock, poi integreremo con API reali
                const mockModule = {
                    id: moduleId,
                    instanceName: 'Crew List - Film Demo',
                    moduleType: 'CrewList',
                    createdAt: new Date().toISOString(),
                    configuration: {
                        columns: ['Nome', 'Ruolo', 'Fee', 'Data Inizio'],
                        defaultAttributes: {
                            entityType: 'Persona'
                        }
                    }
                };
                
                set(mockModule);
                console.log('✅ Modulo caricato:', mockModule);
                return mockModule;
                
            } catch (error) {
                console.error('❌ Errore caricamento modulo:', error);
                set(null);
                throw error;
            }
        },
        
        // Crea un nuovo modulo
        async createModule(moduleData) {
            try {
                console.log('🆕 Creazione nuovo modulo:', moduleData);
                
                // TODO: Implementare chiamata API per creare modulo
                const response = await fetch('/api/module-instances', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(moduleData)
                });
                
                if (!response.ok) {
                    throw new Error('Errore creazione modulo');
                }
                
                const result = await response.json();
                const newModule = result.data;
                
                set(newModule);
                console.log('✅ Nuovo modulo creato:', newModule);
                return newModule;
                
            } catch (error) {
                console.error('❌ Errore creazione modulo:', error);
                throw error;
            }
        },
        
        // Aggiorna la configurazione del modulo
        async updateConfiguration(moduleId, newConfig) {
            try {
                update(currentModule => {
                    if (currentModule && currentModule.id === moduleId) {
                        return {
                            ...currentModule,
                            configuration: {
                                ...currentModule.configuration,
                                ...newConfig
                            }
                        };
                    }
                    return currentModule;
                });
                
                console.log('✅ Configurazione modulo aggiornata');
                
            } catch (error) {
                console.error('❌ Errore aggiornamento configurazione:', error);
                throw error;
            }
        },
        
        // Reset store
        reset() {
            set(null);
        },
        
        // Salva modulo corrente
        async save() {
            // TODO: Implementare salvataggio su backend
            console.log('💾 Salvataggio modulo...');
        }
    };
}

export const moduleStore = createModuleStore();