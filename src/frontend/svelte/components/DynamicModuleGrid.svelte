<script>
    import { onMount } from 'svelte';
    import SmartInput from './SmartInput.svelte';
    import { moduleStore } from '../stores/moduleStore.js';
    
    export let module = null;
    export let project = null;
    
    let gridData = [];
    let columns = ['Nome', 'Ruolo', 'Fee', 'Data Inizio'];
    let isLoading = false;
    
    // Reactive statements
    $: if (module) {
        loadModuleMembers();
    }
    
    async function loadModuleMembers() {
        if (!module?.id) return;
        
        isLoading = true;
        try {
            const response = await fetch(`/api/modules/${module.id}/members`);
            const result = await response.json();
            
            if (result.success) {
                gridData = result.data.map(member => ({
                    id: member.entity.id,
                    entity: member.entity,
                    nome: member.entity.name || member.entity.nome || 'N/A',
                    ruolo: member.relationAttributes.ruolo || 'N/A',
                    fee: member.relationAttributes.fee || 'N/A',
                    dataInizio: member.relationAttributes.startDate || 'N/A',
                    relationAttributes: member.relationAttributes
                }));
                console.log('✅ Membri modulo caricati:', gridData.length);
            } else {
                console.error('❌ Errore caricamento membri:', result.error);
                gridData = [];
            }
        } catch (error) {
            console.error('❌ Errore fetch membri:', error);
            gridData = [];
        } finally {
            isLoading = false;
        }
    }
    
    function addNewRow() {
        const newRow = {
            id: `new_${Date.now()}`,
            entity: { name: '', entityType: 'Persona' },
            nome: '',
            ruolo: '',
            fee: '',
            dataInizio: '',
            relationAttributes: {},
            isNew: true
        };
        gridData = [...gridData, newRow];
    }
    
    async function saveRow(rowData) {
        if (!module?.id) return;
        
        try {
            console.log('💾 Salvando riga:', rowData);
            
            // Se è una nuova riga, prima crea l'entità
            if (rowData.isNew) {
                // TODO: Creare entità e poi aggiungere al modulo
                console.log('🆕 Creazione nuova entità...');
            } else {
                // Aggiorna attributi relazione esistente
                const response = await fetch(`/api/modules/${module.id}/members/${rowData.entity.id}/attributes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attributes: {
                            ruolo: rowData.ruolo,
                            fee: rowData.fee,
                            startDate: rowData.dataInizio
                        }
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Attributi aggiornati');
                    await loadModuleMembers(); // Ricarica dati
                } else {
                    console.error('❌ Errore aggiornamento:', result.error);
                }
            }
        } catch (error) {
            console.error('❌ Errore salvataggio riga:', error);
        }
    }
    
    onMount(() => {
        console.log('🎯 DynamicModuleGrid montato', { module, project });
    });
</script>

<div class="dynamic-grid-container">
    <div class="grid-header">
        <h3>📊 Griglia Dinamica - {module?.instanceName || 'Caricamento...'}</h3>
        
        <div class="grid-actions">
            <button class="grid-btn primary" on:click={addNewRow}>
                ➕ Aggiungi Membro
            </button>
            <button class="grid-btn secondary" on:click={loadModuleMembers}>
                🔄 Ricarica
            </button>
        </div>
    </div>
    
    {#if isLoading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Caricamento membri modulo...</p>
        </div>
    {:else}
        <div class="grid-table">
            <table>
                <thead>
                    <tr>
                        {#each columns as column}
                            <th>{column}</th>
                        {/each}
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    {#each gridData as row, i (row.id)}
                        <tr class="grid-row" class:new-row={row.isNew}>
                            <td>
                                <SmartInput 
                                    cellType="content"
                                    value={row.nome}
                                    placeholder="Nome persona..."
                                    moduleContext={module}
                                    on:change={(e) => {
                                        row.nome = e.detail.value;
                                        if (row.entity) row.entity.name = e.detail.value;
                                    }}
                                />
                            </td>
                            <td>
                                <SmartInput 
                                    cellType="content"
                                    value={row.ruolo}
                                    placeholder="Ruolo..."
                                    moduleContext={module}
                                    suggestions={['Director', 'Actor', 'Producer', 'Cinematographer', 'Composer']}
                                    on:change={(e) => row.ruolo = e.detail.value}
                                />
                            </td>
                            <td>
                                <SmartInput 
                                    cellType="content"
                                    value={row.fee}
                                    placeholder="$0"
                                    moduleContext={module}
                                    inputType="currency"
                                    on:change={(e) => row.fee = e.detail.value}
                                />
                            </td>
                            <td>
                                <SmartInput 
                                    cellType="content"
                                    value={row.dataInizio}
                                    placeholder="YYYY-MM-DD"
                                    moduleContext={module}
                                    inputType="date"
                                    on:change={(e) => row.dataInizio = e.detail.value}
                                />
                            </td>
                            <td class="actions-cell">
                                <button class="row-action save" on:click={() => saveRow(row)}>
                                    💾
                                </button>
                                <button class="row-action delete" on:click={() => {
                                    gridData = gridData.filter(r => r.id !== row.id);
                                }}>
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    {/each}
                    
                    {#if gridData.length === 0}
                        <tr>
                            <td colspan={columns.length + 1} class="empty-state">
                                <div class="empty-content">
                                    <p>👥 Nessun membro nel modulo</p>
                                    <button class="grid-btn primary" on:click={addNewRow}>
                                        ➕ Aggiungi il primo membro
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .dynamic-grid-container {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .grid-header {
        background: #f8f9fa;
        padding: 20px;
        border-bottom: 1px solid #e1e5e9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .grid-header h3 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.3em;
    }
    
    .grid-actions {
        display: flex;
        gap: 10px;
    }
    
    .grid-btn {
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.3s;
        font-weight: 500;
    }
    
    .grid-btn.primary {
        background: #27ae60;
        color: white;
    }
    
    .grid-btn.primary:hover {
        background: #229954;
        transform: translateY(-1px);
    }
    
    .grid-btn.secondary {
        background: #ecf0f1;
        color: #34495e;
        border: 1px solid #bdc3c7;
    }
    
    .grid-btn.secondary:hover {
        background: #d5dbdb;
    }
    
    .loading-state {
        padding: 40px;
        text-align: center;
        color: #666;
    }
    
    .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .grid-table {
        overflow-x: auto;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95em;
    }
    
    th {
        background: #34495e;
        color: white;
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid #2c3e50;
    }
    
    td {
        padding: 10px 15px;
        border-bottom: 1px solid #ecf0f1;
        vertical-align: middle;
    }
    
    .grid-row {
        transition: background-color 0.3s;
    }
    
    .grid-row:hover {
        background: #f8f9fa;
    }
    
    .grid-row.new-row {
        background: #e8f5e8;
    }
    
    .actions-cell {
        width: 100px;
        text-align: center;
    }
    
    .row-action {
        background: none;
        border: none;
        font-size: 1.1em;
        cursor: pointer;
        padding: 5px;
        margin: 0 2px;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .row-action:hover {
        background: rgba(0,0,0,0.1);
    }
    
    .empty-state {
        text-align: center;
        padding: 40px;
    }
    
    .empty-content p {
        color: #666;
        margin-bottom: 20px;
        font-size: 1.1em;
    }
</style>