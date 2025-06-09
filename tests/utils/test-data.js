/**
 * Dati di Test Realistici per Test Pratici
 * Contiene scenari reali per testare il sistema SSOT
 */

class TestData {
    static getPersoneData() {
        return [
            {
                nome: 'Mario',
                cognome: 'Rossi',
                eta: 35,
                entityType: 'Persona'
            },
            {
                nome: 'Luigi',
                cognome: 'Verdi',
                eta: 28,
                entityType: 'Persona'
            },
            {
                nome: 'Anna',
                cognome: 'Bianchi',
                eta: 32,
                entityType: 'Persona'
            },
            {
                nome: 'Marco',
                cognome: 'Neri',
                eta: 45,
                entityType: 'Persona'
            },
            {
                nome: 'Sara',
                cognome: 'Ferrari',
                eta: 29,
                entityType: 'Persona'
            }
        ];
    }

    static getAziendeData() {
        return [
            {
                nome: 'TechCorp S.r.l.',
                settore: 'Tecnologia',
                dipendenti: 150,
                entityType: 'Azienda'
            },
            {
                nome: 'FinanceInc',
                settore: 'Servizi Finanziari',
                dipendenti: 85,
                entityType: 'Azienda'
            },
            {
                nome: 'StartupXYZ',
                settore: 'Innovazione',
                dipendenti: 12,
                entityType: 'Azienda'
            }
        ];
    }

    static getPersonaSchema() {
        return {
            mode: 'flexible',
            attributes: {
                nome: {
                    type: 'string',
                    required: true,
                    description: 'Nome della persona'
                },
                cognome: {
                    type: 'string',
                    required: true,
                    description: 'Cognome della persona'
                },
                eta: {
                    type: 'number',
                    required: false,
                    description: 'Età della persona'
                }
            }
        };
    }

    static getAziendaSchema() {
        return {
            mode: 'flexible',
            attributes: {
                nome: {
                    type: 'string',
                    required: true,
                    description: 'Nome dell\'azienda'
                },
                settore: {
                    type: 'string',
                    required: false,
                    description: 'Settore di attività'
                },
                dipendenti: {
                    type: 'number',
                    required: false,
                    description: 'Numero di dipendenti'
                }
            }
        };
    }

    static getLavoraRelationSchema() {
        return {
            sourceTypes: ['Persona'],
            targetTypes: ['Azienda'],
            cardinality: 'N:1',
            attributes: {
                dataInizio: {
                    type: 'date',
                    required: true,
                    description: 'Data inizio rapporto di lavoro'
                },
                ruolo: {
                    type: 'string',
                    required: true,
                    description: 'Ruolo ricoperto'
                },
                stipendio: {
                    type: 'number',
                    required: false,
                    description: 'Stipendio mensile'
                }
            }
        };
    }

    static getLavoraRelationsData(persone, aziende) {
        // Crea relazioni realistiche persona -> azienda
        return [
            {
                relationType: 'Lavora',
                sourceEntityId: persone[0].id, // Mario -> TechCorp
                targetEntityId: aziende[0].id,
                dataInizio: '2022-01-15',
                ruolo: 'Software Developer',
                stipendio: 2800
            },
            {
                relationType: 'Lavora',
                sourceEntityId: persone[1].id, // Luigi -> TechCorp
                targetEntityId: aziende[0].id,
                dataInizio: '2023-03-10',
                ruolo: 'Junior Developer',
                stipendio: 2200
            },
            {
                relationType: 'Lavora',
                sourceEntityId: persone[2].id, // Anna -> FinanceInc
                targetEntityId: aziende[1].id,
                dataInizio: '2021-09-01',
                ruolo: 'Financial Analyst',
                stipendio: 3200
            },
            {
                relationType: 'Lavora',
                sourceEntityId: persone[3].id, // Marco -> FinanceInc
                targetEntityId: aziende[1].id,
                dataInizio: '2020-05-20',
                ruolo: 'Senior Manager',
                stipendio: 4500
            },
            {
                relationType: 'Lavora',
                sourceEntityId: persone[4].id, // Sara -> StartupXYZ
                targetEntityId: aziende[2].id,
                dataInizio: '2023-07-01',
                ruolo: 'Product Manager',
                stipendio: 3000
            }
        ];
    }

    static getSchemaEvolutionSteps() {
        return [
            {
                name: 'Aggiungi Email a Persona',
                entityType: 'Persona',
                evolution: {
                    addAttributes: {
                        email: {
                            type: 'email',
                            required: false,
                            description: 'Indirizzo email della persona'
                        }
                    }
                }
            },
            {
                name: 'Aggiungi Telefono a Persona',
                entityType: 'Persona',
                evolution: {
                    addAttributes: {
                        telefono: {
                            type: 'string',
                            required: false,
                            description: 'Numero di telefono'
                        }
                    }
                }
            },
            {
                name: 'Aggiungi Indirizzo Sede a Azienda',
                entityType: 'Azienda',
                evolution: {
                    addAttributes: {
                        indirizzo: {
                            type: 'string',
                            required: false,
                            description: 'Indirizzo sede principale'
                        }
                    }
                }
            }
        ];
    }

    static getUpdateScenarios(persone) {
        return [
            {
                entityId: persone[0].id,
                attributeName: 'email',
                value: 'mario.rossi@techcorp.com'
            },
            {
                entityId: persone[1].id,
                attributeName: 'telefono',
                value: '+39 333 1234567'
            },
            {
                entityId: persone[2].id,
                attributeName: 'email',
                value: 'anna.bianchi@financeinc.com'
            }
        ];
    }
}

module.exports = TestData;