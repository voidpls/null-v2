require('dotenv').config()
const { BOT_TOKEN, PREFIX, DISABLED_EVENTS, OWNER } = process.env
const { Client, Collection } = require('discord.js')
const mongoose = require('mongoose')
const mongoHandler = require('./db/mongoHandler.js')
const Prefix = mongoose.model('Prefix')
const fs = require('fs')
const util = require('util')
const readdir = util.promisify(fs.readdir)

const bot = new Client({
    disabledEvents: DISABLED_EVENTS.split(','),
    disableEveryone: true,
    messageCacheMaxSize: 100
})

bot.commands = new Collection()
bot.devCommands = new Collection()

bot.on('ready', async () => {
    console.log(`DISCORD: Logged in as ${bot.user.username}`)
    const usercount = bot.guilds.cache.map(g => g.memberCount).reduce((g1, g2) => g1 + g2)
    console.log(`DISCORD: Bot is serving ${usercount} members`)
    console.log(`DISCORD: Bot is serving ${bot.guilds.cache.size} guilds`)
    setInterval(() => {
        bot.user.setPresence({ activity: { name: 'Undergoing V2 Rewrite', type: 'PLAYING' }})
    },60000)
})

bot.on('message', async msg => {
    if (msg.author.id === bot.user.id || msg.author.bot || msg.channel.type !== 'text') return
    const regStr = `^<@!?${bot.user.id}> `
    const regex = new RegExp(regStr)
    const guildPrefix = await Prefix.findById(msg.guild.id)
    const prefix = msg.content.match(regex) ? msg.content.match(regex)[0] : (guildPrefix ? guildPrefix.prefix : PREFIX)
    const staticPrefix = guildPrefix ? guildPrefix.prefix : PREFIX
    if (!msg.content.startsWith(prefix)) return

    const content = msg.content.slice(prefix.length).trim()
    const args = content
        .split(' ')
        .slice(1)
    const cmd = content
        .split(' ')[0]
        .toLowerCase()

    console.log(prefix, args, cmd)

    // COMMAND HANDLER
    let cmdFile = bot.commands.get(cmd)
    if (cmdFile) return cmdFile.run(bot, msg, args, staticPrefix)
    else {
        cmdFile = bot.commands.find(c => c.help.aliases.includes(cmd))
        if (cmdFile) return cmdFile.run(bot, msg, args, staticPrefix)
    }
    // DEV COMMAND HANDLER
    cmdFile = bot.devCommands.get(cmd)
    if (cmdFile && msg.author.id === OWNER) return cmdFile.run(bot, msg, args, staticPrefix)
})


bot.on('error', console.error)

const loadCommands = async (dir, key) => {
    try {
        const files = await readdir(`./${dir}`)
        files
            .filter(f => f.endsWith('.js'))
            .map(f => {
                const props = require(`./${dir}/${f}`)
                bot[key].set(props.help.name.toLowerCase(), props)
            })
    } catch (e) {
        return console.log(e)
    }
    console.log(`DISCORD: Loaded ${bot[key].size} command(s) from ${dir}`)
}

loadCommands('commands', 'commands')
loadCommands('dev_commands', 'devCommands')
mongoHandler.connect()

bot.login(BOT_TOKEN).catch(e => console.log('DISCORD: Login failed:', e.message))

// const cooldown = new Set()
// const cooldown2 = new Set()
