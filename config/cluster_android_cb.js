var path = require("path");

var config = module.exports = {
  LiteServPath      : process.env.LITESERV_PATH,
  LiteServPort      : process.env.LiteServPort | 8081,
  SyncGatewayPath   : process.env.SYNCGATE_PATH,
  LocalListenerIP   : process.env.LOCAL_IP || "127.0.0.1",
  LocalListenerPort : 8189,
  DbUrl             : "http://localhost:8091",
  DbBucket          : "db",
  provides          : "android",  // ios, android, pouchdb, couchdb
  numDocs           : 10,
  channelsPerDoc    : 1
}

/*
 * Now there is one limitation:
 * the bucket db must be created manually with enable flush in advance
 * 
 * database information in this file will override the values in this config.
 * the default admin_party_cb.json will use "http://localhost:8091" on bucket "db"
 */
module.exports.SyncGatewayAdminParty =  __dirname+"/admin_party_cb_cluster.json"
module.exports.SyncGatewaySyncFunctionTest = __dirname+"/sync_function_test.json"