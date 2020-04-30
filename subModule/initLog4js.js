exports.log4jsConfigure = function (log4js) {
	log4js.configure({
		appenders: {
			system: { type: 'file', filename: './log/system.log', maxLogSize: 50000, backups: 3 },
			access: { type: 'file', filename: './log/access.log' }, //アクセスログ
			HttpLog: { type: 'dateFile', filename: './log/http.log', pattern: ".yyyy-MM-dd", 'daysToKeep': 7 },
		},
		categories: {
			default: { appenders: ['system'], level: 'debug' },
			web: { appenders: ['access'], level: 'info' }, //アクセスログ用
			http: { appenders: ['HttpLog'], level: "info" }
		}
	})
}