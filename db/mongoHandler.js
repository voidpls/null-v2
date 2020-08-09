const mongoose = require('mongoose')
const { MONGO_URI } = process.env
const fs = require('fs')
const path = require('path')

// When successfully connected
mongoose.connection.once('connected', () => {
    console.log(`MongoDB: Connection open`)
})

// If the connection throws an error
mongoose.connection.on('error', err => {
    console.log(`MongoDB: Connection error: ${err}`)
})

// When the connection is disconnected
mongoose.connection.once('disconnected', () => {
    console.log(`MongoDB: Connection disconnected`)
})

// If the Node process ends, close the Mongoose connection
process.once('SIGINT', () => {
    console.log('MongoDB: Connection terminated')
    mongoose.connection.close(() => process.exit(0))
})

const loadSchemas = (dir) => {
    try {
        const fullpath = path.join(__dirname, dir)
        const files = fs.readdirSync(fullpath)
        jsfiles = files
            .filter(f => f.endsWith('.js'))
            .map(f => require(`${fullpath}/${f}`))
        console.log(`MongoDB: Loaded ${jsfiles.length} models`)
    } catch (e) {
        return console.log(e)
    }
}
loadSchemas('models')


exports.connect = () => {
    return mongoose.connect(
        MONGO_URI,
        {
            keepAlive: true,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    )
}

// require('./tag.js')
// require('./weather.js')
// require('./prefix.js')
