var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    util = require("util"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {timeout: test_time * 1000};

var server, sg, gateway,
// local dbs
    dbs = ["cbl-replication1", "cbl-replication2", "cbl-replication3"];
// local->local dbs
repdbs = ["cbl-replication4", "cbl-replication5", "cbl-replication6"];
// sg->local dbs
sgdbs = ["cbl-replication7", "cbl-replication8", "cbl-replication9"];

var numDocs = parseInt(config.numDocs) || 100;

/*
 STEPS:
 start test client
 kill syncgateway
 start syncgateway
 create test databases
 set up local to local replication
 set push/pull replication to gateway
 load databases
 verify local-replicated dbs changefeed after load databases
 verify local-replicated num-docs=#numDocs
 verify sg-replicated dbs loaded
 verify sg-replicated num-docs
 delete db docs
 verify local-replicated dbs changefeed after delete db docs
 verify local-replicated num-docs 0
 verify sg-replicated num-docs
 load databases
 verify local-replicated in repdbs: #numDocs
 purge dbs
 verify local-replicated in dbs: 0
 cleanup cb bucket
 done

 */


//https://github.com/couchbase/couchbase-lite-android/issues/77
//support for shorthand target in local->local replication
//all android tests should be uncommented when the the issue will be resolved

var module_name = '\r\n\r\n>>>>>>>>>>>>>>>>>>>' + module.filename.slice(__filename.lastIndexOf(require('path').sep)
        + 1, module.filename.length - 3) + '.js ' + new Date().toString()
console.time(module_name);
console.error(module_name)

test("kill LiteServ", function (t) {
    if (config.provides == "android") {
        spawn('adb', ["shell", "am", "force-stop", "com.couchbase.liteservandroid"])
        setTimeout(function () {
            t.end()
        }, 3000)
    } else {
        t.end()
    }
})

// start client endpoint
test("start test client", test_conf, function (t) {
    var i=1;
    (function loop() {
        common.launchClient(t, function (_server) {
            server = _server
            coax([server, "_session"], function (err, ok) {
                try {
                    if (ok.ok == true) {
                        t.end()
                    } else {
                        return new Error("LiteServ was not run?: " + ok)
                    }
                } catch (err) {
                    console.error(err, "will restart LiteServ..." + i++ +" times")
                    setTimeout(function () {
                        console.log(i)
                        if (i<6) {
                            loop()
                        } else {
                            console.error("can't run LiteServ...")
                            t.end()
                        }
                    }, 9000)
                }
            })
        })
    }());
})

// kill sync gateway
test("kill syncgateway", function (t) {
    common.kill_sg(t, function () {
        },
        setTimeout(function(){
            t.end();
        }, 2000))
})

// start sync gateway
test("start syncgateway", function (t) {
    common.launchSG(t, function (_sg) {
        sg = _sg;
        gateway = sg.url;
        t.end();
    });
});

// create all dbs
test("create test databases", function (t) {
    var alldbs = dbs.concat(repdbs);
    alldbs = alldbs.concat(sgdbs);
    common.createDBs(t, alldbs);
});

//issue#77 couchbase-lite-android: support for shorthand target in local->local replication
// set up replication
test("set up local to local replication", function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
        return
    }

    var i = 0;
    async.mapSeries(dbs, function (db, cb) {
        coax([server, "_replicate"]).post({
            source: db,
            // target : config.provides=="android" ? "http://localhost:8081/" + repdbs[i] : repdbs[i],
            // can be applied as workaround for shorthand issue
            // but seems like local replication doesn't work at all
            target: repdbs[i],
            continuous: true,
        }, function (err, ok) {
            t.equals(err, null, util.inspect({_replicate: dbs[i] + " -> " + repdbs[i]}));
            i++;
            cb(err, ok);
        });

    }, function (err, json) {
        t.end();
    });

});

// setup push/pull replication to gateway
test("set push/pull replication to gateway", function (t) {

    var i = 0;
    var gatewayDB = coax([gateway, config.DbBucket]).pax().toString();
    if (config.provides == "android") gatewayDB = gatewayDB.replace("localhost", "10.0.2.2");
    async.series([
        function (sgpush) {

            async.mapSeries(dbs, function (db, cb) {

                coax([server, "_replicate"]).post({
                    source: db,
                    target: gatewayDB,
                    continuous: true,
                }, function (err, ok) {
                    t.equals(err, null,
                        util.inspect({_replicate: db + " -> " + gatewayDB}));
                    i++;
                    cb(err, ok);
                });

            }, sgpush);
        },
        function (sgpull) {

            async.mapSeries(sgdbs, function (db, cb) {

                coax([server, "_replicate"]).post({
                    source: gatewayDB,
                    target: db,
                    continuous: true,
                }, function (err, ok) {

                    t.equals(err, null,
                        util.inspect({_replicate: db + " <- " + gatewayDB}));
                    i++;
                    cb(err, ok);
                });

            }, sgpull);
        }], function (err, json) {
        t.false(err, "setup push pull replication to gateway")
        t.end();
    });

})

test("load databases", test_conf, function (t) {
    common.createDBDocs(t, {numdocs: numDocs, dbs: dbs});
})

test("verify local-replicated dbs changefeed after load databases", test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.compareDBSeqNums(t, {
            sourcedbs: dbs,
            targetdbs: repdbs
        });
    }
})

test("verify local-replicated num-docs=" + numDocs, test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.verifyNumDocs(t, repdbs, numDocs);
    }
})

test("verify sg-replicated dbs loaded", test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.compareDBSeqNums(t, {
            sourcedbs: dbs,
            targetdbs: sgdbs,
            replfactor: 3
        });
    }
})

test("verify sg-replicated num-docs", test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.verifyNumDocs(t, sgdbs, numDocs * 3);
    }
})


test("delete db docs", test_conf, function (t) {
    common.deleteDBDocs(t, dbs, numDocs);
})


test("verify local-replicated dbs changefeed after delete db docs", test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.compareDBSeqNums(t, {
            sourcedbs: dbs,
            targetdbs: repdbs
        });
    }
})


test("verify local-replicated num-docs 0", function (t) {
    common.verifyNumDocs(t, repdbs, 0);
})

test("verify sg-replicated dbs loaded", test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.compareDBSeqNums(t, {
            sourcedbs: dbs,
            targetdbs: sgdbs,
            replfactor: 3
        });
    }
})

test("verify sg-replicated num-docs", function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.verifyNumDocs(t, sgdbs, 0);
    }
})


// load databaes
test("load databases", test_conf, function (t) {
    common.createDBDocs(t, {numdocs: numDocs, dbs: dbs});
})

test("verify local-replicated in repdbs: " + numDocs, test_conf, function (t) {
    if (config.provides == "android") {
        console.log("Skipping local replication on Android");
        t.end();
    } else {
        common.verifyNumDocs(t, repdbs, numDocs);
    }
})

// purge all dbs
test("purge dbs", test_conf, function (t) {
    common.purgeDBDocs(t, dbs, numDocs);
});

// check dbs
test("verify local-replicated in dbs: 0", test_conf, function (t) {
    common.verifyNumDocs(t, dbs, 0);
})

test("cleanup cb bucket", test_conf, function(t){
    if (config.DbUrl.indexOf("http") > -1){
        coax.post([config.DbUrl + "/pools/default/buckets/" + config.DbBucket + "/controller/doFlush"],
            {"auth":{"passwordCredentials":{"username":"Administrator", "password":"password"}}}, function (err, js){
                t.false(err, "flush cb bucket")
            },
            setTimeout(function(){
                t.end();
            }, test_time * 2));
    }else{
        t.end();
    }
})

// delete all dbs
// https://github.com/couchbase/couchbase-lite-ios/issues/1325
test("delete test databases", function(t){
    common.deleteDBs(t, dbs.concat(repdbs).concat(sgdbs))
    setTimeout(function () {
        t.end()
    }, 6000)
})

test("done", function (t) {
    common.cleanup(t, function (json) {
        sg.kill();
        t.end();
    }, console.timeEnd(module_name));
});