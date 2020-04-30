(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/SmallBall.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '0e337k95MBBVJcVpgygqIJF', 'SmallBall', __filename);
// scripts/SmallBall.js

"use strict";

/**
 * Created by xujiawei on 2020-04-29 17:58:39
 */

cc.Class({
    extends: cc.Component,
    properties: {
        arrow: cc.Node,
        numLabel: cc.Label
    },

    initSmallBall: function initSmallBall(params) {
        this.numLabel.string = params.num;
        this.arrow.active = !!params.showArrow;
    },


    /**
    * 当碰撞产生的时候调用
    * @param  {Collider} other 产生碰撞的另一个碰撞组件
    * @param  {Collider} self  产生碰撞的自身的碰撞组件
    */
    onCollisionEnter: function onCollisionEnter(other, self) {
        other.node.stopAllActions();
        self.node.stopAllActions();
        zy.event.emit("gameover");
    }
});

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
        //# sourceMappingURL=SmallBall.js.map
        