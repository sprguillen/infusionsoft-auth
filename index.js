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
				res.send(`Updated new token to configuration file and ${response.message}`)
			}
		}).catch((err) => {
			if (err) {
				conf.update('infusionsoft', newValues)
				res.send(`Updated new token to configuration file yet error on starting cbis-app: ${err}`)
			}
		})

	}).catch(err => {
		let errMsg = err.toString()
		mailer.sendEmail(serverConfig.toEmail, 
			'Infusionsoft Request Access Token Error', 
			errMsg
		)

		exec.stopProcess().then((response) => {
			if (response) {
				res.send(`${response.message} Reauthentication error, email sent to ${serverConfig.toEmail}`)
			}
		}).catch((err) => {
			if (err) {
				res.send(`Error running exec: ${err} on reauthentication error, email sent to ${serverConfig.toEmail}`)
			}
		})
	})
})

app.get('/refresh', (req, res) => {

	infusionSoft.refreshToken().then(response => {
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
				res.send(`Updated new token to configuration file and ${response.message}`)
			}
		}).catch((err) => {
			if (err) {
				conf.update('infusionsoft', newValues)
				res.send(`Updated new token to configuration file yet error on starting cbis-app: ${err}`)
			}
		})
	}).catch(err => {
		let errMsg = err.toString()
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
	db.checkContacts().then((response) => {
		if (!response.queryStatus) {
			request.get(serverConfig.hostname + ':' + serverConfig.port + '/refresh').pipe(res);
		} else {
			console.log('Token valid. Message: ' + response.message)
			res.send('Token valid. Message: ' + response.message)
		}
	}).catch((err) => {
		let errMsg = err.toString()
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

app.get('/testStart', (req, res) => {
	exec.startProcess().then((response) => {
		if (response) {
			res.send(response.message)
		}
	}).catch((err) => {
		if (err) {
			res.send(err)
		}
	})
})

new cronJob('*/15 * * * *', () => {
	request.get(serverConfig.hostname + ':' + serverConfig.port + infusionsoftConf.apiCheckToken)
}, null, true, 'Pacific/Auckland')

app.listen(3000, () => console.log('Successfully listened to app 3000'))