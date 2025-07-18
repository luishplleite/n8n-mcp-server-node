import { INodeType, INodeTypeDescription, IExecuteFunctions, NodePropertyTypes, INodeExecutionData } from 'n8n-workflow';
import axios from 'axios';

export class McpServer implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'MCP Server',
        name: 'mcpServer',
        icon: 'https://www.institutoamigu.org.br/logo-amigu-azul.png', // Usando o ícone da imagem fornecida
        group: ['input'],
        version: 1,
        description: 'Interage com o MCP Server para acionar endpoints e obter dados.',
        defaults: {
            name: 'MCP Server',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'URL Base do MCP Server',
                name: 'mcpBaseUrl',
                type: 'string',
                default: 'https://n8n.timepulseai.com.br/mcp/',
                placeholder: 'https://n8n.timepulseai.com.br/mcp/',
                description: 'A URL base do seu MCP Server.',
                required: true,
            },
            {
                displayName: 'ID do Workflow do MCP Server',
                name: 'mcpWorkflowId',
                type: 'string',
                default: '71b6fb6c-d752-4e8d-b747-ae80271f22a7',
                placeholder: '71b6fb6c-d752-4e8d-b747-ae80271f22a7',
                description: 'O ID do workflow que contém o MCP Server Trigger.',
                required: true,
            },
            {
                displayName: 'Endpoint para Acionar',
                name: 'endpointToTrigger',
                type: 'options',
                default: '',
                description: 'Selecione o endpoint do MCP Server que deseja acionar.',
                options: [],
                typeOptions: {
                    loadOptionsMethod: 'loadMcpEndpoints',
                },
            },
            {
                displayName: 'Dados para Enviar',
                name: 'dataToSend',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        endpointToTrigger: [
                            {
                                value: NodePropertyTypes.Collection,
                            },
                        ],
                    },
                },
                description: 'Dados JSON para enviar para o endpoint selecionado (corpo da requisição).',
            },
        ],
    };

    async loadMcpEndpoints(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
        const mcpBaseUrl = this.getNodeParameter('mcpBaseUrl', 0) as string;
        const mcpWorkflowId = this.getNodeParameter('mcpWorkflowId', 0) as string;

        if (!mcpBaseUrl || !mcpWorkflowId) {
            return [{ name: 'Nenhum Endpoint Encontrado', value: '' }];
        }

        try {
            // Em um cenário real, você teria um endpoint no MCP Server para listar as ferramentas.
            // Para este tutorial, usamos os dados estáticos fornecidos.
            const mcpData = {
                "nodes": [
                    { "name": "Busca_cargorias_dos_Produtos" },
                    { "name": "Cria_salva_os_itens_do_pedidodo_Delivery_Mesa_Bacao" },
                    { "name": "Cria_pedido_do_Delivery_Mesa_Bacao" },
                    { "name": "Busca-De_Produto_no_carddapio" },
                    { "name": "Salva_dados_do_cliente" },
                    { "name": "Consulta_restaurante" }
                ]
            };

            const endpoints: { name: string; value: string }[] = mcpData.nodes
                .filter(node => node.name !== 'MCP Server Trigger')
                .map(node => ({
                    name: node.name.replace(/_/g, ' '),
                    value: node.name,
                }));

            if (endpoints.length === 0) {
                return [{ name: 'Nenhum Endpoint Encontrado', value: '' }];
            }

            return endpoints;

        } catch (error) {
            console.error('Erro ao carregar endpoints do MCP Server:', (error as Error).message);
            return [{ name: 'Erro ao Carregar Endpoints', value: '' }];
        }
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[][] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const mcpBaseUrl = this.getNodeParameter('mcpBaseUrl', itemIndex) as string;
            const mcpWorkflowId = this.getNodeParameter('mcpWorkflowId', itemIndex) as string;
            const endpointToTrigger = this.getNodeParameter('endpointToTrigger', itemIndex) as string;
            const dataToSend = this.getNodeParameter('dataToSend', itemIndex) as object;

            if (!endpointToTrigger) {
                throw new Error('Nenhum endpoint selecionado para acionar.');
            }

            const fullWebhookUrl = `${mcpBaseUrl}${mcpWorkflowId}/${endpointToTrigger}`;

            try {
                const response = await axios.post(fullWebhookUrl, dataToSend, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                returnData.push(this.helpers.returnJsonArray(response.data));
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push([{ json: { error: (error as Error).message } }]);
                    continue;
                }
                throw new Error(`Falha ao acionar o endpoint '${endpointToTrigger}': ${(error as Error).message}`);
            }
        }
        return returnData;
    }
}
