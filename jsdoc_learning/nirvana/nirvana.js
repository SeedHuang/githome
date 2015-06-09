! function() {
    if (!Function.prototype.bind) {
        Function.prototype.bind = function(context) {
            var slice = [].slice,
                args = slice.call(arguments, 1),
                self = this,
                nop = function() {},
                bound = function() {
                    return self.apply(this instanceof nop ? this : (context || {}),
                        args.concat(slice.call(arguments)));
                };
            nop.prototype = self.prototype;
            bound.prototype = new nop();
            return bound;
        };
    }
}();

var require, define;

(function(global) {
    var head = document.getElementsByTagName('head')[0],
        loadingMap = {},
        factoryMap = {},
        modulesMap = {},
        scriptsMap = {},
        resMap = {},
        pkgMap = {};



    function createScript(url, onerror) {
        if (url in scriptsMap) return;
        scriptsMap[url] = true;

        var script = document.createElement('script');
        if (onerror) {
            var tid = setTimeout(onerror, require.timeout);

            script.onerror = function() {
                clearTimeout(tid);
                onerror();
            };

            script.onreadystatechange = function() {
                if (this.readyState == 'complete') {
                    clearTimeout(tid);
                }
            }
        }
        script.type = 'text/javascript';
        script.src = url;
        head.appendChild(script);
        return script;
    }

    function loadScript(id, callback, onerror) {
        var queue = loadingMap[id] || (loadingMap[id] = []);
        queue.push(callback);

        //
        // resource map query
        //
        var res = resMap[id] || {};
        var pkg = res.pkg;
        var url;

        if (pkg) {
            url = pkgMap[pkg].url;
        } else {
            url = res.url || id;
        }

        createScript(url, onerror && function() {
            onerror(id);
        });
    }

    /**
    Metod of define module
    * @global
    * @constructor
    * @param {string} id - module id
    * @param {callback} factory - the call is used to make a module
    */
    define = function(id, factory) {
        factoryMap[id] = factory;

        var queue = loadingMap[id];
        if (queue) {
            for (var i = 0, n = queue.length; i < n; i++) {
                queue[i]();
            }
            delete loadingMap[id];
        }
    };

    /**
    Method of include a module
    * @global
    * @constructor
    * @param {string} id - module id
    */
    require = function(id) {
        id = require.alias(id);

        var mod = modulesMap[id];
        if (mod) {
            return mod.exports;
        }

        //
        // init module
        //
        var factory = factoryMap[id];
        if (!factory) {
            throw '[ModJS] Cannot find module `' + id + '`';
        }

        mod = modulesMap[id] = {
            exports: {}
        };

        //
        // factory: function OR value
        //
        var ret = (typeof factory == 'function') ? factory.apply(mod, [require, mod.exports, mod]) : factory;

        if (ret) {
            mod.exports = ret;
        }
        return mod.exports;
    };

    /**
    async load the model
    * @function require.async
    * @param {array} names - modoules' names
    * @param {callback} onload - callback of onload
    * @param {callback} onload - callback of onerror
    */
    require.async = function(names, onload, onerror) {
        if (typeof names == 'string') {
            names = [names];
        }

        for (var i = 0, n = names.length; i < n; i++) {
            names[i] = require.alias(names[i]);
        }

        var needMap = {};
        var needNum = 0;

        function findNeed(depArr) {
            for (var i = 0, n = depArr.length; i < n; i++) {
                //
                // skip loading or loaded
                //
                var dep = depArr[i];

                var child = resMap[dep];
                if (child && 'deps' in child) {
                    findNeed(child.deps);
                }

                if (dep in factoryMap || dep in needMap) {
                    continue;
                }

                needMap[dep] = true;
                needNum++;
                loadScript(dep, updateNeed, onerror);
            }
        }

        function updateNeed() {
            if (0 == needNum--) {
                var args = [];
                for (var i = 0, n = names.length; i < n; i++) {
                    args[i] = require(names[i]);
                }

                onload && onload.apply(global, args);
            }
        }

        findNeed(names);
        updateNeed();
    };

    require.resourceMap = function(obj) {
        var k, col;

        // merge `res` & `pkg` fields
        col = obj.res;
        for (k in col) {
            if (col.hasOwnProperty(k)) {
                resMap[k] = col[k];
            }
        }

        col = obj.pkg;
        for (k in col) {
            if (col.hasOwnProperty(k)) {
                pkgMap[k] = col[k];
            }
        }
    };


    require.loadJs = function(url) {
        createScript(url);
    };

    require.loadCss = function(cfg) {
        if (cfg.content) {
            var sty = document.createElement('style');
            sty.type = 'text/css';

            if (sty.styleSheet) { // IE
                sty.styleSheet.cssText = cfg.content;
            } else {
                sty.innerHTML = cfg.content;
            }
            head.appendChild(sty);
        } else if (cfg.url) {
            var link = document.createElement('link');
            link.href = cfg.url;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            head.appendChild(link);
        }
    };


    require.alias = function(id) {
        return id
    };

    require.timeout = 5000;

    define.amd = {
        'jQuery': true,
        'version': '1.0.0'
    };

})(this);

;
define('nv:api', function(require, exports, module) {
    //Web接口堆栈
    var WebAPIList = {};
    //客户端默认接口
    var ClientInterface = function(json) {
        try {
            return window.__bdcapi__.onWebEvent(JSON.stringify(json));
        } catch (e) {
            return null;
        }

    };
    //Web开放接口
    window.__bdwapi__ = {
        onClientEvent: function(json) { //onNativeEvent onClientEvent
            if (typeof json === 'string') {
                json = JSON.parse(json);
                var item = WebAPIList[json.action];
                if (item && typeof item.behavior === 'function') {
                    item.behavior(json);
                }
            }
        },
        setInterface: function(newInterface) {
            if (typeof newInterface === 'string') {
                ClientInterface = new Function('json', 'try { return ' + newInterface + ' } catch(e){ return null; }');
            }
        }
    };

    //注册函数模板
    function register(name, behavior) {
        var stack = this;
        if (typeof name === 'string') {
            stack[name] = {
                name: name,
                behavior: behavior
            };
        } else if (name.forEach) {
            name.forEach(function(i) {
                stack[i.name] = i;
            });
        }
    }

    var api = {
        //Web接口管理
        web: {
            register: function(name, behavior) {
                register.call(WebAPIList, name, behavior);
                return this;
            },
            call: function(json) {
                json = JSON.stringify(json);
                return window.__bdwapi__.onClientEvent(json);
            }
        },
        //客户端接口管理
        client: {
            call: function(json, behavior) {
                var returnValue = ClientInterface(json);
                if (typeof behavior == 'function' && typeof returnValue !== 'undefined') {
                    behavior(returnValue);
                }
                return returnValue;
            },
            setInterface: function(newInterface) {
                window.__bdwapi__.setInterface(newInterface);
            }
        }
    };
    module.exports = api;
});;
define('nv:app', function(require, exports, module) {
    var queue = [];
    var slice = queue.slice;
    var app = Object.defineProperties({
        version: '2.1.0'
    }, {
        ':queue': {
            value: queue,
            enumerable: false,
            configurable: false
        },
        get: {
            value: function(name) {
                return this[name] || (this[name] = {});
            },
            enumerable: false,
            configurable: false
        },
        push: {
            value: function() {
                queue.push.apply(queue, slice.call(arguments, 0));
                return this;
            },
            enumerable: false,
            configurable: false
        },
        run: {
            value: function(fn) {
                if ($.isFunction(fn)) {
                    fn.apply(this, slice.call(arguments, 1));
                } else if ($.isArray(fn)) {
                    $.aop(fn).apply(this, slice.call(arguments, 1));
                } else {
                    $.aop(queue).apply(this, slice.call(arguments, 0));
                    queue.length = 0;
                }
                return this;
            },
            enumerable: false,
            configurable: false
        }
    });
    module.exports = app;
});;
define('nv:cache', function(require, exports, module) {
    var CacheList = {};
    var defaultStorage = window.localStorage;
    var emptyFunction = function() {};
    if (!defaultStorage) {
        defaultStorage = {
            setItem: emptyFunction,
            getItem: emptyFunction
        }
    }
    //注册模板
    function register(config) {
        var name = config.name;
        if (name && config.remote) {
            //保障配置
            config = $.extend({
                data: {},
                params: {},
                maxAge: 600,
                domain: document.domain
            }, config);
            CacheList[name] = config;
        }
    }
    //检查过期
    var check = function(data, maxAge, now) {
        now = now || new Date();
        return Math.floor((now - new Date(parseInt(data._time, 32))) / 1000) < maxAge;
    }

    var cache = {
        register: function(options) {
            /*
            name 存储名
            storage 存储类型(默认localStorage) 
            remote 远程数据地址
            params 取数据时所带的默认参数
            maxAge 过期时间 单位秒
            domain 本地存储域名(尚未实现)
            behavior 对数据的处理行为, 返回值才会被缓存
            */
            if (options && options.forEach) {
                options.forEach(function(i) {
                    register(i)
                });
            } else {
                register(options);
            }
            return this;
        },
        get: function(name, params) {
            var date = +new Date();
            var config = CacheList[name];
            var deferred = $.Deferred();
            if (config) {
                //获得目标存储
                var storage = config.storage || defaultStorage;
                //当前数据参数
                var currentParams = $.extend({}, config.params, params);
                //参数字符串
                var paramsHash = $.md5(JSON.stringify(currentParams));

                //缓存数据
                var cacheData = config.data[paramsHash];
                if (cacheData && check(cacheData, config.maxAge, date)) {
                    //从缓存中获取数据
                    deferred.resolve(cacheData);
                } else {
                    //从Storage获取数据
                    storageData = storage.getItem('nv_data_' + name + '_' + paramsHash);
                    cacheData = !storageData ? cacheData : JSON.parse(storageData);
                    if (cacheData && check(cacheData, config.maxAge, date)) {
                        deferred.resolve(config.data = cacheData);
                    } else {
                        //从远程取得数据
                        // 在这之前， 需要添加一个版本号
                        currentParams = currentParams || {};
                        currentParams.version = config.version || "1.0";
                        // 开始请求
                        $.ajax({
                            url: config.remote,
                            data: currentParams,
                            traditional: true,
                            timeout: 8000,
                            dataType: 'jsonp',
                            success: function(data) {
                                //数据预处理
                                if ($.isFunction(config.behavior)) {
                                    data = config.behavior(data);
                                }
                                if (!data) {
                                    //网络出错使用过期数据
                                    if (cacheData) {
                                        deferred.resolve(cacheData);
                                    } else {
                                        //彻底没有数据 失败
                                        deferred.reject();
                                    }
                                    return;
                                } else if (data.errno) {
                                    deferred.reject(data.errno);
                                    return;
                                } else if (!data.data) {
                                    deferred.reject(999);
                                    return;
                                }

                                //时间戳
                                data._time = date.toString(32);
                                //缓存
                                config.data = data;
                                //返回数据
                                deferred.resolve(data);
                                //本地缓存(由于此项性能较低，所以放在最后执行)
                                storage.setItem('nv_data_' + name + '_' + paramsHash, JSON.stringify(data));
                            },
                            error: function() {
                                //网络出错使用过期数据
                                if (cacheData) {
                                    deferred.resolve(cacheData);
                                } else {
                                    //彻底没有数据 失败
                                    deferred.reject();
                                }
                            }
                        });
                    }
                }
            }
            return deferred;
        }
    };
    module.exports = cache;
});;
define('nv:directive', function(require, exports, module) {
    var DirectiveList = {};
    var emptyFunction = function() {};
    //废弃
    function remove(config) {
        if (config) {
            $(config.context).unbind(config.type, config.behavior);
            delete DirectiveList[config.name];
        }
    }
    //注册
    function register(config) {
        var name = config.name;
        if (name) {
            //保障配置
            config = $.extend({
                context: 'body',
                type: 'tap',
                behavior: emptyFunction
            }, config);

            //如果原来有这个指令就废弃掉原来的指令
            var now = DirectiveList[name] = ((DirectiveList[name] && remove(DirectiveList[name])), config);

            $(now.context).on(now.type, '[' + name + ']', function(e) {
                e.directive = now;
                now.behavior.call(this, e);
            });
        }
    }

    var directive = {
        register: function(options) {
            if (options.forEach) {
                options.forEach(function(i) {
                    register(i);
                });
            } else {
                register(options);
            }
            return this;
        },
        get: function(name) {
            return DirectiveList[name];
        },
        remove: function(name) {
            name && remove(DirectiveList[name]);
            return this;
        }
    }

    directive.register([{
        name: 'nv-url',
        behavior: function(e) {
            var directive = e.directive;
            location.href = $(this).attr(directive.name);
            e.stopPropagation();
        }
    }, {
        name: 'nv-jump',
        behavior: function(e) {
            var directive = e.directive;
            location.hash = $(this).attr(directive.name);
            e.stopPropagation();
        }
    }, {
        name: 'nv-on',
        type: 'click tap touchstart touchmove touchend swipeLeft swipeRight swipeUp swipeDown swipe singleTap doubleTap longTap',
        methods: {},
        behavior: function(e) {
            var me = $(this);
            var directive = e.directive;
            var events = me.attr(directive.name).split(',');
            events.forEach(function(i) {
                var method, type = [];
                var index = i.indexOf(':');
                if (index != -1) {
                    //获得事件列表
                    type = i.substr(0, index).split(' ');
                    //如果符合事件
                    if (type.indexOf(e.type) != -1) {
                        var ename = i.substr(index + 1);
                        method = DirectiveList[directive.name].methods[ename] || eval(ename);
                        $.isFunction(method) && method.call(me, e);
                    }
                } else {
                    //是click才执行
                    if (e.type == 'tap') {
                        //alert(e.type);
                        method = DirectiveList[directive.name].methods[i] || eval(i);
                        $.isFunction(method) && method.call(me, e);
                    }
                }
            });
        }
    }]);
    module.exports = directive;
});;
define('nv:router', function(require, exports, module) {
    var init = false;
    var routes = [];
    var otherRoute = {};
    var emptyFunction = function() {};

    //生产规则
    function _pathRegExp(path) {
        var params = ['route'];
        var regexp = path.replace(/\//g, '\\/').replace(/:(\w+)/g, function(all, name) {
            params.push(name);
            return '([\\w\.]+)';
        });
        return {
            _regexp: new RegExp('^' + regexp + '$'),
            _params: params
        };
    }

    //查询参数
    function _getQuery(s) {
        var result = {};
        s.replace(/[\?\&](\w+)=([^\&$]+)/g, function(all, key, val) {
            result[key] = val;
        });
        return result;
    }

    var _maxId = (+new Date),
        logurl = 'http://r2.mo.baidu.com/stat/rec.php?ver=2';
    if (location.hostname != 'm.baidu.com') {
        logurl = 'http://shahe.baidu.com/stat/rec.php?ver=2';
    }

    var comVersion = function(a, b) {
        a = a.split(".");
        b = b.split(".");
        var i = 0;
        for (i = 0; i < a.length; ++i) {
            if (parseInt(a[i]) > (parseInt(b[i]) || 0)) {
                return true;
            } else if (parseInt(a[i]) < (parseInt(b[i]) || 0)) {
                return false;
            }
        }
        for (; i < b.length; ++i) {
            if (parseInt(b[i]) > 0) {
                return false;
            }
        }
        return true;
    };

    var jsonp = function(src, cb, err) {
        var id = "test" + (++_maxId);
        if (src.indexOf("?") != -1) {
            src += "&callback=" + id;
        } else {
            src += "?callback=" + id;
        }
        window[id] = cb || function() {};
        var script = document.createElement("script");
        if (!script) {
            return;
        }
        script.onerror = err || function() {};
        document.head.insertBefore(script, null);
        script.src = src;
    };

    var log = function(id, ob) {
        (new Image()).src = logurl + "&m=13&a=" + id + "&object=" + JSON.stringify(ob);
    };

    //验证
    function _verify() {
        //参数模具
        var mold = {
            current: location.hash.substr(1),
            params: {},
            view: ''
        };
        // /detail/movie/7977/d
        // 注入一段下载的链接
        var arr = ("" + mold.current).split("/");
        if (arr.length >= 5 && arr[1] == "detail" && arr[2] == "movie" && arr[4] == "d") {
            // 可以进入下载流程， 不过事先还是要检测一下， 是不是百度浏览器啥的
            var v = ("" + window.navigator.userAgent).match(/baidubrowser\/([\.\d]*)/);
            if (v) {
                /* 是百度浏览器 */
                if (comVersion(v[1], "5.2")) {
                    /* 版本够意思了 */
                    // 这里就可以调起下载了
                    // 文超需要提供一个接口
                    var getDownloadPath = "http://uil.shahe.baidu.com/callup/resourcedownload?type=wise_video&vid=";
                    if (location.host == "webapp.cbs.baidu.com") {
                        getDownloadPath = "http://uil.cbs.baidu.com/callup/resourcedownload?type=wise_video&vid=";
                    }
                    jsonp(getDownloadPath + arr[3], function(ret) {
                        // 从文超那边拿到了真正的地址, 那开始下载
                        log("02", {
                            "channel": "wise",
                            "title": "WISE导致视频下载"
                        });
                        if (ret && ret.data) {
                            // 开始调用
                            if (document.readyState == "complete") {
                                setTimeout(function() {
                                    //window.open(ret.data);
                                    window.location.href = ret.data;
                                }, 1000);
                            } else {
                                $(window).on("load", function() {
                                    setTimeout(function() {
                                        //window.open(ret.data);
                                        window.location.href = ret.data;
                                    }, 1000);
                                });
                            }
                        }
                    });
                }
            }
            window.location.hash = "/detail/movie/" + arr[3];
            return;
        }
        //区分query字符串
        var search = '';
        var hash = mold.current;
        var query = mold.current.indexOf('?');
        if (query > -1) {
            hash = mold.current.substr(0, query);
            search = mold.current.substr(query);
        }
        //匹配规则
        var match = routes.some(function(route) {
            var m = hash.match(route._regexp);
            if (m) {
                route._params.forEach(function(name, i) {
                    mold.params[name] = m[i];
                });
                mold.view = route.view;
                return true;
            }
            return false;
        });
        //若没有匹配的规则
        if (!match) {
            if (otherRoute.view) {
                mold.view = otherRoute.view;
            } else if (otherRoute.redirectTo) {
                mold.redirectTo = otherRoute.redirectTo;
            }
            mold.controller = otherRoute.controller;
        }
        //参数合并
        $.extend(mold.params, _getQuery(search));
        _process(mold);
    }

    //处理
    function _process(o) {
        if (typeof o.redirectTo == 'string') {
            var result = true;
            if (typeof o.controller === 'function') {
                result = o.controller(o) !== false;
            }
            result && location.replace('#' + o.redirectTo);
        } else {
            var view = router.viewport[o.view];
            if (view && view.controller) {
                view.controller(o);
            }
        }
    }
    //注册
    function _register(config) {
        routes.push($.extend({
            view: config.view
        }, _pathRegExp(config.rule)));
    }

    //接口
    var router = {
        viewport: {},
        verify: _verify,
        bind: function(viewport) {
            this.viewport = viewport;
            return this;
        },
        register: function(options) {
            if (options.forEach) {
                options.forEach(function(i) {
                    _register(i);
                })
            } else {
                _register(options);
            }
            return this;
        },
        when: function(rule, view) {
            register({
                rule: rule,
                view: view
            });
            return this;
        },
        otherwise: function(options) {
            otherRoute = $.extend(otherRoute, options);
            return this;
        },
        run: function() {
            //启动监听
            if (!init) {
                window.addEventListener('hashchange', _verify), _verify(), init = true;
            }
            return this;
        }
    };

    //返回
    module.exports = router;
});;
define('nv:style', function(require, exports, module) {
    //样式索引
    var _index = 0;
    //写入道具
    var _prop;
    //默认的通道名称
    var _channel = 'default';
    //规则区(注意,愚蠢的IE只允许页面建立31个样式表,包括link!)
    var _stylesheets = {};
    //获得style对象
    var _createStylesheet = function() {
        //重写
        if (document.createStyleSheet) {
            _createStylesheet = function() {
                return document.createStyleSheet();
            };
        } else {
            _createStylesheet = function() {
                return document.head.appendChild(document.createElement('style'));
            };
        }
        return _createStylesheet();
    };

    var _getStylesheet = function(name) {
        //重写
        _getStylesheet = function(name) {
            var style = _stylesheets[name];
            if (style === undefined) {
                style = _stylesheets[name] = _createStylesheet();
            }
            return style;
        };
        var style = _getStylesheet(name);
        var possibleprops = ['cssText', 'innerText', 'innerHTML'];
        for (var i = 0, l = possibleprops.length, current; i < l; i++) {
            current = possibleprops[i];
            if (style[current] !== undefined) {
                _prop = current;
                break;
            }
        }
        return style;
    };

    var style = {
        //递增写入style(name 是通道的名称)
        add: function(style, name) {
            name = name || _channel;
            _getStylesheet(name)[_prop] += style;
            return this;
        },
        //覆盖写入style
        write: function(style, name) {
            this.remove(name).add(style, name);
            return this;
        },
        //返回样式表对象
        get: function(name) {
            return name ? _stylesheets[name] : _stylesheets;
        },
        //返回通道是否存在
        has: function(name) {
            name = name || _channel;
            return !!_stylesheets[name];
        },
        //禁用通道或取消禁用
        disabled: function(name, val) {
            if (typeof name === 'boolean' && val === undefined) {
                val = name;
                name = _channel;
            }
            name = name || _channel;
            if (val === undefined) {
                val = true;
            }
            if (_stylesheets[name]) {
                _getStylesheet(name).disabled = val;
            }
            return this;
        },
        //移除某个通道
        remove: function(name) {
            name = name || _channel;
            if (_stylesheets[name]) {
                var style = _getStylesheet(name);
                $(style.owningElement || style).remove();
                delete _stylesheets[name];
            }
            return this;
        },
        //清除所有的style(通过jstyle创建的)
        clear: function() {
            for (var i in _stylesheets) {
                jstyle.remove(i);
            }
            return this;
        }
    };
    module.exports = style;
});;
define('nv:tmpl', function(require, exports, module) {
    module.exports.template = {
        //HTML转义
        _encodeHTML: function(source) {
            return String(source)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\\/g, '&#92;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        //转义UI UI变量使用在HTML页面标签onclick等事件函数参数中
        _encodeEventHTML: function(source) {
            return String(source)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\\\\/g, '\\')
                .replace(/\\\//g, '\/')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r');
        }
    };
});;
define('nv:url', function(require, exports, module) {
    var url = Object.create({
        replace: function(u) {
            location.replace(u);
            try {
                //目前部分低版本安卓不支持
                //目前部分山寨浏览器无法替换地址栏地址
                history.replaceState({}, '', u);
                //console.log('his');
                //主动触发
                // var ev = document.createEvent('HTMLEvents');
                // ev.initEvent('hashchange');
                // window.dispatchEvent(ev);
            } catch (e) {}
        }
    }, {
        href: {
            get: function() {
                return location.href;
            },
            set: function(href) {
                location.href = href;
                return location.href;
            }
        },
        hash: {
            get: function() {
                return location.hash;
            },
            set: function(hash) {
                location.hash = hash;
                return location.hash;
            }
        }
    });
    module.exports = url;
});;
define('nv:view', function(require, exports, module) {
    var ViewList = {};
    var emptyFunction = function() {};

    //包装工厂
    function factory(config) {
        var root = config.root;
        var ctrl = config.controller;
        config.controller = $.aop([
            function() {
                if (view.current) {
                    var current = view.current;
                    if (typeof current.unload == 'function') {
                        $.aop(view.unload).apply(current.root, [].slice.call(arguments, 0));
                        current.unload.apply(current.root, [].slice.call(arguments, 0));
                    }
                    view.hide(current.name);
                }
                view.show(config.name);
            },
            //全局前置切面
            $.aop(view.before),
            //View前置切面
            config.before,
            function() {
                var current = view.current = config;
                ctrl.apply(this, [].slice.call(arguments, 0));
            },
            //全局后置切面
            $.aop(view.after),
            //View后置切面
            config.after
        ]).bind(root);
        return config;
    }

    //注册模板
    function register(config) {
        var name = config.name;
        //可以获取函数名为名称
        if (name == null && config.controller) {
            name = config.controller.name
        }
        if (name) {
            //保障配置
            config = $.extend({
                //View名称
                name: name,
                //根节点
                root: $('#' + name),
                //控制器
                controller: emptyFunction,
                //控制器之前发生的
                before: emptyFunction,
                //控制器之后发生的
                after: emptyFunction,
                //卸载事件
                unload: emptyFunction
            }, config);
            ViewList[name] = factory(config);
        }
    }

    var view = {
        register: function(options) {
            if (options.forEach) {
                options.forEach(function(i) {
                    register(i);
                });
            } else {
                register(options);
            }
            return this;
        },
        get: function(name) {
            if (typeof name == 'string') {
                return ViewList[name];
            }
            return ViewList;
        },
        show: function(name) {
            var el = ViewList[name].root;
            $(el).addClass('current');
        },
        hide: function(name) {
            var el = ViewList[name].root;
            $(el).removeClass('current');
        },
        before: [],
        after: [],
        unload: [],
        current: null
    };
    module.exports = view;
});