const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ImagemSchema = new Schema({
  filename: String,
  mimetype: String,
  image_data: Buffer,
});

// Cria o model e exporta ele
module.exports = ImagemSchema;