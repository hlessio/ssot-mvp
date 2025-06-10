import { writable } from 'svelte/store';

function createProjectStore() {
    const { subscribe, set, update } = writable(null);

    return {
        subscribe,
        
        // Carica un progetto specifico dal backend
        async loadProject(projectId) {
            try {
                console.log('🎬 Caricamento progetto:', projectId);
                
                // Per ora usiamo dati mock, poi integreremo con API reali
                const mockProject = {
                    id: projectId,
                    name: 'Film: Inception Demo',
                    type: 'Film',
                    description: 'Un thriller fantascientifico diretto da Christopher Nolan',
                    status: 'In Produzione',
                    createdAt: new Date().toISOString(),
                    budget: 160000000,
                    currency: 'USD'
                };
                
                set(mockProject);
                console.log('✅ Progetto caricato:', mockProject);
                return mockProject;
                
            } catch (error) {
                console.error('❌ Errore caricamento progetto:', error);
                set(null);
                throw error;
            }
        },
        
        // Crea un nuovo progetto
        async createProject(projectData) {
            try {
                console.log('🆕 Creazione nuovo progetto:', projectData);
                
                // TODO: Implementare chiamata API per creare progetto
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
                
                if (!response.ok) {
                    throw new Error('Errore creazione progetto');
                }
                
                const result = await response.json();
                const newProject = result.data;
                
                set(newProject);
                console.log('✅ Nuovo progetto creato:', newProject);
                return newProject;
                
            } catch (error) {
                console.error('❌ Errore creazione progetto:', error);
                throw error;
            }
        },
        
        // Recupera tutti i moduli del progetto
        async getProjectModules(projectId) {
            try {
                // TODO: Implementare API per recuperare moduli del progetto
                console.log('📦 Caricamento moduli per progetto:', projectId);
                
                // Mock data per ora
                const mockModules = [
                    {
                        id: 'module_1',
                        instanceName: 'Crew List - Inception',
                        moduleType: 'CrewList',
                        memberCount: 12
                    },
                    {
                        id: 'module_2', 
                        instanceName: 'Location List - Inception',
                        moduleType: 'LocationList',
                        memberCount: 8
                    }
                ];
                
                return mockModules;
                
            } catch (error) {
                console.error('❌ Errore caricamento moduli progetto:', error);
                return [];
            }
        },
        
        // Aggiorna dati progetto
        async updateProject(projectId, updates) {
            try {
                update(currentProject => {
                    if (currentProject && currentProject.id === projectId) {
                        return {
                            ...currentProject,
                            ...updates,
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return currentProject;
                });
                
                console.log('✅ Progetto aggiornato');
                
            } catch (error) {
                console.error('❌ Errore aggiornamento progetto:', error);
                throw error;
            }
        },
        
        // Reset store
        reset() {
            set(null);
        }
    };
}

export const projectStore = createProjectStore();