const express = require('express')
const app = express()
const https = require('https')
const ins = require('infusionsoft-node-sdk')
const conf = require('./config.js')
const mailer = require('./mailer.js')
const cronJob = require('cron').CronJob
const db = require('./db.js')
const exec = require('./exec.js')
const http = require('http')
const request = require('request')
const moment = require('moment')
require('console-stamp')(console, 'HH:MM:ss.l')

let infusionsoftConf = conf.get('infusionsoft')
let serverConfig = conf.get('serverConfig')

let {
	clientId: ci,
	clientSecret: cs,
	redirectUri: r,
	token: t 
} = infusionsoftConf;

let infusionSoft = new ins(infusionsoftConf)

app.get('/reauth', (req, res) => {
	console.log("Initializing token reauthentication")
	const authUrl = infusionSoft.getAuthorizationUrl()
	res.redirect(authUrl)
})

app.get('/redirect', (req, res) => {
	let {
		code: code,
		scope: scope,
		state: state
	} = req.query

	infusionSoft.requestAccessToken(code).then(response => {
		console.log('Successfully reauthenticated application')
		let expiresAt = new Date()
		expiresAt.setSeconds(expiresAt.getSeconds() + response.extra.data.expires_in)
		let newValues = {
			'token': {
				'accessToken': response.extra.data.access_token,
				'refreshToken': response.extra.data.refresh_token,
				'expiresIn': response.extra.data.expires_in,
				'expiresAt': expiresAt,
				'extra': ''
			}
		}

		exec.startProcess().then((response) => {
			if (response) {
				conf.update('infusionsoft', newValues)
				console.log(response.message)
				res.send(`Updated new token to configuration file and ${response.message}`)
			}
		}).catch((err) => {
			if (err) {
				conf.update('infusionsoft', newValues)
				console.error(err)
				res.send(`Updated new token to configuration file yet error on starting cbis-app: ${err}`)
			}
		})

	}).catch(err => {
		let errMsg = err.toString()
		console.error(`Error on reauthenticating application ${errMsg}`)
		mailer.sendEmail(serverConfig.toEmail, 
			'Infusionsoft Request Access Token Error', 
			errMsg
		)

		exec.stopProcess().then((response) => {
			if (response) {
				res.send(`${response.message} - reauthentication error, email sent to ${serverConfig.toEmail}`)
			}
		}).catch((err) => {
			if (err) {
				res.send(`Error running exec: ${err} on reauthentication error, email sent to ${serverConfig.toEmail}`)
			}
		})
	})
})

app.get('/refresh', (req, res) => {
	console.log('Initializing token refresh...')
	infusionSoft.refreshToken().then(response => {
		console.log("Successfull refresh..")
		let expiresAt = new Date()
		expiresAt.setSeconds(expiresAt.getSeconds() + response.extra.data.expires_in)

		let newValues = {
			'token': {
				'accessToken': response.extra.data.access_token,
				'refreshToken': response.extra.data.refresh_token,
				'expiresIn': response.extra.data.expires_in,
				'expiresAt': expiresAt,
				'extra': ''
			}
		}

		res.send('Updated new token to configuration file')
		
	}).catch(err => {
		let errMsg = err.toString()
		console.error(`Error on refreshing token: ${errMsg}. Please reauthenticate!`)
		errMsg += ', please run ' + serverConfig.hostname + ':' + serverConfig.port + '/reauth ' +
			'to reauthenticate to the infusionsoft server API.'

		mailer.sendEmail(serverConfig.toEmail, 
			'Infusionsoft Refresh Access Token Error', 
			errMsg
		)

		exec.stopProcess().then((response) => {
			if (response) {
				res.send(`${response.message} Token invalid, email sent to ${serverConfig.toEmail}`)
			}
		}).catch((err) => {
			if (err) {
				res.send(`${err} Token invalid, email sent to ${serverConfig.toEmail}`)
			}
		})
	})
})

app.get(infusionsoftConf.apiCheckToken, (req, res) => {
	console.log('Initializing token check...')
	db.checkContacts().then((response) => {
		if (!response.queryStatus) {
			console.log('Token invalid...')
			request.get(serverConfig.hostname + ':' + serverConfig.port + '/refresh').pipe(res);
		} else {
			console.log('Token valid. Message: ' + response.message)
			res.send('Token valid. Message: ' + response.message)
		}
	}).catch((err) => {
		let errMsg = err.toString()
		console.error(`Token error found! ${errMsg}`)
		errMsg += ', please run ' + serverConfig.hostname + ':' + serverConfig.port + '/reauth ' +
			'to reauthenticate to the infusionsoft server API.'
		mailer.sendEmail(serverConfig.toEmail, 
			'Reauthenticate Email Notification', 
			errMsg
		)

		exec.stopProcess().then((response) => {
			if (response) {
				res.send(`${response.message} Token invalid, email sent to ${serverConfig.toEmail}`)
			}
		}).catch((err) => {
			if (err) {
				res.send(`${err} Token invalid, email sent to ${serverConfig.toEmail}`)
			}
		})
	})
})

new cronJob('*/15 * * * *', () => {
	request.get(serverConfig.hostname + ':' + serverConfig.port + infusionsoftConf.apiCheckToken)
}, null, true, 'Pacific/Auckland')

app.listen(3000, () => console.log('Successfully listened to app 3000'))