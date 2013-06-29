// take a two instances of a client and one of a server
// write a workload to client a
// sync to the server
// sync from the server to client b (todo: or from n clients)
// verify the data

var coax = require("coax"),
  async = require("async")


function loadDb(db, count, done) {
  async.times(count, function(i,cb){
    db.post({_id:"i"+i}, cb)
  }, done)
}

function verifyDb(db, count, done) {
  async.times(count, function(i,cb){
    db.get("i"+i, cb)
  }, done)
}

module.exports = function(t, dbs, done) {
  t.equals(3, dbs.length, "requires 3 dbs to replicate a > b > c")
  t.ok(dbs[0].pax.toString(), "dbs are coax instances")

  // create the database on each server
  t.test("create the database on each server", function(t){
    async.map(dbs, function(db, cb) {db(cb)}, function(err, oks) {
      t.false(err, "all dbs reachable")
      t.end()
    })
  })

  // todo should use the database basics test?

  t.test("load a test database", function(t){
    dbs[0].put(function(err, ok){
      dbs[0].get(function(err, ok){
        t.equals(0, ok.doc_count, "ready to load")
        loadDb(dbs[0], 50, function(err, oks){
          t.equals(err, null, "all ok")
          t.end()
        })
      })
    })
  })

  t.test("verify the database", function(t){ // assumes "load a test database" just ran
    verifyDb(dbs[0], 50, function(err, ok){
      t.equals(err, null, "all ok")
      t.end()
    })
  })

  t.test("can push replicate from "+dbs[0].pax+" to "+dbs[1].pax+"", function(t){
    var segs = dbs[0].pax.toString().split('/')
    var dbName = segs.pop()
    var server = segs.join('/')

    coax([server, "_replicate"]).post({
      target : dbs[1].pax.toString(),
      source : dbName
    }, function(err, ok){
      t.equals(err, null, "replicating")
      t.end()
    })
  })


  t.test("verify the push target", function(t){ // assumes "can pull replicate LiteServ to LiteServ" just ran
    verifyDb(dbs[1], 50, function(err, ok){
      t.equals(err, null, "all replicated")
      t.end()
    })
  })

  t.test("can pull replicate from "+dbs[1].pax+" to "+dbs[2].pax+"", function(t){
    var segs = dbs[2].pax.toString().split('/')
    var dbName = segs.pop()
    var server = segs.join('/')

    coax([server,"_replicate"]).post({
      target : dbName,
      source : dbs[1].pax.toString()
    }, function(err, ok){
      t.equals(err, null, "replicating")
      t.end()
    })
  })

  t.test("verify the pull target", function(t){ // assumes "can pull replicate LiteServ to LiteServ" just ran
    verifyDb(dbs[2], 50, function(err, ok){
      t.equals(err, null, "all verified")
      t.end()
    })
  })


  done()
};
