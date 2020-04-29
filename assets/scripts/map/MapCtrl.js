import { runInThisContext } from "vm";
import { timingSafeEqual } from "crypto";

// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const MAP_MIN_SCALE = 0.26;
const MAP_MAX_SCALE = 1;

cc.Class({
    extends: cc.Component,

    properties: {
        map: cc.TiledMap,
        mapScrollView: cc.ScrollView,
        testNode: cc.Node,
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    prepare () {
        this._moving = false;
        this.initMap();
    },

    start () {
        this.prepare();

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this, true);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancle, this, true);
    },

    initMap (cfg = {}) {

    },

    onTouchStart (event) {        
        // let pos = event.getLocation();
        // cc.log("touch start: ", JSON.stringify(pos));

        // pos = this.node.parent.convertToNodeSpaceAR(pos);
        // cc.log("map pos:", JSON.stringify(pos));
        this._moving = false;
    },

    onTouchMove (event) {
        let touches = event.getTouches();
        if (touches.length >= 2) {
            cc.log("地图缩放。。。");
            this._moving = false;
            // 缩放
            let touch1 = touches[0];
            let touch2 = touches[1];
            let delta1 = touch1.getDelta();
            let delta2 = touch2.getDelta();
            // 坐标转换为map坐标系
            let touchPoint1 = this.node.parent.convertToNodeSpaceAR(touch1.getLocation());
            let touchPoint2 = this.node.parent.convertToNodeSpaceAR(touch2.getLocation());
            
            // 记录当前锚点
            let anchorBefore = this.map.node.getAnchorPoint();
            // 新锚点在map左、下边界距离(始终以当前视野中心为锚点)
            let disLeft = this.map.node.width * anchorBefore.x * this.map.node.scale - this.map.node.x; 
            let disBottom = this.map.node.height * anchorBefore.y * this.map.node.scale - this.map.node.y;

            // 新的锚点 
            let anchorAfter = cc.v2(disLeft / (this.map.node.width * this.map.node.scale), disBottom / (this.map.node.height * this.map.node.scale));
            this.map.node.setAnchorPoint(anchorAfter);
            // 新旧锚点距离差
            let disX = this.map.node.width * (anchorBefore.x - anchorAfter.x) * this.map.node.scale;
            let disY = this.map.node.height * (anchorBefore.y - anchorAfter.y) * this.map.node.scale;
            // 位置纠正
            this.map.node.setPosition(cc.v2(this.map.node.x - disX, this.map.node.y - disY));

            cc.log("new anchor:", JSON.stringify(anchorAfter));
            
            // 缩放， 手指移动距离的0.5倍
            let distance = touchPoint1.sub(touchPoint2);
            let delta = delta1.sub(delta2);
            let scale = 1;
            if (Math.abs(distance.x) > Math.abs(distance.y)) {
                scale = (distance.x + delta.x * 0.5) / distance.x * this.map.node.scale;
            } else {
                scale = (distance.y + delta.y * 0.5) / distance.y * this.map.node.scale;
            }

            let minScale = cc.visibleRect.height / this.map.node.height;
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
                let delta = event.getDelta();
                let scale = this.map.node.scale;
                let anchorX = this.map.node.getAnchorPoint().x;
                let anchorY = this.map.node.getAnchorPoint().y;
    
                if (cc.visibleRect.width / 2 - (this.map.node.width * scale * anchorX - this.map.node.x) <= 0 &&
                    cc.visibleRect.width / 2 - (this.map.node.width * scale * (1 - anchorX) + this.map.node.x <= 0)) {
                        this.map.node.x += delta.x;
                }
                if (cc.visibleRect.height / 2 - (this.map.node.height * scale * anchorY - this.map.node.y) <= 0 &&
                    cc.visibleRect.height / 2 - (this.map.node.height * scale * (1 - anchorY) + this.map.node.y <= 0)) {
                    this.map.node.y += delta.y;
                }
            }
        }

        // 防止出界， 动态补位
        this.goBoundary(); 
    },

    onTouchEnd (event) {

    },

    onTouchCancle (event) {

    },

    // 限定地图边界（缩放和移动过程中都需要检测)
    goBoundary() {
        let mapScale = this.map.node.scale;
        let anchorAfter = this.map.node.getAnchorPoint();
        // 左侧空白距离
        let posXLeft = cc.visibleRect.width / 2 - (this.map.node.width * anchorAfter.x * mapScale - this.map.node.x);
        if(posXLeft > 0){
            let posx = (this.map.node.width * anchorAfter.x * mapScale) - cc.visibleRect.width / 2;
            this.map.node.x = posx;
        }

        // 右侧空白距离
        let posXRight = cc.visibleRect.width / 2 - (this.map.node.width * (1 - anchorAfter.x) * mapScale + this.map.node.x);
        if (posXRight > 0) {
            let posx = cc.visibleRect.width / 2 - (this.map.node.width * (1 - anchorAfter.x) * mapScale);
            this.map.node.x = posx;
        }

        // 上测空白距离
        let posYTop = cc.visibleRect.height / 2 - (this.map.node.height * (1 - anchorAfter.y) * mapScale + this.map.node.y);
        if (posYTop > 0) {
            // todo: 上测位置计算不对？（先减60）
            let posy = cc.visibleRect.height / 2 - (this.map.node.height * (1 - anchorAfter.y) * mapScale) - 20;
            this.map.node.y = posy;
        }

        // 下测空白距离
        let poxYBottom = cc.visibleRect.height / 2 - (this.map.node.height * anchorAfter.y * mapScale - this.map.node.y);
        if (poxYBottom > 0) {
            let posy = (this.map.node.height * anchorAfter.y * mapScale) - cc.visibleRect.height / 2;
            this.map.node.y = posy;
        }

    },

    /**
     * 地图移动到地图上某个建筑物到位置
     * @param {cc.Vec2} pos 地图上某个建筑物的位置
     */
    scrollToBuildingPos (pos = cc.v2(0, 0)) {
        let t = 1;
        let scale = this.map.node.scale;
        let mapOriPos = this.map.node.getPosition();
        let mapNewPos = cc.v2(mapOriPos.x - pos.x * scale, mapOriPos.y - pos.y * scale); // 目标地图位置
        let posDiff = mapOriPos.subSelf(mapNewPos);
        let len = posDiff.mag();
        t = len / cc.visibleRect.width  * 0.8;
        cc.log("scroll to pos:", JSON.stringify(pos), ", t=", t);

        this.mapScrollView.scrollToOffset(cc.v2(this.map.node.width/2*scale - cc.visibleRect.width/2 + posDiff.x, this.map.node.height/2*scale - cc.visibleRect.height/2 - posDiff.y), t, false);
    },

    onMapScrolling (scrollView) {
        // cc.log(this.map.node.scale);
        // cc.log(JSON.stringify(scrollView.getScrollOffset()));
    }

    // update (dt) {},
});
