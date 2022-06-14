// const { DARKSKY_KEY, GEOCODE_KEY, COLOR, USER_REGEX } = process.env
const { VISUALCROSSING_KEY, COLOR, USER_REGEX } = process.env
const userRegex = new RegExp(USER_REGEX)
const { MessageEmbed } = require('discord.js')
const axios = require('axios')
const moment = require('moment-timezone')
const mongoose = require('mongoose')
// const Weather = mongoose.model('Weather')
const Weather = mongoose.model('WeatherVC')

// async function geocode(loc) {
//   return loc
//     // const geocodeQ = `https://maps.googleapis.com/maps/api/geocode/json?key=${GEOCODE_KEY}&address=${loc}`
//     // const res = await axios.get(geocodeQ)
//     //     .catch(e => console.log(e))
//     // if (res && res.data && res.data.results && res.data.results[0]) return {
//     //     lat: res.data.results[0].geometry.location.lat,
//     //     long: res.data.results[0].geometry.location.lng,
//     //     formatted: res.data.results[0].formatted_address
//     // }
//     // return null
// }

async function getForecast(loc) {
    // const weatherQ = `https://api.darksky.net/forecast/${DARKSKY_KEY}/${coords.lat},${coords.long}?exclude=[minutely,alerts,flags]`
    const weatherQ = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${loc}?`+
      `include=days,current,alerts&key=${VISUALCROSSING_KEY}&unitGroup=us&contentType=json`
    try {
      const res = await axios.get(weatherQ)
      const forecast = res.data
      const daily = forecast.days[0]
      const currently = forecast.currentConditions
      // const currently = forecast.currently
      // const hourly = forecast.hourly
      // const daily = forecast.daily.data[0]
      if (!res || !res.data) return null
        return {
            resolvedLoc: forecast.resolvedAddress,
            temps: {
                f: {
                    temp: ~~currently.temp,
                    apparent: ~~currently.feelslike,
                    high: ~~daily.tempmax,
                    low: ~~daily.tempmin
                },
                c: {
                    temp: ~~toC(currently.temp),
                    apparent: ~~toC(currently.feelslike),
                    high: ~~toC(daily.tempmax),
                    low: ~~toC(daily.tempmin)
                }
            },
            localTime: moment
                // .unix(currently.datetimeEpoch)
                .tz(forecast.timezone)
                .format('ddd, DD MMM h:mm a'),
            sunrise: moment
                .unix(daily.sunriseEpoch)
                .tz(forecast.timezone)
                .format('**h:mm** a'),
            sunset: moment
                .unix(daily.sunsetEpoch)
                .tz(forecast.timezone)
                .format('**h:mm** a'),
            humidity: parseInt(currently.humidity),
            precip: parseInt(daily.precipprob),
            summary: daily.description,
            condition: currently.conditions,
            icon: currently.icon,
            alerts: forecast.alerts.map(a => {return {event: a.event, link: a.link}})
        }
    } catch (e) {
      return null
    }

}

function toC(f) {
    return ((f - 32) * 5) / 9
}

async function weatherEmbed(forecast, channel, givenLoc) {
  if (!forecast) return channel.send(`**Error:** Failed to retreive weather data for \`${givenLoc}\`. Invalid location?`)
    const embed = new MessageEmbed()
        .setTitle(forecast.resolvedLoc)
        // .setAuthor(forecast.resolvedLoc, 'https://darksky.net/images/darkskylogo.png')
        .setThumbnail(`https://voidpls.github.io/null/darksky/${forecast.icon}.png`)
        .setColor(COLOR)
        .setFooter(`Powered by Visual Crossing • visualcrossing.com`)
        // .setFooter(`Powered by Dark Sky • ${forecast.localTime}`)
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
    if (forecast.alerts.length > 0) {
      const desc = '<:warning:986192938226810900> **Alerts** <:warning:986192938226810900>\n' +
       forecast.alerts.map(a => `[${a.event}](${a.link})`).join('\n') +
       `\n\n${forecast.summary}`
      embed.setDescription(desc)
    } else embed.setDescription(forecast.summary)

    channel.send(embed).catch(e => msg.channel.send(`**Error:** ${e}`))
}

exports.run = async (bot, msg, args, prefix) => {
    if (args.length === 0) {
        const userloc = await Weather.findOne({ userID: msg.author.id })
            .catch(e => console.log(e))
        if (!userloc) return msg.channel.send(`Use \`${prefix}weather set [location]\` to set a location`)
        const forecast = await getForecast(userloc.location)
        return weatherEmbed(forecast, msg.channel, userloc.location)
    }
    if (args[0].match(userRegex)) {
        const userID = args[0].match(userRegex)[2]
        const userloc = await Weather.findOne({ userID: userID })
            .catch(e => console.log(e))
        if (!userloc) return msg.channel.send(`User does not have a location set`)
        const forecast = await getForecast(userloc.location)
        return weatherEmbed(forecast, msg.channel, userloc.location)
    }
    if (args[0].toLowerCase() === 'set') {
        if (!args[1]) return msg.channel.send(`Use \`${prefix}weather set [location]\` to set a location`)
        const userloc = await Weather.findOne({ userID: msg.author.id })
            .catch(e => console.log(e))
        const newloc = args.slice(1).join(' ')
        const forecast = await getForecast(newloc)
        if (!forecast) return msg.channel.send(`**Error:** Failed to retreive weather data for \`${newloc.join(' ')}\`. Invalid location?`)
        // const coords = await geocode(newloc.join(' '))
        // if (!coords || !coords.formatted) return msg.channel.send(`**Error:** Could not find \`${newloc.join(' ')}\``)
        if (!userloc) {
            const weather = new Weather({
                userID: msg.author.id,
                location: newloc
            })
            weather.save().catch(e => console.log(e))
        } else {
            userloc.location = newloc
            userloc.save().catch(e => console.log(e))
            // userloc.update({ location: newloc }).catch(e => console.log(e))
        }
        return msg.channel.send(`Your location has been set to: \`${forecast.resolvedLoc}\``)
    }

    const loc = args.join(' ')
    // if (!loc) return msg.channel.send(`**Error:** Could not find \`${args.join(' ')}\``)
    const forecast = await getForecast(loc)
    return weatherEmbed(forecast, msg.channel, loc)
}

exports.help = {
    name: 'weather',
    desc: 'Checks the weather',
    usage: 'weather [location] | weather set [location]',
    category: 'Utilities',
    aliases: ['w', 'forecast']
}
