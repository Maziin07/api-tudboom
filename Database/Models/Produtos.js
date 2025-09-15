const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ProdutosSchema = new Schema (
    {
        nome: { type: String },
        descricao: { type: String },
        categoria: { type: String },
        preco: {type: Number },
        urlImagem: { type: mongoose.Schema.Types.ObjectId, ref: 'Imagens' }

    }
);

module.exports = ProdutosSchema;