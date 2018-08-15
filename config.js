const updateJson = require('update-json')
const conf = require('./config/config.json')
const path = require('path')

module.exports.get = function (key) {
	return conf[key]
}

module.exports.update = function (key, newValues) {
	let obj = Object.assign(conf[key], newValues)

	let newJSON = {}

	newJSON[key] = obj

	updateJson(path.resolve(__dirname) + '\\config\\config.json', newJSON, function (error) {
		if (error) {
			throw error;
		}
	})
}