<script>
    import { onMount, onDestroy } from 'svelte';
    import DocumentWorkspace from './components/DocumentWorkspace.svelte';
    import SmartInput from './components/common/SmartInput.svelte';
    import { SearchService } from './services/SearchService.js';
    
    let documentId = null;
    let selectedPerson = null;
    let lastEvent = '';
    let demoMode = false;
    
    onMount(() => {
        console.log('🎯 SSOT-4000 Svelte Workspace inizializzato');
        
        // Recupera parametri URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlDocumentId = urlParams.get('documentId');
        const isDemoMode = urlParams.get('demo') === 'true';
        
        if (isDemoMode) {
            demoMode = true;
            console.log('🧪 Modalità demo SmartInput attivata');
        } else if (urlDocumentId) {
            documentId = urlDocumentId;
            console.log('📄 Caricamento documento da URL:', documentId);
        } else {
            console.log('🏠 Modalità home - nessun documento specificato');
        }
    });

    function handlePersonSelect(event) {
        selectedPerson = event.detail.value;
        lastEvent = `SELEZIONATO: ${selectedPerson?.nome || 'null'}`;
        console.log('👤 Persona selezionata:', selectedPerson);
    }

    async function handlePersonCreate(event) {
        lastEvent = `RICHIESTA CREAZIONE: ${event.detail.initialValue}`;
        console.log('➕ Persona creata:', event.detail);
        // Invalida la cache per future ricerche
        SearchService.invalidateCache();
    }
    
    function handlePersonError(event) {
        lastEvent = `ERRORE: ${event.detail.error}`;
        console.error('❌ Errore SmartInput:', event.detail);
    }
</script>

{#if demoMode}
    <main style="padding: 2em; font-family: sans-serif;">
        <h1>Demo SmartInput e SearchService</h1>
        
        <h2>Cerca una Persona</h2>
        <p>Inizia a digitare "Mario" o "Anna" (se esistono nel DB).</p>
        <SmartInput 
            entityType="Persona" 
            bind:value={selectedPerson}
            on:select={handlePersonSelect}
            on:create={handlePersonCreate}
            on:error={handlePersonError}
        />

        <div style="margin-top: 2em; padding: 1em; background-color: #f5f5f5; border: 1px solid #ddd;">
            <h3>Stato</h3>
            <p><strong>Ultimo Evento:</strong> {lastEvent || 'Nessuno'}</p>
            {#if selectedPerson}
                <p><strong>Oggetto Selezionato:</strong></p>
                <pre style="background-color: #eee; padding: 1em;">{JSON.stringify(selectedPerson, null, 2)}</pre>
            {/if}
        </div>
    </main>
{:else}
    <DocumentWorkspace {documentId} />
{/if}