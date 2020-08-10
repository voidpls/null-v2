const { INVITE, COLOR, SUPPORT_SERVER } = process.env
const { MessageEmbed } = require('discord.js')

exports.run = async (bot, msg, args, prefix) => {
    const embed = new MessageEmbed()
        .setColor(COLOR)
        .setAuthor(`${bot.user.username} Invite`, bot.user.avatarURL({format:'png', size:128, dynamic:true}))
        .addField('Support Server', `[here](${SUPPORT_SERVER})`)
        .addField('Bot Invite', `[here](${INVITE})`)
    msg.channel
        .send(embed)
        .catch(e => {
            const message = `**Support Server:** ${SUPPORT_SERVER}\n`+
                `**Bot Invite:** <${INVITE}>`
            msg.channel.send(message)
        })
}

exports.help = {
    name: 'invite',
    desc: 'Sends bot invite link and support server',
    usage: 'invite',
    category: 'Bot',
    aliases: []
}
