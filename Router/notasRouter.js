// ========== ROTAS DE NOTAS FISCAIS ==========
const express = require('express');
const multer = require('multer');

const connection = require("../Database/connection")
const Router = express.Router();

// Listar todas as notas fiscais
Router.get('/getNotasFiscais', async (req, res) => {
    try {
        console.log('Buscando notas fiscais...');
        const notas = await connection.notasFiscaisConnection.find({}).sort({ createdAt: -1 });
        console.log(`Encontradas ${notas.length} notas fiscais`);
        
        const notasComId = notas.map(nota => ({
            ...nota._doc,
            id: nota._id
        }));
        
        res.json(notasComId);
    } catch (err) {
        console.error("Erro ao buscar notas fiscais:", err);
        res.status(500).json({ message: "Erro ao buscar notas fiscais", error: err.message });
    }
});

// Buscar nota fiscal por ID
Router.get('/getNotaFiscalById/:id', async (req, res) => {
    try {
        console.log(`Buscando nota fiscal com ID: ${req.params.id}`);
        const nota = await connection.notasFiscaisConnection.findById(req.params.id);
        
        if (!nota) {
            console.log('Nota fiscal não encontrada');
            return res.status(404).json({ message: "Nota fiscal não encontrada" });
        }
        
        res.json({
            ...nota._doc,
            id: nota._id
        });
    } catch (err) {
        console.error("Erro ao buscar nota fiscal:", err);
        res.status(500).json({ message: "Erro ao buscar nota fiscal", error: err.message });
    }
});

// Criar nova nota fiscal 
Router.post('/saveNotaFiscal', async (req, res) => {
    try {
        console.log('Dados recebidos para salvar nota fiscal:', req.body);
        
        const {
            invoiceNumber,
            clientName,
            clientEmail,
            clientPhone,
            clientCpfCnpj,
            clientAddress,
            items,
            subtotal,
            tax,
            total,
            issueDate,
            status
        } = req.body;

        // Validação básica
        if (!invoiceNumber || !clientName || !clientEmail || !clientCpfCnpj || !clientAddress || !items || items.length === 0) {
            console.log('Validação falhou - campos obrigatórios não preenchidos');
            return res.status(400).json({ message: "Campos obrigatórios não preenchidos" });
        }

        // Verificar se já existe nota com o mesmo número
        const existingNota = await connection.notasFiscaisConnection.findOne({ invoiceNumber });
        if (existingNota) {
            console.log(`Nota fiscal com número ${invoiceNumber} já existe`);
            return res.status(400).json({ message: "Já existe uma nota fiscal com este número" });
        }

        // Preparar dados para salvar
        const dadosNota = {
            invoiceNumber,
            clientName,
            clientEmail,
            clientPhone,
            clientCpfCnpj,
            clientAddress,
            items,
            subtotal: parseFloat(subtotal),
            tax: parseFloat(tax),
            total: parseFloat(total),
            issueDate,
            status: status || 'emitida'
        };

        console.log('Salvando nota fiscal com dados:', dadosNota);

        // Criar nova nota fiscal
        const novaNota = new connection.notasFiscaisConnection(dadosNota);
        const notaSalva = await novaNota.save();

        console.log('Nota fiscal salva com sucesso:', notaSalva._id);

        res.status(201).json({ 
            message: 'Nota fiscal criada com sucesso',
            id: notaSalva._id,
            invoiceNumber: notaSalva.invoiceNumber
        });
    } catch (err) {
        console.error("Erro ao criar nota fiscal:", err);
        
        // Tratamento específico para erro de duplicata
        if (err.code === 11000) {
            return res.status(400).json({ message: "Número de nota fiscal já existe" });
        }
        
        res.status(500).json({ 
            message: "Erro ao criar nota fiscal", 
            error: err.message 
        });
    }
});

// Atualizar nota fiscal 
Router.put('/updateNotaFiscal/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log(`Atualizando nota fiscal ${id} com dados:`, updateData);

        // Converter valores numéricos
        if (updateData.subtotal) updateData.subtotal = parseFloat(updateData.subtotal);
        if (updateData.tax) updateData.tax = parseFloat(updateData.tax);
        if (updateData.total) updateData.total = parseFloat(updateData.total);

        const notaAtualizada = await connection.notasFiscaisConnection.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!notaAtualizada) {
            return res.status(404).json({ message: "Nota fiscal não encontrada" });
        }

        console.log('Nota fiscal atualizada com sucesso');

        res.json({ 
            message: "Nota fiscal atualizada com sucesso",
            nota: {
                ...notaAtualizada._doc,
                id: notaAtualizada._id
            }
        });
    } catch (err) {
        console.error("Erro ao atualizar nota fiscal:", err);
        res.status(500).json({ message: "Erro ao atualizar nota fiscal", error: err.message });
    }
});

// Deletar nota fiscal 
Router.delete('/deleteNotaFiscal/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deletando nota fiscal com ID: ${id}`);

        const notaDeletada = await connection.notasFiscaisConnection.findByIdAndDelete(id);
        
        if (!notaDeletada) {
            return res.status(404).json({ message: "Nota fiscal não encontrada" });
        }

        console.log('Nota fiscal deletada com sucesso');
        res.json({ message: "Nota fiscal deletada com sucesso" });
    } catch (err) {
        console.error("Erro ao deletar nota fiscal:", err);
        res.status(500).json({ message: "Erro ao deletar nota fiscal", error: err.message });
    }
});

// Atualizar status da nota fiscal
Router.patch('/updateNotaFiscalStatus/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['emitida', 'cancelada', 'pendente'].includes(status)) {
            return res.status(400).json({ message: "Status inválido" });
        }

        const notaAtualizada = await connection.notasFiscaisConnection.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
        );

        if (!notaAtualizada) {
            return res.status(404).json({ message: "Nota fiscal não encontrada" });
        }

        res.json({ 
            message: "Status atualizado com sucesso",
            status: notaAtualizada.status
        });
    } catch (err) {
        console.error("Erro ao atualizar status:", err);
        res.status(500).json({ message: "Erro ao atualizar status", error: err.message });
    }
});

// Buscar próximo número de nota fiscal disponível 
Router.get('/getNextInvoiceNumber', async (req, res) => {
    try {
        const lastNota = await connection.notasFiscaisConnection
            .findOne()
            .sort({ createdAt: -1 });

        let nextNumber = 1;
        if (lastNota && lastNota.invoiceNumber) {
            // Extrair o número da string (ex: "NF-000001" -> 1)
            const numberPart = lastNota.invoiceNumber.split('-')[1];
            if (numberPart) {
                nextNumber = parseInt(numberPart) + 1;
            }
        }

        console.log(`Próximo número de nota fiscal: ${nextNumber}`);

        res.json({ 
            nextNumber: nextNumber,
            invoiceNumber: `NF-${String(nextNumber).padStart(6, '0')}`
        });
    } catch (err) {
        console.error("Erro ao buscar próximo número:", err);
        res.status(500).json({ message: "Erro ao buscar próximo número", error: err.message });
    }
});

// Estatísticas das notas fiscais 
Router.get('/getNotasFiscaisStats', async (req, res) => {
    try {
        const stats = await connection.notasFiscaisConnection.aggregate([
            {
                $group: {
                    _id: null,
                    totalNotas: { $sum: 1 },
                    valorTotal: { $sum: "$total" },
                    emitidas: { $sum: { $cond: [{ $eq: ["$status", "emitida"] }, 1, 0] } },
                    canceladas: { $sum: { $cond: [{ $eq: ["$status", "cancelada"] }, 1, 0] } },
                    pendentes: { $sum: { $cond: [{ $eq: ["$status", "pendente"] }, 1, 0] } }
                }
            }
        ]);

        const result = stats[0] || {
            totalNotas: 0,
            valorTotal: 0,
            emitidas: 0,
            canceladas: 0,
            pendentes: 0
        };

        console.log('Estatísticas calculadas:', result);
        res.json(result);
    } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
        res.status(500).json({ message: "Erro ao buscar estatísticas", error: err.message });
    }
});

// Teste de conexão com o banco - NOVA ROTA PARA DEBUG
Router.get('/testNotasFiscaisConnection', async (req, res) => {
    try {
        // Testar se consegue contar os documentos
        const count = await connection.notasFiscaisConnection.countDocuments();
        
        // Testar se consegue buscar um documento
        const sample = await connection.notasFiscaisConnection.findOne();
        
        res.json({
            status: 'success',
            message: 'Conexão com NotasFiscais funcionando',
            totalDocuments: count,
            sampleDocument: sample ? 'Existe' : 'Nenhum documento encontrado',
            collectionName: connection.notasFiscaisConnection.collection.name
        });
    } catch (err) {
        console.error("Erro no teste de conexão:", err);
        res.status(500).json({
            status: 'error',
            message: 'Erro na conexão com NotasFiscais',
            error: err.message
        });
    }
});

module.exports = Router;