<script>
    import { onMount, onDestroy } from 'svelte';
    import DocumentWorkspace from './components/DocumentWorkspace.svelte';
    
    let documentId = null;
    
    onMount(() => {
        console.log('🎯 SSOT-4000 Svelte Workspace inizializzato');
        
        // Recupera documentId dai parametri URL se presente
        const urlParams = new URLSearchParams(window.location.search);
        const urlDocumentId = urlParams.get('documentId');
        
        if (urlDocumentId) {
            documentId = urlDocumentId;
            console.log('📄 Caricamento documento da URL:', documentId);
        } else {
            console.log('🏠 Modalità home - nessun documento specificato');
        }
    });
</script>

<DocumentWorkspace {documentId} />