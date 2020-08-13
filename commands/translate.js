const { COLOR } = process.env
const { MessageEmbed } = require('discord.js')
const translate = require('@vitalets/google-translate-api')
const language = require('../db/language.json')

exports.run = async (bot, msg, args, prefix) => {
    console.log({
        server_name: msg.guild.name,
        server_id: msg.guild.id,
        author_name: `${msg.author.username}#${msg.author.discriminator}`,
        author_id: msg.author.id,
        content: msg.content
    })


    if (args.length < 2)
        return msg.channel.send(`**Usage:** \`${prefix}translate [language] [text]\`\n\nValid language codes: <https://gist.github.com/voidpls/515dd56ca906d4de9b9cc7e12d566064>`)

    let toLang = args.shift().toLowerCase()
    const text = args.join(' ')

    if (language[toLang]) toLang = language[toLang]
    else toLang = toLang.charAt(0).toUpperCase() + toLang.substr(1).toLowerCase()

    const translated = await translate(text, { to: toLang }).catch(e => msg.channel.send(`**Error:** ${e.message}`))
    if (!translated || !translated.from) return

    const fromLangISO = translated.from.language.iso.toLowerCase()
    const fromLang = language[fromLangISO]

    const embed = new MessageEmbed()
        .setColor(COLOR)
        .setAuthor('Google Translate',
            'https://upload.wikimedia.org/wikipedia/commons/d/db/Google_Translate_Icon.png')
        .setDescription(`**${fromLang}** to **${toLang}**:\n${translated.text}`)

    msg.channel
        .send(embed)
        .catch(e => msg.channel.send(`**Error:** ${e.message}`))
}

exports.help = {
    name: 'translate',
    desc: 'Translate text to another language',
    usage: 'translate [text]',
    category: 'Utilities',
    aliases: ['tr']
}
