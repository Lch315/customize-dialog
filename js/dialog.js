(function(global, doc, factory) {

	if (typeof define === "function" && define.amd) {
		// 设置AMD模块
		define(function() {
			return factory(global, doc);
		});

	} else {
		//初始化CD模块
		var CD = factory(global, doc);

		//提供window接口
		window.CD = window.CD || CD;
	}

}(window, document, function(window, document) {

	/**
	 * 依赖的一些自定义工具
	 */
	var _utils = {

		/**
		 * 遍历对象
		 * @param {object} obj 遍历对象
		 * @param {function} callback 处理函数
		 */
		each: function(obj, callback) {
			var value,
				i = 0;
			if (this.isArray(obj)) {
				for ( ; i < obj.length; i++) {
					value = callback.call(obj[ i ], i, obj[ i ]);
					if(value === false) {
						break;
					}
				}
			} else {
				for (i in obj) {
					value = callback.call(obj[ i ], i, obj[ i ]);
					if(value === false) {
						break;
					}
				}
			}
		},

		trim: function(text) {
			return text ? text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "") : "";
		},

		hasClass: function(el, className) {
			return (el.className && el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"))) ? true : false;
		},

		addClass: function(el, className) {
			if(!this.hasClass(el, className)) {
				el.className = (el.className ? el.className + " " : "") + className;
			}
		},

		removeClass: function(el, className) {
			if(this.hasClass(el, className)) {
				el.className = this.trim(el.className.replace(new RegExp("(\\s|^)" + className + "(\\s|$)"), " "));
			}
		},

		/**
		 * 绑定事件监听，在冒泡阶段执行事件处理程序
		 * @param {object} el dom对象
		 * @param {string} ev 事件类型
		 * @param {function} event 处理函数
		 */
		listen: function(el, ev, handle) {
			el.addEventListener(ev, handle, false);
		},

		stopListen: function(el, ev, handle) {
			el.removeEventListener(ev, handle, false);
		},

		/**
		 * 设置样式
		 * @param {object} el dom对象
		 * @param {object} css 样式
		 */
		setCss: function(el, css) {
			var cssStr = "";

			this.each(css, function(key, value) {
				cssStr += key + ":" + value +";"
			})

			el.style.cssText = cssStr; 
		},

		/**
		 * 创建样式表
		 */
		setCssSheet: function(CssSheet) {
			var dialogStyle = document.createElement("style"),
				head = document.getElementsByTagName("head")[0];
			dialogStyle.type = "text/css";

			dialogStyle.appendChild(document.createTextNode(CssSheet));
			head.appendChild(dialogStyle);
		},

		isArray: function(obj) {
			return toString.call(obj) === "[object Array]";
		},

		//很简单的一个模板引擎
		template: function(tpl, data) {
			var reg = /<%([^%>]+)?%>/g, 
		        regOut = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, 
		        sources = 'var r=[];\n', 
		        index = 0,
		        _t;

		    tpl = tpl.replace(/[\r\t\n]/g, '');
			tpl.replace(reg, function(match, source, offset) {
		        sources += (_t = tpl.slice(index, offset)) ? 'r.push("' + _t.replace(/"/g, '\\"') + '");\n' : '';
		        sources += source.match(regOut) ? source + '\n' : 'r.push(' + source + ');\n';
		        index = offset + match.length;
			});

			sources += (_t = tpl.slice(index)) ? 'r.push("' + _t.replace(/"/g, '\\"') + '");\n' : '';
		    sources += 'return r.join("");';

		    sources = 'with(obj){\n' + sources + '}\n';

		    return new Function('obj', sources.replace(/[\r\t\n]/g, '')).call(this, data);
		}
	}

	//对话框模板
	var prom_tpl = '<div id="dialog-box" class="dialog-box"><div class="dialog-text dialog-prom-text"><%text%></div></div>',
		alert_tpl = '<div id="dialog-box" class="dialog-box"><div class="dialog-text"><%text%></div><div id="dialog-handle" class="dialog-handle"><span id="dialog-sure"><%sure%></span></div></div>',
		confirm_tpl = '<div id="dialog-box" class="dialog-box"><div class="dialog-text"><%text%></div><div id="dialog-handle" class="dialog-handle"><span id="dialog-sure"><%sure%></span><span id="dialog-cancel"><%cancel%></span></div></div>',
		dialogCss = '.dialog-mask{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background-color:rgba(0,0,0,.5);font-size:14px;}.dialog-mask.display{display:block;}.dialog-box{position:absolute;top:30%;left:50%;width:60%;margin-left:-30%;box-shadow:0 0 5px rgba(64,64,64,.6);background-color:#fff;}.dialog-text{padding:30px 0;text-align:center;line-height:20px;}.dialog-prom-text{padding:15px 0;}.dialog-handle{display:-webkit-box;display:-webkit-flex;display:flex;border-top:1px solid #e5e5e5;}.dialog-handle span{display:block;-webkit-box-flex:1;-webkit-flex:1;flex:1;width:0;text-align:center;line-height:36px;}.dialog-handle span:first-child{border-right:1px solid #e5e5e5;}',
		mask;

	/**
	 * 默认项
	 * 用于设置弹层效果
	 */
	var opts = {
		delay: 3000   // prom 弹框的存在时间
	};

	/**
	 * 创建蒙版
	 * 检测webview是不兼容position:fixed
	 */
	var isFixed = (function() {
		mask = document.createElement("div");

		mask.id = "dialog-mask";
		mask.className = "dialog-mask";

		document.body.appendChild(mask);

		_utils.setCssSheet(dialogCss);

		_utils.listen(mask, "touchmove", function(e) {
			e.preventDefault();
		});

		return window.getComputedStyle(mask).position === "fixed";
	}());

	//不能使用fixed定位时用absolute定位代替
	function unFixed() {
		var curTop = document.body.scrollTop,
			pageHeight = document.documentElement.clientHeight,
			curBottom = curTop + pageHeight,
			cssStr = {
				position: "absolute",
				top: curTop + "px",
				bottom: curBottom + "px"
			};

		_utils.setCss(mask, cssStr);
	};

	/**
	 * 初始化弹层效果
	 * @param {object} opt 初始化项
	 */
	function config(opt) {
		if ( typeof opt === "object" ) {
			_utils.each(opt, function(key, value) {
				opts[key] = value;
			});
		}

		return false;
	};

	/**
	 * 自定义prom
	 * @param {string} text alert内容
	 * @param {number} [delay] 弹层持续的时间
	 * @param {string} [url] 确认后跳转链接
	 */
	function cdProm(text, delay, url) {

		if (!isFixed) {
			unFixed();
		}

		var timer,
			data = {
				text: text || "哎呀，我好想忘了要说啥了"
			},
			delay = delay || opts.delay,
			alertHtml = _utils.template(prom_tpl, data);

		mask.innerHTML = alertHtml;

		_utils.addClass(mask, "display");

		timer = setTimeout(function() {
			url && (location.href = url);

			_utils.removeClass(mask, "display");

			timer = clearTimeout(timer);
			timer = null;
		}, delay);
	};

	/**
	 * 自定义alert
	 * @param {string} text alert内容
	 * @param {string} [sure] 确认按钮字段
	 * @param {string} [url] 确认后跳转链接
	 */
	function cdAlert(text, sure, url) {

		if (!isFixed) {
			unFixed();
		}

		var data = {
				text: text || "哎呀，我好想忘了要说啥了",
				sure: sure || "确定"
			},
			alertHtml = _utils.template(alert_tpl, data);

		mask.innerHTML = alertHtml;

		_utils.addClass(mask, "display");

		var sureBtn = document.getElementById("dialog-sure");

		_utils.listen(sureBtn, "click", function() {

			url && (location.href = url);

			_utils.removeClass(mask, "display");
		});
	};

	/**
	 * 自定义confirm
	 * @param {string} text confirm内容
	 * @param {string} [sure] 确认按钮字段
	 * @param {string} [cancel] 取消按钮字段
	 * @param {function} callback(boolean) 确认后处理函数,可以接收一个boolean值。点确定是为true，反之为false
	 */
	function cdConfirm(text, sure, cancel, callback) {

		var cfText, cfSure, cfCancel, cfCallback, data, alertHtml;

		if (!isFixed) {
			unFixed();
		}

		cfText = text || "哎呀，我好想忘了要说啥了";

		if (typeof sure === "function") {
			cfSure = "确定";
			cfCancel = "取消";
			cfCallback = sure;
		} else if (typeof cancel === "function") {
			cfSure = sure || "确定";
			cfCancel = "取消";
			cfCallback = cancel;
		} else if (typeof callback === "function") {
			cfSure = sure || "确定";
			cfCancel = cancel || "取消";
			cfCallback = callback;
		}

		data = {
			text: cfText,
			sure: cfSure,
			cancel: cfCancel
		};

		alertHtml = _utils.template(confirm_tpl, data);

		mask.innerHTML = alertHtml;

		_utils.addClass(mask, "display");

		var sureBtn = document.getElementById("dialog-sure"),
			cancelBtn = document.getElementById("dialog-cancel");

		_utils.listen(sureBtn, "click", function() {

			_utils.removeClass(mask, "display");

			cfCallback( true );
		});

		_utils.listen(cancelBtn, "click", function() {

			_utils.removeClass(mask, "display");

			cfCallback( false );
		});
	};

	return {
		config: config,
		prom: cdProm,
		alert: cdAlert,
		confirm: cdConfirm
	};
}));