(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/map/MapScrollView.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '0dceePCAS9Ga48SiFGo1e1T', 'MapScrollView', __filename);
// scripts/map/MapScrollView.js

"use strict";

/**
 * 继承自 cc.ScrollView
 * 这里只修改了有关计算content大小的方法（计算大小考虑缩放的影响）
 */
cc.Class({
    extends: cc.ScrollView,

    /**
     * !#en Get the maximize available  scroll offset
     * !#zh 获取滚动视图最大可以滚动的偏移量
     * @method getMaxScrollOffset
     * @return {Vec2} - A Vec2 value indicate the maximize scroll offset in x and y axis.
     */
    getMaxScrollOffset: function getMaxScrollOffset() {
        var viewSize = this._view.getContentSize();
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var horizontalMaximizeOffset = contentSize.width - viewSize.width;
        var verticalMaximizeOffset = contentSize.height - viewSize.height;
        horizontalMaximizeOffset = horizontalMaximizeOffset >= 0 ? horizontalMaximizeOffset : 0;
        verticalMaximizeOffset = verticalMaximizeOffset >= 0 ? verticalMaximizeOffset : 0;

        return cc.v2(horizontalMaximizeOffset, verticalMaximizeOffset);
    },
    _calculateMovePercentDelta: function _calculateMovePercentDelta(options) {
        var anchor = options.anchor;
        var applyToHorizontal = options.applyToHorizontal;
        var applyToVertical = options.applyToVertical;
        this._calculateBoundary();

        anchor = anchor.clampf(cc.v2(0, 0), cc.v2(1, 1));

        var scrollSize = this._view.getContentSize();
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;

        var leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
        leftDeta = -leftDeta;

        var moveDelta = cc.v2(0, 0);
        var totalScrollDelta = 0;
        if (applyToHorizontal) {
            totalScrollDelta = contentSize.width - scrollSize.width;
            moveDelta.x = leftDeta - totalScrollDelta * anchor.x;
        }

        if (applyToVertical) {
            totalScrollDelta = contentSize.height - scrollSize.height;
            moveDelta.y = bottomDeta - totalScrollDelta * anchor.y;
        }

        return moveDelta;
    },
    _moveContentToTopLeft: function _moveContentToTopLeft(scrollViewSize) {
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;
        var moveDelta = cc.v2(0, 0);
        var totalScrollDelta = 0;

        var leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
        leftDeta = -leftDeta;

        if (contentSize.height < scrollViewSize.height) {
            totalScrollDelta = contentSize.height - scrollViewSize.height;
            moveDelta.y = bottomDeta - totalScrollDelta;
        }

        if (contentSize.width < scrollViewSize.width) {
            totalScrollDelta = contentSize.width - scrollViewSize.width;
            moveDelta.x = leftDeta;
        }

        this._updateScrollBarState();
        this._moveContent(moveDelta);
        this._adjustContentOutOfBoundary();
    },
    _clampDelta: function _clampDelta(delta) {
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var scrollViewSize = this._view.getContentSize();
        if (contentSize.width < scrollViewSize.width) {
            delta.x = 0;
        }
        if (contentSize.height < scrollViewSize.height) {
            delta.y = 0;
        }

        return delta;
    },
    _startAttenuatingAutoScroll: function _startAttenuatingAutoScroll(deltaMove, initialVelocity) {
        var time = this._calculateAutoScrollTimeByInitalSpeed(initialVelocity.mag());

        var targetDelta = deltaMove.normalize();
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var scrollviewSize = this._view.getContentSize();

        var totalMoveWidth = contentSize.width - scrollviewSize.width;
        var totalMoveHeight = contentSize.height - scrollviewSize.height;

        var attenuatedFactorX = this._calculateAttenuatedFactor(totalMoveWidth);
        var attenuatedFactorY = this._calculateAttenuatedFactor(totalMoveHeight);

        targetDelta = cc.v2(targetDelta.x * totalMoveWidth * (1 - this.brake) * attenuatedFactorX, targetDelta.y * totalMoveHeight * attenuatedFactorY * (1 - this.brake));

        var originalMoveLength = deltaMove.mag();
        var factor = targetDelta.mag() / originalMoveLength;
        targetDelta = targetDelta.add(deltaMove);

        if (this.brake > 0 && factor > 7) {
            factor = Math.sqrt(factor);
            targetDelta = deltaMove.mul(factor).add(deltaMove);
        }

        if (this.brake > 0 && factor > 3) {
            factor = 3;
            time = time * factor;
        }

        if (this.brake === 0 && factor > 1) {
            time = time * factor;
        }

        this._startAutoScroll(targetDelta, time, true);
    },
    _getContentLeftBoundary: function _getContentLeftBoundary() {
        var contentPos = this.getContentPosition();

        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return contentPos.x - this.content.getAnchorPoint().x * contentSize.width;
    },
    _getContentRightBoundary: function _getContentRightBoundary() {
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return this._getContentLeftBoundary() + contentSize.width;
    },
    _getContentTopBoundary: function _getContentTopBoundary() {
        var contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return this._getContentBottomBoundary() + contentSize.height;
    },
    _getContentBottomBoundary: function _getContentBottomBoundary() {
        var contentPos = this.getContentPosition();

        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return contentPos.y - this.content.getAnchorPoint().y * contentSize.height;
    },
    _updateScrollBarState: function _updateScrollBarState() {
        if (!this.content) {
            return;
        }
        var contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        var scrollViewSize = this._view.getContentSize();
        if (this.verticalScrollBar) {
            if (contentSize.height < scrollViewSize.height) {
                this.verticalScrollBar.hide();
            } else {
                this.verticalScrollBar.show();
            }
        }

        if (this.horizontalScrollBar) {
            if (contentSize.width < scrollViewSize.width) {
                this.horizontalScrollBar.hide();
            } else {
                this.horizontalScrollBar.show();
            }
        }
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
        //# sourceMappingURL=MapScrollView.js.map
        