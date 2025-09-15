// Importar a biblioteca do Mongoose
const mongoose = require('mongoose');

// Importar os schemas
const ProdutosSchema = require('./Models/Produtos');
const NotasFiscaisSchema = require('./Models/NotasFiscais');
const imagemSchema = require('./Models/imagemModel');

let produtosConnection;
let notasFiscaisConnection;
let imagensConnection;

// Criar a conexão com o banco de dados
const connection = mongoose.createConnection('mongodb+srv://Marcelinho:admintudboom@tudboomcluster.viwya5s.mongodb.net/Estoque?retryWrites=true&w=majority&appName=TudboomCluster');

// Mensagens de Erro/Sucesso da Conexão
connection.on('error', (err) => {
    console.log('Erro ao se conectar no DB ' + err);
});

connection.on('open', () => {
    console.log('Conexão Estabelecida com o DB');
});

// Criar os modelos de conexão corretamente
produtosConnection = connection.model(
    'Produtos',
    ProdutosSchema,
    'Produtos'
);

// Especificar a coleção 'Notas'
notasFiscaisConnection = connection.model(
    'NotasFiscais',
    NotasFiscaisSchema,
    'Notas'
);

// Nome e modelo consistentes
imagensConnection = connection.model(
    'Imagens', // Nome do modelo 
    imagemSchema,
    'imagens' //  Nome da coleção no MongoDB
);

// Exportar o módulo com nomes consistentes
module.exports = { 
    produtosConnection,
    notasFiscaisConnection,
    imagensConnection
};