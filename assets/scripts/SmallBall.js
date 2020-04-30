/**
 * Created by xujiawei on 2020-04-29 17:58:39
 */

cc.Class({
    extends: cc.Component,
    properties: {
        arrow: cc.Node,
        numLabel: cc.Label,
    },

    initSmallBall(params) {
        this.numLabel.string = params.num;
        this.arrow.active = !!params.showArrow;
    },

    /**
    * 当碰撞产生的时候调用
    * @param  {Collider} other 产生碰撞的另一个碰撞组件
    * @param  {Collider} self  产生碰撞的自身的碰撞组件
    */
    onCollisionEnter: function (other, self) {
        other.node.stopAllActions();
        self.node.stopAllActions();
        zy.event.emit("gameover");
    }
});