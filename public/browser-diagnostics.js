/*! Based on CreepJS (MIT), Copyright (c) 2021 abrahamjuliot. License: /browser-diagnostics.LICENSE.txt */
(function () {
	'use strict';

	var PlatformClassifier;
	(function (PlatformClassifier) {
	    PlatformClassifier["WINDOWS"] = "Windows";
	    PlatformClassifier["LINUX"] = "Linux";
	    PlatformClassifier["APPLE"] = "Apple";
	    PlatformClassifier["OTHER"] = "Other";
	})(PlatformClassifier || (PlatformClassifier = {}));

	// @ts-expect-error
	const IS_WORKER_SCOPE = !self.document && self.WorkerGlobalScope;
	// Detect Browser
	function getEngine() {
	    const x = [].constructor;
	    try {
	        (-1).toFixed(-1);
	    }
	    catch (err) {
	        return err.message.length + (x + '').split(x.name).join('').length;
	    }
	}
	const ENGINE_IDENTIFIER = getEngine();
	const IS_BLINK = ENGINE_IDENTIFIER == 80;
	const IS_GECKO = ENGINE_IDENTIFIER == 58;
	const IS_WEBKIT = ENGINE_IDENTIFIER == 77;
	const LIKE_BRAVE = IS_BLINK && 'flat' in Array.prototype /* Chrome 69 */ && !('ReportingObserver' in self /* Brave */);
	function braveBrowser() {
	    const brave = ('brave' in navigator &&
	        // @ts-ignore
	        Object.getPrototypeOf(navigator.brave).constructor.name == 'Brave' &&
	        // @ts-ignore
	        navigator.brave.isBrave.toString() == 'function isBrave() { [native code] }');
	    return brave;
	}
	// system
	const getOS = (userAgent) => {
	    const os = (
	    // order is important
	    /windows phone/ig.test(userAgent) ? 'Windows Phone' :
	        /win(dows|16|32|64|95|98|nt)|wow64/ig.test(userAgent) ? 'Windows' :
	            /android/ig.test(userAgent) ? 'Android' :
	                /cros/ig.test(userAgent) ? 'Chrome OS' :
	                    /linux/ig.test(userAgent) ? 'Linux' :
	                        /ipad/ig.test(userAgent) ? 'iPad' :
	                            /iphone/ig.test(userAgent) ? 'iPhone' :
	                                /ipod/ig.test(userAgent) ? 'iPod' :
	                                    /ios/ig.test(userAgent) ? 'iOS' :
	                                        /mac/ig.test(userAgent) ? 'Mac' :
	                                            'Other');
	    return os;
	};
	function getReportedPlatform(userAgent, platform) {
	    // user agent os lie
	    const userAgentOS = (
	    // order is important
	    /win(dows|16|32|64|95|98|nt)|wow64/ig.test(userAgent) ? PlatformClassifier.WINDOWS :
	        /android|linux|cros/ig.test(userAgent) ? PlatformClassifier.LINUX :
	            /(i(os|p(ad|hone|od)))|mac/ig.test(userAgent) ? PlatformClassifier.APPLE :
	                PlatformClassifier.OTHER);
	    if (!platform)
	        return [userAgentOS];
	    const platformOS = (
	    // order is important
	    /win/ig.test(platform) ? PlatformClassifier.WINDOWS :
	        /android|arm|linux/ig.test(platform) ? PlatformClassifier.LINUX :
	            /(i(os|p(ad|hone|od)))|mac/ig.test(platform) ? PlatformClassifier.APPLE :
	                PlatformClassifier.OTHER);
	    return [userAgentOS, platformOS];
	}
	const { userAgent: navUserAgent, platform: navPlatform } = self.navigator || {};
	const [USER_AGENT_OS, PLATFORM_OS] = getReportedPlatform(navUserAgent, navPlatform);
	const decryptUserAgent = ({ ua, os, isBrave }) => {
	    const apple = /ipad|iphone|ipod|ios|mac/ig.test(os);
	    const isOpera = /OPR\//g.test(ua);
	    const isVivaldi = /Vivaldi/g.test(ua);
	    const isDuckDuckGo = /DuckDuckGo/g.test(ua);
	    const isYandex = /YaBrowser/g.test(ua);
	    const paleMoon = ua.match(/(palemoon)\/(\d+)./i);
	    const edge = ua.match(/(edgios|edg|edge|edga)\/(\d+)./i);
	    const edgios = edge && /edgios/i.test(edge[1]);
	    const chromium = ua.match(/(crios|chrome)\/(\d+)./i);
	    const firefox = ua.match(/(fxios|firefox)\/(\d+)./i);
	    const likeSafari = (/AppleWebKit/g.test(ua) &&
	        /Safari/g.test(ua));
	    const safari = (likeSafari &&
	        !firefox &&
	        !chromium &&
	        !edge &&
	        ua.match(/(version)\/(\d+)\.(\d|\.)+\s(mobile|safari)/i));
	    if (chromium) {
	        const browser = chromium[1];
	        const version = chromium[2];
	        const like = (isOpera ? ' Opera' :
	            isVivaldi ? ' Vivaldi' :
	                isDuckDuckGo ? ' DuckDuckGo' :
	                    isYandex ? ' Yandex' :
	                        edge ? ' Edge' :
	                            isBrave ? ' Brave' : '');
	        return `${browser} ${version}${like}`;
	    }
	    else if (edgios) {
	        const browser = edge[1];
	        const version = edge[2];
	        return `${browser} ${version}`;
	    }
	    else if (firefox) {
	        const browser = paleMoon ? paleMoon[1] : firefox[1];
	        const version = paleMoon ? paleMoon[2] : firefox[2];
	        return `${browser} ${version}`;
	    }
	    else if (apple && safari) {
	        const browser = 'Safari';
	        const version = safari[2];
	        return `${browser} ${version}`;
	    }
	    return 'unknown';
	};
	const getUserAgentPlatform = ({ userAgent, excludeBuild = true }) => {
	    if (!userAgent) {
	        return 'unknown';
	    }
	    // patterns
	    const nonPlatformParenthesis = /\((khtml|unlike|vizio|like gec|internal dummy|org\.eclipse|openssl|ipv6|via translate|safari|cardamon).+|xt\d+\)/ig;
	    const parenthesis = /\((.+)\)/;
	    const android = /((android).+)/i;
	    const androidNoise = /^(linux|[a-z]|wv|mobile|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|windows|(rv:|trident|webview|iemobile).+/i;
	    const androidBuild = /build\/.+\s|\sbuild\/.+/i;
	    const androidRelease = /android( |-)\d+/i;
	    const windows = /((windows).+)/i;
	    const windowsNoise = /^(windows|ms(-|)office|microsoft|compatible|[a-z]|x64|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|outlook|ms(-|)office|microsoft|trident|\.net|msie|httrack|media center|infopath|aol|opera|iemobile|webbrowser).+/i;
	    const windows64bitCPU = /w(ow|in)64/i;
	    const cros = /cros/i;
	    const crosNoise = /^([a-z]|x11|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|trident).+/i;
	    const crosBuild = /\d+\.\d+\.\d+/i;
	    const linux = /linux|x11|ubuntu|debian/i;
	    const linuxNoise = /^([a-z]|x11|unknown|compatible|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|java|oracle|\+http|http|unknown|mozilla|konqueror|valve).+/i;
	    const apple = /(cpu iphone|cpu os|iphone os|mac os|macos|intel os|ppc mac).+/i;
	    const appleNoise = /^([a-z]|macintosh|compatible|mimic|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2}|rv|\d+\.\d+)$|(rv:|silk|valve).+/i;
	    const appleRelease = /(ppc |intel |)(mac|mac |)os (x |x|)(\d{2}(_|\.)\d{1,2}|\d{2,})/i;
	    const otherOS = /((symbianos|nokia|blackberry|morphos|mac).+)|\/linux|freebsd|symbos|series \d+|win\d+|unix|hp-ux|bsdi|bsd|x86_64/i;
	    const isDevice = (list, device) => list.filter((x) => device.test(x)).length;
	    userAgent = userAgent.trim().replace(/\s{2,}/, ' ').replace(nonPlatformParenthesis, '');
	    if (parenthesis.test(userAgent)) {
	        const platformSection = userAgent.match(parenthesis)[0];
	        const identifiers = platformSection.slice(1, -1).replace(/,/g, ';').split(';').map((x) => x.trim());
	        if (isDevice(identifiers, android)) {
	            return identifiers
	                // @ts-ignore
	                .map((x) => androidRelease.test(x) ? androidRelease.exec(x)[0].replace('-', ' ') : x)
	                .filter((x) => !(androidNoise.test(x)))
	                .join(' ')
	                .replace((excludeBuild ? androidBuild : ''), '')
	                .trim().replace(/\s{2,}/, ' ');
	        }
	        else if (isDevice(identifiers, windows)) {
	            return identifiers
	                .filter((x) => !(windowsNoise.test(x)))
	                .join(' ')
	                .replace(/\sNT (\d+\.\d+)/, (match, version) => {
	                return (version == '10.0' ? ' 10' :
	                    version == '6.3' ? ' 8.1' :
	                        version == '6.2' ? ' 8' :
	                            version == '6.1' ? ' 7' :
	                                version == '6.0' ? ' Vista' :
	                                    version == '5.2' ? ' XP Pro' :
	                                        version == '5.1' ? ' XP' :
	                                            version == '5.0' ? ' 2000' :
	                                                version == '4.0' ? match :
	                                                    ' ' + version);
	            })
	                .replace(windows64bitCPU, '(64-bit)')
	                .trim().replace(/\s{2,}/, ' ');
	        }
	        else if (isDevice(identifiers, cros)) {
	            return identifiers
	                .filter((x) => !(crosNoise.test(x)))
	                .join(' ')
	                .replace((excludeBuild ? crosBuild : ''), '')
	                .trim().replace(/\s{2,}/, ' ');
	        }
	        else if (isDevice(identifiers, linux)) {
	            return identifiers
	                .filter((x) => !(linuxNoise.test(x)))
	                .join(' ')
	                .trim().replace(/\s{2,}/, ' ');
	        }
	        else if (isDevice(identifiers, apple)) {
	            return identifiers
	                .map((x) => {
	                if (appleRelease.test(x)) {
	                    // @ts-ignore
	                    const release = appleRelease.exec(x)[0];
	                    const versionMap = {
	                        '10_7': 'Lion',
	                        '10_8': 'Mountain Lion',
	                        '10_9': 'Mavericks',
	                        '10_10': 'Yosemite',
	                        '10_11': 'El Capitan',
	                        '10_12': 'Sierra',
	                        '10_13': 'High Sierra',
	                        '10_14': 'Mojave',
	                        '10_15': 'Catalina',
	                        '11': 'Big Sur',
	                        '12': 'Monterey',
	                        '13': 'Ventura',
	                    };
	                    const version = ((/(\d{2}(_|\.)\d{1,2}|\d{2,})/.exec(release) || [])[0] ||
	                        '').replace(/\./g, '_');
	                    const isOSX = /^10/.test(version);
	                    const id = isOSX ? version : (/^\d{2,}/.exec(version) || [])[0];
	                    const codeName = versionMap[id];
	                    return codeName ? `macOS ${codeName}` : release;
	                }
	                return x;
	            })
	                .filter((x) => !(appleNoise.test(x)))
	                .join(' ')
	                .replace(/\slike mac.+/ig, '')
	                .trim().replace(/\s{2,}/, ' ');
	        }
	        else {
	            const other = identifiers.filter((x) => otherOS.test(x));
	            if (other.length) {
	                return other.join(' ').trim().replace(/\s{2,}/, ' ');
	            }
	            return identifiers.join(' ');
	        }
	    }
	    else {
	        return 'unknown';
	    }
	};
	// attempt restore from User-Agent Reduction
	const isUAPostReduction = (userAgent) => {
	    const matcher = /Mozilla\/5\.0 \((Macintosh; Intel Mac OS X 10_15_7|Windows NT 10\.0; Win64; x64|(X11; (CrOS|Linux) x86_64)|(Linux; Android 10(; K|)))\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/\d+\.0\.0\.0( Mobile|) Safari\/537\.36/;
	    const unifiedPlatform = (matcher.exec(userAgent) || [])[1];
	    return IS_BLINK && !!unifiedPlatform;
	};
	const createPerformanceLogger = () => {
	    const log = {};
	    let total = 0;
	    return {
	        logTestResult: ({ test, passed, time = 0 }) => {
	            total += time;
	            const timeString = `${time.toFixed(2)}ms`;
	            log[test] = timeString;
	            const color = passed ? '#4cca9f' : 'lightcoral';
	            const result = passed ? 'passed' : 'failed';
	            const symbol = passed ? '✔' : '-';
	            return console.log(`%c${symbol}${time ? ` (${timeString})` : ''} ${test} ${result}`, `color:${color}`);
	        },
	        getLog: () => log,
	        getTotal: () => total,
	    };
	};
	const performanceLogger = createPerformanceLogger();
	const { logTestResult } = performanceLogger;
	const createTimer = () => {
	    let start = 0;
	    const log = [];
	    return {
	        stop: () => {
	            if (start) {
	                log.push(performance.now() - start);
	                return log.reduce((acc, n) => acc += n, 0);
	            }
	            return start;
	        },
	        start: () => {
	            start = performance.now();
	            return start;
	        },
	    };
	};
	const queueEvent = (timer, delay = 0) => {
	    timer.stop();
	    return new Promise((resolve) => setTimeout(() => resolve(timer.start()), delay))
	        .catch((e) => { });
	};
	const EMOJIS = [
	    [128512], [9786], [129333, 8205, 9794, 65039], [9832], [9784], [9895], [8265], [8505], [127987, 65039, 8205, 9895, 65039], [129394], [9785], [9760], [129489, 8205, 129456], [129487, 8205, 9794, 65039], [9975], [129489, 8205, 129309, 8205, 129489], [9752], [9968], [9961], [9972], [9992], [9201], [9928], [9730], [9969], [9731], [9732], [9976], [9823], [9937], [9000], [9993], [9999],
	    [128105, 8205, 10084, 65039, 8205, 128139, 8205, 128104],
	    [128104, 8205, 128105, 8205, 128103, 8205, 128102],
	    [128104, 8205, 128105, 8205, 128102],
	    // android 11
	    [128512],
	    [169], [174], [8482],
	    [128065, 65039, 8205, 128488, 65039],
	    // other
	    [10002], [9986], [9935], [9874], [9876], [9881], [9939], [9879], [9904], [9905], [9888], [9762], [9763], [11014], [8599], [10145], [11013], [9883], [10017], [10013], [9766], [9654], [9197], [9199], [9167], [9792], [9794], [10006], [12336], [9877], [9884], [10004], [10035], [10055], [9724], [9642], [10083], [10084], [9996], [9757], [9997], [10052], [9878], [8618], [9775], [9770], [9774], [9745], [10036], [127344], [127359],
	].map((emojiCode) => String.fromCodePoint(...emojiCode));
	const CSS_FONT_FAMILY = `
	'Segoe Fluent Icons',
	'Ink Free',
	'Bahnschrift',
	'Segoe MDL2 Assets',
	'HoloLens MDL2 Assets',
	'Leelawadee UI',
	'Javanese Text',
	'Segoe UI Emoji',
	'Aldhabi',
	'Gadugi',
	'Myanmar Text',
	'Nirmala UI',
	'Lucida Console',
	'Cambria Math',
	'Bai Jamjuree',
	'Chakra Petch',
	'Charmonman',
	'Fahkwang',
	'K2D',
	'Kodchasan',
	'KoHo',
	'Sarabun',
	'Srisakdi',
	'Galvji',
	'MuktaMahee Regular',
	'InaiMathi Bold',
	'American Typewriter Semibold',
	'Futura Bold',
	'SignPainter-HouseScript Semibold',
	'PingFang HK Light',
	'Kohinoor Devanagari Medium',
	'Luminari',
	'Geneva',
	'Helvetica Neue',
	'Droid Sans Mono',
	'Dancing Script',
	'Roboto',
	'Ubuntu',
	'Liberation Mono',
	'Source Code Pro',
	'DejaVu Sans',
	'OpenSymbol',
	'Chilanka',
	'Cousine',
	'Arimo',
	'Jomolhari',
	'MONO',
	'Noto Color Emoji',
	sans-serif !important
`;
	function getGpuBrand(gpu) {
	    if (!gpu)
	        return null;
	    const gpuBrandMatcher = /(adreno|amd|apple|intel|llvm|mali|microsoft|nvidia|parallels|powervr|samsung|swiftshader|virtualbox|vmware)/i;
	    const brand = (/radeon/i.test(gpu) ? 'AMD' :
	        /geforce/i.test(gpu) ? 'NVIDIA' :
	            (gpuBrandMatcher.exec(gpu)?.[0] || 'other').toLocaleUpperCase());
	    return brand;
	}
	// collect fingerprints for analysis
	const Analysis = {};
	// use if needed to stable fingerprint
	const LowerEntropy = {
	    AUDIO: false,
	    CANVAS: false,
	    FONTS: false,
	    SCREEN: false,
	    TIME_ZONE: false,
	    WEBGL: false,
	};

	// template views
	function patch(oldEl, newEl, fn) {
	    if (!oldEl)
	        return null;
	    oldEl.parentNode?.replaceChild(newEl, oldEl);
	    return true;
	}
	function html(templateStr, ...expressionSet) {
	    const template = document.createElement('template');
	    template.innerHTML = templateStr.map((s, i) => `${s}${expressionSet[i] || ''}`).join('');
	    return document.importNode(template.content, true);
	}

	const createErrorsCaptured = () => {
	    const errors = [];
	    return {
	        getErrors: () => errors,
	        captureError: (error, customMessage = '') => {
	            const type = {
	                Error: true,
	                EvalError: true,
	                InternalError: true,
	                RangeError: true,
	                ReferenceError: true,
	                SyntaxError: true,
	                TypeError: true,
	                URIError: true,
	                InvalidStateError: true,
	                SecurityError: true,
	            };
	            const hasInnerSpace = (s) => /.+(\s).+/g.test(s); // ignore AOPR noise
	            console.error(error); // log error to educate
	            const { name, message } = error;
	            const trustedMessage = (!hasInnerSpace(message) ? undefined :
	                !customMessage ? message :
	                    `${message} [${customMessage}]`);
	            const trustedName = type[name] ? name : undefined;
	            errors.push({ trustedName, trustedMessage });
	            return undefined;
	        },
	    };
	};
	const errorsCaptured = createErrorsCaptured();
	const { captureError } = errorsCaptured;
	const attempt = (fn, customMessage = '') => {
	    try {
	        return fn();
	    }
	    catch (error) {
	        if (customMessage) {
	            return captureError(error, customMessage);
	        }
	        return captureError(error);
	    }
	};
	const caniuse = (fn, objChainList = [], args = [], method = false) => {
	    let api;
	    try {
	        api = fn();
	    }
	    catch (error) {
	        return undefined;
	    }
	    let i;
	    const len = objChainList.length;
	    let chain = api;
	    try {
	        for (i = 0; i < len; i++) {
	            const obj = objChainList[i];
	            chain = chain[obj];
	        }
	    }
	    catch (error) {
	        return undefined;
	    }
	    return (method && args.length ? chain.apply(api, args) :
	        method && !args.length ? chain.apply(api) :
	            chain);
	};
	const getCapturedErrors = () => ({ data: errorsCaptured.getErrors() });

	/* eslint-disable new-cap */
	/* eslint-disable no-unused-vars */
	// warm up while we detect lies
	try {
	    speechSynthesis.getVoices();
	}
	catch (err) { }
	// Collect lies detected
	function createLieRecords() {
	    const records = {};
	    return {
	        getRecords: () => records,
	        documentLie: (name, lie) => {
	            const isArray = lie instanceof Array;
	            if (records[name]) {
	                if (isArray) {
	                    return (records[name] = [...records[name], ...lie]);
	                }
	                return records[name].push(lie);
	            }
	            return isArray ? (records[name] = lie) : (records[name] = [lie]);
	        },
	    };
	}
	const lieRecords = createLieRecords();
	const { documentLie } = lieRecords;
	const GHOST = `
	height: 100vh;
	width: 100vw;
	position: absolute;
	left:-10000px;
	visibility: hidden;
`;
	function getRandomValues() {
	    return (String.fromCharCode(Math.random() * 26 + 97) +
	        Math.random().toString(36).slice(-7));
	}
	function getBehemothIframe(win) {
	    try {
	        if (!IS_BLINK)
	            return win;
	        const div = win.document.createElement('div');
	        div.setAttribute('id', getRandomValues());
	        div.setAttribute('style', GHOST);
	        div.innerHTML = `<div><iframe></iframe></div>`;
	        win.document.body.appendChild(div);
	        const iframe = [...[...div.childNodes][0].childNodes][0];
	        if (!iframe)
	            return null;
	        const { contentWindow } = iframe || {};
	        if (!contentWindow)
	            return null;
	        const div2 = contentWindow.document.createElement('div');
	        div2.innerHTML = `<div><iframe></iframe></div>`;
	        contentWindow.document.body.appendChild(div2);
	        const iframe2 = [...[...div2.childNodes][0].childNodes][0];
	        return iframe2.contentWindow;
	    }
	    catch (error) {
	        captureError(error, 'client blocked behemoth iframe');
	        return win;
	    }
	}
	const RAND = getRandomValues();
	const HAS_REFLECT = 'Reflect' in self;
	function isTypeError(err) {
	    return err.constructor.name == 'TypeError';
	}
	function failsTypeError({ spawnErr, withStack, final }) {
	    try {
	        spawnErr();
	        throw Error();
	    }
	    catch (err) {
	        if (!isTypeError(err))
	            return true;
	        return withStack ? withStack(err) : false;
	    }
	    finally {
	        final && final();
	    }
	}
	function failsWithError(fn) {
	    try {
	        fn();
	        return false;
	    }
	    catch (err) {
	        return true;
	    }
	}
	function hasKnownToString(name) {
	    return {
	        [`function ${name}() { [native code] }`]: true,
	        [`function get ${name}() { [native code] }`]: true,
	        [`function () { [native code] }`]: true,
	        [`function ${name}() {${'\n'}    [native code]${'\n'}}`]: true,
	        [`function get ${name}() {${'\n'}    [native code]${'\n'}}`]: true,
	        [`function () {${'\n'}    [native code]${'\n'}}`]: true,
	    };
	}
	function hasValidStack(err, reg, i = 1) {
	    if (i === 0)
	        return reg.test(err.message);
	    return reg.test(err.stack.split('\n')[i]);
	}
	const AT_FUNCTION = /at Function\.toString /;
	const AT_OBJECT = /at Object\.toString/;
	const FUNCTION_INSTANCE = /at (Function\.)?\[Symbol.hasInstance\]/; // useful if < Chrome 102
	const PROXY_INSTANCE = /at (Proxy\.)?\[Symbol.hasInstance\]/; // useful if < Chrome 102
	const STRICT_MODE = /strict mode/;
	function queryLies({ scope, apiFunction, proto, obj, lieProps, }) {
	    if (typeof apiFunction != 'function') {
	        return {
	            lied: 0,
	            lieTypes: [],
	        };
	    }
	    const name = apiFunction.name.replace(/get\s/, '');
	    const objName = obj?.name;
	    const nativeProto = Object.getPrototypeOf(apiFunction);
	    let lies = {
	        // custom lie string names
	        ['failed illegal error']: !!obj && failsTypeError({
	            spawnErr: () => obj.prototype[name],
	        }),
	        ['failed undefined properties']: (!!obj && /^(screen|navigator)$/i.test(objName) && !!(Object.getOwnPropertyDescriptor(self[objName.toLowerCase()], name) || (HAS_REFLECT &&
	            Reflect.getOwnPropertyDescriptor(self[objName.toLowerCase()], name)))),
	        ['failed call interface error']: failsTypeError({
	            spawnErr: () => {
	                // @ts-expect-error
	                new apiFunction();
	                apiFunction.call(proto);
	            },
	        }),
	        ['failed apply interface error']: failsTypeError({
	            spawnErr: () => {
	                // @ts-expect-error
	                new apiFunction();
	                apiFunction.apply(proto);
	            },
	        }),
	        ['failed new instance error']: failsTypeError({
	            // @ts-expect-error
	            spawnErr: () => new apiFunction(),
	        }),
	        ['failed class extends error']: !IS_WEBKIT && failsTypeError({
	            spawnErr: () => {
	                // @ts-expect-error
	                class Fake extends apiFunction {
	                }
	            },
	        }),
	        ['failed null conversion error']: failsTypeError({
	            spawnErr: () => Object.setPrototypeOf(apiFunction, null).toString(),
	            final: () => Object.setPrototypeOf(apiFunction, nativeProto),
	        }),
	        ['failed toString']: (!hasKnownToString(name)[scope.Function.prototype.toString.call(apiFunction)] ||
	            !hasKnownToString('toString')[scope.Function.prototype.toString.call(apiFunction.toString)]),
	        ['failed "prototype" in function']: 'prototype' in apiFunction,
	        ['failed descriptor']: !!(Object.getOwnPropertyDescriptor(apiFunction, 'arguments') ||
	            Reflect.getOwnPropertyDescriptor(apiFunction, 'arguments') ||
	            Object.getOwnPropertyDescriptor(apiFunction, 'caller') ||
	            Reflect.getOwnPropertyDescriptor(apiFunction, 'caller') ||
	            Object.getOwnPropertyDescriptor(apiFunction, 'prototype') ||
	            Reflect.getOwnPropertyDescriptor(apiFunction, 'prototype') ||
	            Object.getOwnPropertyDescriptor(apiFunction, 'toString') ||
	            Reflect.getOwnPropertyDescriptor(apiFunction, 'toString')),
	        ['failed own property']: !!(apiFunction.hasOwnProperty('arguments') ||
	            apiFunction.hasOwnProperty('caller') ||
	            apiFunction.hasOwnProperty('prototype') ||
	            apiFunction.hasOwnProperty('toString')),
	        ['failed descriptor keys']: (Object.keys(Object.getOwnPropertyDescriptors(apiFunction)).sort().toString() != 'length,name'),
	        ['failed own property names']: (Object.getOwnPropertyNames(apiFunction).sort().toString() != 'length,name'),
	        ['failed own keys names']: HAS_REFLECT && (Reflect.ownKeys(apiFunction).sort().toString() != 'length,name'),
	        // Proxy Detection
	        ['failed object toString error']: (failsTypeError({
	            spawnErr: () => Object.create(apiFunction).toString(),
	            withStack: (err) => IS_BLINK && !hasValidStack(err, AT_FUNCTION),
	        }) ||
	            failsTypeError({
	                spawnErr: () => Object.create(new Proxy(apiFunction, {})).toString(),
	                withStack: (err) => IS_BLINK && !hasValidStack(err, AT_OBJECT),
	            })),
	        ['failed at incompatible proxy error']: failsTypeError({
	            spawnErr: () => {
	                apiFunction.arguments;
	                apiFunction.caller;
	            },
	            withStack: (err) => IS_GECKO && !hasValidStack(err, STRICT_MODE, 0),
	        }),
	        ['failed at toString incompatible proxy error']: failsTypeError({
	            spawnErr: () => {
	                apiFunction.toString.arguments;
	                apiFunction.toString.caller;
	            },
	            withStack: (err) => IS_GECKO && !hasValidStack(err, STRICT_MODE, 0),
	        }),
	        ['failed at too much recursion error']: failsTypeError({
	            spawnErr: () => {
	                Object.setPrototypeOf(apiFunction, Object.create(apiFunction)).toString();
	            },
	            final: () => Object.setPrototypeOf(apiFunction, nativeProto),
	        }),
	    };
	    // conditionally increase difficulty
	    const detectProxies = (name == 'toString' ||
	        !!lieProps['Function.toString'] ||
	        !!lieProps['Permissions.query']);
	    if (detectProxies) {
	        const proxy1 = new Proxy(apiFunction, {});
	        const proxy2 = new Proxy(apiFunction, {});
	        const proxy3 = new Proxy(apiFunction, {});
	        lies = {
	            ...lies,
	            // Advanced Proxy Detection
	            ['failed at too much recursion __proto__ error']: !failsTypeError({
	                spawnErr: () => {
	                    // @ts-expect-error
	                    apiFunction.__proto__ = proxy;
	                    apiFunction++;
	                },
	                final: () => Object.setPrototypeOf(apiFunction, nativeProto),
	            }),
	            ['failed at chain cycle error']: !failsTypeError({
	                spawnErr: () => {
	                    Object.setPrototypeOf(proxy1, Object.create(proxy1)).toString();
	                },
	                final: () => Object.setPrototypeOf(proxy1, nativeProto),
	            }),
	            ['failed at chain cycle __proto__ error']: !failsTypeError({
	                spawnErr: () => {
	                    // @ts-expect-error
	                    proxy2.__proto__ = proxy2;
	                    proxy2++;
	                },
	                final: () => Object.setPrototypeOf(proxy2, nativeProto),
	            }),
	            ['failed at reflect set proto']: HAS_REFLECT && failsTypeError({
	                spawnErr: () => {
	                    Reflect.setPrototypeOf(apiFunction, Object.create(apiFunction));
	                    RAND in apiFunction;
	                    throw new TypeError();
	                },
	                final: () => Object.setPrototypeOf(apiFunction, nativeProto),
	            }),
	            ['failed at reflect set proto proxy']: HAS_REFLECT && !failsTypeError({
	                spawnErr: () => {
	                    Reflect.setPrototypeOf(proxy3, Object.create(proxy3));
	                    RAND in proxy3;
	                },
	                final: () => Object.setPrototypeOf(proxy3, nativeProto),
	            }),
	            ['failed at instanceof check error']: IS_BLINK && (failsTypeError({
	                spawnErr: () => {
	                    apiFunction instanceof apiFunction;
	                },
	                withStack: (err) => !hasValidStack(err, FUNCTION_INSTANCE),
	            }) ||
	                failsTypeError({
	                    spawnErr: () => {
	                        const proxy = new Proxy(apiFunction, {});
	                        proxy instanceof proxy;
	                    },
	                    withStack: (err) => !hasValidStack(err, PROXY_INSTANCE),
	                })),
	            ['failed at define properties']: IS_BLINK && HAS_REFLECT && failsWithError(() => {
	                Object.defineProperty(apiFunction, '', { configurable: true }).toString();
	                Reflect.deleteProperty(apiFunction, '');
	            }),
	        };
	    }
	    const lieTypes = Object.keys(lies).filter((key) => !!lies[key]);
	    return {
	        lied: lieTypes.length,
	        lieTypes,
	    };
	}
	function createLieDetector(scope) {
	    const isSupported = (obj) => typeof obj != 'undefined' && !!obj;
	    const props = {}; // lie list and detail
	    const propsSearched = []; // list of properties searched
	    return {
	        getProps: () => props,
	        getPropsSearched: () => propsSearched,
	        searchLies: (fn, config) => {
	            const { target, ignore } = config || {};
	            let obj;
	            // check if api is blocked or not supported
	            try {
	                obj = fn();
	                if (!isSupported(obj)) {
	                    return;
	                }
	            }
	            catch (error) {
	                return;
	            }
	            const interfaceObject = !!obj.prototype ? obj.prototype : obj;
	            [...new Set([
	                    ...Object.getOwnPropertyNames(interfaceObject),
	                    ...Object.keys(interfaceObject), // backup
	                ])].sort().forEach((name) => {
	                const skip = (name == 'constructor' ||
	                    (target && !new Set(target).has(name)) ||
	                    (ignore && new Set(ignore).has(name)));
	                if (skip)
	                    return;
	                const objectNameString = /\s(.+)\]/;
	                const apiName = `${obj.name ? obj.name :
                    objectNameString.test(obj) ? objectNameString.exec(obj)?.[1] :
                        undefined}.${name}`;
	                propsSearched.push(apiName);
	                try {
	                    const proto = obj.prototype ? obj.prototype : obj;
	                    let res; // response from getLies
	                    // search if function
	                    try {
	                        const apiFunction = proto[name]; // may trigger TypeError
	                        if (typeof apiFunction == 'function') {
	                            res = queryLies({
	                                scope,
	                                apiFunction: proto[name],
	                                proto,
	                                obj: null,
	                                lieProps: props,
	                            });
	                            if (res.lied) {
	                                documentLie(apiName, res.lieTypes);
	                                return (props[apiName] = res.lieTypes);
	                            }
	                            return;
	                        }
	                        // since there is no TypeError and the typeof is not a function,
	                        // handle invalid values and ignore name, length, and constants
	                        if (name != 'name' &&
	                            name != 'length' &&
	                            name[0] !== name[0].toUpperCase()) {
	                            const lie = ['failed descriptor.value undefined'];
	                            documentLie(apiName, lie);
	                            return (props[apiName] = lie);
	                        }
	                    }
	                    catch (error) { }
	                    // else search getter function
	                    // @ts-ignore
	                    const getterFunction = Object.getOwnPropertyDescriptor(proto, name).get;
	                    res = queryLies({
	                        scope,
	                        apiFunction: getterFunction,
	                        proto,
	                        obj,
	                        lieProps: props,
	                    }); // send the obj for special tests
	                    if (res.lied) {
	                        documentLie(apiName, res.lieTypes);
	                        return (props[apiName] = res.lieTypes);
	                    }
	                    return;
	                }
	                catch (error) {
	                    const lie = `failed prototype test execution`;
	                    documentLie(apiName, lie);
	                    return (props[apiName] = [lie]);
	                }
	            });
	        },
	    };
	}
	function getPhantomIframe() {
	    if (IS_WORKER_SCOPE)
	        return { iframeWindow: self };
	    try {
	        const numberOfIframes = self.length;
	        const frag = new DocumentFragment();
	        const div = document.createElement('div');
	        const id = getRandomValues();
	        div.setAttribute('id', id);
	        frag.appendChild(div);
	        div.innerHTML = `<div style="${GHOST}"><iframe></iframe></div>`;
	        document.body.appendChild(frag);
	        const iframeWindow = self[numberOfIframes];
	        const phantomWindow = getBehemothIframe(iframeWindow);
	        return { iframeWindow: phantomWindow || self, div };
	    }
	    catch (error) {
	        captureError(error, 'client blocked phantom iframe');
	        return { iframeWindow: self };
	    }
	}
	const { iframeWindow: PHANTOM_DARKNESS, div: PARENT_PHANTOM } = getPhantomIframe() || {};
	function getPrototypeLies(scope) {
	    const lieDetector = createLieDetector(scope);
	    const { searchLies, } = lieDetector;
	    // search lies: remove target to search all properties
	    // test Function.toString first to determine the depth of the search
	    searchLies(() => Function, {
	        target: [
	            'toString',
	        ],
	        ignore: [
	            'caller',
	            'arguments',
	        ],
	    });
	    // other APIs
	    searchLies(() => AnalyserNode);
	    searchLies(() => AudioBuffer, {
	        target: [
	            'copyFromChannel',
	            'getChannelData',
	        ],
	    });
	    searchLies(() => BiquadFilterNode, {
	        target: [
	            'getFrequencyResponse',
	        ],
	    });
	    searchLies(() => CanvasRenderingContext2D, {
	        target: [
	            'getImageData',
	            'getLineDash',
	            'isPointInPath',
	            'isPointInStroke',
	            'measureText',
	            'quadraticCurveTo',
	            'fillText',
	            'strokeText',
	            'font',
	        ],
	    });
	    searchLies(() => CSSStyleDeclaration, {
	        target: [
	            'setProperty',
	        ],
	    });
	    // @ts-expect-error
	    searchLies(() => CSS2Properties, {
	        target: [
	            'setProperty',
	        ],
	    });
	    searchLies(() => Date, {
	        target: [
	            'getDate',
	            'getDay',
	            'getFullYear',
	            'getHours',
	            'getMinutes',
	            'getMonth',
	            'getTime',
	            'getTimezoneOffset',
	            'setDate',
	            'setFullYear',
	            'setHours',
	            'setMilliseconds',
	            'setMonth',
	            'setSeconds',
	            'setTime',
	            'toDateString',
	            'toJSON',
	            'toLocaleDateString',
	            'toLocaleString',
	            'toLocaleTimeString',
	            'toString',
	            'toTimeString',
	            'valueOf',
	        ],
	    });
	    // @ts-expect-error if not supported
	    searchLies(() => GPU, {
	        target: [
	            'requestAdapter',
	        ],
	    });
	    // @ts-expect-error if not supported
	    searchLies(() => GPUAdapter, {
	        target: [
	            'requestAdapterInfo',
	        ],
	    });
	    searchLies(() => Intl.DateTimeFormat, {
	        target: [
	            'format',
	            'formatRange',
	            'formatToParts',
	            'resolvedOptions',
	        ],
	    });
	    searchLies(() => Document, {
	        target: [
	            'createElement',
	            'createElementNS',
	            'getElementById',
	            'getElementsByClassName',
	            'getElementsByName',
	            'getElementsByTagName',
	            'getElementsByTagNameNS',
	            'referrer',
	            'write',
	            'writeln',
	        ],
	        ignore: [
	            // Gecko
	            'onreadystatechange',
	            'onmouseenter',
	            'onmouseleave',
	        ],
	    });
	    searchLies(() => DOMRect);
	    searchLies(() => DOMRectReadOnly);
	    searchLies(() => Element, {
	        target: [
	            'append',
	            'appendChild',
	            'getBoundingClientRect',
	            'getClientRects',
	            'insertAdjacentElement',
	            'insertAdjacentHTML',
	            'insertAdjacentText',
	            'insertBefore',
	            'prepend',
	            'replaceChild',
	            'replaceWith',
	            'setAttribute',
	        ],
	    });
	    searchLies(() => FontFace, {
	        target: [
	            'family',
	            'load',
	            'status',
	        ],
	    });
	    searchLies(() => HTMLCanvasElement);
	    searchLies(() => HTMLElement, {
	        target: [
	            'clientHeight',
	            'clientWidth',
	            'offsetHeight',
	            'offsetWidth',
	            'scrollHeight',
	            'scrollWidth',
	        ],
	        ignore: [
	            // Gecko
	            'onmouseenter',
	            'onmouseleave',
	        ],
	    });
	    searchLies(() => HTMLIFrameElement, {
	        target: [
	            'contentDocument',
	            'contentWindow',
	        ],
	    });
	    searchLies(() => IntersectionObserverEntry, {
	        target: [
	            'boundingClientRect',
	            'intersectionRect',
	            'rootBounds',
	        ],
	    });
	    searchLies(() => Math, {
	        target: [
	            'acos',
	            'acosh',
	            'asinh',
	            'atan',
	            'atan2',
	            'atanh',
	            'cbrt',
	            'cos',
	            'cosh',
	            'exp',
	            'expm1',
	            'log',
	            'log10',
	            'log1p',
	            'sin',
	            'sinh',
	            'sqrt',
	            'tan',
	            'tanh',
	        ],
	    });
	    searchLies(() => MediaDevices, {
	        target: [
	            'enumerateDevices',
	            'getDisplayMedia',
	            'getUserMedia',
	        ],
	    });
	    searchLies(() => Navigator, {
	        target: [
	            'appCodeName',
	            'appName',
	            'appVersion',
	            'buildID',
	            'connection',
	            'deviceMemory',
	            'getBattery',
	            'getGamepads',
	            'getVRDisplays',
	            'hardwareConcurrency',
	            'language',
	            'languages',
	            'maxTouchPoints',
	            'mimeTypes',
	            'oscpu',
	            'platform',
	            'plugins',
	            'product',
	            'productSub',
	            'sendBeacon',
	            'serviceWorker',
	            'storage',
	            'userAgent',
	            'vendor',
	            'vendorSub',
	            'webdriver',
	            'gpu',
	        ],
	    });
	    searchLies(() => Node, {
	        target: [
	            'appendChild',
	            'insertBefore',
	            'replaceChild',
	        ],
	    });
	    // @ts-expect-error
	    searchLies(() => OffscreenCanvas, {
	        target: [
	            'convertToBlob',
	            'getContext',
	        ],
	    });
	    // @ts-expect-error
	    searchLies(() => OffscreenCanvasRenderingContext2D, {
	        target: [
	            'getImageData',
	            'getLineDash',
	            'isPointInPath',
	            'isPointInStroke',
	            'measureText',
	            'quadraticCurveTo',
	            'font',
	        ],
	    });
	    searchLies(() => Permissions, {
	        target: [
	            'query',
	        ],
	    });
	    searchLies(() => Range, {
	        target: [
	            'getBoundingClientRect',
	            'getClientRects',
	        ],
	    });
	    // @ts-expect-error
	    searchLies(() => Intl.RelativeTimeFormat, {
	        target: [
	            'resolvedOptions',
	        ],
	    });
	    searchLies(() => Screen);
	    searchLies(() => speechSynthesis, {
	        target: [
	            'getVoices',
	        ],
	    });
	    searchLies(() => String, {
	        target: [
	            'fromCodePoint',
	        ],
	    });
	    searchLies(() => StorageManager, {
	        target: [
	            'estimate',
	        ],
	    });
	    searchLies(() => SVGRect);
	    searchLies(() => SVGRectElement, {
	        target: [
	            'getBBox',
	        ],
	    });
	    searchLies(() => SVGTextContentElement, {
	        target: [
	            'getExtentOfChar',
	            'getSubStringLength',
	            'getComputedTextLength',
	        ],
	    });
	    searchLies(() => TextMetrics);
	    searchLies(() => WebGLRenderingContext, {
	        target: [
	            'bufferData',
	            'getParameter',
	            'readPixels',
	        ],
	    });
	    searchLies(() => WebGL2RenderingContext, {
	        target: [
	            'bufferData',
	            'getParameter',
	            'readPixels',
	        ],
	    });
	    /* potential targets:
	        RTCPeerConnection
	        Plugin
	        PluginArray
	        MimeType
	        MimeTypeArray
	        Worker
	        History
	    */
	    // return lies list and detail
	    const props = lieDetector.getProps();
	    const propsSearched = lieDetector.getPropsSearched();
	    return {
	        lieDetector,
	        lieList: Object.keys(props).sort(),
	        lieDetail: props,
	        lieCount: Object.keys(props).reduce((acc, key) => acc + props[key].length, 0),
	        propsSearched,
	    };
	}
	// start program
	const start = performance.now();
	const { lieDetector, lieList, lieDetail, 
	// lieCount,
	propsSearched, } = getPrototypeLies(PHANTOM_DARKNESS); // execute and destructure the list and detail
	// disregard Function.prototype.toString lies when determining if the API can be trusted
	const getNonFunctionToStringLies = (x) => !x ? x : x.filter((x) => !/object toString|toString incompatible proxy/.test(x)).length;
	let lieProps;
	let prototypeLies;
	let PROTO_BENCHMARK = 0;
	if (!IS_WORKER_SCOPE) {
	    lieProps = (() => {
	        const props = lieDetector.getProps();
	        return Object.keys(props).reduce((acc, key) => {
	            acc[key] = getNonFunctionToStringLies(props[key]);
	            return acc;
	        }, {});
	    })();
	    prototypeLies = JSON.parse(JSON.stringify(lieDetail));
	    const perf = performance.now() - start;
	    PROTO_BENCHMARK = +perf.toFixed(2);
	    const message = `${propsSearched.length} API properties analyzed in ${PROTO_BENCHMARK}ms (${lieList.length} corrupted)`;
	    setTimeout(() => console.log(message), 3000);
	}
	const getPluginLies = (plugins, mimeTypes) => {
	    const lies = []; // collect lie types
	    const pluginsOwnPropertyNames = Object.getOwnPropertyNames(plugins).filter((name) => isNaN(+name));
	    const mimeTypesOwnPropertyNames = Object.getOwnPropertyNames(mimeTypes).filter((name) => isNaN(+name));
	    // cast to array
	    const pluginsList = [...plugins];
	    const mimeTypesList = [...mimeTypes];
	    // get initial trusted mimeType names
	    const trustedMimeTypes = new Set(mimeTypesOwnPropertyNames);
	    // get initial trusted plugin names
	    const excludeDuplicates = (arr) => [...new Set(arr)];
	    const mimeTypeEnabledPlugins = excludeDuplicates(mimeTypesList.map((mimeType) => mimeType.enabledPlugin));
	    const trustedPluginNames = new Set(pluginsOwnPropertyNames);
	    const mimeTypeEnabledPluginsNames = mimeTypeEnabledPlugins.map((plugin) => plugin && plugin.name);
	    const trustedPluginNamesArray = [...trustedPluginNames];
	    trustedPluginNamesArray.forEach((name) => {
	        const validName = new Set(mimeTypeEnabledPluginsNames).has(name);
	        if (!validName) {
	            trustedPluginNames.delete(name);
	        }
	    });
	    // 3. Expect MimeType object in plugins
	    const invalidPlugins = pluginsList.filter((plugin) => {
	        try {
	            const validMimeType = Object.getPrototypeOf(plugin[0]).constructor.name == 'MimeType';
	            if (!validMimeType) {
	                trustedPluginNames.delete(plugin.name);
	            }
	            return !validMimeType;
	        }
	        catch (error) {
	            trustedPluginNames.delete(plugin.name);
	            return true; // sign of tampering
	        }
	    });
	    if (invalidPlugins.length) {
	        lies.push('missing mimetype');
	    }
	    // 4. Expect valid MimeType(s) in plugin
	    const pluginMimeTypes = pluginsList
	        .map((plugin) => Object.values(plugin)).flat();
	    const pluginMimeTypesNames = pluginMimeTypes.map((mimetype) => mimetype.type);
	    pluginMimeTypesNames.forEach((name) => {
	        const validName = trustedMimeTypes.has(name);
	        if (!validName) {
	            trustedMimeTypes.delete(name);
	        }
	    });
	    pluginsList.forEach((plugin) => {
	        const pluginMimeTypes = Object.values(plugin).map((mimetype) => mimetype.type);
	        return pluginMimeTypes.forEach((mimetype) => {
	            if (!trustedMimeTypes.has(mimetype)) {
	                lies.push('invalid mimetype');
	                return trustedPluginNames.delete(plugin.name);
	            }
	            return;
	        });
	    });
	    return {
	        validPlugins: pluginsList.filter((plugin) => trustedPluginNames.has(plugin.name)),
	        validMimeTypes: mimeTypesList.filter((mimeType) => trustedMimeTypes.has(mimeType.type)),
	        lies: [...new Set(lies)], // remove duplicates
	    };
	};
	const getLies = () => {
	    const records = lieRecords.getRecords();
	    const totalLies = Object.keys(records).reduce((acc, key) => {
	        acc += records[key].length;
	        return acc;
	    }, 0);
	    return { data: records, totalLies };
	};

	// Detect proxy behavior
	const proxyBehavior = (x) => typeof x == 'function' ? true : false;
	const GIBBERS = /[cC]f|[jJ][bcdfghlmprsty]|[qQ][bcdfghjklmnpsty]|[vV][bfhjkmpt]|[xX][dkrz]|[yY]y|[zZ][fr]|[cCxXzZ]j|[bBfFgGjJkKpPvVqQtTwWyYzZ]q|[cCfFgGjJpPqQwW]v|[jJqQvV]w|[bBcCdDfFgGhHjJkKmMpPqQsSvVwWxXzZ]x|[bBfFhHjJkKmMpPqQ]z/g;
	// Detect gibberish
	const gibberish = (str, { strict = false } = {}) => {
	    if (!str)
	        return [];
	    // test letter case sequence
	    const letterCaseSequenceGibbers = [];
	    const tests = [
	        /([A-Z]{3,}[a-z])/g, // ABCd
	        /([a-z][A-Z]{3,})/g, // aBCD
	        /([a-z][A-Z]{2,}[a-z])/g, // aBC...z
	        /([a-z][\d]{2,}[a-z])/g, // a##...b
	        /([A-Z][\d]{2,}[a-z])/g, // A##...b
	        /([a-z][\d]{2,}[A-Z])/g, // a##...B
	    ];
	    tests.forEach((regExp) => {
	        const match = str.match(regExp);
	        if (match) {
	            return letterCaseSequenceGibbers.push(match.join(', '));
	        }
	        return;
	    });
	    // test letter sequence
	    const letterSequenceGibbers = [];
	    const clean = str.replace(/\d|\W|_/g, ' ').replace(/\s+/g, ' ').trim().split(' ').join('_');
	    const len = clean.length;
	    const arr = [...clean];
	    arr.forEach((char, index) => {
	        const nextIndex = index + 1;
	        const nextChar = arr[nextIndex];
	        const isWordSequence = nextChar !== '_' && char !== '_' && nextIndex !== len;
	        if (isWordSequence) {
	            const combo = char + nextChar;
	            if (GIBBERS.test(combo))
	                letterSequenceGibbers.push(combo);
	        }
	    });
	    const gibbers = [
	        // ignore sequence if less than 3 exist
	        ...(!strict && (letterSequenceGibbers.length < 3) ? [] : letterSequenceGibbers),
	        ...(!strict && (letterCaseSequenceGibbers.length < 4) ? [] : letterCaseSequenceGibbers),
	    ];
	    const allow = [
	        // known gibbers
	        'bz',
	        'cf',
	        'fx',
	        'mx',
	        'vb',
	        'xd',
	        'gx',
	        'PCIe',
	        'vm',
	        'NVIDIAGa',
	    ];
	    return gibbers.filter((x) => !allow.includes(x));
	};
	// WebGL Renderer helpers
	function compressWebGLRenderer(x) {
	    if (!x)
	        return;
	    return ('' + x)
	        .replace(/ANGLE \(|\sDirect3D.+|\sD3D.+|\svs_.+\)|\((DRM|POLARIS|LLVM).+|Mesa.+|(ATI|INTEL)-.+|Metal\s-\s.+|NVIDIA\s[\d|\.]+/ig, '')
	        .replace(/(\s(ti|\d{1,2}GB|super)$)/ig, '')
	        .replace(/\s{2,}/g, ' ')
	        .trim()
	        .replace(/((r|g)(t|)(x|s|\d) |Graphics |GeForce |Radeon (HD |Pro |))(\d+)/i, (...args) => {
	        return `${args[1]}${args[6][0]}${args[6].slice(1).replace(/\d/g, '0')}s`;
	    });
	}
	const getWebGLRendererParts = (x) => {
	    const knownParts = [
	        'AMD',
	        'ANGLE',
	        'ASUS',
	        'ATI',
	        'ATI Radeon',
	        'ATI Technologies Inc',
	        'Adreno',
	        'Android Emulator',
	        'Apple',
	        'Apple GPU',
	        'Apple M1',
	        'Chipset',
	        'D3D11',
	        'Direct3D',
	        'Express Chipset',
	        'GeForce',
	        'Generation',
	        'Generic Renderer',
	        'Google',
	        'Google SwiftShader',
	        'Graphics',
	        'Graphics Media Accelerator',
	        'HD Graphics Family',
	        'Intel',
	        'Intel(R) HD Graphics',
	        'Intel(R) UHD Graphics',
	        'Iris',
	        'KBL Graphics',
	        'Mali',
	        'Mesa',
	        'Mesa DRI',
	        'Metal',
	        'Microsoft',
	        'Microsoft Basic Render Driver',
	        'Microsoft Corporation',
	        'NVIDIA',
	        'NVIDIA Corporation',
	        'NVIDIAGameReadyD3D',
	        'OpenGL',
	        'OpenGL Engine',
	        'Open Source Technology Center',
	        'Parallels',
	        'Parallels Display Adapter',
	        'PCIe',
	        'Plus Graphics',
	        'PowerVR',
	        'Pro Graphics',
	        'Quadro',
	        'Radeon',
	        'Radeon Pro',
	        'Radeon Pro Vega',
	        'Samsung',
	        'SSE2',
	        'VMware',
	        'VMware SVGA 3D',
	        'Vega',
	        'VirtualBox',
	        'VirtualBox Graphics Adapter',
	        'Vulkan',
	        'Xe Graphics',
	        'llvmpipe',
	    ];
	    const parts = [...knownParts].filter((name) => ('' + x).includes(name));
	    return [...new Set(parts)].sort().join(', ');
	};
	const getWebGLRendererConfidence = (x) => {
	    if (!x) {
	        return;
	    }
	    const parts = getWebGLRendererParts(x);
	    const hasKnownParts = parts.length;
	    const hasBlankSpaceNoise = /\s{2,}|^\s|\s$/.test(x);
	    const hasBrokenAngleStructure = /^ANGLE/.test(x) && !(/^ANGLE \((.+)\)/.exec(x) || [])[1];
	    // https://chromium.googlesource.com/angle/angle/+/83fa18905d8fed4f394e4f30140a83a3e76b1577/src/gpu_info_util/SystemInfo.cpp
	    // https://chromium.googlesource.com/angle/angle/+/83fa18905d8fed4f394e4f30140a83a3e76b1577/src/gpu_info_util/SystemInfo.h
	    // https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/gl/gl_version_info.cc
	    /*
	    const knownVendors = [
	        'AMD',
	        'ARM',
	        'Broadcom',
	        'Google',
	        'ImgTec',
	        'Intel',
	        'Kazan',
	        'NVIDIA',
	        'Qualcomm',
	        'VeriSilicon',
	        'Vivante',
	        'VMWare',
	        'Apple',
	        'Unknown'
	    ]
	    const angle = {
	        vendorId: (/^ANGLE \(([^,]+),/.exec(x)||[])[1] || knownVendors.find(vendor => x.includes(vendor)),
	        deviceId: (
	            (x.match(/,/g)||[]).length == 2 ? (/^ANGLE \(([^,]+), ([^,]+)[,|\)]/.exec(x)||[])[2] :
	                (/^ANGLE \(([^,]+), ([^,]+)[,|\)]/.exec(x)||[])[1] || (/^ANGLE \((.+)\)$/.exec(x)||[])[1]
	        ).replace(/\sDirect3D.+/, '')
	    }
	    */
	    const gibbers = gibberish(x, { strict: true }).join(', ');
	    const valid = (hasKnownParts && !hasBlankSpaceNoise && !hasBrokenAngleStructure);
	    const confidence = (valid && !gibbers.length ? 'high' :
	        valid && gibbers.length ? 'moderate' :
	            'low');
	    const grade = (confidence == 'high' ? 'A' :
	        confidence == 'moderate' ? 'C' :
	            'F');
	    const warnings = new Set([
	        (hasBlankSpaceNoise ? 'found extra spaces' : undefined),
	        (hasBrokenAngleStructure ? 'broken angle structure' : undefined),
	    ]);
	    warnings.delete(undefined);
	    return {
	        parts,
	        warnings: [...warnings],
	        gibbers,
	        confidence,
	        grade,
	    };
	};
	// Collect trash values
	const createTrashBin = () => {
	    const bin = [];
	    return {
	        getBin: () => bin,
	        sendToTrash: (name, val, response = undefined) => {
	            const proxyLike = proxyBehavior(val);
	            const value = !proxyLike ? val : 'proxy behavior detected';
	            bin.push({ name, value });
	            return response;
	        },
	    };
	};
	const trashBin = createTrashBin();
	const { sendToTrash } = trashBin;

	function isFontOSBad(userAgentOS, fonts) {
	    if (!userAgentOS || !fonts || !fonts.length)
	        return false;
	    const fontMap = fonts.reduce((acc, x) => {
	        acc[x] = true;
	        return acc;
	    }, {});
	    const isLikeWindows = ('Cambria Math' in fontMap ||
	        'Nirmala UI' in fontMap ||
	        'Leelawadee UI' in fontMap ||
	        'HoloLens MDL2 Assets' in fontMap ||
	        'Segoe Fluent Icons' in fontMap);
	    const isLikeApple = ('Helvetica Neue' in fontMap ||
	        'Luminari' in fontMap ||
	        'PingFang HK Light' in fontMap ||
	        'InaiMathi Bold' in fontMap ||
	        'Galvji' in fontMap ||
	        'Chakra Petch' in fontMap);
	    const isLikeLinux = ('Arimo' in fontMap ||
	        'MONO' in fontMap ||
	        'Ubuntu' in fontMap ||
	        'Noto Color Emoji' in fontMap ||
	        'Dancing Script' in fontMap ||
	        'Droid Sans Mono' in fontMap);
	    if (isLikeWindows && userAgentOS != PlatformClassifier.WINDOWS) {
	        return true;
	    }
	    else if (isLikeApple && userAgentOS != PlatformClassifier.APPLE) {
	        return true;
	    }
	    else if (isLikeLinux && userAgentOS != PlatformClassifier.LINUX) {
	        return true;
	    }
	    return false;
	}

	var Scope;
	(function (Scope) {
	    Scope[Scope["WORKER"] = 0] = "WORKER";
	    Scope[Scope["WINDOW"] = 1] = "WINDOW";
	})(Scope || (Scope = {}));

	// https://stackoverflow.com/a/22429679
	const hashMini = (x) => {
	    const json = `${JSON.stringify(x)}`;
	    const hash = json.split('').reduce((hash, char, i) => {
	        return Math.imul(31, hash) + json.charCodeAt(i) | 0;
	    }, 0x811c9dc5);
	    return ('0000000' + (hash >>> 0).toString(16)).substr(-8);
	};
	// instance id
	const instanceId = (String.fromCharCode(Math.random() * 26 + 97) +
	    Math.random().toString(36).slice(-7));

	// special thanks to https://arh.antoinevastel.com for inspiration
	async function getNavigator(workerScope) {
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        let lied = (lieProps['Navigator.appVersion'] ||
	            lieProps['Navigator.deviceMemory'] ||
	            lieProps['Navigator.doNotTrack'] ||
	            lieProps['Navigator.hardwareConcurrency'] ||
	            lieProps['Navigator.language'] ||
	            lieProps['Navigator.languages'] ||
	            lieProps['Navigator.maxTouchPoints'] ||
	            lieProps['Navigator.oscpu'] ||
	            lieProps['Navigator.platform'] ||
	            lieProps['Navigator.userAgent'] ||
	            lieProps['Navigator.vendor'] ||
	            lieProps['Navigator.plugins'] ||
	            lieProps['Navigator.mimeTypes']) || false;
	        const credibleUserAgent = ('chrome' in window ? navigator.userAgent.includes(navigator.appVersion) : true);
	        const data = {
	            platform: attempt(() => {
	                const { platform } = navigator;
	                const systems = ['win', 'linux', 'mac', 'arm', 'pike', 'linux', 'iphone', 'ipad', 'ipod', 'android', 'x11'];
	                const trusted = typeof platform == 'string' && systems.filter((val) => platform.toLowerCase().includes(val))[0];
	                if (!trusted) {
	                    sendToTrash(`platform`, `${platform} is unusual`);
	                }
	                // user agent os lie
	                if (USER_AGENT_OS !== PLATFORM_OS) {
	                    lied = true;
	                    documentLie(`Navigator.platform`, `${PLATFORM_OS} platform and ${USER_AGENT_OS} user agent do not match`);
	                }
	                if (workerScope && platform != workerScope.platform) ;
	                return platform;
	            }),
	            system: attempt(() => getOS(navigator.userAgent), 'userAgent system failed'),
	            userAgentParsed: await attempt(async () => {
	                const reportedUserAgent = caniuse(() => navigator.userAgent);
	                const reportedSystem = getOS(reportedUserAgent);
	                const isBrave = await braveBrowser();
	                const report = decryptUserAgent({
	                    ua: reportedUserAgent,
	                    os: reportedSystem,
	                    isBrave,
	                });
	                return report;
	            }),
	            device: attempt(() => getUserAgentPlatform({ userAgent: navigator.userAgent }), 'userAgent device failed'),
	            userAgent: attempt(() => {
	                const { userAgent } = navigator;
	                if (!credibleUserAgent) {
	                    sendToTrash('userAgent', `${userAgent} does not match appVersion`);
	                }
	                if (/\s{2,}|^\s|\s$/g.test(userAgent)) {
	                    sendToTrash('userAgent', `extra spaces detected`);
	                }
	                const gibbers = gibberish(userAgent);
	                if (!!gibbers.length) {
	                    sendToTrash(`userAgent is gibberish`, userAgent);
	                }
	                if (workerScope && userAgent != workerScope.userAgent) ;
	                return userAgent.trim().replace(/\s{2,}/, ' ');
	            }, 'userAgent failed'),
	            uaPostReduction: isUAPostReduction((navigator || {}).userAgent),
	            appVersion: attempt(() => {
	                const { appVersion } = navigator;
	                if (!credibleUserAgent) {
	                    sendToTrash('appVersion', `${appVersion} does not match userAgent`);
	                }
	                if ('appVersion' in navigator && !appVersion) {
	                    sendToTrash('appVersion', 'Living Standard property returned falsy value');
	                }
	                if (/\s{2,}|^\s|\s$/g.test(appVersion)) {
	                    sendToTrash('appVersion', `extra spaces detected`);
	                }
	                return appVersion.trim().replace(/\s{2,}/, ' ');
	            }, 'appVersion failed'),
	            deviceMemory: attempt(() => {
	                if (!('deviceMemory' in navigator)) {
	                    return undefined;
	                }
	                // @ts-ignore
	                const { deviceMemory } = navigator;
	                const trusted = {
	                    '0.25': true,
	                    '0.5': true,
	                    '1': true,
	                    '2': true,
	                    '4': true,
	                    '8': true,
	                    '16': true,
	                    '32': true,
	                };
	                if (!trusted[deviceMemory]) {
	                    sendToTrash('deviceMemory', `${deviceMemory} is not a valid value [0.25, 0.5, 1, 2, 4, 8, 16, 32]`);
	                }
	                // @ts-expect-error memory is undefined if not supported
	                const memory = performance?.memory?.jsHeapSizeLimit || null;
	                const memoryInGigabytes = memory ? +(memory / 1073741824).toFixed(1) : 0;
	                if (memoryInGigabytes > deviceMemory) {
	                    sendToTrash('deviceMemory', `available memory ${memoryInGigabytes}GB is greater than device memory ${deviceMemory}GB`);
	                }
	                if (workerScope && deviceMemory !== workerScope.deviceMemory) ;
	                return deviceMemory;
	            }, 'deviceMemory failed'),
	            doNotTrack: attempt(() => {
	                const { doNotTrack } = navigator;
	                const trusted = {
	                    '1': !0,
	                    'true': !0,
	                    'yes': !0,
	                    '0': !0,
	                    'false': !0,
	                    'no': !0,
	                    'unspecified': !0,
	                    'null': !0,
	                    'undefined': !0,
	                };
	                if (!trusted[doNotTrack]) {
	                    sendToTrash('doNotTrack - unusual result', doNotTrack);
	                }
	                return doNotTrack;
	            }, 'doNotTrack failed'),
	            globalPrivacyControl: attempt(() => {
	                if (!('globalPrivacyControl' in navigator)) {
	                    return undefined;
	                }
	                // @ts-ignore
	                const { globalPrivacyControl } = navigator;
	                const trusted = {
	                    '1': !0,
	                    'true': !0,
	                    'yes': !0,
	                    '0': !0,
	                    'false': !0,
	                    'no': !0,
	                    'unspecified': !0,
	                    'null': !0,
	                    'undefined': !0,
	                };
	                if (!trusted[globalPrivacyControl]) {
	                    sendToTrash('globalPrivacyControl - unusual result', globalPrivacyControl);
	                }
	                return globalPrivacyControl;
	            }, 'globalPrivacyControl failed'),
	            hardwareConcurrency: attempt(() => {
	                if (!('hardwareConcurrency' in navigator)) {
	                    return undefined;
	                }
	                const { hardwareConcurrency } = navigator;
	                if (workerScope && hardwareConcurrency !== workerScope.hardwareConcurrency) ;
	                return hardwareConcurrency;
	            }, 'hardwareConcurrency failed'),
	            language: attempt(() => {
	                const { language, languages } = navigator;
	                if (language && languages) {
	                    // @ts-ignore
	                    const lang = /^.{0,2}/g.exec(language)[0];
	                    // @ts-ignore
	                    const langs = /^.{0,2}/g.exec(languages[0])[0];
	                    if (langs != lang) {
	                        sendToTrash('language/languages', `${[language, languages].join(' ')} mismatch`);
	                    }
	                    return `${languages.join(', ')} (${language})`;
	                }
	                if (workerScope && language != workerScope.language) ;
	                if (workerScope && languages !== workerScope.languages) ;
	                return `${language} ${languages}`;
	            }, 'language(s) failed'),
	            maxTouchPoints: attempt(() => {
	                if (!('maxTouchPoints' in navigator)) {
	                    return null;
	                }
	                return navigator.maxTouchPoints;
	            }, 'maxTouchPoints failed'),
	            vendor: attempt(() => navigator.vendor, 'vendor failed'),
	            mimeTypes: attempt(() => {
	                const { mimeTypes } = navigator;
	                return mimeTypes ? [...mimeTypes].map((m) => m.type) : [];
	            }, 'mimeTypes failed'),
	            // @ts-ignore
	            oscpu: attempt(() => navigator.oscpu, 'oscpu failed'),
	            plugins: attempt(() => {
	                // https://html.spec.whatwg.org/multipage/system-state.html#pdf-viewing-support
	                const { plugins } = navigator;
	                if (!(plugins instanceof PluginArray)) {
	                    return;
	                }
	                const response = plugins ? [...plugins]
	                    .map((p) => ({
	                    name: p.name,
	                    description: p.description,
	                    filename: p.filename,
	                    // @ts-ignore
	                    version: p.version,
	                })) : [];
	                const { lies } = getPluginLies(plugins, navigator.mimeTypes);
	                if (lies.length) {
	                    lied = true;
	                    lies.forEach((lie) => {
	                        return documentLie(`Navigator.plugins`, lie);
	                    });
	                }
	                if (response.length) {
	                    response.forEach((plugin) => {
	                        const { name, description } = plugin;
	                        const nameGibbers = gibberish(name);
	                        const descriptionGibbers = gibberish(description);
	                        if (nameGibbers.length) {
	                            sendToTrash(`plugin name is gibberish`, name);
	                        }
	                        if (descriptionGibbers.length) {
	                            sendToTrash(`plugin description is gibberish`, description);
	                        }
	                        return;
	                    });
	                }
	                return response;
	            }, 'plugins failed'),
	            properties: attempt(() => {
	                const keys = Object.keys(Object.getPrototypeOf(navigator));
	                return keys;
	            }, 'navigator keys failed'),
	        };
	        const getUserAgentData = () => attempt(() => {
	            // @ts-ignore
	            if (!navigator.userAgentData ||
	                // @ts-ignore
	                !navigator.userAgentData.getHighEntropyValues) {
	                return;
	            }
	            // @ts-ignore
	            return navigator.userAgentData.getHighEntropyValues(['platform', 'platformVersion', 'architecture', 'bitness', 'model', 'uaFullVersion']).then((data) => {
	                // @ts-ignore
	                const { brands, mobile } = navigator.userAgentData || {};
	                const compressedBrands = (brands, captureVersion = false) => brands
	                    .filter((obj) => !/Not/.test(obj.brand)).map((obj) => `${obj.brand}${captureVersion ? ` ${obj.version}` : ''}`);
	                const removeChromium = (brands) => (brands.length > 1 ? brands.filter((brand) => !/Chromium/.test(brand)) : brands);
	                // compress brands
	                if (!data.brands) {
	                    data.brands = brands;
	                }
	                data.brandsVersion = compressedBrands(data.brands, true);
	                data.brands = compressedBrands(data.brands);
	                data.brandsVersion = removeChromium(data.brandsVersion);
	                data.brands = removeChromium(data.brands);
	                if (!data.mobile) {
	                    data.mobile = mobile;
	                }
	                const dataSorted = Object.keys(data).sort().reduce((acc, key) => {
	                    acc[key] = data[key];
	                    return acc;
	                }, {});
	                return dataSorted;
	            });
	        }, 'userAgentData failed');
	        const getBluetoothAvailability = () => attempt(() => {
	            if (!('bluetooth' in navigator) ||
	                // @ts-ignore
	                !navigator.bluetooth ||
	                // @ts-ignore
	                !navigator.bluetooth.getAvailability) {
	                return undefined;
	            }
	            // @ts-ignore
	            return navigator.bluetooth.getAvailability();
	        }, 'bluetoothAvailability failed');
	        const getPermissions = () => attempt(() => {
	            const getPermissionState = (name) => navigator.permissions.query({ name })
	                .then((res) => ({ name, state: res.state }))
	                .catch((error) => ({ name, state: 'unknown' }));
	            // https://w3c.github.io/permissions/#permission-registry
	            const permissions = !('permissions' in navigator) ? undefined : Promise.all([
	                getPermissionState('accelerometer'),
	                getPermissionState('ambient-light-sensor'),
	                getPermissionState('background-fetch'),
	                getPermissionState('background-sync'),
	                getPermissionState('bluetooth'),
	                getPermissionState('camera'),
	                getPermissionState('clipboard'),
	                getPermissionState('device-info'),
	                getPermissionState('display-capture'),
	                getPermissionState('gamepad'),
	                getPermissionState('geolocation'),
	                getPermissionState('gyroscope'),
	                getPermissionState('magnetometer'),
	                getPermissionState('microphone'),
	                getPermissionState('midi'),
	                getPermissionState('nfc'),
	                getPermissionState('notifications'),
	                getPermissionState('persistent-storage'),
	                getPermissionState('push'),
	                getPermissionState('screen-wake-lock'),
	                getPermissionState('speaker'),
	                getPermissionState('speaker-selection'),
	            ]).then((permissions) => permissions.reduce((acc, perm) => {
	                const { state, name } = perm || {};
	                if (acc[state]) {
	                    acc[state].push(name);
	                    return acc;
	                }
	                acc[state] = [name];
	                return acc;
	            }, {})).catch((error) => console.error(error));
	            return permissions;
	        }, 'permissions failed');
	        const getWebGpu = () => attempt(() => {
	            if (!('gpu' in navigator)) {
	                return;
	            }
	            // @ts-expect-error if unsupported
	            return navigator.gpu.requestAdapter().then((adapter) => {
	                if (!adapter)
	                    return;
	                const { limits = {}, features = [] } = adapter || {};
	                // @ts-expect-error if unsupported
	                const handleInfo = (info) => {
	                    const { architecture, description, device, vendor } = info;
	                    const adapterInfo = [vendor, architecture, description, device];
	                    const featureValues = [...features.values()];
	                    const limitsData = ((limits) => {
	                        const data = {};
	                        // eslint-disable-next-line guard-for-in
	                        for (const prop in limits) {
	                            data[prop] = limits[prop];
	                        }
	                        return data;
	                    })(limits);
	                    Analysis.webGpuAdapter = adapterInfo;
	                    Analysis.webGpuFeatures = featureValues;
	                    Analysis.webGpuLimits = hashMini(limitsData);
	                    return {
	                        adapterInfo,
	                        limits: limitsData,
	                    };
	                };
	                const { info } = adapter;
	                return info ? handleInfo(info) : adapter.requestAdapterInfo().then(handleInfo);
	            });
	        }, 'webgpu failed');
	        await queueEvent(timer);
	        return Promise.all([
	            getUserAgentData(),
	            getBluetoothAvailability(),
	            getPermissions(),
	            getWebGpu(),
	        ]).then(([userAgentData, bluetoothAvailability, permissions, webgpu,]) => {
	            logTestResult({ time: timer.stop(), test: 'navigator', passed: true });
	            return {
	                ...data,
	                userAgentData,
	                bluetoothAvailability,
	                permissions,
	                webgpu,
	                lied,
	            };
	        }).catch((error) => {
	            console.error(error);
	            logTestResult({ time: timer.stop(), test: 'navigator', passed: true });
	            return {
	                ...data,
	                lied,
	            };
	        });
	    }
	    catch (error) {
	        logTestResult({ test: 'navigator', passed: false });
	        captureError(error, 'Navigator failed or blocked by client');
	        return;
	    }
	}

	// inspired by https://arkenfox.github.io/TZP/tests/canvasnoise.html
	let pixelImageRandom = '';
	const getPixelMods = () => {
	    const pattern1 = [];
	    const pattern2 = [];
	    const len = 8; // canvas dimensions
	    const alpha = 255;
	    const visualMultiplier = 5;
	    try {
	        // create 2 canvas contexts
	        const options = {
	            willReadFrequently: true,
	            desynchronized: true,
	        };
	        const canvasDisplay1 = document.createElement('canvas');
	        const canvasDisplay2 = document.createElement('canvas');
	        const canvas1 = document.createElement('canvas');
	        const canvas2 = document.createElement('canvas');
	        const contextDisplay1 = canvasDisplay1.getContext('2d', options);
	        const contextDisplay2 = canvasDisplay2.getContext('2d', options);
	        const context1 = canvas1.getContext('2d', options);
	        const context2 = canvas2.getContext('2d', options);
	        if (!contextDisplay1 || !contextDisplay2 || !context1 || !context2) {
	            throw new Error('canvas context blocked');
	        }
	        // set the dimensions
	        canvasDisplay1.width = len * visualMultiplier;
	        canvasDisplay1.height = len * visualMultiplier;
	        canvasDisplay2.width = len * visualMultiplier;
	        canvasDisplay2.height = len * visualMultiplier;
	        canvas1.width = len;
	        canvas1.height = len;
	        canvas2.width = len;
	        canvas2.height = len;
	        [...Array(len)].forEach((e, x) => [...Array(len)].forEach((e, y) => {
	            const red = ~~(Math.random() * 256);
	            const green = ~~(Math.random() * 256);
	            const blue = ~~(Math.random() * 256);
	            const colors = `${red}, ${green}, ${blue}, ${alpha}`;
	            context1.fillStyle = `rgba(${colors})`;
	            context1.fillRect(x, y, 1, 1);
	            // capture data in visuals
	            contextDisplay1.fillStyle = `rgba(${colors})`;
	            contextDisplay1.fillRect(x * visualMultiplier, y * visualMultiplier, 1 * visualMultiplier, 1 * visualMultiplier);
	            return pattern1.push(colors); // collect the pixel pattern
	        }));
	        [...Array(len)].forEach((e, x) => [...Array(len)].forEach((e, y) => {
	            // get context1 pixel data and mirror to context2
	            const { data: [red, green, blue, alpha], } = context1.getImageData(x, y, 1, 1) || {};
	            const colors = `${red}, ${green}, ${blue}, ${alpha}`;
	            context2.fillStyle = `rgba(${colors})`;
	            context2.fillRect(x, y, 1, 1);
	            // capture noise in visuals
	            const { data: [red2, green2, blue2, alpha2], } = context2.getImageData(x, y, 1, 1) || {};
	            const colorsDisplay = `
				${red != red2 ? red2 : 255},
				${green != green2 ? green2 : 255},
				${blue != blue2 ? blue2 : 255},
				${alpha != alpha2 ? alpha2 : 1}
			`;
	            contextDisplay2.fillStyle = `rgba(${colorsDisplay})`;
	            contextDisplay2.fillRect(x * visualMultiplier, y * visualMultiplier, 1 * visualMultiplier, 1 * visualMultiplier);
	            return pattern2.push(colors); // collect the pixel pattern
	        }));
	        // compare the pattern collections and collect diffs
	        const patternDiffs = [];
	        const rgbaChannels = new Set();
	        [...Array(pattern1.length)].forEach((e, i) => {
	            const pixelColor1 = pattern1[i];
	            const pixelColor2 = pattern2[i];
	            if (pixelColor1 != pixelColor2) {
	                const rgbaValues1 = pixelColor1.split(',');
	                const rgbaValues2 = pixelColor2.split(',');
	                const colors = [
	                    rgbaValues1[0] != rgbaValues2[0] ? 'r' : '',
	                    rgbaValues1[1] != rgbaValues2[1] ? 'g' : '',
	                    rgbaValues1[2] != rgbaValues2[2] ? 'b' : '',
	                    rgbaValues1[3] != rgbaValues2[3] ? 'a' : '',
	                ].join('');
	                rgbaChannels.add(colors);
	                patternDiffs.push([i, colors]);
	            }
	        });
	        pixelImageRandom = canvasDisplay1.toDataURL(); // template use only
	        const pixelImage = canvasDisplay2.toDataURL();
	        const rgba = rgbaChannels.size ? [...rgbaChannels].sort().join(', ') : undefined;
	        const pixels = patternDiffs.length || undefined;
	        return { rgba, pixels, pixelImage };
	    }
	    catch (error) {
	        return console.error(error);
	    }
	};
	// based on and inspired by https://github.com/antoinevastel/picasso-like-canvas-fingerprinting
	const paintCanvas = ({ canvas, context, strokeText = false, cssFontFamily = '', area = { width: 50, height: 50 }, rounds = 10, maxShadowBlur = 50, seed = 500, offset = 2001000001, multiplier = 15000, }) => {
	    if (!context) {
	        return;
	    }
	    context.clearRect(0, 0, canvas.width, canvas.height);
	    canvas.width = area.width;
	    canvas.height = area.height;
	    if (canvas.style) {
	        canvas.style.display = 'none';
	    }
	    const createPicassoSeed = ({ seed, offset, multiplier }) => {
	        let current = Number(seed) % Number(offset);
	        const getNextSeed = () => {
	            current = (Number(multiplier) * current) % Number(offset);
	            return current;
	        };
	        return {
	            getNextSeed,
	        };
	    };
	    const picassoSeed = createPicassoSeed({ seed, offset, multiplier });
	    const { getNextSeed } = picassoSeed;
	    const patchSeed = (current, offset, maxBound, computeFloat) => {
	        const result = (((current - 1) / offset) * (maxBound || 1)) || 0;
	        return computeFloat ? result : Math.floor(result);
	    };
	    const addRandomCanvasGradient = (context, offset, area, colors, getNextSeed) => {
	        const { width, height } = area;
	        const canvasGradient = context.createRadialGradient(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width));
	        canvasGradient.addColorStop(0, colors[patchSeed(getNextSeed(), offset, colors.length)]);
	        canvasGradient.addColorStop(1, colors[patchSeed(getNextSeed(), offset, colors.length)]);
	        context.fillStyle = canvasGradient;
	    };
	    const colors = [
	        '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
	        '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
	        '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
	        '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
	        '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
	        '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
	        '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
	        '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
	        '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
	        '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF',
	    ];
	    const drawOutlineOfText = (context, offset, area, getNextSeed) => {
	        const { width, height } = area;
	        const fontSize = 2.99;
	        context.font = `${height / fontSize}px ${cssFontFamily.replace(/!important/gm, '')}`;
	        context.strokeText('👾A', patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width));
	    };
	    const createCircularArc = (context, offset, area, getNextSeed) => {
	        const { width, height } = area;
	        context.beginPath();
	        context.arc(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, Math.min(width, height)), patchSeed(getNextSeed(), offset, 2 * Math.PI, true), patchSeed(getNextSeed(), offset, 2 * Math.PI, true));
	        context.stroke();
	    };
	    const createBezierCurve = (context, offset, area, getNextSeed) => {
	        const { width, height } = area;
	        context.beginPath();
	        context.moveTo(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height));
	        context.bezierCurveTo(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height));
	        context.stroke();
	    };
	    const createQuadraticCurve = (context, offset, area, getNextSeed) => {
	        const { width, height } = area;
	        context.beginPath();
	        context.moveTo(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height));
	        context.quadraticCurveTo(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height));
	        context.stroke();
	    };
	    const createEllipticalArc = (context, offset, area, getNextSeed) => {
	        if (!('ellipse' in context)) {
	            return;
	        }
	        const { width, height } = area;
	        context.beginPath();
	        context.ellipse(patchSeed(getNextSeed(), offset, width), patchSeed(getNextSeed(), offset, height), patchSeed(getNextSeed(), offset, Math.floor(width / 2)), patchSeed(getNextSeed(), offset, Math.floor(height / 2)), patchSeed(getNextSeed(), offset, 2 * Math.PI, true), patchSeed(getNextSeed(), offset, 2 * Math.PI, true), patchSeed(getNextSeed(), offset, 2 * Math.PI, true));
	        context.stroke();
	    };
	    const methods = [
	        createCircularArc,
	        createBezierCurve,
	        createQuadraticCurve,
	    ];
	    if (!IS_WEBKIT)
	        methods.push(createEllipticalArc); // unstable in webkit
	    if (strokeText)
	        methods.push(drawOutlineOfText);
	    [...Array(rounds)].forEach((x) => {
	        addRandomCanvasGradient(context, offset, area, colors, getNextSeed);
	        context.shadowBlur = patchSeed(getNextSeed(), offset, maxShadowBlur, true);
	        context.shadowColor = colors[patchSeed(getNextSeed(), offset, colors.length)];
	        const nextMethod = methods[patchSeed(getNextSeed(), offset, methods.length)];
	        nextMethod(context, offset, area, getNextSeed);
	        context.fill();
	    });
	    return;
	};
	async function getCanvas2d() {
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        const dataLie = lieProps['HTMLCanvasElement.toDataURL'];
	        const contextLie = lieProps['HTMLCanvasElement.getContext'];
	        const imageDataLie = (lieProps['CanvasRenderingContext2D.fillText'] ||
	            lieProps['CanvasRenderingContext2D.font'] ||
	            lieProps['CanvasRenderingContext2D.getImageData'] ||
	            lieProps['CanvasRenderingContext2D.strokeText']);
	        const codePointLie = lieProps['String.fromCodePoint'];
	        let textMetricsLie = (lieProps['CanvasRenderingContext2D.measureText'] ||
	            lieProps['TextMetrics.actualBoundingBoxAscent'] ||
	            lieProps['TextMetrics.actualBoundingBoxDescent'] ||
	            lieProps['TextMetrics.actualBoundingBoxLeft'] ||
	            lieProps['TextMetrics.actualBoundingBoxRight'] ||
	            lieProps['TextMetrics.fontBoundingBoxAscent'] ||
	            lieProps['TextMetrics.fontBoundingBoxDescent'] ||
	            lieProps['TextMetrics.width']);
	        let lied = (dataLie ||
	            contextLie ||
	            imageDataLie ||
	            textMetricsLie ||
	            codePointLie) || false;
	        // create canvas context
	        let win = window;
	        if (!LIKE_BRAVE && PHANTOM_DARKNESS) {
	            win = PHANTOM_DARKNESS;
	        }
	        const doc = win.document;
	        const canvas = doc.createElement('canvas');
	        const context = canvas.getContext('2d');
	        const canvasCPU = doc.createElement('canvas');
	        const contextCPU = canvasCPU.getContext('2d', {
	            desynchronized: true,
	            willReadFrequently: true,
	        });
	        if (!context) {
	            throw new Error('canvas context blocked');
	        }
	        await queueEvent(timer);
	        const imageSizeMax = IS_WEBKIT ? 50 : 75; // webkit is unstable
	        paintCanvas({
	            canvas,
	            context,
	            strokeText: true,
	            cssFontFamily: CSS_FONT_FAMILY,
	            area: { width: imageSizeMax, height: imageSizeMax },
	            rounds: 10,
	        });
	        const dataURI = canvas.toDataURL();
	        await queueEvent(timer);
	        const mods = getPixelMods();
	        // TextMetrics: get emoji set and system
	        await queueEvent(timer);
	        context.font = `10px ${CSS_FONT_FAMILY.replace(/!important/gm, '')}`;
	        const pattern = new Set();
	        const emojiSet = EMOJIS.reduce((emojiSet, emoji) => {
	            const { actualBoundingBoxAscent, actualBoundingBoxDescent, actualBoundingBoxLeft, actualBoundingBoxRight, fontBoundingBoxAscent, fontBoundingBoxDescent, width, } = context.measureText(emoji) || {};
	            const dimensions = [
	                actualBoundingBoxAscent,
	                actualBoundingBoxDescent,
	                actualBoundingBoxLeft,
	                actualBoundingBoxRight,
	                fontBoundingBoxAscent,
	                fontBoundingBoxDescent,
	                width,
	            ].join(',');
	            if (!pattern.has(dimensions)) {
	                pattern.add(dimensions);
	                emojiSet.add(emoji);
	            }
	            return emojiSet;
	        }, new Set());
	        // textMetrics System Sum
	        const textMetricsSystemSum = 0.00001 * [...pattern].map((x) => {
	            return x.split(',').reduce((acc, x) => acc += (+x || 0), 0);
	        }).reduce((acc, x) => acc += x, 0);
	        // Paint
	        const maxSize = 75;
	        await queueEvent(timer);
	        paintCanvas({
	            canvas,
	            context,
	            area: { width: maxSize, height: maxSize },
	        }); // clears image
	        const paintURI = canvas.toDataURL();
	        // Paint with CPU
	        await queueEvent(timer);
	        paintCanvas({
	            canvas: canvasCPU,
	            context: contextCPU,
	            area: { width: maxSize, height: maxSize },
	        }); // clears image
	        const paintCpuURI = canvasCPU.toDataURL();
	        // Text
	        context.restore();
	        context.clearRect(0, 0, canvas.width, canvas.height);
	        canvas.width = 50;
	        canvas.height = 50;
	        context.font = `50px ${CSS_FONT_FAMILY.replace(/!important/gm, '')}`;
	        context.fillText('A', 7, 37);
	        const textURI = canvas.toDataURL();
	        // Emoji
	        context.restore();
	        context.clearRect(0, 0, canvas.width, canvas.height);
	        canvas.width = 50;
	        canvas.height = 50;
	        context.font = `35px ${CSS_FONT_FAMILY.replace(/!important/gm, '')}`;
	        context.fillText('👾', 0, 37);
	        const emojiURI = canvas.toDataURL();
	        // lies
	        context.clearRect(0, 0, canvas.width, canvas.height);
	        if ((mods && mods.pixels) || !!Math.max(...context.getImageData(0, 0, 8, 8).data)) {
	            lied = true;
	            documentLie(`CanvasRenderingContext2D.getImageData`, `pixel data modified`);
	        }
	        // verify low entropy image data
	        canvas.width = 2;
	        canvas.height = 2;
	        context.fillStyle = '#000';
	        context.fillRect(0, 0, canvas.width, canvas.height);
	        context.fillStyle = '#fff';
	        context.fillRect(2, 2, 1, 1);
	        context.beginPath();
	        context.arc(0, 0, 2, 0, 1, true);
	        context.closePath();
	        context.fill();
	        const imageDataLowEntropy = context.getImageData(0, 0, 2, 2).data.join('');
	        const KnownImageData = {
	            BLINK: [
	                '255255255255178178178255246246246255555555255',
	                '255255255255192192192255240240240255484848255',
	                '255255255255177177177255246246246255535353255',
	                '255255255255128128128255191191191255646464255',
	                '255255255255178178178255247247247255565656255', // ?
	                '255255255255174174174255242242242255474747255',
	                '255255255255229229229255127127127255686868255',
	                '255255255255192192192255244244244255535353255',
	            ],
	            GECKO: [
	                '255255255255191191191255207207207255646464255',
	                '255255255255192192192255240240240255484848255',
	                '255255255255191191191255239239239255646464255',
	                '255255255255191191191255223223223255606060255', // ?
	                '255255255255171171171255223223223255606060255', // ?
	                '255255255255188188188255245245245255525252255',
	            ],
	            WEBKIT: [
	                '255255255255185185185255233233233255474747255',
	                '255255255255185185185255229229229255474747255',
	                '255255255255185185185255218218218255474747255',
	                '255255255255192192192255240240240255484848255',
	                '255255255255178178178255247247247255565656255',
	                '255255255255178178178255247247247255565656255',
	                '255255255255192192192255240240240255484848255',
	                '255255255255186186186255218218218255464646255',
	            ],
	        };
	        Analysis.imageDataLowEntropy = imageDataLowEntropy;
	        if (IS_BLINK && !KnownImageData.BLINK.includes(imageDataLowEntropy)) {
	            LowerEntropy.CANVAS = true;
	        }
	        else if (IS_GECKO && !KnownImageData.GECKO.includes(imageDataLowEntropy)) {
	            LowerEntropy.CANVAS = true;
	        }
	        else if (IS_WEBKIT && !KnownImageData.WEBKIT.includes(imageDataLowEntropy)) {
	            LowerEntropy.CANVAS = true;
	        }
	        if (LowerEntropy.CANVAS) {
	            sendToTrash('CanvasRenderingContext2D.getImageData', 'suspicious pixel data');
	        }
	        const getTextMetricsFloatLie = (context) => {
	            const isFloat = (n) => n % 1 !== 0;
	            const { actualBoundingBoxAscent: abba, actualBoundingBoxDescent: abbd, actualBoundingBoxLeft: abbl, actualBoundingBoxRight: abbr, fontBoundingBoxAscent: fbba, fontBoundingBoxDescent: fbbd,
	            // width: w,
	             } = context.measureText('') || {};
	            const lied = [
	                abba,
	                abbd,
	                abbl,
	                abbr,
	                fbba,
	                fbbd,
	            ].find((x) => isFloat((x || 0)));
	            return lied;
	        };
	        await queueEvent(timer);
	        if (getTextMetricsFloatLie(context)) {
	            textMetricsLie = true;
	            lied = true;
	            documentLie('CanvasRenderingContext2D.measureText', 'metric noise detected');
	        }
	        logTestResult({ time: timer.stop(), test: 'canvas 2d', passed: true });
	        return {
	            dataURI,
	            paintURI,
	            paintCpuURI,
	            textURI,
	            emojiURI,
	            mods,
	            textMetricsSystemSum,
	            liedTextMetrics: textMetricsLie,
	            emojiSet: [...emojiSet],
	            lied,
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'canvas 2d', passed: false });
	        captureError(error);
	        return;
	    }
	}

	const AUDIO_TRAP = Math.random();
	async function hasFakeAudio() {
	    const context = new OfflineAudioContext(1, 100, 44100);
	    const oscillator = context.createOscillator();
	    oscillator.frequency.value = 0;
	    oscillator.start(0);
	    context.startRendering();
	    return new Promise((resolve) => {
	        context.oncomplete = (event) => {
	            const channelData = event.renderedBuffer.getChannelData?.(0);
	            if (!channelData)
	                resolve(false);
	            resolve('' + [...new Set(channelData)] !== '0');
	        };
	    }).finally(() => oscillator.disconnect());
	}
	async function getOfflineAudioContext() {
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        try {
	            // @ts-expect-error if unsupported
	            window.OfflineAudioContext = OfflineAudioContext || webkitOfflineAudioContext;
	        }
	        catch (err) { }
	        if (!window.OfflineAudioContext) {
	            logTestResult({ test: 'audio', passed: false });
	            return;
	        }
	        // detect lies
	        const channelDataLie = lieProps['AudioBuffer.getChannelData'];
	        const copyFromChannelLie = lieProps['AudioBuffer.copyFromChannel'];
	        let lied = (channelDataLie || copyFromChannelLie) || false;
	        const bufferLen = 5000;
	        const context = new OfflineAudioContext(1, bufferLen, 44100);
	        const analyser = context.createAnalyser();
	        const oscillator = context.createOscillator();
	        const dynamicsCompressor = context.createDynamicsCompressor();
	        const biquadFilter = context.createBiquadFilter();
	        // detect lie
	        const dataArray = new Float32Array(analyser.frequencyBinCount);
	        analyser.getFloatFrequencyData?.(dataArray);
	        const floatFrequencyUniqueDataSize = new Set(dataArray).size;
	        if (floatFrequencyUniqueDataSize > 1) {
	            lied = true;
	            const floatFrequencyDataLie = `expected -Infinity (silence) and got ${floatFrequencyUniqueDataSize} frequencies`;
	            documentLie(`AnalyserNode.getFloatFrequencyData`, floatFrequencyDataLie);
	        }
	        const values = {
	            ['AnalyserNode.channelCount']: attempt(() => analyser.channelCount),
	            ['AnalyserNode.channelCountMode']: attempt(() => analyser.channelCountMode),
	            ['AnalyserNode.channelInterpretation']: attempt(() => analyser.channelInterpretation),
	            ['AnalyserNode.context.sampleRate']: attempt(() => analyser.context.sampleRate),
	            ['AnalyserNode.fftSize']: attempt(() => analyser.fftSize),
	            ['AnalyserNode.frequencyBinCount']: attempt(() => analyser.frequencyBinCount),
	            ['AnalyserNode.maxDecibels']: attempt(() => analyser.maxDecibels),
	            ['AnalyserNode.minDecibels']: attempt(() => analyser.minDecibels),
	            ['AnalyserNode.numberOfInputs']: attempt(() => analyser.numberOfInputs),
	            ['AnalyserNode.numberOfOutputs']: attempt(() => analyser.numberOfOutputs),
	            ['AnalyserNode.smoothingTimeConstant']: attempt(() => analyser.smoothingTimeConstant),
	            ['AnalyserNode.context.listener.forwardX.maxValue']: attempt(() => {
	                return caniuse(() => analyser.context.listener.forwardX.maxValue);
	            }),
	            ['BiquadFilterNode.gain.maxValue']: attempt(() => biquadFilter.gain.maxValue),
	            ['BiquadFilterNode.frequency.defaultValue']: attempt(() => biquadFilter.frequency.defaultValue),
	            ['BiquadFilterNode.frequency.maxValue']: attempt(() => biquadFilter.frequency.maxValue),
	            ['DynamicsCompressorNode.attack.defaultValue']: attempt(() => dynamicsCompressor.attack.defaultValue),
	            ['DynamicsCompressorNode.knee.defaultValue']: attempt(() => dynamicsCompressor.knee.defaultValue),
	            ['DynamicsCompressorNode.knee.maxValue']: attempt(() => dynamicsCompressor.knee.maxValue),
	            ['DynamicsCompressorNode.ratio.defaultValue']: attempt(() => dynamicsCompressor.ratio.defaultValue),
	            ['DynamicsCompressorNode.ratio.maxValue']: attempt(() => dynamicsCompressor.ratio.maxValue),
	            ['DynamicsCompressorNode.release.defaultValue']: attempt(() => dynamicsCompressor.release.defaultValue),
	            ['DynamicsCompressorNode.release.maxValue']: attempt(() => dynamicsCompressor.release.maxValue),
	            ['DynamicsCompressorNode.threshold.defaultValue']: attempt(() => dynamicsCompressor.threshold.defaultValue),
	            ['DynamicsCompressorNode.threshold.minValue']: attempt(() => dynamicsCompressor.threshold.minValue),
	            ['OscillatorNode.detune.maxValue']: attempt(() => oscillator.detune.maxValue),
	            ['OscillatorNode.detune.minValue']: attempt(() => oscillator.detune.minValue),
	            ['OscillatorNode.frequency.defaultValue']: attempt(() => oscillator.frequency.defaultValue),
	            ['OscillatorNode.frequency.maxValue']: attempt(() => oscillator.frequency.maxValue),
	            ['OscillatorNode.frequency.minValue']: attempt(() => oscillator.frequency.minValue),
	        };
	        const getRenderedBuffer = (context) => (new Promise((resolve) => {
	            const analyser = context.createAnalyser();
	            const oscillator = context.createOscillator();
	            const dynamicsCompressor = context.createDynamicsCompressor();
	            try {
	                oscillator.type = 'triangle';
	                oscillator.frequency.value = 10000;
	                dynamicsCompressor.threshold.value = -50;
	                dynamicsCompressor.knee.value = 40;
	                dynamicsCompressor.attack.value = 0;
	            }
	            catch (err) { }
	            oscillator.connect(dynamicsCompressor);
	            dynamicsCompressor.connect(analyser);
	            dynamicsCompressor.connect(context.destination);
	            oscillator.start(0);
	            context.startRendering();
	            return context.addEventListener('complete', (event) => {
	                try {
	                    dynamicsCompressor.disconnect();
	                    oscillator.disconnect();
	                    const floatFrequencyData = new Float32Array(analyser.frequencyBinCount);
	                    analyser.getFloatFrequencyData?.(floatFrequencyData);
	                    const floatTimeDomainData = new Float32Array(analyser.fftSize);
	                    if ('getFloatTimeDomainData' in analyser) {
	                        analyser.getFloatTimeDomainData(floatTimeDomainData);
	                    }
	                    return resolve({
	                        floatFrequencyData,
	                        floatTimeDomainData,
	                        buffer: event.renderedBuffer,
	                        compressorGainReduction: (
	                        // @ts-expect-error if unsupported
	                        dynamicsCompressor.reduction.value || // webkit
	                            dynamicsCompressor.reduction),
	                    });
	                }
	                catch (error) {
	                    return resolve(null);
	                }
	            });
	        }));
	        await queueEvent(timer);
	        const [audioData, audioIsFake,] = await Promise.all([
	            getRenderedBuffer(new OfflineAudioContext(1, bufferLen, 44100)),
	            hasFakeAudio().catch(() => false),
	        ]);
	        const { floatFrequencyData, floatTimeDomainData, buffer, compressorGainReduction, } = audioData || {};
	        await queueEvent(timer);
	        const getSnapshot = (arr, start, end) => {
	            const collection = [];
	            for (let i = start; i < end; i++) {
	                collection.push(arr[i]);
	            }
	            return collection;
	        };
	        const getSum = (arr) => !arr ? 0 : [...arr]
	            .reduce((acc, curr) => (acc += Math.abs(curr)), 0);
	        const floatFrequencyDataSum = getSum(floatFrequencyData);
	        const floatTimeDomainDataSum = getSum(floatTimeDomainData);
	        const copy = new Float32Array(bufferLen);
	        let bins = new Float32Array();
	        if (buffer) {
	            buffer.copyFromChannel?.(copy, 0);
	            bins = buffer.getChannelData?.(0) || [];
	        }
	        const copySample = getSnapshot([...copy], 4500, 4600);
	        const binsSample = getSnapshot([...bins], 4500, 4600);
	        const sampleSum = getSum(getSnapshot([...bins], 4500, bufferLen));
	        // detect lies
	        if (audioIsFake) {
	            lied = true;
	            documentLie('AudioBuffer', 'audio is fake');
	        }
	        // sample matching
	        const matching = '' + binsSample == '' + copySample;
	        const copyFromChannelSupported = ('copyFromChannel' in AudioBuffer.prototype);
	        if (copyFromChannelSupported && !matching) {
	            lied = true;
	            const audioSampleLie = 'getChannelData and copyFromChannel samples mismatch';
	            documentLie('AudioBuffer', audioSampleLie);
	        }
	        // sample uniqueness
	        const totalUniqueSamples = new Set([...bins]).size;
	        if (totalUniqueSamples == bufferLen) {
	            const audioUniquenessTrash = `${totalUniqueSamples} unique samples of ${bufferLen} is too high`;
	            sendToTrash('AudioBuffer', audioUniquenessTrash);
	        }
	        // sample noise factor
	        const getRandFromRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
	        const getCopyFrom = (rand, buffer, copy) => {
	            const { length } = buffer;
	            const max = 20;
	            const start = getRandFromRange(275, length - (max + 1));
	            const mid = start + max / 2;
	            const end = start + max;
	            buffer.getChannelData(0)[start] = rand;
	            buffer.getChannelData(0)[mid] = rand;
	            buffer.getChannelData(0)[end] = rand;
	            buffer.copyFromChannel(copy, 0);
	            const attack = [
	                buffer.getChannelData(0)[start] === 0 ? Math.random() : 0,
	                buffer.getChannelData(0)[mid] === 0 ? Math.random() : 0,
	                buffer.getChannelData(0)[end] === 0 ? Math.random() : 0,
	            ];
	            return [...new Set([...buffer.getChannelData(0), ...copy, ...attack])].filter((x) => x !== 0);
	        };
	        const getCopyTo = (rand, buffer, copy) => {
	            buffer.copyToChannel(copy.map(() => rand), 0);
	            const frequency = buffer.getChannelData(0)[0];
	            const dataAttacked = [...buffer.getChannelData(0)]
	                .map((x) => x !== frequency || !x ? Math.random() : x);
	            return dataAttacked.filter((x) => x !== frequency);
	        };
	        const getNoiseFactor = () => {
	            const length = 2000;
	            try {
	                const result = [...new Set([
	                        ...getCopyFrom(AUDIO_TRAP, new AudioBuffer({ length, sampleRate: 44100 }), new Float32Array(length)),
	                        ...getCopyTo(AUDIO_TRAP, new AudioBuffer({ length, sampleRate: 44100 }), new Float32Array(length)),
	                    ])];
	                return +(result.length !== 1 &&
	                    result.reduce((acc, n) => acc += +n, 0));
	            }
	            catch (error) {
	                console.error(error);
	                return 0;
	            }
	        };
	        const noiseFactor = getNoiseFactor();
	        const noise = (noiseFactor || [...new Set(bins.slice(0, 100))]
	            .reduce((acc, n) => acc += n, 0));
	        // Locked Patterns
	        const known = {
	            /* BLINK */
	            // 124.04347527516074/124.04347518575378
	            '-20.538286209106445,164537.64796829224,502.5999283068122': [124.04347527516074],
	            '-20.538288116455078,164537.64796829224,502.5999283068122': [124.04347527516074],
	            '-20.538288116455078,164537.64795303345,502.5999283068122': [
	                124.04347527516074,
	                124.04347518575378,
	                // sus:
	                124.04347519320436,
	                124.04347523045726,
	            ],
	            '-20.538286209106445,164537.64805984497,502.5999283068122': [124.04347527516074],
	            '-20.538288116455078,164537.64805984497,502.5999283068122': [
	                124.04347527516074,
	                124.04347518575378,
	                // sus
	                124.04347520065494,
	                124.04347523790784,
	                124.043475252809,
	                124.04347526025958,
	                124.04347522300668,
	                124.04347523045726,
	                124.04347524535842,
	            ],
	            // 124.04344884395687
	            '-20.538288116455078,164881.9727935791,502.59990317908887': [124.04344884395687],
	            '-20.538288116455078,164881.9729309082,502.59990317908887': [124.04344884395687],
	            // 124.0434488439787
	            '-20.538286209106445,164882.2082748413,502.59990317911434': [124.0434488439787],
	            '-20.538288116455078,164882.20836639404,502.59990317911434': [124.0434488439787],
	            // 124.04344968475198
	            '-20.538286209106445,164863.45319366455,502.5999033495791': [124.04344968475198],
	            '-20.538288116455078,164863.45319366455,502.5999033495791': [
	                124.04344968475198,
	                124.04375314689969, // rare
	                // sus
	                124.04341541208123,
	            ],
	            // 124.04347503720783 (rare)
	            '-20.538288116455078,164531.82670593262,502.59992767886797': [
	                124.04347503720783,
	                // sus
	                124.04347494780086,
	                124.04347495525144,
	                124.04347499250434,
	                124.0434750074055,
	            ],
	            // 124.04347657808103
	            '-20.538286209106445,164540.1567993164,502.59992209258417': [124.04347657808103],
	            '-20.538288116455078,164540.1567993164,502.59992209258417': [
	                124.04347657808103,
	                124.0434765110258, // rare
	                124.04347656317987, // rare
	                // sus
	                124.04347657063045,
	                124.04378004022874,
	            ],
	            '-20.538288116455078,164540.1580810547,502.59992209258417': [124.04347657808103],
	            // 124.080722568091/124.04347730590962 (rare)
	            '-20.535268783569336,164940.360786438,502.69695458233764': [124.080722568091],
	            '-20.538288116455078,164538.55073928833,502.5999307175407': [124.04347730590962],
	            // Android/Linux
	            '-20.535268783569336,164948.14596557617,502.6969545823631': [124.08072256811283],
	            '-20.535268783569336,164926.65912628174,502.6969610930064': [124.08072766105033],
	            '-20.535268783569336,164932.96168518066,502.69696179985476': [124.08072787802666],
	            '-20.535268783569336,164931.54252624512,502.6969617998802': [124.08072787804849],
	            '-20.535268783569336,164591.9659729004,502.6969925059784': [124.08074500028306],
	            '-20.535268783569336,164590.4111480713,502.6969947774742': [124.0807470110085],
	            '-20.535268783569336,164590.41115570068,502.6969947774742': [124.0807470110085],
	            '-20.535268783569336,164593.64263916016,502.69700490119067': [124.08075528279005],
	            '-20.535268783569336,164595.0285797119,502.69700578315314': [124.08075643483608],
	            // sus
	            '-20.538288116455078,164860.96576690674,502.6075748118915': [124.0434496279413],
	            '-20.538288116455078,164860.9938583374,502.6073723861407': [124.04344962817413],
	            '-20.538288116455078,164862.14078521729,502.59991004130643': [124.04345734833623],
	            '-20.538288116455078,164534.50047683716,502.61542110471055': [124.04347520368174],
	            '-20.538288116455078,164535.1324043274,502.6079200572931': [124.04347521997988],
	            '-20.538288116455078,164535.51135635376,502.60633126448374': [124.04347522952594],
	            /* GECKO */
	            '-31.509262084960938,167722.6894454956,148.42717787250876': [35.7383295930922],
	            '-31.509262084960938,167728.72756958008,148.427184343338': [35.73833402246237],
	            '-31.50218963623047,167721.27517700195,148.47537828609347': [35.74996031448245],
	            '-31.502185821533203,167727.52931976318,148.47542023658752': [35.7499681673944],
	            '-31.502185821533203,167700.7530517578,148.475412953645': [35.749968223273754],
	            '-31.502187728881836,167697.23177337646,148.47541113197803': [35.74996626004577],
	            /* WEBKIT */
	            '-20.538288116455078,164873.80361557007,502.59989904452596': [124.0434485301812],
	            '-20.538288116455078,164863.47760391235,502.5999033453372': [124.0434496849557],
	            '-20.538288116455078,164876.62466049194,502.5998911961724': [124.043453265891],
	            '-20.538288116455078,164862.14879989624,502.59991004130643': [124.04345734833623],
	            '-20.538288116455078,164896.54167175293,502.5999054916465': [124.04345808873768],
	            '-29.837873458862305,163206.43050384521,0': [35.10892717540264],
	            '-29.837873458862305,163224.69785308838,0': [35.10892752557993],
	            '-29.83786964416504,163209.17245483398,0': [35.10893232002854],
	            '-29.83786964416504,163202.77336883545,0': [35.10893253237009],
	        };
	        if (noise) {
	            lied = true;
	            documentLie('AudioBuffer', 'sample noise detected');
	        }
	        const pattern = '' + [
	            compressorGainReduction,
	            floatFrequencyDataSum,
	            floatTimeDomainDataSum,
	        ];
	        const knownPattern = known[pattern];
	        if (knownPattern && !knownPattern.includes(sampleSum)) {
	            LowerEntropy.AUDIO = true;
	            sendToTrash('AudioBuffer', 'suspicious frequency data');
	        }
	        logTestResult({ time: timer.stop(), test: 'audio', passed: true });
	        return {
	            totalUniqueSamples,
	            compressorGainReduction,
	            floatFrequencyDataSum,
	            floatTimeDomainDataSum,
	            sampleSum,
	            binsSample,
	            copySample: copyFromChannelSupported ? copySample : [undefined],
	            values,
	            noise,
	            lied,
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'audio', passed: false });
	        captureError(error, 'OfflineAudioContext failed or blocked by client');
	        return;
	    }
	}

	async function getCanvasWebgl() {
	    // use short list to improve performance
	    const getParamNames = () => [
	        // 'BLEND_EQUATION',
	        // 'BLEND_EQUATION_RGB',
	        // 'BLEND_EQUATION_ALPHA',
	        // 'BLEND_DST_RGB',
	        // 'BLEND_SRC_RGB',
	        // 'BLEND_DST_ALPHA',
	        // 'BLEND_SRC_ALPHA',
	        // 'BLEND_COLOR',
	        // 'CULL_FACE',
	        // 'BLEND',
	        // 'DITHER',
	        // 'STENCIL_TEST',
	        // 'DEPTH_TEST',
	        // 'SCISSOR_TEST',
	        // 'POLYGON_OFFSET_FILL',
	        // 'SAMPLE_ALPHA_TO_COVERAGE',
	        // 'SAMPLE_COVERAGE',
	        // 'LINE_WIDTH',
	        'ALIASED_POINT_SIZE_RANGE',
	        'ALIASED_LINE_WIDTH_RANGE',
	        // 'CULL_FACE_MODE',
	        // 'FRONT_FACE',
	        // 'DEPTH_RANGE',
	        // 'DEPTH_WRITEMASK',
	        // 'DEPTH_CLEAR_VALUE',
	        // 'DEPTH_FUNC',
	        // 'STENCIL_CLEAR_VALUE',
	        // 'STENCIL_FUNC',
	        // 'STENCIL_FAIL',
	        // 'STENCIL_PASS_DEPTH_FAIL',
	        // 'STENCIL_PASS_DEPTH_PASS',
	        // 'STENCIL_REF',
	        'STENCIL_VALUE_MASK',
	        'STENCIL_WRITEMASK',
	        // 'STENCIL_BACK_FUNC',
	        // 'STENCIL_BACK_FAIL',
	        // 'STENCIL_BACK_PASS_DEPTH_FAIL',
	        // 'STENCIL_BACK_PASS_DEPTH_PASS',
	        // 'STENCIL_BACK_REF',
	        'STENCIL_BACK_VALUE_MASK',
	        'STENCIL_BACK_WRITEMASK',
	        // 'VIEWPORT',
	        // 'SCISSOR_BOX',
	        // 'COLOR_CLEAR_VALUE',
	        // 'COLOR_WRITEMASK',
	        // 'UNPACK_ALIGNMENT',
	        // 'PACK_ALIGNMENT',
	        'MAX_TEXTURE_SIZE',
	        'MAX_VIEWPORT_DIMS',
	        'SUBPIXEL_BITS',
	        // 'RED_BITS',
	        // 'GREEN_BITS',
	        // 'BLUE_BITS',
	        // 'ALPHA_BITS',
	        // 'DEPTH_BITS',
	        // 'STENCIL_BITS',
	        // 'POLYGON_OFFSET_UNITS',
	        // 'POLYGON_OFFSET_FACTOR',
	        // 'SAMPLE_BUFFERS',
	        // 'SAMPLES',
	        // 'SAMPLE_COVERAGE_VALUE',
	        // 'SAMPLE_COVERAGE_INVERT',
	        // 'COMPRESSED_TEXTURE_FORMATS',
	        // 'GENERATE_MIPMAP_HINT',
	        'MAX_VERTEX_ATTRIBS',
	        'MAX_VERTEX_UNIFORM_VECTORS',
	        'MAX_VARYING_VECTORS',
	        'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
	        'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
	        'MAX_TEXTURE_IMAGE_UNITS',
	        'MAX_FRAGMENT_UNIFORM_VECTORS',
	        'SHADING_LANGUAGE_VERSION',
	        'VENDOR',
	        'RENDERER',
	        'VERSION',
	        'MAX_CUBE_MAP_TEXTURE_SIZE',
	        // 'ACTIVE_TEXTURE',
	        // 'IMPLEMENTATION_COLOR_READ_TYPE',
	        // 'IMPLEMENTATION_COLOR_READ_FORMAT',
	        'MAX_RENDERBUFFER_SIZE',
	        // 'UNPACK_FLIP_Y_WEBGL',
	        // 'UNPACK_PREMULTIPLY_ALPHA_WEBGL',
	        // 'UNPACK_COLORSPACE_CONVERSION_WEBGL',
	        // 'READ_BUFFER',
	        // 'UNPACK_ROW_LENGTH',
	        // 'UNPACK_SKIP_ROWS',
	        // 'UNPACK_SKIP_PIXELS',
	        // 'PACK_ROW_LENGTH',
	        // 'PACK_SKIP_ROWS',
	        // 'PACK_SKIP_PIXELS',
	        // 'UNPACK_SKIP_IMAGES',
	        // 'UNPACK_IMAGE_HEIGHT',
	        'MAX_3D_TEXTURE_SIZE',
	        'MAX_ELEMENTS_VERTICES',
	        'MAX_ELEMENTS_INDICES',
	        'MAX_TEXTURE_LOD_BIAS',
	        'MAX_DRAW_BUFFERS',
	        // 'DRAW_BUFFER0',
	        // 'DRAW_BUFFER1',
	        // 'DRAW_BUFFER2',
	        // 'DRAW_BUFFER3',
	        // 'DRAW_BUFFER4',
	        // 'DRAW_BUFFER5',
	        // 'DRAW_BUFFER6',
	        // 'DRAW_BUFFER7',
	        'MAX_FRAGMENT_UNIFORM_COMPONENTS',
	        'MAX_VERTEX_UNIFORM_COMPONENTS',
	        // 'FRAGMENT_SHADER_DERIVATIVE_HINT',
	        'MAX_ARRAY_TEXTURE_LAYERS',
	        // 'MIN_PROGRAM_TEXEL_OFFSET',
	        'MAX_PROGRAM_TEXEL_OFFSET',
	        'MAX_VARYING_COMPONENTS',
	        'MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS',
	        // 'RASTERIZER_DISCARD',
	        'MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS',
	        'MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS',
	        'MAX_COLOR_ATTACHMENTS',
	        'MAX_SAMPLES',
	        'MAX_VERTEX_UNIFORM_BLOCKS',
	        'MAX_FRAGMENT_UNIFORM_BLOCKS',
	        'MAX_COMBINED_UNIFORM_BLOCKS',
	        'MAX_UNIFORM_BUFFER_BINDINGS',
	        'MAX_UNIFORM_BLOCK_SIZE',
	        'MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS',
	        'MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS',
	        // 'UNIFORM_BUFFER_OFFSET_ALIGNMENT',
	        'MAX_VERTEX_OUTPUT_COMPONENTS',
	        'MAX_FRAGMENT_INPUT_COMPONENTS',
	        'MAX_SERVER_WAIT_TIMEOUT',
	        // 'TRANSFORM_FEEDBACK_PAUSED',
	        // 'TRANSFORM_FEEDBACK_ACTIVE',
	        'MAX_ELEMENT_INDEX',
	        'MAX_CLIENT_WAIT_TIMEOUT_WEBGL',
	    ].sort();
	    const draw = (gl) => {
	        const isSafari15AndAbove = ('BigInt64Array' in window &&
	            IS_WEBKIT &&
	            !/(Cr|Fx)iOS/.test(navigator.userAgent));
	        if (!gl || isSafari15AndAbove) {
	            return;
	        }
	        // gl.clearColor(0.47, 0.7, 0.78, 1)
	        gl.clear(gl.COLOR_BUFFER_BIT);
	        // based on https://github.com/Valve/fingerprintjs2/blob/master/fingerprint2.js
	        const vertexPosBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
	        const vertices = new Float32Array([-0.9, -0.7, 0, 0.8, -0.7, 0, 0, 0.5, 0]);
	        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	        // create program
	        const program = gl.createProgram();
	        // compile and attach vertex shader
	        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	        gl.shaderSource(vertexShader, `
			attribute vec2 attrVertex;
			varying vec2 varyinTexCoordinate;
			uniform vec2 uniformOffset;
			void main(){
				varyinTexCoordinate = attrVertex + uniformOffset;
				gl_Position = vec4(attrVertex, 0, 1);
			}
		`);
	        gl.compileShader(vertexShader);
	        gl.attachShader(program, vertexShader);
	        // compile and attach fragment shader
	        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	        gl.shaderSource(fragmentShader, `
			precision mediump float;
			varying vec2 varyinTexCoordinate;
			void main() {
				gl_FragColor = vec4(varyinTexCoordinate, 1, 1);
			}
		`);
	        gl.compileShader(fragmentShader);
	        gl.attachShader(program, fragmentShader);
	        // use program
	        const componentSize = 3;
	        gl.linkProgram(program);
	        gl.useProgram(program);
	        program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex');
	        program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset');
	        gl.enableVertexAttribArray(program.vertexPosArray);
	        gl.vertexAttribPointer(program.vertexPosAttrib, componentSize, gl.FLOAT, false, 0, 0);
	        gl.uniform2f(program.offsetUniform, 1, 1);
	        // draw
	        const numOfIndices = 3;
	        gl.drawArrays(gl.LINE_LOOP, 0, numOfIndices);
	        return gl;
	    };
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        // detect lies
	        const dataLie = lieProps['HTMLCanvasElement.toDataURL'];
	        const contextLie = lieProps['HTMLCanvasElement.getContext'];
	        const parameterOrExtensionLie = (lieProps['WebGLRenderingContext.getParameter'] ||
	            lieProps['WebGL2RenderingContext.getParameter'] ||
	            lieProps['WebGLRenderingContext.getExtension'] ||
	            lieProps['WebGL2RenderingContext.getExtension']);
	        const lied = (dataLie ||
	            contextLie ||
	            parameterOrExtensionLie ||
	            lieProps['WebGLRenderingContext.getSupportedExtensions'] ||
	            lieProps['WebGL2RenderingContext.getSupportedExtensions']) || false;
	        // create canvas context
	        let win = window;
	        if (!LIKE_BRAVE && PHANTOM_DARKNESS) {
	            win = PHANTOM_DARKNESS;
	        }
	        const doc = win.document;
	        let canvas;
	        let canvas2;
	        if ('OffscreenCanvas' in window) {
	            // @ts-ignore OffscreenCanvas
	            canvas = new win.OffscreenCanvas(256, 256);
	            // @ts-ignore OffscreenCanvas
	            canvas2 = new win.OffscreenCanvas(256, 256);
	        }
	        else {
	            canvas = doc.createElement('canvas');
	            canvas2 = doc.createElement('canvas');
	        }
	        const getContext = (canvas, contextType) => {
	            try {
	                if (contextType == 'webgl2') {
	                    return (canvas.getContext('webgl2') ||
	                        canvas.getContext('experimental-webgl2'));
	                }
	                return (canvas.getContext('webgl') ||
	                    canvas.getContext('experimental-webgl') ||
	                    canvas.getContext('moz-webgl') ||
	                    canvas.getContext('webkit-3d'));
	            }
	            catch (error) {
	                return;
	            }
	        };
	        const gl = getContext(canvas, 'webgl');
	        const gl2 = getContext(canvas2, 'webgl2');
	        if (!gl) {
	            logTestResult({ test: 'webgl', passed: false });
	            return;
	        }
	        // helpers
	        const getShaderPrecisionFormat = (gl, shaderType) => {
	            if (!gl) {
	                return;
	            }
	            const LOW_FLOAT = attempt(() => gl.getShaderPrecisionFormat(gl[shaderType], gl.LOW_FLOAT));
	            const MEDIUM_FLOAT = attempt(() => gl.getShaderPrecisionFormat(gl[shaderType], gl.MEDIUM_FLOAT));
	            const HIGH_FLOAT = attempt(() => gl.getShaderPrecisionFormat(gl[shaderType], gl.HIGH_FLOAT));
	            const HIGH_INT = attempt(() => gl.getShaderPrecisionFormat(gl[shaderType], gl.HIGH_INT));
	            return {
	                LOW_FLOAT,
	                MEDIUM_FLOAT,
	                HIGH_FLOAT,
	                HIGH_INT,
	            };
	        };
	        const getShaderData = (name, shader) => {
	            const data = {};
	            // eslint-disable-next-line guard-for-in
	            for (const prop in shader) {
	                const obj = shader[prop];
	                data[name + '.' + prop + '.precision'] = obj ? attempt(() => obj.precision) : undefined;
	                data[name + '.' + prop + '.rangeMax'] = obj ? attempt(() => obj.rangeMax) : undefined;
	                data[name + '.' + prop + '.rangeMin'] = obj ? attempt(() => obj.rangeMin) : undefined;
	            }
	            return data;
	        };
	        const getMaxAnisotropy = (gl) => {
	            if (!gl) {
	                return;
	            }
	            const ext = (gl.getExtension('EXT_texture_filter_anisotropic') ||
	                gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
	                gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));
	            return ext ? gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : undefined;
	        };
	        const getParams = (gl) => {
	            if (!gl) {
	                return {};
	            }
	            const pnamesShortList = new Set(getParamNames());
	            const pnames = Object.getOwnPropertyNames(Object.getPrototypeOf(gl))
	                // .filter(prop => prop.toUpperCase() == prop) // global test
	                .filter((name) => pnamesShortList.has(name));
	            return pnames.reduce((acc, name) => {
	                const val = gl.getParameter(gl[name]);
	                if (!!val && 'buffer' in Object.getPrototypeOf(val)) {
	                    acc[name] = [...val];
	                }
	                else {
	                    acc[name] = val;
	                }
	                return acc;
	            }, {});
	        };
	        const getUnmasked = (gl) => {
	            const ext = !!gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
	            return !ext ? {} : {
	                UNMASKED_VENDOR_WEBGL: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
	                UNMASKED_RENDERER_WEBGL: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
	            };
	        };
	        const getSupportedExtensions = (gl) => {
	            if (!gl) {
	                return [];
	            }
	            const ext = attempt(() => gl.getSupportedExtensions());
	            if (!ext) {
	                return [];
	            }
	            return ext;
	        };
	        const getWebGLData = (gl, contextType) => {
	            if (!gl) {
	                return {
	                    dataURI: undefined,
	                    pixels: undefined,
	                };
	            }
	            try {
	                draw(gl);
	                const { drawingBufferWidth, drawingBufferHeight } = gl;
	                let dataURI = '';
	                if (gl.canvas.constructor.name === 'OffscreenCanvas') {
	                    const canvas = document.createElement('canvas');
	                    draw(getContext(canvas, contextType));
	                    dataURI = canvas.toDataURL();
	                }
	                else {
	                    dataURI = gl.canvas.toDataURL();
	                }
	                // reduce excessive reads to improve performance
	                const width = drawingBufferWidth / 15;
	                const height = drawingBufferHeight / 6;
	                const pixels = new Uint8Array(width * height * 4);
	                try {
	                    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	                }
	                catch (error) {
	                    return {
	                        dataURI,
	                        pixels: undefined,
	                    };
	                }
	                // console.log([...pixels].filter(x => !!x)) // test read
	                return {
	                    dataURI,
	                    pixels: [...pixels],
	                };
	            }
	            catch (error) {
	                return captureError(error);
	            }
	        };
	        // get data
	        await queueEvent(timer);
	        const params = { ...getParams(gl), ...getUnmasked(gl) };
	        const params2 = { ...getParams(gl2), ...getUnmasked(gl2) };
	        const VersionParam = {
	            ALIASED_LINE_WIDTH_RANGE: true,
	            SHADING_LANGUAGE_VERSION: true,
	            VERSION: true,
	        };
	        const mismatch = Object.keys(params2)
	            .filter((key) => !!params[key] && !VersionParam[key] && ('' + params[key] != '' + params2[key]));
	        if (mismatch.length) {
	            sendToTrash('webgl/webgl2 mirrored params mismatch', mismatch.toString());
	        }
	        await queueEvent(timer);
	        const { dataURI, pixels } = getWebGLData(gl, 'webgl') || {};
	        const { dataURI: dataURI2, pixels: pixels2 } = getWebGLData(gl2, 'webgl2') || {};
	        const data = {
	            extensions: [...getSupportedExtensions(gl), ...getSupportedExtensions(gl2)],
	            pixels,
	            pixels2,
	            dataURI,
	            dataURI2,
	            parameters: {
	                ...{ ...params, ...params2 },
	                ...{
	                    antialias: gl.getContextAttributes() ? gl.getContextAttributes().antialias : undefined,
	                    MAX_VIEWPORT_DIMS: attempt(() => [...gl.getParameter(gl.MAX_VIEWPORT_DIMS)]),
	                    MAX_TEXTURE_MAX_ANISOTROPY_EXT: getMaxAnisotropy(gl),
	                    ...getShaderData('VERTEX_SHADER', getShaderPrecisionFormat(gl, 'VERTEX_SHADER')),
	                    ...getShaderData('FRAGMENT_SHADER', getShaderPrecisionFormat(gl, 'FRAGMENT_SHADER')),
	                    MAX_DRAW_BUFFERS_WEBGL: attempt(() => {
	                        const buffers = gl.getExtension('WEBGL_draw_buffers');
	                        return buffers ? gl.getParameter(buffers.MAX_DRAW_BUFFERS_WEBGL) : undefined;
	                    }),
	                },
	            },
	            parameterOrExtensionLie,
	            lied,
	        };
	        // Firewall
	        const brandCapabilities = ['00b72507', '00c1b42d', '00fe1ec9', '02b3eea3', '0461d3de', '0463627d', '057857ac', '0586e20b', '0639a81a', '087d5759', '08847ba5', '0b2d4333', '0cdb985d', '0e058699', '0eb2fc19', '0f39d057', '0f840379', '0fc123c7', '101e0582', '12e92e62', '12f8ac14', '1453d59a', '149a1efa', '166dc7c8', '16c481a6', '171831c5', '177cc258', '18579e83', '19594666', '1b251fd7', '1bfd326c', '1e8a9a79', '1ff7c7e7', '2048bc5a', '2259b706', '22d0f2cf', '230d6a0d', '23d1ce20', '2402c3d2', '24306836', '258789d0', '25a760b8', '25f9385d', '27938830', '27db292c', '2b80fd96', '2bb488da', '2c04c2eb', '2d15287f', '2f014c41', '2f582ed9', '300ee927', '33bc5492', '34270469', '3660b71f', '3740c4c7', '3999a5e1', '39ead506', '3a91d0d6', '3b724916', '3bf321b8', '3c546144', '3f9ef44c', '3fea1100', '3ff82303', '4027d193', '402e1064', '4065cd69', '43038e3d', '4503e771', '461f97e1', '464d51ac', '467b99a5', '482c81b2', '48af038f', '4962ada1', '49bf7358', '4c9e8f5d', '502c402c', '508d1625', '52e348ba', '534002ab', '5582debe', '55d3aa56', '55e821f7', '581f3282', '5831d5fd', '58871380', '58fdc720', '5a5658f1', '5a90a5f8', '5aea1af1', '5b6a17aa', '5bef9a39', '5ca55292', '5d786cef', '5ddb9237', '5ee41456', '61178f2a', '61ca8e23', '61d9464e', '61eecaae', '623c3bfd', '6248d9e3', '6294d84e', '62bf7ef1', '6346cf49', '6357365c', '66628310', '668f0f93', '66d992e8', '67995996', '6843ebbf', '6864dcb0', '6951838b', '696e1548', '698c5c2e', '6a75ae3b', '6aa1ff7e', '6b07d4f8', '6b290cd4', '6c168801', '6dfae3cb', '6e806ffc', '6edf1720', '6f81cbe7', '70859bdb', '70a095b1', '7238c5dd', '7360ebd1', '741688e4', '74daf866', '78640859', '79284c47', '794f8929', '795e5c95', '79a57aa9', '7aa13573', '7b2e5242', '7b811cdd', '7ec0ea6b', '801d73af', '802e2547', '81b9cd29', '8219e1a4', '82a9a2f1', '8428fc8e', '849ccb64', '8541aa4c', '85479b99', '8bd0b91b', '8d371161', '903c8847', '917871e7', '98aeaba9', '99b1a1c6', '99ef2c3b', '9b67b7dc', '9c6df98c', '9c814c1b', '9e2b5e94', '9fd76352', 'a1c808d5', 'a22788f8', 'a2383001', 'a26e9aa9', 'a397a568', 'a3f9ee34', 'a4b988da', 'a4d34176', 'a581f55e', 'a5a477ae', 'a9640880', 'a97d3858', 'aa73f3a4', 'ab40bece', 'ac4d4ba8', 'ad01a422', 'ade75c4f', 'ae2c4777', 'afa583bc', 'b10c2a85', 'b224cc7c', 'b2d6fc98', 'b362c2f5', 'b467620a', 'b4d40dcc', 'b504662d', 'b50edd99', 'b5494027', 'b62321c3', 'b8961d15', 'b8ea6e7f', 'bb77a469', 'bc0f9686', 'bcf7315f', 'be2dfaea', 'beffda26', 'bf06317e', 'bf610cdb', 'bfe1c212', 'c00582e9', 'c026469d', 'c04889b1', 'c04b0635', 'c04e374a', 'c05f7596', 'c07307c6', 'c092fdf8', 'c25dd065', 'c2bce496', 'c5e9a883', 'c79634c2', 'c7e37ca0', 'c93b5366', 'c9bc4ffd', 'cba1878b', 'cbeade8c', 'ce2e3d16', 'cefb72ca', 'cf9643e6', 'cfd20274', 'd05a66eb', 'd09c1c07', 'd1e76c89', 'd2172943', 'd2dc2474', 'd498797d', 'd6bf35ad', 'd734ea08', 'd860ff42', 'd8bd9e5a', 'd913dafa', 'd970d345', 'dbdbe7a4', 'dc271c35', 'dcd9a29e', 'dd67b076', 'de793ead', 'ded74044', 'df9daeb6', 'e10339b3', 'e142d1f9', 'e155c47e', 'e15afab0', 'e16bb1bb', 'e316e4c0', 'e3eff92a', 'e4569a5b', 'e574bef6', 'e5962ba3', 'e6464c9f', 'e68b5c4e', 'e796b84e', 'e8694547', 'e965d180', 'e965d541', 'e9bdc904', 'e9dbb8d5', 'ea54d525', 'ea59b343', 'ea7f90ea', 'ea8f5ad0', 'eaa13804', 'eb799d34', 'ec050bb6', 'ec928655', 'eed2e5e1', 'ef8f5db1', 'f0d5a3c7', 'f1077334', 'f221fef5', 'f2293447', 'f33d918e', 'f3c6ea11', 'f51056a1', 'f51cab9a', 'f573bb34', 'f5d19934', 'f7451c92', 'f8e65486', 'f9714b3d', 'fa994f33', 'fafa14c0', 'fc37fe1f', 'fca66520', 'fe0997b6'];
	        const capabilities = [-1056897629, -1056946782, -1073719331, -1147160399, -1147160553, -1147168724, -1147419751, -1147419753, -1147419775, -1147427826, -1147451883, -1147451901, -1147464169, -1147464177, -1147488144, -1147602934, -1147643759, -1147643872, -1147765274, -1148326739, -1148335070, -1148572354, -1148678631, -1148680509, -1148713259, -1164279890, -1164800191, -1164800478, -1332029332, -133757475, -1342154787, -134823971, -16746546, -1878102921, -1878111124, -1962893370, -1962919974, -1962928178, -2130164162, -2130164382, -2130164388, -2130164546, -2130172573, -2130659912, -2145933648, -2145941977, -2145958228, -2145966414, -2145966441, -2145966529, -2145966535, -2145966545, -2145970658, -2145974343, -2145974380, -2145974489, -2145974596, -2145974598, -2145974612, -2145974637, -2145974657, -2145974729, -2146187766, -2146232338, -2146232480, -2146232503, -2146232590, -2146232723, -2146232724, -2146236588, -2146236703, -2146237020, -2146251619, -2146251641, -2146251681, -2146253671, -2146253693, -2146277218, -2146286438, -2146286463, -2146286583, -2146319268, -2146376065, -2146379955, -2146384003, -2146384011, -2146384027, -2146384034, -2146384120, -2146384281, -2146398568, -2146400384, -2146400556, -2146400620, -2146401928, -2146417027, -2146526795, -2146526934, -2147125544, -2147128275, -2147133747, -2147133749, -2147133760, -2147134974, -2147136328, -2147142429, -2147287810, -2147287811, -2147287820, -2147287834, -2147287835, -2147287854, -2147291718, -2147291820, -2147293058, -2147295768, -2147295822, -2147295823, -2147295849, -2147295857, -2147300019, -2147304193, -2147304219, -2147306321, -2147316382, -2147316383, -2147333118, -2147336998, -2147337003, -2147337012, -2147337022, -2147344686, -2147346747, -2147361652, -2147361731, -2147361769, -2147361774, -2147361775, -2147361778, -2147361792, -2147362760, -2147365698, -2147365730, -2147365759, -2147365760, -2147365827, -2147365863, -2147373914, -2147373984, -2147374032, -2147374080, -2147378041, -2147378146, -2147382130, -2147382221, -2147382251, -2147382270, -2147382272, -2147383246, -2147385825, -2147385849, -2147386292, -2147386326, -2147387335, -2147387364, -2147389930, -2147389937, -2147389951, -2147390461, -2147394188, -2147394251, -2147394484, -2147400057, -2147406798, -2147407643, -2147407821, -2147410938, -2147410941, -2147414733, -2147414956, -2147414987, -2147415037, -2147429201, -2147429223, -2147439020, -2147440422, -2147447111, -2147447122, -2147447126, -2147447137, -2147447149, -2147447157, -2147447161, -2147447163, -2147447873, -2147447892, -2147447896, -2147447928, -2147448592, -2147453701, -2147453767, -2147453768, -2147459031, -2147461169, -2147466956, -2147466972, -2147467172, -2147470173, -2147475351, -2147475352, -638494755, -671082546, -677558160, -999987216, 1099536, 1099644, 1147714426, 1197075, 1229835, 1508998, 1509050, 1610618841, 184555483, 2146590728, 2147305224, 2147361749, 2147440438, 2147475085, 2147479181, 21667, 349912, 351513, 83625, 998804992, 998911268, 999148597, 999156922];
	        const webglParams = !data.parameters ? undefined : [
	            ...new Set(Object.values(data.parameters)
	                .filter((val) => val && typeof val != 'string')
	                .flat()
	                .map((val) => Number(val))),
	        ].sort((a, b) => (a - b));
	        const gpuBrand = getGpuBrand(data.parameters?.UNMASKED_RENDERER_WEBGL);
	        const webglParamsStr = '' + webglParams;
	        const webglBrandCapabilities = !gpuBrand || !webglParamsStr ? undefined : hashMini([gpuBrand, webglParamsStr]);
	        const webglCapabilities = !webglParams ? undefined : webglParams.reduce((acc, val, i) => acc ^ (+val + i), 0);
	        Analysis.webglParams = webglParamsStr;
	        Analysis.webglBrandCapabilities = webglBrandCapabilities;
	        Analysis.webglCapabilities = webglCapabilities;
	        const hasSusGpu = webglBrandCapabilities && !brandCapabilities.includes(webglBrandCapabilities);
	        const hasSusCapabilities = webglCapabilities && !capabilities.includes(webglCapabilities);
	        if (hasSusGpu) {
	            LowerEntropy.WEBGL = true;
	            sendToTrash('WebGLRenderingContext.getParameter', 'suspicious gpu');
	        }
	        if (hasSusCapabilities) {
	            LowerEntropy.WEBGL = true;
	            sendToTrash('WebGLRenderingContext.getParameter', 'suspicious capabilities');
	        }
	        logTestResult({ time: timer.stop(), test: 'webgl', passed: true });
	        return {
	            ...data,
	            gpu: {
	                ...(getWebGLRendererConfidence((data.parameters || {}).UNMASKED_RENDERER_WEBGL) || {}),
	                compressedGPU: compressWebGLRenderer((data.parameters || {}).UNMASKED_RENDERER_WEBGL),
	            },
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'webgl', passed: false });
	        captureError(error);
	        return;
	    }
	}

	// inspired by Lalit Patel's fontdetect.js
	// https://www.lalit.org/wordpress/wp-content/uploads/2008/05/fontdetect.js?ver=0.3
	const WindowsFonts = {
	    // https://docs.microsoft.com/en-us/typography/fonts/windows_11_font_list
	    '7': [
	        'Cambria Math',
	        'Lucida Console',
	    ],
	    '8': [
	        'Aldhabi',
	        'Gadugi',
	        'Myanmar Text',
	        'Nirmala UI',
	    ],
	    '8.1': [
	        'Leelawadee UI',
	        'Javanese Text',
	        'Segoe UI Emoji',
	    ],
	    '10': [
	        'HoloLens MDL2 Assets', // 10 (v1507) +
	        'Segoe MDL2 Assets', // 10 (v1507) +
	        'Bahnschrift', // 10 (v1709) +-
	        'Ink Free', // 10 (v1803) +-
	    ],
	    '11': ['Segoe Fluent Icons'],
	};
	const MacOSFonts = {
	    // Mavericks and below
	    '10.9': [
	        'Helvetica Neue',
	        'Geneva', // mac (not iOS)
	    ],
	    // Yosemite
	    '10.10': [
	        'Kohinoor Devanagari Medium',
	        'Luminari',
	    ],
	    // El Capitan
	    '10.11': [
	        'PingFang HK Light',
	    ],
	    // Sierra: https://support.apple.com/en-ie/HT206872
	    '10.12': [
	        'American Typewriter Semibold',
	        'Futura Bold',
	        'SignPainter-HouseScript Semibold',
	    ],
	    // High Sierra: https://support.apple.com/en-me/HT207962
	    // Mojave: https://support.apple.com/en-us/HT208968
	    '10.13-10.14': [
	        'InaiMathi Bold',
	    ],
	    // Catalina: https://support.apple.com/en-us/HT210192
	    // Big Sur: https://support.apple.com/en-sg/HT211240
	    '10.15-11': [
	        'Galvji',
	        'MuktaMahee Regular',
	    ],
	    // Monterey: https://support.apple.com/en-us/HT212587
	    '12': [
	        'Noto Sans Gunjala Gondi Regular',
	        'Noto Sans Masaram Gondi Regular',
	        'Noto Serif Yezidi Regular'
	    ],
	    // Ventura: https://support.apple.com/en-us/HT213266
	    '13': [
	        'Apple SD Gothic Neo ExtraBold',
	        'STIX Two Math Regular',
	        'STIX Two Text Regular',
	        'Noto Sans Canadian Aboriginal Regular',
	    ],
	};
	const DesktopAppFonts = {
	    // docs.microsoft.com/en-us/typography/font-list/ms-outlook
	    'Microsoft Outlook': ['MS Outlook'],
	    // https://community.adobe.com/t5/postscript-discussions/zwadobef-font/m-p/3730427#M785
	    'Adobe Acrobat': ['ZWAdobeF'],
	    // https://wiki.documentfoundation.org/Fonts
	    'LibreOffice': [
	        'Amiri',
	        'KACSTOffice',
	        'Liberation Mono',
	        'Source Code Pro',
	    ],
	    // https://superuser.com/a/611804
	    'OpenOffice': [
	        'DejaVu Sans',
	        'Gentium Book Basic',
	        'OpenSymbol',
	    ],
	};
	const APPLE_FONTS = Object.keys(MacOSFonts).map((key) => MacOSFonts[key]).flat();
	const WINDOWS_FONTS = Object.keys(WindowsFonts).map((key) => WindowsFonts[key]).flat();
	const DESKTOP_APP_FONTS = (Object.keys(DesktopAppFonts).map((key) => DesktopAppFonts[key]).flat());
	const LINUX_FONTS = [
	    'Arimo', // ubuntu, chrome os
	    'Chilanka', // ubuntu (not TB)
	    'Cousine', // ubuntu, chrome os
	    'Jomolhari', // chrome os
	    'MONO', // ubuntu, chrome os (not TB)
	    'Noto Color Emoji', // Linux
	    'Ubuntu', // ubuntu (not TB)
	];
	const ANDROID_FONTS = [
	    'Dancing Script', // android
	    'Droid Sans Mono', // Android
	    'Roboto', // Android, Chrome OS
	];
	const FONT_LIST = [
	    ...APPLE_FONTS,
	    ...WINDOWS_FONTS,
	    ...LINUX_FONTS,
	    ...ANDROID_FONTS,
	    ...DESKTOP_APP_FONTS,
	].sort();
	async function getFonts() {
	    const getPixelEmojis = ({ doc, id, emojis }) => {
	        try {
	            patch(doc.getElementById(id), html `
				<div id="pixel-emoji-container">
				<style>
					.pixel-emoji {
						font-family: ${CSS_FONT_FAMILY};
						font-size: 200px !important;
						height: auto;
						position: absolute !important;
						transform: scale(1.000999);
					}
					</style>
					${emojis.map((emoji) => {
                return `<div class="pixel-emoji">${emoji}</div>`;
            }).join('')}
				</div>
			`);
	            // get emoji set and system
	            const getEmojiDimensions = (style) => {
	                return {
	                    width: style.inlineSize,
	                    height: style.blockSize,
	                };
	            };
	            const pattern = new Set();
	            const emojiElems = [...doc.getElementsByClassName('pixel-emoji')];
	            const emojiSet = emojiElems.reduce((emojiSet, el, i) => {
	                const style = getComputedStyle(el);
	                const emoji = emojis[i];
	                const { height, width } = getEmojiDimensions(style);
	                const dimensions = `${width},${height}`;
	                if (!pattern.has(dimensions)) {
	                    pattern.add(dimensions);
	                    emojiSet.add(emoji);
	                }
	                return emojiSet;
	            }, new Set());
	            const pixelToNumber = (pixels) => +(pixels.replace('px', ''));
	            const pixelSizeSystemSum = 0.00001 * [...pattern].map((x) => {
	                return x.split(',').map((x) => pixelToNumber(x)).reduce((acc, x) => acc += (+x || 0), 0);
	            }).reduce((acc, x) => acc += x, 0);
	            doc.body.removeChild(doc.getElementById('pixel-emoji-container'));
	            return {
	                emojiSet: [...emojiSet],
	                pixelSizeSystemSum,
	            };
	        }
	        catch (error) {
	            console.error(error);
	            return {
	                emojiSet: [],
	                pixelSizeSystemSum: 0,
	            };
	        }
	    };
	    const getFontFaceLoadFonts = async (fontList) => {
	        try {
	            let fontsChecked = [];
	            if (!document.fonts.check(`0px "${getRandomValues()}"`)) {
	                fontsChecked = fontList.reduce((acc, font) => {
	                    const found = document.fonts.check(`0px "${font}"`);
	                    if (found)
	                        acc.push(font);
	                    return acc;
	                }, []);
	            }
	            const fontFaceList = fontList.map((font) => new FontFace(font, `local("${font}")`));
	            const responseCollection = await Promise
	                .allSettled(fontFaceList.map((font) => font.load()));
	            const fontsLoaded = responseCollection.reduce((acc, font) => {
	                if (font.status == 'fulfilled') {
	                    acc.push(font.value.family);
	                }
	                return acc;
	            }, []);
	            return [...new Set([...fontsChecked, ...fontsLoaded])].sort();
	        }
	        catch (error) {
	            console.error(error);
	            return [];
	        }
	    };
	    const getPlatformVersion = (fonts) => {
	        const getWindows = ({ fonts, fontMap }) => {
	            const fontVersion = {
	                ['11']: fontMap['11'].find((x) => fonts.includes(x)),
	                ['10']: fontMap['10'].find((x) => fonts.includes(x)),
	                ['8.1']: fontMap['8.1'].find((x) => fonts.includes(x)),
	                ['8']: fontMap['8'].find((x) => fonts.includes(x)),
	                // require complete set of Windows 7 fonts
	                ['7']: fontMap['7'].filter((x) => fonts.includes(x)).length == fontMap['7'].length,
	            };
	            const hash = ('' + Object.keys(fontVersion).sort().filter((key) => !!fontVersion[key]));
	            const hashMap = {
	                '10,11,7,8,8.1': '11',
	                '10,7,8,8.1': '10',
	                '7,8,8.1': '8.1',
	                '11,7,8,8.1': '8.1', // missing 10
	                '7,8': '8',
	                '10,7,8': '8', // missing 8.1
	                '10,11,7,8': '8', // missing 8.1
	                '7': '7',
	                '7,8.1': '7',
	                '10,7,8.1': '7', // missing 8
	                '10,11,7,8.1': '7', // missing 8
	            };
	            const version = hashMap[hash];
	            return version ? `Windows ${version}` : undefined;
	        };
	        const getMacOS = ({ fonts, fontMap }) => {
	            const fontVersion = {
	                ['13']: fontMap['13'].find((x) => fonts.includes(x)),
	                ['12']: fontMap['12'].find((x) => fonts.includes(x)),
	                ['10.15-11']: fontMap['10.15-11'].find((x) => fonts.includes(x)),
	                ['10.13-10.14']: fontMap['10.13-10.14'].find((x) => fonts.includes(x)),
	                ['10.12']: fontMap['10.12'].find((x) => fonts.includes(x)),
	                ['10.11']: fontMap['10.11'].find((x) => fonts.includes(x)),
	                ['10.10']: fontMap['10.10'].find((x) => fonts.includes(x)),
	                // require complete set of 10.9 fonts
	                ['10.9']: fontMap['10.9'].filter((x) => fonts.includes(x)).length == fontMap['10.9'].length,
	            };
	            const hash = ('' + Object.keys(fontVersion).sort().filter((key) => !!fontVersion[key]));
	            const hashMap = {
	                '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12,13': 'Ventura',
	                '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9,12': 'Monterey',
	                '10.10,10.11,10.12,10.13-10.14,10.15-11,10.9': '10.15-11',
	                '10.10,10.11,10.12,10.13-10.14,10.9': '10.13-10.14',
	                '10.10,10.11,10.12,10.9': 'Sierra', // 10.12
	                '10.10,10.11,10.9': 'El Capitan', // 10.11
	                '10.10,10.9': 'Yosemite', // 10.10
	                '10.9': 'Mavericks', // 10.9
	            };
	            const version = hashMap[hash];
	            return version ? `macOS ${version}` : undefined;
	        };
	        return (getWindows({ fonts, fontMap: WindowsFonts }) ||
	            getMacOS({ fonts, fontMap: MacOSFonts }));
	    };
	    const getDesktopApps = (fonts) => {
	        // @ts-ignore
	        const apps = Object.keys(DesktopAppFonts).reduce((acc, key) => {
	            const appFontSet = DesktopAppFonts[key];
	            const match = appFontSet.filter((x) => fonts.includes(x)).length == appFontSet.length;
	            return match ? [...acc, key] : acc;
	        }, []);
	        return apps;
	    };
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        const doc = (PHANTOM_DARKNESS &&
	            PHANTOM_DARKNESS.document &&
	            PHANTOM_DARKNESS.document.body ? PHANTOM_DARKNESS.document :
	            document);
	        const id = `font-fingerprint`;
	        const div = doc.createElement('div');
	        div.setAttribute('id', id);
	        doc.body.appendChild(div);
	        const { emojiSet, pixelSizeSystemSum, } = getPixelEmojis({
	            doc,
	            id,
	            emojis: EMOJIS,
	        }) || {};
	        const fontList = FONT_LIST;
	        const fontFaceLoadFonts = await getFontFaceLoadFonts(fontList);
	        const platformVersion = getPlatformVersion(fontFaceLoadFonts);
	        const apps = getDesktopApps(fontFaceLoadFonts);
	        // detect lies
	        const lied = (lieProps['FontFace.load'] ||
	            lieProps['FontFace.family'] ||
	            lieProps['FontFace.status'] ||
	            lieProps['String.fromCodePoint'] ||
	            lieProps['CSSStyleDeclaration.setProperty'] ||
	            lieProps['CSS2Properties.setProperty']) || false;
	        if (isFontOSBad(USER_AGENT_OS, fontFaceLoadFonts)) {
	            LowerEntropy.FONTS = true,
	                Analysis.FontOsIsBad = true;
	            sendToTrash('platform', `${USER_AGENT_OS} system and fonts are uncommon`);
	        }
	        logTestResult({ time: timer.stop(), test: 'fonts', passed: true });
	        return {
	            fontFaceLoadFonts,
	            platformVersion,
	            apps,
	            emojiSet,
	            pixelSizeSystemSum,
	            lied,
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'fonts', passed: false });
	        captureError(error);
	        return;
	    }
	}

	// inspired by
	// https://privacycheck.sec.lrz.de/active/fp_gcr/fp_getclientrects.html
	// https://privacycheck.sec.lrz.de/active/fp_e/fp_emoji.html
	async function getClientRects() {
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        const toNativeObject = (domRect) => {
	            return {
	                bottom: domRect.bottom,
	                height: domRect.height,
	                left: domRect.left,
	                right: domRect.right,
	                width: domRect.width,
	                top: domRect.top,
	                x: domRect.x,
	                y: domRect.y,
	            };
	        };
	        let lied = (lieProps['Element.getClientRects'] ||
	            lieProps['Element.getBoundingClientRect'] ||
	            lieProps['Range.getClientRects'] ||
	            lieProps['Range.getBoundingClientRect'] ||
	            lieProps['String.fromCodePoint']) || false;
	        const DOC = (PHANTOM_DARKNESS &&
	            PHANTOM_DARKNESS.document &&
	            PHANTOM_DARKNESS.document.body ? PHANTOM_DARKNESS.document :
	            document);
	        const getBestRect = (el) => {
	            let range;
	            if (!lieProps['Element.getClientRects']) {
	                return el.getClientRects()[0];
	            }
	            else if (!lieProps['Element.getBoundingClientRect']) {
	                return el.getBoundingClientRect();
	            }
	            else if (!lieProps['Range.getClientRects']) {
	                range = DOC.createRange();
	                range.selectNode(el);
	                return range.getClientRects()[0];
	            }
	            range = DOC.createRange();
	            range.selectNode(el);
	            return range.getBoundingClientRect();
	        };
	        const rectsId = `${instanceId}-client-rects-div`;
	        const divElement = document.createElement('div');
	        divElement.setAttribute('id', rectsId);
	        DOC.body.appendChild(divElement);
	        patch(divElement, html `
		<div id="${rectsId}">
			<style>
			.rect-ghost,
			.rect-known {
				top: 0;
				left: 0;
				position: absolute;
				visibility: hidden;
			}
			.rect-known {
				width: 100px;
				height: 100px;
				transform: rotate(45deg);
			}
			.rect-ghost {
				width: 0;
				height: 0;
			}
			</style>
			<div class="rect-known"></div>
			<div class="rect-ghost"></div>
			<div style="perspective:100px;width:1000.099%;" id="rect-container">
				<style>
				.rects {
					width: 1000%;
					height: 1000%;
					max-width: 1000%;
				}
				.absolute {
					position: absolute;
				}
				#cRect1 {
					border: solid 2.715px;
					border-color: #F72585;
					padding: 3.98px;
					margin-left: 12.12px;
				}
				#cRect2 {
					border: solid 2px;
					border-color: #7209B7;
					font-size: 30px;
					margin-top: 20px;
					padding: 3.98px;
					transform: skewY(23.1753218deg) rotate3d(10.00099, 90, 0.100000000000009, 60000000000008.00000009deg);
				}
				#cRect3 {
					border: solid 2.89px;
					border-color: #3A0CA3;
					font-size: 45px;
					transform: skewY(-23.1753218deg) scale(1099.0000000099, 1.89) matrix(1.11, 2.0001, -1.0001, 1.009, 150, 94.4);
					margin-top: 50px;
				}
				#cRect4 {
					border: solid 2px;
					border-color: #4361EE;
					transform: matrix(1.11, 2.0001, -1.0001, 1.009, 150, 94.4);
					margin-top: 11.1331px;
					margin-left: 12.1212px;
					padding: 4.4545px;
					left: 239.4141px;
					top: 8.5050px;
				}
				#cRect5 {
					border: solid 2px;
					border-color: #4CC9F0;
					margin-left: 42.395pt;
				}
				#cRect6 {
					border: solid 2px;
					border-color: #F72585;
					transform: perspective(12890px) translateZ(101.5px);
					padding: 12px;
				}
				#cRect7 {
					margin-top: -350.552px;
					margin-left: 0.9099rem;
					border: solid 2px;
					border-color: #4361EE;
				}
				#cRect8 {
					margin-top: -150.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #3A0CA3;
				}
				#cRect9 {
					margin-top: -110.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #7209B7;
				}
				#cRect10 {
					margin-top: -315.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#cRect11 {
					width: 10px;
					height: 10px;
					margin-left: 15.0000009099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#cRect12 {
					width: 10px;
					height: 10px;
					margin-left: 15.0000009099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#rect-container .shift-dom-rect {
					top: 1px !important;
					left: 1px !important;
				}
				</style>
				<div id="cRect1" class="rects"></div>
				<div id="cRect2" class="rects"></div>
				<div id="cRect3" class="rects"></div>
				<div id="cRect4" class="rects absolute"></div>
				<div id="cRect5" class="rects"></div>
				<div id="cRect6" class="rects"></div>
				<div id="cRect7" class="rects absolute"></div>
				<div id="cRect8" class="rects absolute"></div>
				<div id="cRect9" class="rects absolute"></div>
				<div id="cRect10" class="rects absolute"></div>
				<div id="cRect11" class="rects"></div>
				<div id="cRect12" class="rects"></div>
				<div id="emoji" class="emojis"></div>
			</div>
			<div id="emoji-container">
				<style>
				.domrect-emoji {
					font-family: ${CSS_FONT_FAMILY};
					font-size: 200px !important;
					height: auto;
					position: absolute !important;
					transform: scale(1.000999);
				}
				</style>
				${EMOJIS.map((emoji) => {
            return `<div class="domrect-emoji">${emoji}</div>`;
        }).join('')}
			</div>
		</div>
		`);
	        // get emoji set and system
	        const pattern = new Set();
	        await queueEvent(timer);
	        const emojiElems = [...DOC.getElementsByClassName('domrect-emoji')];
	        const emojiSet = emojiElems.reduce((emojiSet, el, i) => {
	            const emoji = EMOJIS[i];
	            const { height, width } = getBestRect(el);
	            const dimensions = `${width},${height}`;
	            if (!pattern.has(dimensions)) {
	                pattern.add(dimensions);
	                emojiSet.add(emoji);
	            }
	            return emojiSet;
	        }, new Set());
	        const domrectSystemSum = 0.00001 * [...pattern].map((x) => {
	            return x.split(',').reduce((acc, x) => acc += (+x || 0), 0);
	        }).reduce((acc, x) => acc += x, 0);
	        // get clientRects
	        const range = document.createRange();
	        const rectElems = DOC.getElementsByClassName('rects');
	        const elementClientRects = [...rectElems].map((el) => {
	            return toNativeObject(el.getClientRects()[0]);
	        });
	        const elementBoundingClientRect = [...rectElems].map((el) => {
	            return toNativeObject(el.getBoundingClientRect());
	        });
	        const rangeClientRects = [...rectElems].map((el) => {
	            range.selectNode(el);
	            return toNativeObject(range.getClientRects()[0]);
	        });
	        const rangeBoundingClientRect = [...rectElems].map((el) => {
	            range.selectNode(el);
	            return toNativeObject(range.getBoundingClientRect());
	        });
	        // detect failed shift calculation
	        // inspired by https://arkenfox.github.io/TZP
	        const rect4 = [...rectElems][3];
	        const { top: initialTop } = elementClientRects[3];
	        rect4.classList.add('shift-dom-rect');
	        const { top: shiftedTop } = toNativeObject(rect4.getClientRects()[0]);
	        rect4.classList.remove('shift-dom-rect');
	        const { top: unshiftedTop } = toNativeObject(rect4.getClientRects()[0]);
	        const diff = initialTop - shiftedTop;
	        const unshiftLie = diff != (unshiftedTop - shiftedTop);
	        if (unshiftLie) {
	            lied = true;
	            documentLie('Element.getClientRects', 'failed unshift calculation');
	        }
	        // detect failed math calculation lie
	        let mathLie = false;
	        elementClientRects.forEach((rect) => {
	            const { right, left, width, bottom, top, height, x, y } = rect;
	            if (right - left != width ||
	                bottom - top != height ||
	                right - x != width ||
	                bottom - y != height) {
	                lied = true;
	                mathLie = true;
	            }
	            return;
	        });
	        if (mathLie) {
	            documentLie('Element.getClientRects', 'failed math calculation');
	        }
	        // detect equal elements mismatch lie
	        const { right: right1, left: left1 } = elementClientRects[10];
	        const { right: right2, left: left2 } = elementClientRects[11];
	        if (right1 != right2 || left1 != left2) {
	            documentLie('Element.getClientRects', 'equal elements mismatch');
	            lied = true;
	        }
	        // detect unknown rotate dimensions
	        const knownEl = [...DOC.getElementsByClassName('rect-known')][0];
	        const knownDimensions = toNativeObject(knownEl.getClientRects()[0]);
	        const knownHash = hashMini(knownDimensions);
	        if (IS_BLINK) {
	            if (devicePixelRatio === 1 && knownHash !== '9d9215cc') {
	                documentLie('Element.getClientRects', 'unknown rotate dimensions');
	                lied = true;
	            }
	        }
	        else if (IS_GECKO) {
	            const Rotate = {
	                'e38453f0': true, // 100, etc
	            };
	            if (!Rotate[knownHash]) {
	                documentLie('Element.getClientRects', 'unknown rotate dimensions');
	                lied = true;
	            }
	        }
	        // detect ghost dimensions
	        const ghostEl = [...DOC.getElementsByClassName('rect-ghost')][0];
	        const ghostDimensions = toNativeObject(ghostEl.getClientRects()[0]);
	        const hasGhostDimensions = Object.keys(ghostDimensions)
	            .some((key) => ghostDimensions[key] !== 0);
	        if (hasGhostDimensions) {
	            documentLie('Element.getClientRects', 'unknown ghost dimensions');
	            lied = true;
	        }
	        DOC.body.removeChild(DOC.getElementById(rectsId));
	        logTestResult({ time: timer.stop(), test: 'rects', passed: true });
	        return {
	            elementClientRects,
	            elementBoundingClientRect,
	            rangeClientRects,
	            rangeBoundingClientRect,
	            emojiSet: [...emojiSet],
	            domrectSystemSum,
	            lied,
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'rects', passed: false });
	        captureError(error);
	        return;
	    }
	}

	function hasTouch() {
	    try {
	        return 'ontouchstart' in window && !!document.createEvent('TouchEvent');
	    }
	    catch (err) {
	        return false;
	    }
	}
	async function getScreen(log = true) {
	    try {
	        const timer = createTimer();
	        timer.start();
	        let lied = (lieProps['Screen.width'] ||
	            lieProps['Screen.height'] ||
	            lieProps['Screen.availWidth'] ||
	            lieProps['Screen.availHeight'] ||
	            lieProps['Screen.colorDepth'] ||
	            lieProps['Screen.pixelDepth']) || false;
	        const s = (window.screen || {});
	        const { width, height, availWidth, availHeight, colorDepth, pixelDepth, } = s;
	        const dpr = window.devicePixelRatio || 0;
	        const firefoxWithHighDPR = IS_GECKO && (dpr != 1);
	        if (!firefoxWithHighDPR) {
	            // firefox with high dpr requires floating point precision dimensions
	            const matchMediaLie = !matchMedia(`(device-width: ${width}px) and (device-height: ${height}px)`).matches;
	            if (matchMediaLie) {
	                lied = true;
	                documentLie('Screen', 'failed matchMedia');
	            }
	        }
	        const hasLiedDPR = !matchMedia(`(resolution: ${dpr}dppx)`).matches;
	        if (!IS_WEBKIT && hasLiedDPR) {
	            lied = true;
	            documentLie('Window.devicePixelRatio', 'lied dpr');
	        }
	        const noTaskbar = !(width - availWidth || height - availHeight);
	        if (width > 800 && noTaskbar) {
	            LowerEntropy.SCREEN = true;
	        }
	        const data = {
	            width,
	            height,
	            availWidth,
	            availHeight,
	            colorDepth,
	            pixelDepth,
	            touch: hasTouch(),
	            lied,
	        };
	        log && logTestResult({ time: timer.stop(), test: 'screen', passed: true });
	        return data;
	    }
	    catch (error) {
	        log && logTestResult({ test: 'screen', passed: false });
	        captureError(error);
	        return;
	    }
	}

	function getTimezone() {
	    // inspired by https://arkenfox.github.io/TZP
	    // https://github.com/vvo/tzdb/blob/master/time-zones-names.json
	    const cities = [
	        'UTC',
	        'GMT',
	        'Etc/GMT+0',
	        'Etc/GMT+1',
	        'Etc/GMT+10',
	        'Etc/GMT+11',
	        'Etc/GMT+12',
	        'Etc/GMT+2',
	        'Etc/GMT+3',
	        'Etc/GMT+4',
	        'Etc/GMT+5',
	        'Etc/GMT+6',
	        'Etc/GMT+7',
	        'Etc/GMT+8',
	        'Etc/GMT+9',
	        'Etc/GMT-1',
	        'Etc/GMT-10',
	        'Etc/GMT-11',
	        'Etc/GMT-12',
	        'Etc/GMT-13',
	        'Etc/GMT-14',
	        'Etc/GMT-2',
	        'Etc/GMT-3',
	        'Etc/GMT-4',
	        'Etc/GMT-5',
	        'Etc/GMT-6',
	        'Etc/GMT-7',
	        'Etc/GMT-8',
	        'Etc/GMT-9',
	        'Etc/GMT',
	        'Africa/Abidjan',
	        'Africa/Accra',
	        'Africa/Addis_Ababa',
	        'Africa/Algiers',
	        'Africa/Asmara',
	        'Africa/Bamako',
	        'Africa/Bangui',
	        'Africa/Banjul',
	        'Africa/Bissau',
	        'Africa/Blantyre',
	        'Africa/Brazzaville',
	        'Africa/Bujumbura',
	        'Africa/Cairo',
	        'Africa/Casablanca',
	        'Africa/Ceuta',
	        'Africa/Conakry',
	        'Africa/Dakar',
	        'Africa/Dar_es_Salaam',
	        'Africa/Djibouti',
	        'Africa/Douala',
	        'Africa/El_Aaiun',
	        'Africa/Freetown',
	        'Africa/Gaborone',
	        'Africa/Harare',
	        'Africa/Johannesburg',
	        'Africa/Juba',
	        'Africa/Kampala',
	        'Africa/Khartoum',
	        'Africa/Kigali',
	        'Africa/Kinshasa',
	        'Africa/Lagos',
	        'Africa/Libreville',
	        'Africa/Lome',
	        'Africa/Luanda',
	        'Africa/Lubumbashi',
	        'Africa/Lusaka',
	        'Africa/Malabo',
	        'Africa/Maputo',
	        'Africa/Maseru',
	        'Africa/Mbabane',
	        'Africa/Mogadishu',
	        'Africa/Monrovia',
	        'Africa/Nairobi',
	        'Africa/Ndjamena',
	        'Africa/Niamey',
	        'Africa/Nouakchott',
	        'Africa/Ouagadougou',
	        'Africa/Porto-Novo',
	        'Africa/Sao_Tome',
	        'Africa/Tripoli',
	        'Africa/Tunis',
	        'Africa/Windhoek',
	        'America/Adak',
	        'America/Anchorage',
	        'America/Anguilla',
	        'America/Antigua',
	        'America/Araguaina',
	        'America/Argentina/Buenos_Aires',
	        'America/Argentina/Catamarca',
	        'America/Argentina/Cordoba',
	        'America/Argentina/Jujuy',
	        'America/Argentina/La_Rioja',
	        'America/Argentina/Mendoza',
	        'America/Argentina/Rio_Gallegos',
	        'America/Argentina/Salta',
	        'America/Argentina/San_Juan',
	        'America/Argentina/San_Luis',
	        'America/Argentina/Tucuman',
	        'America/Argentina/Ushuaia',
	        'America/Aruba',
	        'America/Asuncion',
	        'America/Atikokan',
	        'America/Bahia',
	        'America/Bahia_Banderas',
	        'America/Barbados',
	        'America/Belem',
	        'America/Belize',
	        'America/Blanc-Sablon',
	        'America/Boa_Vista',
	        'America/Bogota',
	        'America/Boise',
	        'America/Cambridge_Bay',
	        'America/Campo_Grande',
	        'America/Cancun',
	        'America/Caracas',
	        'America/Cayenne',
	        'America/Cayman',
	        'America/Chicago',
	        'America/Chihuahua',
	        'America/Costa_Rica',
	        'America/Creston',
	        'America/Cuiaba',
	        'America/Curacao',
	        'America/Danmarkshavn',
	        'America/Dawson',
	        'America/Dawson_Creek',
	        'America/Denver',
	        'America/Detroit',
	        'America/Dominica',
	        'America/Edmonton',
	        'America/Eirunepe',
	        'America/El_Salvador',
	        'America/Fort_Nelson',
	        'America/Fortaleza',
	        'America/Glace_Bay',
	        'America/Godthab',
	        'America/Goose_Bay',
	        'America/Grand_Turk',
	        'America/Grenada',
	        'America/Guadeloupe',
	        'America/Guatemala',
	        'America/Guayaquil',
	        'America/Guyana',
	        'America/Halifax',
	        'America/Havana',
	        'America/Hermosillo',
	        'America/Indiana/Indianapolis',
	        'America/Indiana/Knox',
	        'America/Indiana/Marengo',
	        'America/Indiana/Petersburg',
	        'America/Indiana/Tell_City',
	        'America/Indiana/Vevay',
	        'America/Indiana/Vincennes',
	        'America/Indiana/Winamac',
	        'America/Inuvik',
	        'America/Iqaluit',
	        'America/Jamaica',
	        'America/Juneau',
	        'America/Kentucky/Louisville',
	        'America/Kentucky/Monticello',
	        'America/Kralendijk',
	        'America/La_Paz',
	        'America/Lima',
	        'America/Los_Angeles',
	        'America/Lower_Princes',
	        'America/Maceio',
	        'America/Managua',
	        'America/Manaus',
	        'America/Marigot',
	        'America/Martinique',
	        'America/Matamoros',
	        'America/Mazatlan',
	        'America/Menominee',
	        'America/Merida',
	        'America/Metlakatla',
	        'America/Mexico_City',
	        'America/Miquelon',
	        'America/Moncton',
	        'America/Monterrey',
	        'America/Montevideo',
	        'America/Montserrat',
	        'America/Nassau',
	        'America/New_York',
	        'America/Nipigon',
	        'America/Nome',
	        'America/Noronha',
	        'America/North_Dakota/Beulah',
	        'America/North_Dakota/Center',
	        'America/North_Dakota/New_Salem',
	        'America/Ojinaga',
	        'America/Panama',
	        'America/Pangnirtung',
	        'America/Paramaribo',
	        'America/Phoenix',
	        'America/Port-au-Prince',
	        'America/Port_of_Spain',
	        'America/Porto_Velho',
	        'America/Puerto_Rico',
	        'America/Punta_Arenas',
	        'America/Rainy_River',
	        'America/Rankin_Inlet',
	        'America/Recife',
	        'America/Regina',
	        'America/Resolute',
	        'America/Rio_Branco',
	        'America/Santarem',
	        'America/Santiago',
	        'America/Santo_Domingo',
	        'America/Sao_Paulo',
	        'America/Scoresbysund',
	        'America/Sitka',
	        'America/St_Barthelemy',
	        'America/St_Johns',
	        'America/St_Kitts',
	        'America/St_Lucia',
	        'America/St_Thomas',
	        'America/St_Vincent',
	        'America/Swift_Current',
	        'America/Tegucigalpa',
	        'America/Thule',
	        'America/Thunder_Bay',
	        'America/Tijuana',
	        'America/Toronto',
	        'America/Tortola',
	        'America/Vancouver',
	        'America/Whitehorse',
	        'America/Winnipeg',
	        'America/Yakutat',
	        'America/Yellowknife',
	        'Antarctica/Casey',
	        'Antarctica/Davis',
	        'Antarctica/DumontDUrville',
	        'Antarctica/Macquarie',
	        'Antarctica/Mawson',
	        'Antarctica/McMurdo',
	        'Antarctica/Palmer',
	        'Antarctica/Rothera',
	        'Antarctica/Syowa',
	        'Antarctica/Troll',
	        'Antarctica/Vostok',
	        'Arctic/Longyearbyen',
	        'Asia/Aden',
	        'Asia/Almaty',
	        'Asia/Amman',
	        'Asia/Anadyr',
	        'Asia/Aqtau',
	        'Asia/Aqtobe',
	        'Asia/Ashgabat',
	        'Asia/Atyrau',
	        'Asia/Baghdad',
	        'Asia/Bahrain',
	        'Asia/Baku',
	        'Asia/Bangkok',
	        'Asia/Barnaul',
	        'Asia/Beirut',
	        'Asia/Bishkek',
	        'Asia/Brunei',
	        'Asia/Calcutta',
	        'Asia/Chita',
	        'Asia/Choibalsan',
	        'Asia/Colombo',
	        'Asia/Damascus',
	        'Asia/Dhaka',
	        'Asia/Dili',
	        'Asia/Dubai',
	        'Asia/Dushanbe',
	        'Asia/Famagusta',
	        'Asia/Gaza',
	        'Asia/Hebron',
	        'Asia/Ho_Chi_Minh',
	        'Asia/Hong_Kong',
	        'Asia/Hovd',
	        'Asia/Irkutsk',
	        'Asia/Jakarta',
	        'Asia/Jayapura',
	        'Asia/Jerusalem',
	        'Asia/Kabul',
	        'Asia/Kamchatka',
	        'Asia/Karachi',
	        'Asia/Kathmandu',
	        'Asia/Khandyga',
	        'Asia/Kolkata',
	        'Asia/Krasnoyarsk',
	        'Asia/Kuala_Lumpur',
	        'Asia/Kuching',
	        'Asia/Kuwait',
	        'Asia/Macau',
	        'Asia/Magadan',
	        'Asia/Makassar',
	        'Asia/Manila',
	        'Asia/Muscat',
	        'Asia/Nicosia',
	        'Asia/Novokuznetsk',
	        'Asia/Novosibirsk',
	        'Asia/Omsk',
	        'Asia/Oral',
	        'Asia/Phnom_Penh',
	        'Asia/Pontianak',
	        'Asia/Pyongyang',
	        'Asia/Qatar',
	        'Asia/Qostanay',
	        'Asia/Qyzylorda',
	        'Asia/Riyadh',
	        'Asia/Sakhalin',
	        'Asia/Samarkand',
	        'Asia/Seoul',
	        'Asia/Shanghai',
	        'Asia/Singapore',
	        'Asia/Srednekolymsk',
	        'Asia/Taipei',
	        'Asia/Tashkent',
	        'Asia/Tbilisi',
	        'Asia/Tehran',
	        'Asia/Thimphu',
	        'Asia/Tokyo',
	        'Asia/Tomsk',
	        'Asia/Ulaanbaatar',
	        'Asia/Urumqi',
	        'Asia/Ust-Nera',
	        'Asia/Vientiane',
	        'Asia/Vladivostok',
	        'Asia/Yakutsk',
	        'Asia/Yangon',
	        'Asia/Yekaterinburg',
	        'Asia/Yerevan',
	        'Atlantic/Azores',
	        'Atlantic/Bermuda',
	        'Atlantic/Canary',
	        'Atlantic/Cape_Verde',
	        'Atlantic/Faroe',
	        'Atlantic/Madeira',
	        'Atlantic/Reykjavik',
	        'Atlantic/South_Georgia',
	        'Atlantic/St_Helena',
	        'Atlantic/Stanley',
	        'Australia/Adelaide',
	        'Australia/Brisbane',
	        'Australia/Broken_Hill',
	        'Australia/Currie',
	        'Australia/Darwin',
	        'Australia/Eucla',
	        'Australia/Hobart',
	        'Australia/Lindeman',
	        'Australia/Lord_Howe',
	        'Australia/Melbourne',
	        'Australia/Perth',
	        'Australia/Sydney',
	        'Europe/Amsterdam',
	        'Europe/Andorra',
	        'Europe/Astrakhan',
	        'Europe/Athens',
	        'Europe/Belgrade',
	        'Europe/Berlin',
	        'Europe/Bratislava',
	        'Europe/Brussels',
	        'Europe/Bucharest',
	        'Europe/Budapest',
	        'Europe/Busingen',
	        'Europe/Chisinau',
	        'Europe/Copenhagen',
	        'Europe/Dublin',
	        'Europe/Gibraltar',
	        'Europe/Guernsey',
	        'Europe/Helsinki',
	        'Europe/Isle_of_Man',
	        'Europe/Istanbul',
	        'Europe/Jersey',
	        'Europe/Kaliningrad',
	        'Europe/Kiev',
	        'Europe/Kirov',
	        'Europe/Lisbon',
	        'Europe/Ljubljana',
	        'Europe/London',
	        'Europe/Luxembourg',
	        'Europe/Madrid',
	        'Europe/Malta',
	        'Europe/Mariehamn',
	        'Europe/Minsk',
	        'Europe/Monaco',
	        'Europe/Moscow',
	        'Europe/Oslo',
	        'Europe/Paris',
	        'Europe/Podgorica',
	        'Europe/Prague',
	        'Europe/Riga',
	        'Europe/Rome',
	        'Europe/Samara',
	        'Europe/San_Marino',
	        'Europe/Sarajevo',
	        'Europe/Saratov',
	        'Europe/Simferopol',
	        'Europe/Skopje',
	        'Europe/Sofia',
	        'Europe/Stockholm',
	        'Europe/Tallinn',
	        'Europe/Tirane',
	        'Europe/Ulyanovsk',
	        'Europe/Uzhgorod',
	        'Europe/Vaduz',
	        'Europe/Vatican',
	        'Europe/Vienna',
	        'Europe/Vilnius',
	        'Europe/Volgograd',
	        'Europe/Warsaw',
	        'Europe/Zagreb',
	        'Europe/Zaporozhye',
	        'Europe/Zurich',
	        'Indian/Antananarivo',
	        'Indian/Chagos',
	        'Indian/Christmas',
	        'Indian/Cocos',
	        'Indian/Comoro',
	        'Indian/Kerguelen',
	        'Indian/Mahe',
	        'Indian/Maldives',
	        'Indian/Mauritius',
	        'Indian/Mayotte',
	        'Indian/Reunion',
	        'Pacific/Apia',
	        'Pacific/Auckland',
	        'Pacific/Bougainville',
	        'Pacific/Chatham',
	        'Pacific/Chuuk',
	        'Pacific/Easter',
	        'Pacific/Efate',
	        'Pacific/Enderbury',
	        'Pacific/Fakaofo',
	        'Pacific/Fiji',
	        'Pacific/Funafuti',
	        'Pacific/Galapagos',
	        'Pacific/Gambier',
	        'Pacific/Guadalcanal',
	        'Pacific/Guam',
	        'Pacific/Honolulu',
	        'Pacific/Kiritimati',
	        'Pacific/Kosrae',
	        'Pacific/Kwajalein',
	        'Pacific/Majuro',
	        'Pacific/Marquesas',
	        'Pacific/Midway',
	        'Pacific/Nauru',
	        'Pacific/Niue',
	        'Pacific/Norfolk',
	        'Pacific/Noumea',
	        'Pacific/Pago_Pago',
	        'Pacific/Palau',
	        'Pacific/Pitcairn',
	        'Pacific/Pohnpei',
	        'Pacific/Port_Moresby',
	        'Pacific/Rarotonga',
	        'Pacific/Saipan',
	        'Pacific/Tahiti',
	        'Pacific/Tarawa',
	        'Pacific/Tongatapu',
	        'Pacific/Wake',
	        'Pacific/Wallis',
	    ];
	    const getTimezoneOffset = () => {
	        const [year, month, day] = JSON.stringify(new Date())
	            .slice(1, 11)
	            .split('-');
	        const dateString = `${month}/${day}/${year}`;
	        const dateStringUTC = `${year}-${month}-${day}`;
	        const now = +new Date(dateString);
	        const utc = +new Date(dateStringUTC);
	        const offset = +((now - utc) / 60000);
	        return ~~offset;
	    };
	    const getTimezoneOffsetHistory = ({ year, city = null }) => {
	        const format = {
	            timeZone: '',
	            year: 'numeric',
	            month: 'numeric',
	            day: 'numeric',
	            hour: 'numeric',
	            minute: 'numeric',
	            second: 'numeric',
	        };
	        const minute = 60000;
	        let formatter;
	        let summer;
	        if (city) {
	            const options = {
	                ...format,
	                timeZone: city,
	            };
	            // @ts-ignore
	            formatter = new Intl.DateTimeFormat('en', options);
	            summer = +new Date(formatter.format(new Date(`7/1/${year}`)));
	        }
	        else {
	            summer = +new Date(`7/1/${year}`);
	        }
	        const summerUTCTime = +new Date(`${year}-07-01`);
	        const offset = (summer - summerUTCTime) / minute;
	        return offset;
	    };
	    const binarySearch = (list, fn) => {
	        const end = list.length;
	        const middle = Math.floor(end / 2);
	        const [left, right] = [list.slice(0, middle), list.slice(middle, end)];
	        const found = fn(left);
	        return end == 1 || found.length ? found : binarySearch(right, fn);
	    };
	    const decryptLocation = ({ year, timeZone }) => {
	        const system = getTimezoneOffsetHistory({ year });
	        const resolvedOptions = getTimezoneOffsetHistory({ year, city: timeZone });
	        const filter = (cities) => cities
	            .filter((city) => system == getTimezoneOffsetHistory({ year, city }));
	        // get city region set
	        const decryption = (system == resolvedOptions ? [timeZone] : binarySearch(cities, filter));
	        // reduce set to one city
	        const decrypted = (decryption.length == 1 && decryption[0] == timeZone ? timeZone : hashMini(decryption));
	        return decrypted;
	    };
	    const formatLocation = (x) => {
	        try {
	            return x.replace(/_/, ' ').split('/').join(', ');
	        }
	        catch (error) { }
	        return x;
	    };
	    try {
	        const timer = createTimer();
	        timer.start();
	        const lied = (lieProps['Date.getTimezoneOffset'] ||
	            lieProps['Intl.DateTimeFormat.resolvedOptions'] ||
	            lieProps['Intl.RelativeTimeFormat.resolvedOptions']) || false;
	        const year = 1113;
	        // eslint-disable-next-line new-cap
	        const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
	        const decrypted = decryptLocation({ year, timeZone });
	        const locationEpoch = +new Date(new Date(`7/1/${year}`));
	        const notWithinParentheses = /.*\(|\).*/g;
	        const data = {
	            zone: ('' + new Date()).replace(notWithinParentheses, ''),
	            location: formatLocation(timeZone),
	            locationMeasured: formatLocation(decrypted),
	            locationEpoch,
	            offset: new Date().getTimezoneOffset(),
	            offsetComputed: getTimezoneOffset(),
	            lied,
	        };
	        logTestResult({ time: timer.stop(), test: 'timezone', passed: true });
	        return { ...data };
	    }
	    catch (error) {
	        logTestResult({ test: 'timezone', passed: false });
	        captureError(error);
	        return;
	    }
	}

	var Platform;
	(function (Platform) {
	    Platform["WINDOWS"] = "Windows";
	    Platform["MAC"] = "Mac";
	    Platform["LINUX"] = "Linux";
	    Platform["ANDROID"] = "Android";
	    Platform["CHROME_OS"] = "Chrome OS";
	})(Platform || (Platform = {}));
	const SYSTEM_FONTS = [
	    'caption',
	    'icon',
	    'menu',
	    'message-box',
	    'small-caption',
	    'status-bar',
	];

	function getPlatformEstimate() {
	    if (!IS_BLINK)
	        return [];
	    const v80 = 'getVideoPlaybackQuality' in HTMLVideoElement.prototype;
	    const v81 = CSS.supports('color-scheme: initial');
	    const v84 = CSS.supports('appearance: initial');
	    const v86 = 'DisplayNames' in Intl;
	    const v88 = CSS.supports('aspect-ratio: initial');
	    const v89 = CSS.supports('border-end-end-radius: initial');
	    const v95 = 'randomUUID' in Crypto.prototype;
	    const hasBarcodeDetector = 'BarcodeDetector' in window;
	    // @ts-expect-error if not supported
	    const hasDownlinkMax = 'downlinkMax' in (window.NetworkInformation?.prototype || {});
	    const hasContentIndex = 'ContentIndex' in window;
	    const hasContactsManager = 'ContactsManager' in window;
	    const hasEyeDropper = 'EyeDropper' in window;
	    const hasFileSystemWritableFileStream = 'FileSystemWritableFileStream' in window;
	    const hasHid = 'HID' in window && 'HIDDevice' in window;
	    const hasSerialPort = 'SerialPort' in window && 'Serial' in window;
	    const hasSharedWorker = 'SharedWorker' in window;
	    const hasTouch = 'ontouchstart' in Window && 'TouchEvent' in window;
	    const hasAppBadge = 'setAppBadge' in Navigator.prototype;
	    const hasFeature = (version, condition) => {
	        return (version ? [condition] : []);
	    };
	    const estimate = {
	        [Platform.ANDROID]: [
	            ...hasFeature(v88, hasBarcodeDetector),
	            ...hasFeature(v84, hasContentIndex),
	            ...hasFeature(v80, hasContactsManager),
	            hasDownlinkMax,
	            ...hasFeature(v95, !hasEyeDropper),
	            ...hasFeature(v86, !hasFileSystemWritableFileStream),
	            ...hasFeature(v89, !hasHid),
	            ...hasFeature(v89, !hasSerialPort),
	            !hasSharedWorker,
	            hasTouch,
	            ...hasFeature(v81, !hasAppBadge),
	        ],
	        [Platform.CHROME_OS]: [
	            ...hasFeature(v88, hasBarcodeDetector),
	            ...hasFeature(v84, !hasContentIndex),
	            ...hasFeature(v80, !hasContactsManager),
	            hasDownlinkMax,
	            ...hasFeature(v95, hasEyeDropper),
	            ...hasFeature(v86, hasFileSystemWritableFileStream),
	            ...hasFeature(v89, hasHid),
	            ...hasFeature(v89, hasSerialPort),
	            hasSharedWorker,
	            hasTouch || !hasTouch,
	            ...hasFeature(v81, !hasAppBadge),
	        ],
	        [Platform.WINDOWS]: [
	            ...hasFeature(v88, !hasBarcodeDetector),
	            ...hasFeature(v84, !hasContentIndex),
	            ...hasFeature(v80, !hasContactsManager),
	            !hasDownlinkMax,
	            ...hasFeature(v95, hasEyeDropper),
	            ...hasFeature(v86, hasFileSystemWritableFileStream),
	            ...hasFeature(v89, hasHid),
	            ...hasFeature(v89, hasSerialPort),
	            hasSharedWorker,
	            hasTouch || !hasTouch,
	            ...hasFeature(v81, hasAppBadge),
	        ],
	        [Platform.MAC]: [
	            ...hasFeature(v88, hasBarcodeDetector),
	            ...hasFeature(v84, !hasContentIndex),
	            ...hasFeature(v80, !hasContactsManager),
	            !hasDownlinkMax,
	            ...hasFeature(v95, hasEyeDropper),
	            ...hasFeature(v86, hasFileSystemWritableFileStream),
	            ...hasFeature(v89, hasHid),
	            ...hasFeature(v89, hasSerialPort),
	            hasSharedWorker,
	            !hasTouch,
	            ...hasFeature(v81, hasAppBadge),
	        ],
	        [Platform.LINUX]: [
	            ...hasFeature(v88, !hasBarcodeDetector),
	            ...hasFeature(v84, !hasContentIndex),
	            ...hasFeature(v80, !hasContactsManager),
	            !hasDownlinkMax,
	            ...hasFeature(v95, hasEyeDropper),
	            ...hasFeature(v86, hasFileSystemWritableFileStream),
	            ...hasFeature(v89, hasHid),
	            ...hasFeature(v89, hasSerialPort),
	            hasSharedWorker,
	            !hasTouch || !hasTouch,
	            ...hasFeature(v81, !hasAppBadge),
	        ],
	    };
	    // Chrome only features
	    const headlessEstimate = {
	        noContentIndex: v84 && !hasContentIndex,
	        noContactsManager: v80 && !hasContactsManager,
	        noDownlinkMax: !hasDownlinkMax,
	    };
	    const scores = Object.keys(estimate).reduce((acc, key) => {
	        const list = estimate[key];
	        const score = +((list.filter((x) => x).length / list.length).toFixed(2));
	        acc[key] = score;
	        return acc;
	    }, {});
	    const platform = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
	    const highestScore = scores[platform];
	    return [scores, highestScore, headlessEstimate];
	}

	const GeckoFonts = {
	    '-apple-system': Platform.MAC,
	    'Segoe UI': Platform.WINDOWS,
	    'Tahoma': Platform.WINDOWS,
	    'Yu Gothic UI': Platform.WINDOWS,
	    'Microsoft JhengHei UI': Platform.WINDOWS,
	    'Microsoft YaHei UI': Platform.WINDOWS,
	    'Meiryo UI': Platform.WINDOWS,
	    'Cantarell': Platform.LINUX,
	    'Ubuntu': Platform.LINUX,
	    'Sans': Platform.LINUX,
	    'sans-serif': Platform.LINUX,
	    'Fira Sans': Platform.LINUX,
	    'Roboto': Platform.ANDROID,
	};
	function getSystemFonts() {
	    const { body } = document;
	    const el = document.createElement('div');
	    body.appendChild(el);
	    try {
	        const systemFonts = String([
	            ...SYSTEM_FONTS.reduce((acc, font) => {
	                el.setAttribute('style', `font: ${font} !important`);
	                return acc.add(getComputedStyle(el).fontFamily);
	            }, new Set()),
	        ]);
	        const geckoPlatform = GeckoFonts[systemFonts];
	        return GeckoFonts[systemFonts] ? `${systemFonts}:${geckoPlatform}` : systemFonts;
	    }
	    catch (err) {
	        return '';
	    }
	    finally {
	        body.removeChild(el);
	    }
	}

	/* eslint-disable new-cap */
	async function getHeadlessFeatures({ webgl, workerScope, }) {
	    try {
	        const timer = createTimer();
	        await queueEvent(timer);
	        const mimeTypes = Object.keys({ ...navigator.mimeTypes });
	        const systemFonts = getSystemFonts();
	        const [scores, highestScore, headlessEstimate] = getPlatformEstimate();
	        const data = {
	            chromium: IS_BLINK,
	            likeHeadless: {
	                noChrome: IS_BLINK && !('chrome' in window),
	                hasPermissionsBug: (IS_BLINK &&
	                    'permissions' in navigator &&
	                    await (async () => {
	                        const res = await navigator.permissions.query({ name: 'notifications' });
	                        return (res.state == 'prompt' &&
	                            'Notification' in window &&
	                            Notification.permission === 'denied');
	                    })()),
	                noPlugins: IS_BLINK && navigator.plugins.length === 0,
	                noMimeTypes: IS_BLINK && mimeTypes.length === 0,
	                notificationIsDenied: (IS_BLINK &&
	                    'Notification' in window &&
	                    (Notification.permission == 'denied')),
	                hasKnownBgColor: IS_BLINK && (() => {
	                    let rendered = PARENT_PHANTOM;
	                    if (!PARENT_PHANTOM) {
	                        rendered = document.createElement('div');
	                        document.body.appendChild(rendered);
	                    }
	                    if (!rendered)
	                        return false;
	                    rendered.setAttribute('style', `background-color: ActiveText`);
	                    const { backgroundColor: activeText } = getComputedStyle(rendered) || [];
	                    if (!PARENT_PHANTOM) {
	                        document.body.removeChild(rendered);
	                    }
	                    return activeText === 'rgb(255, 0, 0)';
	                })(),
	                prefersLightColor: matchMedia('(prefers-color-scheme: light)').matches,
	                uaDataIsBlank: ('userAgentData' in navigator && (
	                // @ts-expect-error if userAgentData is null
	                navigator.userAgentData?.platform === '' ||
	                    // @ts-expect-error if userAgentData is null
	                    await navigator.userAgentData.getHighEntropyValues(['platform']).platform === '')),
	                pdfIsDisabled: ('pdfViewerEnabled' in navigator && navigator.pdfViewerEnabled === false),
	                noTaskbar: (screen.height === screen.availHeight &&
	                    screen.width === screen.availWidth),
	                hasVvpScreenRes: ((innerWidth === screen.width && outerHeight === screen.height) || ('visualViewport' in window &&
	                    // @ts-expect-error if unsupported
	                    (visualViewport.width === screen.width && visualViewport.height === screen.height))),
	                hasSwiftShader: /SwiftShader/.test(workerScope?.webglRenderer),
	                noWebShare: IS_BLINK && CSS.supports('accent-color: initial') && (!('share' in navigator) || !('canShare' in navigator)),
	                noContentIndex: !!headlessEstimate?.noContentIndex,
	                noContactsManager: !!headlessEstimate?.noContactsManager,
	                noDownlinkMax: !!headlessEstimate?.noDownlinkMax,
	            },
	            headless: {
	                webDriverIsOn: ((CSS.supports('border-end-end-radius: initial') && navigator.webdriver === undefined) ||
	                    !!navigator.webdriver ||
	                    !!lieProps['Navigator.webdriver']),
	                hasHeadlessUA: (/HeadlessChrome/.test(navigator.userAgent) ||
	                    /HeadlessChrome/.test(navigator.appVersion)),
	                hasHeadlessWorkerUA: !!workerScope && (/HeadlessChrome/.test(workerScope.userAgent)),
	            },
	            stealth: {
	                hasIframeProxy: (() => {
	                    try {
	                        const iframe = document.createElement('iframe');
	                        iframe.srcdoc = instanceId;
	                        return !!iframe.contentWindow;
	                    }
	                    catch (err) {
	                        return true;
	                    }
	                })(),
	                hasHighChromeIndex: (() => {
	                    const key = 'chrome';
	                    const highIndexRange = -50;
	                    return (Object.keys(window).slice(highIndexRange).includes(key) &&
	                        Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key));
	                })(),
	                hasBadChromeRuntime: (() => {
	                    // @ts-expect-error if unsupported
	                    if (!('chrome' in window && 'runtime' in chrome)) {
	                        return false;
	                    }
	                    try {
	                        // @ts-expect-error if unsupported
	                        if ('prototype' in chrome.runtime.sendMessage ||
	                            // @ts-expect-error if unsupported
	                            'prototype' in chrome.runtime.connect) {
	                            return true;
	                        }
	                        // @ts-expect-error if unsupported
	                        new chrome.runtime.sendMessage;
	                        // @ts-expect-error if unsupported
	                        new chrome.runtime.connect;
	                        return true;
	                    }
	                    catch (err) {
	                        return err.constructor.name != 'TypeError' ? true : false;
	                    }
	                })(),
	                hasToStringProxy: (!!lieProps['Function.toString']),
	                hasBadWebGL: (() => {
	                    const { UNMASKED_RENDERER_WEBGL: gpu } = webgl?.parameters || {};
	                    const { webglRenderer: workerGPU } = workerScope || {};
	                    return (gpu && workerGPU && (gpu !== workerGPU));
	                })(),
	            },
	        };
	        const { likeHeadless, headless, stealth } = data;
	        const likeHeadlessKeys = Object.keys(likeHeadless);
	        const headlessKeys = Object.keys(headless);
	        const stealthKeys = Object.keys(stealth);
	        const likeHeadlessRating = +((likeHeadlessKeys.filter((key) => likeHeadless[key]).length / likeHeadlessKeys.length) * 100).toFixed(0);
	        const headlessRating = +((headlessKeys.filter((key) => headless[key]).length / headlessKeys.length) * 100).toFixed(0);
	        const stealthRating = +((stealthKeys.filter((key) => stealth[key]).length / stealthKeys.length) * 100).toFixed(0);
	        logTestResult({ time: timer.stop(), test: 'headless', passed: true });
	        return {
	            ...data,
	            likeHeadlessRating,
	            headlessRating,
	            stealthRating,
	            systemFonts,
	            platformEstimate: [scores, highestScore],
	        };
	    }
	    catch (error) {
	        logTestResult({ test: 'headless', passed: false });
	        captureError(error);
	        return;
	    }
	}

	// Standalone local collector adapter. No official UI, prediction service or telemetry.
	async function run() {
	    const started = performance.now();
	    const tasks = { navigator: () => getNavigator(undefined), canvas: getCanvas2d, audio: getOfflineAudioContext, webgl: getCanvasWebgl, fonts: getFonts, clientRects: getClientRects, screen: getScreen, timezone: getTimezone };
	    const entries = await Promise.all(Object.entries(tasks).map(async ([name, collect]) => {
	        try {
	            return [name, (await collect()) ?? null];
	        }
	        catch {
	            return [name, null];
	        }
	    }));
	    const values = Object.fromEntries(entries);
	    const headless = await getHeadlessFeatures({ webgl: values.webgl, workerScope: undefined });
	    // Worker probes are intentionally not included. Do not turn unrun checks into passes.
	    if (headless) {
	        delete headless.headless.hasHeadlessWorkerUA;
	        delete headless.likeHeadless.hasSwiftShader;
	        delete headless.stealth.hasBadWebGL;
	        delete headless.headlessRating;
	        delete headless.likeHeadlessRating;
	        delete headless.stealthRating;
	    }
	    const result = { modules: { ...values, headless: headless ?? null, prototypeLies, lies: getLies(), errors: getCapturedErrors() }, duration: Math.round(performance.now() - started) };
	    PARENT_PHANTOM?.remove();
	    parent.postMessage({ type: 'local-browser-diagnostics', result: JSON.parse(JSON.stringify(result)) }, new URL(document.baseURI).origin);
	}
	run().catch(() => parent.postMessage({ type: 'local-browser-diagnostics', error: '检测未完成，请重试。' }, new URL(document.baseURI).origin));

})();
