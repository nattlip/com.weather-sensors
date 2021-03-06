﻿"use strict";

/*
Copyright (c) 2016 Ramón Baas

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const alecto = require('alecto');
const cresta = require('cresta');
const oregon = require('oregon');
const utils = require('utils');
const sensor = require('./drivers/sensor.js');

const protocols = { 
	oregonv2: { name: 'Oregon Scientific v2', signal: 'OregonV2', parser: oregon.parsev2 },
	oregonv3: { name: 'Oregon Scientific v3', signal: 'OregonV3', parser: oregon.parsev3 },
	cresta: { name: 'Cresta / TFA', signal: 'Cresta', parser: cresta.parse },
	alecto: { name: 'Alecto v3', signal: 'AlectoV3', parser: alecto.parsev3 }
};
const locale = Homey.manager('i18n').getLanguage() == 'nl' ? 'nl' : 'en'; // only Dutch & English supported

var signals = {};

// Register all needed signals with Homey
function registerSignals(setting) {
	var HomeySignal = Homey.wireless('433').Signal;
	Object.keys(protocols).forEach(function(s) {
		if (setting && setting[s]) {
			if (setting[s].watching && signals[s] == null) {
				// Register signal defitinion with Homey
				signals[s] = new HomeySignal(protocols[s].signal);
				signals[s].register(function (err, success) {
					if (err != null) {
						utils.debug('Signal', s, '; err', err, 'success', success);
					} else { 
						utils.debug('Signal', s, 'registered.')
						// Register data receive event
						signals[s].on('payload', function (payload, first) {
							var result = protocols[s].parser(payload);
							sensor.update(result);
						});
					}
				});
			} else if (!setting[s].watching && signals[s] != null) {
				// Un-register signal with Homey
				signals[s].unregister();
				utils.debug('Signal', s, 'unregistered.')
			}
		}
	});
}

var self = module.exports = {

    init: function () {
        
		// Uncomment to turn on debugging
		//utils.setDebug(true);
		
		// Read app settings for protocol selection
		var setting = Homey.manager('settings').get('protocols');
		registerSignals(setting);
		
		// Catch update of settings
		Homey.manager('settings').on('set', function(varName) {
			if (varName == 'protocols') {
				setting = Homey.manager('settings').get('protocols');
				registerSignals(setting);
			}
		});
		
    },
    deleted: function () {
		for (var s in signals) {
			signals[s].unregister();
		}
    },
	api: {
		getSensors: sensor.getSensors,
		getProtocols: function() {
			var result = {};
			for (var p in protocols) {
				result[p] = { id: p, name: protocols[p].name }
			}
			return result
		}
	}
}
