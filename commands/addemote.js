const axios = require('axios')
const probe = require('probe-image-size')
const Jimp = require('jimp')
const imagemin = require('imagemin')
const imagemin_png = require('imagemin-pngquant')
const imagemin_jpeg = require('imagemin-mozjpeg')
const imagemin_gif = require('@xanderfrangos/imagemin-gifsicle')
const { ATTACH_REGEX, EMOTE_REGEX } = process.env
const attachRegex = new RegExp(ATTACH_REGEX)
const emoteRegex = new RegExp(EMOTE_REGEX)
const MAX_SIZE = 25*1024*1024
const EMOJI_MAX_SIZE = 256*1024
const IMAGEMIN_FUNCTIONS = {
    'image/png': imagemin_png({speed:6}),
    'image/jpeg': imagemin_jpeg({quality: 75, maxMemory: 512*1024}),
    'image/gif': imagemin_gif
}

async function getEmoji(msg, args) {
    let image
    if (msg.attachments.size !== 0 && msg.attachments.first().url.match(attachRegex))
        image = msg.attachments.first().url
    else if (args.length < 2) return
    else if (args[1].match(attachRegex))
        image = args[1]
    else if (args[1].match(emoteRegex)) {
        const match = args[1].match(emoteRegex)
        image = match[1] === 'a' ?
            `https://cdn.discordapp.com/emojis/${match[2]}.gif` :
            `https://cdn.discordapp.com/emojis/${match[2]}.png`
    }
    return image || null
}

async function getImage(url) {
    const head = await axios.head(url).catch(e => {})
    if (!head || !head.headers['content-length'] ||
        parseInt(head.headers['content-length']) > MAX_SIZE)
        return null
    const res = await axios.get(url, {responseType:'arraybuffer'}).catch(e => {})
    if (!res) return null
    return res.data
}

async function getMetadata(buffer) {
    const probedInfo = probe.sync(buffer)
    return {
        size: buffer.length,
        w: probedInfo.width,
        h: probedInfo.height,
        mime: probedInfo.mime,
        ext: probedInfo.type
    }
}

async function addEmoji(buffer, metadata, name, msg) {
    return msg.guild.emojis.create(buffer, name, {reason: `Added By: ${msg.author.username}#${msg.author.discriminator}`})
        .then(e => msg.channel.send(`**Success:** Emoji \`:${e.name}:\` created [${e.toString()}]`))
        .catch(e => msg.channel.send(`**Error:** ${e.message}`))
}

async function shrinkEmoji(buffer, metadata, name, msg) {
    let mArray = ['<a:loading:744448275914162206> **Shrinking:**', `Original size: **\`${~~(metadata.size/1024)}KB\`**`]
    let m = await msg.channel.send(mArray.join('\n'))
    let shrunk;
    if (['image/jpeg', 'image/png'].includes(metadata.mime))
        shrunk = await shrinkStatic(buffer, metadata, m, mArray)
    if (['image/gif'].includes(metadata.mime))
        shrunk = await shrinkGif(buffer, metadata, m, mArray)
    if (shrunk && shrunk.length < EMOJI_MAX_SIZE) {
        mArray[0] = '**Success:** Image shrunk to **`<256KB`**'
        m.edit(mArray.join('\n'))
        addEmoji(shrunk, metadata, name, msg)
    } else {
        mArray[0] = '**Error:** Failed to shrink image to **`<256KB`**'
        return m.edit(mArray.join('\n'))
    }
}

async function shrinkStatic(buffer, metadata, m, mArray) {
    const longestDim = metadata.w > metadata.h ? metadata.w : metadata.h
    if (longestDim > 384) {
        try {
            if (metadata.w > metadata.h)
                buffer = await resize(buffer, metadata, 256, null, m, mArray)
            else
                buffer = await resize(buffer, metadata, null, 256, m, mArray)
        } catch (e) { return m.channel.send(`**Error:** ${e.message}`) }
    }
    if (buffer.length < EMOJI_MAX_SIZE) return buffer
    try {
        buffer = await compress(buffer, m, mArray, IMAGEMIN_FUNCTIONS[metadata.mime])
        mArray.push(`Compressed: **\`${~~(buffer.length / 1024)}KB\`**`)
        await m.edit(mArray.join('\n'))
    } catch (e) { return m.channel.send(`**Error:** ${e.message}`) }
    return buffer
}

async function shrinkGif(buffer, metadata, m, mArray) {
    let nBuffer = Buffer.from(buffer)
    const longestDim = metadata.w > metadata.h ? metadata.w : metadata.h
    try {
        if (longestDim >= 196)
            buffer = await resizeGif(buffer, metadata, 128, m, mArray)
    } catch (e) { return m.channel.send(`**Error:** ${e.message}`) }
    if (buffer.length < EMOJI_MAX_SIZE) return buffer
    // part 2
    try {
        if (longestDim >= 96)
            nBuffer = await resizeGif(nBuffer, metadata, 64, m, mArray)
        else
            nBuffer = await resizeGif(nBuffer, metadata, longestDim, m, mArray)
    } catch (e) { return m.channel.send(`**Error:** ${e.message}`) }
    return nBuffer
}

async function resize(buffer, metadata, w, h, m, mArray) {
    let image = await Jimp.read(buffer)
    image = await image.resize(w || Jimp.AUTO, h || Jimp.AUTO)
    buffer = await image.getBufferAsync(metadata.mime)
    mArray.push(`Resized to \`${w || h}px\`: **\`${~~(buffer.length / 1024)}KB\`**`)
    await m.edit(mArray.join('\n'))
    return buffer
}

async function resizeGif(buffer, metadata, longest, m, mArray) {
    if (metadata.w > metadata.h)
        buffer = await compress(buffer, m, mArray,
            IMAGEMIN_FUNCTIONS[metadata.mime]({optimizationLevel: 2, lossy: 35, resize: `${longest}x_`}))
    else
        buffer = await compress(buffer, m, mArray,
            IMAGEMIN_FUNCTIONS[metadata.mime]({optimizationLevel: 2, lossy: 35, resize: `_x${longest}`}))
    const longestDim = metadata.w > metadata.h ? metadata.w : metadata.h
    if (longest !== longestDim) mArray.push(`Resized to \`${longest}px\`: **\`${~~(buffer.length / 1024)}KB\`**`)
    else mArray.push(`Compressed: **\`${~~(buffer.length / 1024)}KB\`**`)
    await m.edit(mArray.join('\n'))
    return buffer
}

async function compress(buffer, m, mArray, plugin) {
    buffer = await imagemin.buffer(buffer, {
        plugins: [plugin]
    }).catch(e => console.log(e))
    return buffer
}

exports.run = async (bot, msg, args, prefix) => {
    if (!msg.member.hasPermission('MANAGE_EMOJIS'))
        return msg.channel.send(`**Error:** You must have the \`Manage Emojis\` permission`)
    if (!msg.guild.me.hasPermission('MANAGE_EMOJIS'))
        return msg.channel.send(`**Error:** I am missing the \`Manage Emojis\` permission`)
    const url = await getEmoji(msg, args)
    const name = args[0]
    if (!url)
        return msg.channel.send(`**Error:** No valid image/emote provided\n\nUsage: \`${prefix}addemote [name] [url/image/emote]\``)
    const maxSize = ~~(MAX_SIZE/1024/1024)
    const image = await getImage(url)
    if (!image) return msg.channel.send(`**Error:** Image failed to download or exceeds \`${maxSize}MB\` size limit`)

    const metadata = await getMetadata(image)
    if (metadata.size < EMOJI_MAX_SIZE) return addEmoji(image, metadata, name, msg)

    const filter = m => m.author.id === msg.author.id
    const askM = await msg.channel.send(`**Image Too Large:** Would you like me to shrink it?\n\n\`Y/N\``)
    askM.channel.awaitMessages(filter, { max: 1, time: 15000, errors: ['time'] })
        .then(col => {
            if (['y', 'yes'].includes(col.first().content.toLowerCase())) {
                shrinkEmoji(image, metadata, name, msg)
                askM.delete()
            }
            else throw new Error('Cancel command')
        })
        .catch(e => {
            msg.channel.send('Cancelling command.')
            askM.delete()
        })
}

exports.help = {
    name: 'AddEmote',
    desc: 'Automatically shrinks and adds an emote to the server',
    usage: 'addemote [name] [url/image/emote]',
    category: 'Moderation',
    aliases: ['addemoji']
}
