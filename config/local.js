var path = require("path");

var config = module.exports = {
  LiteServPath      : process.env.LITESERV_PATH,
  LiteServPort      : process.env.LiteServPort | 59851,
  SyncGatewayPath   : process.env.SYNCGATE_PATH,
  LocalListenerIP   : process.env.LOCAL_IP || "127.0.0.1",
  LocalListenerPort : 8189,
  DbUrl             : "walrus:",
  DbBucket          : "db",
  provides          : "ios",  // ios, android, pouchdb, couchdb
  numDocs           : process.env.NUM_DOCS || 100,
  storageEngine     : process.env.STORAGE_ENGINE || "SQLite",
  channelsPerDoc    : 1
}

/*
 * database information in this file will override the values in this config.
 * the default admin_party.json will use "walrus" on bucket "db"
 */
module.exports.SyncGatewayAdminParty = __dirname+"/admin_party.json"
module.exports.SyncGatewaySyncFunctionTest = __dirname+"/sync_function_test.json"
