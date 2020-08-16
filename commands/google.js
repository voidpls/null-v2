const { MessageEmbed } = require('discord.js')
const google = require('google-it')
const { COLOR } = process.env
google.resultsPerPage = 10

exports.run = async (bot, msg, args, prefix) => {
    if (!args[0])
        return msg.channel.send('**Error:** Please specify a search query!')

    const query = args.join(' ')

    const results = await google({query, disableConsole:true, limit:7})
    if (results.length === 0) return msg.channel.send(`**Error:** No results found for **\`${query}\`**`)
    if (results.length > 3) results.length = 3
    let embed = new MessageEmbed()
        .setAuthor('Google Search', 'https://i.imgur.com/govPG2V.png')
        .setColor(COLOR)
        .setDescription(`Search results for: **${query}**`)
        // .setFooter(`www.google.com/search?&q=${args.join('%20')}`)
    results.forEach(r => embed.addField(r.title, `**${r.link}**`))
    return msg.channel.send(embed)
        .catch(e => msg.channel.send('**Error: **' + e.message))
}

exports.help = {
    name: 'google',
    desc: 'Look something up',
    usage: `google [query]`,
    category: 'Utilities',
    aliases: ['search']
}
