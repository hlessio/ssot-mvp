<script>
    import { createEventDispatcher } from 'svelte';
    import { onMount } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let cellType = 'content'; // 'header' | 'content'
    export let value = '';
    export let placeholder = '';
    export let moduleContext = null;
    export let suggestions = [];
    export let inputType = 'text'; // 'text' | 'currency' | 'date'
    
    let inputElement;
    let showDropdown = false;
    let filteredSuggestions = [];
    let searchQuery = '';
    let selectedIndex = -1;
    
    // Reactive statements
    $: searchQuery = value;
    $: if (searchQuery && suggestions.length > 0) {
        filterSuggestions();
    } else {
        filteredSuggestions = [];
        showDropdown = false;
    }
    
    function filterSuggestions() {
        if (!searchQuery) {
            filteredSuggestions = suggestions.slice(0, 5);
        } else {
            filteredSuggestions = suggestions
                .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 5);
        }
        showDropdown = filteredSuggestions.length > 0;
        selectedIndex = -1;
    }
    
    function handleInput(event) {
        value = event.target.value;
        searchQuery = value;
        
        // Format based on input type
        if (inputType === 'currency' && value) {
            // Auto-format currency
            if (!value.startsWith('$')) {
                value = '$' + value.replace(/[^0-9]/g, '');
            }
        }
        
        dispatch('change', { value, cellType });
    }
    
    function handleKeydown(event) {
        if (!showDropdown) return;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(filteredSuggestions[selectedIndex]);
                } else if (cellType === 'content' && searchQuery && !suggestions.includes(searchQuery)) {
                    // "Create new..." functionality
                    createNewEntity();
                }
                break;
            case 'Escape':
                showDropdown = false;
                selectedIndex = -1;
                break;
        }
    }
    
    function selectSuggestion(suggestion) {
        value = suggestion;
        showDropdown = false;
        selectedIndex = -1;
        dispatch('change', { value, cellType });
        dispatch('select', { value, cellType });
    }
    
    function createNewEntity() {
        console.log('🆕 Crea nuovo:', searchQuery);
        dispatch('createNew', { value: searchQuery, cellType });
        showDropdown = false;
    }
    
    function handleFocus() {
        if (suggestions.length > 0) {
            filterSuggestions();
        }
    }
    
    function handleBlur() {
        // Delay hiding dropdown to allow clicks on suggestions
        setTimeout(() => {
            showDropdown = false;
        }, 150);
    }
    
    onMount(() => {
        // Auto-focus for new rows or specific contexts
        if (cellType === 'content' && !value) {
            // Optional auto-focus logic
        }
    });
</script>

<div class="smart-input-container">
    <input
        bind:this={inputElement}
        bind:value={value}
        type={inputType === 'date' ? 'date' : 'text'}
        {placeholder}
        class="smart-input"
        class:has-suggestions={suggestions.length > 0}
        class:currency={inputType === 'currency'}
        on:input={handleInput}
        on:keydown={handleKeydown}
        on:focus={handleFocus}
        on:blur={handleBlur}
    />
    
    {#if showDropdown && filteredSuggestions.length > 0}
        <div class="suggestions-dropdown">
            {#each filteredSuggestions as suggestion, i}
                <div 
                    class="suggestion-item"
                    class:selected={i === selectedIndex}
                    on:click={() => selectSuggestion(suggestion)}
                    on:keydown
                >
                    <span class="suggestion-text">{suggestion}</span>
                    <span class="suggestion-type">Esistente</span>
                </div>
            {/each}
            
            {#if cellType === 'content' && searchQuery && !suggestions.includes(searchQuery)}
                <div 
                    class="suggestion-item create-new"
                    class:selected={selectedIndex === filteredSuggestions.length}
                    on:click={createNewEntity}
                    on:keydown
                >
                    <span class="suggestion-text">➕ Crea nuovo: "{searchQuery}"</span>
                    <span class="suggestion-type">Nuovo</span>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .smart-input-container {
        position: relative;
        width: 100%;
    }
    
    .smart-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.95em;
        transition: all 0.3s;
        background: white;
    }
    
    .smart-input:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    .smart-input.has-suggestions {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }
    
    .smart-input.currency {
        font-family: monospace;
        text-align: right;
    }
    
    .suggestions-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 6px 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    }
    
    .suggestion-item {
        padding: 10px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background 0.2s;
        border-bottom: 1px solid #f1f1f1;
    }
    
    .suggestion-item:hover,
    .suggestion-item.selected {
        background: #f8f9fa;
    }
    
    .suggestion-item.create-new {
        background: #e8f5e8;
        border-top: 1px solid #d4edda;
    }
    
    .suggestion-item.create-new:hover,
    .suggestion-item.create-new.selected {
        background: #d1ecf1;
    }
    
    .suggestion-text {
        font-size: 0.95em;
        color: #333;
    }
    
    .suggestion-type {
        font-size: 0.8em;
        color: #666;
        background: #f1f1f1;
        padding: 2px 8px;
        border-radius: 12px;
    }
    
    .create-new .suggestion-type {
        background: #d4edda;
        color: #155724;
    }
    
    .suggestion-item:last-child {
        border-bottom: none;
    }
</style>