const gulp = require('gulp')
const archieml = require('archieml')
const request = require('request')
const fs = require('fs')
const { groupBy, forIn } = require('lodash')
const configPath = `${process.cwd()}/data/config.json`
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const google = config.copy.google

//clear all dev folders and sass cache
gulp.task('fetch-google', (cb) => {
	if (google.length) {
		const promises = google.map(doc => {
			const url = `https://docs.google.com/document/d/${doc.id}/export?format=txt`
			return new Promise((resolve, reject) => {
				request(url, function(error, response, body) {
					const parsed = archieml.load(body)

					if (!error && response.statusCode === 200) {
						resolve({...doc, body: parsed})
					} else {
						reject(error)
					}
				})
			})
		})

		Promise.all(promises)
			.then(results => {
				const individuals = groupBy(results.filter(doc => typeof doc.filename !== 'undefined'), 'filename')
				const copy = results.filter(doc => typeof doc.filename === 'undefined').map(doc => doc.body)
				const copyStr = JSON.stringify(copy.length > 1 ? copy: copy[0])

				fs.writeFileSync('data/copy.json', copyStr)

				forIn(individuals, (docs, file) => {
					const outputFile = `data/${(file)}.json`
					const fileContent = docs.length > 1 ? docs.map(docData => docData.body): docs[0].body
					const str = JSON.stringify(fileContent)
					fs.writeFileSync(outputFile, str)
				})

			})
			.then(() => {
				cb()
			})
			.catch(error => {
				console.error(error)
				cb()
			})
	} else {
		console.error('No google docs')
		cb()
	}
})
