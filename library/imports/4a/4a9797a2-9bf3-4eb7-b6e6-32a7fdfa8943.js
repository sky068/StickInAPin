"use strict";
cc._RF.push(module, '4a979eim/NOt7bmMqf9+olD', 'MapCtrl');
// scripts/map/MapCtrl.js

"use strict";

var _vm = require("vm");

var _crypto = require("crypto");

// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var MAP_MIN_SCALE = 0.26;
var MAP_MAX_SCALE = 1;

cc.Class({
    extends: cc.Component,

    properties: {
        map: cc.TiledMap,
        mapScrollView: cc.ScrollView,
        testNode: cc.Node
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    prepare: function prepare() {
        this._moving = false;
        this.initMap();
    },
    start: function start() {
        this.prepare();

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this, true);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancle, this, true);
    },
    initMap: function initMap() {
        var cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    },
    onTouchStart: function onTouchStart(event) {
        // let pos = event.getLocation();
        // cc.log("touch start: ", JSON.stringify(pos));

        // pos = this.node.parent.convertToNodeSpaceAR(pos);
        // cc.log("map pos:", JSON.stringify(pos));
        this._moving = false;
    },
    onTouchMove: function onTouchMove(event) {
        var touches = event.getTouches();
        if (touches.length >= 2) {
            cc.log("地图缩放。。。");
            this._moving = false;
            // 缩放
            var touch1 = touches[0];
            var touch2 = touches[1];
            var delta1 = touch1.getDelta();
            var delta2 = touch2.getDelta();
            // 坐标转换为map坐标系
            var touchPoint1 = this.node.parent.convertToNodeSpaceAR(touch1.getLocation());
            var touchPoint2 = this.node.parent.convertToNodeSpaceAR(touch2.getLocation());

            // 记录当前锚点
            var anchorBefore = this.map.node.getAnchorPoint();
            // 新锚点在map左、下边界距离(始终以当前视野中心为锚点)
            var disLeft = this.map.node.width * anchorBefore.x * this.map.node.scale - this.map.node.x;
            var disBottom = this.map.node.height * anchorBefore.y * this.map.node.scale - this.map.node.y;

            // 新的锚点 
            var anchorAfter = cc.v2(disLeft / (this.map.node.width * this.map.node.scale), disBottom / (this.map.node.height * this.map.node.scale));
            this.map.node.setAnchorPoint(anchorAfter);
            // 新旧锚点距离差
            var disX = this.map.node.width * (anchorBefore.x - anchorAfter.x) * this.map.node.scale;
            var disY = this.map.node.height * (anchorBefore.y - anchorAfter.y) * this.map.node.scale;
            // 位置纠正
            this.map.node.setPosition(cc.v2(this.map.node.x - disX, this.map.node.y - disY));

            cc.log("new anchor:", JSON.stringify(anchorAfter));

            // 缩放， 手指移动距离的0.5倍
            var distance = touchPoint1.sub(touchPoint2);
            var delta = delta1.sub(delta2);
            var scale = 1;
            if (Math.abs(distance.x) > Math.abs(distance.y)) {
                scale = (distance.x + delta.x * 0.5) / distance.x * this.map.node.scale;
            } else {
                scale = (distance.y + delta.y * 0.5) / distance.y * this.map.node.scale;
            }

            var minScale = cc.visibleRect.height / this.map.node.height;
            minScale = Math.max(minScale, MAP_MIN_SCALE);
            if (scale >= MAP_MAX_SCALE) {
                scale = MAP_MAX_SCALE;
            } else if (scale < minScale) {
                tscale = minScale;
            }
            this.map.node.scale = scale;

            cc.log("map scale:" + scale);
        } else {
            {
                // mark: 地图移动改用scrollview，不再在这里处理
                return;
                cc.log("地图移动");
                this._moving = true;
                // 移动
                var _delta = event.getDelta();
                var _scale = this.map.node.scale;
                var anchorX = this.map.node.getAnchorPoint().x;
                var anchorY = this.map.node.getAnchorPoint().y;

                if (cc.visibleRect.width / 2 - (this.map.node.width * _scale * anchorX - this.map.node.x) <= 0 && cc.visibleRect.width / 2 - (this.map.node.width * _scale * (1 - anchorX) + this.map.node.x <= 0)) {
                    this.map.node.x += _delta.x;
                }
                if (cc.visibleRect.height / 2 - (this.map.node.height * _scale * anchorY - this.map.node.y) <= 0 && cc.visibleRect.height / 2 - (this.map.node.height * _scale * (1 - anchorY) + this.map.node.y <= 0)) {
                    this.map.node.y += _delta.y;
                }
            }
        }

        // 防止出界， 动态补位
        this.goBoundary();
    },
    onTouchEnd: function onTouchEnd(event) {},
    onTouchCancle: function onTouchCancle(event) {},


    // 限定地图边界（缩放和移动过程中都需要检测)
    goBoundary: function goBoundary() {
        var mapScale = this.map.node.scale;
        var anchorAfter = this.map.node.getAnchorPoint();
        // 左侧空白距离
        var posXLeft = cc.visibleRect.width / 2 - (this.map.node.width * anchorAfter.x * mapScale - this.map.node.x);
        if (posXLeft > 0) {
            var posx = this.map.node.width * anchorAfter.x * mapScale - cc.visibleRect.width / 2;
            this.map.node.x = posx;
        }

        // 右侧空白距离
        var posXRight = cc.visibleRect.width / 2 - (this.map.node.width * (1 - anchorAfter.x) * mapScale + this.map.node.x);
        if (posXRight > 0) {
            var _posx = cc.visibleRect.width / 2 - this.map.node.width * (1 - anchorAfter.x) * mapScale;
            this.map.node.x = _posx;
        }

        // 上测空白距离
        var posYTop = cc.visibleRect.height / 2 - (this.map.node.height * (1 - anchorAfter.y) * mapScale + this.map.node.y);
        if (posYTop > 0) {
            // todo: 上测位置计算不对？（先减60）
            var posy = cc.visibleRect.height / 2 - this.map.node.height * (1 - anchorAfter.y) * mapScale - 20;
            this.map.node.y = posy;
        }

        // 下测空白距离
        var poxYBottom = cc.visibleRect.height / 2 - (this.map.node.height * anchorAfter.y * mapScale - this.map.node.y);
        if (poxYBottom > 0) {
            var _posy = this.map.node.height * anchorAfter.y * mapScale - cc.visibleRect.height / 2;
            this.map.node.y = _posy;
        }
    },


    /**
     * 地图移动到地图上某个建筑物到位置
     * @param {cc.Vec2} pos 地图上某个建筑物的位置
     */
    scrollToBuildingPos: function scrollToBuildingPos() {
        var pos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : cc.v2(0, 0);

        var t = 1;
        var scale = this.map.node.scale;
        var mapOriPos = this.map.node.getPosition();
        var mapNewPos = cc.v2(mapOriPos.x - pos.x * scale, mapOriPos.y - pos.y * scale); // 目标地图位置
        var posDiff = mapOriPos.subSelf(mapNewPos);
        var len = posDiff.mag();
        t = len / cc.visibleRect.width * 0.8;
        cc.log("scroll to pos:", JSON.stringify(pos), ", t=", t);

        this.mapScrollView.scrollToOffset(cc.v2(this.map.node.width / 2 * scale - cc.visibleRect.width / 2 + posDiff.x, this.map.node.height / 2 * scale - cc.visibleRect.height / 2 - posDiff.y), t, false);
    },
    onMapScrolling: function onMapScrolling(scrollView) {}
    // cc.log(this.map.node.scale);
    // cc.log(JSON.stringify(scrollView.getScrollOffset()));


    // update (dt) {},

});

cc._RF.pop();