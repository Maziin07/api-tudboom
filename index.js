const express = require('express');
const cors = require('cors');
const mainRouter = require("./Router/mainRouter");
require("./Database/connection");

const app = express();
const port = 1409;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", mainRouter);


app.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
    console.log(`Teste: http://localhost:${port}/health`); 
});