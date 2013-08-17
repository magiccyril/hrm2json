hrm2json = (function() {
    'use strict';

    function getHRMParam(data, param) {
        var start = data.indexOf(param);
        var end = data.indexOf('\r\n', start);

        return data.substring(start + param.length + 1, end);
    }

    function parseFeatures(mode) {
        var features = {};

        switch (mode.length) {
            case 3:
                features.cad  = mode[0] == '0';
                features.alt  = mode[0] == '1';
                features.euro = mode[2] == '0';
                break;

            case 8:
            case 9:
            default:
                features.speed    = mode[0] == '1';
                features.cad      = mode[1] == '1';
                features.alt      = mode[2] == '1';
                features.power    = mode[3] == '1';
                features.euro     = mode[7] == '0';
                features.pressure = mode[8] == '1';
                break;
        }

        return features;
    }

    function parseDateTime(date, time) {
        var now = new Date();

        var year  = date.substr(0, 4);
        var month = date.substr(4, 2);
        var day   = date.substr(6, 2);

        time = time.split(':');
        var hours   = parseFloat(time[0]);
        var minutes = parseFloat(time[1]);
        var seconds = parseFloat(time[2]);

        var dateTime = new Date(year, month - 1, day, hours, minutes, seconds);
        dateTime.setTime(dateTime.getTime() + (dateTime.getTimezoneOffset() * 60 * 1000));

        return dateTime.getTime();
    }

    function parseDuration(durationString) {
        var durationArray = durationString.split(':');
        var h = parseFloat(durationArray[0]);
        var m = parseFloat(durationArray[1]);
        var s = parseFloat(durationArray[2]);

        return (h * 60 * 60 * 1000) + (m * 60 * 1000) + (s * 1000);
    }

    function getHRMData(hrmString) {
        var features = parseFeatures(getHRMParam(hrmString, 'Mode'));

        var startString = '[HRData]\r\n';
        var start = hrmString.indexOf(startString) + startString.length;
        var end = hrmString.indexOf('\r\n\r\n', start);
        var data = hrmString.substring(start, end).split('\r\n');

        var HRMData = [];

        for (var i in data) {
            var row = data[i].split('\t');
            var item = {
                time: null,
                hr: null,
                speed: null,
                cad: null,
                alt: null,
                power: null,
                pressure: null
            };

            item.hr = parseFloat(row[0]);
            if (features.speed) {
                item.speed = parseFloat(row[1]);
            }
            if (features.cad) {
                item.cad = parseFloat(row[2]);
            }
            if (features.alt) {
                item.alt = parseFloat(row[3]);
            }
            if (features.power) {
                item.power = parseFloat(row[4]);
            }
            if (features.pressure) {
                item.pressure = parseFloat(row[6]);
            }

            HRMData.push(item);
        }

        return HRMData;
    }

    function setDistance(hrmData, interval, euro) {
        var totalDistance = 0;
        var interval = parseFloat(interval);

        for (var i in hrmData) {
            var item = hrmData[i];

            item.timeFromStart = i * interval;

            if (typeof item.speed !== 'undefined') {
                var speed = item.speed;
                // in euro mode, speed is in 0.1km/h.
                if (euro) {
                    speed = speed / 10;
                }
                // convert speed to m/s.
                speed = speed / (60 * 60 / 1000);

                var distanceInterval = parseFloat(interval * speed);
                totalDistance = totalDistance + distanceInterval;

                item.distanceFromStart = parseFloat(totalDistance.toFixed(2));
                item.distanceInterval  = parseFloat(distanceInterval.toFixed(2));
            }
        }
        return totalDistance.toFixed(2);
    }

    return {
        version:  undefined,
        features: {
            speed:    undefined,
            cad:      undefined,
            alt:      undefined,
            power:    undefined,
            euro:     undefined,
            pressure: undefined
        },
        dateTime: undefined,
        duration: undefined,
        distance: undefined,
        interval: undefined,
        hrMax:    undefined,
        hrRest:   undefined,
        vo2max:   undefined,
        weight:   undefined,
        hrmData:  [],

        parse: function(hrmString) {
            this.version  = getHRMParam(hrmString, 'Version');
            this.interval = getHRMParam(hrmString, 'Interval');
            this.hrMax    = getHRMParam(hrmString, 'MaxHR');
            this.hrRest   = getHRMParam(hrmString, 'RestHR');
            this.vo2max   = getHRMParam(hrmString, 'VO2max');
            this.weight   = getHRMParam(hrmString, 'Weight');
            this.features = parseFeatures(getHRMParam(hrmString, 'Mode'));
            this.duration = parseDuration(getHRMParam(hrmString, 'Length'));
            this.dateTime = parseDateTime(getHRMParam(hrmString, 'Date'), getHRMParam(hrmString, 'StartTime'))
            this.hrmData  = getHRMData(hrmString);

            this.distance = setDistance(this.hrmData, this.interval, this.features.euro);

            return this;
        }
    };
})();

if (typeof module !== 'undefined') module.exports = hrm2json;
