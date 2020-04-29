(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/scene/MapScene.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, 'a351dgNiYhL+J62JNyk6Huc', 'MapScene', __filename);
// scripts/scene/MapScene.js

'use strict';

// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        map: cc.TiledMap,
        mapCamera: cc.Camera,
        sp: cc.Sprite
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    start: function start() {
        // 地图块小于5000块可以选择关闭裁剪，直接gpu渲染，节省cpu计算。
        // cc.macro.ENABLE_TILEDMAP_CULLING = false;

        if (cc.sys.isBrowser) {
            var ua = window.navigator.userAgent;
            cc.log(ua);
            if (ua.indexOf('iPad') > 0) {
                cc.log('apple iPad');
            } else if (ua.indexOf('Tablet') > 0) {
                cc.log('android pad');
            } else {
                cc.log("other device");
            }
        }
    }
}

// update (dt) {},
);

cc._RF.pop();
        }
        if (CC_EDITOR) {
            __define(__module.exports, __require, __module);
        }
        else {
            cc.registerModuleFunc(__filename, function () {
                __define(__module.exports, __require, __module);
            });
        }
        })();
        //# sourceMappingURL=MapScene.js.map
        