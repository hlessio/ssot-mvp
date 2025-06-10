<script>
    import { onMount, onDestroy } from 'svelte';
    import DynamicModuleGrid from './components/DynamicModuleGrid.svelte';
    import ModuleHeader from './components/ModuleHeader.svelte';
    import { moduleStore } from './stores/moduleStore.js';
    import { projectStore } from './stores/projectStore.js';
    
    let currentModule = null;
    let currentProject = null;
    let moduleUnsubscribe;
    let projectUnsubscribe;
    
    onMount(() => {
        console.log('🎯 Svelte App UI Dinamica inizializzata');
        
        // Subscribe ai stores nel onMount
        moduleUnsubscribe = moduleStore.subscribe(value => {
            currentModule = value;
        });
        
        projectUnsubscribe = projectStore.subscribe(value => {
            currentProject = value;
        });
        
        // Inizializza con dati di test o recupera da URL params
        const urlParams = new URLSearchParams(window.location.search);
        const moduleId = urlParams.get('moduleId');
        const projectId = urlParams.get('projectId');
        
        if (moduleId && projectId) {
            // Carica modulo specifico
            moduleStore.loadModule(moduleId);
            projectStore.loadProject(projectId);
        } else {
            // Modalità demo/test
            console.log('🧪 Modalità demo - usando dati di test');
        }
    });
    
    onDestroy(() => {
        // Cleanup subscriptions
        if (moduleUnsubscribe) moduleUnsubscribe();
        if (projectUnsubscribe) projectUnsubscribe();
    });
</script>

<main class="dynamic-ui-container">
    <header class="app-header">
        <h1>🎯 SSOT UI Dinamica - Svelte</h1>
        <p>Sistema di modellazione dati intelligente con griglia dinamica</p>
    </header>
    
    {#if currentProject}
        <ModuleHeader project={currentProject} module={currentModule} />
    {/if}
    
    <section class="main-content">
        {#if currentModule}
            <DynamicModuleGrid 
                module={currentModule} 
                project={currentProject}
            />
        {:else}
            <div class="welcome-screen">
                <h2>👋 Benvenuto nel Sistema UI Dinamica</h2>
                <p>Modello gerarchico: <strong>Progetto → ModuleInstance → Entità</strong></p>
                
                <div class="demo-actions">
                    <button class="demo-btn" on:click={() => {
                        // Demo: Crea nuovo progetto crew list
                        console.log('🎬 Demo: Creazione Crew List');
                    }}>
                        🎬 Demo: Crew List Film
                    </button>
                    
                    <button class="demo-btn" on:click={() => {
                        // Demo: Carica progetto esistente
                        console.log('📂 Demo: Carica Progetto');
                    }}>
                        📂 Carica Progetto Esistente
                    </button>
                </div>
                
                <div class="architecture-info">
                    <h3>🏗️ Architettura Implementata</h3>
                    <ul>
                        <li>✅ <strong>ModuleRelationService</strong> - Backend completo</li>
                        <li>✅ <strong>API REST</strong> - 8 endpoints per CRUD moduli</li>
                        <li>✅ <strong>Attributi Relazionali</strong> - Fee, ruoli, date su relazioni</li>
                        <li>🚧 <strong>Svelte UI</strong> - Smart Input con autocomplete</li>
                        <li>🚧 <strong>Griglia Dinamica</strong> - Modeling interface</li>
                    </ul>
                </div>
            </div>
        {/if}
    </section>
</main>

<style>
    .dynamic-ui-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .app-header {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
    }
    
    .app-header h1 {
        margin: 0 0 10px 0;
        font-size: 2.5em;
        font-weight: 300;
    }
    
    .app-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 1.1em;
    }
    
    .main-content {
        min-height: 400px;
    }
    
    .welcome-screen {
        text-align: center;
        padding: 40px 20px;
    }
    
    .welcome-screen h2 {
        color: #333;
        margin-bottom: 20px;
    }
    
    .demo-actions {
        margin: 30px 0;
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .demo-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 1.1em;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .demo-btn:hover {
        background: #45a049;
        transform: translateY(-2px);
    }
    
    .architecture-info {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 30px;
        margin-top: 40px;
        text-align: left;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }
    
    .architecture-info h3 {
        margin-top: 0;
        color: #333;
    }
    
    .architecture-info ul {
        list-style: none;
        padding: 0;
    }
    
    .architecture-info li {
        padding: 8px 0;
        font-size: 1.05em;
    }
    
    .architecture-info li strong {
        color: #2c3e50;
    }
</style>