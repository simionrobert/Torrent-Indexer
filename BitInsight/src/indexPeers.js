﻿'use strict'

process.env.UV_THREADPOOL_SIZE = 64

const fs = require('fs');
const config = require('../config');
const ElasticSearch = require('./lib/Database/Elasticsearch');
const PeerDiscoveryService = require('./lib/Metadata/PeerDiscoveryService');

var indexer = new ElasticSearch(config.DEFAULT_ELASTIC_SEARCH_OPTIONS);
var peerDiscoveryService = new PeerDiscoveryService(config);

var lastInfohashIdIPs = parseInt(fs.readFileSync('resource/lastInfohashIdIPs.txt'), 10);

if (isNaN(lastInfohashIdIPs)) {
    lastInfohashIdIPs = 0;
}


function saveInfohashIDCallback() {
    //periodically save to keep log of where i remained and to continue from
    fs.writeFile('resource/lastInfohashIdIPs.txt', lastInfohashIdIPs, function() {
        console.log("File updated")
    });
}
peerDiscoveryService.on('ip', function (torrent) {
    lastInfohashIdIPs++;

    console.log('\n' + lastInfohashIdIPs + ". Infohash: " + torrent.infohash.toString('hex'));
    console.log('List ip sent to batch ' + torrent.listIP.length);



    setImmediate((torrent) => {
        indexer.indexIP(torrent, saveInfohashIDCallback)
    }, torrent);
});

peerDiscoveryService.on('cacheEmpty', function () {
    indexer.getLastInfohashes(lastInfohashIdIPs + 1, lastInfohashIdIPs + 10, function (listInfohashes) {
        if (listInfohashes.length != 0) {
            peerDiscoveryService.addToCache(listInfohashes);
            peerDiscoveryService.startService()
        }
    })
})


function manualIdentify() {
    var listInfohashes = ["f3077eaaa6cb8f420f97a4553905b3cac444d998", "a45776cef4455136f4782e331a87fee5cfbff599"];

    peerDiscoveryService.addToCache(listInfohashes);
    peerDiscoveryService.startService()
}


peerDiscoveryService.startService()