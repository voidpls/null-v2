const mongoose = require('mongoose')

const weatherSchema = new mongoose.Schema({
    userID: String,
    location: String
})
// const weatherSchema = new mongoose.Schema({
//     userID: String,
//     location: {
//         lat: String,
//         long: String,
//         formatted: String
//     }
// })
exports = mongoose.model('WeatherVC', weatherSchema)
// exports = mongoose.model('Weather', weatherSchema, 'weather')
