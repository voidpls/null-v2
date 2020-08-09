exports.run = async (bot, msg, args, prefix) => {
    const m = await msg.channel.send('**Pong.** Ping took `    `.')
    const diff = m.createdTimestamp - msg.createdTimestamp
    m.edit(`**Pong.** Ping took \` ${diff}ms \`.`)
}

exports.help = {
    name: 'ping',
    desc: 'Test the bot\'s latency',
    usage: `ping`,
    category: 'Bot',
    aliases: ['pong']
}
