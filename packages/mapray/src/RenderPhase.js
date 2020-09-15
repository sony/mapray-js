/**
 * @summary 描画フェーズ
 *
 * @desc
 * <p>{@link mapray.Entity}において描画フェーズを指定します。<p>
 *
 * @enum {object}
 * @memberof mapray
 * @constant
 * @see mapray.Entity
 */
const RenderPhase = {

    /**
     * 通常描画
     */
    NORMAL: {
        id: "NORMAL",
        flag: 1,
    },

    /**
     * オーバーレイ描画。深度は無視され、半透明で描画されます。
     */
    OVERLAY: {
        id: "OVERLAY",
        flag: 2,
    },

    /**
     * オーバーレイ描画後に行う描画
     */
    ADDITIONAL: {
        id: "ADDITIONAL",
        flag: 4,
    },

    /**
     * 通常の描画に加え、他のオブジェクトに隠れた部分のみオーバーレイ描画されます。
     * OVERLAYとADDITIONALの両方を適用した描画結果が得られます。
     */
    NORMAL_AND_OVERLAY: {
        id: "NORMAL_AND_OVERLAY",
        flag: 6,
    }
};



/**
 * @summary コンビネーションを除く、値リストを返します。
 * @private
 */
RenderPhase.values = [
    RenderPhase.NORMAL,
    RenderPhase.OVERLAY,
    RenderPhase.ADDITIONAL,
];


export default RenderPhase;
