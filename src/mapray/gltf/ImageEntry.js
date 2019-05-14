/**
 * コンテキストでの Image 管理アイテム
 *
 * @memberof mapray.gltf
 * @private
 */
class ImageEntry {

    /**
     * @param {mapray.gltf.Image} image  イメージ
     */
    constructor( image )
    {
        this._image           = image;
        this._texinfo_objects = [];
    }


    /**
     * イメージを取得
     * @type {mapray.gltf.Texture}
     * @readonly
     */
    get image() { return this._image; }


    /**
     * TextureInfo インスタンスを追加
     *
     * @param {mapray.gltf.TextureInfo} info  追加する TextureInfo インスタンス
     */
    addTextureInfo( info )
    {
        this._texinfo_objects.push( info );
    }


    /**
     * テクスチャ情報を再構築
     */
    rebuildTextureInfo()
    {
        var texinfo_objects = this._texinfo_objects;

        if ( texinfo_objects.length <= 1 ) {
            // イメージが複数の TextureInfo から参照されないので
            // 何も変更しない
            return;
        }

        // この画像を使っている代表テクスチャ
        var representative_texture = texinfo_objects[0].texture;

        // この画像を使っている (テクスチャ情報内の) テクスチャを
        // 代表テクスチャに置き換える
        for ( var i = 1; i < texinfo_objects.length; ++i ) {
            texinfo_objects[i].texture = representative_texture;
        }
    }

}


export default ImageEntry;
