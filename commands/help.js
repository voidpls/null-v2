const { COLOR } = process.env
const { MessageEmbed } = require('discord.js')

exports.run = async (bot, msg, args, prefix) => {
    if (args[0]) {
        const cmd = args[0].toLowerCase()
        let cmdFile = bot.commands.get(cmd)
        if (!cmdFile) {
            cmdFile = bot.commands.find(c => c.help.aliases.includes(cmd))
            if (!cmdFile) return msg.channel.send(`**Error:** Command \`${cmd}\` not found`)
        }
        const name = cmdFile.help.name[0].toUpperCase() + cmdFile.help.name.substr(1)
        const aliases = [cmdFile.help.name].concat(cmdFile.help.aliases)//.map(a => `\`${a}\``)
        const embed = new MessageEmbed()
            .setColor(COLOR)
            .setAuthor(name, bot.user.avatarURL({format:'png', size:128, dynamic:true}))
            .setDescription(cmdFile.help.desc)
            .addField('Usage', `**\`${prefix}${cmdFile.help.usage}\`**`)
            .addField('Aliases', aliases.join(' | '))
        return msg.channel.send(embed)
    }
    const embed = new MessageEmbed()
        .setColor(COLOR)
        .setAuthor(`${bot.user.username} Bot Help`, bot.user.avatarURL({format:'png', size:128, dynamic:true}))
        .setDescription(`**\`${prefix}invite\`** for my support server and invite. My prefix is **\`${prefix}\`**`)
        .setFooter(`Use ${prefix}help [command] for command specific help!`)

    const categories = [...new Set(bot.commands.map(c => c.help.category))].sort()
    categories.map(category => {
        const cmds = bot.commands
            .filter(cmd => cmd.help.category === category)
            .map(cmd => `**\`${cmd.help.name[0].toUpperCase() + cmd.help.name.substr(1)}\`**`)
        embed.addField(category, cmds.join(' '), true)
    })

    return msg.channel.send(embed)
}

exports.help = {
    name: 'help',
    desc: 'View commands or command info',
    usage: `help [command]`,
    category: 'Bot',
    aliases: ['cmd', 'command']
}
