const express = require('express');
const multer = require('multer');
const path = require('path');
const imagemModel = require('../Database/Models/imagemModel')
const connection = require('../Database/connection');
const mongoose = require('mongoose');
const produtos = require('../Database/Models/Produtos');

const Router = express.Router();

// Configurar o multer para upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ========== ROTAS DE PRODUTOS ==========

// ======= LISTAR PRODUTOS =======
Router.get('/getItems', async (req, res) => {
  try {
    console.log('Buscando produtos...');
    
    // CORREÇÃO: Buscar produtos SEM populate primeiro
    const items = await connection.produtosConnection.find({});
    
    console.log(`Encontrados ${items.length} produtos`);
    
    // Mapear e incluir informações de debug
    const itensComId = items.map(item => {
      console.log('Produto:', {
        id: item._id,
        nome: item.nome,
        urlImagem: item.urlImagem,
        urlImagemTipo: typeof item.urlImagem
      });
      
      return {
        ...item._doc,
        id: item._id
      };
    });
    
    res.json(itensComId);
    
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ message: "Erro ao buscar produtos", error: err.message });
  }
});

// ======= ROTA PARA TESTAR SE IMAGEM EXISTE =======
Router.get('/test-imagem/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Testando imagem ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido', id: id });
    }

    const imagem = await connection.imagensConnection.findById(id);
    
    if (!imagem) {
      return res.status(404).json({ 
        error: 'Imagem não encontrada', 
        id: id,
        message: 'Verifique se o ID está correto'
      });
    }

    return res.json({
      id: imagem._id,
      filename: imagem.filename,
      mimetype: imagem.mimetype,
      hasData: !!imagem.image_data,
      dataSize: imagem.image_data ? imagem.image_data.length : 0
    });

  } catch (err) {
    console.error('Erro ao testar imagem:', err);
    res.status(500).json({ error: 'Erro interno', message: err.message });
  }
});

// ======= SALVAR PRODUTO + IMAGEM =======
Router.post('/saveItems', upload.single('imagem'), async (req, res) => {
  try {
    console.log('Salvando produto:', req.body);
    console.log('Arquivo recebido:', req.file ? 'Sim' : 'Não');

    const { nome, descricao, categoria, preco } = req.body;
    if (!nome || !descricao || !categoria || preco === undefined) {
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos (nome, descricao, categoria, preco).' });
    }

    const precoNum = parseFloat(preco);
    if (!isFinite(precoNum)) {
      return res.status(400).json({ message: 'Preço inválido.' });
    }

    // Verificar se arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ message: 'Imagem é obrigatória.' });
    }

    // Salva imagem primeiro
    const imagemDoc = await connection.imagensConnection.create({
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      image_data: req.file.buffer
    });
    
    console.log('Imagem salva com ID:', imagemDoc._id);

    // Cria produto referenciando a imagem
    const produtoData = {
      nome,
      descricao,
      categoria,
      preco: precoNum,
      urlImagem: imagemDoc._id // CORREÇÃO: Salvar só o ID
    };

    const novoProduto = await connection.produtosConnection.create(produtoData);
    console.log('Produto criado com ID:', novoProduto._id);

    return res.status(201).json({
      message: 'Produto e imagem salvos com sucesso',
      produto: {
        id: novoProduto._id,
        nome: novoProduto.nome,
        urlImagem: novoProduto.urlImagem,
        imagemId: imagemDoc._id
      }
    });

  } catch (err) {
    console.error('Erro ao salvar produto/imagem:', err);
    return res.status(500).json({
      message: 'Erro ao salvar produto/imagem',
      error: err.message
    });
  }
});

// ======= ATUALIZAR PRODUTO (+ imagem opcional) =======
Router.post('/updateItems', upload.single('imagem'), async (req, res) => {
  const { id, nome, descricao, categoria } = req.body;
  const preco = req.body.preco ? parseFloat(req.body.preco) : 0;

  if (!id) return res.status(400).json({ message: "ID do produto não fornecido para atualização." });

  try {
    console.log('Atualizando produto:', id);

    const produtoId = new mongoose.Types.ObjectId(id);
    const produto = await connection.produtosConnection.findById(produtoId);
    if (!produto) return res.status(404).json({ message: "Produto não encontrado." });

    // Atualiza campos do produto
    await connection.produtosConnection.updateOne(
      { _id: produtoId },
      { $set: { nome, descricao, categoria, preco } }
    );

    // Se veio nova imagem, atualiza o documento de imagem referenciado OU cria um novo e atualiza o produto
    if (req.file) {
      if (produto.urlImagem) {
        // Atualiza imagem existente
        await connection.imagensConnection.updateOne(
          { _id: produto.urlImagem },
          {
            $set: {
              filename: req.file.originalname,
              mimetype: req.file.mimetype,
              image_data: req.file.buffer
            }
          },
          { upsert: true }
        );
        console.log('Imagem atualizada:', produto.urlImagem);
      } else {
        // Cria nova imagem e vincula ao produto
        const novaImagem = await connection.imagensConnection.create({
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          image_data: req.file.buffer
        });
        await connection.produtosConnection.updateOne(
          { _id: produtoId },
          { $set: { urlImagem: novaImagem._id } }
        );
        console.log('Nova imagem criada e vinculada:', novaImagem._id);
      }
    }

    res.status(200).json({ message: "Produto atualizado com sucesso." });

  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({
      message: "Erro interno ao atualizar produto.",
      error: err.message
    });
  }
});

// ======= ROTA PARA SERVIR IMAGEM PELO ID DA IMAGEM =======
Router.get('/imagem/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando imagem com ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('ID inválido:', id);
      return res.status(400).send('ID inválido');
    }

    const imagem = await connection.imagensConnection.findById(id);
    
    if (!imagem) {
      console.log('Imagem não encontrada:', id);
      return res.status(404).send('Imagem não encontrada');
    }

    console.log('Imagem encontrada:', {
      id: imagem._id,
      filename: imagem.filename,
      mimetype: imagem.mimetype,
      hasData: !!imagem.image_data
    });

    res.set('Content-Type', imagem.mimetype);
    return res.send(imagem.image_data);

  } catch (err) {
    console.error('Erro ao buscar imagem:', err);
    res.status(500).send('Erro ao buscar imagem: ' + err.message);
  }
});

// ======= DELETAR PRODUTO + IMAGEM ASSOCIADA =======
Router.delete('/deleteItem/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const produtoId = new mongoose.Types.ObjectId(id);
    const produto = await connection.produtosConnection.findById(produtoId);
    if (!produto) return res.status(404).send('Produto não encontrado');

    // Deleta imagem referenciada (se tiver)
    if (produto.urlImagem) {
      await connection.imagensConnection.findByIdAndDelete(produto.urlImagem);
      console.log('Imagem deletada:', produto.urlImagem);
    }

    // Deleta produto
    await connection.produtosConnection.findByIdAndDelete(produtoId);

    console.log('Produto e imagem deletados');
    res.sendStatus(200);

  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    res.status(500).send("Erro ao deletar produto: " + err.message);
  }
});

// ========== ROTAS DE NOTAS FISCAIS ==========

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

// ========== IMPORTANTE: EXPORTAÇÃO DO ROUTER ==========
module.exports = Router;