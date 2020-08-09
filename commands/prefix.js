const { PREFIX } = process.env
const mongoose = require('mongoose')
const Prefix = mongoose.model('Prefix')

exports.run = async (bot, msg, args, prefix) => {
    if (!args[0]) {
        return msg.channel.send(`My prefix is \`${prefix}\` \n\n**Usage:** \`${prefix}prefix [new prefix]\``)
    }
    if (!msg.member.hasPermission('MANAGE_GUILD'))
        return msg.channel.send('**Error:** You must have the \`Manage Server\` permission')

    const dbPrefix = await Prefix.findById(msg.guild.id)
    if (dbPrefix) {
        return dbPrefix
            .update({ prefix: args[0] })
            .then(() =>
                msg.channel.send(`<:check:335544753443831810> Prefix has been updated to \`${args[0]}\``))
    }
    const newPrefix = new Prefix({ _id: msg.guild.id, prefix: args[0] })
    return newPrefix
        .save()
        .then(() =>
            msg.channel.send(`<:check:335544753443831810> Prefix has been updated to \`${args[0]}\``))
        .catch(e => msg.channel.send('**Error:** Failed to update prefix'))
}
exports.help = {
    name: 'prefix',
    desc: 'Change the bot\'s prefix',
    usage: `prefix [new prefix]`,
    category: 'Bot',
    aliases: []
}
