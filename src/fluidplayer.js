'use strict';

import promisePolyfill from 'es6-promise';

promisePolyfill.polyfill();

const fluidPlayerScriptLocation = function () {
    let currentSrc = '';

    if (document.currentScript) {
        currentSrc = document.currentScript.src;

    } else {
        //IE
        currentSrc = (function () {
            const scripts = document.getElementsByTagName('script'),
                script = scripts[scripts.length - 1];

            if (script.getAttribute.length !== undefined) {
                return script.src;
            }

            return script.getAttribute('src', -1)
        }());
    }

    if (currentSrc) {
        return currentSrc.substring(0, currentSrc.lastIndexOf('/') + 1);
    }

    return '';
}();


//Object.assign polyfill
if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target == null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }

            const to = Object(target);

            for (let index = 1; index < arguments.length; index++) {
                const nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (let nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

//CustomEvent polyfill
(function () {
    if (typeof window.CustomEvent === "function") return false;

    function CustomEvent(event, params) {
        params = params || {bubbles: false, cancelable: false, detail: undefined};
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();

//remove() polyfill
(function (arr) {
    arr.forEach(function (item) {
        if (item.hasOwnProperty('remove')) {
            return;
        }
        Object.defineProperty(item, 'remove', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function remove() {
                if (this.parentNode === null) {
                    return;
                }
                this.parentNode.removeChild(this);
            }
        });
    });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

const fluidPlayer = function (idVideoPlayer, options) {
    const instance = new fluidPlayerClass();
    instance.init(idVideoPlayer, options);
    return instance;
};

const fluidPlayerClass = function () {
    const self = this; // self always points to current instance of the player.

    self.domRef = {
        player: null
    };

    self.hlsJsScript = '/scripts/hls.min.js';
    self.dashJsScript = '/scripts/dash.min.js';
    self.vttParserScript = '/scripts/webvtt.min.js';
    // self.subtitlesParseScript = '/scripts/vtt.js';
    self.panolensScript = '/scripts/panolens.min.js';
    self.threeJsScript = '/scripts/three.min.js';

    self.version = '2.4.10';
    self.vpaidVer = '2.0';
    self.homepage = 'https://www.fluidplayer.com/';
    self.activeVideoPlayerId = null;
    self.destructors = [];

    self.getInstanceById = (playerId) => {
        // TODO remove;
        return self;
    };

    // TODO remove;
    self.getInstanceIdByWrapperId = (wrapperId) => {
        return self.videoPlayerId;
        // return typeof wrapperId != "undefined" ? wrapperId.replace('fluid_video_wrapper_', '') : null;
    };

    self.requestStylesheet = (cssId, url) => {
        if (!document.getElementById(cssId)) {
            const head = document.getElementsByTagName('head')[0];
            const link = document.createElement('link');

            link.id = cssId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url;
            link.media = 'all';

            head.appendChild(link);
        }
    };

    // TODO: remove
    self.requestScript = (url, callback) => {
        throw 'No!';
    };

    self.isTouchDevice = () => {
        return !!('ontouchstart' in window        // works on most browsers
            || navigator.maxTouchPoints);       // works on IE10/11 and Surface
    };

    /**
     * Distinguishes iOS from Android devices and the OS version.
     *
     * @returns object
     */
    self.getMobileOs = () => {
        const ua = navigator.userAgent;
        let uaindex;

        const result = {device: false, userOs: false, userOsVer: false, userOsMajor: false};

        // determine OS
        if (ua.match(/iPad/i)) {
            result.device = 'iPad';
            result.userOs = 'iOS';
            uaindex = ua.indexOf('OS ');

        } else if (ua.match(/iPhone/i)) {
            result.device = 'iPhone';
            result.userOs = 'iOS';
            uaindex = ua.indexOf('OS ');

        } else if (ua.match(/Android/i)) {
            result.userOs = 'Android';
            uaindex = ua.indexOf('Android ');

        } else {
            result.userOs = false;
        }

        // determine version
        if (result.userOs === 'iOS' && (uaindex > -1)) {
            const userOsTemp = ua.substr(uaindex + 3);
            const indexOfEndOfVersion = userOsTemp.indexOf(' ');

            if (indexOfEndOfVersion !== -1) {
                result.userOsVer = userOsTemp.substring(0, userOsTemp.indexOf(' ')).replace(/_/g, '.');
                result.userOsMajor = parseInt(result.userOsVer);
            }

        } else if (result.userOs === 'Android' && (uaindex > -1)) {
            result.userOsVer = ua.substr(uaindex + 8, 3);

        } else {
            result.userOsVer = false;
        }

        return result;
    };

    /**
     * Browser detection
     *
     * @returns object
     */
    self.getBrowserVersion = () => {

        const ua = navigator.userAgent;
        const result = {browserName: false, fullVersion: false, majorVersion: false, userOsMajor: false};
        let idx, uaindex;

        try {

            result.browserName = navigator.appName;

            if ((idx = ua.indexOf("OPR/")) !== -1) {
                result.browserName = "Opera";
                result.fullVersion = ua.substring(idx + 4);
            } else if ((idx = ua.indexOf("Opera")) !== -1) {
                result.browserName = "Opera";
                result.fullVersion = ua.substring(idx + 6);
                if ((idx = ua.indexOf("Version")) !== -1)
                    result.fullVersion = ua.substring(idx + 8);
            } else if ((idx = ua.indexOf("MSIE")) !== -1) {
                result.browserName = "Microsoft Internet Explorer";
                result.fullVersion = ua.substring(idx + 5);
            } else if ((idx = ua.indexOf("Chrome")) !== -1) {
                result.browserName = "Google Chrome";
                result.fullVersion = ua.substring(idx + 7);
            } else if ((idx = ua.indexOf("Safari")) !== -1) {
                result.browserName = "Safari";
                result.fullVersion = ua.substring(idx + 7);
                if ((idx = ua.indexOf("Version")) !== -1)
                    result.fullVersion = ua.substring(idx + 8);
            } else if ((idx = ua.indexOf("Firefox")) !== -1) {
                result.browserName = "Mozilla Firefox";
                result.fullVersion = ua.substring(idx + 8);
            }
            // Others "name/version" is at the end of userAgent
            else if ((uaindex = ua.lastIndexOf(' ') + 1) < (idx = ua.lastIndexOf('/'))) {
                result.browserName = ua.substring(uaindex, idx);
                result.fullVersion = ua.substring(idx + 1);
                if (result.browserName.toLowerCase() === result.browserName.toUpperCase()) {
                    result.browserName = navigator.appName;
                }
            }

            // trim the fullVersion string at semicolon/space if present
            if ((uaindex = result.fullVersion.indexOf(';')) !== -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }
            if ((uaindex = result.fullVersion.indexOf(' ')) !== -1) {
                result.fullVersion = result.fullVersion.substring(0, uaindex);
            }

            result.majorVersion = parseInt('' + result.fullVersion, 10);

            if (isNaN(result.majorVersion)) {
                result.fullVersion = '' + parseFloat(navigator.appVersion);
                result.majorVersion = parseInt(navigator.appVersion, 10);
            }
        } catch (e) {
            //Return default obj.
        }

        return result;
    };

    self.getCurrentVideoDuration = () => {
        if (self.domRef.player) {
            return self.domRef.player.duration;
        }

        return 0;
    };

    // VAST
    self.getClickThroughUrlFromLinear = (linear) => {
        const videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) { //There should be exactly 1 node
            const clickThroughs = videoClicks[0].getElementsByTagName('ClickThrough');

            if (clickThroughs.length) {
                return this.extractNodeData(clickThroughs[0]);
            }
        }

        return false;
    };

    // VAST
    self.getVastAdTagUriFromWrapper = (xmlResponse) => {
        const wrapper = xmlResponse.getElementsByTagName('Wrapper');

        if (typeof wrapper !== 'undefined' && wrapper.length) {

            const vastAdTagURI = wrapper[0].getElementsByTagName('VASTAdTagURI');
            if (vastAdTagURI.length) {
                return this.extractNodeData(vastAdTagURI[0]);
            }
        }

        return false;
    };

    // VAST
    self.hasInLine = (xmlResponse) => {
        const inLine = xmlResponse.getElementsByTagName('InLine');
        return ((typeof inLine !== 'undefined') && inLine.length);
    };

    // VAST
    self.hasVastAdTagUri = (xmlResponse) => {
        const vastAdTagURI = xmlResponse.getElementsByTagName('VASTAdTagURI');
        return ((typeof vastAdTagURI !== 'undefined') && vastAdTagURI.length);
    };

    // VAST
    self.getClickThroughUrlFromNonLinear = (nonLinear) => {
        let result = '';
        const nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 node
            const nonLinearClickThrough = nonLinear.getElementsByTagName('NonLinearClickThrough');
            if (nonLinearClickThrough.length) {
                result = this.extractNodeData(nonLinearClickThrough[0]);
            }
        }

        return result;
    };

    // VAST
    self.getTrackingFromLinear = (linear) => {
        const trackingEvents = linear.getElementsByTagName('TrackingEvents');

        if (trackingEvents.length) {//There should be no more than one node
            return trackingEvents[0].getElementsByTagName('Tracking');
        }

        return [];
    };

    // VAST
    self.getDurationFromLinear = (linear) => {
        const duration = linear.getElementsByTagName('Duration');

        if (duration.length && (typeof duration[0].childNodes[0] !== 'undefined')) {
            const nodeDuration = this.extractNodeData(duration[0]);
            return this.convertTimeStringToSeconds(nodeDuration);
        }

        return false;
    };

    // VAST
    self.getDurationFromNonLinear = (tag) => {
        let result = 0;
        const nonLinear = tag.getElementsByTagName('NonLinear');
        if (nonLinear.length && (typeof nonLinear[0].getAttribute('minSuggestedDuration') !== 'undefined')) {
            result = this.convertTimeStringToSeconds(nonLinear[0].getAttribute('minSuggestedDuration'));
        }
        return result;
    };

    // VAST
    self.getDimensionFromNonLinear = (tag) => {
        const result = {'width': null, 'height': null};
        const nonLinear = tag.getElementsByTagName('NonLinear');

        if (nonLinear.length) {
            if (typeof nonLinear[0].getAttribute('width') !== 'undefined') {
                result.width = nonLinear[0].getAttribute('width');
            }
            if (typeof nonLinear[0].getAttribute('height') !== 'undefined') {
                result.height = nonLinear[0].getAttribute('height');
            }
        }

        return result;
    };

    // VAST
    self.getCreativeTypeFromStaticResources = (tag) => {
        let result = '';
        const nonLinears = tag.getElementsByTagName('NonLinear');

        if (nonLinears.length && (typeof nonLinears[0].childNodes[0] !== 'undefined')) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource')[0].getAttribute('creativeType');
        }

        return result.toLowerCase();
    };

    // VAST
    self.getMediaFilesFromLinear = (linear) => {
        const mediaFiles = linear.getElementsByTagName('MediaFiles');

        if (mediaFiles.length) {//There should be exactly 1 MediaFiles node
            return mediaFiles[0].getElementsByTagName('MediaFile');
        }

        return [];
    };

    // VAST
    self.getStaticResourcesFromNonLinear = (linear) => {
        let result = [];
        const nonLinears = linear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {//There should be exactly 1 StaticResource node
            result = nonLinears[0].getElementsByTagName('StaticResource');
        }

        return result;
    };

    // VAST
    self.extractNodeData = (parentNode) => {
        let contentAsString = "";
        for (let n = 0; n < parentNode.childNodes.length; n++) {
            const child = parentNode.childNodes[n];
            if (child.nodeType === 8 || (child.nodeType === 3 && /^\s*$/.test(child.nodeValue))) {
                // Comments or text with no content
            } else {
                contentAsString += child.nodeValue;
            }
        }
        return contentAsString.replace(/(^\s+|\s+$)/g, '');
    };

    // VAST
    self.getAdParametersFromLinear = (linear) => {
        const adParameters = linear.getElementsByTagName('AdParameters');
        let adParametersData = null;

        if (adParameters.length) {
            adParametersData = this.extractNodeData(adParameters[0]);
        }

        return adParametersData;
    };

    // VAST
    self.getMediaFileListFromLinear = (linear) => {
        const mediaFileList = [];
        const mediaFiles = this.getMediaFilesFromLinear(linear);

        if (!mediaFiles.length) {
            return mediaFileList;
        }

        for (let n = 0; n < mediaFiles.length; n++) {
            let mediaType = mediaFiles[n].getAttribute('mediaType');

            if (!mediaType) {
                // if there is no mediaType attribute then the video is 2D
                mediaType = '2D';
            }

            // get all the attributes of media file
            mediaFileList.push({
                'src': this.extractNodeData(mediaFiles[n]),
                'type': mediaFiles[n].getAttribute('type'),
                'apiFramework': mediaFiles[n].getAttribute('apiFramework'),
                'codec': mediaFiles[n].getAttribute('codec'),
                'id': mediaFiles[n].getAttribute('codec'),
                'fileSize': mediaFiles[n].getAttribute('fileSize'),
                'delivery': mediaFiles[n].getAttribute('delivery'),
                'width': mediaFiles[n].getAttribute('width'),
                'height': mediaFiles[n].getAttribute('height'),
                'mediaType': mediaType.toLowerCase()
            });

        }

        return mediaFileList;
    };

    // VAST
    self.getIconClickThroughFromLinear = (linear) => {
        const iconClickThrough = linear.getElementsByTagName('IconClickThrough');

        if (iconClickThrough.length) {
            return this.extractNodeData(iconClickThrough[0]);
        }

        return '';
    };

    // VAST
    self.getStaticResourceFromNonLinear = (linear) => {
        let fallbackStaticResource;
        const staticResources = this.getStaticResourcesFromNonLinear(linear);

        for (let i = 0; i < staticResources.length; i++) {
            if (!staticResources[i].getAttribute('type')) {
                fallbackStaticResource = this.extractNodeData(staticResources[i]);
            }

            if (staticResources[i].getAttribute('type') === this.displayOptions.staticResource) {
                return this.extractNodeData(staticResources[i]);
            }
        }

        return fallbackStaticResource;
    };

    // VAST
    self.registerTrackingEvents = (creativeLinear, tmpOptions) => {
        const trackingEvents = this.getTrackingFromLinear(creativeLinear);
        let eventType = '';
        let oneEventOffset = 0;

        for (let i = 0; i < trackingEvents.length; i++) {
            eventType = trackingEvents[i].getAttribute('event');

            switch (eventType) {
                case 'start':
                case 'firstQuartile':
                case 'midpoint':
                case 'thirdQuartile':
                case 'complete':
                    if (typeof tmpOptions.tracking[eventType] === 'undefined') {
                        tmpOptions.tracking[eventType] = [];
                    }

                    if (typeof tmpOptions.stopTracking[eventType] === 'undefined') {
                        tmpOptions.stopTracking[eventType] = [];
                    }
                    tmpOptions.tracking[eventType].push(trackingEvents[i].childNodes[0].nodeValue);
                    tmpOptions.stopTracking[eventType] = false;

                    break;

                case 'progress':
                    if (typeof tmpOptions.tracking[eventType] === 'undefined') {
                        tmpOptions.tracking[eventType] = [];
                    }

                    oneEventOffset = this.convertTimeStringToSeconds(trackingEvents[i].getAttribute('offset'));

                    if (typeof tmpOptions.tracking[eventType][oneEventOffset] === 'undefined') {
                        tmpOptions.tracking[eventType][oneEventOffset] = {
                            elements: [],
                            stopTracking: false
                        };
                    }

                    tmpOptions.tracking[eventType][oneEventOffset].elements.push(trackingEvents[i].childNodes[0].nodeValue);

                    break;

                default:
                    break;
            }
        }
    };

    // VAST
    self.registerClickTracking = (clickTrackingTag, tmpOptions) => {
        if (clickTrackingTag.length) {
            for (let i = 0; i < clickTrackingTag.length; i++) {
                if (clickTrackingTag[i] !== '') {
                    tmpOptions.clicktracking.push(clickTrackingTag[i]);
                }
            }
        }

    };

    // VAST
    self.registerImpressionEvents = (impressionTags, tmpOptions) => {
        if (impressionTags.length) {
            for (let i = 0; i < impressionTags.length; i++) {
                const impressionEvent = this.extractNodeData(impressionTags[i]);
                tmpOptions.impression.push(impressionEvent);
            }
        }
    };

    // VAST
    self.registerErrorEvents = (errorTags, tmpOptions) => {
        if (
            (typeof errorTags !== 'undefined') &&
            (errorTags !== null) &&
            (errorTags.length === 1) && //Only 1 Error tag is expected
            (errorTags[0].childNodes.length === 1)
        ) {
            tmpOptions.errorUrl = errorTags[0].childNodes[0].nodeValue;
        }
    };

    // VAST
    self.announceError = (code) => {
        if (
            (typeof this.vastOptions.errorUrl === 'undefined') ||
            !this.vastOptions.errorUrl
        ) {
            return;
        }

        if (typeof (code) !== 'undefined') {
            code = parseInt(code);
        } else {
            //Set a default code (900 Unidentified error)
            code = 900;
        }

        const errorUrl = this.vastOptions.errorUrl.replace('[ERRORCODE]', code);

        //Send the error request
        this.callUris([errorUrl]);
    };

    // VAST
    self.announceLocalError = (code, msg) => {
        if (typeof (code) !== 'undefined') {
            code = parseInt(code);
        } else {
            //Set a default code (900 Unidentified error)
            code = 900;
        }
        let message = '[Error] (' + code + '): ';
        message += (!msg) ? 'Failed to load Vast' : msg;
        console.log(message);
    };

    // VAST
    self.getClickTrackingEvents = (linear) => {
        const result = [];

        const videoClicks = linear.getElementsByTagName('VideoClicks');

        if (videoClicks.length) {//There should be exactly 1 node
            const clickTracking = videoClicks[0].getElementsByTagName('ClickTracking');

            if (clickTracking.length) {
                for (let i = 0; i < clickTracking.length; i++) {
                    const clickTrackingEvent = this.extractNodeData(clickTracking[i]);
                    result.push(clickTrackingEvent);
                }
            }
        }

        return result;
    };

    // VAST
    self.getNonLinearClickTrackingEvents = (nonLinear) => {
        const result = [];
        const nonLinears = nonLinear.getElementsByTagName('NonLinear');

        if (nonLinears.length) {
            const clickTracking = nonLinear.getElementsByTagName('NonLinearClickTracking');
            if (clickTracking.length) {
                for (let i = 0; i < clickTracking.length; i++) {
                    const NonLinearClickTracking = this.extractNodeData(clickTracking[i]);
                    result.push(NonLinearClickTracking);
                }
            }
        }

        return result;
    };

    // VAST
    self.callUris = (uris) => {
        for (let i = 0; i < uris.length; i++) {
            new Image().src = uris[i];
        }
    };

    // VAST
    // TODO: why the argument
    self.recalculateAdDimensions = (idVideoPlayer) => {
        if ((!idVideoPlayer) && (typeof this.videoPlayerId !== 'undefined')) {
            idVideoPlayer = this.videoPlayerId;
        }

        const videoPlayer = document.getElementById(idVideoPlayer);
        const divClickThrough = document.getElementById('vast_clickthrough_layer_' + idVideoPlayer);

        if (divClickThrough) {
            divClickThrough.style.width = videoPlayer.offsetWidth + 'px';
            divClickThrough.style.height = videoPlayer.offsetHeight + 'px';
        }

        const requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + idVideoPlayer);
        const fullscreenButton = document.getElementById(idVideoPlayer + '_fluid_control_fullscreen');
        const menuOptionFullscreen = document.getElementById(idVideoPlayer + 'context_option_fullscreen');

        if (requestFullscreenFunctionNames) {
            // this will go other way around because we alredy exited full screen
            if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                // Exit fullscreen
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                // Go fullscreen
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        } else {
            // TODO: I am fairly certain this fallback does not work...
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            const fullscreenTag = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);

            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className += ' pseudo_fullscreen';
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            }
        }
    };

    // VAST
    self.prepareVast = (roll) => {
        let list = self.findRoll(roll);

        for (let i = 0; i < list.length; i++) {
            const adListId = list[i];

            if (self.adList[adListId].vastLoaded !== true && self.adList[adListId].error !== true) {
                self.processVastWithRetries(self.adList[adListId]);
                self.domRef.player.addEventListener('adId_' + adListId, self[roll]);
            }
        }
    };

    self.toggleLoader = (showLoader) => {
        self.isLoading = !!showLoader;

        const loaderDiv = document.getElementById('vast_video_loading_' + this.videoPlayerId);

        if (showLoader) {
            loaderDiv.style.display = 'table';
        } else {
            loaderDiv.style.display = 'none';
        }
    };

    self.sendRequest = (url, withCredentials, timeout, functionReadyStateChange) => {
        const xmlHttpReq = new XMLHttpRequest();

        xmlHttpReq.onreadystatechange = functionReadyStateChange;

        xmlHttpReq.open('GET', url, true);
        xmlHttpReq.withCredentials = withCredentials;
        xmlHttpReq.timeout = timeout;
        xmlHttpReq.send();
    };

    self.playMainVideoWhenVpaidFails = (errorCode) => {
        const vpaidSlot = document.getElementById(self.videoPlayerId + "_fluid_vpaid_slot");

        if (vpaidSlot) {
            vpaidSlot.remove();
        }

        clearInterval(self.getVPAIDAdInterval);
        self.playMainVideoWhenVastFails(errorCode);
    };

    self.playMainVideoWhenVastFails = (errorCode) => {
        self.debugMessage('playMainVideoWhenVastFails called');
        self.domRef.player.removeEventListener('loadedmetadata', self.switchPlayerToVastMode);
        self.domRef.player.pause();
        self.toggleLoader(false);
        self.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();

        if (!self.vastOptions || typeof this.vastOptions.errorUrl === 'undefined') {
            self.announceLocalError(errorCode);
        } else {
            self.announceError(errorCode);
        }

        self.switchToMainVideo();
    };

    self.switchPlayerToVastMode = () => {
    };

    self.switchPlayerToVpaidMode = () => {
    };

    /**
     * Process the XML response
     *
     * @param xmlResponse
     * @param tmpOptions
     * @param callBack
     */
    self.processVastXml = (xmlResponse, tmpOptions, callBack) => {
        let clickTracks;

        if (!xmlResponse) {
            callBack(false);
            return;
        }

        //Get impression tag
        const impression = xmlResponse.getElementsByTagName('Impression');
        if (impression !== null) {
            self.registerImpressionEvents(impression, tmpOptions);
        }

        //Get the error tag, if any
        const errorTags = xmlResponse.getElementsByTagName('Error');
        if (errorTags !== null) {
            self.registerErrorEvents(errorTags, tmpOptions);
        }

        //Get Creative
        const creative = xmlResponse.getElementsByTagName('Creative');

        //Currently only 1 creative and 1 linear is supported
        if ((typeof creative !== 'undefined') && creative.length) {
            const arrayCreativeLinears = creative[0].getElementsByTagName('Linear');

            if ((typeof arrayCreativeLinears !== 'undefined') && (arrayCreativeLinears !== null) && arrayCreativeLinears.length) {

                const creativeLinear = arrayCreativeLinears[0];
                self.registerTrackingEvents(creativeLinear, tmpOptions);

                clickTracks = self.getClickTrackingEvents(creativeLinear);
                self.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!self.hasVastAdTagUri(xmlResponse) && self.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adFinished = false;
                    tmpOptions.adType = 'linear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the Linear node
                    tmpOptions.skipoffset = self.convertTimeStringToSeconds(creativeLinear.getAttribute('skipoffset'));
                    tmpOptions.clickthroughUrl = self.getClickThroughUrlFromLinear(creativeLinear);
                    tmpOptions.duration = self.getDurationFromLinear(creativeLinear);
                    tmpOptions.mediaFileList = self.getMediaFileListFromLinear(creativeLinear);
                    tmpOptions.adParameters = self.getAdParametersFromLinear(creativeLinear);
                    tmpOptions.iconClick = self.getIconClickThroughFromLinear(creativeLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }
                }
            }

            const arrayCreativeNonLinears = creative[0].getElementsByTagName('NonLinearAds');

            if ((typeof arrayCreativeNonLinears !== 'undefined') && (arrayCreativeNonLinears !== null) && arrayCreativeNonLinears.length) {

                const creativeNonLinear = arrayCreativeNonLinears[0];
                self.registerTrackingEvents(creativeNonLinear, tmpOptions);

                clickTracks = self.getNonLinearClickTrackingEvents(creativeNonLinear);
                self.registerClickTracking(clickTracks, tmpOptions);

                //Extract the Ad data if it is actually the Ad (!wrapper)
                if (!self.hasVastAdTagUri(xmlResponse) && self.hasInLine(xmlResponse)) {

                    //Set initial values
                    tmpOptions.adType = 'nonLinear';
                    tmpOptions.vpaid = false;

                    //Extract the necessary data from the NonLinear node
                    tmpOptions.clickthroughUrl = self.getClickThroughUrlFromNonLinear(creativeNonLinear);
                    tmpOptions.duration = self.getDurationFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.dimension = self.getDimensionFromNonLinear(creativeNonLinear); // VAST version < 4.0
                    tmpOptions.staticResource = self.getStaticResourceFromNonLinear(creativeNonLinear);
                    tmpOptions.creativeType = self.getCreativeTypeFromStaticResources(creativeNonLinear);
                    tmpOptions.adParameters = self.getAdParametersFromLinear(creativeNonLinear);

                    if (tmpOptions.adParameters) {
                        tmpOptions.vpaid = true;
                    }

                }
            }

            //Extract the Ad data if it is actually the Ad (!wrapper)
            if (!self.hasVastAdTagUri(xmlResponse) && self.hasInLine(xmlResponse)) {

                if (typeof tmpOptions.mediaFileList !== 'undefined' || typeof tmpOptions.staticResource !== 'undefined') {

                    callBack(true, tmpOptions);

                } else {

                    callBack(false);

                }

            }
        } else {
            callBack(false);
        }

    };

    /**
     * Parse the VAST Tag
     *
     * @param vastTag
     * @param adListId
     */

    self.processVastWithRetries = (vastObj) => {
        let vastTag = vastObj.vastTag;
        const adListId = vastObj.id;

        const handleVastResult = function (pass, tmpOptions) {

            if (pass && typeof tmpOptions !== 'undefined' && tmpOptions.vpaid && !self.displayOptions.vastOptions.allowVPAID) {
                pass = false;
                self.announceLocalError('103', 'VPAID not allowed, so skipping this VAST tag.')
            }

            if (pass) {
                // ok

                if (tmpOptions.adType === 'linear') {

                    if ((typeof tmpOptions.iconClick !== 'undefined') && (tmpOptions.iconClick !== null) && tmpOptions.iconClick.length) {
                        self.adList[adListId].landingPage = tmpOptions.iconClick;
                    }

                    const selectedMediaFile = self.getSupportedMediaFileObject(tmpOptions.mediaFileList);
                    if (selectedMediaFile) {
                        self.adList[adListId].mediaType = selectedMediaFile.mediaType;
                    }

                }

                self.adList[adListId].adType = tmpOptions.adType ? tmpOptions.adType : 'unknown';

                self.adList[adListId].vastLoaded = true;
                self.adPool[adListId] = Object.assign({}, tmpOptions);
                const event = document.createEvent('Event');
                event.initEvent('adId_' + adListId, false, true);
                self.domRef.player.dispatchEvent(event);

                self.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();

                if (self.hasTitle()) {
                    const title = document.getElementById(self.videoPlayerId + '_title');
                    title.style.display = 'none';
                }

            } else {
                // when vast failed

                self.reportError('101');

                if (vastObj.hasOwnProperty('fallbackVastTags') && vastObj.fallbackVastTags.length > 0) {
                    vastTag = vastObj.fallbackVastTags.shift();
                    self.processUrl(vastTag, handleVastResult);
                } else {
                    if (vastObj.roll === 'preRoll') {
                        self.preRollFail(vastObj);
                    }
                    self.adList[adListId].error = true;
                }
            }
        };

        self.processUrl(vastTag, handleVastResult);
    };

    self.processUrl = (vastTag, callBack) => {
        const numberOfRedirects = 0;

        const tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            clicktracking: [],
            vastLoaded: false
        };

        self.resolveVastTag(
            vastTag,
            numberOfRedirects,
            tmpOptions,
            callBack
        );
    };

    self.resolveVastTag = (vastTag, numberOfRedirects, tmpOptions, callBack) => {
        if (!vastTag || vastTag === '') {
            callBack(false);
            return;
        }

        const handleXmlHttpReq = function () {
            const xmlHttpReq = this;
            let xmlResponse = false;

            if (xmlHttpReq.readyState === 4 && xmlHttpReq.status === 404) {
                callBack(false);
                return;
            }

            if (xmlHttpReq.readyState === 4 && xmlHttpReq.status === 0) {
                callBack(false); //Most likely that Ad Blocker exists
                return;
            }

            if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                return;
            }

            if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                callBack(false);
                return;
            }

            try {
                xmlResponse = xmlHttpReq.responseXML;
            } catch (e) {
                callBack(false);
                return;
            }

            if (!xmlResponse) {
                callBack(false);
                return;
            }

            self.inLineFound = self.hasInLine(xmlResponse);

            if (!self.inLineFound && self.hasVastAdTagUri(xmlResponse)) {

                const vastAdTagUri = self.getVastAdTagUriFromWrapper(xmlResponse);
                if (vastAdTagUri) {
                    self.resolveVastTag(vastAdTagUri, numberOfRedirects, tmpOptions, callBack);
                } else {
                    callBack(false);
                    return;
                }
            }

            if (numberOfRedirects > self.displayOptions.vastOptions.maxAllowedVastTagRedirects && !self.inLineFound) {
                callBack(false);
                return;
            }

            self.processVastXml(xmlResponse, tmpOptions, callBack);
        };

        if (numberOfRedirects <= self.displayOptions.vastOptions.maxAllowedVastTagRedirects) {

            self.sendRequest(
                vastTag,
                true,
                self.displayOptions.vastOptions.vastTimeout,
                handleXmlHttpReq
            );
        }

        numberOfRedirects++;
    };

    /**
     * Helper function to stop processing
     *
     * @param errorCode
     */
    self.reportError = (errorCode) => {
        self.announceLocalError(errorCode);
    };

    self.backupMainVideoContentTime = (adListId) => {
        const roll = self.adList[adListId].roll;

        //spec configs by roll
        switch (roll) {
            case 'midRoll':
                self.domRef.player.mainVideoCurrentTime = self.domRef.player.currentTime - 1;
                break;

            case 'postRoll':
                self.domRef.player.mainVideoCurrentTime = self.mainVideoDuration;
                self.autoplayAfterAd = false;
                self.domRef.player.currentTime = self.mainVideoDuration;
                break;

            case 'preRoll':
                if (self.domRef.player.currentTime > 0) {
                    self.domRef.player.mainVideoCurrentTime = self.domRef.player.currentTime - 1;
                }
                break;
        }
    };

    self.checkVPAIDInterface = (vpaidAdUnit) => {
        const VPAIDCreative = vpaidAdUnit;
        // checks if all the mandatory params present
        return !!(VPAIDCreative.handshakeVersion && typeof VPAIDCreative.handshakeVersion == "function"
            && VPAIDCreative.initAd && typeof VPAIDCreative.initAd == "function"
            && VPAIDCreative.startAd && typeof VPAIDCreative.startAd == "function"
            && VPAIDCreative.stopAd && typeof VPAIDCreative.stopAd == "function"
            && VPAIDCreative.skipAd && typeof VPAIDCreative.skipAd == "function"
            && VPAIDCreative.resizeAd && typeof VPAIDCreative.resizeAd == "function"
            && VPAIDCreative.pauseAd && typeof VPAIDCreative.pauseAd == "function"
            && VPAIDCreative.resumeAd && typeof VPAIDCreative.resumeAd == "function"
            && VPAIDCreative.expandAd && typeof VPAIDCreative.expandAd == "function"
            && VPAIDCreative.collapseAd && typeof VPAIDCreative.collapseAd == "function"
            && VPAIDCreative.subscribe && typeof VPAIDCreative.subscribe == "function"
            && VPAIDCreative.unsubscribe && typeof VPAIDCreative.unsubscribe == "function");
    };

    self.debugMessage = (msg) => {
        if (self.displayOptions.debug) {
            console.log(msg);
        }
    };

    // Callback for AdPaused
    self.onVpaidAdPaused = () => {
        self.vpaidTimeoutTimerClear();
        self.debugMessage("onAdPaused");
    };

    // Callback for AdPlaying
    self.onVpaidAdPlaying = () => {
        self.vpaidTimeoutTimerClear();
        self.debugMessage("onAdPlaying");
    };

    // Callback for AdError
    self.onVpaidAdError = (message) => {
        self.debugMessage("onAdError: " + message);
        self.vpaidTimeoutTimerClear();
        self.onVpaidEnded();
    };

    // Callback for AdLog
    self.onVpaidAdLog = (message) => {
        self.debugMessage("onAdLog: " + message);
    };

    // Callback for AdUserAcceptInvitation
    self.onVpaidAdUserAcceptInvitation = () => {
        self.debugMessage("onAdUserAcceptInvitation");
    };

    // Callback for AdUserMinimize
    self.onVpaidAdUserMinimize = () => {
        self.debugMessage("onAdUserMinimize");
    };

    // Callback for AdUserClose
    self.onVpaidAdUserClose = () => {
        self.debugMessage("onAdUserClose");
    };

    // Callback for AdUserClose
    self.onVpaidAdSkippableStateChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad Skippable State Changed to: " + self.vpaidAdUnit.getAdSkippableState());
    };

    // Callback for AdUserClose
    self.onVpaidAdExpandedChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad Expanded Changed to: " + self.vpaidAdUnit.getAdExpanded());
    };

    // Pass through for getAdExpanded
    self.getVpaidAdExpanded = () => {
        self.debugMessage("getAdExpanded");

        if (!self.vpaidAdUnit) {
            return;
        }

        return self.vpaidAdUnit.getAdExpanded();
    };

    // Pass through for getAdSkippableState
    self.getVpaidAdSkippableState = () => {
        self.debugMessage("getAdSkippableState");

        if (!self.vpaidAdUnit) {
            return;
        }
        return self.vpaidAdUnit.getAdSkippableState();
    };

    // Callback for AdSizeChange
    self.onVpaidAdSizeChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad size changed to: w=" + self.vpaidAdUnit.getAdWidth() + " h=" + self.vpaidAdUnit.getAdHeight());
    };

    // Callback for AdDurationChange
    self.onVpaidAdDurationChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad Duration Changed to: " + self.vpaidAdUnit.getAdDuration());
    };

    // Callback for AdRemainingTimeChange
    self.onVpaidAdRemainingTimeChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad Remaining Time Changed to: " + self.vpaidAdUnit.getAdRemainingTime());
    };

    // Pass through for getAdRemainingTime
    self.getVpaidAdRemainingTime = () => {
        self.debugMessage("getAdRemainingTime");
        if (!self.vpaidAdUnit) {
            return;
        }
        return self.vpaidAdUnit.getAdRemainingTime();
    };

    // Callback for AdImpression
    self.onVpaidAdImpression = () => {
        self.debugMessage("Ad Impression");

        //Announce the impressions
        self.trackSingleEvent('impression');
    };

    // Callback for AdClickThru
    self.onVpaidAdClickThru = (url, id, playerHandles) => {
        self.debugMessage("Clickthrough portion of the ad was clicked");

        // if playerHandles flag is set to true
        // then player need to open click thorough url in new window
        if (playerHandles) {
            window.open(self.vastOptions.clickthroughUrl);
        }

        self.pauseVpaidAd();
        // fire click tracking
        self.callUris(self.vastOptions.clicktracking);
    };

    // Callback for AdInteraction
    self.onVpaidAdInteraction = (id) => {
        self.debugMessage("A non-clickthrough event has occured");
    };

    // Callback for AdVideoStart
    self.onVpaidAdVideoStart = () => {
        self.debugMessage("Video 0% completed");
        self.trackSingleEvent('start');
    };

    // Callback for AdUserClose
    self.onVpaidAdVideoFirstQuartile = () => {
        self.debugMessage("Video 25% completed");
        self.trackSingleEvent('firstQuartile');
    };

    // Callback for AdUserClose
    self.onVpaidAdVideoMidpoint = () => {
        self.debugMessage("Video 50% completed");
        self.trackSingleEvent('midpoint');
    };

    // Callback for AdUserClose
    self.onVpaidAdVideoThirdQuartile = () => {
        self.debugMessage("Video 75% completed");
        self.trackSingleEvent('thirdQuartile');
    };

    // Callback for AdVideoComplete
    self.onVpaidAdVideoComplete = () => {
        self.debugMessage("Video 100% completed");
        self.trackSingleEvent('complete');
    };

    // Callback for AdLinearChange
    self.onVpaidAdLinearChange = () => {
        const vpaidNonLinearSlot = document.getElementsByClassName("fluid_vpaidNonLinear_ad")[0];
        const closeBtn = document.getElementById('close_button_' + self.videoPlayerId);
        const adListId = vpaidNonLinearSlot.getAttribute('adlistid');
        self.debugMessage("Ad linear has changed: " + self.vpaidAdUnit.getAdLinear());

        if (self.vpaidAdUnit.getAdLinear()) {
            self.backupMainVideoContentTime(adListId);
            self.isCurrentlyPlayingAd = true;

            if (closeBtn) {
                closeBtn.remove();
            }

            vpaidNonLinearSlot.className = 'fluid_vpaid_slot';
            vpaidNonLinearSlot.id = self.videoPlayerId + "_fluid_vpaid_slot";

            self.domRef.player.loop = false;
            self.domRef.player.removeAttribute('controls'); //Remove the default Controls

            const progressbarContainer = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
            for (let i = 0; i < progressbarContainer.length; i++) {
                progressbarContainer[i].style.backgroundColor = self.displayOptions.layoutControls.adProgressColor;
            }

            self.toggleLoader(false);
        }
    };

    // Pass through for getAdLinear
    self.getVpaidAdLinear = () => {
        self.debugMessage("getAdLinear");
        return self.vpaidAdUnit.getAdLinear();
    };

    // Pass through for startAd()
    self.startVpaidAd = () => {
        self.debugMessage("startAd");
        self.vpaidTimeoutTimerStart();
        self.vpaidAdUnit.startAd();
    };

    // Callback for AdLoaded
    self.onVpaidAdLoaded = () => {
        self.debugMessage("ad has been loaded");

        // start the video play as vpaid is loaded successfully
        self.vpaidTimeoutTimerClear();
        self.startVpaidAd();
    };

    // Callback for StartAd()
    self.onStartVpaidAd = () => {
        self.debugMessage("Ad has started");
        self.vpaidTimeoutTimerClear();
    };

    // Pass through for stopAd()
    self.stopVpaidAd = () => {
        self.vpaidTimeoutTimerStart();
        self.vpaidAdUnit.stopAd();
    };

    // Hard Pass through for stopAd() excluding deleteOtherVpaidAdsApart
    self.hardStopVpaidAd = (deleteOtherVpaidAdsApart) => {
        // this is hard stop of vpaid ads
        // we delete all the vpaid assets so the new one can be loaded
        // delete all assets apart from the ad from deleteOtherVpaidAdsApart
        if (self.vpaidAdUnit) {
            self.vpaidAdUnit.stopAd();
            self.vpaidAdUnit = null;
        }

        const vpaidIframes = document.getElementsByClassName("fluid_vpaid_iframe");
        const vpaidSlots = document.getElementsByClassName("fluid_vpaid_slot");
        const vpaidNonLinearSlots = document.getElementsByClassName("fluid_vpaidNonLinear_ad");

        for (let i = 0; i < vpaidIframes.length; i++) {
            if (vpaidIframes[i].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidIframes[i].remove();
            }
        }

        for (let j = 0; j < vpaidSlots.length; j++) {
            if (vpaidSlots[j].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidSlots[j].remove();
            }
        }

        for (let k = 0; k < vpaidNonLinearSlots.length; k++) {
            if (vpaidNonLinearSlots[k].getAttribute('adListId') !== deleteOtherVpaidAdsApart) {
                vpaidNonLinearSlots[k].remove();
            }
        }
    };

    // Callback for AdUserClose
    self.onStopVpaidAd = () => {
        self.debugMessage("Ad has stopped");
        self.vpaidTimeoutTimerClear();
        self.onVpaidEnded();
    };

    // Callback for AdUserClose
    self.onSkipVpaidAd = () => {
        self.debugMessage("Ad was skipped");

        self.vpaidTimeoutTimerClear();
        self.onVpaidEnded();
    };

    // Passthrough for skipAd
    self.skipVpaidAd = () => {
        self.vpaidTimeoutTimerStart();
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.skipAd();
    };

    // Passthrough for setAdVolume
    self.setVpaidAdVolume = (val) => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.setAdVolume(val);
    };

    // Passthrough for getAdVolume
    self.getVpaidAdVolume = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        return self.vpaidAdUnit.getAdVolume();
    };

    // Callback for AdVolumeChange
    self.onVpaidAdVolumeChange = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.debugMessage("Ad Volume has changed to - " + self.vpaidAdUnit.getAdVolume());
    };

    self.resizeVpaidAuto = () => {
        if (self.vastOptions !== null && self.vastOptions.vpaid && self.vastOptions.linear) {
            const adWidth = self.domRef.player.offsetWidth;
            const adHeight = self.domRef.player.offsetHeight;
            const mode = (self.fullscreenMode ? 'fullscreen' : 'normal');
            this.resizeVpaidAd(adWidth, adHeight, mode);
        }
    };

    //Passthrough for resizeAd
    self.resizeVpaidAd = (width, height, viewMode) => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.resizeAd(width, height, viewMode);
    };

    // Passthrough for pauseAd()
    self.pauseVpaidAd = () => {
        self.vpaidTimeoutTimerStart();
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.pauseAd();
    };

    // Passthrough for resumeAd()
    self.resumeVpaidAd = () => {
        self.vpaidTimeoutTimerStart();
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.resumeAd();
    };

    //Passthrough for expandAd()
    self.expandVpaidAd = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.expandAd();
    };

    //Passthrough for collapseAd()
    self.collapseVpaidAd = () => {
        if (!self.vpaidAdUnit) {
            return;
        }
        self.vpaidAdUnit.collapseAd();
    };

    self.vpaidTimeoutTimerClear = () => {
        if (self.vpaidTimer) {
            clearTimeout(self.vpaidTimer);
        }
    };

    // placeholder for timer function
    self.vpaidTimeoutTimerStart = () => {
        // clear previous timer if any
        self.vpaidTimeoutTimerClear();
        self.vpaidTimer = setTimeout(function () {
            self.reportError('901');
            self.onVpaidEnded();
        }, self.displayOptions.vastOptions.vpaidTimeout);
    };

    self.vpaidCallbackListenersAttach = () => {
        //The key of the object is the event name and the value is a reference to the callback function that is registered with the creative
        const callbacks = {
            AdStarted: self.onStartVpaidAd,
            AdStopped: self.onStopVpaidAd,
            AdSkipped: self.onSkipVpaidAd,
            AdLoaded: self.onVpaidAdLoaded,
            AdLinearChange: self.onVpaidAdLinearChange,
            AdSizeChange: self.onVpaidAdSizeChange,
            AdExpandedChange: self.onVpaidAdExpandedChange,
            AdSkippableStateChange: self.onVpaidAdSkippableStateChange,
            AdDurationChange: self.onVpaidAdDurationChange,
            AdRemainingTimeChange: self.onVpaidAdRemainingTimeChange,
            AdVolumeChange: self.onVpaidAdVolumeChange,
            AdImpression: self.onVpaidAdImpression,
            AdClickThru: self.onVpaidAdClickThru,
            AdInteraction: self.onVpaidAdInteraction,
            AdVideoStart: self.onVpaidAdVideoStart,
            AdVideoFirstQuartile: self.onVpaidAdVideoFirstQuartile,
            AdVideoMidpoint: self.onVpaidAdVideoMidpoint,
            AdVideoThirdQuartile: self.onVpaidAdVideoThirdQuartile,
            AdVideoComplete: self.onVpaidAdVideoComplete,
            AdUserAcceptInvitation: self.onVpaidAdUserAcceptInvitation,
            AdUserMinimize: self.onVpaidAdUserMinimize,
            AdUserClose: self.onVpaidAdUserClose,
            AdPaused: self.onVpaidAdPaused,
            AdPlaying: self.onVpaidAdPlaying,
            AdError: self.onVpaidAdError,
            AdLog: self.onVpaidAdLog
        };

        // Looping through the object and registering each of the callbacks with the creative
        for (let eventName in callbacks) {
            self.vpaidAdUnit.subscribe(callbacks[eventName], eventName, self);
        }

    };

    self.loadVpaid = (adListId, vpaidJsUrl) => {
        const vpaidIframe = document.createElement('iframe');
        vpaidIframe.id = self.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
        vpaidIframe.className = 'fluid_vpaid_iframe';
        vpaidIframe.setAttribute('adListId', adListId);
        vpaidIframe.setAttribute('frameborder', '0');

        self.domRef.player.parentNode.insertBefore(vpaidIframe, self.domRef.player.nextSibling);

        vpaidIframe.contentWindow.document.write('<script src="' + vpaidJsUrl + '"></scr' + 'ipt>');

        // set interval with timeout
        self.tempVpaidCounter = 0;
        self.getVPAIDAdInterval = setInterval(function () {

            const fn = vpaidIframe.contentWindow['getVPAIDAd'];

            // check if JS is loaded fully in iframe
            if (fn && typeof fn == 'function') {

                if (self.vpaidAdUnit) {
                    self.hardStopVpaidAd(adListId);
                }

                self.vpaidAdUnit = fn();
                clearInterval(self.getVPAIDAdInterval);
                if (self.checkVPAIDInterface(self.vpaidAdUnit)) {

                    if (self.getVpaidAdLinear()) {
                        self.isCurrentlyPlayingAd = true;
                        self.switchPlayerToVpaidMode(adListId);
                    } else {
                        self.debugMessage('non linear vpaid ad is loaded');
                        self.loadVpaidNonlinearAssets(adListId);
                    }

                }

            } else {

                // video player will wait for 2seconds if vpaid is not loaded, then it will declare vast error and move ahead
                self.tempVpaidCounter++;
                if (self.tempVpaidCounter >= 20) {
                    clearInterval(self.getVPAIDAdInterval);
                    self.adList[adListId].error = true;
                    self.playMainVideoWhenVpaidFails(403);
                    return false;
                } else {
                    self.debugMessage(self.tempVpaidCounter);
                }

            }

        }, 100);

    };

    self.renderLinearAd = (adListId, backupTheVideoTime) => {
        self.toggleLoader(true);

        //get the proper ad
        self.vastOptions = self.adPool[adListId];

        if (backupTheVideoTime) {
            self.backupMainVideoContentTime(adListId);
        }

        const playVideoPlayer = function (adListId) {

            self.switchPlayerToVpaidMode = function (adListId) {

                self.debugMessage('starting function switchPlayerToVpaidMode');
                const vpaidIframe = self.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
                const creativeData = {};
                creativeData.AdParameters = self.adPool[adListId].adParameters;
                const slotElement = document.createElement('div');
                slotElement.id = self.videoPlayerId + "_fluid_vpaid_slot";
                slotElement.className = 'fluid_vpaid_slot';
                slotElement.setAttribute('adListId', adListId);

                self.domRef.player.parentNode.insertBefore(slotElement, vpaidIframe.nextSibling);

                const environmentVars = {
                    slot: slotElement,
                    videoSlot: self.domRef.player,
                    videoSlotCanAutoPlay: true
                };

                // calls this functions after ad unit is loaded in iframe
                const ver = self.vpaidAdUnit.handshakeVersion(self.vpaidVer);
                const compare = self.compareVersion(self.vpaidVer, ver);
                if (compare === 1) {
                    //VPAID version of ad is lower than we need
                    self.adList[adListId].error = true;
                    self.playMainVideoWhenVpaidFails(403);
                    return false;
                }

                if (self.vastOptions.skipoffset !== false) {
                    self.addSkipButton();
                }

                self.domRef.player.loop = false;
                self.domRef.player.removeAttribute('controls'); //Remove the default Controls

                self.vpaidCallbackListenersAttach();
                const mode = (self.fullscreenMode ? 'fullscreen' : 'normal');
                const adWidth = self.domRef.player.offsetWidth;
                const adHeight = self.domRef.player.offsetHeight;
                self.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

                const progressbarContainer = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = self.displayOptions.layoutControls.adProgressColor;
                }

                self.toggleLoader(false);
                self.adList[adListId].played = true;
                self.adFinished = false;
            };

            self.switchPlayerToVastMode = function () {

                //Get the actual duration from the video file if it is not present in the VAST XML
                if (!self.vastOptions.duration) {
                    self.vastOptions.duration = self.domRef.player.duration;
                }

                if (self.displayOptions.layoutControls.showCardBoardView) {

                    if (!self.adList[adListId].landingPage) {
                        self.addCTAButton(self.adPool[adListId].clickthroughUrl);
                    } else {
                        self.addCTAButton(self.adList[adListId].landingPage);
                    }

                } else {

                    const addClickthroughLayer = (typeof self.adList[adListId].adClickable != "undefined") ? self.adList[adListId].adClickable : self.displayOptions.vastOptions.adClickable;

                    if (addClickthroughLayer) {
                        self.addClickthroughLayer(self.videoPlayerId);
                    }

                    self.addCTAButton(self.adList[adListId].landingPage);

                }

                if (self.vastOptions.skipoffset !== false) {
                    self.addSkipButton();
                }

                self.domRef.player.loop = false;

                self.addAdCountdown();

                self.domRef.player.removeAttribute('controls'); //Remove the default Controls

                self.vastLogoBehaviour(true);

                const progressbarContainer = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');
                for (let i = 0; i < progressbarContainer.length; i++) {
                    progressbarContainer[i].style.backgroundColor = self.displayOptions.layoutControls.adProgressColor;
                }

                if (self.displayOptions.vastOptions.adText || self.adList[adListId].adText) {
                    const adTextToShow = (self.adList[adListId].adText !== null) ? self.adList[adListId].adText : self.displayOptions.vastOptions.adText;
                    self.addAdPlayingText(adTextToShow);
                }

                self.positionTextElements(self.adList[adListId]);

                self.toggleLoader(false);
                self.adList[adListId].played = true;
                self.adFinished = false;
                self.domRef.player.play();

                //Announce the impressions
                self.trackSingleEvent('impression');

                self.domRef.player.removeEventListener('loadedmetadata', self.switchPlayerToVastMode);

                // if in vr mode then do not show
                if (self.vrMode) {

                    const adCountDownTimerText = document.getElementById('ad_countdown' + self.videoPlayerId);
                    const ctaButton = document.getElementById(self.videoPlayerId + '_fluid_cta');
                    const addAdPlayingTextOverlay = document.getElementById(self.videoPlayerId + '_fluid_ad_playing');
                    const skipBtn = document.getElementById('skip_button_' + self.videoPlayerId);

                    if (adCountDownTimerText) {
                        adCountDownTimerText.style.display = 'none';
                    }

                    if (ctaButton) {
                        ctaButton.style.display = 'none';
                    }

                    if (addAdPlayingTextOverlay) {
                        addAdPlayingTextOverlay.style.display = 'none';
                    }

                    if (skipBtn) {
                        skipBtn.style.display = 'none';
                    }

                }

            };

            self.domRef.player.pause();

            // Remove the streaming objects to prevent errors on the VAST content
            self.detachStreamers();

            //Try to load multiple
            const selectedMediaFile = self.getSupportedMediaFileObject(self.vastOptions.mediaFileList);

            // if player in cardboard mode then, linear ads media type should be a '360' video
            if (self.displayOptions.layoutControls.showCardBoardView && self.adList[adListId].mediaType !== '360') {
                self.adList[adListId].error = true;
                self.playMainVideoWhenVastFails(403);
                return false;
            }

            const isVpaid = self.vastOptions.vpaid;

            if (!isVpaid) {

                if (selectedMediaFile.src === false) {
                    // Couldn’t find MediaFile that is supported by this video player, based on the attributes of the MediaFile element.
                    self.adList[adListId].error = true;
                    self.playMainVideoWhenVastFails(403);
                    return false;
                }

                self.domRef.player.addEventListener('loadedmetadata', self.switchPlayerToVastMode);

                self.domRef.player.src = selectedMediaFile.src;
                self.isCurrentlyPlayingAd = true;

                if (self.displayOptions.vastOptions.showProgressbarMarkers) {
                    self.hideAdMarkers();
                }

                self.domRef.player.load();

                //Handle the ending of the Pre-Roll ad
                self.domRef.player.addEventListener('ended', self.onVastAdEnded);

            } else {

                self.loadVpaid(adListId, selectedMediaFile.src);

                if (self.displayOptions.vastOptions.showProgressbarMarkers) {
                    self.hideAdMarkers();
                }

            }

        };

        /**
         * Sends requests to the tracking URIs
         */
        const videoPlayerTimeUpdate = function () {

            if (self.adFinished) {
                self.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                return;
            }

            const currentTime = Math.floor(self.domRef.player.currentTime);
            if (self.vastOptions.duration !== 0) {
                self.scheduleTrackingEvent(currentTime, self.vastOptions.duration);
            }

            if (currentTime >= (self.vastOptions.duration - 1) && self.vastOptions.duration !== 0) {
                self.domRef.player.removeEventListener('timeupdate', videoPlayerTimeUpdate);
                self.adFinished = true;
            }

        };

        playVideoPlayer(adListId);

        self.domRef.player.addEventListener('timeupdate', videoPlayerTimeUpdate);

    };

    self.playRoll = (adListId) => {
        // register all the ad pods
        for (let i = 0; i < adListId.length; i++) {
            if (!self.adPool.hasOwnProperty(adListId[i])) {
                self.announceLocalError(101);
                return;
            }
            self.temporaryAdPods.push(self.adList[adListId[i]]);
        }

        if (self.vastOptions !== null && self.vastOptions.adType.toLowerCase() === 'linear') {
            return;
        }

        const adListIdToPlay = self.getNextAdPod();

        if (adListIdToPlay !== null) {
            self.renderLinearAd(adListIdToPlay, true);
        }
    };

    self.getSupportedMediaFileObject = (mediaFiles) => {
        let selectedMediaFile = null;
        let adSupportedType = false;
        if (mediaFiles.length) {
            for (let i = 0; i < mediaFiles.length; i++) {

                if (mediaFiles[i].apiFramework !== 'VPAID') {
                    const supportLevel = this.getMediaFileTypeSupportLevel(mediaFiles[i]['type']);

                    if (supportLevel === "maybe" || supportLevel === "probably") {
                        selectedMediaFile = mediaFiles[i];
                        adSupportedType = true;
                    }

                    //one of the best(s) option, no need to seek more
                    if (supportLevel === "probably") {
                        break;
                    }

                } else {
                    selectedMediaFile = mediaFiles[i];
                    adSupportedType = true;
                    break;
                }

            }
        }

        if (adSupportedType === false) {
            return false;
        }

        return selectedMediaFile;
    };

    /**
     * Reports how likely it is that the current browser will be able to play media of a given MIME type.
     * return (string): "probably", "maybe", "no" or null
     */
    self.getMediaFileTypeSupportLevel = (mediaType) => {
        if (mediaType === null) {
            return null;
        }

        const tmpVideo = document.createElement('video');

        let response = tmpVideo.canPlayType(mediaType);

        if (response === "") {
            response = "no";
        }
        return response;
    };

    self.scheduleTrackingEvent = (currentTime, duration) => {
        if (currentTime === 0) {
            self.trackSingleEvent('start');
        }

        if (
            (typeof self.vastOptions.tracking['progress'] !== 'undefined') &&
            (self.vastOptions.tracking['progress'].length) &&
            (typeof self.vastOptions.tracking['progress'][currentTime] !== 'undefined')
        ) {
            self.trackSingleEvent('progress', currentTime);
        }

        if (currentTime === (Math.floor(duration / 4))) {
            self.trackSingleEvent('firstQuartile');
        }

        if (currentTime === (Math.floor(duration / 2))) {
            self.trackSingleEvent('midpoint');
        }

        if (currentTime === (Math.floor(duration * 3 / 4))) {
            self.trackSingleEvent('thirdQuartile');
        }

        if (currentTime >= (duration - 1)) {
            self.trackSingleEvent('complete');
        }
    };

    self.trackSingleEvent = (eventType, eventSubType) => {
        if (typeof self.vastOptions === 'undefined' || self.vastOptions === null) {
            return;
        }

        let trackingUris = [];
        trackingUris.length = 0;

        switch (eventType) {
            case 'start':
            case 'firstQuartile':
            case 'midpoint':
            case 'thirdQuartile':
            case 'complete':
                if (self.vastOptions.stopTracking[eventType] === false) {
                    if (self.vastOptions.tracking[eventType] !== null) {
                        trackingUris = self.vastOptions.tracking[eventType];
                    }

                    self.vastOptions.stopTracking[eventType] = true;
                }

                break;

            case 'progress':
                self.vastOptions.tracking['progress'][eventSubType].elements.forEach(function (currentValue, index) {
                    if (
                        (self.vastOptions.tracking['progress'][eventSubType].stopTracking === false) &&
                        (self.vastOptions.tracking['progress'][eventSubType].elements.length)
                    ) {
                        trackingUris = self.vastOptions.tracking['progress'][eventSubType].elements;
                    }

                    self.vastOptions.tracking['progress'][eventSubType].stopTracking = true;
                });
                break;

            case 'impression':
                if (
                    (typeof self.vastOptions.impression !== 'undefined') &&
                    (self.vastOptions.impression !== null) &&
                    (typeof self.vastOptions.impression.length !== 'undefined')
                ) {
                    trackingUris = self.vastOptions.impression;
                }
                break;

            default:
                break;
        }

        self.callUris(trackingUris);
    };

    self.completeNonLinearStatic = (adListId) => {
        self.closeNonLinear(adListId);
        if (self.adFinished === false) {
            self.adFinished = true;
            self.trackSingleEvent('complete');
        }
        clearInterval(self.nonLinearTracking);
    };

    /**
     * Show up a nonLinear static creative
     */
    self.createNonLinearStatic = (adListId) => {
        if (!self.adPool.hasOwnProperty(adListId) || self.adPool[adListId].error === true) {
            self.announceLocalError(101);
            return;
        }

        //get the proper ad
        self.vastOptions = self.adPool[adListId];
        self.createBoard(adListId);
        if (self.adList[adListId].error === true) {
            return;
        }
        self.adFinished = false;

        if (!self.vastOptions.vpaid) {
            self.trackSingleEvent('start');

            const duration = (self.adList[adListId].nonLinearDuration) ? self.adList[adListId].nonLinearDuration : self.vastOptions.duration;

            self.nonLinearTracking = setInterval(function () {

                if (self.adFinished !== true) {

                    const currentTime = Math.floor(self.domRef.player.currentTime);
                    self.scheduleTrackingEvent(currentTime, duration);

                    if (currentTime >= (duration - 1)) {
                        self.adFinished = true;
                    }

                }

            }, 400);
        }

        const time = parseInt(self.getCurrentTime()) + parseInt(duration);
        self.scheduleTask({time: time, closeStaticAd: adListId});
    };

    self.compareVersion = (v1, v2) => {
        if (typeof v1 !== 'string') return false;
        if (typeof v2 !== 'string') return false;
        v1 = v1.split('.');
        v2 = v2.split('.');
        const k = Math.min(v1.length, v2.length);
        for (let i = 0; i < k; ++i) {
            v1[i] = parseInt(v1[i], 10);
            v2[i] = parseInt(v2[i], 10);
            if (v1[i] > v2[i]) return 1;
            if (v1[i] < v2[i]) return -1;
        }
        return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
    };

    self.createVpaidNonLinearBoard = (adListId) => {
        // create iframe
        // pass the js

        const vastSettings = self.adPool[adListId];

        self.loadVpaidNonlinearAssets = function (adListId) {

            self.debugMessage('starting function switchPlayerToVpaidMode');

            const vAlign = (self.adList[adListId].vAlign) ? self.adList[adListId].vAlign : self.nonLinearVerticalAlign;
            const showCloseButton = (self.adList[adListId].vpaidNonLinearCloseButton) ? self.adList[adListId].vpaidNonLinearCloseButton : self.vpaidNonLinearCloseButton;
            const vpaidIframe = self.videoPlayerId + "_" + adListId + "_fluid_vpaid_iframe";
            const creativeData = {};
            creativeData.AdParameters = self.adPool[adListId].adParameters;
            const slotWrapper = document.createElement('div');
            slotWrapper.id = 'fluid_vpaidNonLinear_' + adListId;
            slotWrapper.className = 'fluid_vpaidNonLinear_' + vAlign;
            slotWrapper.className += ' fluid_vpaidNonLinear_ad';
            slotWrapper.setAttribute('adListId', adListId);

            // Default values in case nothing defined in VAST data or ad settings
            let adWidth = Math.min(468, self.domRef.player.offsetWidth);
            let adHeight = Math.min(60, Math.floor(self.domRef.player.offsetHeight / 4));

            if (typeof self.adList[adListId].size !== 'undefined') {
                const dimensions = self.adList[adListId].size.split('x');
                adWidth = dimensions[0];
                adHeight = dimensions[1];
            } else if (vastSettings.dimension.width && vastSettings.dimension.height) {
                adWidth = vastSettings.dimension.width;
                adHeight = vastSettings.dimension.height;
            }

            slotWrapper.style.width = '100%';
            slotWrapper.style.height = adHeight + 'px';

            if (showCloseButton) {
                const slotFrame = document.createElement('div');
                slotFrame.className = 'fluid_vpaidNonLinear_frame';
                slotFrame.style.width = adWidth + 'px';
                slotFrame.style.height = adHeight + 'px';
                slotWrapper.appendChild(slotFrame);

                const closeBtn = document.createElement('div');
                closeBtn.id = 'close_button_' + self.videoPlayerId;
                closeBtn.className = 'close_button';
                closeBtn.innerHTML = '';
                closeBtn.title = self.displayOptions.layoutControls.closeButtonCaption;
                const tempadListId = adListId;
                closeBtn.onclick = function (event) {

                    self.hardStopVpaidAd('');

                    if (typeof event.stopImmediatePropagation !== 'undefined') {
                        event.stopImmediatePropagation();
                    }
                    self.adFinished = true;

                    //if any other onPauseRoll then render it
                    if (self.adList[tempadListId].roll === 'onPauseRoll' && self.onPauseRollAdPods[0]) {
                        const getNextOnPauseRollAd = self.onPauseRollAdPods[0];
                        self.createBoard(getNextOnPauseRollAd);
                        self.currentOnPauseRollAd = self.onPauseRollAdPods[0];
                        delete self.onPauseRollAdPods[0];
                    }

                    return false;
                };

                slotFrame.appendChild(closeBtn);

            }

            const slotIframe = document.createElement('iframe');
            slotIframe.id = self.videoPlayerId + "non_linear_vapid_slot_iframe";
            slotIframe.className = 'fluid_vpaid_nonlinear_slot_iframe';
            slotIframe.setAttribute('width', adWidth + 'px');
            slotIframe.setAttribute('height', adHeight + 'px');
            slotIframe.setAttribute('sandbox', 'allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
            slotIframe.setAttribute('frameborder', '0');
            slotIframe.setAttribute('scrolling', 'no');
            slotIframe.setAttribute('marginwidth', '0');
            slotIframe.setAttribute('marginheight', '0');
            slotWrapper.appendChild(slotIframe);

            self.domRef.player.parentNode.insertBefore(slotWrapper, vpaidIframe.nextSibling);

            const slotElement = slotIframe.contentWindow.document.createElement('div');

            slotIframe.contentWindow.document.body.appendChild(slotElement);

            self.vastOptions.slotIframe = slotIframe;
            self.vastOptions.slotFrame = slotFrame;

            const environmentVars = {
                slot: slotElement,
                videoSlot: self.domRef.player,
                videoSlotCanAutoPlay: true
            };

            self.debugMessage(self.adList[adListId]);

            // calls this functions after ad unit is loaded in iframe
            const ver = self.vpaidAdUnit.handshakeVersion(self.vpaidVer);
            const compare = self.compareVersion(self.vpaidVer, ver);
            if (compare === 1) {
                //VPAID version of ad is lower than we need
                self.adList[adListId].error = true;
                self.playMainVideoWhenVpaidFails(403);
                return false;
            }

            self.domRef.player.loop = false;
            self.domRef.player.removeAttribute('controls'); //Remove the default Controls

            self.vpaidCallbackListenersAttach();
            const mode = (self.fullscreenMode ? 'fullscreen' : 'normal');
            self.vpaidAdUnit.initAd(adWidth, adHeight, mode, 3000, creativeData, environmentVars);

            self.toggleLoader(false);
            self.adList[adListId].played = true;
            self.adFinished = false;
        };

        self.loadVpaid(adListId, vastSettings.staticResource);

        self.debugMessage('create non linear vpaid');
    };

    self.createNonLinearBoard = (adListId) => {
        const vastSettings = self.adPool[adListId];

        self.adList[adListId].played = true;
        const playerWidth = self.domRef.player.clientWidth;
        const playerHeight = self.domRef.player.clientHeight;
        const board = document.createElement('div');
        const vAlign = (self.adList[adListId].vAlign) ? self.adList[adListId].vAlign : self.nonLinearVerticalAlign;

        const creative = new Image();
        creative.src = vastSettings.staticResource;
        creative.id = 'fluid_nonLinear_imgCreative_' + adListId + '_' + self.videoPlayerId;

        creative.onerror = function () {
            self.adList[adListId].error = true;
            self.announceError(500);
        };

        creative.onload = function () {
            let origWidth;
            let origHeight;
            let newBannerWidth;
            let newBannerHeight;

            //Set banner size based on the below priority
            // 1. adList -> roll -> size
            // 2. VAST XML width/height attriubute (VAST 3.)
            // 3. VAST XML static resource dimension
            if (typeof self.adList[adListId].size !== 'undefined') {
                origWidth = self.adList[adListId].size.split('x')[0];
                origHeight = self.adList[adListId].size.split('x')[1];
            } else if (vastSettings.dimension.width && vastSettings.dimension.height) {
                origWidth = vastSettings.dimension.width;
                origHeight = vastSettings.dimension.height;
            } else {
                origWidth = creative.width;
                origHeight = creative.height;
            }

            if (origWidth > playerWidth) {
                newBannerWidth = playerWidth - 5;
                newBannerHeight = origHeight * newBannerWidth / origWidth;
            } else {
                newBannerWidth = origWidth;
                newBannerHeight = origHeight;
            }

            if (self.adList[adListId].roll !== 'onPauseRoll') {
                //Show the board only if media loaded
                document.getElementById('fluid_nonLinear_' + adListId).style.display = '';
            }

            const img = document.getElementById(creative.id);
            img.width = newBannerWidth;
            img.height = newBannerHeight;

            self.trackSingleEvent('impression');
        };

        board.id = 'fluid_nonLinear_' + adListId;
        board.className = 'fluid_nonLinear_' + vAlign;
        board.className += ' fluid_nonLinear_ad';
        board.innerHTML = creative.outerHTML;
        board.style.display = 'none';

        //Bind the Onclick event
        board.onclick = function () {
            if (typeof vastSettings.clickthroughUrl !== 'undefined') {
                window.open(vastSettings.clickthroughUrl);
            }

            //Tracking the NonLinearClickTracking events
            if (typeof vastSettings.clicktracking !== 'undefined') {
                self.callUris([vastSettings.clicktracking]);
            }
        };

        if (typeof vastSettings.clickthroughUrl !== 'undefined') {
            board.style.cursor = 'pointer';
        }

        const closeBtn = document.createElement('div');
        closeBtn.id = 'close_button_' + self.videoPlayerId;
        closeBtn.className = 'close_button';
        closeBtn.innerHTML = '';
        closeBtn.title = self.displayOptions.layoutControls.closeButtonCaption;
        const tempadListId = adListId;
        closeBtn.onclick = function (event) {
            this.parentElement.removeChild(this); // TODO: verify
            if (typeof event.stopImmediatePropagation !== 'undefined') {
                event.stopImmediatePropagation();
            }
            self.adFinished = true;
            clearInterval(self.nonLinearTracking);

            //if any other onPauseRoll then render it
            if (self.adList[tempadListId].roll === 'onPauseRoll' && self.onPauseRollAdPods[0]) {
                const getNextOnPauseRollAd = self.onPauseRollAdPods[0];
                self.createBoard(getNextOnPauseRollAd);
                self.currentOnPauseRollAd = self.onPauseRollAdPods[0];
                delete self.onPauseRollAdPods[0];
            }

            return false;
        };

        board.appendChild(closeBtn);
        self.domRef.player.parentNode.insertBefore(board, self.domRef.player.nextSibling);
    };

    /**
     * Adds a nonLinear static Image banner
     *
     * currently only image/gif, image/jpeg, image/png supported
     */
    self.createBoard = (adListId) => {

        const vastSettings = self.adPool[adListId];

        // create nonLinear Vpaid
        // create nonLinear regular
        if (vastSettings.vpaid) {
            self.hardStopVpaidAd('');
            self.createVpaidNonLinearBoard(adListId);

        } else {

            if (typeof vastSettings.staticResource === 'undefined'
                || self.supportedStaticTypes.indexOf(vastSettings.creativeType) === -1) {
                //Couldn’t find NonLinear resource with supported type.
                self.adList[adListId].error = true;
                if (!self.vastOptions || typeof self.vastOptions.errorUrl === 'undefined') {
                    self.announceLocalError(503);
                } else {
                    self.announceError(503);
                }
                return;
            }

            self.createNonLinearBoard(adListId);

        }

    };

    self.closeNonLinear = (adListId) => {
        const element = document.getElementById('fluid_nonLinear_' + adListId);
        if (element) {
            element.remove();
        }
    };

    self.rollGroupContainsLinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (self.adList[groupedRolls[i].id].adType && self.adList[groupedRolls[i].id].adType === 'linear') {
                found = true;
                break;
            }
        }
        return found;
    };
    self.rollGroupContainsNonlinear = (groupedRolls) => {
        let found = false;
        for (let i = 0; i < groupedRolls.length; i++) {
            if (self.adList[groupedRolls[i].id].adType.toLowerCase() === 'nonlinear') {
                found = true;
                break;
            }
        }
        return found;
    };

    self.preRollFail = () => {
        const preRollsLength = self.preRollAdPodsLength;

        self.preRollVastResolved++;

        if (self.preRollVastResolved === preRollsLength) {
            self.preRollAdsPlay();
        }
    };

    self.preRollSuccess = () => {
        const preRollsLength = self.preRollAdPodsLength;

        self.preRollVastResolved++;

        if (self.preRollVastResolved === preRollsLength) {
            self.preRollAdsPlay();
        }
    };

    self.preRollAdsPlay = () => {
        const time = 0;
        const adListIds = self.preRollAdPods;
        const adsByType = {
            linear: [],
            nonLinear: []
        };

        self.firstPlayLaunched = true;

        for (let index = 0; index < adListIds.length; index++) {

            if (self.adList[adListIds[index]].played === true) {
                return
            }

            if (self.adList[adListIds[index]].adType === 'linear') {
                adsByType.linear.push(adListIds[index]);
            }

            if (self.adList[adListIds[index]].adType === 'nonLinear') {
                adsByType.nonLinear.push(adListIds[index]);
                self.scheduleTask({time: time, playRoll: 'midRoll', adListId: adsByType.nonLinear.shift()});
            }
        }

        if (adsByType.linear.length > 0) {
            self.toggleLoader(true);
            self.playRoll(adsByType.linear);
        } else {
            self.playMainVideoWhenVastFails(900);
        }

    };

    self.preRoll = (event) => {
        const vastObj = event.vastObj;
        self.domRef.player.removeEventListener(event.type, self.preRoll);

        const adListId = [];
        adListId[0] = event.type.replace('adId_', '');
        const time = 0;

        if (self.adList[adListId[0]].played === true) {
            return;
        }

        self.preRollAdPods.push(adListId[0]);

        self.preRollSuccess(vastObj);
    };

    self.createAdMarker = (adListId, time) => {
        const markersHolder = document.getElementById(self.videoPlayerId + '_ad_markers_holder');
        const adMarker = document.createElement('div');
        adMarker.id = 'ad_marker_' + self.videoPlayerId + "_" + adListId;
        adMarker.className = 'fluid_controls_ad_marker';
        adMarker.style.left = (time / self.mainVideoDuration * 100) + '%';
        if (self.isCurrentlyPlayingAd) {
            adMarker.style.display = 'none';
        }
        markersHolder.appendChild(adMarker);
    };

    self.hideAdMarker = (adListId) => {
        const element = document.getElementById('ad_marker_' + self.videoPlayerId + "_" + adListId);
        if (element) {
            element.style.display = 'none';
        }
    };

    self.showAdMarkers = () => {
        const markersHolder = document.getElementById(self.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        const idPrefix = 'ad_marker_' + self.videoPlayerId + "_";
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            const adListId = item.id.replace(idPrefix, '');
            if (self.adList[adListId].played === false) {
                item.style.display = '';
            }
        }
    };

    self.hideAdMarkers = () => {
        const markersHolder = document.getElementById(self.videoPlayerId + '_ad_markers_holder');
        const adMarkers = markersHolder.getElementsByClassName('fluid_controls_ad_marker');
        for (let i = 0; i < adMarkers.length; ++i) {
            const item = adMarkers[i];
            item.style.display = 'none';
        }
    };

    self.midRoll = (event) => {
        self.domRef.player.removeEventListener(event.type, self.midRoll); //todo pass id?!

        const adListId = event.type.replace('adId_', '');
        if (self.adList[adListId].played === true) {
            return;
        }

        let time = self.adList[adListId].timer;

        if (typeof time == 'string' && time.indexOf("%") !== -1) {
            time = time.replace('%', '');
            time = Math.floor(self.mainVideoDuration / 100 * time);
        }

        if (self.displayOptions.vastOptions.showProgressbarMarkers &&
            self.adList[adListId].adType === "nonLinear") {
            self.createAdMarker(adListId, time);
        }

        self.scheduleTask({time: time, playRoll: 'midRoll', adListId: adListId});
    };

    self.postRoll = (event) => {
        self.domRef.player.removeEventListener(event.type, self.postRoll);
        const adListId = event.type.replace('adId_', '');
        self.scheduleTask({time: Math.floor(self.mainVideoDuration), playRoll: 'postRoll', adListId: adListId});
    };

    self.onPauseRoll = (event) => {
        self.domRef.player.removeEventListener(event.type, self.onPauseRoll);
        const adListId = event.type.replace('adId_', '');

        if (self.adList[adListId].adType === 'nonLinear') {
            if (!self.adPool.hasOwnProperty(adListId) || self.adPool[adListId].error === true) {
                self.announceLocalError(101);
                return;
            }

            //var playerWrapper = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);
            const nonLinearAdExists = document.getElementsByClassName('fluid_nonLinear_ad')[0];
            if (!nonLinearAdExists) {
                self.createBoard(adListId);
                self.currentOnPauseRollAd = adListId;
                let onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);
                if (onPauseAd) {
                    onPauseAd.style.display = 'none';
                }
            } else {
                self.onPauseRollAdPods.push(adListId);
            }

        }
    };

    /**
     * Check if player has a valid nonLinear onPause Ad
     */
    self.hasValidOnPauseAd = () => {
        const onPauseAd = self.findRoll('onPauseRoll'); //should be only one. todo add validator to allow only one onPause roll

        return (onPauseAd.length !== 0 && self.adList[onPauseAd[0]] && self.adList[onPauseAd[0]].error === false);
    };

    /**
     * Hide/show nonLinear onPause Ad
     */
    self.toggleOnPauseAd = () => {

        if (self.hasValidOnPauseAd() && !self.isCurrentlyPlayingAd) {
            const onPauseRoll = self.findRoll('onPauseRoll');
            let adListId;
            if (self.currentOnPauseRollAd !== '') {
                adListId = self.currentOnPauseRollAd;
            } else {
                adListId = onPauseRoll[0];
            }

            self.vastOptions = self.adPool[adListId];
            const onPauseAd = document.getElementById('fluid_nonLinear_' + adListId);

            if (onPauseAd && self.domRef.player.paused) {
                setTimeout(function () {
                    onPauseAd.style.display = 'flex';
                    self.adList[adListId].played = false;
                    self.trackingOnPauseNonLinearAd(adListId, 'start');
                }, 500);
            } else if (onPauseAd && !self.domRef.player.paused) {
                onPauseAd.style.display = 'none';
                self.adFinished = true;
                self.trackingOnPauseNonLinearAd(adListId, 'complete');
            }

        }

    };

    /**
     * Helper function for tracking onPause Ads
     */
    self.trackingOnPauseNonLinearAd = (adListId, status) => {
        if (!self.adPool.hasOwnProperty(adListId) || self.adPool[adListId].error === true) {
            self.announceLocalError(101);
            return;
        }

        self.vastOptions = self.adPool[adListId];
        self.trackSingleEvent(status);
    };

    self.getLinearAdsFromKeyTime = (keyTimeLinearObj) => {
        const adListIds = [];

        for (let i = 0; i < keyTimeLinearObj.length; i++) {
            if (self.adList[keyTimeLinearObj[i].adListId].played === false) {
                adListIds.push(keyTimeLinearObj[i].adListId);
            }
        }

        return adListIds;
    };

    self.adKeytimePlay = (keyTime) => {
        if (!self.timerPool[keyTime] || self.isCurrentlyPlayingAd) {
            return;
        }

        const timerPoolKeytimeCloseStaticAdsLength = self.timerPool[keyTime]['closeStaticAd'].length;
        const timerPoolKeytimeLinearAdsLength = self.timerPool[keyTime]['linear'].length;
        const timerPoolKeytimeNonlinearAdsLength = self.timerPool[keyTime]['nonLinear'].length;

        // remove the item from keytime if no ads to play
        if (timerPoolKeytimeCloseStaticAdsLength === 0 && timerPoolKeytimeLinearAdsLength === 0 && timerPoolKeytimeNonlinearAdsLength === 0) {
            delete self.timerPool[keyTime];
            return;
        }

        // Task: close nonLinear ads
        if (timerPoolKeytimeCloseStaticAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeCloseStaticAdsLength; index++) {
                const adListId = self.timerPool[keyTime]['closeStaticAd'][index].closeStaticAd;

                if (self.adList[adListId].played === true) {
                    self.completeNonLinearStatic(adListId);
                }
            }

            // empty closeStaticAd from the timerpool after closing
            self.timerPool[keyTime]['closeStaticAd'] = [];
        }

        // Task: play linear ads
        if (timerPoolKeytimeLinearAdsLength > 0) {
            const adListIds = self.getLinearAdsFromKeyTime(self.timerPool[keyTime]['linear']);
            if (adListIds.length > 0) {
                self.playRoll(adListIds);

                // empty the linear ads from the timerpool after played
                self.timerPool[keyTime]['linear'] = [];

                // return after starting video ad, so non-linear will not overlap
                return;
            }
        }

        // Task: play nonLinear ads
        if (timerPoolKeytimeNonlinearAdsLength > 0) {
            for (let index = 0; index < timerPoolKeytimeNonlinearAdsLength; index++) {
                const adListId = self.timerPool[keyTime]['nonLinear'][index].adListId;
                const vastOptions = self.adPool[adListId];

                // we are not supporting nonLinear ads in cardBoard mode
                if (self.adList[adListId].played === false && !self.displayOptions.layoutControls.showCardBoardView) {
                    self.createNonLinearStatic(adListId);
                    if (self.displayOptions.vastOptions.showProgressbarMarkers) {
                        self.hideAdMarker(adListId);
                    }

                    // delete nonLinear after playing
                    self.timerPool[keyTime]['nonLinear'].splice(index, 1);

                    // return after starting non-linear ad, so multiple non-linear will not overlap
                    // unplayed non-linear will appear if user seeks back to the time :)
                    return;
                }
            }
        }

    };

    self.adTimer = () => {
        if (!!self.isTimer) {
            return;
        }

        self.isTimer = !self.isTimer;

        self.timer = setInterval(
            function () {
                const keyTime = Math.floor(self.getCurrentTime());
                self.adKeytimePlay(keyTime)
            }, 800);
    };

    self.scheduleTask = (task) => {
        if (!self.timerPool.hasOwnProperty(task.time)) {
            self.timerPool[task.time] = {linear: [], nonLinear: [], closeStaticAd: []};
        }

        if (task.hasOwnProperty('playRoll') && self.adList[task.adListId].adType === 'linear') {
            self.timerPool[task.time]['linear'].push(task);
        } else if (task.hasOwnProperty('playRoll') && self.adList[task.adListId].adType === 'nonLinear') {
            self.timerPool[task.time]['nonLinear'].push(task);
        } else if (task.hasOwnProperty('closeStaticAd')) {
            self.timerPool[task.time]['closeStaticAd'].push(task);
        }

    };

    self.deleteVastAdElements = () => {
        self.removeClickthrough();
        self.removeSkipButton();
        self.removeAdCountdown();
        self.removeAdPlayingText();
        self.removeCTAButton();
        self.vastLogoBehaviour(false);
    };

    self.switchToMainVideo = () => {
        self.debugMessage('starting main video');

        self.domRef.player.src = self.originalSrc;

        self.initialiseStreamers();

        const newCurrentTime = (typeof self.domRef.player.mainVideoCurrentTime !== 'undefined')
            ? self.domRef.player.mainVideoCurrentTime : 0;

        if (self.domRef.player.hasOwnProperty('currentTime')) {
            self.domRef.player.currentTime = newCurrentTime;
        }

        if (self.displayOptions.layoutControls.loop) {
            self.domRef.player.loop = true;
        }

        self.setCurrentTimeAndPlay(newCurrentTime, self.autoplayAfterAd);

        self.isCurrentlyPlayingAd = false;

        self.deleteVastAdElements();

        self.adFinished = true;
        self.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback();
        self.vastOptions = null;

        self.setBuffering();
        const progressbarContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');

        if (progressbarContainer !== null) {
            const backgroundColor = (self.displayOptions.layoutControls.primaryColor) ? self.displayOptions.layoutControls.primaryColor : "white";

            const currentProgressBar = self.domRef.player.parentNode.getElementsByClassName('fluid_controls_currentprogress');

            for (let i = 0; i < currentProgressBar.length; i++) {
                currentProgressBar[i].style.backgroundColor = backgroundColor;
            }

        }

        self.domRef.player.removeEventListener('ended', self.onVastAdEnded);

        if (self.displayOptions.vastOptions.showProgressbarMarkers) {
            self.showAdMarkers();
        }

        if (self.hasTitle()) {
            const title = document.getElementById(self.videoPlayerId + '_title');
            title.style.display = 'inline';
        }
    };

    self.vastLogoBehaviour = (vastPlaying) => {
        if (!this.displayOptions.layoutControls.logo.showOverAds) {
            const logoHolder = document.getElementById(this.videoPlayerId + '_logo');
            const logoImage = document.getElementById(this.videoPlayerId + '_logo_image');

            if (!logoHolder || !logoImage) {
                return;
            }

            logoHolder.style.display = vastPlaying ? 'none' : 'inline';
        }
    };

    self.getNextAdPod = () => {
        const getFirstUnPlayedAd = false;
        let adListId = null;

        // if temporaryAdPods is not empty
        if (self.temporaryAdPods.length > 0) {
            const temporaryAdPods = self.temporaryAdPods.shift();
            adListId = temporaryAdPods.id;
        }

        return adListId;
    };

    self.onVpaidEnded = (event) => {
        if (event) {
            event.stopImmediatePropagation();
        }

        const vpaidSlot = document.getElementById(self.videoPlayerId + "_fluid_vpaid_slot");

        self.vpaidAdUnit = null;
        clearInterval(self.getVPAIDAdInterval);
        vpaidSlot.remove();

        self.checkForNextAd();
    };

    self.onVastAdEnded = (event) => {
        if (event) {
            event.stopImmediatePropagation();
        }
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        self.deleteVastAdElements();
        self.checkForNextAd();
    };

    self.checkForNextAd = () => {
        const availableNextAdID = self.getNextAdPod();
        if (availableNextAdID === null) {
            self.switchToMainVideo();
            self.vastOptions = null;
            self.adFinished = true;
        } else {
            self.domRef.player.removeEventListener('ended', self.onVastAdEnded);
            self.isCurrentlyPlayingAd = false;
            self.vastOptions = null;
            self.adFinished = true;
            self.renderLinearAd(availableNextAdID, false); // passing false so it doesn't backup the Ad playbacktime as video playback time
        }
    };

    self.onMainVideoEnded = (event) => {
        if (event && !self.isCurrentlyPlayingAd) {
            event.stopImmediatePropagation();
        }

        self.debugMessage('onMainVideoEnded is called');

        if (self.isCurrentlyPlayingAd && self.autoplayAfterAd) {  // It may be in-stream ending, and if it's not postroll then we don't execute anything
            return;
        }

        //we can remove timer as no more ad will be shown
        if (Math.floor(self.getCurrentTime()) >= Math.floor(self.mainVideoDuration)) {

            // play pre-roll ad
            // sometime pre-roll ad will be missed because we are clearing the timer
            self.adKeytimePlay(Math.floor(self.mainVideoDuration));

            clearInterval(self.timer);
        }

        if (self.displayOptions.layoutControls.loop === true) {
            const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
            const videoPlayerInstance = self.getInstanceById(videoInstanceId);
            self.switchToMainVideo();
            self.playPauseToggle(self.domRef.player);
        }
    };

    self.getCurrentTime = () => {
        if (self.isCurrentlyPlayingAd) {
            return self.mainVideoCurrentTime;
        } else {
            return self.domRef.player.currentTime;
        }

    };

    /**
     * Adds a Skip Button
     */
    self.addSkipButton = () => {
        const divSkipButton = document.createElement('div');
        divSkipButton.id = 'skip_button_' + this.videoPlayerId;
        divSkipButton.className = 'skip_button skip_button_disabled';
        divSkipButton.innerHTML = this.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', this.vastOptions.skipoffset);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(divSkipButton);

        self.domRef.player.addEventListener('timeupdate', this.decreaseSkipOffset, false);
    };

    /**
     * Ad Countdown
     */
    self.addAdCountdown = () => {
        const videoWrapper = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        const divAdCountdown = document.createElement('div');

        // Create element
        const adCountdown = this.pad(parseInt(this.currentVideoDuration / 60)) + ':' + this.pad(parseInt(this.currentVideoDuration % 60));
        const durationText = parseInt(adCountdown);
        divAdCountdown.id = 'ad_countdown' + this.videoPlayerId;
        divAdCountdown.className = 'ad_countdown';
        divAdCountdown.innerHTML = "<span class='ad_timer_prefix'>Ad - </span>" + durationText;

        videoWrapper.appendChild(divAdCountdown);

        self.domRef.player.addEventListener('timeupdate', this.decreaseAdCountdown, false);
        videoWrapper.addEventListener('mouseover', function () {
            divAdCountdown.style.display = 'none';
        }, false);
    };

    self.decreaseAdCountdown = function decreaseAdCountdown() {
        const self = self.getInstanceById(self.domRef.player.id);
        const sec = parseInt(self.currentVideoDuration) - parseInt(self.domRef.player.currentTime);
        const btn = document.getElementById('ad_countdown' + self.videoPlayerId);

        if (btn) {
            btn.innerHTML = "<span class='ad_timer_prefix'>Ad - </span> " + self.pad(parseInt(sec / 60)) + ':' + self.pad(parseInt(sec % 60));
        } else {
            self.domRef.player.removeEventListener('timeupdate', self.decreaseAdCountdown);
        }
    };

    self.removeAdCountdown = () => {
        const btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    self.toggleAdCountdown = (showing) => {
        const btn = document.getElementById('ad_countdown' + this.videoPlayerId);
        if (btn) {
            if (showing) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        }
    };

    self.addAdPlayingText = (textToShow) => {
        const adPlayingDiv = document.createElement('div');
        adPlayingDiv.id = this.videoPlayerId + '_fluid_ad_playing';

        if (self.displayOptions.layoutControls.primaryColor) {
            adPlayingDiv.style.backgroundColor = self.displayOptions.layoutControls.primaryColor;
            adPlayingDiv.style.opacity = 1;
        }

        adPlayingDiv.className = 'fluid_ad_playing';
        adPlayingDiv.innerText = textToShow;

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(adPlayingDiv);
    };

    self.positionTextElements = (adListData) => {
        const allowedPosition = ['top left', 'top right', 'bottom left', 'bottom right'];

        const skipButton = document.getElementById('skip_button_' + self.videoPlayerId);
        const adPlayingDiv = document.getElementById(self.videoPlayerId + '_fluid_ad_playing');
        const ctaButton = document.getElementById(self.videoPlayerId + '_fluid_cta');

        let ctaButtonHeightWithSpacing = 0;
        let adPlayingDivHeightWithSpacing = 0;
        const pixelSpacing = 8;
        let isBottom = false;
        let skipButtonHeightWithSpacing = 0;
        let positionsCTA = [];

        const defaultPositions = {
            "top": {
                "left": {"h": 34, "v": 34},
                "right": {"h": 0, "v": 34}
            },
            "bottom": {
                "left": {"h": 34, "v": 50},
                "right": {"h": 0, "v": 50}
            }
        };

        if (skipButton !== null) {
            skipButtonHeightWithSpacing = skipButton.offsetHeight + pixelSpacing;

            const wrapperElement = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

            if (wrapperElement.classList.contains('mobile')) {
                defaultPositions.bottom.left.v = 75;
                defaultPositions.bottom.right.v = 75;
            }
        }

        let CTATextPosition;
        if (ctaButton !== null) {
            CTATextPosition = self.displayOptions.vastOptions.adCTATextPosition.toLowerCase();

            if (allowedPosition.indexOf(CTATextPosition) === -1) {
                console.log('[FP Error] Invalid position for CTAText. Reverting to "bottom right"');
                CTATextPosition = 'bottom right';
            }

            positionsCTA = CTATextPosition.split(' ');

            isBottom = positionsCTA[0] === 'bottom';

            ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + 'px';
            ctaButton.style[positionsCTA[1]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].h + 'px';

            if (isBottom && positionsCTA[1] === 'right') {
                ctaButton.style[positionsCTA[0]] = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + skipButtonHeightWithSpacing + 'px';
            }

            ctaButtonHeightWithSpacing = ctaButton.offsetHeight + pixelSpacing + 'px';
        }

        let adPlayingDivPosition;
        let positionsAdText;
        if (adPlayingDiv !== null) {
            adPlayingDivPosition = (adListData.adTextPosition !== null) ? adListData.adTextPosition.toLowerCase() : this.displayOptions.vastOptions.adTextPosition.toLowerCase();

            if (allowedPosition.indexOf(adPlayingDivPosition) === -1) {
                console.log('[FP Error] Invalid position for adText. Reverting to "top left"');
                adPlayingDivPosition = 'top left';
            }

            positionsAdText = adPlayingDivPosition.split(' ');
            adPlayingDiv.style[positionsAdText[0]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + 'px';
            adPlayingDiv.style[positionsAdText[1]] = defaultPositions[positionsAdText[0]][positionsAdText[1]].h + 'px';
            adPlayingDivHeightWithSpacing = adPlayingDiv.offsetHeight + pixelSpacing + 'px';
        }

        if (ctaButtonHeightWithSpacing > 0 && adPlayingDivHeightWithSpacing > 0 && CTATextPosition === adPlayingDivPosition) {
            if (isBottom) {
                if (positionsCTA[1] === 'right') {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + skipButtonHeightWithSpacing + ctaButtonHeightWithSpacing + 'px';
                } else {
                    adPlayingDiv.style.bottom = defaultPositions[positionsAdText[0]][positionsAdText[1]].v + ctaButtonHeightWithSpacing + 'px';
                }
            } else {
                ctaButton.style.top = defaultPositions[positionsCTA[0]][positionsCTA[1]].v + adPlayingDivHeightWithSpacing + 'px';
            }
        }
    };

    self.removeAdPlayingText = () => {
        const div = document.getElementById(this.videoPlayerId + '_fluid_ad_playing');
        if (div) {
            div.parentElement.removeChild(div);
        }
    };

    self.addCTAButton = (landingPage) => {
        if (!landingPage) {
            return;
        }

        const ctaButton = document.createElement('div');
        ctaButton.id = this.videoPlayerId + '_fluid_cta';
        ctaButton.className = 'fluid_ad_cta';

        const link = document.createElement('span');
        link.innerHTML = this.displayOptions.vastOptions.adCTAText + "<br/><span class=\"add_icon_clickthrough\">" + landingPage + "</span>";

        ctaButton.addEventListener('click', function () {
            if (!self.domRef.player.paused) {
                self.domRef.player.pause();
            }

            const win = window.open(self.vastOptions.clickthroughUrl, '_blank');
            win.focus();
            return true;
        }, false);

        ctaButton.appendChild(link);

        document.getElementById('fluid_video_wrapper_' + this.videoPlayerId).appendChild(ctaButton);
    };

    self.removeCTAButton = () => {
        const btn = document.getElementById(this.videoPlayerId + '_fluid_cta');
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    self.decreaseSkipOffset = () => {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        const self = self.getInstanceById(self.domRef.player.id);
        let sec = self.vastOptions.skipoffset - Math.floor(self.domRef.player.currentTime);
        const btn = document.getElementById('skip_button_' + self.videoPlayerId);

        if (btn) {
            if (sec >= 1) {
                //set the button label with the remaining seconds
                btn.innerHTML = self.displayOptions.vastOptions.skipButtonCaption.replace('[seconds]', sec);

            } else {
                //make the button clickable
                btn.innerHTML = '<a href="javascript:;" id="skipHref_' + self.videoPlayerId + '" onclick="self.getInstanceById(\'' + self.videoPlayerId + '\').pressSkipButton(); return false;">'
                    + self.displayOptions.vastOptions.skipButtonClickCaption
                    + '</a>';

                //removes the CSS class for a disabled button
                btn.className = btn.className.replace(/\bskip_button_disabled\b/, '');

                self.domRef.player.removeEventListener('timeupdate', self.decreaseSkipOffset);
            }
        } else {
            self.domRef.player.removeEventListener('timeupdate', self.domRef.player.decreaseSkipOffset);
        }
    };

    self.pressSkipButton = () => {

        this.removeSkipButton();
        this.removeAdPlayingText();
        this.removeCTAButton();

        if (self.vastOptions.vpaid) {

            // skip the linear vpaid ad
            self.skipVpaidAd();

        } else {

            // skip the regular linear vast
            this.displayOptions.vastOptions.vastAdvanced.vastVideoSkippedCallback();
            const event = document.createEvent('Event');
            event.initEvent('ended', false, true);
            self.domRef.player.dispatchEvent(event);

        }

    };

    self.removeSkipButton = () => {
        const btn = document.getElementById('skip_button_' + this.videoPlayerId);
        if (btn) {
            btn.parentElement.removeChild(btn);
        }
    };

    /**
     * Makes the player open the ad URL on clicking
     */
    self.addClickthroughLayer = () => {
        const divWrapper = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        const divClickThrough = document.createElement('div');
        divClickThrough.className = 'vast_clickthrough_layer';
        divClickThrough.id = 'vast_clickthrough_layer_' + self.videoPlayerId;
        divClickThrough.setAttribute(
            'style',
            'position: absolute; cursor: pointer; top: 0; left: 0; width: ' +
            self.domRef.player.offsetWidth + 'px; height: ' +
            (self.domRef.player.offsetHeight) + 'px;'
        );

        divWrapper.appendChild(divClickThrough);

        //Bind the Onclick event
        const openClickthrough = function () {
            window.open(self.vastOptions.clickthroughUrl);

            //Tracking the Clickthorugh events
            if (typeof self.vastOptions.clicktracking !== 'undefined') {
                self.callUris(self.vastOptions.clicktracking);
            }
        };

        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + self.videoPlayerId);
        const isIos9orLower = (self.mobileInfo.device === 'iPhone') && (self.mobileInfo.userOsMajor !== false) && (self.mobileInfo.userOsMajor <= 9);

        clickthroughLayer.onclick = function () {
            if (self.domRef.player.paused) {
                //On Mobile Safari on iPhones with iOS 9 or lower open the clickthrough only once
                if (isIos9orLower && !self.suppressClickthrough) {
                    openClickthrough();
                    self.suppressClickthrough = true;

                } else {
                    self.domRef.player.play();
                }

            } else {
                openClickthrough();
                self.domRef.player.pause();
            }
        };
    };

    /**
     * Remove the Clickthrough layer
     */
    self.removeClickthrough = () => {
        const clickthroughLayer = document.getElementById('vast_clickthrough_layer_' + this.videoPlayerId);

        if (clickthroughLayer) {
            clickthroughLayer.parentNode.removeChild(clickthroughLayer);
        }
    };

    /**
     * Gets the src value of the first source element of the video tag.
     *
     * @returns string|null
     */
    self.getCurrentSrc = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (sources.length) {
            return sources[0].getAttribute('src');
        }

        return null;
    };

    /**
     * Src types required for streaming elements
     */
    self.getCurrentSrcType = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (sources.length) {
            for (let i = 0; i < sources.length; i++) {
                if (sources[i].getAttribute('src') == this.originalSrc) {
                    return sources[i].getAttribute('type');
                }
            }
        }

        return null;
    };

    self.convertTimeStringToSeconds = (str) => {
        if (str && str.match(/^(\d){2}(:[0-5][0-9]){2}(.(\d){1,3})?$/)) {
            const timeParts = str.split(':');
            return ((parseInt(timeParts[0], 10)) * 3600) + ((parseInt(timeParts[1], 10)) * 60) + (parseInt(timeParts[2], 10));
        }

        return false;
    };

    self.onRecentWaiting = () => {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        self.recentWaiting = true;

        setTimeout(function () {
            self.recentWaiting = false;
        }, 1000);
    };

    /**
     * Dispatches a custom pause event which is not present when seeking.
     */
    self.onFluidPlayerPause = () => {
        //"this" is the HTML5 video tag, because it disptches the "ended" event
        const videoPlayerTag = self.domRef.player;

        setTimeout(function () {
            if (!self.recentWaiting) {
                const event = document.createEvent('CustomEvent');
                event.initEvent('fluidplayerpause', false, true);
                videoPlayerTag.dispatchEvent(event);
            }
        }, 100);
    };

    self.checkShouldDisplayVolumeBar = () => {
        return self.getMobileOs().userOs !== 'iOS';
    };

    self.generateCustomControlTags = () => {
        return '<div class="fluid_controls_left">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_playpause" class="fluid_button fluid_button_play fluid_control_playpause"></div>' +
            '</div>' +
            '<div id="' + this.videoPlayerId + '_fluid_controls_progress_container" class="fluid_controls_progress_container fluid_slider">' +
            '   <div class="fluid_controls_progress">' +
            '      <div id="' + this.videoPlayerId + '_vast_control_currentprogress" class="fluid_controls_currentprogress">' +
            '          <div id="' + this.videoPlayerId + '_vast_control_currentpos" class="fluid_controls_currentpos"></div>' +
            '      </div>' +
            '   </div>' +
            '   <div id="' + this.videoPlayerId + '_buffered_amount" class="fluid_controls_buffered"></div>' +
            '   <div id="' + this.videoPlayerId + '_ad_markers_holder" class="fluid_controls_ad_markers_holder"></div>' +
            '</div>' +
            '<div class="fluid_controls_right">' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_fullscreen" class="fluid_button fluid_control_fullscreen fluid_button_fullscreen"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_theatre" class="fluid_button fluid_control_theatre fluid_button_theatre"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_cardboard" class="fluid_button fluid_control_cardboard fluid_button_cardboard"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_subtitles" class="fluid_button fluid_button_subtitles"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_video_source" class="fluid_button fluid_button_video_source"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_playback_rate" class="fluid_button fluid_button_playback_rate"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_download" class="fluid_button fluid_button_download"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_volume_container" class="fluid_control_volume_container fluid_slider">' +
            '       <div id="' + this.videoPlayerId + '_fluid_control_volume" class="fluid_control_volume">' +
            '           <div id="' + this.videoPlayerId + '_fluid_control_currentvolume" class="fluid_control_currentvolume">' +
            '               <div id="' + this.videoPlayerId + '_fluid_control_volume_currentpos" class="fluid_control_volume_currentpos"></div>' +
            '           </div>' +
            '       </div>' +
            '   </div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_mute" class="fluid_button fluid_button_volume fluid_control_mute"></div>' +
            '   <div id="' + this.videoPlayerId + '_fluid_control_duration" class="fluid_control_duration fluid_fluid_control_duration">00:00 / 00:00</div>' +
            '</div>';
    };

    self.controlPlayPauseToggle = (videoPlayerId) => {
        const videoPlayer = self.domRef.player;
        const playPauseButton = videoPlayer.parentNode.getElementsByClassName('fluid_control_playpause');
        const menuOptionPlay = document.getElementById(videoPlayerId + 'context_option_play');
        const controlsDisplay = videoPlayer.parentNode.getElementsByClassName('fluid_controls_container');
        const fpLogo = document.getElementById(self.videoPlayerId + '_logo');

        const initialPlay = document.getElementById(videoPlayerId + '_fluid_initial_play');
        if (initialPlay) {
            document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        if (!videoPlayer.paused) {
            for (let i = 0; i < playPauseButton.length; i++) {
                playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_play\b/g, 'fluid_button_pause');
            }

            for (let i = 0; i < controlsDisplay.length; i++) {
                controlsDisplay[i].classList.remove('initial_controls_show');
            }

            if (fpLogo) {
                fpLogo.classList.remove('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = this.displayOptions.captions.pause;
            }

        } else {
            for (let i = 0; i < playPauseButton.length; i++) {
                playPauseButton[i].className = playPauseButton[i].className.replace(/\bfluid_button_pause\b/g, 'fluid_button_play');
            }

            for (let i = 0; i < controlsDisplay.length; i++) {
                controlsDisplay[i].classList.add('initial_controls_show');
            }

            if (this.isCurrentlyPlayingAd && self.displayOptions.vastOptions.showPlayButton) {
                document.getElementById(videoPlayerId + '_fluid_initial_play').style.display = "block";
                document.getElementById(videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
            }

            if (fpLogo) {
                fpLogo.classList.add('initial_controls_show');
            }

            if (menuOptionPlay !== null) {
                menuOptionPlay.innerHTML = this.displayOptions.captions.play;
            }
        }
    };

    self.playPauseAnimationToggle = (play) => {
        if (this.isCurrentlyPlayingAd || !this.displayOptions.layoutControls.playPauseAnimation || this.isSwitchingSource) {
            return;
        }

        let videoPlayerId = this.videoPlayerId;
        if (play) {
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_pause_button');
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_play_button');
        } else {
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.remove('fluid_initial_play_button');
            document.getElementById(videoPlayerId + '_fluid_state_button').classList.add('fluid_initial_pause_button');
        }

        document.getElementById(videoPlayerId + '_fluid_initial_play').classList.add('transform-active');
        const videoPlayerSaveId = videoPlayerId;
        setTimeout(
            function () {
                document.getElementById(videoPlayerSaveId + '_fluid_initial_play').classList.remove('transform-active');
            },
            800
        );
    };

    self.contolProgressbarUpdate = (videoPlayerId) => {
        const videoPlayerTag = document.getElementById(videoPlayerId);
        const currentProgressTag = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_currentprogress');

        for (let i = 0; i < currentProgressTag.length; i++) {
            currentProgressTag[i].style.width = (videoPlayerTag.currentTime / self.currentVideoDuration * 100) + '%';
        }

    };

    //Format time to hh:mm:ss
    self.formatTime = (duration) => {
        const formatDateObj = new Date(duration * 1000);
        const formatHours = this.pad(formatDateObj.getUTCHours());
        const formatMinutes = this.pad(formatDateObj.getUTCMinutes());
        const formatSeconds = this.pad(formatDateObj.getSeconds());

        let result;
        if (formatHours >= 1) {
            result = formatHours + ':' + formatMinutes + ':' + formatSeconds;
        } else {
            result = formatMinutes + ':' + formatSeconds;
        }

        return result;
    };

    self.contolDurationUpdate = (videoPlayerId) => {
        const videoPlayerTag = document.getElementById(videoPlayerId);

        const currentPlayTime = self.formatTime(videoPlayerTag.currentTime);
        const totalTime = self.formatTime(self.currentVideoDuration);

        const durationText = currentPlayTime + ' / ' + totalTime;

        const timePlaceholder = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_duration');

        for (let i = 0; i < timePlaceholder.length; i++) {
            timePlaceholder[i].innerHTML = durationText;
        }

    };

    self.pad = (value) => {
        if (value < 10) {
            return '0' + value;
        } else {
            return value;
        }
    };

    self.contolVolumebarUpdate = (videoPlayerId) => {
        const videoPlayerTag = document.getElementById(videoPlayerId);
        const currentVolumeTag = document.getElementById(videoPlayerId + '_fluid_control_currentvolume');
        const volumeposTag = document.getElementById(videoPlayerId + '_fluid_control_volume_currentpos');
        const volumebarTotalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;
        const muteButtonTag = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_mute');
        const menuOptionMute = document.getElementById(videoPlayerId + 'context_option_mute');

        if (videoPlayerTag.volume) {
            self.latestVolume = videoPlayerTag.volume;
            self.fluidStorage.fluidMute = false;
        }

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            for (let i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_mute\b/g, 'fluid_button_volume');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = this.displayOptions.captions.mute;
            }

        } else {
            for (let i = 0; i < muteButtonTag.length; i++) {
                muteButtonTag[i].className = muteButtonTag[i].className.replace(/\bfluid_button_volume\b/g, 'fluid_button_mute');
            }

            if (menuOptionMute !== null) {
                menuOptionMute.innerHTML = this.displayOptions.captions.unmute;
            }
        }
        currentVolumeTag.style.width = (videoPlayerTag.volume * volumebarTotalWidth) + 'px';
        volumeposTag.style.left = (videoPlayerTag.volume * volumebarTotalWidth - (volumeposTagWidth / 2)) + 'px';
    };

    self.muteToggle = (videoPlayerId) => {
        const videoPlayerTag = document.getElementById(videoPlayerId);

        if (videoPlayerTag.volume && !videoPlayerTag.muted) {
            videoPlayerTag.volume = 0;
            videoPlayerTag.muted = true;
        } else {
            videoPlayerTag.volume = self.latestVolume;
            videoPlayerTag.muted = false;
        }

        // Persistent settings
        this.fluidStorage.fluidVolume = self.latestVolume;
        this.fluidStorage.fluidMute = videoPlayerTag.muted;
    };

    self.checkFullscreenSupport = (videoPlayerWrapperId) => {
        const videoPlayerWrapper = document.getElementById(videoPlayerWrapperId);
        const videoPlayer = self.domRef.player;

        if (videoPlayerWrapper.mozRequestFullScreen) {
            return {
                goFullscreen: 'mozRequestFullScreen',
                exitFullscreen: 'mozCancelFullScreen',
                isFullscreen: 'mozFullScreenElement'
            };

        } else if (videoPlayerWrapper.webkitRequestFullscreen) {
            return {
                goFullscreen: 'webkitRequestFullscreen',
                exitFullscreen: 'webkitExitFullscreen',
                isFullscreen: 'webkitFullscreenElement'
            };

        } else if (videoPlayerWrapper.msRequestFullscreen) {
            return {
                goFullscreen: 'msRequestFullscreen',
                exitFullscreen: 'msExitFullscreen',
                isFullscreen: 'msFullscreenElement'
            };

        } else if (videoPlayerWrapper.requestFullscreen) {
            return {
                goFullscreen: 'requestFullscreen',
                exitFullscreen: 'exitFullscreen',
                isFullscreen: 'fullscreenElement'
            };

        } else if (videoPlayer.webkitSupportsFullscreen) {
            return {
                goFullscreen: 'webkitEnterFullscreen',
                exitFullscreen: 'webkitExitFullscreen',
                isFullscreen: 'webkitDisplayingFullscreen'
            };

        }

        return false;
    };

    self.fullscreenOff = (fullscreenButton, menuOptionFullscreen) => {
        for (let i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen_exit\b/g, 'fluid_button_fullscreen');
        }
        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = 'Fullscreen';
        }
        this.fullscreenMode = false;
    };

    self.fullscreenOn = (fullscreenButton, menuOptionFullscreen) => {

        for (let i = 0; i < fullscreenButton.length; i++) {
            fullscreenButton[i].className = fullscreenButton[i].className.replace(/\bfluid_button_fullscreen\b/g, 'fluid_button_fullscreen_exit');
        }

        if (menuOptionFullscreen !== null) {
            menuOptionFullscreen.innerHTML = this.displayOptions.captions.exitFullscreen;
        }
        this.fullscreenMode = true;
    };

    self.fullscreenToggle = () => {
        self.activeVideoPlayerId = this.videoPlayerId;

        const videoPlayerTag = self.domRef.player;
        const fullscreenTag = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);
        const requestFullscreenFunctionNames = this.checkFullscreenSupport('fluid_video_wrapper_' + this.videoPlayerId);
        const fullscreenButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_fullscreen');
        const menuOptionFullscreen = document.getElementById(this.videoPlayerId + 'context_option_fullscreen');

        // Disable Theatre mode if it's on while we toggle fullscreen
        if (this.theatreMode) {
            this.theatreToggle();
        }

        let functionNameToExecute;

        if (requestFullscreenFunctionNames) {
            // iOS fullscreen elements are different and so need to be treated separately
            if (requestFullscreenFunctionNames.goFullscreen === 'webkitEnterFullscreen') {
                if (!videoPlayerTag[requestFullscreenFunctionNames.isFullscreen]) {
                    functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                    this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                    new Function('videoPlayerTag', functionNameToExecute)(videoPlayerTag);
                }
            } else {
                if (document[requestFullscreenFunctionNames.isFullscreen] === null) {
                    //Go fullscreen
                    functionNameToExecute = 'videoPlayerTag.' + requestFullscreenFunctionNames.goFullscreen + '();';
                    this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
                } else {
                    //Exit fullscreen
                    functionNameToExecute = 'document.' + requestFullscreenFunctionNames.exitFullscreen + '();';
                    this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
                }
                new Function('videoPlayerTag', functionNameToExecute)(fullscreenTag);
            }
        } else {
            //The browser does not support the Fullscreen API, so a pseudo-fullscreen implementation is used
            if (fullscreenTag.className.search(/\bpseudo_fullscreen\b/g) !== -1) {
                fullscreenTag.className = fullscreenTag.className.replace(/\bpseudo_fullscreen\b/g, '');
                this.fullscreenOff(fullscreenButton, menuOptionFullscreen);
            } else {
                fullscreenTag.className += ' pseudo_fullscreen';
                this.fullscreenOn(fullscreenButton, menuOptionFullscreen);
            }
        }

        this.resizeVpaidAuto();

    };

    self.findClosestParent = (el, selector) => {
        let matchesFn;

        // find vendor prefix
        ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'].some(function (fn) {
            if (typeof document.body[fn] == 'function') {
                matchesFn = fn;
                return true;
            }
            return false;
        });

        let parent;

        // Check if the current element matches the selector
        if (el[matchesFn](selector)) {
            return el;
        }

        // traverse parents
        while (el) {
            parent = el.parentElement;
            if (parent && parent[matchesFn](selector)) {
                return parent;
            }
            el = parent;
        }

        return null;
    };

    self.getTranslateX = (el) => {
        let coordinates = null;

        try {
            const results = el.style.transform.match(/translate3d\((-?\d+px,\s?){2}-?\d+px\)/);

            if (results && results.length) {
                coordinates = results[0]
                    .replace('translate3d(', '')
                    .replace(')', '')
                    .replace(/\s/g, '')
                    .replace(/px/g, '')
                    .split(',')
                ;
            }
        } catch (e) {
            coordinates = null;
        }

        return (coordinates && (coordinates.length === 3)) ? parseInt(coordinates[0]) : 0;
    };

    self.getEventOffsetX = (evt, el) => {
        let x = 0;
        let translateX = 0;

        while (el && !isNaN(el.offsetLeft)) {
            translateX = self.getTranslateX(el);

            if (el.tagName === 'BODY') {
                x += el.offsetLeft + el.clientLeft + translateX - (el.scrollLeft || document.documentElement.scrollLeft);
            } else {
                x += el.offsetLeft + el.clientLeft + translateX - el.scrollLeft;
            }

            el = el.offsetParent;
        }

        let eventX;
        if (typeof evt.touches !== 'undefined' && typeof evt.touches[0] !== 'undefined') {
            eventX = evt.touches[0].clientX;
        } else {
            eventX = evt.clientX
        }

        return eventX - x;
    };

    self.getEventOffsetY = (evt, el) => {
        let fullscreenMultiplier = 1;
        const videoWrapper = self.findClosestParent(el, 'div[id^="fluid_video_wrapper_"]');

        if (videoWrapper) {
            const videoPlayerId = videoWrapper.id.replace('fluid_video_wrapper_', '');

            const requestFullscreenFunctionNames = self.checkFullscreenSupport('fluid_video_wrapper_' + videoPlayerId);
            if (requestFullscreenFunctionNames && document[requestFullscreenFunctionNames.isFullscreen]) {
                fullscreenMultiplier = 0;
            }
        }

        let y = 0;

        while (el && !isNaN(el.offsetTop)) {
            if (el.tagName === 'BODY') {
                y += el.offsetTop - ((el.scrollTop || document.documentElement.scrollTop) * fullscreenMultiplier);

            } else {
                y += el.offsetTop - (el.scrollTop * fullscreenMultiplier);
            }

            el = el.offsetParent;
        }

        return evt.clientY - y;
    };

    self.onProgressbarMouseDown = (videoPlayerId, event) => {
        self.displayOptions.layoutControls.playPauseAnimation = false;
        // we need an initial position for touchstart events, as mouse up has no offset x for iOS
        let initialPosition;

        if (self.displayOptions.layoutControls.showCardBoardView) {
            initialPosition = self.getEventOffsetX(event, event.target.parentNode);
        } else {
            initialPosition = self.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_controls_progress_container'));
        }

        if (self.isCurrentlyPlayingAd) {
            return;
        }

        self.fluidPseudoPause = true;
        const videoPlayerTag = document.getElementById(videoPlayerId);

        const initiallyPaused = videoPlayerTag.paused;
        if (!initiallyPaused) {
            videoPlayerTag.pause();
        }

        function shiftTime(videoPlayerId, timeBarX) {
            const totalWidth = document.getElementById(videoPlayerId + '_fluid_controls_progress_container').clientWidth;
            if (totalWidth) {
                videoPlayerTag.currentTime = self.currentVideoDuration * timeBarX / totalWidth;
            }
        }

        function onProgressbarMouseMove(event) {
            const currentX = self.getEventOffsetX(event, event.target.parentNode);
            initialPosition = NaN; // mouse up will fire after the move, we don't want to trigger the initial position in the event of iOS
            shiftTime(videoPlayerId, currentX);
            self.contolProgressbarUpdate(self.videoPlayerId);
            self.contolDurationUpdate(self.videoPlayerId);
        }

        function onProgressbarMouseUp(event) {
            document.removeEventListener('mousemove', onProgressbarMouseMove);
            document.removeEventListener('touchmove', onProgressbarMouseMove);
            document.removeEventListener('mouseup', onProgressbarMouseUp);
            document.removeEventListener('touchend', onProgressbarMouseUp);
            let clickedX = self.getEventOffsetX(event, event.target.parentNode);
            if (isNaN(clickedX) && !isNaN(initialPosition)) {
                clickedX = initialPosition;
            }

            if (!isNaN(clickedX)) {
                shiftTime(videoPlayerId, clickedX);
            }
            if (!initiallyPaused) {
                self.play();
            }
            // Wait till video played then reenable the animations
            if (self.initialAnimationSet) {
                setTimeout(function () {
                    self.displayOptions.layoutControls.playPauseAnimation = self.initialAnimationSet;
                }, 200);
            }
            self.fluidPseudoPause = false;
        }

        document.addEventListener('mouseup', onProgressbarMouseUp);
        document.addEventListener('touchend', onProgressbarMouseUp);
        document.addEventListener('mousemove', onProgressbarMouseMove);
        document.addEventListener('touchmove', onProgressbarMouseMove);
    };

    self.onVolumebarMouseDown = (videoPlayerId) => {

        function shiftVolume(videoPlayerId, volumeBarX) {
            const videoPlayerTag = document.getElementById(videoPlayerId);
            const totalWidth = document.getElementById(videoPlayerId + '_fluid_control_volume_container').clientWidth;
            const f = self.getInstanceById(videoPlayerId);

            if (totalWidth) {
                let newVolume = volumeBarX / totalWidth;

                if (newVolume < 0.05) {
                    newVolume = 0;
                    videoPlayerTag.muted = true;
                } else if (newVolume > 0.95) {
                    newVolume = 1;
                }

                if (videoPlayerTag.muted && newVolume > 0) {
                    videoPlayerTag.muted = false;
                }
                f.setVolume(newVolume);
            }
        }

        function onVolumebarMouseMove(event) {
            const currentX = self.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_control_volume_container'));
            shiftVolume(videoPlayerId, currentX);
        }

        function onVolumebarMouseUp(event) {
            document.removeEventListener('mousemove', onVolumebarMouseMove);
            document.removeEventListener('touchmove', onVolumebarMouseMove);
            document.removeEventListener('mouseup', onVolumebarMouseUp);
            document.removeEventListener('touchend', onVolumebarMouseUp);
            const currentX = self.getEventOffsetX(event, document.getElementById(videoPlayerId + '_fluid_control_volume_container'));
            if (!isNaN(currentX)) {
                shiftVolume(videoPlayerId, currentX);
            }
        }

        document.addEventListener('mouseup', onVolumebarMouseUp);
        document.addEventListener('touchend', onVolumebarMouseUp);
        document.addEventListener('mousemove', onVolumebarMouseMove);
        document.addEventListener('touchmove', onVolumebarMouseMove);
    };

    self.setVastList = () => {
        const ads = {};
        const adGroupedByRolls = {preRoll: [], postRoll: [], midRoll: [], onPauseRoll: []};
        const def = {
            id: null,
            roll: null,
            played: false,
            vastLoaded: false,
            error: false,
            adText: null,
            adTextPosition: null
        };
        let idPart = 0;

        const validateVastList = function (item) {
            let hasError = false;

            if (item.roll === 'midRoll') {
                if (typeof item.timer === 'undefined') {
                    hasError = true;
                }
            }

            return hasError;
        };

        const validateRequiredParams = function (item) {
            let hasError = false;

            if (!item.vastTag) {
                self.announceLocalError(102, '"vastTag" property is missing from adList.');
                hasError = true;
            }

            if (!item.roll) {
                self.announceLocalError(102, '"roll" is missing from adList.');
                hasError = true;
            }

            if (self.availableRolls.indexOf(item.roll) === -1) {
                self.announceLocalError(102, 'Only ' + self.availableRolls.join(',') + ' rolls are supported.');
                hasError = true;
            }

            if (item.size && self.supportedNonLinearAd.indexOf(item.size) === -1) {
                self.announceLocalError(102, 'Only ' + self.supportedNonLinearAd.join(',') + ' size are supported.');
                hasError = true;
            }

            return hasError;
        };

        if (self.displayOptions.vastOptions.hasOwnProperty('adList')) {

            for (let key in self.displayOptions.vastOptions.adList) {

                let adItem = self.displayOptions.vastOptions.adList[key];

                if (validateRequiredParams(adItem)) {
                    self.announceLocalError(102, 'Wrong adList parameters.');
                    continue;
                }
                const id = 'ID' + idPart;

                ads[id] = Object.assign({}, def);
                ads[id] = Object.assign(ads[id], self.displayOptions.vastOptions.adList[key]);
                if (adItem.roll == 'midRoll') {
                    ads[id].error = validateVastList('midRoll', adItem);
                }
                ads[id].id = id;
                idPart++;

            }
        }

        // group the ads by roll
        // pushing object references and forming json
        Object.keys(ads).map(function (e) {
            if (ads[e].roll.toLowerCase() === 'preRoll'.toLowerCase()) {
                adGroupedByRolls.preRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'midRoll'.toLowerCase()) {
                adGroupedByRolls.midRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'postRoll'.toLowerCase()) {
                adGroupedByRolls.postRoll.push(ads[e]);
            } else if (ads[e].roll.toLowerCase() === 'onPauseRoll'.toLowerCase()) {
                adGroupedByRolls.onPauseRoll.push(ads[e]);
            }
        });

        self.adGroupedByRolls = adGroupedByRolls;
        self.adList = ads;
    };

    self.findRoll = (roll) => {
        const ids = [];
        ids.length = 0;

        if (!roll || !self.hasOwnProperty('adList')) {
            return;
        }

        for (let key in self.adList) {
            if (self.adList[key].roll == roll) {
                ids.push(key);
            }
        }

        return ids;
    };

    self.volumeChange = (videoPlayerId, direction) => {
        let newVolume = self.domRef.player.volume;

        if (direction === 'asc') {
            newVolume += 0.05;
        } else if (direction === 'desc') {
            newVolume -= 0.05;
        }

        if (newVolume < 0.05) {
            newVolume = 0;
        } else if (newVolume > 0.95) {
            newVolume = 1;
        }

        this.setVolume(newVolume);
    };

    self.currentTimeChange = (videoPlayerId, keyCode) => {
        const videoInstanceId = self.getInstanceById(videoPlayerId);
        if (videoInstanceId.isCurrentlyPlayingAd) {
            return;
        }

        const videoPlayerTag = document.getElementById(videoPlayerId);

        videoPlayerTag.currentTime = videoInstanceId.getNewCurrentTimeValueByKeyCode(keyCode, videoPlayerTag.currentTime, videoPlayerTag.duration);
    };

    self.getNewCurrentTimeValueByKeyCode = (keyCode, currentTime, duration) => {

        let newCurrentTime = currentTime;

        switch (keyCode) {

            case 37://left arrow
                newCurrentTime -= 5;
                newCurrentTime = (newCurrentTime < 5) ? 0 : newCurrentTime;
                break;
            case 39://right arrow
                newCurrentTime += 5;
                newCurrentTime = (newCurrentTime > duration - 5) ? duration : newCurrentTime;
                break;
            case 35://End
                newCurrentTime = duration;
                break;
            case 36://Home
                newCurrentTime = 0;
                break;
            case 48://0
            case 49://1
            case 50://2
            case 51://3
            case 52://4
            case 53://5
            case 54://6
            case 55://7
            case 56://8
            case 57://9
                if (keyCode < 58 && keyCode > 47) {
                    const percent = (keyCode - 48) * 10;
                    newCurrentTime = duration * percent / 100;
                }
                break;
        }

        return newCurrentTime;
    };

    self.handleMouseleave = (event) => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);

        if (typeof event.clientX !== 'undefined' && document.getElementById('fluid_video_wrapper_' + videoInstanceId).contains(document.elementFromPoint(event.clientX, event.clientY))) {
            //false positive; we didn't actually leave the player
            return;
        }

        videoPlayerInstance.hideControlBar.call(self.domRef.player);
        videoPlayerInstance.hideTitle.call(self.domRef.player);
    };

    self.handleMouseenterForKeyboard = () => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.captureKey) {
            return;
        }

        videoPlayerInstance.captureKey = function (event) {
            event.stopPropagation();
            const keyCode = event.keyCode; // TODO .keyCode is deprecated

            switch (keyCode) {

                case 70://f
                    videoPlayerInstance.fullscreenToggle();
                    event.preventDefault();
                    break;
                case 13://Enter
                case 32://Space
                    videoPlayerInstance.playPauseToggle(videoPlayerTag);
                    event.preventDefault();
                    break;
                case 77://m
                    videoPlayerInstance.muteToggle(videoInstanceId);
                    event.preventDefault();
                    break;
                case 38://up arrow
                    videoPlayerInstance.volumeChange(videoInstanceId, 'asc');
                    event.preventDefault();
                    break;
                case 40://down arrow
                    videoPlayerInstance.volumeChange(videoInstanceId, 'desc');
                    event.preventDefault();
                    break;
                case 37://left arrow
                case 39://right arrow
                case 35://End
                case 36://Home
                case 48://0
                case 49://1
                case 50://2
                case 51://3
                case 52://4
                case 53://5
                case 54://6
                case 55://7
                case 56://8
                case 57://9
                    videoPlayerInstance.currentTimeChange(videoInstanceId, keyCode);
                    event.preventDefault();
                    break;
            }

            return false;

        };
        document.addEventListener('keydown', videoPlayerInstance.captureKey, true);

    };

    self.keyboardControl = () => {
        const videoPlayer = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        videoPlayer.addEventListener('click', self.handleMouseenterForKeyboard, false);

        // When we click outside player, we stop registering keyboard events
        const clickHandler = self.handleWindowClick.bind(self);
        self.destructors.push(function () {
            window.removeEventListener('click', clickHandler);
        });
        window.addEventListener('click', clickHandler);
    };

    self.handleWindowClick = (e) => {
        const videoInstanceId = this.videoPlayerId;
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const videoPlayerWrapper = document.getElementById('fluid_video_wrapper_' + videoInstanceId);

        if (!videoPlayerWrapper) {
            console.warn('Dangling click event listener should be collected for unknown wrapper ' + videoInstanceId
                + '. Did you forget to call destroy on player instance?');
            return;
        }

        const inScopeClick = videoPlayerWrapper.contains(e.target) || e.target.id === 'skipHref_' + videoInstanceId;

        if (inScopeClick) {
            return;
        }

        document.removeEventListener('keydown', videoPlayerInstance.captureKey, true);
        delete videoPlayerInstance['captureKey'];

        if (videoPlayerInstance.theatreMode && !videoPlayerInstance.theatreModeAdvanced) {
            videoPlayerInstance.theatreToggle();
        }
    };

    self.initialPlay = () => {
        self.domRef.player.addEventListener('playing', function () {
            self.toggleLoader(false);
        });

        self.domRef.player.addEventListener('timeupdate', function () {
            // some places we are manually displaying toggleLoader
            // user experience toggleLoader being displayed even when content is playing in background
            self.toggleLoader(false);
        });

        self.domRef.player.addEventListener('waiting', function () {
            self.toggleLoader(true);
        });

        if (!self.displayOptions.layoutControls.playButtonShowing) {
            // Controls always showing until the video is first played
            const initialControlsDisplay = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.remove('initial_controls_show');
            // The logo shows before playing but may need to be removed
            const fpPlayer = document.getElementById(self.videoPlayerId + '_logo');
            if (fpPlayer) {
                fpPlayer.classList.remove('initial_controls_show');
            }
        }

        if (!self.firstPlayLaunched) {
            self.playPauseToggle(self.domRef.player);

            self.domRef.player.removeEventListener('play', self.initialPlay);
        }
    };

    // TODO: wtf this argument for?
    self.playPauseToggle = (videoPlayerTag) => {
        const isFirstStart = !self.firstPlayLaunched;

        const preRolls = self.findRoll('preRoll');
        if (!isFirstStart || preRolls.length == 0) {

            if (isFirstStart && preRolls.length == 0) {
                self.firstPlayLaunched = true;
                self.displayOptions.vastOptions.vastAdvanced.noVastVideoCallback();
            }

            if (videoPlayerTag.paused) {

                if (self.isCurrentlyPlayingAd && self.vastOptions !== null && self.vastOptions.vpaid) {
                    // resume the vpaid linear ad
                    self.resumeVpaidAd();
                } else {
                    // resume the regular linear vast or content video player
                    if (self.dashPlayer) {
                        self.dashPlayer.play();
                    } else {
                        videoPlayerTag.play();
                    }
                }

                this.playPauseAnimationToggle(true);

            } else if (!isFirstStart) {

                if (self.isCurrentlyPlayingAd && self.vastOptions !== null && self.vastOptions.vpaid) {
                    // pause the vpaid linear ad
                    self.pauseVpaidAd();
                } else {
                    // pause the regular linear vast or content video player
                    videoPlayerTag.pause();
                }

                this.playPauseAnimationToggle(false);
            }

            self.toggleOnPauseAd();

        } else {
            //Workaround for Safari or Mobile Chrome - otherwise it blocks the subsequent
            //play() command, because it considers it not being triggered by the user.
            const browserVersion = self.getBrowserVersion();
            self.isCurrentlyPlayingAd = true;

            if (
                browserVersion.browserName == 'Safari'
                || (self.mobileInfo.userOs !== false && self.mobileInfo.userOs == 'Android' && browserVersion.browserName == 'Google Chrome')
            ) {
                videoPlayerTag.src = fluidPlayerScriptLocation + 'blank.mp4';
                videoPlayerTag.play();
                this.playPauseAnimationToggle(true);
            }

            self.firstPlayLaunched = true;

            //trigger the loading of the VAST Tag
            self.prepareVast('preRoll');
            self.preRollAdPodsLength = preRolls.length;
        }

        const prepareVastAdsThatKnowDuration = function () {
            self.prepareVast('onPauseRoll');
            self.prepareVast('postRoll');
            self.prepareVast('midRoll');
        };

        if (isFirstStart) {
            // Remove the div that was placed as a fix for poster image and DASH streaming, if it exists
            const pseudoPoster = document.getElementById(self.videoPlayerId + '_fluid_pseudo_poster');
            if (pseudoPoster) {
                pseudoPoster.parentNode.removeChild(pseudoPoster);
            }

            if (self.mainVideoDuration > 0) {
                prepareVastAdsThatKnowDuration();
            } else {
                videoPlayerTag.addEventListener('mainVideoDurationSet', prepareVastAdsThatKnowDuration);
            }
        }

        self.adTimer();

        const blockOnPause = document.getElementById(self.videoPlayerId + '_fluid_html_on_pause');
        if (blockOnPause && !self.isCurrentlyPlayingAd) {
            if (videoPlayerTag.paused) {
                blockOnPause.style.display = 'flex';
            } else {
                blockOnPause.style.display = 'none';
            }
        }
    };

    self.setCustomControls = () => {
        //Set the Play/Pause behaviour
        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_playpause', function () {

            if (!self.firstPlayLaunched) {
                self.domRef.player.removeEventListener('play', self.initialPlay);
            }

            self.playPauseToggle(self.domRef.player);
        }, false);

        self.domRef.player.addEventListener('play', function () {
            self.controlPlayPauseToggle(self.videoPlayerId);
            self.contolVolumebarUpdate(self.videoPlayerId);
        }, false);

        self.domRef.player.addEventListener('fluidplayerpause', function () {
            self.controlPlayPauseToggle(self.videoPlayerId);
        }, false);

        //Set the progressbar
        self.domRef.player.addEventListener('timeupdate', function () {
            self.contolProgressbarUpdate(self.videoPlayerId);
            self.contolDurationUpdate(self.videoPlayerId);
        });

        const isMobileChecks = self.getMobileOs();
        const eventOn = (isMobileChecks.userOs) ? 'touchstart' : 'mousedown';

        if (self.displayOptions.layoutControls.showCardBoardView) {

            self.trackEvent(self.domRef.player.parentNode, eventOn, '.fluid_controls_progress_container', function (event) {
                self.onProgressbarMouseDown(self.videoPlayerId, event);
            }, false);

        } else {

            document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container').addEventListener(eventOn, function (event) {
                self.onProgressbarMouseDown(self.videoPlayerId, event);
            }, false);

        }

        //Set the volume controls
        document.getElementById(self.videoPlayerId + '_fluid_control_volume_container').addEventListener(eventOn, function (event) {
            self.onVolumebarMouseDown(self.videoPlayerId);
        }, false);

        self.domRef.player.addEventListener('volumechange', function () {
            self.contolVolumebarUpdate(self.videoPlayerId);
        });

        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_mute', function () {
            self.muteToggle(self.videoPlayerId);
        });

        self.setBuffering();

        //Set the fullscreen control
        self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_fullscreen', function () {
            self.fullscreenToggle();
        });

        // Theatre mode
        if (self.displayOptions.layoutControls.allowTheatre && !self.isInIframe) {
            self.trackEvent(self.domRef.player.parentNode, 'click', '.fluid_control_theatre', function () {
                self.theatreToggle(self.videoPlayerId);
            });
        } else {
            document.getElementById(self.videoPlayerId + '_fluid_control_theatre').style.display = 'none';
        }

        self.domRef.player.addEventListener('ratechange', function () {
            if (self.isCurrentlyPlayingAd) {
                this.playbackRate = 1;
            }
        });
    };

    // Create the time position preview only if the vtt previews aren't enabled
    self.createTimePositionPreview = () => {
        if (!self.showTimeOnHover) {
            return;
        }

        const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
        const previewContainer = document.createElement('div');

        previewContainer.id = self.videoPlayerId + '_fluid_timeline_preview';
        previewContainer.className = 'fluid_timeline_preview';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        // Set up hover for time position preview display
        document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mousemove', function (event) {
            const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
            const totalWidth = progressContainer.clientWidth;
            const hoverTimeItem = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview');
            const hoverQ = self.getEventOffsetX(event, progressContainer);

            const hoverSecondQ = self.currentVideoDuration * hoverQ / totalWidth;
            hoverTimeItem.innerText = self.formatTime(hoverSecondQ);

            hoverTimeItem.style.display = 'block';
            hoverTimeItem.style.left = (hoverSecondQ / self.domRef.player.duration * 100) + "%";
        }, false);

        // Hide timeline preview on mouseout
        document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container').addEventListener('mouseout', function () {
            const hoverTimeItem = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview');
            hoverTimeItem.style.display = 'none';
        }, false);
    };

    self.setCustomContextMenu = () => {
        const videoPlayerTag = self.domRef.player;
        const playerWrapper = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        //Create own context menu
        const divContextMenu = document.createElement('div');
        divContextMenu.id = self.videoPlayerId + '_fluid_context_menu';
        divContextMenu.className = 'fluid_context_menu';
        divContextMenu.style.display = 'none';
        divContextMenu.style.position = 'absolute';
        divContextMenu.innerHTML = '<ul>' +
            '    <li id="' + self.videoPlayerId + 'context_option_play">' + this.displayOptions.captions.play + '</li>' +
            '    <li id="' + self.videoPlayerId + 'context_option_mute">' + this.displayOptions.captions.mute + '</li>' +
            '    <li id="' + self.videoPlayerId + 'context_option_fullscreen">' + this.displayOptions.captions.fullscreen + '</li>' +
            '    <li id="' + self.videoPlayerId + 'context_option_homepage">Fluid Player ' + self.version + '</li>' +
            '</ul>';

        videoPlayerTag.parentNode.insertBefore(divContextMenu, videoPlayerTag.nextSibling);

        //Disable the default context menu
        playerWrapper.addEventListener('contextmenu', function (event) {
            event.preventDefault();

            divContextMenu.style.left = self.getEventOffsetX(event, videoPlayerTag) + 'px';
            divContextMenu.style.top = self.getEventOffsetY(event, videoPlayerTag) + 'px';
            divContextMenu.style.display = 'block';
        }, false);

        //Hide the context menu on clicking elsewhere
        document.addEventListener('click', function (event) {
            if ((event.target !== videoPlayerTag) || event.button !== 2) {
                divContextMenu.style.display = 'none';
            }

        }, false);

        //Attach events to the menu elements
        const menuOptionPlay = document.getElementById(self.videoPlayerId + 'context_option_play');
        const menuOptionMute = document.getElementById(self.videoPlayerId + 'context_option_mute');
        const menuOptionFullscreen = document.getElementById(self.videoPlayerId + 'context_option_fullscreen');
        const menuOptionHomepage = document.getElementById(self.videoPlayerId + 'context_option_homepage');

        menuOptionPlay.addEventListener('click', function () {
            self.playPauseToggle(videoPlayerTag);
        }, false);

        menuOptionMute.addEventListener('click', function () {
            self.muteToggle(self.videoPlayerId);
        }, false);

        menuOptionFullscreen.addEventListener('click', function () {
            self.fullscreenToggle();
        }, false);

        menuOptionHomepage.addEventListener('click', function () {
            const win = window.open(self.homepage, '_blank');
            win.focus();
        }, false);
    };

    self.setDefaultLayout = () => {
        const playerWrapper = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);

        playerWrapper.className += ' fluid_player_layout_' + self.displayOptions.layoutControls.layout;

        //Remove the default Controls
        self.domRef.player.removeAttribute('controls');

        self.setCustomContextMenu();

        let classForDisablingVolumeBar = '';
        if (!self.checkShouldDisplayVolumeBar()) {
            classForDisablingVolumeBar = ' no_volume_bar';
        }

        const divVastControls = document.createElement('div');
        divVastControls.id = self.videoPlayerId + '_fluid_controls_container';
        divVastControls.className = 'fluid_controls_container' + classForDisablingVolumeBar;
        divVastControls.innerHTML = self.generateCustomControlTags();

        self.domRef.player.parentNode.insertBefore(divVastControls, self.domRef.player.nextSibling);

        //Create the loading cover
        const divLoading = document.createElement('div');
        divLoading.className = 'vast_video_loading';
        divLoading.id = 'vast_video_loading_' + self.videoPlayerId;
        divLoading.style.display = 'none';

        // Primary Colour

        document.getElementById(self.videoPlayerId + '_vast_control_currentprogress').style.backgroundColor =
            self.displayOptions.layoutControls.primaryColor
                ? self.displayOptions.layoutControls.primaryColor
                : "white";

        self.domRef.player.parentNode.insertBefore(divLoading, self.domRef.player.nextSibling);

        let remainingAttemptsToInitiateVolumeBar = 100;

        // TODO ->>
        // TODO: self referencing against local variable. This is not good at all.
        /**
         * Set the volumebar after its elements are properly rendered.
         */
        const initiateVolumebar = function () {
            if (!remainingAttemptsToInitiateVolumeBar) {
                clearInterval(initiateVolumebarTimerId);

            } else if (self.checkIfVolumebarIsRendered()) {
                clearInterval(initiateVolumebarTimerId);
                self.contolVolumebarUpdate(self.videoPlayerId);

            } else {
                remainingAttemptsToInitiateVolumeBar--;
            }
        };

        let initiateVolumebarTimerId = setInterval(initiateVolumebar, 100);
        // <<- ENDTODO

        /*
            Dobule click fullscreen
        */
        if (self.displayOptions.layoutControls.doubleclickFullscreen) {
            self.domRef.player.addEventListener('dblclick', self.fullscreenToggle);
        }

        self.initHtmlOnPauseBlock();

        self.setCustomControls();

        self.setupThumbnailPreview();

        self.createTimePositionPreview();

        self.posterImage();

        self.initPlayButton();

        self.setVideoPreload();

        self.createPlaybackList();

        self.createDownload();
    };

    /**
     * Checks if the volumebar is rendered and the styling applied by comparing
     * the width of 2 elements that should look different.
     *
     * @returns Boolean
     */
    self.checkIfVolumebarIsRendered = () => {
        const volumeposTag = document.getElementById(self.videoPlayerId + '_fluid_control_volume_currentpos');
        const volumebarTotalWidth = document.getElementById(self.videoPlayerId + '_fluid_control_volume').clientWidth;
        const volumeposTagWidth = volumeposTag.clientWidth;

        return volumeposTagWidth !== volumebarTotalWidth;
    };

    self.setLayout = () => {
        //All other browsers
        const listenTo = (self.isTouchDevice()) ? 'touchend' : 'click';
        self.domRef.player.addEventListener(listenTo, function () {
            self.playPauseToggle(self.domRef.player);
        }, false);

        //Mobile Safari - because it does not emit a click event on initial click of the video
        self.domRef.player.addEventListener('play', self.initialPlay, false);
        this.setDefaultLayout();
    };

    self.handleFullscreen = () => {
        if (typeof document.vastFullsreenChangeEventListenersAdded === 'undefined') {
            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(
                function (eventType) {

                    if (typeof (document['on' + eventType]) === 'object') {
                        document.addEventListener(eventType, function (ev) {
                            self.recalculateAdDimensions(self.activeVideoPlayerId);
                        }, false);
                    }
                }
            );

            document.vastFullsreenChangeEventListenersAdded = true;
        }
    };

    self.setupThumbnailPreviewVtt = () => {
        self.sendRequest(
            self.displayOptions.layoutControls.timelinePreview.file,
            true,
            self.displayOptions.vastOptions.vastTimeout,
            function () {
                const convertVttRawData = function (vttRawData) {
                    if (!(
                        (typeof vttRawData.cues !== 'undefined') &&
                        (vttRawData.cues.length)
                    )) {
                        return [];
                    }

                    const result = [];
                    let tempThumbnailData = null;
                    let tempThumbnailCoordinates = null;

                    for (let i = 0; i < vttRawData.cues.length; i++) {
                        tempThumbnailData = vttRawData.cues[i].text.split('#');
                        let xCoords = 0, yCoords = 0, wCoords = 122.5, hCoords = 69;

                        // .vtt file contains sprite corrdinates
                        if (
                            (tempThumbnailData.length === 2) &&
                            (tempThumbnailData[1].indexOf('xywh=') === 0)
                        ) {
                            tempThumbnailCoordinates = tempThumbnailData[1].substring(5);
                            tempThumbnailCoordinates = tempThumbnailCoordinates.split(',');

                            if (tempThumbnailCoordinates.length === 4) {
                                self.displayOptions.layoutControls.timelinePreview.spriteImage = true;
                                xCoords = parseInt(tempThumbnailCoordinates[0]);
                                yCoords = parseInt(tempThumbnailCoordinates[1]);
                                wCoords = parseInt(tempThumbnailCoordinates[2]);
                                hCoords = parseInt(tempThumbnailCoordinates[3]);
                            }
                        }

                        let imageUrl;
                        if (self.displayOptions.layoutControls.timelinePreview.spriteRelativePath
                            && self.displayOptions.layoutControls.timelinePreview.file.indexOf('/') !== -1
                            && (typeof self.displayOptions.layoutControls.timelinePreview.sprite === 'undefined' || self.displayOptions.layoutControls.timelinePreview.sprite === '')
                        ) {
                            imageUrl = self.displayOptions.layoutControls.timelinePreview.file.substring(0, self.displayOptions.layoutControls.timelinePreview.file.lastIndexOf('/'));
                            imageUrl += '/' + tempThumbnailData[0];
                        } else {
                            imageUrl = (self.displayOptions.layoutControls.timelinePreview.sprite ? self.displayOptions.layoutControls.timelinePreview.sprite : tempThumbnailData[0]);
                        }

                        result.push({
                            startTime: vttRawData.cues[i].startTime,
                            endTime: vttRawData.cues[i].endTime,
                            image: imageUrl,
                            x: xCoords,
                            y: yCoords,
                            w: wCoords,
                            h: hCoords
                        });
                    }

                    return result;
                };

                const xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    //The response returned an error.
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                const textResponse = xmlHttpReq.responseText;

                const webVttParser = new WebVTTParser();
                const vttRawData = webVttParser.parse(textResponse);

                self.timelinePreviewData = convertVttRawData(vttRawData);
            }
        );
    };

    self.generateTimelinePreviewTags = () => {
        const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
        const previewContainer = document.createElement('div');

        previewContainer.id = self.videoPlayerId + '_fluid_timeline_preview_container';
        previewContainer.className = 'fluid_timeline_preview_container';
        previewContainer.style.display = 'none';
        previewContainer.style.position = 'absolute';

        progressContainer.appendChild(previewContainer);

        //Shadow is needed to not trigger mouseleave event, that stops showing thumbnails, in case one scrubs a bit too fast and leaves current thumb before new one drawn.
        const previewContainerShadow = document.createElement('div');
        previewContainerShadow.id = self.videoPlayerId + '_fluid_timeline_preview_container_shadow';
        previewContainerShadow.className = 'fluid_timeline_preview_container_shadow';
        previewContainerShadow.style.position = 'absolute';
        previewContainerShadow.style.display = 'none';
        previewContainerShadow.style.opacity = 1;
        progressContainer.appendChild(previewContainerShadow);
    };

    self.getThumbnailCoordinates = (second) => {
        if (self.timelinePreviewData.length) {
            for (let i = 0; i < self.timelinePreviewData.length; i++) {
                if ((second >= self.timelinePreviewData[i].startTime) && (second <= self.timelinePreviewData[i].endTime)) {
                    return self.timelinePreviewData[i];
                }
            }
        }

        return false;
    };

    self.drawTimelinePreview = (event) => {
        const timelinePreviewTag = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview_container');
        const timelinePreviewShadow = document.getElementById(self.videoPlayerId + '_fluid_timeline_preview_container_shadow');
        const progressContainer = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
        const totalWidth = progressContainer.clientWidth;

        if (self.isCurrentlyPlayingAd) {
            if (timelinePreviewTag.style.display !== 'none') {
                timelinePreviewTag.style.display = 'none';
            }

            return;
        }

        //get the hover position
        const hoverX = self.getEventOffsetX(event, progressContainer);
        let hoverSecond = null;

        if (totalWidth) {
            hoverSecond = self.currentVideoDuration * hoverX / totalWidth;

            //get the corresponding thumbnail coordinates
            const thumbnailCoordinates = self.getThumbnailCoordinates(hoverSecond);
            timelinePreviewShadow.style.width = totalWidth + 'px';
            timelinePreviewShadow.style.display = 'block';

            if (thumbnailCoordinates !== false) {
                timelinePreviewTag.style.width = thumbnailCoordinates.w + 'px';
                timelinePreviewTag.style.height = thumbnailCoordinates.h + 'px';
                timelinePreviewShadow.style.height = thumbnailCoordinates.h + 'px';
                timelinePreviewTag.style.background =
                    'url(' + thumbnailCoordinates.image + ') no-repeat scroll -' + thumbnailCoordinates.x + 'px -' + thumbnailCoordinates.y + 'px';
                timelinePreviewTag.style.left = hoverX - (thumbnailCoordinates.w / 2) + 'px';
                timelinePreviewTag.style.display = 'block';
                if (!self.displayOptions.layoutControls.timelinePreview.spriteImage) {
                    timelinePreviewTag.style.backgroundSize = 'contain';
                }

            } else {
                timelinePreviewTag.style.display = 'none';
            }
        }
    };

    self.setupThumbnailPreview = () => {
        if (self.displayOptions.layoutControls.timelinePreview &&
            (typeof self.displayOptions.layoutControls.timelinePreview.file === 'string') &&
            (typeof self.displayOptions.layoutControls.timelinePreview.type === 'string')) {

            if (self.displayOptions.layoutControls.timelinePreview.type === 'VTT') {
                self.requestScript(
                    fluidPlayerScriptLocation + self.vttParserScript,
                    self.setupThumbnailPreviewVtt.bind(this)
                );
                let eventOn = 'mousemove';
                let eventOff = 'mouseleave';
                if (self.mobileInfo.userOs) {
                    eventOn = 'touchmove';
                    eventOff = 'touchend';
                }
                document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container')
                    .addEventListener(eventOn, self.drawTimelinePreview.bind(self), false);
                document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container')
                    .addEventListener(eventOff, function (event) {
                        const progress = document.getElementById(self.videoPlayerId + '_fluid_controls_progress_container');
                        if (typeof event.clientX !== 'undefined' && progress.contains(document.elementFromPoint(event.clientX, event.clientY))) {
                            //False positive (Chrome bug when fast click causes leave event)
                            return;
                        }
                        document.getElementById(self.videoPlayerId + '_fluid_timeline_preview_container').style.display = 'none';
                        document.getElementById(self.videoPlayerId + '_fluid_timeline_preview_container_shadow').style.display = 'none';
                    }, false);
                self.generateTimelinePreviewTags();
            }

            self.showTimeOnHover = false;
        }
    };

    self.setupPlayerWrapper = () => {
        const videoPlayer = self.domRef.player;

        //Create a Wrapper Div element
        const divVideoWrapper = document.createElement('div');
        divVideoWrapper.className = (self.isTouchDevice() ? 'fluid_video_wrapper mobile' : 'fluid_video_wrapper');

        divVideoWrapper.id = 'fluid_video_wrapper_' + self.videoPlayerId;

        //Assign the height/width dimensions to the wrapper
        if (self.displayOptions.layoutControls.fillToContainer) {
            divVideoWrapper.style.width = '100%';
            divVideoWrapper.style.height = '100%';
        } else {
            divVideoWrapper.style.height = videoPlayer.clientHeight + 'px';
            divVideoWrapper.style.width = videoPlayer.clientWidth + 'px';
        }
        videoPlayer.style.height = '100%';
        videoPlayer.style.width = '100%';

        videoPlayer.parentNode.insertBefore(divVideoWrapper, videoPlayer);
        divVideoWrapper.appendChild(videoPlayer);
    };

    self.onErrorDetection = () => {
        const videoPlayerTag = self.domRef.player;
        const self = self.getInstanceById(videoPlayerTag.id);

        if (
            (videoPlayerTag.networkState === videoPlayerTag.NETWORK_NO_SOURCE) &&
            self.isCurrentlyPlayingAd
        ) {
            //Probably the video ad file was not loaded successfully
            self.playMainVideoWhenVastFails(401);
        }

    };

    self.subtitleFetchParse = (subtitleItem) => {
        const videoPlayerTag = self.domRef.player;

        self.sendRequest(
            subtitleItem.url,
            true,
            self.displayOptions.vastOptions.vastTimeout,
            function () {
                const convertVttRawData = function (vttRawData) {
                    if (!(
                        (typeof vttRawData.cues !== 'undefined') &&
                        (vttRawData.cues.length)
                    )) {
                        return [];
                    }

                    const result = [];

                    for (let i = 0; i < vttRawData.cues.length; i++) {
                        let tempThumbnailData = vttRawData.cues[i].text.split('#');

                        result.push({
                            startTime: vttRawData.cues[i].startTime,
                            endTime: vttRawData.cues[i].endTime,
                            text: vttRawData.cues[i].text,
                            cue: vttRawData.cues[i]
                        })
                    }

                    return result;
                };

                const xmlHttpReq = this;

                if ((xmlHttpReq.readyState === 4) && (xmlHttpReq.status !== 200)) {
                    //The response returned an error.
                    return;
                }

                if (!((xmlHttpReq.readyState === 4) && (xmlHttpReq.status === 200))) {
                    return;
                }

                const textResponse = xmlHttpReq.responseText;

                const parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
                const cues = [];
                const regions = []; // TODO: unused?
                parser.oncue = function (cue) {
                    cues.push(cue);
                };
                parser.onregion = function (region) {
                    regions.push(region);
                };
                parser.parse(textResponse);
                parser.flush();
                self.subtitlesData = cues;

            }
        );
    };

    self.createSubtitlesSwitch = () => {
        const videoPlayer = self.domRef.player;
        const subtitlesOff = 'OFF';
        self.subtitlesData = [];

        if (self.displayOptions.layoutControls.subtitlesEnabled) {
            const tracks = [];
            tracks.push({'label': subtitlesOff, 'url': 'na', 'lang': subtitlesOff});

            const tracksList = videoPlayer.querySelectorAll('track');

            [].forEach.call(tracksList, function (track) {
                if (track.kind === 'metadata' && track.src) {
                    tracks.push({'label': track.label, 'url': track.src, 'lang': track.srclang});
                }
            });

            self.subtitlesTracks = tracks;
            const subtitlesChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_subtitles');
            let appendSubtitleChange = false;

            const subtitlesChangeList = document.createElement('div');
            subtitlesChangeList.id = self.videoPlayerId + '_fluid_control_subtitles_list';
            subtitlesChangeList.className = 'fluid_subtitles_list';
            subtitlesChangeList.style.display = 'none';

            let firstSubtitle = true;
            self.subtitlesTracks.forEach(function (subtitle) {

                const subtitleSelected = (firstSubtitle) ? "subtitle_selected" : "";
                firstSubtitle = false;
                const subtitlesChangeDiv = document.createElement('div');
                subtitlesChangeDiv.id = 'subtitle_' + self.videoPlayerId + '_' + subtitle.label;
                subtitlesChangeDiv.className = 'fluid_subtitle_list_item';
                subtitlesChangeDiv.innerHTML = '<span class="subtitle_button_icon ' + subtitleSelected + '"></span>' + subtitle.label;

                subtitlesChangeDiv.addEventListener('click', function (event) {
                    event.stopPropagation();
                    const subtitleChangedTo = this;
                    const subtitleIcons = document.getElementsByClassName('subtitle_button_icon');
                    for (let i = 0; i < subtitleIcons.length; i++) {
                        subtitleIcons[i].className = subtitleIcons[i].className.replace("subtitle_selected", "");
                    }
                    subtitleChangedTo.firstChild.className += ' subtitle_selected';

                    self.subtitlesTracks.forEach(function (subtitle) {
                        if (subtitle.label == subtitleChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, "")) {

                            if (subtitle.label === subtitlesOff) {
                                self.subtitlesData = [];
                            } else {
                                self.subtitleFetchParse(subtitle);
                            }
                        }
                    });
                    self.openCloseSubtitlesSwitch();

                });

                subtitlesChangeList.appendChild(subtitlesChangeDiv);
                appendSubtitleChange = true;

            });

            if (appendSubtitleChange) {
                subtitlesChangeButton.appendChild(subtitlesChangeList);
                subtitlesChangeButton.addEventListener('click', function () {
                    self.openCloseSubtitlesSwitch();
                });
            } else {
                // Didn't give any subtitle options
                document.getElementById(self.videoPlayerId + '_fluid_control_subtitles').style.display = 'none';
            }

        } else {
            // No other video subtitles
            document.getElementById(self.videoPlayerId + '_fluid_control_subtitles').style.display = 'none';
        }

        //attach subtitles to show based on time
        //this function is for rendering of subtitles when content is playing
        const videoPlayerSubtitlesUpdate = function () {
            self.renderSubtitles();
        };

        videoPlayer.addEventListener('timeupdate', videoPlayerSubtitlesUpdate);
    };

    self.renderSubtitles = () => {
        const videoPlayer = self.domRef.player;

        //if content is playing then no subtitles
        let currentTime = Math.floor(videoPlayer.currentTime);
        let subtitlesAvailable = false;
        let subtitlesContainer = document.getElementById(self.videoPlayerId + '_fluid_subtitles_container');

        if (self.isCurrentlyPlayingAd) {
            subtitlesContainer.innerHTML = '';
            return;
        }

        for (let i = 0; i < self.subtitlesData.length; i++) {
            if (currentTime >= (self.subtitlesData[i].startTime) && currentTime <= (self.subtitlesData[i].endTime)) {
                subtitlesContainer.innerHTML = '';
                subtitlesContainer.appendChild(WebVTT.convertCueToDOMTree(window, self.subtitlesData[i].text));
                subtitlesAvailable = true;
            }
        }

        if (!subtitlesAvailable) {
            subtitlesContainer.innerHTML = '';
        }
    };

    self.openCloseSubtitlesSwitch = () => {
        const subtitleChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_subtitles_list');
        const sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_subtitles');

        if (self.isCurrentlyPlayingAd) {
            subtitleChangeList.style.display = 'none';
            return;
        }

        if (subtitleChangeList.style.display === 'none') {
            subtitleChangeList.style.display = 'block';
            const mouseOut = function (event) {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                subtitleChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            subtitleChangeList.style.display = 'none';
        }
    };

    self.createSubtitles = () => {
        const videoPlayerTag = self.domRef.player;

        const divSubtitlesContainer = document.createElement('div');
        divSubtitlesContainer.id = self.videoPlayerId + '_fluid_subtitles_container';
        divSubtitlesContainer.className = 'fluid_subtitles_container';
        videoPlayerTag.parentNode.insertBefore(divSubtitlesContainer, videoPlayerTag.nextSibling);

        import(/* webpackChunkName: "vttjs" */ 'vtt.js').then(() => {
            self.createSubtitlesSwitch();
        });

        // self.requestScript(
        //     fluidPlayerScriptLocation + self.subtitlesParseScript,
        //     self.createSubtitlesSwitch.bind(this)
        // );
    };

    self.createCardboardJoystickButton = (identity) => {
        const videoPlayerTag = self.domRef.player;

        const vrJoystickPanel = document.getElementById(self.videoPlayerId + '_fluid_vr_joystick_panel');
        const joystickButton = document.createElement('div');
        joystickButton.id = self.videoPlayerId + '_fluid_vr_joystick_' + identity;
        joystickButton.className = 'fluid_vr_button fluid_vr_joystick_' + identity;
        vrJoystickPanel.appendChild(joystickButton);

        return joystickButton;
    };

    self.cardboardRotateLeftRight = (param /* 0 - right, 1 - left */) => {
        const go = self.vrROTATION_POSITION;
        const back = -self.vrROTATION_POSITION;
        const pos = param < 1 ? go : back;
        const easing = {val: pos};
        const tween = new TWEEN.Tween(easing)
            .to({val: 0}, self.vrROTATION_SPEED)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(function () {
                self.vrViewer.OrbitControls.rotateLeft(easing.val)
            }).start();
    };

    self.cardboardRotateUpDown = (param /* 0 - down, 1- up */) => {
        const go = self.vrROTATION_POSITION;
        const back = -self.vrROTATION_POSITION;
        const pos = param < 1 ? go : back;
        const easing = {val: pos};
        const tween = new TWEEN.Tween(easing)
            .to({val: 0}, self.vrROTATION_SPEED)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(function () {
                self.vrViewer.OrbitControls.rotateUp(easing.val)
            }).start();
    };

    self.createCardboardJoystick = () => {
        const vrContainer = document.getElementById(self.videoPlayerId + '_fluid_vr_container');

        // Create a JoyStick and append to VR container
        const vrJoystickPanel = document.createElement('div');
        vrJoystickPanel.id = self.videoPlayerId + '_fluid_vr_joystick_panel';
        vrJoystickPanel.className = 'fluid_vr_joystick_panel';
        vrContainer.appendChild(vrJoystickPanel);

        // Create Joystick buttons
        const upButton = self.createCardboardJoystickButton('up');
        const leftButton = self.createCardboardJoystickButton('left');
        const rightButton = self.createCardboardJoystickButton('right');
        const downButton = self.createCardboardJoystickButton('down');
        const zoomDefaultButton = self.createCardboardJoystickButton('zoomdefault');
        const zoomInButton = self.createCardboardJoystickButton('zoomin');
        const zoomOutButton = self.createCardboardJoystickButton('zoomout');

        // Camera movement buttons
        upButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(-0.1);
            self.cardboardRotateUpDown(1);
        });

        downButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateUp(0.1);
            self.cardboardRotateUpDown(0);
        });

        rightButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(0.1);
            self.cardboardRotateLeftRight(0);
        });

        leftButton.addEventListener('click', function () {
            //player.vrViewer.OrbitControls.rotateLeft(-0.1);
            self.cardboardRotateLeftRight(1);
        });

        zoomDefaultButton.addEventListener('click', function () {
            self.vrViewer.camera.fov = 60;
            self.vrViewer.camera.updateProjectionMatrix();
        });

        // Camera Zoom buttons
        zoomOutButton.addEventListener('click', function () {
            self.vrViewer.camera.fov *= 1.1;
            self.vrViewer.camera.updateProjectionMatrix();
        });

        zoomInButton.addEventListener('click', function () {
            self.vrViewer.camera.fov *= 0.9;
            self.vrViewer.camera.updateProjectionMatrix();
        });

    };

    self.cardBoardResize = () => {
        const videoPlayerTag = self.domRef.player;
        videoPlayerTag.addEventListener('theatreModeOn', function () {
            self.vrViewer.onWindowResize();
        });

        videoPlayerTag.addEventListener('theatreModeOff', function () {
            self.vrViewer.onWindowResize();
        });
    };

    self.cardBoardSwitchToNormal = () => {
        const vrJoystickPanel = document.getElementById(self.videoPlayerId + '_fluid_vr_joystick_panel');
        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
        const videoPlayerTag = self.domRef.player;

        self.vrViewer.enableEffect(PANOLENS.MODES.NORMAL);
        self.vrViewer.onWindowResize();
        self.vrMode = false;

        // remove dual control bar
        const newControlBar = videoPlayerTag.parentNode.getElementsByClassName('fluid_vr2_controls_container')[0];
        videoPlayerTag.parentNode.removeChild(newControlBar);

        if (self.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel) {
            vrJoystickPanel.style.display = "block";
        }
        controlBar.classList.remove("fluid_vr_controls_container");

        // show volume control bar
        const volumeContainer = document.getElementById(self.videoPlayerId + '_fluid_control_volume_container');
        volumeContainer.style.display = "block";

        // show all ads overlays if any
        const adCountDownTimerText = document.getElementById('ad_countdown' + self.videoPlayerId);
        const ctaButton = document.getElementById(self.videoPlayerId + '_fluid_cta');
        const addAdPlayingTextOverlay = document.getElementById(self.videoPlayerId + '_fluid_ad_playing');
        const skipBtn = document.getElementById('skip_button_' + self.videoPlayerId);

        if (adCountDownTimerText) {
            adCountDownTimerText.style.display = 'block';
        }

        if (ctaButton) {
            ctaButton.style.display = 'block';
        }

        if (addAdPlayingTextOverlay) {
            addAdPlayingTextOverlay.style.display = 'block';
        }

        if (skipBtn) {
            skipBtn.style.display = 'block';
        }
    };

    self.cardBoardHideDefaultControls = () => {
        const vrJoystickPanel = document.getElementById(self.videoPlayerId + '_fluid_vr_joystick_panel');
        const initialPlay = document.getElementById(self.videoPlayerId + '_fluid_initial_play');
        const volumeContainer = document.getElementById(self.videoPlayerId + '_fluid_control_volume_container');
        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');

        // hide the joystick in VR mode
        if (self.displayOptions.layoutControls.showCardBoardJoystick && vrJoystickPanel) {
            vrJoystickPanel.style.display = "none";
        }

        // hide big play icon
        if (initialPlay) {
            document.getElementById(self.videoPlayerId + '_fluid_initial_play').style.display = "none";
            document.getElementById(self.videoPlayerId + '_fluid_initial_play_button').style.opacity = "1";
        }

        // hide volume control bar
        volumeContainer.style.display = "none";

    };

    self.cardBoardCreateVRControls = () => {
        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
        const videoPlayerTag = self.domRef.player;

        // create and append dual control bar
        const newControlBar = controlBar.cloneNode(true);
        newControlBar.removeAttribute('id');
        newControlBar.querySelectorAll('*').forEach(function (node) {
            node.removeAttribute('id');
        });

        newControlBar.classList.add("fluid_vr2_controls_container");
        videoPlayerTag.parentNode.insertBefore(newControlBar, videoPlayerTag.nextSibling);
        self.copyEvents(newControlBar);

    };

    self.cardBoardSwitchToVR = () => {
        const vrJoystickPanel = document.getElementById(self.videoPlayerId + '_fluid_vr_joystick_panel');
        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
        const videoPlayerTag = self.domRef.player;

        self.vrViewer.enableEffect(PANOLENS.MODES.CARDBOARD);

        self.vrViewer.onWindowResize();
        self.vrViewer.disableReticleControl();

        self.vrMode = true;

        controlBar.classList.add("fluid_vr_controls_container");

        self.cardBoardHideDefaultControls();
        self.cardBoardCreateVRControls();

        // hide all ads overlays
        const adCountDownTimerText = document.getElementById('ad_countdown' + self.videoPlayerId);
        const ctaButton = document.getElementById(self.videoPlayerId + '_fluid_cta');
        const addAdPlayingTextOverlay = document.getElementById(self.videoPlayerId + '_fluid_ad_playing');
        const skipBtn = document.getElementById('skip_button_' + self.videoPlayerId);

        if (adCountDownTimerText) {
            adCountDownTimerText.style.display = 'none';
        }

        if (ctaButton) {
            ctaButton.style.display = 'none';
        }

        if (addAdPlayingTextOverlay) {
            addAdPlayingTextOverlay.style.display = 'none';
        }

        if (skipBtn) {
            skipBtn.style.display = 'none';
        }

    };

    self.cardBoardMoveTimeInfo = () => {
        const timePlaceholder = document.getElementById(self.videoPlayerId + '_fluid_control_duration');
        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');

        timePlaceholder.classList.add("cardboard_time");
        controlBar.appendChild(timePlaceholder);

        // override the time display function for this instance
        self.contolDurationUpdate = function (videoPlayerId) {
            const videoPlayerTag = document.getElementById(videoPlayerId);

            const currentPlayTime = self.formatTime(videoPlayerTag.currentTime);
            const totalTime = self.formatTime(self.currentVideoDuration);
            const timePlaceholder = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_duration');

            let durationText = '';

            if (self.isCurrentlyPlayingAd) {
                durationText = "<span class='ad_timer_prefix'>AD : </span>" + currentPlayTime + ' / ' + totalTime;

                for (let i = 0; i < timePlaceholder.length; i++) {
                    timePlaceholder[i].classList.add("ad_timer_prefix");
                }

            } else {
                durationText = currentPlayTime + ' / ' + totalTime;

                for (let i = 0; i < timePlaceholder.length; i++) {
                    timePlaceholder[i].classList.remove("ad_timer_prefix");
                }
            }

            for (let i = 0; i < timePlaceholder.length; i++) {
                timePlaceholder[i].innerHTML = durationText;
            }
        }
    };

    self.cardBoardAlterDefaultControls = () => {
        self.cardBoardMoveTimeInfo();
    };

    self.createCardboardView = () => {

        const videoPlayerTag = self.domRef.player;
        const vrSwitchButton = videoPlayerTag.parentNode.getElementsByClassName('fluid_control_cardboard');

        // Create a container for 360degree
        const vrContainer = document.createElement('div');
        vrContainer.id = self.videoPlayerId + '_fluid_vr_container';
        vrContainer.className = 'fluid_vr_container';
        videoPlayerTag.parentNode.insertBefore(vrContainer, videoPlayerTag.nextSibling);

        // OverRide some conflicting functions from panolens
        PANOLENS.VideoPanorama.prototype.pauseVideo = function () {
        };
        PANOLENS.VideoPanorama.prototype.playVideo = function () {
        };

        self.vrPanorama = new PANOLENS.VideoPanorama('', {
            videoElement: videoPlayerTag,
            autoplay: self.displayOptions.layoutControls.autoPlay
        });

        self.vrViewer = new PANOLENS.Viewer({
            container: vrContainer,
            controlBar: true,
            controlButtons: [],
            enableReticle: false
        });
        self.vrViewer.add(self.vrPanorama);

        self.vrViewer.enableEffect(PANOLENS.MODES.NORMAL);
        self.vrViewer.onWindowResize();

        // if Mobile device then enable controls using gyroscope
        if (self.getMobileOs().userOs === 'Android' || self.getMobileOs().userOs === 'iOS') {
            self.vrViewer.enableControl(1);
        }

        // Make Changes for default skin
        self.cardBoardAlterDefaultControls();

        // resize on toggle theater mode
        self.cardBoardResize();

        // Store initial camera position
        self.vrViewer.initialCameraPosition = JSON.parse(JSON.stringify(self.vrViewer.camera.position));

        if (self.displayOptions.layoutControls.showCardBoardJoystick) {
            if (!(self.getMobileOs().userOs === 'Android' || self.getMobileOs().userOs === 'iOS')) {
                self.createCardboardJoystick();
            }
            // Disable zoom if showing joystick
            self.vrViewer.OrbitControls.noZoom = true;
        }

        self.trackEvent(videoPlayerTag.parentNode, 'click', '.fluid_control_cardboard', function () {

            if (self.vrMode) {

                self.cardBoardSwitchToNormal();

            } else {

                self.cardBoardSwitchToVR();

            }

        });
    };

    self.createCardboard = () => {
        if (self.displayOptions.layoutControls.showCardBoardView) {

            self.requestScript(
                fluidPlayerScriptLocation + self.threeJsScript,
                function () {

                    self.requestScript(
                        fluidPlayerScriptLocation + self.panolensScript,
                        function () {

                            self.createCardboardView();

                        })

                }
            );

        } else {

            const cardBoardBtn = document.getElementById(self.videoPlayerId + '_fluid_control_cardboard');
            cardBoardBtn.style.display = 'none';

        }
    };

    self.createVideoSourceSwitch = () => {
        const videoPlayer = self.domRef.player;

        const sources = [];
        const sourcesList = videoPlayer.querySelectorAll('source');
        [].forEach.call(sourcesList, function (source) {
            if (source.title && source.src) {
                sources.push({
                    'title': source.title,
                    'url': source.src,
                    'isHD': (source.getAttribute('data-fluid-hd') != null)
                });
            }
        });

        self.videoSources = sources;
        if (self.videoSources.length > 1) {
            const sourceChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_video_source');
            let appendSourceChange = false;

            const sourceChangeList = document.createElement('div');
            sourceChangeList.id = self.videoPlayerId + '_fluid_control_video_source_list';
            sourceChangeList.className = 'fluid_video_sources_list';
            sourceChangeList.style.display = 'none';

            let firstSource = true;
            self.videoSources.forEach(function (source) {
                // Fix for issues occurring on iOS with mkv files
                const getTheType = source.url.split(".").pop();
                if (self.mobileInfo.userOs == "iOS" && getTheType == 'mkv') {
                    return;
                }

                const sourceSelected = (firstSource) ? "source_selected" : "";
                const hdElement = (source.isHD) ? '<sup style="color:' + self.displayOptions.layoutControls.primaryColor + '" class="fp_hd_source"></sup>' : '';
                firstSource = false;
                const sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.id = 'source_' + self.videoPlayerId + '_' + source.title;
                sourceChangeDiv.className = 'fluid_video_source_list_item';
                sourceChangeDiv.innerHTML = '<span class="source_button_icon ' + sourceSelected + '"></span>' + source.title + hdElement;

                sourceChangeDiv.addEventListener('click', function (event) {
                    // While changing source the player size can flash, we want to set the pixel dimensions then back to 100% afterwards
                    videoPlayer.style.width = videoPlayer.clientWidth + "px";
                    videoPlayer.style.height = videoPlayer.clientHeight + "px";

                    event.stopPropagation();
                    const videoChangedTo = this;
                    const sourceIcons = document.getElementsByClassName('source_button_icon');
                    for (let i = 0; i < sourceIcons.length; i++) {
                        sourceIcons[i].className = sourceIcons[i].className.replace("source_selected", "");
                    }
                    videoChangedTo.firstChild.className += ' source_selected';

                    self.videoSources.forEach(function (source) {
                        if (source.title == videoChangedTo.innerText.replace(/(\r\n\t|\n|\r\t)/gm, "")) {
                            self.setBuffering();
                            self.setVideoSource(source.url);
                            self.fluidStorage.fluidQuality = source.title;
                        }
                    });

                    self.openCloseVideoSourceSwitch();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
                appendSourceChange = true;
            });

            if (appendSourceChange) {
                sourceChangeButton.appendChild(sourceChangeList);
                sourceChangeButton.addEventListener('click', function () {
                    self.openCloseVideoSourceSwitch();
                });
            } else {
                // Didn't give any source options
                document.getElementById(self.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
            }

        } else {
            // No other video sources
            document.getElementById(self.videoPlayerId + '_fluid_control_video_source').style.display = 'none';
        }
    };

    self.openCloseVideoSourceSwitch = () => {
        const sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_source_list');
        const sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_video_source');

        if (self.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            const mouseOut = function (event) {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    };

    self.setVideoSource = (url) => {
        const videoPlayerTag = self.domRef.player;

        if (self.mobileInfo.userOs == "iOS" && url.indexOf('.mkv') > 0) {
            console.log('[FP_ERROR] .mkv files not supported by iOS devices.');
            return false;
        }

        if (self.isCurrentlyPlayingAd) {
            self.originalSrc = url;
        } else {
            self.isSwitchingSource = true;
            let play = false;
            if (!videoPlayerTag.paused) {
                videoPlayerTag.pause();
                play = true;
            }

            const currentTime = videoPlayerTag.currentTime;
            self.setCurrentTimeAndPlay(currentTime, play);

            videoPlayerTag.src = url;
            self.originalSrc = url;
            self.displayOptions.layoutControls.mediaType = self.getCurrentSrcType();
            self.initialiseStreamers();
        }
    };

    // TODO: referencing local variable in callback.
    self.setCurrentTimeAndPlay = (newCurrentTime, shouldPlay) => {
        const videoPlayerTag = self.domRef.player;
        const loadedMetadata = function () {
            videoPlayerTag.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('loadedmetadata', loadedMetadata);
            // Safari ios and mac fix to set currentTime
            if (self.mobileInfo.userOs === 'iOS' || self.getBrowserVersion().browserName.toLowerCase() === 'safari') {
                videoPlayerTag.addEventListener('playing', videoPlayStart);
            }

            if (shouldPlay) {
                videoPlayerTag.play();
            } else {
                videoPlayerTag.pause();
                self.controlPlayPauseToggle(self.videoPlayerId);
            }
            self.isSwitchingSource = false;
            videoPlayerTag.style.width = '100%';
            videoPlayerTag.style.height = '100%';
        };
        let videoPlayStart = function () {
            this.currentTime = newCurrentTime;
            videoPlayerTag.removeEventListener('playing', videoPlayStart);
        };

        videoPlayerTag.addEventListener('loadedmetadata', loadedMetadata, false);

        videoPlayerTag.load();
    };

    self.initTitle = () => {
        const videoPlayer = self.domRef.player;
        if (self.displayOptions.layoutControls.title) {
            const titleHolder = document.createElement('div');
            titleHolder.id = self.videoPlayerId + '_title';
            videoPlayer.parentNode.insertBefore(titleHolder, null);
            titleHolder.innerHTML += self.displayOptions.layoutControls.title;
            titleHolder.classList.add('fp_title');
        }
    };

    self.hasTitle = () => {
        const title = document.getElementById(this.videoPlayerId + '_title');
        const titleOption = this.displayOptions.layoutControls.title;
        return title && titleOption != null;
    };

    self.hideTitle = () => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const titleHolder = document.getElementById(videoPlayerInstance.videoPlayerId + '_title');

        if (videoPlayerInstance.hasTitle()) {
            titleHolder.classList.add('fade_out');
        }
    };

    self.showTitle = () => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const videoPlayerTag = document.getElementById(videoInstanceId);
        const titleHolder = document.getElementById(videoPlayerInstance.videoPlayerId + '_title');

        if (videoPlayerInstance.hasTitle()) {
            titleHolder.classList.remove('fade_out');
        }
    };

    self.initLogo = () => {
        const videoPlayer = self.domRef.player;
        if (!self.displayOptions.layoutControls.logo.imageUrl) {
            return;
        }

        // Container div for the logo
        // This is to allow for fade in and out logo_maintain_display
        const logoHolder = document.createElement('div');
        logoHolder.id = self.videoPlayerId + '_logo';
        let hideClass = 'logo_maintain_display';
        if (self.displayOptions.layoutControls.logo.hideWithControls) {
            hideClass = 'initial_controls_show';
        }
        logoHolder.classList.add(hideClass, 'fp_logo');

        // The logo itself
        const logoImage = document.createElement('img');
        logoImage.id = self.videoPlayerId + '_logo_image';
        if (self.displayOptions.layoutControls.logo.imageUrl) {
            logoImage.src = self.displayOptions.layoutControls.logo.imageUrl;
        }
        logoImage.style.position = 'absolute';
        logoImage.style.margin = self.displayOptions.layoutControls.logo.imageMargin;
        const logoPosition = self.displayOptions.layoutControls.logo.position.toLowerCase();
        if (logoPosition.indexOf('bottom') !== -1) {
            logoImage.style.bottom = 0;
        } else {
            logoImage.style.top = 0;
        }
        if (logoPosition.indexOf('right') !== -1) {
            logoImage.style.right = 0;
        } else {
            logoImage.style.left = 0;
        }
        if (self.displayOptions.layoutControls.logo.opacity) {
            logoImage.style.opacity = self.displayOptions.layoutControls.logo.opacity;
        }

        if (self.displayOptions.layoutControls.logo.clickUrl !== null) {
            logoImage.style.cursor = 'pointer';
            logoImage.addEventListener('click', function () {
                const win = window.open(self.displayOptions.layoutControls.logo.clickUrl, '_blank');
                win.focus();
            });
        }

        // If a mouseOverImage is provided then we must set up the listeners for it
        if (self.displayOptions.layoutControls.logo.mouseOverImageUrl) {
            logoImage.addEventListener('mouseover', function () {
                logoImage.src = self.displayOptions.layoutControls.logo.mouseOverImageUrl;
            }, false);
            logoImage.addEventListener('mouseout', function () {
                logoImage.src = self.displayOptions.layoutControls.logo.imageUrl;
            }, false);
        }

        videoPlayer.parentNode.insertBefore(logoHolder, null);
        logoHolder.appendChild(logoImage, null);
    };

    self.initHtmlOnPauseBlock = () => {
        //If onPauseRoll is defined than HtmlOnPauseBlock won't be shown
        if (self.hasValidOnPauseAd()) {
            return;
        }

        if (!self.displayOptions.layoutControls.htmlOnPauseBlock.html) {
            return;
        }

        const videoPlayer = self.domRef.player;
        const containerDiv = document.createElement('div');
        containerDiv.id = self.videoPlayerId + '_fluid_html_on_pause';
        containerDiv.className = 'fluid_html_on_pause';
        containerDiv.style.display = 'none';
        containerDiv.innerHTML = self.displayOptions.layoutControls.htmlOnPauseBlock.html;
        containerDiv.onclick = function (event) {
            self.playPauseToggle(videoPlayer);
        };

        if (self.displayOptions.layoutControls.htmlOnPauseBlock.width) {
            containerDiv.style.width = self.displayOptions.layoutControls.htmlOnPauseBlock.width + 'px';
        }

        if (self.displayOptions.layoutControls.htmlOnPauseBlock.height) {
            containerDiv.style.height = self.displayOptions.layoutControls.htmlOnPauseBlock.height + 'px';
        }

        videoPlayer.parentNode.insertBefore(containerDiv, null);
    };

    /**
     * Play button in the middle when the video loads
     */
    self.initPlayButton = () => {
        const videoPlayer = self.domRef.player;

        // Create the html fpr the play button
        const containerDiv = document.createElement('div');
        containerDiv.id = self.videoPlayerId + '_fluid_initial_play_button';
        containerDiv.className = 'fluid_html_on_pause';
        const backgroundColor = (self.displayOptions.layoutControls.primaryColor) ? self.displayOptions.layoutControls.primaryColor : "#333333";
        containerDiv.innerHTML = '<div id="' + self.videoPlayerId + '_fluid_initial_play" class="fluid_initial_play" style="background-color:' + backgroundColor + '"><div id="' + self.videoPlayerId + '_fluid_state_button" class="fluid_initial_play_button"></div></div>';
        const initPlayFunction = function () {
            self.playPauseToggle(videoPlayer);
            containerDiv.removeEventListener('click', initPlayFunction);
        };
        containerDiv.addEventListener('click', initPlayFunction);

        // If the user has chosen to not show the play button we'll make it invisible
        // We don't hide altogether because animations might still be used
        if (!self.displayOptions.layoutControls.playButtonShowing) {
            const initialControlsDisplay = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
            initialControlsDisplay.classList.add('initial_controls_show');
            containerDiv.style.opacity = '0';
        }

        videoPlayer.parentNode.insertBefore(containerDiv, null);
    };

    /**
     * Set the mainVideoDuration property one the video is loaded
     */
    self.mainVideoReady = () => {
        if (self.mainVideoDuration == 0 && !self.isCurrentlyPlayingAd && self.mainVideoReadyState === false) {
            self.mainVideoDuration = self.domRef.player.duration;
            self.mainVideoReadyState = true;
            const event = new CustomEvent("mainVideoDurationSet");
            self.domRef.player.dispatchEvent(event);
            self.domRef.player.removeEventListener('loadedmetadata', self.mainVideoReady);
        }

    };

    self.userActivityChecker = () => {
        const videoPlayer = document.getElementById('fluid_video_wrapper_' + self.videoPlayerId);
        const videoPlayerTag = self.domRef.player;
        self.newActivity = null;

        let isMouseStillDown = false;

        const activity = function (event) {
            if (event.type === 'touchstart' || event.type === 'mousedown') {
                isMouseStillDown = true;
            }
            if (event.type === 'touchend' || event.type === 'mouseup') {
                isMouseStillDown = false;
            }
            self.newActivity = true;
        };

        // TODO: aaaaand where is this cleared, exactly?
        const activityCheck = setInterval(function () {

            if (self.newActivity === true) {
                if (!isMouseStillDown && !self.isLoading) {
                    self.newActivity = false;
                }

                if (self.isUserActive === false || !self.isControlBarVisible()) {
                    let event = new CustomEvent("userActive");
                    videoPlayerTag.dispatchEvent(event);
                    self.isUserActive = true;
                }

                clearTimeout(self.inactivityTimeout);

                self.inactivityTimeout = setTimeout(function () {
                    if (self.newActivity !== true) {
                        self.isUserActive = false;
                        let event = new CustomEvent("userInactive");
                        videoPlayerTag.dispatchEvent(event);
                    } else {
                        clearTimeout(self.inactivityTimeout);
                    }

                }, self.displayOptions.layoutControls.controlBar.autoHideTimeout * 1000);

            }
        }, 300);

        const listenTo = (self.isTouchDevice()) ? ['touchstart', 'touchmove', 'touchend'] : ['mousemove', 'mousedown', 'mouseup'];
        for (let i = 0; i < listenTo.length; i++) {
            videoPlayer.addEventListener(listenTo[i], activity);
        }
    };

    self.hasControlBar = () => {
        return !!document.getElementById(this.videoPlayerId + '_fluid_controls_container');
    };

    self.isControlBarVisible = () => {
        if (self.hasControlBar() === false) {
            return false;
        }

        const controlBar = document.getElementById(self.videoPlayerId + '_fluid_controls_container');
        const style = window.getComputedStyle(controlBar, null);
        return !(style.opacity === 0 || style.visibility === 'hidden');
    };

    self.setVideoPreload = () => {
        const videoPlayerTag = self.domRef.player;

        videoPlayerTag.setAttribute('preload', this.displayOptions.layoutControls.preload);
    };

    self.hideControlBar = () => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused) {
            videoPlayerInstance.toggleAdCountdown(true);
        }

        // handles both VR and Normal condition
        if (videoPlayerInstance.hasControlBar()) {
            const divVastControls = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_container');
            const fpLogo = videoPlayerTag.parentNode.getElementsByClassName('fp_logo');

            for (let i = 0; i < divVastControls.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    divVastControls[i].classList.remove('fade_in');
                    divVastControls[i].classList.add('fade_out');
                } else {
                    divVastControls[i].style.display = 'none';

                }
            }

            for (let i = 0; i < fpLogo.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    if (fpLogo[i]) {
                        fpLogo[i].classList.remove('fade_in');
                        fpLogo[i].classList.add('fade_out');
                    }
                } else {
                    if (fpLogo[i]) {
                        fpLogo[i].style.display = 'none';
                    }
                }
            }
        }

        videoPlayerTag.style.cursor = 'none';
    };

    self.showControlBar = () => {
        const videoInstanceId = self.getInstanceIdByWrapperId(self.domRef.player.getAttribute('id'));
        const videoPlayerInstance = self.getInstanceById(videoInstanceId);
        const videoPlayerTag = document.getElementById(videoInstanceId);

        if (videoPlayerInstance.isCurrentlyPlayingAd && !videoPlayerTag.paused) {
            videoPlayerInstance.toggleAdCountdown(false);
        }

        if (videoPlayerInstance.hasControlBar()) {
            const divVastControls = videoPlayerTag.parentNode.getElementsByClassName('fluid_controls_container');
            const fpLogo = videoPlayerTag.parentNode.getElementsByClassName('fp_logo');

            for (let i = 0; i < divVastControls.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    divVastControls[i].classList.remove('fade_out');
                    divVastControls[i].classList.add('fade_in');
                } else {
                    divVastControls[i].style.display = 'block';
                }
            }

            for (let i = 0; i < fpLogo.length; i++) {
                if (videoPlayerInstance.displayOptions.layoutControls.controlBar.animated) {
                    if (fpLogo[i]) {
                        fpLogo[i].classList.remove('fade_out');
                        fpLogo[i].classList.add('fade_in');
                    }
                } else {
                    if (fpLogo[i]) {
                        fpLogo[i].style.display = 'block';
                    }
                }
            }

        }

        if (!self.isTouchDevice()) {
            videoPlayerTag.style.cursor = 'default';
        }
    };

    self.linkControlBarUserActivity = () => {
        const videoPlayerTag = self.domRef.player;
        videoPlayerTag.addEventListener('userInactive', self.hideControlBar);
        videoPlayerTag.addEventListener('userActive', self.showControlBar);
        videoPlayerTag.addEventListener('userInactive', self.hideTitle);
        videoPlayerTag.addEventListener('userActive', self.showTitle);
    };

    self.initMute = () => {
        if (self.displayOptions.layoutControls.mute === true) {
            const videoPlayerTag = self.domRef.player;
            videoPlayerTag.volume = 0;
        }
    };

    self.initLoop = () => {
        const videoPlayerTag = self.domRef.player;
        if (self.displayOptions.layoutControls.loop !== null) {
            videoPlayerTag.loop = self.displayOptions.layoutControls.loop;
        } else if (videoPlayerTag.loop) {
            self.displayOptions.layoutControls.loop = true;
        }
    };

    self.setBuffering = () => {
        const videoPlayer = self.domRef.player;

        const bufferBar = videoPlayer.parentNode.getElementsByClassName('fluid_controls_buffered');

        for (let j = 0; j < bufferBar.length; j++) {
            bufferBar[j].style.width = 0;
        }

        // Buffering
        // TODO referencing local value in callback...
        const logProgress = function () {
            const duration = videoPlayer.duration;
            if (duration > 0) {

                for (let i = 0; i < videoPlayer.buffered.length; i++) {
                    if (videoPlayer.buffered.start(videoPlayer.buffered.length - 1 - i) < videoPlayer.currentTime) {
                        const newBufferLength = (videoPlayer.buffered.end(videoPlayer.buffered.length - 1 - i) / duration) * 100 + "%";

                        for (let j = 0; j < bufferBar.length; j++) {
                            bufferBar[j].style.width = newBufferLength;
                        }

                        // Stop checking for buffering if the video is fully buffered
                        // TODO verify this actually does anything
                        if ((videoPlayer.buffered.end(videoPlayer.buffered.length - 1 - i) / duration) === 1) {
                            clearInterval(progressInterval);
                        }

                        break;
                    }

                }
            }
        };
        let progressInterval = setInterval(logProgress, 500);
    };

    self.createPlaybackList = () => {
        const playbackRates = ['x2', 'x1.5', 'x1', 'x0.5'];

        if (self.displayOptions.layoutControls.playbackRateEnabled) {
            const sourceChangeButton = document.getElementById(self.videoPlayerId + '_fluid_control_playback_rate');

            const sourceChangeList = document.createElement('div');
            sourceChangeList.id = self.videoPlayerId + '_fluid_control_video_playback_rate';
            sourceChangeList.className = 'fluid_video_playback_rates';
            sourceChangeList.style.display = 'none';

            playbackRates.forEach(function (rate) {
                const sourceChangeDiv = document.createElement('div');
                sourceChangeDiv.className = 'fluid_video_playback_rates_item';
                sourceChangeDiv.innerText = rate;

                sourceChangeDiv.addEventListener('click', function (event) {
                    event.stopPropagation();
                    let playbackRate = this.innerText.replace('x', '');
                    self.setPlaybackSpeed(playbackRate);
                    self.openCloseVideoPlaybackRate();

                });
                sourceChangeList.appendChild(sourceChangeDiv);
            });

            sourceChangeButton.appendChild(sourceChangeList);
            sourceChangeButton.addEventListener('click', function () {
                self.openCloseVideoPlaybackRate();
            });

        } else {
            // No other video sources
            document.getElementById(self.videoPlayerId + '_fluid_control_playback_rate').style.display = 'none';
        }
    };

    self.openCloseVideoPlaybackRate = () => {
        const sourceChangeList = document.getElementById(this.videoPlayerId + '_fluid_control_video_playback_rate');
        const sourceChangeListContainer = document.getElementById(this.videoPlayerId + '_fluid_control_playback_rate');

        if (self.isCurrentlyPlayingAd) {
            sourceChangeList.style.display = 'none';
            return;
        }

        if (sourceChangeList.style.display == 'none') {
            sourceChangeList.style.display = 'block';
            const mouseOut = function () {
                sourceChangeListContainer.removeEventListener('mouseleave', mouseOut);
                sourceChangeList.style.display = 'none';
            };
            sourceChangeListContainer.addEventListener('mouseleave', mouseOut);
        } else {
            sourceChangeList.style.display = 'none';
        }
    };

    self.createDownload = () => {
        const downloadOption = document.getElementById(this.videoPlayerId + '_fluid_control_download');
        if (self.displayOptions.layoutControls.allowDownload) {
            let downloadClick = document.createElement('a');
            downloadClick.id = this.videoPlayerId + '_download';
            downloadClick.onclick = function (e) {
                const linkItem = this;

                if (typeof e.stopImmediatePropagation !== 'undefined') {
                    e.stopImmediatePropagation();
                }

                setInterval(function () {
                    linkItem.download = '';
                    linkItem.href = '';
                }, 100);
            };

            downloadOption.appendChild(downloadClick);

            downloadOption.addEventListener('click', function () {
                const downloadItem = document.getElementById(self.videoPlayerId + '_download');
                downloadItem.download = self.originalSrc;
                downloadItem.href = self.originalSrc;
                downloadClick.click();
            });
        } else {
            downloadOption.style.display = 'none';
        }
    };

    self.theatreToggle = () => {
        if (this.isInIframe) {
            return;
        }

        // Theatre and fullscreen, it's only one or the other
        if (this.fullscreenMode) {
            this.fullscreenToggle();
        }

        // Advanced Theatre mode if specified
        if (this.displayOptions.layoutControls.theatreAdvanced) {
            const elementForTheatre = document.getElementById(this.displayOptions.layoutControls.theatreAdvanced.theatreElement);
            const theatreClassToApply = this.displayOptions.layoutControls.theatreAdvanced.classToApply;
            if (elementForTheatre != null && theatreClassToApply != null) {
                if (!this.theatreMode) {
                    elementForTheatre.classList.add(theatreClassToApply);
                } else {
                    elementForTheatre.classList.remove(theatreClassToApply);
                }
                this.theatreModeAdvanced = !this.theatreModeAdvanced;
            } else {
                console.log('[FP_ERROR] Theatre mode elements could not be found, defaulting behaviour.');
                // Default overlay behaviour
                this.defaultTheatre();
            }
        } else {
            // Default overlay behaviour
            this.defaultTheatre();
        }

        // Set correct variables
        this.theatreMode = !this.theatreMode;
        this.fluidStorage.fluidTheatre = this.theatreMode;

        // Trigger theatre event
        const videoPlayer = self.domRef.player;
        const theatreEvent = (this.theatreMode) ? 'theatreModeOn' : 'theatreModeOff';
        const event = document.createEvent('CustomEvent');
        event.initEvent(theatreEvent, false, true);
        videoPlayer.dispatchEvent(event);

        this.resizeVpaidAuto();
    };

    self.defaultTheatre = () => {
        const videoWrapper = document.getElementById('fluid_video_wrapper_' + this.videoPlayerId);

        if (!this.theatreMode) {
            videoWrapper.classList.add('fluid_theatre_mode');
            const workingWidth = this.displayOptions.layoutControls.theatreSettings.width;
            let defaultHorizontalMargin = '10px';
            videoWrapper.style.width = workingWidth;
            videoWrapper.style.height = this.displayOptions.layoutControls.theatreSettings.height;
            videoWrapper.style.maxHeight = screen.height + "px";
            videoWrapper.style.marginTop = this.displayOptions.layoutControls.theatreSettings.marginTop + 'px';
            switch (this.displayOptions.layoutControls.theatreSettings.horizontalAlign) {
                case 'center':
                    // We must calculate the margin differently based on whether they passed % or px
                    if (typeof (workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 1) == "%") {
                        defaultHorizontalMargin = ((100 - parseInt(workingWidth.substring(0, workingWidth.length - 1))) / 2) + "%"; // A margin of half the remaining space
                    } else if (typeof (workingWidth) == 'string' && workingWidth.substr(workingWidth.length - 2) == "px") {
                        defaultHorizontalMargin = (((screen.width - parseInt(workingWidth.substring(0, workingWidth.length - 2))) / screen.width) * 100 / 2) + "%"; // Half the (Remaining width / fullwidth)
                    } else {
                        console.log('[FP_ERROR] Theatre width specified invalid.');
                    }

                    videoWrapper.style.left = defaultHorizontalMargin;
                    break;
                case 'right':
                    videoWrapper.style.right = defaultHorizontalMargin;
                    break;
                case 'left':
                default:
                    videoWrapper.style.left = defaultHorizontalMargin;
                    break;
            }
        } else {
            videoWrapper.classList.remove('fluid_theatre_mode');
            videoWrapper.style.maxHeight = "";
            videoWrapper.style.marginTop = "";
            videoWrapper.style.left = "";
            videoWrapper.style.right = "";
            videoWrapper.style.position = "";
            if (!this.displayOptions.layoutControls.fillToContainer) {
                videoWrapper.style.width = this.originalWidth + 'px';
                videoWrapper.style.height = this.originalHeight + 'px';
            } else {
                videoWrapper.style.width = '100%';
                videoWrapper.style.height = '100%';
            }
        }
    };

    // Set the poster for the video, taken from custom params
    // Cannot use the standard video tag poster image as it can be removed by the persistent settings
    self.posterImage = () => {
        if (this.displayOptions.layoutControls.posterImage) {
            const containerDiv = document.createElement('div');
            containerDiv.id = this.videoPlayerId + '_fluid_pseudo_poster';
            containerDiv.className = 'fluid_pseudo_poster';

            if (['auto', 'contain', 'cover'].indexOf(this.displayOptions.layoutControls.posterImageSize) === -1) {
                console.log('[FP_ERROR] Not allowed value in posterImageSize');
                return;
            }

            containerDiv.style.background = "url('" + this.displayOptions.layoutControls.posterImage + "') center center / "
                + this.displayOptions.layoutControls.posterImageSize + " no-repeat black";
            self.domRef.player.parentNode.insertBefore(containerDiv, null);
        }
    };

    self.initialiseStreamers = () => {
        this.detachStreamers();
        switch (this.displayOptions.layoutControls.mediaType) {
            case 'application/dash+xml': // MPEG-DASH
                if (!this.dashScriptLoaded) { // First time trying adding in DASH streamer, get the script
                    this.dashScriptLoaded = true;
                    self.requestScript(fluidPlayerScriptLocation + self.dashJsScript, this.initialiseDash.bind(this));
                } else {
                    this.initialiseDash();
                }
                break;
            case 'application/x-mpegURL': // HLS
                if (!this.hlsScriptLoaded && !window.Hls) { // First time trying adding in DASH streamer, get the script
                    this.hlsScriptLoaded = true;
                    self.requestScript(fluidPlayerScriptLocation + self.hlsJsScript, this.initialiseHls.bind(this));
                } else {
                    this.initialiseHls();
                }
                break;
        }
    };

    self.initialiseDash = () => {
        if (typeof (window.MediaSource || window.WebKitMediaSource) === "function") {
            const playVideo = (!this.autoplayAfterAd) ? this.autoplayAfterAd : this.displayOptions.layoutControls.autoPlay; // If false we want to override the autoPlay, as it comes from postRoll
            const dashPlayer = dashjs.MediaPlayer().create();
            dashPlayer.updateSettings({'debug': {'logLevel': dashjs.Debug.LOG_LEVEL_NONE}}); // Remove default logging that clogs up the console
            dashPlayer.initialize(self.domRef.player, this.originalSrc, playVideo);
            this.dashPlayer = dashPlayer;
        } else {
            this.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/dash+xml)');
        }
    };

    self.initialiseHls = () => {
        if (Hls.isSupported()) {
            const hls = new Hls(this.displayOptions.hlsjsConfig);
            hls.attachMedia(self.domRef.player);
            hls.loadSource(this.originalSrc);
            this.hlsPlayer = hls;
            if (!this.firstPlayLaunched && this.displayOptions.layoutControls.autoPlay) {
                self.domRef.player.play();
            }
        } else {
            this.nextSource();
            console.log('[FP_ERROR] Media type not supported by this browser. (application/x-mpegURL)');
        }
    };

    self.detachStreamers = () => {
        if (this.dashPlayer) {
            this.dashPlayer.reset();
            this.dashPlayer = false;
        } else if (this.hlsPlayer) {
            this.hlsPlayer.detachMedia();
            this.hlsPlayer = false;
        }
    };

    // This is called when a media type is unsupported. we'll find the current source and try set the next source if it exists
    self.nextSource = () => {
        const sources = self.domRef.player.getElementsByTagName('source');

        if (sources.length) {
            for (let i = 0; i < sources.length - 1; i++) {
                if (sources[i].getAttribute('src') == this.originalSrc && sources[i + 1].getAttribute('src')) {
                    this.setVideoSource(sources[i + 1].getAttribute('src'));
                    return;
                }
            }
        }

        return null;
    };

    self.inIframe = () => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    };

    self.setPersistentSettings = () => {
        if (typeof (Storage) !== "undefined" && typeof (localStorage) !== "undefined") {
            this.fluidStorage = localStorage;

            if (typeof (this.fluidStorage.fluidVolume) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.volume) {
                this.setVolume(this.fluidStorage.fluidVolume);
                if (typeof (this.fluidStorage.fluidMute) !== "undefined" && this.fluidStorage.fluidMute == "true") {
                    this.muteToggle(this.videoPlayerId);
                }
            }

            if (typeof (this.fluidStorage.fluidQuality) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.quality) {
                const sourceOption = document.getElementById('source_' + this.videoPlayerId + '_' + this.fluidStorage.fluidQuality);
                const sourceChangeButton = document.getElementById(this.videoPlayerId + '_fluid_control_video_source');
                if (sourceOption) {
                    sourceOption.click();
                    sourceChangeButton.click();
                }
            }

            if (typeof (this.fluidStorage.fluidSpeed) !== "undefined" && this.displayOptions.layoutControls.persistentSettings.speed) {
                this.setPlaybackSpeed(this.fluidStorage.fluidSpeed);
            }

            if (typeof (this.fluidStorage.fluidTheatre) !== "undefined" && this.fluidStorage.fluidTheatre == "true" && this.displayOptions.layoutControls.persistentSettings.theatre) {
                this.theatreToggle();
            }
        }
    };

    self.init = (idVideoPlayer, options) => {
        const playerNode = document.getElementById(idVideoPlayer); // TODO: accept id OR element

        playerNode.setAttribute('playsinline', '');
        playerNode.setAttribute('webkit-playsinline', '');

        self.domRef.player = playerNode;
        self.vrROTATION_POSITION = 0.1;
        self.vrROTATION_SPEED = 80;
        self.vrMode = false;
        self.vrPanorama = null;
        self.vrViewer = null;
        self.vpaidTimer = null;
        self.vpaidAdUnit = null;
        self.vastOptions = null;
        self.videoPlayerId = idVideoPlayer;
        self.originalSrc = self.getCurrentSrc();
        self.isCurrentlyPlayingAd = false;
        self.recentWaiting = false;
        self.latestVolume = 1;
        self.currentVideoDuration = 0;
        self.firstPlayLaunched = false;
        self.suppressClickthrough = false;
        self.timelinePreviewData = [];
        self.mainVideoCurrentTime = 0;
        self.mainVideoDuration = 0;
        self.isTimer = false;
        self.timer = null;
        self.timerPool = {};
        self.adList = {};
        self.adPool = {};
        self.adGroupedByRolls = {};
        self.onPauseRollAdPods = [];
        self.currentOnPauseRollAd = '';
        self.preRollAdsResolved = false;
        self.preRollAdPods = [];
        self.preRollAdPodsLength = 0;
        self.preRollVastResolved = 0;
        self.temporaryAdPods = [];
        self.availableRolls = ['preRoll', 'midRoll', 'postRoll', 'onPauseRoll'];
        self.supportedNonLinearAd = ['300x250', '468x60', '728x90'];
        self.autoplayAfterAd = true;
        self.nonLinearDuration = 15;
        self.supportedStaticTypes = ['image/gif', 'image/jpeg', 'image/png'];
        self.inactivityTimeout = null;
        self.isUserActive = null;
        self.nonLinearVerticalAlign = 'bottom';
        self.vpaidNonLinearCloseButton = true;
        self.showTimeOnHover = true;
        self.initialAnimationSet = true;
        self.theatreMode = false;
        self.theatreModeAdvanced = false;
        self.fullscreenMode = false;
        self.originalWidth = playerNode.offsetWidth;
        self.originalHeight = playerNode.offsetHeight;
        self.dashPlayer = false;
        self.hlsPlayer = false;
        self.dashScriptLoaded = false;
        self.hlsScriptLoaded = false;
        self.isPlayingMedia = false;
        self.isSwitchingSource = false;
        self.isLoading = false;
        self.isInIframe = self.inIframe();
        self.mainVideoReadyState = false;
        self.xmlCollection = [];
        self.inLineFound = null;
        self.fluidStorage = {};
        self.fluidPseudoPause = false;
        self.mobileInfo = self.getMobileOs();
        self.events = {};

        //Default options
        self.displayOptions = {
            layoutControls: {
                mediaType: self.getCurrentSrcType(),
                primaryColor: false,
                posterImage: false,
                posterImageSize: 'contain',
                adProgressColor: '#f9d300',
                playButtonShowing: true,
                playPauseAnimation: true,
                closeButtonCaption: 'Close', // Remove?
                fillToContainer: false,
                autoPlay: false,
                preload: 'auto',
                mute: false,
                loop: null,
                keyboardControl: true,
                allowDownload: false,
                playbackRateEnabled: false,
                subtitlesEnabled: false,
                showCardBoardView: false,
                showCardBoardJoystick: false,
                allowTheatre: true,
                doubleclickFullscreen: true,
                theatreSettings: {
                    width: '100%',
                    height: '60%',
                    marginTop: 0,
                    horizontalAlign: 'center',
                    keepPosition: false
                },
                theatreAdvanced: false,
                title: null,
                logo: {
                    imageUrl: null,
                    position: 'top left',
                    clickUrl: null,
                    opacity: 1,
                    mouseOverImageUrl: null,
                    imageMargin: '2px',
                    hideWithControls: false,
                    showOverAds: false
                },
                controlBar: {
                    autoHide: false,
                    autoHideTimeout: 3,
                    animated: true
                },
                timelinePreview: {
                    spriteImage: false,
                    spriteRelativePath: false
                },
                htmlOnPauseBlock: {
                    html: null,
                    height: null,
                    width: null
                },
                layout: 'default', //options: 'default', '<custom>'
                playerInitCallback: (function () {
                }),
                persistentSettings: {
                    volume: true,
                    quality: true,
                    speed: true,
                    theatre: true
                }
            },
            vastOptions: {
                adList: {},
                skipButtonCaption: 'Skip ad in [seconds]',
                skipButtonClickCaption: 'Skip Ad <span class="skip_button_icon"></span>',
                adText: null,
                adTextPosition: 'top left',
                adCTAText: 'Visit now!',
                adCTATextPosition: 'bottom right',
                adClickable: true,
                vastTimeout: 5000,
                showProgressbarMarkers: false,
                allowVPAID: false,
                showPlayButton: false,
                maxAllowedVastTagRedirects: 3,
                vpaidTimeout: 3000,

                vastAdvanced: {
                    vastLoadedCallback: (function () {
                    }),
                    noVastVideoCallback: (function () {
                    }),
                    vastVideoSkippedCallback: (function () {
                    }),
                    vastVideoEndedCallback: (function () {
                    })
                }
            },
            hlsjsConfig: {
                p2pConfig: {
                    logLevel: false,
                },
                enableWebVTT: false,
                enableCEA708Captions: false,
            },
            captions: {
                play: 'Play',
                pause: 'Pause',
                mute: 'Mute',
                unmute: 'Unmute',
                fullscreen: 'Fullscreen',
                subtitles: 'Subtitles',
                exitFullscreen: 'Exit Fullscreen',
            },
            debug: false
        };

        // Overriding the default options
        for (let key in options) {
            if (!options.hasOwnProperty(key)) {
                continue;
            }
            if (typeof options[key] == "object") {
                for (let subKey in options[key]) {
                    if (!options[key].hasOwnProperty(subKey)) {
                        continue;
                    }
                    self.displayOptions[key][subKey] = options[key][subKey];
                }
            } else {
                self.displayOptions[key] = options[key];
            }
        }

        self.setupPlayerWrapper();
        self.initialiseStreamers();

        playerNode.addEventListener('webkitfullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('fullscreenchange', self.recalculateAdDimensions);
        playerNode.addEventListener('waiting', self.onRecentWaiting);
        playerNode.addEventListener('pause', self.onFluidPlayerPause);
        playerNode.addEventListener('loadedmetadata', self.mainVideoReady);
        playerNode.addEventListener('error', self.onErrorDetection);
        playerNode.addEventListener('ended', self.onMainVideoEnded);
        playerNode.addEventListener('durationchange', () => {
            self.currentVideoDuration = self.getCurrentVideoDuration();
        });

        if (self.displayOptions.layoutControls.showCardBoardView) {
            // This fixes cross origin errors on three.js
            playerNode.setAttribute('crossOrigin', 'anonymous');
        }

        //Manually load the video duration if the video was loaded before adding the event listener
        self.currentVideoDuration = self.getCurrentVideoDuration();

        if (isNaN(self.currentVideoDuration)) {
            self.currentVideoDuration = 0;
        }

        self.setLayout();

        //Set the volume control state
        self.latestVolume = playerNode.volume;

        // Set the default animation setting
        self.initialAnimationSet = self.displayOptions.layoutControls.playPauseAnimation;

        //Set the custom fullscreen behaviour
        self.handleFullscreen();

        self.initLogo();

        self.initTitle();

        self.initMute();

        self.initLoop();

        self.displayOptions.layoutControls.playerInitCallback();

        self.createVideoSourceSwitch();

        self.createSubtitles();

        self.createCardboard();

        self.userActivityChecker();

        self.setVastList();

        self.setPersistentSettings();

        const _play_videoPlayer = playerNode.play;
        playerNode.play = function () {
            let promise = null;

            if (self.displayOptions.layoutControls.showCardBoardView) {
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(function (response) {
                            if (response === 'granted') {
                                self.debugMessage('DeviceOrientationEvent permission granted!');
                            }
                        })
                        .catch(console.error);
                }
            }

            try {
                promise = _play_videoPlayer.apply(this, arguments);

                if (promise !== undefined && promise !== null) {
                    promise.then(function () {
                        self.isPlayingMedia = true;
                        clearTimeout(self.promiseTimeout);
                    }).catch(function (error) {
                        const isAbortError = (typeof error.name !== 'undefined' && error.name === 'AbortError');
                        // Ignore abort errors which caused for example Safari or autoplay functions
                        // (example: interrupted by a new load request)
                        if (isAbortError) {
                            // Ignore AbortError error reporting
                        } else {
                            self.announceLocalError(202, 'Failed to play video.');
                        }
                        clearTimeout(self.promiseTimeout);

                    });

                    self.promiseTimeout = setTimeout(function () {
                        if (self.isPlayingMedia === false) {
                            self.announceLocalError(204, 'Timeout error. Failed to play video.');
                        }
                    }, 5000);

                }

            } catch (error) {
                self.announceLocalError(201, 'Failed to play video.');
            }
        };

        const videoPauseOriginal = playerNode.pause;
        playerNode.pause = function () {
            if (self.isPlayingMedia === true) {
                self.isPlayingMedia = false;
                return videoPauseOriginal.apply(this, arguments);
            }

            // just in case
            if (self.isCurrentlyPlayingVideo(self.domRef.player)) {
                try {
                    self.isPlayingMedia = false;
                    return videoPauseOriginal.apply(this, arguments);
                } catch (e) {
                    self.announceLocalError(203, 'Failed to play video.');
                }
            }
        };

        if (self.displayOptions.layoutControls.autoPlay && !self.dashScriptLoaded && !self.hlsScriptLoaded) {
            //There is known issue with Safari 11+, will prevent autoPlay, so we wont try
            const browserVersion = self.getBrowserVersion();

            if ('Safari' === browserVersion.browserName && 11 <= browserVersion.majorVersion) {
                return;
            }

            playerNode.play();
        }

        const videoWrapper = document.getElementById('fluid_video_wrapper_' + playerNode.id);

        if (!self.mobileInfo.userOs) {
            videoWrapper.addEventListener('mouseleave', self.handleMouseleave, false);
            videoWrapper.addEventListener('mouseenter', self.showControlBar, false);
            videoWrapper.addEventListener('mouseenter', self.showTitle, false);
        } else {
            //On mobile mouseleave behavior does not make sense, so it's better to keep controls, once the playback starts
            //Autohide behavior on timer is a separate functionality
            self.hideControlBar.call(videoWrapper);
            videoWrapper.addEventListener('touchstart', self.showControlBar, false);
        }

        //Keyboard Controls
        if (self.displayOptions.layoutControls.keyboardControl) {
            self.keyboardControl();
        }

        if (self.displayOptions.layoutControls.controlBar.autoHide) {
            self.linkControlBarUserActivity();
        }

        // TODO: what is this supposed to do?
        // disable showing the captions, if user added subtitles track
        // we are taking subtitles track kind as metadata
        try {
            if (!!self.domRef.player.textTracks) {
                for (const textTrack of self.domRef.player.textTracks) {
                    textTrack.mode = 'hidden';
                }
            }
        } catch (_ignored) {
        }
    };

    // "API" Functions
    self.play = () => {
        const videoPlayer = self.domRef.player;
        if (videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    };

    self.pause = () => {
        const videoPlayer = self.domRef.player;
        if (!videoPlayer.paused) {
            this.playPauseToggle(videoPlayer);
        }
        return true;
    };

    self.skipTo = (time) => {
        const videoPlayer = self.domRef.player;
        videoPlayer.currentTime = time;
    };

    self.setPlaybackSpeed = (speed) => {
        if (!this.isCurrentlyPlayingAd) {
            const videoPlayer = self.domRef.player;
            videoPlayer.playbackRate = speed;
            this.fluidStorage.fluidSpeed = speed;
        }
    };

    self.setVolume = (passedVolume) => {
        const videoPlayer = self.domRef.player;
        videoPlayer.volume = passedVolume;
        this.latestVolume = passedVolume;
        this.fluidStorage.fluidVolume = passedVolume;
    };

    self.isCurrentlyPlayingVideo = (instance) => {
        return instance && instance.currentTime > 0 && !instance.paused && !instance.ended && instance.readyState > 2;
    };

    self.setHtmlOnPauseBlock = (passedHtml) => {
        if (typeof passedHtml != 'object' || typeof passedHtml.html == 'undefined') {
            return false;
        }

        const htmlBlock = document.getElementById(this.videoPlayerId + "_fluid_html_on_pause");

        // We create the HTML block from scratch if it doesn't already exist
        if (!htmlBlock) {
            const videoPlayer = document.getElementById(player.videoPlayerId);
            const containerDiv = document.createElement('div');
            containerDiv.id = player.videoPlayerId + '_fluid_html_on_pause';
            containerDiv.className = 'fluid_html_on_pause';
            containerDiv.style.display = 'none';
            containerDiv.innerHTML = passedHtml.html;
            containerDiv.onclick = function () {
                player.playPauseToggle(videoPlayer);
            };

            if (passedHtml.width) {
                containerDiv.style.width = passedHtml.width + 'px';
            }

            if (passedHtml.height) {
                containerDiv.style.height = passedHtml.height + 'px';
            }

            videoPlayer.parentNode.insertBefore(containerDiv, null);
        } else {
            htmlBlock.innerHTML = passedHtml.html;

            if (passedHtml.width) {
                htmlBlock.style.width = passedHtml.width + 'px';
            }

            if (passedHtml.height) {
                htmlBlock.style.height = passedHtml.height + 'px';
            }
        }
    };

    self.toggleControlBar = (show) => {
        const controlBar = document.getElementById(this.videoPlayerId + "_fluid_controls_container");

        if (show) {
            controlBar.className += " initial_controls_show";
        } else {
            controlBar.className = controlBar.className.replace(" initial_controls_show", "");
        }
    };

    self.toggleFullscreen = (fullscreen) => {
        if (this.fullscreenMode != fullscreen) {

            // If we're turning fullscreen on and we're in theatre mode, remove theatre
            if (fullscreen && this.theatreMode) {
                this.theatreToggle();
            }

            this.fullscreenToggle();
        }
    };

    self.on = (eventCall, functionCall) => {
        const videoPlayer = self.domRef.player;
        switch (eventCall) {
            case 'play':
                videoPlayer.onplay = functionCall;
                break;
            case 'seeked':
                videoPlayer.onseeked = functionCall;
                break;
            case 'ended':
                videoPlayer.onended = functionCall;
                break;
            case 'pause':
                videoPlayer.addEventListener('pause', function () {
                    if (!self.fluidPseudoPause) {
                        functionCall();
                    }
                });
                break;
            case 'playing':
                videoPlayer.addEventListener('playing', function () {
                    functionCall();
                });
                break;
            case 'theatreModeOn':
                videoPlayer.addEventListener('theatreModeOn', function () {
                    functionCall();
                });
                break;
            case 'theatreModeOff':
                videoPlayer.addEventListener('theatreModeOff', function () {
                    functionCall();
                });
                break;
            default:
                console.log('[FP_ERROR] Event not recognised');
                break;
        }
    };

    self.toggleLogo = (logo) => {
        if (typeof logo != 'object' || !logo.imageUrl) {
            return false;
        }
        const logoBlock = document.getElementById(this.videoPlayerId + "_logo");

        // We create the logo from scratch if it doesn't already exist, they might not give everything correctly so we
        this.displayOptions.layoutControls.logo.imageUrl = (logo.imageUrl) ? logo.imageUrl : null;
        this.displayOptions.layoutControls.logo.position = (logo.position) ? logo.position : 'top left';
        this.displayOptions.layoutControls.logo.clickUrl = (logo.clickUrl) ? logo.clickUrl : null;
        this.displayOptions.layoutControls.logo.opacity = (logo.opacity) ? logo.opacity : 1;
        this.displayOptions.layoutControls.logo.mouseOverImageUrl = (logo.mouseOverImageUrl) ? logo.mouseOverImageUrl : null;
        this.displayOptions.layoutControls.logo.imageMargin = (logo.imageMargin) ? logo.imageMargin : '2px';
        this.displayOptions.layoutControls.logo.hideWithControls = (logo.hideWithControls) ? logo.hideWithControls : false;
        this.displayOptions.layoutControls.logo.showOverAds = (logo.showOverAds) ? logo.showOverAds : false;

        if (logoBlock) {
            logoBlock.remove();
        }

        this.initLogo();
    };

    // this functions helps in adding event listeners for future dynamic elements
    //trackEvent(document, "click", ".some_elem", callBackFunction);
    self.trackEvent = (el, evt, sel, handler) => {
        if (typeof self.events[sel] === 'undefined') {
            self.events[sel] = {};
        }
        if (typeof self.events[sel][evt] === 'undefined') {
            self.events[sel][evt] = [];
        }
        self.events[sel][evt].push(handler);

        self.registerListener(el, evt, sel, handler);
    };

    self.registerListener = (el, evt, sel, handler) => {
        const currentElements = el.querySelectorAll(sel);
        for (let i = 0; i < currentElements.length; i++) {
            currentElements[i].addEventListener(evt, handler);
        }
    };

    self.copyEvents = (topLevelEl) => {
        for (let sel in self.events) {
            if (!self.events.hasOwnProperty(sel)) {
                continue;
            }

            for (let evt in self.events[sel]) {
                if (!self.events[sel].hasOwnProperty(evt)) {
                    continue;
                }

                for (let i = 0; i < self.events[sel][evt].length; i++) {
                    self.registerListener(topLevelEl, evt, sel, self.events[sel][evt][i]);
                }
            }
        }
    };

    self.destroy = () => {
        const numDestructors = this.destructors.length;

        if (0 === numDestructors) {
            return;
        }

        for (let i = 0; i < numDestructors; ++i) {
            this.destructors[i].bind(this)();
        }

        const container = document.getElementById('fluid_video_wrapper_' + player.videoPlayerId);

        if (!container) {
            console.warn('Unable to remove wrapper element for Fluid Player instance - element not found ' + player.videoPlayerId);
            return;
        }

        if ('function' === typeof container.remove) {
            container.remove();
            return;
        }

        if (container.parentNode) {
            container.parentNode.removeChild(container);
            return;
        }

        console.error('Unable to remove wrapper element for Fluid Player instance - no parent' + player.videoPlayerId);
    }
};

if (window && !window.fluidPlayer) {
    window.fluidPlayer = fluidPlayer;
}

export default fluidPlayer;
