const { BOT_TOKEN } = process.env
const clean = text => {
    if (typeof text === 'string') {
        return text
            .replace(/`/g, '`' + String.fromCharCode(8203))
            .replace(/@/g, '@' + String.fromCharCode(8203))
            .replace(new RegExp(BOT_TOKEN.replace(/\./g, '\.'), 'g'), 'Nice Try')
    } else {
        return text
    }
}
exports.run = async (bot, msg, args, prefix) => {
    try {
        let evaled = eval(args.join(' '))
        if (typeof evaled !== 'string') {
            evaled = require('util').inspect(evaled)
        }
        msg.channel
            .send('>>> ```xl\n' + clean(evaled) + '```')
            .catch(e =>
                msg.channel.send(`>>> \`ERROR\` \`\`\`xl\n${clean(e)}\n\`\`\``)
            )
    } catch (err) {
        msg.channel.send(`>>> \`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``)
    }
}

exports.help = {
    name: 'eval'
}
