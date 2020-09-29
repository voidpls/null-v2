const { DARKSKY_KEY, GEOCODE_KEY, COLOR, USER_REGEX } = process.env
const userRegex = new RegExp(USER_REGEX)
const { MessageEmbed } = require('discord.js')
const axios = require('axios')
const moment = require('moment-timezone')
const mongoose = require('mongoose')
const Weather = mongoose.model('Weather')

async function geocode(loc) {
    const geocodeQ = `https://maps.googleapis.com/maps/api/geocode/json?key=${GEOCODE_KEY}&address=${loc}`
    const res = await axios.get(geocodeQ)
        .catch(e => console.log(e))
    if (res && res.data && res.data.results && res.data.results[0]) return {
        lat: res.data.results[0].geometry.location.lat,
        long: res.data.results[0].geometry.location.lng,
        formatted: res.data.results[0].formatted_address
    }
    return null
}

async function getForecast(coords) {
    const weatherQ = `https://api.darksky.net/forecast/${DARKSKY_KEY}/${coords.lat},${coords.long}?exclude=[minutely,alerts,flags]`
    const res = await axios.get(weatherQ)
        .catch(e => console.log(e))
    if (res && res.data) {
        const forecast = res.data
        const currently = forecast.currently
        const hourly = forecast.hourly
        const daily = forecast.daily.data[0]

        return {
            temps: {
                f: {
                    temp: ~~currently.temperature,
                    apparent: ~~currently.apparentTemperature,
                    high: ~~daily.temperatureHigh,
                    low: ~~daily.temperatureLow
                },
                c: {
                    temp: ~~toC(currently.temperature),
                    apparent: ~~toC(currently.apparentTemperature),
                    high: ~~toC(daily.temperatureHigh),
                    low: ~~toC(daily.temperatureLow)
                }
            },
            localTime: moment
                .unix(currently.time)
                .tz(forecast.timezone)
                .format('ddd, DD MMM h:mm a'),
            sunrise: moment
                .unix(daily.sunriseTime)
                .tz(forecast.timezone)
                .format('**h:mm** a'),
            sunset: moment
                .unix(daily.sunsetTime)
                .tz(forecast.timezone)
                .format('**h:mm** a'),
            humidity: ~~(currently.humidity * 100),
            precip: ~~(daily.precipProbability * 100),
            summary: hourly.summary,
            condition: currently.summary,
            icon: currently.icon
        }
    } else return null
}

function toC(f) {
    return ((f - 32) * 5) / 9
}

async function weatherEmbed(coords, forecast, channel) {
    const embed = new MessageEmbed()
        .setAuthor(coords.formatted, 'https://darksky.net/images/darkskylogo.png')
        .setDescription(forecast.summary)
        .setThumbnail(`https://voidpls.github.io/null/darksky/${forecast.icon}.png`)
        .setColor(COLOR)
        .setFooter(`Powered by Dark Sky • ${forecast.localTime}`)
        .addField('Temperature', `**${forecast.temps.f.temp}**°F/**${forecast.temps.c.temp}**°C`, true)
        .addField(
            'High/Low',
            `**${forecast.temps.f.high}**°/**${forecast.temps.f.low}**°F | `+
            `**${forecast.temps.c.high}**°/**${forecast.temps.c.low}**°C`,
            true
        )
        .addField('Condition', `${forecast.condition}`, true)
        .addField('Humidity', `<:humidity:741861020024307722> **${forecast.humidity}**%`, true)
        .addField('Precipitation', `<:umbrella:741861780841693184> **${forecast.precip}**% chance`, true)
        .addField('Sunrise/Sunset', `${forecast.sunrise} | ${forecast.sunset}`, true)
    channel.send(embed).catch(e => msg.channel.send(`**Error:** ${e}`))
}

exports.run = async (bot, msg, args, prefix) => {
    if (args.length === 0) {
        const userloc = await Weather.findOne({ userID: msg.author.id })
            .catch(e => console.log(e))
        if (!userloc) return msg.channel.send(`Use \`${prefix}weather set [location]\` to set a location`)
        const forecast = await getForecast(userloc.location)
        return weatherEmbed(userloc.location, forecast, msg.channel)
    }
    if (args[0].match(userRegex)) {
        const userID = args[0].match(userRegex)[2]
        const userloc = await Weather.findOne({ userID: userID })
            .catch(e => console.log(e))
        if (!userloc) return msg.channel.send(`User does not have a location set`)
        const forecast = await getForecast(userloc.location)
        return weatherEmbed(userloc.location, forecast, msg.channel)
    }
    if (args[0].toLowerCase() === 'set') {
        if (!args[1]) return msg.channel.send(`Use \`${prefix}weather set [location]\` to set a location`)
        const userloc = await Weather.findOne({ userID: msg.author.id })
            .catch(e => console.log(e))
        const newloc = args.slice(1)
        const coords = await geocode(newloc.join(' '))
        if (!coords || !coords.formatted) return msg.channel.send(`**Error:** Could not find \`${newloc.join(' ')}\``)
        if (!userloc) {
            const weather = new Weather({
                userID: msg.author.id,
                location: {
                    lat: coords.lat,
                    long: coords.long,
                    formatted: coords.formatted
                }
            })
            weather.save().catch(e => console.log(e))
        } else {
            userloc.update({ location: {
                lat: coords.lat,
                long: coords.long,
                formatted: coords.formatted
            } }).catch(e => console.log(e))
        }
        return msg.channel.send(`Your location has been set to: \`${coords.formatted}\``)
    }

    const coords = await geocode(args.join(' '))
    if (!coords) return msg.channel.send(`**Error:** Could not find \`${args.join(' ')}\``)
    const forecast = await getForecast(coords)
    return weatherEmbed(coords, forecast, msg.channel)
}

exports.help = {
    name: 'weather',
    desc: 'Checks the weather',
    usage: 'weather [location] | weather set [location]',
    category: 'Utilities',
    aliases: ['w', 'forecast']
}
