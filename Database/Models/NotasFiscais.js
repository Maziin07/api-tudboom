const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Schema para itens da nota fiscal
const ItemNotaFiscalSchema = new Schema({
    description: { 
        type: String, 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    unitPrice: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    total: { 
        type: Number, 
        required: true, 
        min: 0 
    }
});

// Schema principal da nota fiscal
const NotasFiscaisSchema = new Schema({
    invoiceNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    
    // Dados do cliente
    clientName: { 
        type: String, 
        required: true 
    },
    clientEmail: { 
        type: String, 
        required: true 
    },
    clientPhone: { 
        type: String 
    },
    clientCpfCnpj: { 
        type: String, 
        required: true 
    },
    clientAddress: { 
        type: String, 
        required: true 
    },
    
    // Itens da nota fiscal
    items: [ItemNotaFiscalSchema],
    
    // Valores financeiros
    subtotal: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    tax: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    total: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    
    // Informações de controle
    issueDate: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['emitida', 'cancelada', 'pendente'], 
        default: 'emitida' 
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Exportar o schema (não o modelo)
module.exports = NotasFiscaisSchema;