const updateJsonFile = require('update-json-file')
const conf = require('./config/config.json')
const path = require('path')

module.exports.get = function (key) {
	return conf[key]
}

module.exports.update = function (key, newValues) {
	let obj = Object.assign(conf[key], newValues)
	updateJsonFile(path.resolve(__dirname) + '\\config\\config.json', (data) => {
		data[key] = obj
		return data
	})
}