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
    getMaxScrollOffset () {
        let viewSize = this._view.getContentSize();
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let horizontalMaximizeOffset =  contentSize.width - viewSize.width;
        let verticalMaximizeOffset = contentSize.height - viewSize.height;
        horizontalMaximizeOffset = horizontalMaximizeOffset >= 0 ? horizontalMaximizeOffset : 0;
        verticalMaximizeOffset = verticalMaximizeOffset >=0 ? verticalMaximizeOffset : 0;

        return cc.v2(horizontalMaximizeOffset, verticalMaximizeOffset);
    },

    _calculateMovePercentDelta (options) {
        let anchor = options.anchor;
        let applyToHorizontal = options.applyToHorizontal;
        let applyToVertical = options.applyToVertical;
        this._calculateBoundary();

        anchor = anchor.clampf(cc.v2(0, 0), cc.v2(1, 1));

        let scrollSize = this._view.getContentSize();
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;

        let leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
        leftDeta = -leftDeta;

        let moveDelta = cc.v2(0, 0);
        let totalScrollDelta = 0;
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

    _moveContentToTopLeft (scrollViewSize) {
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let bottomDeta = this._getContentBottomBoundary() - this._bottomBoundary;
        bottomDeta = -bottomDeta;
        let moveDelta = cc.v2(0, 0);
        let totalScrollDelta = 0;

        let leftDeta = this._getContentLeftBoundary() - this._leftBoundary;
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

    _clampDelta (delta) {
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let scrollViewSize = this._view.getContentSize();
        if (contentSize.width < scrollViewSize.width) {
            delta.x = 0;
        }
        if (contentSize.height < scrollViewSize.height) {
            delta.y = 0;
        }

        return delta;
    },

    _startAttenuatingAutoScroll (deltaMove, initialVelocity) {
        let time = this._calculateAutoScrollTimeByInitalSpeed(initialVelocity.mag());


        let targetDelta = deltaMove.normalize();
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let scrollviewSize = this._view.getContentSize();

        let totalMoveWidth = (contentSize.width - scrollviewSize.width);
        let totalMoveHeight = (contentSize.height - scrollviewSize.height);

        let attenuatedFactorX = this._calculateAttenuatedFactor(totalMoveWidth);
        let attenuatedFactorY = this._calculateAttenuatedFactor(totalMoveHeight);

        targetDelta = cc.v2(targetDelta.x * totalMoveWidth * (1 - this.brake) * attenuatedFactorX, targetDelta.y * totalMoveHeight * attenuatedFactorY * (1 - this.brake));

        let originalMoveLength = deltaMove.mag();
        let factor = targetDelta.mag() / originalMoveLength;
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

    _getContentLeftBoundary () {
        let contentPos = this.getContentPosition();

        let contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return contentPos.x - this.content.getAnchorPoint().x * contentSize.width;
    },

    _getContentRightBoundary () {
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return this._getContentLeftBoundary() + contentSize.width;
    },

    _getContentTopBoundary () {
        let contentSize = this.content.getContentSize();

        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return this._getContentBottomBoundary() + contentSize.height;
    },

    _getContentBottomBoundary () {
        let contentPos = this.getContentPosition();

        let contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        return contentPos.y - this.content.getAnchorPoint().y * contentSize.height;
    },

    _updateScrollBarState () {
        if (!this.content) {
            return;
        }
        let contentSize = this.content.getContentSize();
        contentSize.width *= this.content.scale;
        contentSize.height *= this.content.scale;

        let scrollViewSize = this._view.getContentSize();
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
    },


});