const { USER_REGEX } = process.env
const userRegex = new RegExp(USER_REGEX)
const mongoose = require('mongoose')
const Blacklist = mongoose.model('Blacklist')

exports.run = async (bot, msg, args, prefix) => {
    if (!msg.member.hasPermission('MANAGE_GUILD'))
        return msg.channel.send('**Error:** You must have the \`Manage Server\` permission')
    if (!args[0])
        return msg.channel.send('**Error:** Please specify a user')
    const memberID = args[0].match(userRegex) || null
    if (!memberID)
        return msg.channel.send(`**Error:** Member \`${args[0]}\` not found`)
    const targetMember = await msg.guild.members.fetch(memberID[2]).catch(e => {})
    const guildMember = await msg.member.fetch()
    if (!targetMember) return msg.channel.send(`**Error:** Member \`${args[0]}\` not found`)
    if (msg.author.id === targetMember.id ||
            targetMember.roles.highest.position >= guildMember.roles.highest.position)
        return msg.channel.send(`**Error:** That user has a higher role than you`)

    let dbGuild = await Blacklist.findById(msg.guild.id)
    if (!dbGuild) {
        const newGuild = new Blacklist({_id: msg.guild.id})
        dbGuild = await newGuild.save()
    }

    if (dbGuild.users.indexOf(targetMember.id) > -1) {
        const index = dbGuild.users.indexOf(targetMember.id)
        dbGuild.users.splice(index, 1)
        dbGuild.save()
            .then(() =>
                msg.channel.send(`<:check:335544753443831810> Removed blacklist for user \`${targetMember.user.username}#${targetMember.user.discriminator}\``))
            .catch(e => msg.channel.send('**Error:** Failed to remove blacklist'))
    }
    else {
        dbGuild.users.push(targetMember.id)
        dbGuild.save()
            .then(() =>
                msg.channel.send(`<:check:335544753443831810> Blacklisted user \`${targetMember.user.username}#${targetMember.user.discriminator}\``))
            .catch(e => msg.channel.send('**Error:** Failed to blacklist user'))
    }
}

exports.help = {
    name: 'blacklist',
    desc: 'Blacklist/whitelist a member from using commands',
    usage: `blacklist [member]`,
    category: 'Moderation',
    aliases: []
}
