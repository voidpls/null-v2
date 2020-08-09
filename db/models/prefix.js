const mongoose = require('mongoose')

const prefixSchema = new mongoose.Schema({
    _id: String,
    prefix: String
})

module.exports = mongoose.model('Prefix', prefixSchema)
