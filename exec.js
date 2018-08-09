const { exec } = require('child_process')
const conf = require('./config.js')
const cbisConf = conf.get('cbis')

function stopProcess () { 
	return new Promise((resolve, reject) => {
		try {
			exec('pm2 list', (err, stdout, stderr) => {
				if (stdout) {
					let strout = stdout.replace(/[^\x00-\x7F]/g, "");
					strout = JSON.stringify(strout)
					
					let strObj = strout.split("\\n\\n")
					strObj = strObj[1].split("\\n")
					
					let result = strObj.some(function (i) {
						var trimmedLine = i.replace(/\s+/g, " ").trim()
						var logObj = trimmedLine.split(" ")

						let name = logObj[0]

						if (name === cbisConf.pm2Name) {
							exec('pm2 stop ' + logObj[0], (err, stdout, stderr) => {
								if (err) {
									let errmsg = `Error on stopping process: ${logObj[3]} \n ${err}!`
									console.error(errmsg)
									reject(errmsg)
								} else if (stderr) {
									let stderrmsg = `Error on stopping process ${logObj[3]} \n ${stderr}!`
									console.error(stderrmsg)
									reject(stderrmsg)
								} else {
									let response = {
										message: `Successfully stopping process ${logObj[3]}.`
									}
									console.log(response.message)
									resolve(response)
								}
							})
							return true
						} else {
							let msg = `Process ${cbisConf.pm2Name} not found.`
							console.error(msg)
							reject(msg)
							return false
						}
					})

				} else {
					if (err) {
						let msg = `Critical error found: ${err}!`
						console.error(msg)
						reject(msg)
					} else {
						let msg = `Critical error found: ${stderr}!`
						console.error(stderr)
						reject(stderr)
					}
				}
			})
		} catch (error) {
			let msg = `Critical error found: ${error}!`
			console.error(msg)
			reject(msg)
		}
	})
}

function startProcess() {
	return new Promise((resolve, reject) => {
		try {
			exec('pm2 start index.js --name "cbis-app" -- all', {cwd: '/home/cbis/cbis'}, (err, stdout, stderr) => {
				console.log(stdout)
				console.log(stderr)
				console.log(err)
				if (stdout) {
					let response = {
						message: "Successfully started cbis-app"
					}
					console.log(response.message)
					resolve(response)
				} else {
					if (err) {
						let errmsg = `Error on starting cbis-app \n ${err}!`
						console.error(errmsg)
						reject(errmsg)
					} else if (stderr) {
						let stderrmsg = `Error on starting cbis-app \n ${stderr}!`
						console.error(stderrmsg)
						reject(stderrmsg)
					}
				}
			})
		} catch (error) {
			let msg = `Critical error found: ${error}!`
			console.error(msg)
			reject(msg)
		}
	})
}

module.exports = {
	stopProcess: stopProcess,
	startProcess: startProcess
}