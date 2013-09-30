var launcher = require("../lib/launcher"),
  coax = require("coax"),
  common = require("../tests/common"),
  sleep = require('sleep');
  test = require("tap").test;

var NUM_DOCS = 500;

var server, sg1, sg2, gateway1, sg2, sgdb
  // local dbs
 dbs = ["mismatch-test-one", "mismatch-test-two"];

// start client endpoint
test("start test client", function(t){
  common.launchClient(t, function(_server){
    server = _server
    t.end()
  })
})


// start sync gateway
test("start syncgateway", function(t){
  common.launchSGWithParams(t, 9888, "db", function(_sg1){
    sg1  = _sg1
    gateway1 = sg1.url
    t.end()
  })
})

// create all dbs
test("create test databases", function(t){
  common.createDBs(t, dbs)
})

test("load databases", function(t){
  t.equals(NUM_DOCS/2, Math.floor(NUM_DOCS/2), "NUM_DOCS must be an even number")
  common.createDBDocs(t, {numdocs : NUM_DOCS/2, dbs : dbs, docgen : "channels"})
})

test("setup continuous push and pull from both client database", function(t) {
  sgdb1 = sg1.db.pax().toString()

  common.setupPushAndPull(server, dbs[0], sgdb1, function(err, ok){
    t.false(err, 'replication one ok')
    common.setupPushAndPull(server, dbs[1], sgdb1, function(err, ok){
      t.false(err, 'replication two ok')
      t.end()
    })
  })
})

//test("verify dbs have same number of docs", {timeout: 12 * 1000}, function(t) {
//  common.verifyNumDocs(t, dbs, NUM_DOCS)
//})

test("done", function(t){
    for (var i = 0; i < dbs.length; i++) {
	dburl = coax([server, dbs[i]]).pax().toString()
	coax(dburl, function(err, json){
              if(err){
                t.fail("failed to get db info from " + dburl)
              }
              count = json.doc_count
              console.log("doc count in " + dbs[i] + ": " +count)                
    })
    }
    console.log("sleep 3 second before sg1.kill")
    sleep.sleep(3)
    sg1.kill()
    t.end()
})

//start sync gateway
test("start syncgateway", function(t){
  common.launchSGWithParams(t, 9888, "db", function(_sg1){
    sg1  = _sg1
    gateway1 = sg1.url
    t.end()
  })
})

test("setup continuous push and pull from both client database", function(t) {
  sgdb1 = sg1.db.pax().toString()

  common.setupPushAndPull(server, dbs[0], sgdb1, function(err, ok){
    t.false(err, 'replication one ok')
    common.setupPushAndPull(server, dbs[1], sgdb1, function(err, ok){
      t.false(err, 'replication two ok')
      t.end()
    })
  })
})

test("verify dbs have same number of docs", {timeout: 30 * 1000}, function(t) {
  common.verifyNumDocs(t, dbs, NUM_DOCS)
})

test("done", function(t){
  common.cleanup(t, function(json){
    sg1.kill()
    t.end()
  })
})