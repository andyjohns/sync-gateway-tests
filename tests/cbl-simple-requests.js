var launcher = require("../lib/launcher"),
    spawn = require('child_process').spawn,
    coax = require("coax"),
    async = require("async"),
    common = require("../tests/common"),
    conf_file = process.env.CONF_FILE || 'local',
    config = require('../config/' + conf_file),
    utils = common.utils,
    ee = common.ee,
    test = require("tap").test,
    test_time = process.env.TAP_TIMEOUT || 30000,
    test_conf = {
        timeout: test_time * 1000
    },
    port = config.LiteServPort,
    host = "127.0.0.1";


var server,
    dbs = ["simple-requests"];

var numDocs = parseInt(config.numDocs) || 100;

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
test("start test client", function (t) {
    common.launchClient(t, function (_server) {
        server = _server
        coax([server, "_session"], function (err, ok) {
            try {
                console.error(ok)
                t.equals(ok.ok, true, "api exists")
                if (ok.ok == true) {
                    t.end()
                } else {  return new Error("LiteServ was not run?: " + ok)}
            } catch (err) {
                console.error(err, "will restart LiteServ...")
                common.launchClient(t, function (_server) {
                    server = _server
                    t.end()
                }, setTimeout(function () {
                }, 3000))
            }
        })
    })
})

test("create test databases", function (t) {
    common.createDBs(t, dbs);
});
/*
 * https://github.com/couchbase/couchbase-lite-java-core/issues/107 fixed
 * $ curl -X PUT http://127.0.0.1:59851/simple-requests/foo4 -d 'STRING' -H "Content-Type: text/html" 
 * {
 * 	"status" : 406,
 * 	"error" : "not_acceptable"
 * }
 * $ curl -X PUT http://127.0.0.1:8081/simple-requests/foo4 -d 'STRING' -H "Content-Type: text/html" 
 * {"error":"not_found","reason":"Router unable to route request to do_PUT_Documentjava.lang.reflect.InvocationTargetException"}
 */
test("try to create json doc without 'Content-Type'", function (t) {
    var post_data = 'STR';
    var options = {
        host: host,
        port: port,
        path: "/" + dbs[0] + "/foo",
        method: 'PUT',
        headers: {
            'Content-Type': 'text/html'
        }
    };
    console.log(options);
    common.http_post_api(t, post_data, options, 406, function (callback) {
    }, setTimeout(function () {
        t.end();
    }, 5000));
});

/*
 * https://github.com/couchbase/couchbase-lite-java-core/issues/107 fixed
 * $curl -X PUT http://127.0.0.1:8081/simple-requests/foo2 -d 'STRING' -H "Content-Type: application/json" 
 * {"error":"not_found","reason":"Router unable to route request to do_PUT_Documentjava.lang.reflect.InvocationTargetException"}
 * $curl -X PUT http://127.0.0.1:59851/simple-requests/foo2 -d 'STRING' -H "Content-Type: application/json" 
 * {
 *   "status" : 502,
 *   "error" : "Invalid response from remote replication server"
 * }
 */
test("try to create json doc without 'Content-Type'", function (t) {
    var post_data = 'STR';
    var options = {
        host: host,
        port: port,
        path: "/" + dbs[0] + "/foo2",
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    console.log(options);
    common.http_post_api(t, post_data, options, 502, function (callback) {
    }, setTimeout(function () {
        t.end();
    }, 5000));
});


/*
 * https://github.com/couchbase/couchbase-lite-java-core/issues/107 fixed
 * $curl -X PUT http://127.0.0.1:8081/simple-requests/foo3 -d '{"count":1}' -H "Content-Type: text/html" 
 * {"id":"foo","rev":"1-9483947665d3ac2e389c6c7a14848f82","ok":true}
 * $curl -X PUT http://127.0.0.1:59851/simple-requests/foo3 -d '{"count":1}' -H "Content-Type: text/html" 
 * {
 *   "status" : 406,
 *   "error" : "not_acceptable"
 * }
 */
test("try to create json doc without 'Content-Type'", function (t) {
    var post_data = '{"count":1}';
    var options = {
        host: host,
        port: port,
        path: "/" + dbs[0] + "/foo3",
        method: 'PUT',
        headers: {
            'Content-Type': 'text/html'
        }
    };
    common.http_post_api(t, post_data, options, 406, function (callback) {
    }, setTimeout(function () {
        t.end();
    }, 5000));
});


test("done", function (t) {
    common.cleanup(t, function (json) {
        t.end();
    }, console.timeEnd(module_name));
});