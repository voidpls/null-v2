const mongoose = require('mongoose')

const blacklistSchema = new mongoose.Schema({
    _id: String,
    users: [String]
})

module.exports = mongoose.model('Blacklist', blacklistSchema)
