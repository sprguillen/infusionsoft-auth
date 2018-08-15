const ins = require('infusionsoft-node-sdk')
const conf = require('./config.js')

function checkContacts () {
	return new Promise((resolve, reject) => {
		let infusionsoftConf = conf.get('infusionsoft')

		let {
			clientId: ci,
			clientSecret: cs,
			redirectUri: r,
			token: t,
			sampleContactId: sci
		} = infusionsoftConf;

		let infusionSoft = new ins(infusionsoftConf)

		console.log('Requesting contact details from Infusionsoft Server.')
		infusionSoft.xml.contact.load(sci, ['email']).then(response => {
			console.log(response)
			var responseData;
			response = JSON.parse(JSON.stringify(response))
			if (response.email || response.name === 'XmlRpcApiError') {
				if (response.email) {
					responseData = {
						message: 'Successfully found email.',
						email: response.email,
						queryStatus: true
					}
				} else {
					responseData = {
						message: response.faultString,
						queryStatus: true
					}
				}
				
				resolve(responseData)
			} else {
				responseData = {
					message: 'Please refresh token.'
				}

				resolve(responseData)
			}
		}).catch(err => {
			reject(err)
		})

	})
}

module.exports.checkContacts = checkContacts