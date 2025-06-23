<script>
    import { createEventDispatcher } from 'svelte';
    import { SearchService } from '../../services/SearchService.js';
    
    // Props per la configurazione
    export let value = null; // L'oggetto entità selezionato
    export let entityType; // Tipo di entità da cercare (es. 'Persona')
    export let placeholder = 'Cerca...';
    export let allowCreate = true; // Se permettere la creazione di nuove entità
    export let disabled = false;
    export let required = false;
    
    const dispatch = createEventDispatcher();
    
    let searchQuery = '';
    let suggestions = [];
    let isLoading = false;
    let showSuggestions = false;
    let selectedIndex = -1;
    let debounceTimer;
    let inputElement;

    // Quando il valore esterno cambia, aggiorna la casella di testo
    $: if (value) {
        searchQuery = value.nome || value.name || value.title || value.label || value.id || '';
    }

    async function handleInput() {
        // Reset selezione se l'utente sta digitando
        if (value && searchQuery !== (value.nome || value.name || value.title || value.label || value.id)) {
            value = null;
            dispatch('select', { type: 'entity', value: null });
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (searchQuery.length < 2) {
                suggestions = [];
                showSuggestions = false;
                return;
            }

            isLoading = true;
            showSuggestions = true;
            selectedIndex = -1;
            
            try {
                suggestions = await SearchService.search(searchQuery, {
                    entityType: entityType,
                    allowCreate: allowCreate,
                    limit: 8
                });
                
                console.log(`🔍 SmartInput: ricevuti ${suggestions.length} suggerimenti per "${searchQuery}"`);
            } catch (error) {
                console.error('❌ Errore ricerca SmartInput:', error);
                suggestions = [{
                    type: 'error',
                    id: '_error',
                    label: `Errore: ${error.message}`
                }];
            }
            
            isLoading = false;
        }, 300); // Debounce di 300ms
    }

    function handleKeydown(event) {
        if (!showSuggestions || suggestions.length === 0) {
            return;
        }
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                break;
                
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(suggestions[selectedIndex]);
                }
                break;
                
            case 'Escape':
                showSuggestions = false;
                selectedIndex = -1;
                inputElement?.blur();
                break;
        }
    }

    async function selectSuggestion(suggestion) {
        showSuggestions = false;
        selectedIndex = -1;
        
        if (suggestion.type === 'entity') {
            value = suggestion.data;
            searchQuery = suggestion.label;
            dispatch('select', { type: 'entity', value: suggestion.data });
            
        } else if (suggestion.type === 'action' && suggestion.action === 'create') {
            try {
                isLoading = true;
                const newEntity = await SearchService.createEntity(suggestion.entityType, suggestion.initialValue);
                
                value = newEntity.data;
                searchQuery = newEntity.label;
                
                dispatch('create', { 
                    type: 'create', 
                    value: newEntity.data,
                    entityType: suggestion.entityType,
                    initialValue: suggestion.initialValue
                });
                dispatch('select', { type: 'entity', value: newEntity.data });
                
                console.log(`✅ SmartInput: entità creata e selezionata`);
                
            } catch (error) {
                console.error('❌ Errore creazione entità:', error);
                dispatch('error', { 
                    type: 'create-error', 
                    error: error.message,
                    entityType: suggestion.entityType,
                    initialValue: suggestion.initialValue
                });
            } finally {
                isLoading = false;
            }
        }
        
        suggestions = [];
    }

    function handleFocus() {
        if (searchQuery.length >= 2) {
            showSuggestions = true;
        }
    }

    function handleBlur() {
        // Nascondi i suggerimenti dopo un breve ritardo per permettere il click
        setTimeout(() => {
            showSuggestions = false;
            selectedIndex = -1;
        }, 200);
    }

    function clearSelection() {
        value = null;
        searchQuery = '';
        suggestions = [];
        showSuggestions = false;
        dispatch('select', { type: 'entity', value: null });
    }
</script>

<div class="smart-input-container" class:disabled>
    <div class="input-wrapper">
        <input
            bind:this={inputElement}
            bind:value={searchQuery}
            type="text"
            {placeholder}
            {disabled}
            {required}
            class="smart-input"
            class:has-value={value}
            class:has-suggestions={showSuggestions && suggestions.length > 0}
            class:loading={isLoading}
            on:input={handleInput}
            on:keydown={handleKeydown}
            on:focus={handleFocus}
            on:blur={handleBlur}
        />
        
        {#if value}
            <button
                type="button"
                class="clear-button"
                on:click={clearSelection}
                disabled={disabled}
                title="Cancella selezione"
            >
                ✕
            </button>
        {/if}
        
        {#if isLoading}
            <div class="loading-indicator">
                <div class="spinner"></div>
            </div>
        {/if}
    </div>
    
    {#if showSuggestions && (isLoading || suggestions.length > 0)}
        <ul class="suggestions-list">
            {#if isLoading}
                <li class="suggestion-item loading">
                    <div class="suggestion-content">
                        <div class="spinner-small"></div>
                        <span>Caricamento...</span>
                    </div>
                </li>
            {/if}
            
            {#each suggestions as suggestion, i (suggestion.id)}
                <li 
                    class="suggestion-item"
                    class:selected={i === selectedIndex}
                    class:action={suggestion.type === 'action'}
                    class:error={suggestion.type === 'error'}
                    on:mousedown={() => selectSuggestion(suggestion)}
                    on:keydown
                >
                    <div class="suggestion-content">
                        <span class="suggestion-label">{suggestion.label}</span>
                        <span class="suggestion-context">{suggestion.context || ''}</span>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .smart-input-container {
        position: relative;
        width: 100%;
    }
    
    .smart-input-container.disabled {
        opacity: 0.6;
        pointer-events: none;
    }
    
    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }
    
    .smart-input {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        background: white;
        outline: none;
    }
    
    .smart-input:focus {
        border-color: #3498db;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }
    
    .smart-input.has-value {
        border-color: #27ae60;
    }
    
    .smart-input.has-suggestions {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom-color: transparent;
    }
    
    .smart-input.loading {
        padding-right: 40px;
    }
    
    .clear-button {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 4px;
        line-height: 1;
        border-radius: 50%;
        transition: all 0.2s;
    }
    
    .clear-button:hover {
        background: #f0f0f0;
        color: #333;
    }
    
    .loading-indicator {
        position: absolute;
        right: 12px;
        display: flex;
        align-items: center;
    }
    
    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e0e0e0;
        border-top-color: #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .spinner-small {
        width: 14px;
        height: 14px;
        border: 2px solid #e0e0e0;
        border-top-color: #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .suggestions-list {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 2px solid #3498db;
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
        list-style: none;
        margin: 0;
        padding: 0;
    }
    
    .suggestion-item {
        cursor: pointer;
        transition: background 0.2s ease;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .suggestion-item:last-child {
        border-bottom: none;
    }
    
    .suggestion-item:hover,
    .suggestion-item.selected {
        background: #f8f9fa;
    }
    
    .suggestion-item.action {
        background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
        border-top: 2px solid #d4edda;
    }
    
    .suggestion-item.action:hover,
    .suggestion-item.action.selected {
        background: linear-gradient(135deg, #d1ecf1, #d4edda);
    }
    
    .suggestion-item.error {
        background: #ffeaea;
        color: #d63031;
        cursor: default;
    }
    
    .suggestion-item.loading {
        background: #f8f9fa;
        cursor: default;
    }
    
    .suggestion-content {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .suggestion-label {
        font-size: 0.95rem;
        color: #333;
        font-weight: 400;
    }
    
    .suggestion-item.action .suggestion-label {
        font-weight: 600;
        color: #155724;
    }
    
    .suggestion-item.error .suggestion-label {
        color: #d63031;
    }
    
    .suggestion-context {
        font-size: 0.8rem;
        color: #666;
        background: #f1f1f1;
        padding: 2px 8px;
        border-radius: 12px;
        white-space: nowrap;
    }
    
    .suggestion-item.action .suggestion-context {
        background: #d4edda;
        color: #155724;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .smart-input {
            font-size: 1rem;
            padding: 12px;
        }
        
        .suggestion-content {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .suggestion-context {
            margin-top: 4px;
        }
    }
</style>