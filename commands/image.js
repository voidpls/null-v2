const { MessageEmbed, Collection } = require('discord.js')
const { image_search } = require('duckduckgo-images-api')
const { COLOR } = process.env
const collectors = new Collection()

async function collectMessage(msg, embedMsg, pageInd, totalPages, res, filter) {
    const channelCols = collectors.get(msg.channel.id)
    if (channelCols.get(msg.author.id))
        channelCols.get(msg.author.id).stop('Collector overlap')

    channelCols.set(msg.author.id, await embedMsg.channel.createMessageCollector(filter, {time: 30000, errors: ['time']}))
    let ratelimited = false
    channelCols.get(msg.author.id).on('collect', async col => {
        if (ratelimited) return
        ratelimited = true
        setTimeout(() => {ratelimited = false}, 900)

        await col.delete().catch(e => {})
        const input = col.content.toLowerCase()
        switch (input) {
        case 'next':
        case 'n':
            channelCols.get(msg.author.id).resetTimer()
            if (pageInd + 1 === totalPages) break
            pageInd = pageInd + 1
            await editPage(msg, embedMsg, pageInd, totalPages, res, filter)
            break
        case 'back':
        case 'b':
            channelCols.get(msg.author.id).resetTimer()
            if (pageInd - 1 < 0) break
            pageInd = pageInd - 1
            await editPage(msg, embedMsg, pageInd, totalPages, res, filter)
            break
        case 'exit':
        case 'e':
            await channelCols.get(msg.author.id).stop()
            await embedMsg.delete()
            break
        }
    })
    channelCols.get(msg.author.id).on('end', async () => channelCols.delete(msg.author.id))
}

async function editPage(msg, embedMsg, pageInd, totalPages, res, filter) {
    const embed = await getEmbed(pageInd, totalPages, res)
    embedMsg = await embedMsg.edit(embed)
}

async function getEmbed(pageInd, totalPages, res) {
    const page = res[pageInd]
    const title = page.title.length >= 43 ? page.title.slice(0, 39) + '...' : page.title
    const image = page.image.match(/\.gif(\?.+)?$/i) ? page.image : page.thumbnail

    return new MessageEmbed()
        .setColor(COLOR)
        .setDescription(`Use \`(n)ext\`, \`(b)ack\`, and \`(e)xit\` to navigate`)
        // .setAuthor('Image Search', 'https://i.imgur.com/fUcj3Oh.png')
        .setImage(image)
        .setFooter(`${pageInd+1}/${totalPages}  |  ${page.title}`)
}

exports.run = async (bot, msg, args, prefix) => {
    if (!args[0])
        return msg.channel.send('**Error:** Please specify a search query')

    const q = {
        query: args.join(' '),
        moderate : !msg.channel.nsfw,
        iterations : 1,
        retries : 3
    }
    let res = await image_search(q)
    if (res.length === 0) return msg.channel.send(`**Error:** No results found`)

    if (!collectors.has(msg.channel.id)) collectors.set(msg.channel.id, new Collection())

    const filter = m => m.content.match(/^(next|back|exit|n|b|e)$/i) && msg.author.id === m.author.id
    const embed = await getEmbed(0, res.length, res)
    const initMsg = await msg.channel.send(embed)
    await collectMessage(msg, initMsg, 0, res.length, res, filter)
}

exports.help = {
    name: 'image',
    desc: 'Look up images',
    usage: `image [query]`,
    category: 'Utilities',
    aliases: ['img', 'im']
}
