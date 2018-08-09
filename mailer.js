const nodemailer = require('nodemailer')
const conf = require('./config.js')

module.exports.sendEmail = function (to, subj, text) {
	let nodemailerConf = conf.get('nodemailer')

	let {
		email: fromEmail,
		password: pass,
		smtp: smtp,
		tlsPort: port
	} = nodemailerConf;

	let transporter = nodemailer.createTransport({
		host: smtp,
		port: port,
		secure: false,
		auth: {
			user: fromEmail,
			pass: pass
		}
	})

	for (let i of to) {
		let mailOptions = {
			from: fromEmail,
			to: i,
			subject: subj,
			text: text
		}

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				return console.error(error);
			}

			console.log('Message sent to:', i)
		})
	}
	
}
